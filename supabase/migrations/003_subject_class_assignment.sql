-- =====================================================
-- Hyeyum Backoffice - Subject-based Class Assignment
-- Version: 1.1.0
-- Created: 2025-12-16
-- Description: 과목별 반 배정 기능을 위한 스키마 확장
-- =====================================================

-- =====================================================
-- 1. SUBJECTS (과목 테이블)
-- =====================================================

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- '수학', '국어', '영어'
  code TEXT UNIQUE NOT NULL,             -- 'math', 'korean', 'english'
  color TEXT DEFAULT '#3182F6',          -- UI 색상
  sort_order INT DEFAULT 0,              -- 정렬 순서
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_sort ON subjects(sort_order);

-- 기본 과목 데이터 삽입
INSERT INTO subjects (name, code, color, sort_order) VALUES
  ('수학', 'math', '#3182F6', 1),
  ('국어', 'korean', '#10B981', 2),
  ('영어', 'english', '#8B5CF6', 3)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. STUDENT_SUBJECTS (학생 수강 과목)
-- =====================================================

CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, subject_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_student_subjects_student ON student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_subject ON student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_subjects_active ON student_subjects(is_active);

-- =====================================================
-- 3. CLASSES 테이블 수정 (subject_id 추가)
-- =====================================================

-- subject_id 컬럼 추가 (기존 subject TEXT와 별도)
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);

-- 레벨 컬럼 추가 (심화/정규/기초)
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('advanced', 'regular', 'regular2', 'basic'));

-- 학년 컬럼 추가
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS grade TEXT;

-- 학부 컬럼 추가 (초등/중등/고등)
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS division TEXT CHECK (division IN ('elementary', 'middle', 'high'));

-- 활성 상태 컬럼 추가
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_classes_subject_id ON classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);
CREATE INDEX IF NOT EXISTS idx_classes_division ON classes(division);

-- =====================================================
-- 4. CLASS_ENROLLMENTS 테이블 개선
-- =====================================================

-- enrolled_by 컬럼 추가 (배정한 관리자)
ALTER TABLE class_enrollments
ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES profiles(id);

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Subjects RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects are viewable by authenticated users"
  ON subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Subjects are insertable by authenticated users"
  ON subjects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Subjects are updatable by authenticated users"
  ON subjects FOR UPDATE TO authenticated USING (true);

-- Student Subjects RLS
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student subjects are viewable by authenticated users"
  ON student_subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Student subjects are insertable by authenticated users"
  ON student_subjects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Student subjects are updatable by authenticated users"
  ON student_subjects FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Student subjects are deletable by authenticated users"
  ON student_subjects FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 6. 뷰: 학생별 과목별 배정 현황
-- =====================================================

CREATE OR REPLACE VIEW v_student_class_assignments AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  s.grade AS student_grade,
  s.school,
  s.status AS student_status,
  sub.id AS subject_id,
  sub.code AS subject_code,
  sub.name AS subject_name,
  c.id AS class_id,
  c.name AS class_name,
  c.level AS class_level,
  c.division,
  ce.enrolled_at,
  ce.status AS enrollment_status
FROM students s
CROSS JOIN subjects sub
LEFT JOIN student_subjects ss ON s.id = ss.student_id AND ss.subject_id = sub.id AND ss.is_active = true
LEFT JOIN class_enrollments ce ON s.id = ce.student_id AND ce.status = 'active'
LEFT JOIN classes c ON ce.class_id = c.id AND c.subject_id = sub.id
WHERE s.status = 'active' AND sub.is_active = true;

-- =====================================================
-- 7. RPC 함수: 학생들을 반에 배정
-- =====================================================

CREATE OR REPLACE FUNCTION assign_students_to_class(
  p_student_ids UUID[],
  p_class_id UUID,
  p_enrolled_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_subject_id UUID;
  v_affected_count INT := 0;
BEGIN
  -- 대상 반의 과목 ID 조회
  SELECT subject_id INTO v_subject_id FROM classes WHERE id = p_class_id;

  IF v_subject_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Class not found or has no subject');
  END IF;

  -- 같은 과목의 기존 배정 삭제 (상태를 'dropped'로 변경)
  UPDATE class_enrollments ce
  SET status = 'dropped'
  FROM classes c
  WHERE ce.class_id = c.id
    AND c.subject_id = v_subject_id
    AND ce.student_id = ANY(p_student_ids)
    AND ce.status = 'active';

  -- 새 반에 배정 (UPSERT)
  INSERT INTO class_enrollments (student_id, class_id, enrolled_by, status)
  SELECT unnest(p_student_ids), p_class_id, p_enrolled_by, 'active'
  ON CONFLICT (class_id, student_id)
  DO UPDATE SET
    status = 'active',
    enrolled_at = CURRENT_DATE,
    enrolled_by = EXCLUDED.enrolled_by;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'affected_count', v_affected_count,
    'class_id', p_class_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. RPC 함수: 학생들의 배정 해제
-- =====================================================

CREATE OR REPLACE FUNCTION unassign_students_from_class(
  p_student_ids UUID[],
  p_class_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_affected_count INT := 0;
BEGIN
  UPDATE class_enrollments
  SET status = 'dropped'
  WHERE class_id = p_class_id
    AND student_id = ANY(p_student_ids)
    AND status = 'active';

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'affected_count', v_affected_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RPC 함수: 과목별 반 목록 조회 (학생 수 포함)
-- =====================================================

CREATE OR REPLACE FUNCTION get_classes_by_subject(
  p_subject_code TEXT,
  p_division TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  name TEXT,
  level TEXT,
  division TEXT,
  grade TEXT,
  subject_id UUID,
  subject_code TEXT,
  subject_name TEXT,
  student_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.level,
    c.division,
    c.grade,
    c.subject_id,
    sub.code AS subject_code,
    sub.name AS subject_name,
    COUNT(ce.id) FILTER (WHERE ce.status = 'active') AS student_count
  FROM classes c
  JOIN subjects sub ON c.subject_id = sub.id
  LEFT JOIN class_enrollments ce ON c.id = ce.class_id
  WHERE sub.code = p_subject_code
    AND c.is_active = true
    AND (p_division IS NULL OR c.division = p_division)
    AND (p_grade IS NULL OR c.grade = p_grade)
  GROUP BY c.id, c.name, c.level, c.division, c.grade, c.subject_id, sub.code, sub.name
  ORDER BY
    CASE c.level
      WHEN 'advanced' THEN 1
      WHEN 'regular' THEN 2
      WHEN 'regular2' THEN 3
      WHEN 'basic' THEN 4
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. RPC 함수: 과목별 학생 목록 조회 (배정 상태 포함)
-- =====================================================

CREATE OR REPLACE FUNCTION get_students_by_subject(
  p_subject_code TEXT,
  p_division TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_grade TEXT,
  school TEXT,
  is_enrolled BOOLEAN,
  class_id UUID,
  class_name TEXT,
  class_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.name AS student_name,
    s.grade AS student_grade,
    s.school,
    ss.id IS NOT NULL AS is_enrolled,
    c.id AS class_id,
    c.name AS class_name,
    c.level AS class_level
  FROM students s
  JOIN student_subjects ss ON s.id = ss.student_id AND ss.is_active = true
  JOIN subjects sub ON ss.subject_id = sub.id
  LEFT JOIN class_enrollments ce ON s.id = ce.student_id AND ce.status = 'active'
  LEFT JOIN classes c ON ce.class_id = c.id AND c.subject_id = sub.id
  WHERE sub.code = p_subject_code
    AND s.status = 'active'
    AND (p_division IS NULL OR (
      CASE
        WHEN s.grade LIKE '초%' THEN 'elementary'
        WHEN s.grade LIKE '중%' THEN 'middle'
        WHEN s.grade LIKE '고%' THEN 'high'
      END = p_division
    ))
    AND (p_grade IS NULL OR s.grade = p_grade)
  ORDER BY
    c.id IS NOT NULL,  -- 미배정 학생 먼저
    s.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. updated_at 트리거
-- =====================================================

CREATE TRIGGER IF NOT EXISTS update_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
