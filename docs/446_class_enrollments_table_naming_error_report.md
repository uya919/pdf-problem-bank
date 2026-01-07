# Stage 34 에러 분석: class_enrollments 테이블 불일치 문제

> **작성일**: 2025-12-28
> **상태**: 분석 완료, 개발 대기
> **심각도**: Critical (기능 완전 차단)

---

## 1. 에러 현상

```
Failed to create consultation: Error: relation "class_enrollments" does not exist
```

신규 상담에서 **등원 확정** 버튼 클릭 시 발생. 학생 생성은 성공하지만, 반 배정 단계에서 실패.

---

## 2. 근본 원인 분석

### 2.1 테이블 네이밍 불일치

| 구분 | 코드에서 사용 | 실제 DB |
|------|-------------|---------|
| 테이블명 | `class_enrollments` | `enrollments` |
| 발생 위치 | RPC 함수 `create_student_from_consultation` | Supabase |

### 2.2 히스토리 분석

**왜 이런 불일치가 발생했나?**

1. **초기 설계 (Stage 1)**: `enrollments` 테이블 생성
   - 컬럼: `id`, `class_id`, `student_id`, `enrolled_at`, `is_active`, `enrolled_by`

2. **Phase 7-C 반 배정 기능 설계 시**: 문서에서 `class_enrollments`로 명명
   - [useClassAssignment.ts:12](../frontend/src/hooks/useClassAssignment.ts#L12): `* - class_enrollments: 반 등록`
   - 실제 구현은 RPC 함수 `assign_students_to_class`를 통해 `enrollments` 직접 접근

3. **Stage 34 RPC 함수 작성 시**: 문서의 `class_enrollments` 명칭을 그대로 사용
   - 실제 테이블명 확인 없이 코드 작성

### 2.3 현재 enrollments 테이블 스키마

```sql
-- 실제 Supabase에 존재하는 테이블
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES students(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  enrolled_by UUID REFERENCES teachers(id),

  -- 제약조건
  UNIQUE(student_id, class_id)  -- 중복 배정 방지
);
```

**제약조건 분석:**
- `enrollments_class_id_student_id_key`: (student_id, class_id) 복합 UNIQUE
- 같은 학생이 같은 반에 두 번 배정 불가

---

## 3. 영향 범위 분석

### 3.1 코드베이스 검색 결과

```bash
# "class_enrollments" 또는 "class-enrollments" 사용처
frontend/src/types/database.ts:433          # 타입 정의 (미사용)
frontend/src/hooks/useConsultations.ts:155  # 쿼리 키 (무효화용)
frontend/src/hooks/useClassAssignment.ts:12 # 주석만
```

### 3.2 실제 enrollments 테이블 사용처

```bash
# 실제 "enrollments" 테이블 사용
frontend/src/api/classes.ts:145-160         # getClassStudentCounts()
frontend/src/api/classes.ts:368-396         # getStudentsByClass()
frontend/src/hooks/useBackofficeData.ts     # 학생 목록
frontend/src/hooks/useAdminData.ts          # 관리자 데이터
```

### 3.3 영향 분석 요약

| 파일 | 영향 | 조치 필요 |
|------|------|---------|
| RPC 함수 | **Critical** | 테이블명 수정 필수 |
| useConsultations.ts | Low | 쿼리 키만 사용 (실제 테이블 접근 X) |
| types/database.ts | None | 미사용 타입 |
| useClassAssignment.ts | None | 주석만, RPC 함수로 접근 |

---

## 4. 현재 RPC 함수의 문제점

```sql
-- 현재 (잘못된) 코드
INSERT INTO class_enrollments (  -- ❌ 존재하지 않는 테이블
  student_id,
  class_id,
  is_active
) VALUES (...)
```

```sql
-- 수정 필요
INSERT INTO enrollments (  -- ✅ 실제 테이블명
  student_id,
  class_id,
  is_active
) VALUES (...)
```

---

## 5. 추가 발견: students 테이블 UNIQUE 제약조건

### 5.1 현재 상태

```sql
-- 현재 students 테이블 제약조건
CONSTRAINT students_name_parent_phone_unique
  UNIQUE (name, parent_phone)
```

### 5.2 문제점

`parent_phone`이 NULL인 경우 UNIQUE 제약조건이 작동하지 않음:
- PostgreSQL에서 NULL은 비교 불가
- `(이름A, NULL)` ≠ `(이름A, NULL)` → 중복 INSERT 가능

### 5.3 RPC 함수 ON CONFLICT 구문 분석

```sql
-- 현재 코드
ON CONFLICT (name, parent_phone)
  WHERE parent_phone IS NOT NULL
DO UPDATE SET ...
```

**동작:**
- `parent_phone`이 NULL이면 ON CONFLICT 조건 불충족
- 항상 새 레코드 INSERT (중복 가능)

**의도한 동작:**
- 보호자 연락처 없이도 등록 가능
- 같은 이름 + 같은 보호자 연락처면 기존 학생 업데이트

**현재 코드가 정확함** - NULL일 때는 새 학생 생성, NOT NULL일 때만 중복 체크

---

## 6. 해결 방안

### 6.1 RPC 함수 수정 (필수)

```sql
DROP FUNCTION IF EXISTS create_student_from_consultation(UUID);

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

  -- 4. 상담에 학생 ID 연결 + 상태 업데이트
  UPDATE consultations
  SET
    student_id = v_student_id,
    enrollment_status = 'enrolled',
    updated_at = NOW()
  WHERE id = p_consultation_id;

  -- 5. 과목별 반 배정 (enrollments 테이블 사용!)
  FOR v_subject IN
    SELECT
      cs.subject_id,
      cs.class_id
    FROM consultation_subjects cs
    WHERE cs.consultation_id = p_consultation_id
  LOOP
    IF v_subject.class_id IS NOT NULL THEN
      -- 반이 지정된 경우: enrollments에 등록
      INSERT INTO enrollments (  -- ✅ 올바른 테이블명
        student_id,
        class_id,
        is_active
      ) VALUES (
        v_student_id,
        v_subject.class_id,
        true
      )
      ON CONFLICT (student_id, class_id) DO UPDATE SET
        is_active = true;

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
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 변경 사항 요약

| 항목 | 이전 | 이후 |
|------|------|------|
| 테이블명 | `class_enrollments` | `enrollments` |
| `created_by` 컬럼 | 참조 (오류) | 제거 |
| `parent_phone` | 필수 | 선택 |

---

## 7. 테스트 시나리오

### 7.1 기본 등원 확정

```
1. 신규 상담 생성
2. 학생 이름: "테스트학생"
3. 과목: 수학 선택 + 반 배정
4. 등원 예정일 입력
5. 저장 버튼 클릭
→ 기대 결과: 학생 생성 + 반 배정 완료
```

### 7.2 보호자 연락처 없이 등원

```
1. 신규 상담 생성
2. 학생 이름만 입력
3. 보호자 연락처: 빈칸
4. 등원 예정일 입력
5. 저장
→ 기대 결과: 학생 생성 성공 (연락처 NULL)
```

### 7.3 중복 등원 방지

```
1. 동일 이름 + 동일 보호자 연락처로 상담 2건 생성
2. 첫 번째 상담 등원 확정
3. 두 번째 상담 등원 확정
→ 기대 결과: 첫 번째는 새 학생 생성, 두 번째는 기존 학생 업데이트
```

### 7.4 형제 등록 (같은 보호자 연락처, 다른 이름)

```
1. 학생 "이규리" + 보호자 010-1234-5678 → 등원 확정
2. 학생 "이규연" + 보호자 010-1234-5678 → 등원 확정
→ 기대 결과: 두 명의 학생 모두 생성 (형제 지원)
```

---

## 8. 관련 문서

- [444_consultation_student_integration_feasibility_report.md](./444_consultation_student_integration_feasibility_report.md)
- [445_consultation_student_integration_development_plan.md](./445_consultation_student_integration_development_plan.md)

---

## 9. 실행 체크리스트

- [ ] Supabase SQL Editor에서 수정된 RPC 함수 실행
- [ ] 테스트 시나리오 7.1 검증
- [ ] 테스트 시나리오 7.2 검증
- [ ] 테스트 시나리오 7.3 검증
- [ ] 테스트 시나리오 7.4 검증
- [ ] 프론트엔드 빌드 확인
- [ ] Stage 34 완료 표시

---

*작성: Claude Code | 분석 완료, 개발 진행 필요*
