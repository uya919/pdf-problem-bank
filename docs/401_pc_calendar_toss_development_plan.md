# PC 대시보드 캘린더 - 토스 스타일 적용 개발 계획

> Stage 13-B: 주간 캘린더 토스 UX 철학 리디자인

---

## 1. 개요

### 1.1 목표
- 기존 회색 선(border) 기반 캘린더를 토스 스타일로 전면 리디자인
- 토스 UX 철학 (Simplicity, 피츠의 법칙, 심미적 사용성) 적용

### 1.2 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `tailwind.config.js` | toss 색상 토큰 추가 |
| `admin.ts` | NOTICE_STYLES 색상 토큰 업데이트 |
| `WeeklyCalendar.tsx` | 컨테이너 스타일, 헤더 레이아웃, 그리드 구조 |
| `CalendarDayCell.tsx` | 셀 스타일, 오늘 표시, 공지 뱃지 |

### 1.3 참고 목업
- `docs/mockups/admin_dashboard_with_toss_calendar.html`

---

## 2. Phase 별 개발 계획

### Phase 1: Tailwind 색상 토큰 추가

**파일:** `frontend/tailwind.config.js`

**추가할 색상:**
```javascript
toss: {
  blue: '#3182F6',
  blueDark: '#1B64DA',
  blueLight: '#E8F3FF',
  red: '#F04452',
  redLight: '#FFEBEE',
  orange: '#FF8800',
  orangeLight: '#FFF4E6',
  green: '#00C853',
  greenLight: '#E6F9F0',
}
```

**체크리스트:**
- [ ] 기존 colors.grey 유지
- [ ] toss 네임스페이스로 추가
- [ ] 애니메이션 keyframes 추가 (pulse-soft)

---

### Phase 2: NOTICE_STYLES 업데이트

**파일:** `frontend/src/types/admin.ts`

**변경 내용:**
- `badgeBg` 속성 추가
- 토스 색상 토큰으로 변경

**변경 후 코드:**
```typescript
export const NOTICE_STYLES: Record<
  NoticeType,
  { textColor: string; dotColor: string; bgColor: string; badgeBg: string }
> = {
  warning: {
    textColor: 'text-toss-orange',
    dotColor: 'bg-toss-orange',
    bgColor: 'bg-toss-orangeLight',
    badgeBg: 'bg-toss-orangeLight',
  },
  info: {
    textColor: 'text-grey-600',
    dotColor: 'bg-grey-400',
    bgColor: 'bg-grey-100',
    badgeBg: 'bg-grey-100',
  },
  holiday: {
    textColor: 'text-toss-red',
    dotColor: 'bg-toss-red',
    bgColor: 'bg-toss-redLight',
    badgeBg: 'bg-toss-redLight',
  },
  event: {
    textColor: 'text-toss-blue',
    dotColor: 'bg-toss-blue',
    bgColor: 'bg-toss-blueLight',
    badgeBg: 'bg-toss-blueLight',
  },
};
```

---

### Phase 3: WeeklyCalendar.tsx 리디자인

**파일:** `frontend/src/components/admin/dashboard/WeeklyCalendar.tsx`

#### 3.1 변경 사항 요약

| 요소 | 기존 | 변경 |
|------|------|------|
| 컨테이너 | `rounded-2xl border border-grey-200` | `rounded-3xl shadow-sm` |
| 헤더 영역 | `px-5 py-3 border-b border-grey-100` | `px-5 py-4` (border 제거) |
| 그리드 | `grid grid-cols-7` (border 구분) | `px-3 pb-4` + `gap-2` |
| 이전/다음 버튼 | `p-1.5` 작은 버튼 | `w-10 h-10` 원형 버튼 |
| 오늘 버튼 | 텍스트 링크 | pill 버튼 (파란 배경) |
| 주 표시 | `text-base font-semibold` | `text-lg font-bold` |

#### 3.2 전체 코드

```tsx
/**
 * WeeklyCalendar - PC 관리자 주간 캘린더
 * Stage 13-B: 토스 UX 철학 리디자인
 */

import { useState, useMemo } from 'react';
import { CalendarDayCell } from './CalendarDayCell';
import { useAdminNotices } from '../../../hooks/useAdminNotices';
import {
  getWeekRange,
  getWeekDays,
  getPreviousWeek,
  getNextWeek,
  formatWeekRangeLabel,
  formatDateKey,
} from '../../../utils/weekUtils';
import type { WeekRange } from '../../../types/admin';

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
  const [weekRange, setWeekRange] = useState<WeekRange>(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return getWeekRange(new Date(year, month - 1, day));
  });

  const { data: noticesByDate, isLoading } = useAdminNotices({ weekRange });

  const weekDays = useMemo(() => {
    return getWeekDays(weekRange, noticesByDate || {});
  }, [weekRange, noticesByDate]);

  const handlePrevWeek = () => setWeekRange(getPreviousWeek(weekRange));
  const handleNextWeek = () => setWeekRange(getNextWeek(weekRange));

  const handleGoToday = () => {
    const today = new Date();
    setWeekRange(getWeekRange(today));
    onDateSelect(formatDateKey(today));
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-1">
          {/* 이전 주 */}
          <button
            onClick={handlePrevWeek}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-grey-100 text-grey-400 active:scale-95 transition-transform"
            aria-label="이전 주"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 주 표시 */}
          <span className="text-lg font-bold text-grey-900 px-2">
            {formatWeekRangeLabel(weekRange)}
          </span>

          {/* 다음 주 */}
          <button
            onClick={handleNextWeek}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-grey-100 text-grey-400 active:scale-95 transition-transform"
            aria-label="다음 주"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {isLoading && (
            <span className="ml-2 w-4 h-4 border-2 border-grey-300 border-t-toss-blue rounded-full animate-spin" />
          )}
        </div>

        {/* 오늘 버튼 */}
        <button
          onClick={handleGoToday}
          className="px-4 py-2 bg-toss-blue text-white text-sm font-semibold rounded-full active:scale-95 transition-transform hover:bg-toss-blueDark"
        >
          오늘
        </button>
      </div>

      {/* 주간 그리드 */}
      <div className="px-3 pb-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <CalendarDayCell
              key={day.dateKey}
              day={day}
              isSelected={day.dateKey === selectedDate}
              onClick={() => onDateSelect(day.dateKey)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 4: CalendarDayCell.tsx 전면 리디자인

**파일:** `frontend/src/components/admin/dashboard/CalendarDayCell.tsx`

#### 4.1 변경 사항 요약

| 요소 | 기존 | 변경 |
|------|------|------|
| 셀 구분 | `border-r border-grey-100` | 없음 (gap으로 구분) |
| 셀 모서리 | 없음 | `rounded-2xl` |
| 셀 높이 | `min-h-[88px]` | `min-h-[100px]` |
| 날짜 레이아웃 | 좌우 배치 | 중앙 정렬 |
| 오늘 표시 | 텍스트 "오늘" + 숫자 | 원형 파란 배경 + 펄스 |
| 공지 표시 | 텍스트 | 뱃지 (색상 배경) |
| active 피드백 | 없음 | `scale-[0.98]` |

#### 4.2 전체 코드

```tsx
/**
 * CalendarDayCell - 주간 캘린더 날짜 셀
 * Stage 13-B: 토스 UX 철학 리디자인
 */

import type { CalendarDay } from '../../../types/admin';
import { NOTICE_STYLES } from '../../../types/admin';

interface CalendarDayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onClick: () => void;
}

export function CalendarDayCell({ day, isSelected, onClick }: CalendarDayCellProps) {
  const { date, dayName, isToday, isWeekend, notices } = day;
  const dayNumber = date.getDate();

  // 요일 텍스트 색상
  const dayTextColor = isToday
    ? 'text-toss-blue font-medium'
    : isWeekend
    ? 'text-grey-300'
    : 'text-grey-400';

  // 날짜 숫자 색상
  const numberTextColor = isWeekend ? 'text-grey-400' : 'text-grey-700';

  // 셀 배경
  const cellBg = isToday
    ? 'bg-toss-blueLight'
    : isSelected
    ? 'ring-2 ring-toss-blue ring-inset'
    : '';

  // 공지 최대 2개
  const visibleNotices = notices.slice(0, 2);

  return (
    <div
      className={`
        rounded-2xl p-3 cursor-pointer transition-all min-h-[100px]
        active:scale-[0.98]
        ${cellBg}
        ${!isToday && !isSelected ? 'hover:bg-grey-50' : ''}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* 날짜 (중앙 정렬) */}
      <div className="text-center mb-2">
        <div className={`text-xs mb-1 ${dayTextColor}`}>{dayName}</div>

        {isToday ? (
          <div
            className="inline-flex items-center justify-center w-10 h-10 bg-toss-blue rounded-full animate-pulse-soft"
          >
            <span className="text-xl font-bold text-white">{dayNumber}</span>
          </div>
        ) : (
          <span className={`text-xl font-semibold ${numberTextColor}`}>
            {dayNumber}
          </span>
        )}
      </div>

      {/* 공지 뱃지 */}
      {visibleNotices.length > 0 && (
        <div className="space-y-1.5">
          {visibleNotices.map((notice) => (
            <div key={notice.id} className="flex justify-center">
              <div className={`px-2.5 py-1 rounded-lg ${NOTICE_STYLES[notice.type].badgeBg}`}>
                <span className={`text-xs font-medium ${NOTICE_STYLES[notice.type].textColor}`}>
                  {notice.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* +N개 더 */}
      {notices.length > 2 && (
        <div className="text-center text-[10px] text-grey-400 mt-1">
          +{notices.length - 2}개 더
        </div>
      )}
    </div>
  );
}
```

---

### Phase 5: 빌드 테스트 및 검증

**체크리스트:**
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] 브라우저에서 캘린더 정상 렌더링
- [ ] 오늘 날짜 원형 배경 + 펄스 애니메이션
- [ ] 공지 뱃지 색상 정상
- [ ] hover/active 피드백 동작
- [ ] 주 이동 버튼 동작
- [ ] 날짜 선택 시 ring 표시

---

## 3. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `toss-blue` 인식 안됨 | Tailwind 설정 누락 | Phase 1에서 tailwind.config.js에 색상 추가 |
| `badgeBg` 속성 없음 | NOTICE_STYLES 타입 불일치 | Phase 2에서 타입 및 값 추가 |
| `animate-pulse-soft` 안됨 | keyframes 정의 누락 | tailwind.config.js에 animation 추가 |
| `ring-inset` 안됨 | Tailwind 버전 이슈 | `ring-2 ring-toss-blue` 만 사용 또는 인라인 스타일 |

---

## 4. 파일별 의존성 순서

```
1. tailwind.config.js  (색상 토큰 + 애니메이션)
   ↓
2. admin.ts            (NOTICE_STYLES 업데이트)
   ↓
3. WeeklyCalendar.tsx  (컨테이너/헤더/그리드)
   ↓
4. CalendarDayCell.tsx (셀 스타일/오늘/뱃지)
   ↓
5. 빌드 테스트
```

---

## 5. 시각적 변경 요약

### Before (기존)
```
┌─────────────────────────────────────────────────┐
│ ← 12월 3주 →                              오늘  │ ← border-b
├───────┬───────┬───────┬───────┬───────┬────────┤
│월  16 │화  17 │수  18 │목  19 │금  20 │...     │ ← border-r
│       │공지   │       │오늘   │       │        │
└───────┴───────┴───────┴───────┴───────┴────────┘
```

### After (토스 스타일)
```
┌─────────────────────────────────────────────────┐
│ ○← 12월 3주차 →○                      [오늘]   │ ← 둥근 버튼
│                                                 │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│ │  월 │ │  화 │ │  수 │ │  목 │ │  금 │ ...   │ ← gap으로 구분
│ │  16 │ │  17 │ │  18 │ │ ●19 │ │  20 │       │ ← 오늘=원형
│ │     │ │[교재]│ │     │ │[결석]│ │[휴원]│       │ ← 뱃지
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────────────┘
```

---

## 6. 적용된 토스 UX 원칙

| 원칙 | 적용 내용 |
|------|----------|
| **Simplicity** | border 제거, gap으로 구분, 중앙 정렬 |
| **피츠의 법칙** | 버튼 w-10 h-10 (44px 터치 영역) |
| **심미적 사용성** | rounded-2xl/3xl, 둥글둥글한 디자인 |
| **정보 덩어리화** | 공지를 뱃지로 그룹화 |
| **마이크로 인터랙션** | active:scale, animate-pulse-soft |

---

*작성일: 2025-12-19*
*Stage 13-B: 토스 스타일 캘린더 적용*
