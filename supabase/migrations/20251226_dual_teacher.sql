-- ==============================================
-- Stage 31: 초등부 담임/부담임 시스템
-- 작성일: 2025-12-26
-- ==============================================

-- 담임/부담임 컬럼 추가
ALTER TABLE classes ADD COLUMN IF NOT EXISTS homeroom_teacher_id UUID REFERENCES profiles(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS assistant_teacher_id UUID REFERENCES profiles(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS homeroom_days integer[];
ALTER TABLE classes ADD COLUMN IF NOT EXISTS assistant_days integer[];

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_classes_homeroom_teacher ON classes(homeroom_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_assistant_teacher ON classes(assistant_teacher_id);

-- 기존 초등부 데이터 마이그레이션 (teacher_id → homeroom_teacher_id)
-- 초등부 반의 기존 담당 강사를 담임으로 설정
UPDATE classes
SET homeroom_teacher_id = teacher_id,
    homeroom_days = day_of_week
WHERE grade_id IN (SELECT id FROM grades WHERE name LIKE '초%')
  AND teacher_id IS NOT NULL
  AND homeroom_teacher_id IS NULL;

-- 코멘트 추가
COMMENT ON COLUMN classes.homeroom_teacher_id IS '담임 강사 ID (초등부: 월/수/금 담당)';
COMMENT ON COLUMN classes.assistant_teacher_id IS '부담임 강사 ID (초등부: 화/목 담당)';
COMMENT ON COLUMN classes.homeroom_days IS '담임 담당 요일 배열 (1=월, 2=화, 3=수, 4=목, 5=금)';
COMMENT ON COLUMN classes.assistant_days IS '부담임 담당 요일 배열';
