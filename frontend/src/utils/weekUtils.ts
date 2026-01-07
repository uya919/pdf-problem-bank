/**
 * 주간/월간 캘린더 유틸리티 함수
 *
 * Stage 13: PC 대시보드 캘린더 UI
 * Stage 20: 월간 캘린더 드롭다운
 */

import type { WeekRange, CalendarDay, Notice, MonthRange, MonthCalendarDay } from '../types/admin';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 날짜를 YYYY-MM-DD 형식 문자열로 변환
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 주어진 날짜가 속한 주의 범위를 반환 (일요일 시작)
 */
export function getWeekRange(date: Date): WeekRange {
  const target = new Date(date);
  const dayOfWeek = target.getDay();

  // 일요일로 이동 (일요일=0 기준)
  const sunday = new Date(target);
  sunday.setDate(target.getDate() - dayOfWeek);

  // 토요일 계산
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  // 주차 계산 (해당 월의 몇 번째 주인지)
  const firstDayOfMonth = new Date(sunday.getFullYear(), sunday.getMonth(), 1);
  const weekNumber = Math.ceil(
    (sunday.getDate() + firstDayOfMonth.getDay()) / 7
  );

  return {
    start: formatDateKey(sunday),
    end: formatDateKey(saturday),
    weekNumber,
    month: sunday.getMonth() + 1,
    year: sunday.getFullYear(),
  };
}

/**
 * 주간 범위에 해당하는 7일 배열 반환
 */
export function getWeekDays(
  weekRange: WeekRange,
  noticesByDate: Record<string, Notice[]> = {}
): CalendarDay[] {
  const [year, month, day] = weekRange.start.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  const today = formatDateKey(new Date());

  const days: CalendarDay[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();

    days.push({
      date,
      dateKey,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isToday: dateKey === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      notices: noticesByDate[dateKey] || [],
    });
  }

  return days;
}

/**
 * 이전 주로 이동
 */
export function getPreviousWeek(weekRange: WeekRange): WeekRange {
  const [year, month, day] = weekRange.start.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  startDate.setDate(startDate.getDate() - 7);
  return getWeekRange(startDate);
}

/**
 * 다음 주로 이동
 */
export function getNextWeek(weekRange: WeekRange): WeekRange {
  const [year, month, day] = weekRange.start.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  startDate.setDate(startDate.getDate() + 7);
  return getWeekRange(startDate);
}

/**
 * 주간 범위 표시 텍스트 생성 (예: "12월 3주")
 */
export function formatWeekRangeLabel(weekRange: WeekRange): string {
  return `${weekRange.month}월 ${weekRange.weekNumber}주`;
}

/**
 * 오늘이 속한 주인지 확인
 */
export function isCurrentWeek(weekRange: WeekRange): boolean {
  const today = formatDateKey(new Date());
  return today >= weekRange.start && today <= weekRange.end;
}

// =====================================================
// 월간 캘린더 유틸리티 함수 (Stage 20)
// =====================================================

/**
 * 현재 날짜 기준 MonthRange 반환
 */
export function getCurrentMonthRange(): MonthRange {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * WeekRange에서 MonthRange 추출
 */
export function getMonthRangeFromWeek(weekRange: WeekRange): MonthRange {
  return {
    year: weekRange.year,
    month: weekRange.month,
  };
}

/**
 * 이전 월로 이동
 */
export function getPreviousMonth(monthRange: MonthRange): MonthRange {
  if (monthRange.month === 1) {
    return { year: monthRange.year - 1, month: 12 };
  }
  return { year: monthRange.year, month: monthRange.month - 1 };
}

/**
 * 다음 월로 이동
 */
export function getNextMonth(monthRange: MonthRange): MonthRange {
  if (monthRange.month === 12) {
    return { year: monthRange.year + 1, month: 1 };
  }
  return { year: monthRange.year, month: monthRange.month + 1 };
}

/**
 * 월 범위 표시 텍스트 생성 (예: "2024년 12월")
 */
export function formatMonthLabel(monthRange: MonthRange): string {
  return `${monthRange.year}년 ${monthRange.month}월`;
}

/**
 * 월간 캘린더 날짜 배열 생성 (42일 = 6주)
 * - 이전 달 말일, 현재 달 전체, 다음 달 초일 포함
 */
export function getMonthDays(
  monthRange: MonthRange,
  noticesByDate: Record<string, Notice[]> = {}
): MonthCalendarDay[] {
  const { year, month } = monthRange;
  const today = formatDateKey(new Date());

  // 해당 월의 1일
  const firstDayOfMonth = new Date(year, month - 1, 1);
  // 해당 월의 마지막 날
  const lastDayOfMonth = new Date(year, month, 0);

  // 1일의 요일 (0=일, 6=토)
  const startDayOfWeek = firstDayOfMonth.getDay();

  const days: MonthCalendarDay[] = [];

  // 이전 달 날짜 채우기
  if (startDayOfWeek > 0) {
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 2, prevMonthLastDay - i);
      const dateKey = formatDateKey(date);
      const dayOfWeek = date.getDay();

      days.push({
        date,
        dateKey,
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek],
        isToday: dateKey === today,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        notices: noticesByDate[dateKey] || [],
        isCurrentMonth: false,
      });
    }
  }

  // 현재 달 날짜 채우기
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const date = new Date(year, month - 1, day);
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();

    days.push({
      date,
      dateKey,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isToday: dateKey === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      notices: noticesByDate[dateKey] || [],
      isCurrentMonth: true,
    });
  }

  // 다음 달 날짜 채우기 (총 42일이 되도록)
  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dayOfWeek = date.getDay();

    days.push({
      date,
      dateKey,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isToday: dateKey === today,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      notices: noticesByDate[dateKey] || [],
      isCurrentMonth: false,
    });
  }

  return days;
}

/**
 * 오늘이 속한 월인지 확인
 */
export function isCurrentMonth(monthRange: MonthRange): boolean {
  const now = new Date();
  return monthRange.year === now.getFullYear() && monthRange.month === now.getMonth() + 1;
}

/**
 * 월간 날짜 범위 문자열 반환 (API 쿼리용)
 * @returns { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
 */
export function getMonthDateRange(monthRange: MonthRange): { start: string; end: string } {
  const { year, month } = monthRange;

  // 1일의 요일을 기준으로 이전 달 날짜도 포함
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();

  // 캘린더 시작일 (이전 달 포함)
  const startDate = new Date(year, month - 1, 1 - startDayOfWeek);

  // 캘린더 종료일 (42일 후)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 41);

  return {
    start: formatDateKey(startDate),
    end: formatDateKey(endDate),
  };
}
