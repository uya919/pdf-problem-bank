/**
 * Backoffice 훅 배럴 파일
 *
 * 기존 import 경로 호환:
 * import { useClasses } from '@/hooks/useBackofficeData';
 * import { useClasses } from '@/hooks/backoffice';  // 신규 권장
 */

// 타입
export * from './types';

// 분리된 훅들
export * from './useStudents';
export * from './useClasses';
export * from './useAttendance';
export * from './useProgress';
export * from './useHomework';
export * from './useExamScores';
export * from './useDashboard';
export * from './useWeekData';
export * from './useMisc';
