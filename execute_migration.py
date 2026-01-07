"""
Supabase PostgreSQL 직접 연결하여 마이그레이션 실행
psycopg2 사용
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("backend/.env")

# Supabase PostgreSQL 연결 정보
# 형식: postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
SUPABASE_URL = os.getenv("SUPABASE_URL")
PROJECT_REF = SUPABASE_URL.split("//")[1].split(".")[0] if SUPABASE_URL else None

# Supabase DB 비밀번호가 필요합니다
# 환경변수에서 가져오거나 직접 입력
DB_PASSWORD = os.getenv("SUPABASE_DB_PASSWORD", "")

if not DB_PASSWORD:
    print("="*60)
    print("Supabase DB 비밀번호가 필요합니다.")
    print("="*60)
    print(f"\nProject: {PROJECT_REF}")
    print("\nSupabase 대시보드에서 Database 비밀번호를 확인하세요:")
    print(f"  https://supabase.com/dashboard/project/{PROJECT_REF}/settings/database")
    print("\n그런 다음 아래 중 하나를 선택하세요:")
    print("\n1. 환경변수 설정:")
    print("   set SUPABASE_DB_PASSWORD=your_password")
    print("   python execute_migration.py")
    print("\n2. SQL Editor에서 직접 실행:")
    print(f"   https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")
    print("   파일: supabase/migrations/20251219_rotation_tables.sql")
    exit(1)

# 연결 문자열 구성
# Supabase pooler 사용 (Session mode)
conn_string = f"postgresql://postgres.{PROJECT_REF}:{DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

print(f"Connecting to Supabase project: {PROJECT_REF}")

try:
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cursor = conn.cursor()

    # SQL 파일 읽기
    with open("supabase/migrations/20251219_rotation_tables.sql", "r", encoding="utf-8") as f:
        sql_content = f.read()

    print("Executing migration...")
    cursor.execute(sql_content)
    print("Migration completed successfully!")

    # 테이블 확인
    cursor.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE 'rotation_%'
    """)
    tables = cursor.fetchall()
    print(f"\nCreated tables: {[t[0] for t in tables]}")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
