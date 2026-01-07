# Stage 39: Supabase 스키마 수정 개발 계획

> 작성일: 2025-12-31
> 상태: 계획 수립 완료
> 관련: [460_supabase_missing_tables_error_report.md](./460_supabase_missing_tables_error_report.md)

---

## 1. 개요

### 1.1 목표
브라우저 콘솔에서 발생하는 Supabase 404/400 에러 해결

### 1.2 문제 요약

| 문제 유형 | 테이블 | 원인 | 해결 방법 |
|----------|--------|------|----------|
| 404 | `holidays` | 테이블 없음 | SQL 실행 |
| 404 | `holiday_exceptions` | 테이블 없음 | SQL 실행 |
| 404 | `homework_submissions` | 이름 다름 (`submissions`) | VIEW 생성 |
| 400 | `attendance` | 컬럼명 `notes` → `note` | 프론트 수정 |
| 400 | `homework` | 관계 쿼리 실패 | VIEW 생성 후 해결 |

---

## 2. Phase 구성

```
Stage 39: Supabase 스키마 수정
├── Phase 39-A: holidays 관련 테이블 생성
├── Phase 39-B: homework_submissions VIEW 생성
├── Phase 39-C: 프론트엔드 컬럼명 수정
└── Phase 39-D: 테스트 및 검증
```

---

## 3. Phase 39-A: holidays 관련 테이블 생성

### 3.1 작업 내용
Supabase Dashboard > SQL Editor에서 마이그레이션 실행

### 3.2 실행 SQL

```sql
-- =====================================================
-- 1. holidays 테이블 생성
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
-- 2. holiday_exceptions 테이블 생성
-- =====================================================
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
-- 3. 2025년 한국 공휴일 데이터
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
```

### 3.3 검증 방법
```sql
SELECT COUNT(*) FROM holidays;  -- 17개 예상
SELECT COUNT(*) FROM holiday_exceptions;  -- 0개 (초기)
```

### 3.4 체크리스트
- [ ] Supabase Dashboard 접속
- [ ] SQL Editor에서 위 SQL 실행
- [ ] 테이블 생성 확인
- [ ] 공휴일 데이터 17개 확인

---

## 4. Phase 39-B: homework_submissions VIEW 생성

### 4.1 문제
- 프론트엔드: `homework_submissions` 테이블 조회
- 실제 DB: `submissions` 테이블 존재

### 4.2 해결 방법
`homework_submissions` VIEW 생성 (submissions 테이블 참조)

### 4.3 실행 SQL

```sql
-- =====================================================
-- homework_submissions VIEW 생성
-- =====================================================

-- 기존 VIEW가 있으면 삭제
DROP VIEW IF EXISTS homework_submissions;

-- VIEW 생성 (submissions 테이블 기반)
CREATE OR REPLACE VIEW homework_submissions AS
SELECT
  id,
  homework_id,
  student_id,
  submitted_at,
  status,
  score,
  feedback,
  created_at
FROM submissions;

-- VIEW에 대한 RLS 설정 (기본 테이블의 RLS 따름)
-- VIEW는 기본 테이블의 RLS를 상속하므로 별도 설정 불필요
```

### 4.4 검증 방법
```sql
SELECT * FROM homework_submissions LIMIT 5;
```

### 4.5 체크리스트
- [ ] submissions 테이블 컬럼 구조 확인
- [ ] VIEW 생성 SQL 실행
- [ ] SELECT 쿼리 테스트

---

## 5. Phase 39-C: 프론트엔드 컬럼명 수정

### 5.1 문제
| 파일 | 현재 코드 | 실제 DB | 수정 필요 |
|------|----------|---------|----------|
| useAttendance.ts | `notes` | `note` | ✅ |
| useStudentActivities (예정) | `notes` | `note` | ✅ |

### 5.2 수정 파일

#### 5.2.1 useAttendance.ts 확인
```bash
# 검색 명령
grep -n "notes" frontend/src/hooks/useAttendance.ts
```

#### 5.2.2 수정 내용
```typescript
// Before
.select('*, notes')

// After
.select('*, note')

// UI에서 사용 시 (컴포넌트)
// notes → note로 변경하거나 매핑 함수 추가
```

### 5.3 영향 받는 파일 목록
1. `frontend/src/hooks/useAttendance.ts`
2. `frontend/src/hooks/backoffice/useAttendance.ts` (있을 경우)
3. `frontend/src/pages/backoffice/RecordsPage.tsx`
4. `frontend/src/pages/admin/AttendancePage.tsx`

### 5.4 체크리스트
- [ ] useAttendance.ts에서 `notes` 사용 위치 확인
- [ ] `note`로 수정 또는 매핑 추가
- [ ] 관련 컴포넌트에서 속성명 확인
- [ ] TypeScript 타입 정의 수정

---

## 6. Phase 39-D: 테스트 및 검증

### 6.1 테스트 시나리오

| # | 테스트 항목 | 예상 결과 | 확인 |
|---|------------|----------|------|
| 1 | 관리자 대시보드 접속 | 404 에러 없음 | ☐ |
| 2 | 강사 대시보드 접속 | 400 에러 없음 | ☐ |
| 3 | 캘린더에서 공휴일 표시 | 빨간색 표시됨 | ☐ |
| 4 | 출결 기록 저장 | 정상 저장 | ☐ |
| 5 | 숙제 제출 현황 조회 | 데이터 표시됨 | ☐ |

### 6.2 브라우저 콘솔 확인
```
# 해결되어야 할 에러
❌ holidays?... 404 → ✅ 200 OK
❌ holiday_exceptions?... 404 → ✅ 200 OK
❌ homework_submissions?... 404 → ✅ 200 OK
❌ attendance?... 400 → ✅ 200 OK
❌ homework?... 400 → ✅ 200 OK
```

### 6.3 체크리스트
- [ ] 개발 서버 재시작
- [ ] 브라우저 콘솔에서 404/400 에러 확인
- [ ] 각 페이지 기능 테스트
- [ ] 에러 해결 확인

---

## 7. 실행 순서

```
1. Phase 39-A: Supabase SQL 실행 (10분)
   - holidays 테이블 생성
   - holiday_exceptions 테이블 생성
   - 2025년 공휴일 데이터 삽입

2. Phase 39-B: Supabase SQL 실행 (5분)
   - homework_submissions VIEW 생성

3. Phase 39-C: 코드 수정 (15분)
   - useAttendance.ts 수정
   - 관련 컴포넌트 수정
   - 빌드 테스트

4. Phase 39-D: 테스트 (10분)
   - 브라우저 콘솔 확인
   - 기능 테스트
```

---

## 8. 롤백 계획

### 8.1 테이블 삭제 (필요시)
```sql
DROP TABLE IF EXISTS holiday_exceptions;
DROP TABLE IF EXISTS holidays;
DROP VIEW IF EXISTS homework_submissions;
```

### 8.2 코드 롤백
- Git으로 이전 커밋으로 복원
- `notes` → `note` 수정 되돌리기

---

## 9. 예상 문제 및 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| VIEW 권한 에러 | RLS 설정 | submissions 테이블 RLS 확인 |
| 공휴일 중복 삽입 | UNIQUE 제약 | ON CONFLICT DO NOTHING |
| 타입 에러 | note vs notes | 인터페이스 수정 |

---

## 10. 다음 단계

Stage 39 완료 후:
- Stage 37~40 (Mock 데이터 Supabase 연결) 진행
- StudentDetailPage Supabase 완전 연결

---

## 11. 참조

- [460_supabase_missing_tables_error_report.md](./460_supabase_missing_tables_error_report.md)
- [459_mock_data_supabase_connection_plan.md](./459_mock_data_supabase_connection_plan.md)
- Supabase 마이그레이션: `supabase/migrations/20251225_holidays.sql`

---

*v1.0 - 2025-12-31*
