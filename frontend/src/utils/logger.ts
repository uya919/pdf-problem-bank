/**
 * Phase 44-D: 로그 레벨 시스템
 *
 * 개발/프로덕션 환경에 따라 로그 출력 제어
 * - 개발: DEBUG 이상 모든 로그 출력
 * - 프로덕션: INFO 이상만 출력
 *
 * 사용법:
 * import { logger } from '@/utils/logger';
 * logger.debug('PageViewer', 'Saving groups', { count: 3 });
 * logger.info('Sync', 'Full sync completed');
 * logger.warn('Session', 'Session not found');
 * logger.error('API', 'Request failed', error);
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 환경에 따른 기본 로그 레벨
// Vite 환경변수: import.meta.env.DEV
const getCurrentLevel = (): LogLevel => {
  // 개발 모드에서는 DEBUG, 프로덕션에서는 INFO
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return 'DEBUG';
  }
  return 'INFO';
};

const LOG_LEVEL = getCurrentLevel();

const shouldLog = (level: LogLevel): boolean => {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[LOG_LEVEL];
};

const formatTag = (tag: string): string => {
  return `[${tag}]`;
};

const formatTime = (): string => {
  const now = new Date();
  return now.toISOString().substr(11, 12); // HH:MM:SS.mmm
};

export const logger = {
  /**
   * DEBUG 레벨 로그 (개발 모드에서만 출력)
   * - 상세한 디버깅 정보
   * - 함수 진입/종료, 상태 변경 등
   */
  debug: (tag: string, message: string, ...args: unknown[]): void => {
    if (shouldLog('DEBUG')) {
      console.log(`${formatTime()} ${formatTag(tag)} ${message}`, ...args);
    }
  },

  /**
   * INFO 레벨 로그 (항상 출력)
   * - 중요한 상태 변경
   * - 사용자 액션 결과
   */
  info: (tag: string, message: string, ...args: unknown[]): void => {
    if (shouldLog('INFO')) {
      console.info(`${formatTime()} ${formatTag(tag)} ${message}`, ...args);
    }
  },

  /**
   * WARN 레벨 로그 (항상 출력)
   * - 예상치 못한 상황이지만 진행 가능
   * - 권장하지 않는 사용 패턴
   */
  warn: (tag: string, message: string, ...args: unknown[]): void => {
    if (shouldLog('WARN')) {
      console.warn(`${formatTime()} ${formatTag(tag)} ${message}`, ...args);
    }
  },

  /**
   * ERROR 레벨 로그 (항상 출력)
   * - 오류 발생
   * - 기능 실패
   */
  error: (tag: string, message: string, ...args: unknown[]): void => {
    if (shouldLog('ERROR')) {
      console.error(`${formatTime()} ${formatTag(tag)} ${message}`, ...args);
    }
  },

  /**
   * 그룹 로그 시작 (개발 모드에서만)
   */
  group: (tag: string, label: string): void => {
    if (shouldLog('DEBUG')) {
      console.group(`${formatTag(tag)} ${label}`);
    }
  },

  /**
   * 그룹 로그 종료
   */
  groupEnd: (): void => {
    if (shouldLog('DEBUG')) {
      console.groupEnd();
    }
  },

  /**
   * 현재 로그 레벨 반환
   */
  getLevel: (): LogLevel => LOG_LEVEL,

  /**
   * 개발 모드 여부
   */
  isDev: (): boolean => LOG_LEVEL === 'DEBUG',
};

export default logger;
