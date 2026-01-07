# 상담-학생 통합 시스템 개발 계획

**문서 번호**: 445
**작성일**: 2025-12-28
**기반 문서**: [444_consultation_student_integration_feasibility_report.md](444_consultation_student_integration_feasibility_report.md)

---

## 1. 개발 목표

신규상담에서 등원 확정 시:
1. 학생 자동 생성 (students 테이블)
2. 반 자동 배치 (class_enrollments 테이블)
3. 출석 체크 자동 통합 (별도 작업 불필요)
4. 학생 → 상담 역진입 기능

---

## 2. 개발 단계 개요

| Stage | 이름 | 작업 내용 | 예상 시간 |
|-------|------|---------|----------|
| **34-A** | DB 스키마 수정 | students.parent_phone UNIQUE 제약조건 | 30분 |
| **34-B** | RPC 함수 생성 | create_student_from_consultation() | 1시간 |
| **34-C** | API/Hook 추가 | confirmEnrollmentWithStudent() | 30분 |
| **34-D** | 상담 UI 수정 | 등원 확정 버튼 로직 변경 | 1시간 |
| **34-E** | 학생 → 상담 역진입 | AdminStudentsPage에 상담 버튼 추가 | 1시간 |
| **34-F** | 테스트 및 검증 | E2E 테스트 | 1시간 |

**총 예상 시간: 5시간 (1일)**

---

## 3. Stage 34-A: DB 스키마 수정

### 목표
- students 테이블에 parent_phone UNIQUE 제약조건 추가
- 동시성 문제 방지 (중복 학생 생성 차단)

### 파일 생성
```
supabase/migrations/20251228_students_parent_phone_unique.sql
```

### SQL 마이그레이션
```sql
-- Stage 34-A: students.parent_phone UNIQUE 제약조건
-- 목적: 동시성 제어 - 같은 보호자 연락처로 중복 학생 생성 방지

-- 1. 기존 중복 데이터 확인 (있으면 먼저 정리 필요)
-- SELECT parent_phone, COUNT(*) FROM students
-- WHERE parent_phone IS NOT NULL
-- GROUP BY parent_phone HAVING COUNT(*) > 1;

-- 2. UNIQUE 제약조건 추가
ALTER TABLE students
ADD CONSTRAINT students_parent_phone_unique UNIQUE (parent_phone);

-- 3. 인덱스 확인 (UNIQUE 제약조건이 자동으로 인덱스 생성)
COMMENT ON CONSTRAINT students_parent_phone_unique ON students IS
'동시성 제어: 같은 보호자 연락처로 중복 학생 생성 방지. Stage 34-A';
```

### 검증 방법
```sql
-- 제약조건 확인
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'students' AND constraint_type = 'UNIQUE';
```

### 예상 에러 케이스
| 에러 | 원인 | 해결 |
|------|------|------|
| `duplicate key value violates unique constraint` | 기존 중복 데이터 존재 | 중복 데이터 정리 후 재실행 |

---

## 4. Stage 34-B: RPC 함수 생성

### 목표
- 상담 → 학생 자동 생성 + 반 배치 RPC 함수

### 파일 생성
```
supabase/migrations/20251228_create_student_from_consultation.sql
```

### SQL 마이그레이션
```sql
-- Stage 34-B: 상담에서 학생 생성 RPC 함수
-- 트랜잭션으로 원자성 보장

CREATE OR REPLACE FUNCTION create_student_from_consultation(
  p_consultation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consultation RECORD;
  v_student_id UUID;
  v_subject RECORD;
  v_enrolled_count INT := 0;
  v_unassigned_count INT := 0;
BEGIN
  -- 1. 상담 정보 조회 (student_id가 NULL인 경우만)
  SELECT
    c.*,
    cs.subjects_data
  INTO v_consultation
  FROM consultations c
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'subject_id', cs.subject_id,
      'class_id', cs.class_id
    )) as subjects_data
    FROM consultation_subjects cs
    WHERE cs.consultation_id = c.id
  ) cs ON true
  WHERE c.id = p_consultation_id
    AND c.student_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Consultation not found or student already exists'
    );
  END IF;

  -- 2. 신규 학생 생성 (parent_phone UNIQUE로 중복 방지)
  INSERT INTO students (
    name,
    parent_phone,
    phone,
    grade_id,
    school,
    is_active,
    created_by,
    created_at
  ) VALUES (
    v_consultation.student_name,
    v_consultation.parent_phone,
    v_consultation.student_phone,
    v_consultation.grade_id,
    v_consultation.school_name,
    true,
    v_consultation.created_by,
    NOW()
  )
  ON CONFLICT (parent_phone) DO UPDATE
  SET updated_at = NOW()
  RETURNING id INTO v_student_id;

  -- 3. 상담에 student_id 업데이트
  UPDATE consultations
  SET
    student_id = v_student_id,
    enrollment_status = 'enrolled',
    updated_at = NOW()
  WHERE id = p_consultation_id;

  -- 4. 과목별 반 배정 (class_id가 있는 것만)
  FOR v_subject IN
    SELECT subject_id, class_id
    FROM consultation_subjects
    WHERE consultation_id = p_consultation_id
  LOOP
    IF v_subject.class_id IS NOT NULL THEN
      -- 반이 배정된 경우: class_enrollments 생성
      INSERT INTO class_enrollments (
        class_id,
        student_id,
        status,
        enrolled_at
      ) VALUES (
        v_subject.class_id,
        v_student_id,
        'active',
        CURRENT_DATE
      )
      ON CONFLICT (class_id, student_id) DO NOTHING;
      v_enrolled_count := v_enrolled_count + 1;
    ELSE
      -- 반 미배정: 스킵 (나중에 수동 배정)
      v_unassigned_count := v_unassigned_count + 1;
    END IF;
  END LOOP;

  -- 5. 결과 반환
  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'student_name', v_consultation.student_name,
    'enrolled_count', v_enrolled_count,
    'unassigned_count', v_unassigned_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- RPC 함수 권한 설정
GRANT EXECUTE ON FUNCTION create_student_from_consultation(UUID) TO authenticated;

COMMENT ON FUNCTION create_student_from_consultation IS
'Stage 34-B: 상담에서 학생 자동 생성 + 반 배치. 등원 확정 시 호출.';
```

### 검증 방법
```sql
-- 함수 존재 확인
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'create_student_from_consultation';

-- 테스트 호출 (실제 consultation_id로)
-- SELECT create_student_from_consultation('consultation-uuid-here');
```

---

## 5. Stage 34-C: API/Hook 추가

### 목표
- 프론트엔드에서 RPC 함수 호출할 수 있도록 API 함수와 Hook 추가

### 파일 수정: `frontend/src/api/consultations.ts`

```typescript
// 추가할 함수

/**
 * 등원 확정 + 학생 자동 생성
 * Stage 34-C: 상담에서 학생 생성 RPC 호출
 */
export interface ConfirmEnrollmentResult {
  success: boolean;
  student_id?: string;
  student_name?: string;
  enrolled_count?: number;
  unassigned_count?: number;
  error?: string;
}

export async function confirmEnrollmentWithStudent(
  consultationId: string
): Promise<ConfirmEnrollmentResult> {
  const { data, error } = await supabase
    .rpc('create_student_from_consultation', {
      p_consultation_id: consultationId
    });

  if (error) {
    console.error('confirmEnrollmentWithStudent error:', error);
    return { success: false, error: error.message };
  }

  return data as ConfirmEnrollmentResult;
}
```

### 파일 수정: `frontend/src/hooks/useConsultations.ts`

```typescript
// 추가할 Hook

import { confirmEnrollmentWithStudent, ConfirmEnrollmentResult } from '../api/consultations';

/**
 * 등원 확정 + 학생 자동 생성 Hook
 * Stage 34-C
 */
export function useConfirmEnrollmentWithStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationId: string) =>
      confirmEnrollmentWithStudent(consultationId),
    onSuccess: (result) => {
      if (result.success) {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ queryKey: ['consultations'] });
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['class-enrollments'] });
      }
    },
  });
}
```

### 타입 export 확인
```typescript
// frontend/src/api/consultations.ts 상단에 export 확인
export type { ConfirmEnrollmentResult };
```

---

## 6. Stage 34-D: 상담 UI 수정

### 목표
- NewConsultationPage.tsx에서 등원 확정 시 학생 자동 생성 로직 추가

### 파일 수정: `frontend/src/pages/admin/consultation/NewConsultationPage.tsx`

### 변경 내용

#### 1. Import 추가
```typescript
import { useConfirmEnrollmentWithStudent } from '../../../hooks/useConsultations';
```

#### 2. Hook 사용
```typescript
const { mutateAsync: confirmWithStudent, isPending: isConfirming } =
  useConfirmEnrollmentWithStudent();
```

#### 3. 등원 확정 핸들러 수정
```typescript
const handleConfirmEnrollment = async () => {
  // 중복 클릭 방지
  if (isConfirming) return;

  // 필수값 검증
  if (!studentName.trim()) {
    showToast('학생 이름을 입력해주세요', 'error');
    return;
  }
  if (!parentPhone.trim()) {
    showToast('보호자 연락처를 입력해주세요', 'error');
    return;
  }
  if (!enrollmentDate) {
    showToast('등원 날짜를 선택해주세요', 'error');
    return;
  }

  try {
    // 1. 상담 생성
    const consultation = await createConsultation({
      student_name: studentName,
      parent_phone: parentPhone,
      student_phone: studentPhone || null,
      grade_id: gradeId || null,
      school_name: schoolName || null,
      consultation_date: consultationDate,
      enrollment_date: enrollmentDate,
      enrollment_status: 'confirmed',
      subjects: Object.entries(selectedSubjects)
        .filter(([, state]) => state.checked)
        .map(([code, state]) => ({
          subject_id: SUBJECTS.find(s => s.code === code)?.id,
          class_id: state.classId || null,  // 미배정 허용
        })),
    });

    // 2. 학생 자동 생성 + 반 배치
    const result = await confirmWithStudent(consultation.id);

    if (!result.success) {
      throw new Error(result.error || '학생 생성 실패');
    }

    // 3. 성공 메시지
    const message = result.unassigned_count > 0
      ? `'${result.student_name}' 등원 완료! (${result.enrolled_count}개 반 배정, ${result.unassigned_count}개 미배정)`
      : `'${result.student_name}' 등원 완료! (${result.enrolled_count}개 반 배정)`;

    showToast(message, 'success');
    navigate('/admin/consultations');

  } catch (error) {
    console.error('등원 확정 실패:', error);
    showToast(
      error instanceof Error ? error.message : '등원 확정에 실패했습니다',
      'error'
    );
  }
};
```

#### 4. 버튼 비활성화 상태 추가
```typescript
<button
  onClick={handleConfirmEnrollment}
  disabled={isConfirming}
  className={`px-4 py-2 rounded-lg font-medium ${
    isConfirming
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-blue-500 text-white hover:bg-blue-600'
  }`}
>
  {isConfirming ? '처리 중...' : '등원 확정'}
</button>
```

---

## 7. Stage 34-E: 학생 → 상담 역진입

### 목표
- AdminStudentsPage에서 학생 클릭 시 해당 학생의 상담 기록으로 이동 가능

### 파일 수정: `frontend/src/pages/admin/AdminStudentsPage.tsx`

### 변경 내용

#### 1. 학생 행에 "상담 기록" 버튼 추가

기존 StudentRow 컴포넌트 내 액션 버튼 영역에 추가:

```typescript
// Import 추가
import { MessageSquare } from 'lucide-react';

// 상담 기록 버튼 추가 (기존 액션 버튼 옆에)
<button
  onClick={() => navigate('/admin/consultation/student', {
    state: { selectedStudentId: student.id }
  })}
  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
  title="상담 기록"
>
  <MessageSquare className="w-4 h-4" />
</button>
```

#### 2. 또는 드롭다운 메뉴에 추가

```typescript
// 학생 행의 더보기(⋯) 메뉴에 추가
<DropdownMenuItem
  onClick={() => navigate('/admin/consultation/student', {
    state: { selectedStudentId: student.id }
  })}
>
  <MessageSquare className="w-4 h-4 mr-2" />
  상담 기록
</DropdownMenuItem>
```

### 파일 수정: `frontend/src/pages/admin/consultation/StudentConsultationPage.tsx`

#### URL state에서 초기 학생 ID 받기

```typescript
import { useLocation } from 'react-router-dom';

export default function StudentConsultationPage() {
  const location = useLocation();

  // URL state에서 학생 ID 받기 (AdminStudentsPage에서 넘어온 경우)
  const initialStudentId = location.state?.selectedStudentId || null;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    initialStudentId
  );

  // ... 기존 로직
}
```

---

## 8. Stage 34-F: 테스트 및 검증

### 테스트 시나리오

#### 시나리오 1: 기본 등원 확정
```
1. 신규상담 페이지 접속
2. 학생 정보 입력 (이름, 보호자 연락처, 학년)
3. 과목 선택 + 반 배정
4. 등원 날짜 선택
5. "등원 확정" 클릭
6. 확인:
   - students 테이블에 신규 학생 생성됨
   - consultations.student_id 업데이트됨
   - class_enrollments에 반 배정됨
   - 학생 탭에서 신규 학생 보임
```

#### 시나리오 2: 반 미배정 등원
```
1. 신규상담 페이지 접속
2. 학생 정보 입력
3. 과목 선택 (반은 배정 안함)
4. 등원 확정
5. 확인:
   - 학생 생성됨
   - class_enrollments 생성 안됨 (미배정)
   - 반 배치 페이지 "미배정" 섹션에 표시
```

#### 시나리오 3: 중복 클릭 방지
```
1. 등원 확정 버튼 빠르게 2번 클릭
2. 확인:
   - 버튼 비활성화로 1번만 처리됨
   - 학생 1명만 생성됨
```

#### 시나리오 4: 같은 보호자 연락처
```
1. 같은 parent_phone으로 두 번째 상담 등원 확정 시도
2. 확인:
   - 기존 학생 ID 반환됨 (새로 생성 안됨)
   - 상담은 기존 학생에 연결됨
```

#### 시나리오 5: 학생 → 상담 역진입
```
1. 학생 탭에서 학생 선택
2. "상담 기록" 버튼 클릭
3. 확인:
   - StudentConsultationPage로 이동
   - 해당 학생이 자동 선택됨
```

### 검증 SQL
```sql
-- 최근 생성된 학생 확인
SELECT id, name, parent_phone, grade_id, created_at
FROM students
ORDER BY created_at DESC
LIMIT 5;

-- 최근 상담-학생 연결 확인
SELECT
  c.id as consultation_id,
  c.student_name,
  c.student_id,
  s.name as linked_student_name,
  c.enrollment_status
FROM consultations c
LEFT JOIN students s ON c.student_id = s.id
ORDER BY c.created_at DESC
LIMIT 5;

-- 반 배정 확인
SELECT
  ce.student_id,
  s.name,
  cl.name as class_name,
  ce.enrolled_at
FROM class_enrollments ce
JOIN students s ON ce.student_id = s.id
JOIN classes cl ON ce.class_id = cl.id
ORDER BY ce.enrolled_at DESC
LIMIT 10;
```

---

## 9. 파일 변경 요약

| 파일 | 변경 유형 | Stage |
|------|---------|-------|
| `supabase/migrations/20251228_students_parent_phone_unique.sql` | 신규 | 34-A |
| `supabase/migrations/20251228_create_student_from_consultation.sql` | 신규 | 34-B |
| `frontend/src/api/consultations.ts` | 수정 (+30줄) | 34-C |
| `frontend/src/hooks/useConsultations.ts` | 수정 (+20줄) | 34-C |
| `frontend/src/pages/admin/consultation/NewConsultationPage.tsx` | 수정 (+50줄) | 34-D |
| `frontend/src/pages/admin/AdminStudentsPage.tsx` | 수정 (+15줄) | 34-E |
| `frontend/src/pages/admin/consultation/StudentConsultationPage.tsx` | 수정 (+10줄) | 34-E |

---

## 10. 롤백 계획

### 문제 발생 시 롤백 순서

```sql
-- 1. RPC 함수 삭제
DROP FUNCTION IF EXISTS create_student_from_consultation(UUID);

-- 2. UNIQUE 제약조건 삭제
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_parent_phone_unique;
```

### 프론트엔드 롤백
- 기존 등원 확정 로직으로 복원 (상담만 생성, 학생 수동 생성)

---

## 11. 실행 순서

```
Phase 34-A → Phase 34-B → Phase 34-C → Phase 34-D → Phase 34-E → Phase 34-F
   (DB)        (RPC)        (API)        (UI)        (역진입)     (테스트)
```

각 Phase 완료 후 빌드 테스트 필수:
```bash
cd frontend && npm run build
```

---

*작성: Claude Code | 상태: 개발 계획 완료, 실행 대기*
