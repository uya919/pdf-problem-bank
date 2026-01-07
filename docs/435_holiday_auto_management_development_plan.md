# 435 공휴일 자동 휴강 + 예외 처리 개발 계획

> Stage 30: 공휴일 자동 휴강 시스템
> 작성일: 2025-12-25
> 참조: [434_holiday_auto_management_research.md](434_holiday_auto_management_research.md)

---

## 1. 개요

### 1.1 목표
- 한국 공휴일 자동 휴강 처리
- 관리자가 예외(수업 있는 공휴일) 설정 가능

### 1.2 동작 방식

| 날짜 유형 | 기본 동작 | 관리자 조작 |
|----------|----------|------------|
| 공휴일 | 자동 휴강 | [수업 있음] 클릭으로 예외 등록 |
| 평일 | 정상 수업 | 변경 불필요 |

---

## 2. Phase 목록

| Phase | 작업 | 파일 |
|-------|------|------|
| 30-A | holidays, holiday_exceptions 테이블 생성 | Supabase Migration |
| 30-B | 공휴일 초기화 함수 구현 | `hooks/useHolidays.ts` |
| 30-C | checkHolidayStatus 함수 구현 | `hooks/useHolidays.ts` |
| 30-D | useClasses 훅에 휴강 체크 통합 | `hooks/useBackofficeData.ts` |
| 30-E | HolidayHeroCard 컴포넌트 생성 | `components/backoffice/dashboard/` |
| 30-F | BackofficeDemo 휴강일 표시 연동 | `pages/BackofficeDemo.tsx` |

---

## 3. Phase 30-A: 테이블 생성

### 3.1 holidays 테이블

```sql
CREATE TABLE holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_substitute BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);

-- RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_read" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_insert" ON holidays FOR INSERT TO authenticated
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'));
```

### 3.2 holiday_exceptions 테이블

```sql
CREATE TABLE holiday_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX idx_holiday_exceptions_date ON holiday_exceptions(date);

-- RLS
ALTER TABLE holiday_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exceptions_read" ON holiday_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "exceptions_write" ON holiday_exceptions FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'owner'));
```

---

## 4. Phase 30-B: 공휴일 데이터

### 4.1 2025년 한국 공휴일 (하드코딩)

라이브러리 의존성 없이 직접 정의:

```typescript
export const KOREAN_HOLIDAYS_2025 = [
  { date: '2025-01-01', name: '신정', isSubstitute: false },
  { date: '2025-01-28', name: '설날 연휴', isSubstitute: false },
  { date: '2025-01-29', name: '설날', isSubstitute: false },
  { date: '2025-01-30', name: '설날 연휴', isSubstitute: false },
  { date: '2025-03-01', name: '삼일절', isSubstitute: false },
  { date: '2025-03-03', name: '삼일절 대체공휴일', isSubstitute: true },
  { date: '2025-05-05', name: '어린이날', isSubstitute: false },
  { date: '2025-05-06', name: '부처님오신날', isSubstitute: false },
  { date: '2025-06-06', name: '현충일', isSubstitute: false },
  { date: '2025-08-15', name: '광복절', isSubstitute: false },
  { date: '2025-10-03', name: '개천절', isSubstitute: false },
  { date: '2025-10-05', name: '추석 연휴', isSubstitute: false },
  { date: '2025-10-06', name: '추석', isSubstitute: false },
  { date: '2025-10-07', name: '추석 연휴', isSubstitute: false },
  { date: '2025-10-08', name: '추석 대체공휴일', isSubstitute: true },
  { date: '2025-10-09', name: '한글날', isSubstitute: false },
  { date: '2025-12-25', name: '크리스마스', isSubstitute: false },
];
```

---

## 5. Phase 30-C: 휴강 체크 함수

```typescript
interface HolidayStatus {
  isHoliday: boolean;
  holidayName: string | null;
}

async function checkHolidayStatus(date: string): Promise<HolidayStatus> {
  // 1. 예외 테이블 확인 (관리자 설정 우선)
  const { data: exception } = await supabase
    .from('holiday_exceptions')
    .select('is_open, reason')
    .eq('date', date)
    .maybeSingle();

  if (exception?.is_open) {
    return { isHoliday: false, holidayName: null };
  }

  // 2. 공휴일 테이블 확인
  const { data: holiday } = await supabase
    .from('holidays')
    .select('name')
    .eq('date', date)
    .maybeSingle();

  if (holiday) {
    return { isHoliday: true, holidayName: holiday.name };
  }

  return { isHoliday: false, holidayName: null };
}
```

---

## 6. Phase 30-E: HolidayHeroCard

```typescript
// 공휴일별 이모지 매핑
const HOLIDAY_EMOJIS: Record<string, string> = {
  '설날': '🧧',
  '추석': '🌕',
  '크리스마스': '🎄',
  '어린이날': '🎈',
  '광복절': '🇰🇷',
  '삼일절': '🇰🇷',
  '현충일': '🕯️',
  '개천절': '🇰🇷',
  '한글날': '🇰🇷',
  '신정': '🎉',
  '부처님오신날': '🪷',
};

function getHolidayEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(HOLIDAY_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return '🎉';
}
```

---

## 7. 테스트 체크리스트

### 7.1 기본 동작
- [ ] 공휴일(12/25)에 휴강 카드 표시
- [ ] 평일에 정상 수업 표시
- [ ] 공휴일 이모지 정상 표시

### 7.2 예외 처리
- [ ] 관리자가 예외 등록 시 수업 표시
- [ ] 예외 삭제 시 다시 휴강 표시

---

*v1.0 - 2025-12-25*
