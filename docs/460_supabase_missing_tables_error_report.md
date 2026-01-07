# 에러 리포트: Supabase 테이블 누락 (404/400 에러)

> 작성일: 2025-12-31
> 상태: 분석 완료

---

## 1. 에러 현상

브라우저 콘솔에서 다수의 Supabase API 에러 발생:

```
rhejybeufojkfdfntpfg.supabase.co/rest/v1/holidays?... 404 (Not Found)
rhejybeufojkfdfntpfg.supabase.co/rest/v1/holiday_exceptions?... 404 (Not Found)
rhejybeufojkfdfntpfg.supabase.co/rest/v1/homework_submissions?... 404 (Not Found)
rhejybeufojkfdfntpfg.supabase.co/rest/v1/attendance?... 400 (Bad Request)
rhejybeufojkfdfntpfg.supabase.co/rest/v1/homework?... 400 (Bad Request)
```

---

## 2. 원인 분석

### 2.1 404 에러 (테이블 없음)

| 테이블 | 마이그레이션 파일 | 실제 DB | 상태 |
|--------|------------------|---------|------|
| `holidays` | `20251225_holidays.sql` ✅ | ❌ 없음 | **마이그레이션 미실행** |
| `holiday_exceptions` | `20251225_holidays.sql` ✅ | ❌ 없음 | **마이그레이션 미실행** |
| `homework_submissions` | 없음 | ❌ 없음 | **마이그레이션 없음** |

**원인**:
1. `20251225_holidays.sql` 마이그레이션이 Supabase에 적용되지 않음
2. `homework_submissions` 테이블은 마이그레이션 파일 자체가 없음

### 2.2 400 에러 (잘못된 요청)

| 테이블 | 에러 원인 |
|--------|----------|
| `attendance` | 컬럼명 차이 - 프론트: `notes`, DB: `note` |
| `homework` | 관계 조회 실패 - `homework_submissions` 테이블 없음 |

**실제 DB attendance 컬럼**:
```
id, class_id, student_id, date, status, note, created_at
```

**프론트엔드 쿼리** (`useAttendance.ts`):
```typescript
.select('*,student:students(id,name,grade),class:classes(id,name)')
```
→ 이 쿼리는 정상이지만, 다른 훅에서 `notes` (복수형) 사용 중

---

## 3. 영향 받는 기능

| 기능 | 페이지 | 현재 상태 |
|------|--------|----------|
| 공휴일 표시 | 강사/관리자 대시보드 | ❌ 공휴일 로드 실패 |
| 휴강 예외 관리 | 관리자 | ❌ 작동 안함 |
| 숙제 제출 현황 | 강사 대시보드 | ❌ 제출 데이터 없음 |
| 출결 저장/조회 | 출결 페이지 | ⚠️ 일부 쿼리 실패 |

---

## 4. 해결 방안

### 방안 A: 마이그레이션 실행 (권장)

1. **holidays, holiday_exceptions 테이블 생성**
   - Supabase Dashboard > SQL Editor에서 `20251225_holidays.sql` 실행

2. **homework_submissions 테이블 생성**
   - 새 마이그레이션 파일 추가 필요

3. **attendance.notes → note 통일**
   - 프론트엔드 코드에서 `notes` → `note`로 수정

### 방안 B: 프론트엔드 에러 핸들링 강화

1. 테이블 없을 때 404 에러 무시
2. Mock Fallback 패턴 강화

---

## 5. 필요한 마이그레이션

### 5.1 holidays 관련 (이미 있음, 실행만 필요)

파일: `supabase/migrations/20251225_holidays.sql`

```sql
-- holidays 테이블
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_substitute BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- holiday_exceptions 테이블
CREATE TABLE IF NOT EXISTS holiday_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- 2025년 공휴일 데이터 삽입
INSERT INTO holidays (date, name, year, is_substitute) VALUES
  ('2025-01-01', '신정', 2025, false),
  -- ... (나머지 공휴일)
ON CONFLICT (date) DO NOTHING;
```

### 5.2 homework_submissions (신규 필요)

**현재 DB 상태**:
- `homework` 테이블 ✅ 존재
- `submissions` 테이블 ✅ 존재 (homework_id, student_id 포함)

**문제**: 프론트엔드는 `homework_submissions` 테이블을 조회하지만, 실제 DB에는 `submissions` 테이블명으로 존재

**해결 옵션**:
1. **View 생성** (권장): `homework_submissions` 뷰 생성
2. **코드 수정**: 프론트엔드에서 `submissions`로 변경

```sql
-- 옵션 1: View 생성
CREATE OR REPLACE VIEW homework_submissions AS
SELECT * FROM submissions;
```

---

## 6. 즉시 실행 가능한 SQL

Supabase Dashboard > SQL Editor에서 실행:

```sql
-- 1. holidays 테이블 생성
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
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_read" ON holidays
  FOR SELECT TO authenticated USING (true);

-- 2. holiday_exceptions 테이블 생성
CREATE TABLE IF NOT EXISTS holiday_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_holiday_exceptions_date ON holiday_exceptions(date);
ALTER TABLE holiday_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exceptions_read" ON holiday_exceptions
  FOR SELECT TO authenticated USING (true);

-- 3. 2025년 공휴일 데이터
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

-- 4. homework_submissions View 생성 (submissions 테이블 기반)
CREATE OR REPLACE VIEW homework_submissions AS
SELECT
  id,
  homework_id,
  student_id,
  submitted_at,
  status,
  score AS notes,
  feedback
FROM submissions;
```

---

## 7. 테이블 이름 차이 정리

| 로컬 마이그레이션 | 실제 Supabase | 상태 |
|------------------|---------------|------|
| `attendance` | `attendance` ✅ | 동일 |
| `homework` | `homework` ✅ | 동일 |
| `homework_submissions` | `submissions` ⚠️ | **이름 다름** |
| `class_enrollments` | `enrollments` ⚠️ | **이름 다름** |
| `holidays` | ❌ 없음 | **미생성** |
| `holiday_exceptions` | ❌ 없음 | **미생성** |

---

## 8. 참조

- 로컬 마이그레이션: `supabase/migrations/`
- Supabase 프로젝트: `rhejybeufojkfdfntpfg`
- 관련 훅 파일:
  - `useHolidays.ts`
  - `useHomework.ts`
  - `useAttendance.ts`

---

*v1.0 - 2025-12-31*
