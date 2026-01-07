"""
Supabase SQL 마이그레이션 실행 스크립트
Management API 사용
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
PROJECT_REF = SUPABASE_URL.split("//")[1].split(".")[0] if SUPABASE_URL else None

print(f"Project: {PROJECT_REF}")

# SQL 파일 읽기
with open("supabase/migrations/20251219_rotation_tables.sql", "r", encoding="utf-8") as f:
    sql_content = f.read()

# Supabase REST API로 SQL 실행 (rpc 사용)
# service_role key로 직접 PostgreSQL 쿼리 실행
headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 각 테이블 생성 SQL을 개별 실행
sql_statements = [
    # 1. rotation_schedules
    """CREATE TABLE IF NOT EXISTS rotation_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      cycle_weeks INTEGER NOT NULL DEFAULT 3,
      start_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6),
      CONSTRAINT valid_cycle_weeks CHECK (cycle_weeks >= 2 AND cycle_weeks <= 8)
    )""",

    # 2. rotation_patterns
    """CREATE TABLE IF NOT EXISTS rotation_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_schedule_id UUID NOT NULL REFERENCES rotation_schedules(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      activity_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_week_number CHECK (week_number >= 1 AND week_number <= 8),
      CONSTRAINT unique_pattern UNIQUE(rotation_schedule_id, week_number, grade_id)
    )""",

    # 3. rotation_exceptions
    """CREATE TABLE IF NOT EXISTS rotation_exceptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_schedule_id UUID NOT NULL REFERENCES rotation_schedules(id) ON DELETE CASCADE,
      exception_date DATE NOT NULL,
      reason VARCHAR(200) NOT NULL,
      action_type VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_action_type CHECK (action_type IN ('carry_over', 'skip')),
      CONSTRAINT unique_exception_date UNIQUE(rotation_schedule_id, exception_date)
    )""",

    # 4. rotation_target_grades
    """CREATE TABLE IF NOT EXISTS rotation_target_grades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_schedule_id UUID NOT NULL REFERENCES rotation_schedules(id) ON DELETE CASCADE,
      grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_target_grade UNIQUE(rotation_schedule_id, grade_id)
    )"""
]

# Supabase는 직접 DDL 실행이 안되므로 대시보드 URL 안내
print("\n" + "="*60)
print("Supabase SQL Editor에서 마이그레이션을 실행하세요:")
print("="*60)
print(f"\nURL: https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")
print("\n파일 경로: supabase/migrations/20251219_rotation_tables.sql")
print("\n또는 아래 SQL을 복사하여 실행하세요:")
print("-"*60)

# 전체 SQL 출력
print(sql_content[:3000])  # 처음 3000자만 출력
if len(sql_content) > 3000:
    print("\n... (더 많은 내용은 파일 참조)")
