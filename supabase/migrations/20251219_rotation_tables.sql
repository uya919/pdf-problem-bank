-- =============================================
-- 순환수업 시스템 테이블 생성
-- 작성일: 2025-12-19
-- =============================================

-- 1. rotation_schedules: 순환수업 정의
CREATE TABLE IF NOT EXISTS rotation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,              -- "수요일 순환수업"
  day_of_week INTEGER NOT NULL,            -- 0-6 (0=일요일, 3=수요일)
  start_time TIME NOT NULL,                -- '17:00'
  end_time TIME NOT NULL,                  -- '18:30'
  cycle_weeks INTEGER NOT NULL DEFAULT 3,  -- 순환 주기 (기본 3주)
  start_date DATE NOT NULL,                -- 1주차 기준일
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
  CONSTRAINT valid_cycle_weeks CHECK (cycle_weeks >= 2 AND cycle_weeks <= 8)
);

-- 2. rotation_patterns: 순환 패턴 (주차-학년-활동 매핑)
CREATE TABLE IF NOT EXISTS rotation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID NOT NULL
    REFERENCES rotation_schedules(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,            -- 1, 2, 3 (1부터 시작)
  grade_id UUID NOT NULL
    REFERENCES grades(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,      -- 'english_class', 'math_class', 'math_test'
  activity_name VARCHAR(100) NOT NULL,     -- '영어 수업', '수학 수업', '수학 Test'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_week_number CHECK (week_number >= 1 AND week_number <= 8),
  CONSTRAINT unique_pattern UNIQUE(rotation_schedule_id, week_number, grade_id)
);

-- 3. rotation_exceptions: 휴일/예외 관리
CREATE TABLE IF NOT EXISTS rotation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID NOT NULL
    REFERENCES rotation_schedules(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,            -- 휴일 날짜
  reason VARCHAR(200) NOT NULL,            -- '신정', '설날 연휴', '학원 행사'
  action_type VARCHAR(20) NOT NULL,        -- 'carry_over' (이월) | 'skip' (건너뛰기)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_action_type CHECK (action_type IN ('carry_over', 'skip')),
  CONSTRAINT unique_exception_date UNIQUE(rotation_schedule_id, exception_date)
);

-- 4. rotation_target_grades: 순환수업 대상 학년
CREATE TABLE IF NOT EXISTS rotation_target_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID NOT NULL
    REFERENCES rotation_schedules(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL
    REFERENCES grades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_target_grade UNIQUE(rotation_schedule_id, grade_id)
);

-- =============================================
-- 인덱스 생성
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rotation_patterns_schedule
  ON rotation_patterns(rotation_schedule_id);

CREATE INDEX IF NOT EXISTS idx_rotation_patterns_grade
  ON rotation_patterns(grade_id);

CREATE INDEX IF NOT EXISTS idx_rotation_exceptions_schedule_date
  ON rotation_exceptions(rotation_schedule_id, exception_date);

CREATE INDEX IF NOT EXISTS idx_rotation_target_grades_schedule
  ON rotation_target_grades(rotation_schedule_id);

-- =============================================
-- RLS 정책
-- =============================================

-- rotation_schedules
ALTER TABLE rotation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotation_schedules_read" ON rotation_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rotation_schedules_insert" ON rotation_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "rotation_schedules_update" ON rotation_schedules
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "rotation_schedules_delete" ON rotation_schedules
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- rotation_patterns
ALTER TABLE rotation_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotation_patterns_read" ON rotation_patterns
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rotation_patterns_write" ON rotation_patterns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- rotation_exceptions
ALTER TABLE rotation_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotation_exceptions_read" ON rotation_exceptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rotation_exceptions_write" ON rotation_exceptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- rotation_target_grades
ALTER TABLE rotation_target_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotation_target_grades_read" ON rotation_target_grades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rotation_target_grades_write" ON rotation_target_grades
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'manager')
    )
  );

-- =============================================
-- updated_at 트리거
-- =============================================

CREATE OR REPLACE FUNCTION update_rotation_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rotation_schedule_updated_at
  BEFORE UPDATE ON rotation_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_rotation_schedule_updated_at();

-- =============================================
-- 초기 데이터 (수요일 순환수업 예시)
-- =============================================

-- 초기 데이터는 프론트엔드에서 생성하도록 함
-- 아래는 참고용 예시:
/*
INSERT INTO rotation_schedules (name, day_of_week, start_time, end_time, cycle_weeks, start_date)
VALUES ('수요일 순환수업', 3, '17:00', '18:30', 3, '2024-12-18');
*/
