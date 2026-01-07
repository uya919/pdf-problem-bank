# 447. 등원 상태 로직 오류 연구리포트

> **Stage 33 상담 관리 시스템 - 등원 상태(enrollment_status) 로직 분석**

---

## 1. 문제 상황

### 사용자 질문
> "박정빈의 상담일자는 25/12/26일이고 등원 예정일은 25/12/30이야. 아직 등원하지않았어. 왜 등원확정이지?"

### 현재 데이터베이스 상태

| 필드 | 값 |
|------|-----|
| student_name | 박정빈 |
| consultation_date | 2025-12-26 |
| enrollment_date | 2025-12-30 |
| **enrollment_status** | **enrolled** |
| created_at | 2025-12-28 03:14:48 |
| updated_at | 2025-12-28 06:07:33 |

**추가 확인:**
- `students` 테이블에 "박정빈" 학생 레코드 존재 (created_at: 2025-12-28 03:14:49)
- `notices` 테이블에 박정빈 관련 공지 없음

---

## 2. 상태 흐름 분석

### 설계된 상태 흐름

```
pending (상담중)
    ↓ [등원 확정 버튼 클릭]
confirmed (등원확정)
    ↓ [등원일 도래 + 반 배치 완료]
enrolled (등원완료)

cancelled (취소) - 별도 흐름
```

### 상태별 의미

| 상태 | 의미 | 조건 |
|------|------|------|
| `pending` | 상담 진행 중 | 초기 상태 |
| `confirmed` | 등원 확정됨 | 등원일 결정, 알림 발송됨 |
| `enrolled` | 등원 완료 | 학생 등록 + 반 배치 완료 |
| `cancelled` | 상담 취소 | 등원 의사 없음 |

---

## 3. 근본 원인 분석

### 3.1 `confirmEnrollmentWithStudent` 함수 로직

```typescript
// consultations.ts:311-351
export async function confirmEnrollmentWithStudent(
  consultationId: string
): Promise<ConfirmEnrollmentWithStudentResult> {
  // 1. 상담 정보 조회
  const consultation = await getConsultation(consultationId);

  // 2. RPC 호출: create_student_from_consultation
  const { data, error } = await supabase.rpc('create_student_from_consultation', {
    p_consultation_id: consultationId,
  });

  // 3. 성공 시 신규등원 공지 생성
  if (result.success && consultation.enrollment_date) {
    await createNotice({...});
  }

  return result;
}
```

### 3.2 `create_student_from_consultation` RPC 함수 로직

```sql
-- 66-71행: 상태를 바로 'enrolled'로 변경!
UPDATE consultations
SET
  student_id = v_student_id,
  enrollment_status = 'enrolled',  -- ⚠️ 문제 발생 지점
  updated_at = NOW()
WHERE id = p_consultation_id;
```

**문제점:** 이 함수는 학생 생성과 동시에 상태를 `enrolled`로 바로 변경합니다.

---

## 4. 문제의 핵심

### 설계 vs 구현 불일치

| 구분 | 설계 의도 | 실제 구현 |
|------|----------|----------|
| confirmed | 등원일 확정, 아직 미등원 | - |
| enrolled | 실제로 등원 완료 | 학생 레코드 생성 시 바로 적용 |

### 워크플로우 혼란

현재 시스템에는 **두 가지 등원 확정 경로**가 있음:

#### 경로 A: `confirmEnrollment` (confirm_enrollment RPC)
```
pending → confirmed
- 등원일 설정
- 알림 생성
- 상태: confirmed
```

#### 경로 B: `confirmEnrollmentWithStudent` (create_student_from_consultation RPC)
```
pending → enrolled (confirmed 건너뜀!)
- 학생 레코드 생성
- 반 배치
- 상태: enrolled
```

**박정빈의 경우:** 경로 B로 처리되어 `confirmed` 단계를 건너뛰고 바로 `enrolled`가 됨.

---

## 5. 비즈니스 로직 관점 분석

### 현재 로직의 문제점

1. **시간적 순서 무시**: 등원 예정일(12/30)이 미래인데 이미 `enrolled` 상태
2. **상태 의미 왜곡**: `enrolled`는 "등원 완료"를 의미하는데, 아직 등원하지 않음
3. **UI 혼란**: 상담 목록에서 "등원완료"로 표시되어 실제 상황과 불일치

### 올바른 로직 제안

```
[신규 상담 등록] → pending
       ↓
[등원 확정 버튼] → confirmed + 학생 레코드 생성
       ↓
[등원일 도래 시] → enrolled (수동 또는 자동)
```

---

## 6. 해결 방안

### 방안 A: RPC 함수 수정 (권장)

`create_student_from_consultation` 함수에서 상태를 `confirmed`로 변경:

```sql
UPDATE consultations
SET
  student_id = v_student_id,
  enrollment_status = 'confirmed',  -- enrolled → confirmed
  updated_at = NOW()
WHERE id = p_consultation_id;
```

### 방안 B: 등원 완료 버튼 추가

`confirmed` 상태에서 `enrolled`로 변경하는 별도 버튼/기능 추가:
- 등원일 도래 시 "등원 완료 처리" 버튼 활성화
- 클릭 시 `enrolled`로 상태 변경

### 방안 C: 자동 상태 전환

등원일 기준 자동 전환:
- 매일 자정 또는 특정 시점에 체크
- `enrollment_date <= today AND status = 'confirmed'` → `enrolled`

---

## 7. 현재 박정빈 데이터 수정

### 즉시 수정 SQL

```sql
UPDATE consultations
SET
  enrollment_status = 'confirmed',
  updated_at = NOW()
WHERE student_name = '박정빈'
  AND enrollment_date = '2025-12-30';
```

---

## 8. 결론

### 문제 요약

| 항목 | 설명 |
|------|------|
| **근본 원인** | `create_student_from_consultation` RPC에서 `enrolled` 직접 설정 |
| **영향** | 미래 등원 예정 학생이 이미 "등원완료"로 표시됨 |
| **심각도** | 중간 (비즈니스 로직 혼란, 데이터 정확성 저하) |

### 권장 조치

1. **즉시**: 박정빈 상태를 `confirmed`로 수정
2. **단기**: RPC 함수 수정하여 `confirmed` 상태로 설정
3. **장기**: 등원일 기준 자동 `enrolled` 전환 로직 구현

---

*작성일: 2025-12-28*
*Stage: 33 상담 관리 시스템*
