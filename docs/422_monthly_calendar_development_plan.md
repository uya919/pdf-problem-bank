# 422. 월간 캘린더 단계별 개발 계획

> **작성일**: 2025-12-22
> **기반 문서**: [421_monthly_calendar_feasibility_report.md](421_monthly_calendar_feasibility_report.md)
> **목업**: [mockups/monthly_calendar_dropdown.html](mockups/monthly_calendar_dropdown.html)

---

## 0. 요약

| 항목 | 내용 |
|------|------|
| **목표** | "오늘" 버튼 → "월간" 버튼으로 변경, 드롭다운 방식 월간 캘린더 |
| **표시 방식** | 주간 캘린더 아래로 슬라이드 다운 확장 |
| **날짜 선택 후** | 월간 닫히고 주간 캘린더가 해당 주로 이동 |
| **공지 표시** | 모바일: 점(●) / PC: 텍스트("학부모..") |
| **총 Phase** | 4개 |

---

## Phase 20-A: 타입 + 월간 유틸리티

### 목표
월간 캘린더용 타입 정의 및 유틸리티 함수 추가

### 1. 타입 추가 (types/admin.ts)

```typescript
// ===== 월간 캘린더 타입 (Stage 20) =====

/** 월 범위 */
export interface MonthRange {
  year: number;
  month: number; // 1-12
}

/** 월간 캘린더 날짜 셀 */
export interface MonthCalendarDay extends CalendarDay {
  /** 현재 표시 중인 월에 속하는지 여부 */
  isCurrentMonth: boolean;
}
```

### 2. 유틸리티 함수 추가 (utils/weekUtils.ts)

```typescript
// ===== 월간 캘린더 유틸리티 (Stage 20) =====

/**
 * 월 범위 생성
 */
export function getMonthRange(date: Date): MonthRange {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

/**
 * 월간 캘린더 날짜 배열 생성 (42일 = 6주)
 * - 앞: 이전 달 날짜로 채움
 * - 중간: 해당 월 모든 날짜
 * - 뒤: 다음 달 날짜로 채움
 */
export function getMonthDays(monthRange: MonthRange): MonthCalendarDay[] {
  const { year, month } = monthRange;
  const today = formatDateKey(new Date());

  // 해당 월 1일과 마지막 날
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // 1일의 요일 (0=일요일)
  const startDayOfWeek = firstDay.getDay();

  // 시작 날짜 (이전 달 포함)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  const days: MonthCalendarDay[] = [];

  // 42일 생성 (6주)
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();
    const isCurrentMonth = date.getMonth() + 1 === month && date.getFullYear() === year;

    days.push({
      date,
      dateKey,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isToday: dateKey === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      notices: [],
      isCurrentMonth,
    });
  }

  return days;
}

/**
 * 이전 월
 */
export function getPreviousMonth(monthRange: MonthRange): MonthRange {
  const { year, month } = monthRange;
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * 다음 월
 */
export function getNextMonth(monthRange: MonthRange): MonthRange {
  const { year, month } = monthRange;
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * 월 표시 텍스트
 */
export function formatMonthLabel(monthRange: MonthRange): string {
  return `${monthRange.year}년 ${monthRange.month}월`;
}
```

### 파일 수정 순서
1. `frontend/src/types/admin.ts` - 타입 추가
2. `frontend/src/utils/weekUtils.ts` - 함수 추가

### 테스트 체크리스트
- [ ] `getMonthDays({ year: 2024, month: 12 })` → 42일 배열
- [ ] 12월 1일이 일요일이면 첫 날짜가 12/1
- [ ] 12월 1일이 수요일이면 첫 날짜가 11/26 (일요일)
- [ ] `isCurrentMonth` 정확히 구분

---

## Phase 20-B: 월간 공지 데이터 훅

### 목표
월간 범위의 공지사항 조회 훅 추가

### 수정 파일
- `frontend/src/hooks/useAdminNotices.ts`

### 추가할 훅

```typescript
import type { MonthRange } from '@/types/admin';

interface UseMonthlyNoticesOptions {
  monthRange: MonthRange;
  userRole?: 'admin' | 'teacher';
  enabled?: boolean;
}

/**
 * 월간 공지사항 조회 훅
 * 해당 월의 모든 공지를 날짜별로 그룹핑하여 반환
 */
export function useMonthlyNotices(options: UseMonthlyNoticesOptions) {
  const { monthRange, userRole = 'admin', enabled = true } = options;

  // 월 첫날 ~ 마지막날 계산
  const startDate = `${monthRange.year}-${String(monthRange.month).padStart(2, '0')}-01`;
  const lastDay = new Date(monthRange.year, monthRange.month, 0).getDate();
  const endDate = `${monthRange.year}-${String(monthRange.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['admin', 'notices', 'monthly', monthRange.year, monthRange.month, userRole],
    queryFn: async (): Promise<NoticesByDate> => {
      // Supabase 미연결 시 빈 객체 반환
      if (!isSupabaseConfigured) {
        return {};
      }

      try {
        const visibilityFilter: NoticeVisibility[] =
          userRole === 'admin'
            ? ['all', 'admin', 'teacher']
            : ['all', 'teacher'];

        const { data, error } = await supabase
          .from('notices')
          .select('*')
          .eq('is_active', true)
          .gte('date', startDate)
          .lte('date', endDate)
          .in('visibility', visibilityFilter)
          .order('priority', { ascending: false });

        if (error) {
          console.warn('월간 공지 조회 실패:', error.message);
          return {};
        }

        // 데이터 변환 및 그룹핑
        const notices: Notice[] = (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          type: row.type,
          priority: row.priority || 0,
          visibility: row.visibility,
          createdBy: row.created_by,
          createdAt: row.created_at,
          isActive: row.is_active,
          isImportant: row.is_important ?? false,
        }));

        return groupNoticesByDate(notices);
      } catch {
        return {};
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1분 캐시
  });
}

/**
 * 월간 중요 공지만 추출 (캘린더 표시용)
 */
export function useMonthlyImportantNotices(monthRange: MonthRange, userRole: 'admin' | 'teacher' = 'admin') {
  const { data: noticesByDate, ...rest } = useMonthlyNotices({ monthRange, userRole });

  // 날짜별 중요 공지 (isImportant=true 또는 긴급/휴원 타입)
  const importantByDate = useMemo(() => {
    const result: Record<string, Notice[]> = {};

    if (!noticesByDate) return result;

    Object.entries(noticesByDate).forEach(([date, notices]) => {
      const important = notices.filter(
        (n) => n.isImportant || IMPORTANT_NOTICE_TYPES.includes(n.type)
      );
      if (important.length > 0) {
        result[date] = important;
      }
    });

    return result;
  }, [noticesByDate]);

  return { data: importantByDate, ...rest };
}
```

### 테스트 체크리스트
- [ ] 2024-12월 조회 시 12/1 ~ 12/31 범위 쿼리
- [ ] 공지 없는 달도 빈 객체 `{}` 반환
- [ ] `importantByDate`에 isImportant=true 공지만 포함

---

## Phase 20-C: MonthlyCalendarGrid 컴포넌트

### 목표
월간 캘린더 그리드 UI 컴포넌트 생성

### 생성 파일
- `frontend/src/components/admin/dashboard/MonthlyCalendarGrid.tsx`

### Props 인터페이스

```typescript
import type { MonthRange, MonthCalendarDay, Notice } from '../../../types/admin';

interface MonthlyCalendarGridProps {
  /** 현재 표시 중인 월 */
  monthRange: MonthRange;
  /** 선택된 날짜 (YYYY-MM-DD) */
  selectedDate: string;
  /** 날짜 선택 핸들러 */
  onDateSelect: (dateKey: string) => void;
  /** 월 변경 핸들러 */
  onMonthChange: (monthRange: MonthRange) => void;
  /** 날짜별 중요 공지 */
  importantNoticesByDate?: Record<string, Notice[]>;
  /** 순환수업 정보 */
  rotationInfo?: {
    dayOfWeek: number;
    exceptions: Set<string>;
  };
}
```

### 컴포넌트 구조

```tsx
export function MonthlyCalendarGrid({
  monthRange,
  selectedDate,
  onDateSelect,
  onMonthChange,
  importantNoticesByDate = {},
  rotationInfo,
}: MonthlyCalendarGridProps) {
  const { isMobile } = useBreakpoint();

  // 월간 날짜 배열
  const monthDays = useMemo(() => getMonthDays(monthRange), [monthRange]);

  // 이전/다음 월 핸들러
  const handlePrevMonth = () => onMonthChange(getPreviousMonth(monthRange));
  const handleNextMonth = () => onMonthChange(getNextMonth(monthRange));

  return (
    <div className="px-3 pb-4 pt-2">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button onClick={handlePrevMonth} className="...">
          <ChevronLeft />
        </button>
        <span className="text-base font-bold text-grey-900">
          {formatMonthLabel(monthRange)}
        </span>
        <button onClick={handleNextMonth} className="...">
          <ChevronRight />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-grey-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => (
          <MonthDayCell
            key={day.dateKey}
            day={day}
            isSelected={day.dateKey === selectedDate}
            onClick={() => onDateSelect(day.dateKey)}
            notices={importantNoticesByDate[day.dateKey] || []}
            isRotationDay={rotationInfo?.dayOfWeek === day.dayOfWeek}
            isRotationHoliday={rotationInfo?.exceptions.has(day.dateKey) || false}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-grey-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full" />
          <span>순환수업</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-amber-400 rounded-full" />
          <span>공지</span>
        </div>
      </div>
    </div>
  );
}
```

### MonthDayCell 서브 컴포넌트

```tsx
interface MonthDayCellProps {
  day: MonthCalendarDay;
  isSelected: boolean;
  onClick: () => void;
  notices: Notice[];
  isRotationDay: boolean;
  isRotationHoliday: boolean;
  isMobile: boolean;
}

function MonthDayCell({
  day,
  isSelected,
  onClick,
  notices,
  isRotationDay,
  isRotationHoliday,
  isMobile,
}: MonthDayCellProps) {
  const { isToday, isWeekend, isCurrentMonth, date } = day;
  const dayNumber = date.getDate();

  // 스타일 계산
  const textColor = !isCurrentMonth
    ? 'text-grey-300'
    : isToday
    ? 'text-white'
    : day.dayOfWeek === 0
    ? 'text-red-400'
    : day.dayOfWeek === 6
    ? 'text-blue-400'
    : 'text-grey-700';

  const bgColor = isToday
    ? 'bg-toss-blue'
    : isSelected
    ? 'ring-2 ring-toss-blue ring-inset'
    : '';

  return (
    <div
      onClick={onClick}
      className={`
        text-center py-2 cursor-pointer rounded-lg transition-colors
        ${bgColor}
        ${!isToday && !isSelected ? 'hover:bg-grey-50 active:bg-grey-100' : ''}
      `}
    >
      {/* 날짜 숫자 */}
      <div className={`text-sm font-medium ${textColor}`}>
        {dayNumber}
      </div>

      {/* 공지 표시 (반응형) */}
      {notices.length > 0 && isCurrentMonth && (
        <div className="mt-0.5">
          {isMobile ? (
            // 모바일: 점으로 표시
            <div className="flex justify-center gap-0.5">
              {Array.from({ length: Math.min(notices.length, 3) }).map((_, i) => (
                <span key={i} className="w-1 h-1 bg-amber-500 rounded-full" />
              ))}
            </div>
          ) : (
            // PC: 텍스트로 표시
            <div className="text-[9px] text-amber-600 truncate px-0.5">
              {notices[0].title.slice(0, 6)}..
            </div>
          )}
        </div>
      )}

      {/* 순환수업 마커 */}
      {isRotationDay && isCurrentMonth && !isRotationHoliday && (
        <div className="flex justify-center mt-0.5">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
        </div>
      )}
    </div>
  );
}
```

### 테스트 체크리스트
- [ ] 6주(42일) 그리드 정상 렌더링
- [ ] 이전/다음 월 네비게이션 동작
- [ ] 오늘 날짜 파란색 원 표시
- [ ] 선택된 날짜 ring 표시
- [ ] 다른 달 날짜 회색 처리
- [ ] 모바일: 공지 점(●) 표시
- [ ] PC: 공지 텍스트 표시
- [ ] 순환수업 보라색 점 표시

---

## Phase 20-D: WeeklyCalendar 통합

### 목표
- "오늘" 버튼 → "월간" 버튼 변경
- 드롭다운 확장/축소 기능
- 날짜 선택 시 자동 축소

### 수정 파일
- `frontend/src/components/admin/dashboard/WeeklyCalendar.tsx`
- `frontend/src/components/admin/dashboard/index.ts`

### 상태 추가

```typescript
// 기존 import에 추가
import { MonthlyCalendarGrid } from './MonthlyCalendarGrid';
import { useMonthlyImportantNotices } from '../../../hooks/useAdminNotices';
import type { MonthRange } from '../../../types/admin';
import { getMonthRange } from '../../../utils/weekUtils';

export function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
  // 기존 상태들...

  // ===== Stage 20: 월간 캘린더 상태 =====
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);
  const [monthRange, setMonthRange] = useState<MonthRange>(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    return { year, month };
  });

  // 월간 중요 공지 데이터 (열려있을 때만 조회)
  const { data: monthlyImportantNotices } = useMonthlyImportantNotices(
    monthRange,
    'admin'
  );

  // 월간에서 날짜 선택 핸들러
  const handleMonthlyDateSelect = (dateKey: string) => {
    // 1. 날짜 선택
    onDateSelect(dateKey);

    // 2. 주간 캘린더를 해당 주로 이동
    const [year, month, day] = dateKey.split('-').map(Number);
    const newDate = new Date(year, month - 1, day);
    setWeekRange(getWeekRange(newDate));

    // 3. 월간 캘린더 닫기
    setIsMonthlyOpen(false);
  };

  // 월 변경 시 monthRange 업데이트
  const handleMonthChange = (newMonthRange: MonthRange) => {
    setMonthRange(newMonthRange);
  };
```

### 버튼 변경 (JSX)

```tsx
{/* 기존 "오늘" 버튼 위치 */}
<button
  onClick={() => setIsMonthlyOpen(!isMonthlyOpen)}
  className={`
    px-4 py-2 text-sm font-semibold rounded-full transition-all
    ${isMonthlyOpen
      ? 'bg-toss-blue text-white'
      : 'bg-grey-100 text-grey-700 hover:bg-grey-200'
    }
  `}
>
  {isMonthlyOpen ? '주간' : '월간'}
</button>
```

### 드롭다운 추가 (JSX)

```tsx
{/* 주간 캘린더 그리드 다음에 추가 */}
</div> {/* 주간 그리드 닫는 태그 */}

{/* Stage 20: 월간 캘린더 드롭다운 */}
<div
  className={`
    overflow-hidden transition-all duration-300 ease-in-out
    ${isMonthlyOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}
  `}
>
  <div className="border-t border-grey-100">
    <MonthlyCalendarGrid
      monthRange={monthRange}
      selectedDate={selectedDate}
      onDateSelect={handleMonthlyDateSelect}
      onMonthChange={handleMonthChange}
      importantNoticesByDate={monthlyImportantNotices}
      rotationInfo={rotationInfo}
    />
  </div>
</div>

{/* Stage 16: 중요 알림 섹션 */}
```

### index.ts 업데이트

```typescript
// 기존 export에 추가
export { MonthlyCalendarGrid } from './MonthlyCalendarGrid';
```

### 테스트 체크리스트
- [ ] "월간" 버튼 클릭 → 월간 캘린더 슬라이드 다운
- [ ] "주간" 버튼 클릭 → 월간 캘린더 슬라이드 업
- [ ] 월간에서 날짜 선택 → 자동 닫힘 + 주간 캘린더 해당 주 이동
- [ ] 애니메이션 부드러움 (300ms)
- [ ] 모바일에서 공지 점 표시
- [ ] PC에서 공지 텍스트 표시

---

## 파일 수정 순서 (의존성 기준)

```
1. types/admin.ts          ← MonthRange, MonthCalendarDay 타입
2. utils/weekUtils.ts      ← getMonthDays, getPreviousMonth 등
3. hooks/useAdminNotices.ts ← useMonthlyNotices, useMonthlyImportantNotices
4. components/.../MonthlyCalendarGrid.tsx ← 새 컴포넌트
5. components/.../index.ts ← export 추가
6. components/.../WeeklyCalendar.tsx ← 통합
```

---

## 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `MonthRange is not defined` | import 누락 | `types/admin`에서 import |
| `getMonthDays is not defined` | import 누락 | `utils/weekUtils`에서 import |
| `useBreakpoint is not defined` | import 누락 | `hooks/useIsMobile`에서 import |
| 애니메이션 끊김 | max-h 값 부족 | `max-h-[400px]` 이상으로 |
| 타입 에러 | MonthCalendarDay extends CalendarDay | types/admin.ts 확인 |

---

## 빌드 테스트

각 Phase 완료 후:
```bash
cd frontend && npm run build
```

- [ ] Phase 20-A 완료 후 빌드 성공
- [ ] Phase 20-B 완료 후 빌드 성공
- [ ] Phase 20-C 완료 후 빌드 성공
- [ ] Phase 20-D 완료 후 빌드 성공

---

## 최종 결과물

| 항목 | Before | After |
|------|--------|-------|
| 버튼 | "오늘" (파란색) | "월간" ↔ "주간" (토글) |
| 캘린더 | 주간 7일만 | 주간 + 월간 드롭다운 |
| 공지 표시 | 주간만 | 월간에도 반응형 표시 |
