-- Stage 30-A: 공휴일 자동 휴강 시스템
-- 2025-12-25

-- =====================================================
-- 1. holidays 테이블 (공휴일 캐시)
-- =====================================================
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_substitute BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_year ON holidays(year);

-- RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_read" ON holidays
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "holidays_insert" ON holidays
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "holidays_delete" ON holidays
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- =====================================================
-- 2. holiday_exceptions 테이블 (휴강 예외)
-- =====================================================
CREATE TABLE IF NOT EXISTS holiday_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,  -- true=수업있음
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_holiday_exceptions_date ON holiday_exceptions(date);

-- RLS
ALTER TABLE holiday_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exceptions_read" ON holiday_exceptions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "exceptions_insert" ON holiday_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "exceptions_update" ON holiday_exceptions
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

CREATE POLICY "exceptions_delete" ON holiday_exceptions
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- =====================================================
-- 3. 2025년 한국 공휴일 초기 데이터
-- =====================================================
INSERT INTO holidays (date, name, year, is_substitute) VALUES
  ('2025-01-01', '신정', 2025, false),
  ('2025-01-28', '설날 연휴', 2025, false),
  ('2025-01-29', '설날', 2025, false),
  ('2025-01-30', '설날 연휴', 2025, false),
  ('2025-03-01', '삼일절', 2025, false),
  ('2025-03-03', '삼일절 대체공휴일', 2025, true),
  ('2025-05-05', '어린이날', 2025, false),
  ('2025-05-06', '부처님오신날', 2025, false),
  ('2025-06-06', '현충일', 2025, false),
  ('2025-08-15', '광복절', 2025, false),
  ('2025-10-03', '개천절', 2025, false),
  ('2025-10-05', '추석 연휴', 2025, false),
  ('2025-10-06', '추석', 2025, false),
  ('2025-10-07', '추석 연휴', 2025, false),
  ('2025-10-08', '추석 대체공휴일', 2025, true),
  ('2025-10-09', '한글날', 2025, false),
  ('2025-12-25', '크리스마스', 2025, false)
ON CONFLICT (date) DO NOTHING;
