# 상담-학생 통합 시스템 구현 가능성 연구 리포트

**문서 번호**: 444
**작성일**: 2025-12-28
**목적**: 신규상담 → 학생탭 자동 표시 및 반배치 자동화 기능 가능성 분석

---

## 1. 요청 기능 요약

### 1.1 핵심 요구사항

1. **신규상담에서 등원정보 결정** → **학생 탭에서 자동 표시**
2. **반배치 페이지에도 자동 배치**
3. **대시보드의 출석 체크에서도 가능**
4. **학생 탭에서 역으로 신규상담 페이지 진입 가능**

---

## 2. 현재 시스템 구조 분석

### 2.1 DB 테이블 관계도

```
consultations (상담 테이블)
├─ student_id (NULL이면 신규 상담)
├─ student_name
├─ enrollment_date (등원 날짜)
├─ enrollment_status (pending/confirmed/enrolled/cancelled)
└─ consultation_subjects (과목별 배정)
    ├─ subject_id
    └─ class_id (배정된 반)

students (학생 테이블)
└─ id, name, grade_id, school, is_active

class_enrollments (반 배정 테이블)
├─ class_id
├─ student_id
├─ enrolled_at
└─ status (active/completed/dropped)
```

### 2.2 현재 구현 상태

| 항목 | 현재 상태 | 파일 |
|------|---------|------|
| **상담 테이블** | ✅ 완료 | `20251227_consultations.sql` |
| **상담 API** | ✅ 완료 | `api/consultations.ts` |
| **상담 훅** | ✅ 완료 | `hooks/useConsultations.ts` |
| **신규상담 UI** | ✅ 완료 | `pages/admin/consultation/NewConsultationPage.tsx` |
| **학생상담 UI** | ✅ 완료 | `pages/admin/consultation/StudentConsultationPage.tsx` |
| **학생 관리 페이지** | ✅ 완료 | `pages/admin/AdminStudentsPage.tsx` |
| **반 배치 페이지** | ✅ 완료 | `pages/admin/GradeOverview.tsx` |
| **출석 관리 페이지** | ✅ 완료 | `pages/admin/AttendancePage.tsx` |

---

## 3. 구현 가능성 분석

### 3.1 결론: **구현 가능** ✅

| 기능 | 가능성 | 난이도 | 비고 |
|------|--------|--------|------|
| 등원 확정 → 학생 자동 생성 | ✅ 높음 | 🟡 중간 | RPC 함수로 처리 |
| 반배치 자동화 | ✅ 높음 | 🟢 낮음 | consultation_subjects에 반 정보 이미 존재 |
| 출석 체크 자동 통합 | ✅ 높음 | 🟢 낮음 | class_enrollments 기반, 별도 수정 불필요 |
| 학생 → 상담 역진입 | ✅ 높음 | 🟢 낮음 | 버튼 추가 및 라우팅 |

---

## 4. 긍정적 요소 (구현 용이)

### A. 자동 학생 생성 메커니즘

**현재 상태:**
- `consultations.student_id`가 NULL인 신규 상담 지원
- 등원 확정 시 `enrollment_status = 'confirmed'`로 변경 가능

**자동 학생 생성 구현 방법:**
```
사용자가 신규상담에서 "등원 확정" (enrollment_date 입력)
  ↓
API: confirmEnrollment() 호출 (이미 RPC 함수 존재)
  ↓
확장:
  - student_id가 NULL이면 students 테이블에 신규 학생 생성
  - consultations.student_id 업데이트
  - class_enrollments 자동 생성 (consultation_subjects 기반)
```

### B. 반 배정 자동화

**현재 상태:**
- `consultation_subjects` 테이블에 과목별 반 정보 저장
- 각 과목마다 `class_id`로 배정된 반 명시

**자동 배정 방법:**
```
등원 확정 시:
  consultation_subjects의 각 과목별 class_id를 순회
  → class_enrollments 테이블에 INSERT
  → student_id: (신규 생성한 학생 ID)
  → class_id: consultation_subjects.class_id
  → status: 'active'
```

### C. 출석 체크 페이지 자동 통합

**현재 상태:**
- `AttendancePage.tsx`에서 반별로 학생 목록 로드
- class_enrollments 기반으로 학생 조회

**자동 통합:**
```
class_enrollments에 신규 학생 추가됨
  ↓
AttendancePage가 class_enrollments 기반으로 학생 목록 로드
  ↓
자동으로 신규 학생이 출석 체크 대상에 포함 (별도 코드 수정 불필요)
```

---

## 5. 우려되는 점 (주의 필요)

### A. 신규 학생 생성 시 필수 정보

**분석 결과:**
```typescript
// consultations 테이블에서 가져올 수 있는 필드:
student_name      ✅ (상담 폼에서 입력)
parent_phone      ✅ (상담 폼에서 입력) - 동시성 제어 키로 사용
grade_id          ✅ (상담 폼에서 선택)
school_name       ✅ (상담 폼에서 입력)

// students 테이블 필요 필드:
parent_name       ⚪ 선택사항 (필수 아님, NULL 허용)
is_active         ✅ 기본값: true
created_by        ✅ 현재 사용자 ID
```

**결론:** 필수 정보는 모두 충족됨. `parent_name`은 선택사항이므로 추가 불필요.

### B. 동시성 문제 (Race Condition)

**문제 시나리오:**
```
1. 관리자가 "등원 확정" 클릭 (API 호출 A)
2. API 지연...
3. 관리자가 또 "등원 확정" 클릭 (API 호출 B)
4. 같은 학생이 중복 생성될 수 있음
```

**해결 방안: parent_phone을 UNIQUE 키로 사용**

```sql
-- students 테이블에 UNIQUE 제약조건 추가
ALTER TABLE students
ADD CONSTRAINT students_parent_phone_unique UNIQUE (parent_phone);

-- 또는 CREATE 시:
CREATE TABLE students (
  ...
  parent_phone VARCHAR(20) UNIQUE,  -- 보호자 연락처로 중복 방지
  ...
);
```

**RPC 함수에서 처리:**
```sql
-- 학생 생성 시 parent_phone 중복 체크
INSERT INTO students (name, parent_phone, ...)
VALUES (v_consultation.student_name, v_consultation.parent_phone, ...)
ON CONFLICT (parent_phone) DO UPDATE
SET updated_at = NOW()  -- 이미 존재하면 업데이트만
RETURNING id INTO v_student_id;
```

**장점:**
- DB 레벨에서 원자적으로 중복 방지
- 같은 보호자 연락처로 중복 학생 생성 불가
- 프론트엔드 isLoading과 함께 이중 보호

**프론트엔드 보조:**
```typescript
const [isConfirming, setIsConfirming] = useState(false);

const handleConfirmEnrollment = async () => {
  if (isConfirming) return;
  setIsConfirming(true);
  try {
    await confirmEnrollment(...);
  } finally {
    setIsConfirming(false);
  }
};
```

### C. 반 미배정 상태 허용

**요구사항 변경:**
- 과목만 선택하고 반을 미배정해도 OK
- 미배정 상태로 유지 (나중에 배정 가능)

**처리 방식:**
```
consultation_subjects에 class_id = NULL로 저장
  ↓
class_enrollments 생성 스킵 (class_id가 있는 과목만 처리)
  ↓
학생은 생성되지만, 해당 과목은 반 미배정 상태
  ↓
나중에 반 배치 페이지에서 수동 배정 가능
```

**RPC 함수 처리:**
```sql
-- class_id가 있는 과목만 class_enrollments 생성
FOR v_subject IN
  SELECT class_id FROM consultation_subjects
  WHERE consultation_id = p_consultation_id
    AND class_id IS NOT NULL  -- NULL인 경우 스킵
LOOP
  INSERT INTO class_enrollments (...)
  ...
END LOOP;
```

**UI 표시:**
- 학생 목록에서 "미배정" 뱃지 표시
- 반 배치 페이지의 "미배정" 섹션에 자동 노출

---

## 6. 설계 결정사항

### Q1: 학생을 언제 생성할지?

**권장 설계:** 신규상담 → (등원 확정 시) → 학생 자동 생성

**이유:**
- "등원 확정"이 명확한 트리거 포인트
- 상담만 하고 등원 안 하는 경우 학생 생성 불필요

### Q2: "학생 탭에서 역진입"은 어떻게?

**해석 A: 기존 학생의 추가 상담 기록**
```
학생 상세 → "상담 추가" 버튼
→ StudentConsultationPage로 진입 (학생 선택됨)
```
- 이미 `StudentConsultationPage.tsx` 존재

**해석 B: 학생에서 신규상담으로 진입**
```
AdminStudentsPage → 학생 행 → "상담 기록" 버튼
→ NewConsultationPage (학생 정보 자동 입력)
```
- 버튼 추가 및 URL 파라미터 처리 필요

---

## 7. 기술적 설계

### 7.1 신규 RPC 함수 제안

```sql
CREATE OR REPLACE FUNCTION create_student_from_consultation(
  p_consultation_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_consultation RECORD;
  v_student_id UUID;
  v_subject RECORD;
  v_enrolled_count INT := 0;
  v_unassigned_count INT := 0;
BEGIN
  -- 상담 정보 조회
  SELECT * INTO v_consultation
  FROM consultations
  WHERE id = p_consultation_id AND student_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  -- 신규 학생 생성 (parent_phone UNIQUE로 중복 방지)
  INSERT INTO students (
    name, parent_phone, phone, grade_id, school, is_active, created_by
  ) VALUES (
    v_consultation.student_name,
    v_consultation.parent_phone,
    v_consultation.student_phone,
    v_consultation.grade_id,
    v_consultation.school_name,
    true,
    v_consultation.created_by
  )
  ON CONFLICT (parent_phone) DO UPDATE
  SET updated_at = NOW()  -- 이미 존재하면 기존 학생 사용
  RETURNING id INTO v_student_id;

  -- 상담에 student_id 업데이트
  UPDATE consultations
  SET student_id = v_student_id,
      enrollment_status = 'enrolled',
      updated_at = NOW()
  WHERE id = p_consultation_id;

  -- 과목별 반 배정 (class_id가 있는 것만)
  FOR v_subject IN
    SELECT class_id FROM consultation_subjects
    WHERE consultation_id = p_consultation_id
  LOOP
    IF v_subject.class_id IS NOT NULL THEN
      -- 반이 배정된 경우: class_enrollments 생성
      INSERT INTO class_enrollments (class_id, student_id, status, enrolled_at)
      VALUES (v_subject.class_id, v_student_id, 'active', CURRENT_DATE)
      ON CONFLICT DO NOTHING;
      v_enrolled_count := v_enrolled_count + 1;
    ELSE
      -- 반 미배정: 스킵 (나중에 수동 배정)
      v_unassigned_count := v_unassigned_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'enrolled_count', v_enrolled_count,
    'unassigned_count', v_unassigned_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2 프론트엔드 흐름

```typescript
// NewConsultationPage.tsx

const handleConfirmEnrollment = async () => {
  // 1. 검증
  if (!enrollmentDate) {
    showToast('등원 날짜를 입력해주세요', 'error');
    return;
  }

  // 2. 반 배정 확인
  const unassigned = Object.entries(selectedSubjects)
    .filter(([, s]) => s.checked && !s.classId);
  if (unassigned.length > 0) {
    showToast('모든 과목에 반을 배정해주세요', 'error');
    return;
  }

  try {
    setIsLoading(true);

    // 3. 상담 생성
    const consultation = await createConsultation({...});

    // 4. 학생 자동 생성 + 반 배정
    const result = await supabase.rpc('create_student_from_consultation', {
      p_consultation_id: consultation.id,
    });

    if (!result.data.success) throw new Error(result.data.error);

    showToast(`'${studentName}' 등원 완료!`, 'success');
    navigate('/admin/consultations');
  } catch (error) {
    showToast('등원 확정에 실패했습니다', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

---

## 8. 수정 필요 파일

| 파일 | 수정 유형 | 난이도 |
|------|---------|--------|
| `supabase/migrations/새파일.sql` | RPC 함수 추가 | 🟡 중간 |
| `api/consultations.ts` | 함수 추가 | 🟢 낮음 |
| `hooks/useConsultations.ts` | 훅 추가 | 🟢 낮음 |
| `NewConsultationPage.tsx` | 로직 확장 | 🟡 중간 |
| `AdminStudentsPage.tsx` | 버튼 추가 | 🟢 낮음 |

### 수정 불필요 (자동 통합)

| 파일 | 이유 |
|------|------|
| `AttendancePage.tsx` | class_enrollments 기반 조회, 자동 반영 |
| `GradeOverview.tsx` | class_enrollments 기반 조회, 자동 반영 |

---

## 9. 구현 순서 (제안)

### Phase 1: 핵심 기능 (1-2일)
- [ ] RPC 함수 작성 (`create_student_from_consultation`)
- [ ] `api/consultations.ts`에 호출 함수 추가
- [ ] `NewConsultationPage.tsx` 등원 확정 로직 확장

### Phase 2: UI 보강 (1일)
- [ ] `AdminStudentsPage.tsx`에 "상담 기록" 버튼 추가
- [ ] 등원 진행상황 표시 UI 추가

### Phase 3: 검증 (1일)
- [ ] 동시성 테스트
- [ ] Edge case 테스트
- [ ] RLS 정책 확인

**전체 예상 작업량: 3-4일**

---

## 10. 미해결 질문사항

| 질문 | 현재 상태 | 결정 |
|------|---------|------|
| parent_name 필드 | 상담 폼에 없음 | ✅ **불필요** (선택사항) |
| 동시성 제어 | 중복 생성 가능 | ✅ **parent_phone UNIQUE 제약조건** |
| 반 미배정 처리 | 오류 발생 | ✅ **미배정 허용** (나중에 수동 배정) |
| "역진입" 범위 | 미정의 | 기존 학생 상담 추가 vs 신규 상담 |
| 메이크에듀 동기화 | consultations에 synced_at 없음 | 동기화 대상인지 여부 |

---

## 11. 최종 권장사항

1. **구현 진행 권장**: 기존 코드베이스가 잘 설계되어 통합 용이
2. **RPC 함수 활용**: 트랜잭션 원자성 보장
3. **parent_phone UNIQUE**: DB 레벨에서 중복 학생 생성 방지
4. **반 미배정 허용**: class_id가 NULL인 과목은 스킵, 나중에 수동 배정
5. **프론트엔드 isLoading**: 이중 보호로 중복 클릭 방지

---

*작성: Claude Code | 상태: 분석 완료, 개발 대기*
