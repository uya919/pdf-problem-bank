/**
 * 요일별 수업 시간 유틸리티
 * Stage 34: 요일별로 다른 수업 시간 지원
 */

/** 요일명 (전체) */
export const DAY_NAMES_FULL: Record<number, string> = {
  0: '일요일',
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
  6: '토요일',
};

/** 요일명 (축약) */
export const DAY_NAMES_SHORT: Record<number, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

/**
 * 특정 요일의 시작/종료 시간 가져오기
 * @param dayOfWeek 요일 (0=일, 1=월, ...)
 * @param days 수업 요일 배열 [1, 4]
 * @param times 시간 배열 ['18:30', '19:00']
 * @param fallback 찾지 못했을 때 기본값
 */
export function getTimeForDay(
  dayOfWeek: number,
  days: number[] | null,
  times: string[] | null,
  fallback: string | null
): string | null {
  if (!days || !times) return fallback;
  const index = days.indexOf(dayOfWeek);
  if (index === -1 || index >= times.length) return fallback;
  return times[index] || fallback;
}

/**
 * 요일별 스케줄 배열 생성
 * @param days 선택된 요일 배열 [1, 4]
 * @param sameTime 모든 요일 동일 시간 여부
 * @param singleStart 동일 시간일 때 시작 시간
 * @param singleEnd 동일 시간일 때 종료 시간
 * @param dayTimes 개별 시간일 때 요일별 시간 객체
 */
export function createScheduleArrays(
  days: number[],
  sameTime: boolean,
  singleStart: string,
  singleEnd: string,
  dayTimes: Record<number, { start: string; end: string }>
): { startTimes: string[]; endTimes: string[] } {
  if (days.length === 0) {
    return { startTimes: [], endTimes: [] };
  }

  if (sameTime) {
    // 모든 요일 동일 시간
    return {
      startTimes: days.map(() => singleStart),
      endTimes: days.map(() => singleEnd),
    };
  }

  // 요일별 개별 시간 (days 순서대로)
  return {
    startTimes: days.map(d => dayTimes[d]?.start || singleStart),
    endTimes: days.map(d => dayTimes[d]?.end || singleEnd),
  };
}

/**
 * 배열에서 모든 값이 동일한지 확인
 */
export function allSame(arr: (string | null)[] | null): boolean {
  if (!arr || arr.length === 0) return true;
  const first = arr[0];
  return arr.every(v => v === first);
}

/**
 * 시간 문자열 포맷 (HH:MM:SS → HH:MM)
 */
export function formatTime(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}
