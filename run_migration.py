"""
순환수업 테이블 마이그레이션 스크립트
Supabase Management API를 통해 SQL 실행
"""
import os
import httpx
from dotenv import load_dotenv

# .env 로드
load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Project ref 추출 (URL에서)
PROJECT_REF = SUPABASE_URL.split("//")[1].split(".")[0] if SUPABASE_URL else None

print(f"Project: {PROJECT_REF}")
print(f"URL: {SUPABASE_URL}")

# SQL 파일 읽기
with open("supabase/migrations/20251219_rotation_tables.sql", "r", encoding="utf-8") as f:
    sql_content = f.read()

# SQL을 개별 명령문으로 분리하여 실행
# Supabase REST API로 직접 실행
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# 테이블 생성 SQL들을 개별 실행
sql_statements = [
    # 1. rotation_schedules 테이블
    """
    CREATE TABLE IF NOT EXISTS rotation_schedules (
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
    )
    """,

    # 2. rotation_patterns 테이블
    """
    CREATE TABLE IF NOT EXISTS rotation_patterns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_schedule_id UUID NOT NULL
        REFERENCES rotation_schedules(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      grade_id UUID NOT NULL
        REFERENCES grades(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      activity_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_week_number CHECK (week_number >= 1 AND week_number <= 8),
      CONSTRAINT unique_pattern UNIQUE(rotation_schedule_id, week_number, grade_id)
    )
    """,

    # 3. rotation_exceptions 테이블
    """
    CREATE TABLE IF NOT EXISTS rotation_exceptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_schedule_id UUID NOT NULL
        REFERENCES rotation_schedules(id) ON DELETE CASCADE,
      exception_date DATE NOT NULL,
      reason VARCHAR(200) NOT NULL,
      action_type VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_action_type CHECK (action_type IN ('carry_over', 'skip')),
      CONSTRAINT unique_exception_date UNIQUE(rotation_schedule_id, exception_date)
    )
    """,

    # 4. rotation_target_grades 테이블
    """
    CREATE TABLE IF NOT EXISTS rotation_target_grades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_schedule_id UUID NOT NULL
        REFERENCES rotation_schedules(id) ON DELETE CASCADE,
      grade_id UUID NOT NULL
        REFERENCES grades(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT unique_target_grade UNIQUE(rotation_schedule_id, grade_id)
    )
    """
]

print("\n테이블 생성은 Supabase 대시보드에서 직접 실행해야 합니다.")
print("SQL Editor에서 다음 파일을 붙여넣기 하세요:")
print("  supabase/migrations/20251219_rotation_tables.sql")
print("\n또는 아래 URL에서 실행하세요:")
print(f"  https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")

# 테이블 존재 여부 확인
try:
    result = supabase.table("rotation_schedules").select("id").limit(1).execute()
    print("\n✅ rotation_schedules 테이블이 이미 존재합니다!")
except Exception as e:
    if "relation" in str(e) and "does not exist" in str(e):
        print("\n❌ rotation_schedules 테이블이 없습니다. SQL Editor에서 생성하세요.")
    else:
        print(f"\n⚠️ 확인 중 오류: {e}")
