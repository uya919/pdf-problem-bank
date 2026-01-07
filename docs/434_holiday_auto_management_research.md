# 434 공휴일 자동 휴강 + 예외 처리 연구 리포트

> 작성일: 2025-12-25
> 목적: 한국 공휴일 자동 휴강 처리 및 예외 관리 기능 분석

---

## 1. 요청 사항 정리

| 항목 | 내용 |
|------|------|
| **기본 동작** | 한국 공휴일은 자동으로 휴강 처리 |
| **예외 처리** | 공휴일이지만 수업 있는 날 → 관리자가 "휴강 제외" 설정 |
| **목표** | 최소한의 관리로 휴강일 자동 처리 |

### 1.1 동작 흐름

```
공휴일 자동 감지
     │
     ▼
┌─────────────────┐
│ 기본: 휴강 처리 │
└────────┬────────┘
         │
         ▼
    예외 등록됨?
    ┌────┴────┐
    │         │
   Yes        No
    │         │
    ▼         ▼
 정상 수업   휴강 표시
```

---

## 2. 한국 공휴일 데이터 소스 분석

### 2.1 옵션 비교

| 방식 | 장점 | 단점 | 권장 |
|------|------|------|------|
| **공공데이터 API** | 실시간, 대체공휴일 자동 반영 | API 호출 필요, 네트워크 의존 | △ |
| **NPM 라이브러리** | 오프라인 사용, 간편 | 연간 업데이트 필요 | ○ |
| **하드코딩 + DB** | 완전한 제어 | 매년 수동 입력 | △ |
| **하이브리드** | API 실패 시 폴백 | 복잡도 증가 | ◎ |

### 2.2 권장: NPM 라이브러리 + DB 캐싱

```typescript
// 라이브러리 예시
import { getHolidays } from 'korean-holidays';

const holidays2025 = getHolidays(2025);
// [
//   { date: '2025-01-01', name: '신정' },
//   { date: '2025-01-28', name: '설날 연휴' },
//   { date: '2025-01-29', name: '설날' },
//   { date: '2025-01-30', name: '설날 연휴' },
//   { date: '2025-03-01', name: '삼일절' },
//   ...
// ]
```

### 2.3 사용 가능한 라이브러리

| 라이브러리 | 특징 | GitHub Stars |
|-----------|------|--------------|
| `korean-holidays` | 간단, TypeScript 지원 | 50+ |
| `@hyunbinseo/holidays-kr` | 최신, ESM 지원 | 20+ |
| `holiday-kr` | 대체공휴일 포함 | 30+ |

### 2.4 공공데이터 API (백업용)

```
URL: http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService
인증: API 키 필요 (무료)
응답: XML/JSON
제한: 일 1,000회
```

---

## 3. 데이터베이스 설계

### 3.1 테이블 구조

```sql
-- 공휴일 캐시 테이블 (자동 생성)
CREATE TABLE holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_substitute BOOLEAN DEFAULT FALSE,  -- 대체공휴일 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

-- 휴강 예외 테이블 (관리자 설정)
CREATE TABLE holiday_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  is_open BOOLEAN NOT NULL,  -- true=수업있음, false=휴강(공휴일 아닌데 휴강)
  reason TEXT,               -- "보강 수업", "시험기간" 등
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

-- 인덱스
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_year ON holidays(year);
CREATE INDEX idx_holiday_exceptions_date ON holiday_exceptions(date);
```

### 3.2 RLS 정책

```sql
-- holidays: 모든 인증 사용자 읽기 가능
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_read" ON holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_insert" ON holidays FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'owner'));

-- holiday_exceptions: 관리자만 수정 가능
ALTER TABLE holiday_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exceptions_read" ON holiday_exceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "exceptions_write" ON holiday_exceptions FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'owner'));
```

---

## 4. 핵심 로직 설계

### 4.1 휴강 여부 판단 함수

```typescript
/**
 * 특정 날짜의 휴강 여부 확인
 *
 * @returns
 *   - null: 정상 수업일
 *   - { isHoliday: true, name: string }: 휴강일
 */
async function checkHolidayStatus(date: string): Promise<HolidayStatus | null> {
  // 1. 예외 테이블 먼저 확인 (관리자 설정 우선)
  const { data: exception } = await supabase
    .from('holiday_exceptions')
    .select('is_open, reason')
    .eq('date', date)
    .single();

  if (exception) {
    // 예외 등록됨: is_open=true면 정상 수업
    if (exception.is_open) {
      return null; // 정상 수업
    } else {
      return { isHoliday: true, name: exception.reason || '휴강일' };
    }
  }

  // 2. 공휴일 테이블 확인
  const { data: holiday } = await supabase
    .from('holidays')
    .select('name')
    .eq('date', date)
    .single();

  if (holiday) {
    return { isHoliday: true, name: holiday.name };
  }

  // 3. 공휴일 아님 → 정상 수업
  return null;
}
```

### 4.2 수업 조회 시 휴강 체크 통합

```typescript
// useClasses 훅 수정
export function useClasses(options: { date: string; teacherId?: string }) {
  const { date, teacherId } = options;

  return useQuery({
    queryKey: ['classes', date, teacherId],
    queryFn: async () => {
      // 1. 휴강 여부 먼저 확인
      const holidayStatus = await checkHolidayStatus(date);

      if (holidayStatus) {
        return {
          classes: [],
          isHoliday: true,
          holidayName: holidayStatus.name,
        };
      }

      // 2. 정상 수업일 → 수업 조회
      const dayOfWeek = new Date(date).getDay() || 7; // 0=일 → 7

      let query = supabase
        .from('classes')
        .select('*')
        .eq('schedule_day', dayOfWeek)
        .eq('is_active', true);

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      }

      const { data } = await query;

      return {
        classes: data || [],
        isHoliday: false,
        holidayName: null,
      };
    },
  });
}
```

### 4.3 연간 공휴일 초기화 함수

```typescript
/**
 * 연간 공휴일 데이터 초기화 (연초 또는 첫 접속 시)
 */
async function initializeYearHolidays(year: number) {
  // 1. 이미 해당 연도 데이터 있는지 확인
  const { count } = await supabase
    .from('holidays')
    .select('*', { count: 'exact', head: true })
    .eq('year', year);

  if (count && count > 0) {
    console.log(`${year}년 공휴일 데이터 이미 존재`);
    return;
  }

  // 2. 라이브러리에서 공휴일 가져오기
  const holidays = getKoreanHolidays(year);

  // 3. DB에 저장
  const { error } = await supabase
    .from('holidays')
    .insert(
      holidays.map(h => ({
        date: h.date,
        name: h.name,
        year: year,
        is_substitute: h.isSubstitute || false,
      }))
    );

  if (error) {
    console.error('공휴일 초기화 실패:', error);
  } else {
    console.log(`${year}년 공휴일 ${holidays.length}개 저장 완료`);
  }
}
```

---

## 5. 프론트엔드 구현

### 5.1 휴강일 히어로 카드

```typescript
// components/backoffice/dashboard/HolidayHeroCard.tsx
interface HolidayHeroCardProps {
  holidayName: string;
  date: Date;
}

export function HolidayHeroCard({ holidayName, date }: HolidayHeroCardProps) {
  // 공휴일별 이모지 매핑
  const emoji = getHolidayEmoji(holidayName);

  return (
    <div
      className="rounded-2xl p-5 text-white mb-4"
      style={{ background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' }}
    >
      <div className="text-center py-4">
        <div className="text-4xl mb-3">{emoji}</div>
        <div className="text-lg font-semibold">{holidayName}</div>
        <div className="text-sm opacity-80 mt-2">
          오늘은 휴강입니다. 편안한 하루 보내세요!
        </div>
      </div>
    </div>
  );
}

function getHolidayEmoji(name: string): string {
  if (name.includes('설날')) return '🧧';
  if (name.includes('추석')) return '🌕';
  if (name.includes('크리스마스')) return '🎄';
  if (name.includes('어린이날')) return '🎈';
  if (name.includes('광복절')) return '🇰🇷';
  if (name.includes('삼일절')) return '🇰🇷';
  if (name.includes('현충일')) return '🕯️';
  if (name.includes('개천절')) return '🇰🇷';
  if (name.includes('한글날')) return '🇰🇷';
  return '🎉';
}
```

### 5.2 BackofficeDemo 수정

```typescript
// pages/BackofficeDemo.tsx
export function BackofficeDemo() {
  // ...existing code...

  const {
    classes: classesData,
    isHoliday,
    holidayName,
    isLoading
  } = useClasses({
    date: selectedDateStr,
    teacherId: isTeacherMode ? teacherId : undefined,
  });

  // 히어로 섹션 렌더링
  const renderHeroSection = () => {
    if (isLoading) {
      return <div className="rounded-2xl p-5 bg-gray-100 animate-pulse h-[200px]" />;
    }

    // 휴강일이면 HolidayHeroCard 표시
    if (isHoliday && holidayName) {
      return <HolidayHeroCard holidayName={holidayName} date={selectedDate} />;
    }

    // 수업 없으면 NoClassHeroCard
    if (!classesData || classesData.length === 0) {
      return <NoClassHeroCard />;
    }

    // 수업 있으면 HeroCarousel
    return (
      <HeroCarousel
        classes={realClassSchedules || []}
        onAttendance={handleAttendance}
        onProgress={handleProgress}
        // ...
      />
    );
  };

  return (
    // ...
    {renderHeroSection()}
    // ...
  );
}
```

### 5.3 관리자 예외 관리 UI

```typescript
// components/admin/HolidayExceptionManager.tsx
interface HolidayExceptionManagerProps {
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  hasException: boolean;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
}

export function HolidayExceptionButton({
  date,
  isHoliday,
  holidayName,
  hasException,
  isOpen,
  onToggle,
}: HolidayExceptionManagerProps) {
  if (!isHoliday) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">{holidayName}</span>
      <button
        onClick={() => onToggle(!isOpen)}
        className={`
          px-3 py-1 rounded-full text-xs font-medium transition-colors
          ${isOpen
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
          }
        `}
      >
        {isOpen ? '수업 있음' : '휴강'}
      </button>
    </div>
  );
}
```

---

## 6. 관리자 휴강 예외 관리 페이지

### 6.1 목업

```
┌─────────────────────────────────────────────────────┐
│  휴강일 관리                              [2025년]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ▼ 1월                                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🗓️ 1월 1일 (수)  신정           [휴강]      │   │
│  │ 🧧 1월 28일 (화) 설날 연휴      [휴강]      │   │
│  │ 🧧 1월 29일 (수) 설날           [수업 있음] │ ← │
│  │ 🧧 1월 30일 (목) 설날 연휴      [휴강]      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ▼ 3월                                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🇰🇷 3월 1일 (토)  삼일절         [휴강]      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ▼ 5월                                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🎈 5월 5일 (월)  어린이날        [휴강]      │   │
│  │    5월 6일 (화)  대체공휴일      [수업 있음] │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 휴강 토글 동작

| 버튼 상태 | 클릭 시 동작 |
|----------|-------------|
| [휴강] | holiday_exceptions에 `is_open: true` 추가 → [수업 있음] |
| [수업 있음] | holiday_exceptions에서 해당 날짜 삭제 → [휴강] |

---

## 7. 2025년 한국 공휴일 목록

| 날짜 | 요일 | 공휴일 | 대체공휴일 |
|------|------|--------|-----------|
| 1/1 | 수 | 신정 | - |
| 1/28 | 화 | 설날 연휴 | - |
| 1/29 | 수 | 설날 | - |
| 1/30 | 목 | 설날 연휴 | - |
| 3/1 | 토 | 삼일절 | 3/3 (월) |
| 5/5 | 월 | 어린이날 | - |
| 5/6 | 화 | 부처님오신날 | - |
| 6/6 | 금 | 현충일 | - |
| 8/15 | 금 | 광복절 | - |
| 10/3 | 금 | 개천절 | - |
| 10/5 | 일 | 추석 연휴 | 10/8 (수) |
| 10/6 | 월 | 추석 | - |
| 10/7 | 화 | 추석 연휴 | - |
| 10/9 | 목 | 한글날 | - |
| 12/25 | 목 | 크리스마스 | - |

**총 15일 + 대체공휴일 2일 = 17일**

---

## 8. 구현 단계 제안

| Phase | 작업 | 우선순위 |
|-------|------|----------|
| 30-A | holidays, holiday_exceptions 테이블 생성 | 필수 |
| 30-B | 공휴일 초기화 함수 (korean-holidays 연동) | 필수 |
| 30-C | checkHolidayStatus 함수 구현 | 필수 |
| 30-D | useClasses 훅에 휴강 체크 통합 | 필수 |
| 30-E | HolidayHeroCard 컴포넌트 생성 | 필수 |
| 30-F | BackofficeDemo 휴강일 표시 연동 | 필수 |
| 30-G | 관리자 휴강 예외 관리 페이지 | 선택 |
| 30-H | AdminDashboard 휴강일 표시 | 선택 |

---

## 9. 예상 작업량

| Phase | 예상 시간 |
|-------|----------|
| 30-A | 20분 |
| 30-B | 30분 |
| 30-C | 20분 |
| 30-D | 40분 |
| 30-E | 30분 |
| 30-F | 30분 |
| 30-G | 1.5시간 |
| 30-H | 30분 |

**필수 기능: 약 2.5시간**
**전체 (선택 포함): 약 4.5시간**

---

## 10. 우려사항 및 해결방안

| 우려사항 | 영향 | 해결방안 |
|----------|------|----------|
| 라이브러리 업데이트 지연 | 대체공휴일 누락 가능 | 관리자 수동 추가 기능 |
| 지역별 공휴일 차이 | 없음 (전국 동일) | - |
| 임시공휴일 발표 | 늦게 반영됨 | 관리자 수동 추가 |
| 토요일 공휴일 | 대체공휴일 계산 필요 | 라이브러리가 처리 |

---

## 11. 결론

| 항목 | 결과 |
|------|------|
| **구현 가능성** | ✅ 높음 |
| **권장 방식** | NPM 라이브러리 (korean-holidays) + DB 캐싱 |
| **핵심 기능** | 공휴일 자동 휴강 + 관리자 예외 토글 |
| **예상 작업량** | 필수 2.5시간, 전체 4.5시간 |

### 핵심 설계 원칙

1. **공휴일은 기본 휴강** - 별도 설정 없이 자동 적용
2. **예외만 관리** - 수업 있는 날만 클릭 한 번으로 추가
3. **연간 자동 초기화** - 매년 첫 접속 시 공휴일 데이터 생성

---

*v1.0 - 2025-12-25*
