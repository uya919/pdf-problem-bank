# 448. 등원 상태 로직 수정 개발 계획

> **Stage 33-Fix: 등원 확정 시 상태를 'confirmed'로 설정**

---

## 1. 개요

### 문제
- `create_student_from_consultation` RPC가 상태를 바로 `enrolled`로 설정
- 등원 예정일이 미래인데 "등원완료"로 표시되는 논리적 오류

### 목표
- 등원 확정 시 `confirmed` 상태로 설정
- 실제 등원 후 `enrolled`로 전환하는 흐름 구현
- 박정빈 데이터 수정

---

## 2. 상태 흐름 정의

```
pending (상담중)
    ↓ [등원 확정 버튼]
confirmed (등원확정) ← 학생 레코드 생성, 반 배치
    ↓ [등원 완료 버튼 - 등원일 이후]
enrolled (등원완료)
```

---

## 3. 단계별 개발 계획

### Phase 1: RPC 함수 수정 (DB)

**파일:** Supabase SQL 실행

**변경 내용:**
```sql
-- create_student_from_consultation 함수에서
-- enrollment_status = 'enrolled' → 'confirmed'
```

**SQL:**
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
  -- 1. 상담 정보 조회
  SELECT * INTO v_consultation
  FROM consultations
  WHERE id = p_consultation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
  END IF;

  -- 2. 이미 등록된 학생이 있는지 확인
  IF v_consultation.student_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Student already exists for this consultation'
    );
  END IF;

  -- 3. 학생 생성
  INSERT INTO students (
    name,
    grade_id,
    school,
    phone,
    parent_phone,
    is_active
  ) VALUES (
    v_consultation.student_name,
    v_consultation.grade_id,
    v_consultation.school_name,
    v_consultation.student_phone,
    v_consultation.parent_phone,
    true
  )
  ON CONFLICT (name, parent_phone)
    WHERE parent_phone IS NOT NULL
  DO UPDATE SET
    grade_id = EXCLUDED.grade_id,
    school = EXCLUDED.school,
    phone = EXCLUDED.phone,
    is_active = true
  RETURNING id INTO v_student_id;

  -- 4. 상담에 학생 ID 연결 + 상태를 'confirmed'로 (수정됨!)
  UPDATE consultations
  SET
    student_id = v_student_id,
    enrollment_status = 'confirmed',  -- enrolled → confirmed
    updated_at = NOW()
  WHERE id = p_consultation_id;

  -- 5. 과목별 반 배정
  FOR v_subject IN
    SELECT cs.subject_id, cs.class_id
    FROM consultation_subjects cs
    WHERE cs.consultation_id = p_consultation_id
  LOOP
    IF v_subject.class_id IS NOT NULL THEN
      INSERT INTO class_enrollments (student_id, class_id, is_active)
      VALUES (v_student_id, v_subject.class_id, true)
      ON CONFLICT (student_id, class_id) DO UPDATE SET is_active = true;
      v_enrolled_count := v_enrolled_count + 1;
    ELSE
      v_unassigned_count := v_unassigned_count + 1;
    END IF;
  END LOOP;

  -- 6. 결과 반환
  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'student_name', v_consultation.student_name,
    'enrolled_count', v_enrolled_count,
    'unassigned_count', v_unassigned_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**검증:**
- [ ] RPC 함수 업데이트 성공
- [ ] 새 상담 등원 확정 시 `confirmed` 상태 확인

---

### Phase 2: 박정빈 데이터 수정 (DB)

**SQL:**
```sql
UPDATE consultations
SET
  enrollment_status = 'confirmed',
  updated_at = NOW()
WHERE student_name = '박정빈'
  AND enrollment_date = '2025-12-30';
```

**검증:**
- [ ] 박정빈 상태가 `confirmed`로 변경됨
- [ ] 상담 목록에서 "등원확정"으로 표시됨

---

### Phase 3: 등원 완료 버튼 추가 (Frontend)

**파일:** `frontend/src/pages/admin/consultation/ConsultationListPage.tsx`

**변경 내용:**
1. `confirmed` 상태에서 "등원 완료" 버튼 표시
2. 등원일 이후에만 버튼 활성화
3. 클릭 시 `enrolled`로 상태 변경

**코드 변경:**

```typescript
// 1. 등원 완료 처리 함수 추가
const handleCompleteEnrollment = async (
  consultationId: string,
  studentName: string
) => {
  if (!confirm(`${studentName} 학생의 등원을 완료 처리하시겠습니까?`)) {
    return;
  }

  try {
    await updateConsultation(consultationId, {
      enrollment_status: 'enrolled',
    });
    showToast(`${studentName} 학생 등원이 완료되었습니다.`, 'success');
    // 목록 새로고침
    queryClient.invalidateQueries({ queryKey: ['consultations'] });
  } catch (error) {
    console.error('Failed to complete enrollment:', error);
    showToast('등원 완료 처리에 실패했습니다.', 'error');
  }
};

// 2. 버튼 렌더링 (액션 버튼 영역)
{consultation.enrollment_status === 'confirmed' && (
  <button
    onClick={() => handleCompleteEnrollment(
      consultation.id,
      consultation.student_name
    )}
    disabled={
      consultation.enrollment_date &&
      new Date(consultation.enrollment_date) > new Date()
    }
    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
      consultation.enrollment_date &&
      new Date(consultation.enrollment_date) > new Date()
        ? 'bg-grey-100 text-grey-400 cursor-not-allowed'
        : 'bg-green-50 text-green-600 hover:bg-green-100'
    }`}
  >
    등원 완료
  </button>
)}
```

**의존성:**
- `updateConsultation` API 함수 (이미 존재)
- `useQueryClient` from TanStack Query

**검증:**
- [ ] `confirmed` 상태에서 "등원 완료" 버튼 표시
- [ ] 등원일 이전: 버튼 비활성화 (회색)
- [ ] 등원일 이후: 버튼 활성화 (녹색)
- [ ] 클릭 시 `enrolled` 상태로 변경

---

### Phase 4: v_enrollment_calendar 뷰 수정 (DB)

**현재 문제:**
- `enrollment_status = 'confirmed'`인 상담만 캘린더에 표시
- `enrolled` 상태도 등원 예정으로 표시될 수 있음

**변경 필요성 검토:**
- 현재 로직이 맞음 (`confirmed`만 표시)
- 수정 불필요

---

## 4. 파일 변경 요약

| Phase | 파일 | 변경 유형 | 설명 |
|-------|------|----------|------|
| 1 | Supabase RPC | 수정 | `enrolled` → `confirmed` |
| 2 | Supabase Data | 수정 | 박정빈 상태 수정 |
| 3 | ConsultationListPage.tsx | 수정 | 등원 완료 버튼 추가 |

---

## 5. 테스트 체크리스트

### Phase 1 테스트
- [ ] 신규 상담 생성 → 등원 확정 → 상태가 `confirmed`인지 확인
- [ ] 학생 레코드 생성 확인
- [ ] 반 배치 확인

### Phase 2 테스트
- [ ] 박정빈 상태가 `confirmed`로 표시
- [ ] 상담 목록 UI에서 "등원확정" 뱃지 표시

### Phase 3 테스트
- [ ] `pending` 상태: "등원 확정" 버튼만 표시
- [ ] `confirmed` 상태 + 등원일 이전: "등원 완료" 버튼 비활성화
- [ ] `confirmed` 상태 + 등원일 이후: "등원 완료" 버튼 활성화
- [ ] `enrolled` 상태: 버튼 없음

---

## 6. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| RPC 함수 업데이트 실패 | 권한 문제 | Supabase 대시보드에서 직접 실행 |
| 날짜 비교 오류 | 타임존 | `new Date().toISOString().split('T')[0]` 사용 |
| 목록 새로고침 안됨 | 캐시 | `queryClient.invalidateQueries` 호출 |

---

## 7. 실행 순서

```
Phase 1 (RPC 수정)
    ↓
Phase 2 (박정빈 데이터 수정)
    ↓
Phase 3 (등원 완료 버튼)
```

---

*작성일: 2025-12-28*
*참조: [447_enrollment_status_logic_error_report.md](447_enrollment_status_logic_error_report.md)*
