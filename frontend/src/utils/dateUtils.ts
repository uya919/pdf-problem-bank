/**
 * dateUtils.ts - 날짜 유틸리티 함수
 *
 * 기간 선택 캘린더용 유틸리티
 */

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 두 날짜가 같은 날인지 비교 (시간 무시)
 */
export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * 두 날짜가 같은 달인지 비교
 */
export function isSameMonth(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth()
  );
}

/**
 * 날짜가 범위 내에 있는지 확인 (경계 포함)
 */
export function isInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

/**
 * 날짜가 시작일인지 확인
 */
export function isStartDate(date: Date, start: Date | null): boolean {
  if (!start) return false;
  return isSameDay(date, start);
}

/**
 * 날짜가 종료일인지 확인
 */
export function isEndDate(date: Date, end: Date | null): boolean {
  if (!end) return false;
  return isSameDay(date, end);
}

/**
 * 주의 시작일 반환 (월요일 기준)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

/**
 * 주의 종료일 반환 (일요일 기준)
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
}

/**
 * 이번 주 범위 반환
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: getWeekStart(today),
    end: getWeekEnd(today),
  };
}

/**
 * 지난 주 범위 반환
 */
export function getLastWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  const lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
  return {
    start: getWeekStart(lastWeek),
    end: getWeekEnd(lastWeek),
  };
}

/**
 * 이번 달 범위 반환
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { start, end };
}

/**
 * 지난 달 범위 반환
 */
export function getLastMonthRange(): { start: Date; end: Date } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start, end };
}

/**
 * 날짜를 "12/11 (수)" 형식으로 포맷
 */
export function formatDateWithDay(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayName = DAY_NAMES[date.getDay()];
  return `${month}/${day} (${dayName})`;
}

/**
 * 날짜를 "12/11" 형식으로 포맷 (짧은 형식)
 */
export function formatDateShort(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * 월의 첫째 날과 마지막 날 반환
 */
export function getMonthBoundaries(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { firstDay, lastDay };
}

/**
 * 캘린더 그리드용 날짜 배열 생성 (이전/다음 달 포함, 6주)
 * 일요일 시작 기준 (일~토)
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const { firstDay, lastDay } = getMonthBoundaries(year, month);
  const days: Date[] = [];

  // 첫째 날의 요일 (일요일 = 0 기준, 그대로 사용)
  const startDay = firstDay.getDay();

  // 이전 달 날짜들
  const prevMonth = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonth.getDate() - i);
    days.push(d);
  }

  // 현재 달 날짜들
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // 다음 달 날짜들 (6주 채우기)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}
