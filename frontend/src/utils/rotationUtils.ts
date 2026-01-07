/**
 * 순환수업 주차 계산 유틸리티
 * @module utils/rotationUtils
 *
 * 핵심 기능:
 * 1. 특정 날짜의 주차 계산 (휴일 이월 반영)
 * 2. 향후 N주 일정 생성
 * 3. 날짜 관련 헬퍼 함수
 */

import type {
  RotationSchedule,
  RotationPattern,
  RotationException,
  RotationActivity,
  ActivityType,
} from '../types/rotation';

// =============================================
// 날짜 헬퍼 함수
// =============================================

/**
 * Date를 'YYYY-MM-DD' 형식으로 변환
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 'YYYY-MM-DD' 문자열을 Date로 변환
 */
export function parseStringToDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * 두 날짜 사이의 주 수 차이 계산
 */
export function getWeeksDiff(date1: Date, date2: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = date2.getTime() - date1.getTime();
  return Math.floor(diff / msPerWeek);
}

/**
 * 특정 날짜가 지정된 요일인지 확인
 * @param date - 확인할 날짜
 * @param dayOfWeek - 요일 (0=일요일, 3=수요일)
 */
export function isMatchingDayOfWeek(date: Date, dayOfWeek: number): boolean {
  return date.getDay() === dayOfWeek;
}

/**
 * 특정 날짜 이후의 다음 해당 요일 날짜 찾기
 * @param fromDate - 시작 날짜
 * @param dayOfWeek - 찾을 요일 (0-6)
 * @param includeFrom - fromDate가 해당 요일이면 포함할지
 */
export function getNextDayOfWeek(
  fromDate: Date,
  dayOfWeek: number,
  includeFrom: boolean = true
): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();

  if (includeFrom && currentDay === dayOfWeek) {
    return result;
  }

  const daysUntilNext = (dayOfWeek - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilNext);
  return result;
}

/**
 * 날짜에 주 수 더하기
 */
export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

// =============================================
// 주차 계산 (핵심 알고리즘)
// =============================================

/**
 * 특정 날짜의 기본 주차 계산 (휴일 무시)
 *
 * @param date - 확인할 날짜
 * @param startDate - 1주차 기준일
 * @param cycleWeeks - 순환 주기 (기본 3)
 * @returns 1 ~ cycleWeeks 사이의 주차 번호
 */
export function getBasicWeekNumber(
  date: Date,
  startDate: Date,
  cycleWeeks: number = 3
): number {
  const weeksDiff = getWeeksDiff(startDate, date);

  // 음수인 경우 (시작일 이전) 처리
  if (weeksDiff < 0) {
    // 시작일 이전은 역으로 계산
    const adjustedWeeks = ((weeksDiff % cycleWeeks) + cycleWeeks) % cycleWeeks;
    return adjustedWeeks === 0 ? cycleWeeks : adjustedWeeks;
  }

  // 0-indexed를 1-indexed로 변환
  return (weeksDiff % cycleWeeks) + 1;
}

/**
 * 휴일 이월을 반영한 실제 주차 계산
 *
 * 이월 로직:
 * - carry_over: 해당 주차가 다음 주로 밀림
 * - skip: 해당 주차를 건너뛰고 다음 주차로 진행
 *
 * @param date - 확인할 날짜
 * @param startDate - 1주차 기준일
 * @param cycleWeeks - 순환 주기
 * @param exceptions - 휴일/예외 목록
 * @returns { weekNumber, isCarriedOver, isHoliday, holidayReason }
 */
export function getRotationWeekWithExceptions(
  date: Date,
  startDate: Date,
  cycleWeeks: number,
  exceptions: RotationException[]
): {
  weekNumber: number;
  isCarriedOver: boolean;
  isHoliday: boolean;
  holidayReason?: string;
} {
  const dateStr = formatDateToString(date);

  // 현재 날짜가 휴일인지 확인
  const currentException = exceptions.find((e) => e.exception_date === dateStr);
  if (currentException) {
    return {
      weekNumber: 0, // 휴일은 주차 0
      isCarriedOver: false,
      isHoliday: true,
      holidayReason: currentException.reason,
    };
  }

  // 이월된 휴일 수 계산
  // 시작일부터 현재 날짜까지의 carry_over 휴일 개수
  const startDateStr = formatDateToString(startDate);
  const carryOverCount = exceptions.filter((e) => {
    if (e.action_type !== 'carry_over') return false;
    if (e.exception_date >= dateStr) return false;
    if (e.exception_date < startDateStr) return false;
    return true;
  }).length;

  // 스킵된 휴일 수 계산
  const skipCount = exceptions.filter((e) => {
    if (e.action_type !== 'skip') return false;
    if (e.exception_date >= dateStr) return false;
    if (e.exception_date < startDateStr) return false;
    return true;
  }).length;

  // 기본 주차 계산
  const basicWeek = getBasicWeekNumber(date, startDate, cycleWeeks);

  // 이월 반영: carry_over는 주차를 밀고, skip은 주차를 건너뜀
  // carry_over: 실제 주차 = 기본 주차 - 이월 수
  // skip: 주차 계산에 영향 없음 (그냥 건너뜀)
  const adjustedWeek = basicWeek - carryOverCount;

  // 순환 처리
  let finalWeek = ((adjustedWeek - 1) % cycleWeeks + cycleWeeks) % cycleWeeks + 1;

  return {
    weekNumber: finalWeek,
    isCarriedOver: carryOverCount > 0,
    isHoliday: false,
  };
}

// =============================================
// 일정 생성
// =============================================

/**
 * 특정 날짜의 순환수업 활동 조회
 */
export function getActivitiesForDate(
  date: Date,
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  // 요일 확인
  if (!isMatchingDayOfWeek(date, schedule.day_of_week)) {
    return null;
  }

  const dateStr = formatDateToString(date);
  const startDate = parseStringToDate(schedule.start_date);

  // 주차 계산
  const weekInfo = getRotationWeekWithExceptions(
    date,
    startDate,
    schedule.cycle_weeks,
    exceptions
  );

  // 휴일인 경우
  if (weekInfo.isHoliday) {
    return {
      date: dateStr,
      weekNumber: 0,
      isHoliday: true,
      isCarriedOver: false,
      holidayReason: weekInfo.holidayReason,
      activities: [],
    };
  }

  // 해당 주차의 활동 찾기
  const weekPatterns = patterns.filter((p) => p.week_number === weekInfo.weekNumber);

  const activities = weekPatterns.map((p) => ({
    gradeId: p.grade_id,
    gradeName: p.grades?.name || '',
    activityType: p.activity_type as ActivityType,
    activityName: p.activity_name,
  }));

  return {
    date: dateStr,
    weekNumber: weekInfo.weekNumber,
    isHoliday: false,
    isCarriedOver: weekInfo.isCarriedOver,
    activities,
  };
}

/**
 * 향후 N주 순환수업 일정 생성
 *
 * @param schedule - 순환수업 설정
 * @param patterns - 패턴 목록
 * @param exceptions - 예외 목록
 * @param weeks - 생성할 주 수 (기본 12주)
 * @param fromDate - 시작 날짜 (기본 오늘)
 */
export function generateRotationSchedule(
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[],
  weeks: number = 12,
  fromDate: Date = new Date()
): RotationActivity[] {
  const result: RotationActivity[] = [];

  // 시작 날짜를 해당 요일로 맞춤
  let currentDate = getNextDayOfWeek(fromDate, schedule.day_of_week, true);

  for (let i = 0; i < weeks; i++) {
    const activity = getActivitiesForDate(
      currentDate,
      schedule,
      patterns,
      exceptions
    );

    if (activity) {
      result.push(activity);
    }

    // 다음 주로 이동
    currentDate = addWeeks(currentDate, 1);
  }

  return result;
}

/**
 * 특정 날짜의 순환수업 조회
 * @param date - 조회할 날짜
 * @param schedule - 순환수업 설정
 * @param patterns - 패턴 목록
 * @param exceptions - 예외 목록
 */
export function getRotationForDate(
  date: Date,
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  return getActivitiesForDate(date, schedule, patterns, exceptions);
}

/**
 * 오늘의 순환수업 조회 (하위 호환성)
 */
export function getTodayRotation(
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[]
): RotationActivity | null {
  return getRotationForDate(new Date(), schedule, patterns, exceptions);
}

/**
 * 다음 순환수업 날짜 찾기
 */
export function getNextRotationDate(
  schedule: RotationSchedule,
  exceptions: RotationException[],
  fromDate: Date = new Date()
): Date {
  let nextDate = getNextDayOfWeek(fromDate, schedule.day_of_week, false);
  const maxIterations = 52; // 최대 1년

  for (let i = 0; i < maxIterations; i++) {
    const dateStr = formatDateToString(nextDate);
    const isHoliday = exceptions.some((e) => e.exception_date === dateStr);

    if (!isHoliday) {
      return nextDate;
    }

    nextDate = addWeeks(nextDate, 1);
  }

  // 모든 날짜가 휴일인 경우 (이론상 불가능)
  return nextDate;
}

// =============================================
// 검증 함수
// =============================================

/**
 * 패턴이 완전한지 확인 (모든 주차의 모든 학년에 활동이 있는지)
 */
export function validatePatterns(
  patterns: RotationPattern[],
  cycleWeeks: number,
  targetGradeIds: string[]
): { isValid: boolean; missingItems: { week: number; gradeId: string }[] } {
  const missingItems: { week: number; gradeId: string }[] = [];

  for (let week = 1; week <= cycleWeeks; week++) {
    for (const gradeId of targetGradeIds) {
      const hasPattern = patterns.some(
        (p) => p.week_number === week && p.grade_id === gradeId
      );

      if (!hasPattern) {
        missingItems.push({ week, gradeId });
      }
    }
  }

  return {
    isValid: missingItems.length === 0,
    missingItems,
  };
}
