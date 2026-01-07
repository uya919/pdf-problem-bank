-- =====================================================
-- Stage 34 Fix: create_student_from_consultation RPC 함수 수정
-- Version: 1.0.2
-- Created: 2025-12-28
-- Updated: 2025-12-28
-- Description:
--   - created_by 컬럼 참조 제거 (students 테이블에 없음)
--   - parent_phone 선택적으로 변경 (형제 등록 지원)
--   - enrollment_status를 'confirmed'로 변경 (등원 예정일 전까지 등원확정 상태 유지)
-- =====================================================

-- 기존 함수 삭제 후 재생성
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

  -- 3. 학생 생성 (created_by 컬럼 제외)
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
    v_consultation.parent_phone,  -- NULL 허용
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

  -- 4. 상담에 학생 ID 연결 + 상태를 'confirmed'로 (v1.0.2 수정)
  UPDATE consultations
  SET
    student_id = v_student_id,
    enrollment_status = 'confirmed',  -- enrolled → confirmed (등원일까지 대기)
    updated_at = NOW()
  WHERE id = p_consultation_id;

  -- 5. 과목별 반 배정 (class_enrollments 생성)
  FOR v_subject IN
    SELECT
      cs.subject_id,
      cs.class_id
    FROM consultation_subjects cs
    WHERE cs.consultation_id = p_consultation_id
  LOOP
    IF v_subject.class_id IS NOT NULL THEN
      -- 반이 지정된 경우: 등록
      INSERT INTO class_enrollments (
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
      -- 반이 미지정인 경우
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

-- =====================================================
-- END OF MIGRATION
-- =====================================================
