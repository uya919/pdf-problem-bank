-- =====================================================
-- Stage 33: 상담 관리 시스템
-- Version: 1.0.0
-- Created: 2025-12-27
-- Description: 신규상담/학생상담 + 등원 알림 시스템
-- =====================================================

-- =====================================================
-- 1. CONSULTATIONS (상담 테이블)
-- =====================================================

CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 상담 대상 (신규 or 기존 학생)
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,  -- NULL이면 신규 상담

  -- 신규 상담 시 학생 정보
  student_name VARCHAR(100) NOT NULL,
  grade_id UUID REFERENCES grades(id),
  school_name VARCHAR(100),
  student_phone VARCHAR(20),
  parent_phone VARCHAR(20),

  -- 상담 정보
  consultation_date DATE NOT NULL,
  preferred_schedule TEXT,  -- "월수금 오후 5시"
  notes TEXT,

  -- 등원 정보
  enrollment_date DATE,     -- 확정된 등원 날짜
  enrollment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (enrollment_status IN ('pending', 'confirmed', 'enrolled', 'cancelled')),
  -- pending: 상담 중
  -- confirmed: 등원 확정
  -- enrolled: 등원 완료 (학생 등록됨)
  -- cancelled: 취소

  -- 메타
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(enrollment_status);
CREATE INDEX IF NOT EXISTS idx_consultations_enrollment_date ON consultations(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_consultations_student ON consultations(student_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date);

-- =====================================================
-- 2. CONSULTATION_SUBJECTS (상담-과목 매핑)
-- =====================================================

CREATE TABLE IF NOT EXISTS consultation_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,  -- 배정된 반 (NULL 가능)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(consultation_id, subject_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_consultation_subjects_consultation ON consultation_subjects(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_subjects_subject ON consultation_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_consultation_subjects_class ON consultation_subjects(class_id);

-- =====================================================
-- 3. ENROLLMENT_NOTIFICATIONS (등원 알림)
-- =====================================================

CREATE TABLE IF NOT EXISTS enrollment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,

  -- 알림 대상
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('teacher', 'subject_manager')),

  -- 알림 정보
  student_name VARCHAR(100) NOT NULL,
  enrollment_date DATE NOT NULL,
  class_name VARCHAR(100),
  subject_name VARCHAR(50),

  -- 알림 스케줄
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('immediate', 'd-1', 'd-day')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 알림 방지
  UNIQUE(consultation_id, recipient_id, notification_type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_enrollment_notifications_pending
  ON enrollment_notifications(scheduled_at) WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_enrollment_notifications_recipient ON enrollment_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_notifications_date ON enrollment_notifications(enrollment_date);

-- =====================================================
-- 4. SUBJECTS 테이블 확장 (과목별 관리자)
-- =====================================================

-- 과목별 관리자 배열 컬럼 추가
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS manager_ids UUID[] DEFAULT '{}';

-- 코멘트
COMMENT ON COLUMN subjects.manager_ids IS '과목별 관리자 ID 배열 (다중 선택 가능)';

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Consultations RLS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultations viewable by authenticated users"
  ON consultations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Consultations insertable by authenticated users"
  ON consultations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Consultations updatable by authenticated users"
  ON consultations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Consultations deletable by authenticated users"
  ON consultations FOR DELETE TO authenticated USING (true);

-- Consultation Subjects RLS
ALTER TABLE consultation_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consultation subjects viewable by authenticated users"
  ON consultation_subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Consultation subjects insertable by authenticated users"
  ON consultation_subjects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Consultation subjects updatable by authenticated users"
  ON consultation_subjects FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Consultation subjects deletable by authenticated users"
  ON consultation_subjects FOR DELETE TO authenticated USING (true);

-- Enrollment Notifications RLS
ALTER TABLE enrollment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrollment notifications viewable by authenticated users"
  ON enrollment_notifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enrollment notifications insertable by authenticated users"
  ON enrollment_notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enrollment notifications updatable by authenticated users"
  ON enrollment_notifications FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- 6. UPDATED_AT 트리거
-- =====================================================

-- consultations updated_at 트리거
DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. 뷰: 등원 예정 캘린더 표시용
-- =====================================================

CREATE OR REPLACE VIEW v_enrollment_calendar AS
SELECT
  c.id,
  c.id AS consultation_id,
  c.student_name,
  c.enrollment_date,
  ARRAY_AGG(DISTINCT cl.name) FILTER (WHERE cl.name IS NOT NULL) AS class_names,
  ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS subject_names
FROM consultations c
LEFT JOIN consultation_subjects cs ON c.id = cs.consultation_id
LEFT JOIN classes cl ON cs.class_id = cl.id
LEFT JOIN subjects s ON cs.subject_id = s.id
WHERE c.enrollment_status = 'confirmed'
  AND c.enrollment_date IS NOT NULL
GROUP BY c.id, c.student_name, c.enrollment_date;

-- =====================================================
-- 8. RPC 함수: 등원 확정 및 알림 생성
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_enrollment(
  p_consultation_id UUID,
  p_enrollment_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_consultation RECORD;
  v_subject RECORD;
  v_class RECORD;
  v_manager_id UUID;
  v_notification_count INT := 0;
BEGIN
  -- 상담 정보 조회
  SELECT * INTO v_consultation
  FROM consultations
  WHERE id = p_consultation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Consultation not found');
  END IF;

  -- 상담 상태 업데이트
  UPDATE consultations
  SET
    enrollment_date = p_enrollment_date,
    enrollment_status = 'confirmed',
    updated_at = NOW()
  WHERE id = p_consultation_id;

  -- 과목별 알림 생성
  FOR v_subject IN
    SELECT
      cs.subject_id,
      cs.class_id,
      s.name AS subject_name,
      s.manager_ids,
      cl.name AS class_name,
      cl.teacher_id
    FROM consultation_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    LEFT JOIN classes cl ON cs.class_id = cl.id
    WHERE cs.consultation_id = p_consultation_id
  LOOP
    -- 담당 선생님에게 알림 (반이 배정된 경우)
    IF v_subject.teacher_id IS NOT NULL THEN
      INSERT INTO enrollment_notifications (
        consultation_id, recipient_id, recipient_type,
        student_name, enrollment_date, class_name, subject_name,
        notification_type, scheduled_at
      ) VALUES (
        p_consultation_id, v_subject.teacher_id, 'teacher',
        v_consultation.student_name, p_enrollment_date,
        v_subject.class_name, v_subject.subject_name,
        'immediate', NOW()
      ) ON CONFLICT (consultation_id, recipient_id, notification_type) DO NOTHING;

      v_notification_count := v_notification_count + 1;
    END IF;

    -- 과목 관리자에게 알림
    IF v_subject.manager_ids IS NOT NULL AND array_length(v_subject.manager_ids, 1) > 0 THEN
      FOREACH v_manager_id IN ARRAY v_subject.manager_ids
      LOOP
        INSERT INTO enrollment_notifications (
          consultation_id, recipient_id, recipient_type,
          student_name, enrollment_date, class_name, subject_name,
          notification_type, scheduled_at
        ) VALUES (
          p_consultation_id, v_manager_id, 'subject_manager',
          v_consultation.student_name, p_enrollment_date,
          v_subject.class_name, v_subject.subject_name,
          'immediate', NOW()
        ) ON CONFLICT (consultation_id, recipient_id, notification_type) DO NOTHING;

        v_notification_count := v_notification_count + 1;
      END LOOP;
    END IF;

    -- D-1 알림 스케줄
    IF v_subject.teacher_id IS NOT NULL THEN
      INSERT INTO enrollment_notifications (
        consultation_id, recipient_id, recipient_type,
        student_name, enrollment_date, class_name, subject_name,
        notification_type, scheduled_at
      ) VALUES (
        p_consultation_id, v_subject.teacher_id, 'teacher',
        v_consultation.student_name, p_enrollment_date,
        v_subject.class_name, v_subject.subject_name,
        'd-1', (p_enrollment_date - INTERVAL '1 day')::DATE + TIME '09:00'
      ) ON CONFLICT (consultation_id, recipient_id, notification_type) DO NOTHING;
    END IF;

    -- D-day 알림 스케줄
    IF v_subject.teacher_id IS NOT NULL THEN
      INSERT INTO enrollment_notifications (
        consultation_id, recipient_id, recipient_type,
        student_name, enrollment_date, class_name, subject_name,
        notification_type, scheduled_at
      ) VALUES (
        p_consultation_id, v_subject.teacher_id, 'teacher',
        v_consultation.student_name, p_enrollment_date,
        v_subject.class_name, v_subject.subject_name,
        'd-day', p_enrollment_date + TIME '09:00'
      ) ON CONFLICT (consultation_id, recipient_id, notification_type) DO NOTHING;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'consultation_id', p_consultation_id,
    'enrollment_date', p_enrollment_date,
    'notification_count', v_notification_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RPC 함수: 등원 예정 조회 (캘린더용)
-- =====================================================

CREATE OR REPLACE FUNCTION get_enrollment_calendar(
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  id UUID,
  consultation_id UUID,
  student_name VARCHAR(100),
  enrollment_date DATE,
  class_names TEXT[],
  subject_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM v_enrollment_calendar
  WHERE v_enrollment_calendar.enrollment_date BETWEEN p_start_date AND p_end_date
  ORDER BY v_enrollment_calendar.enrollment_date, v_enrollment_calendar.student_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
