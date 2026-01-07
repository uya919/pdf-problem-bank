/**
 * Admin 훅 배럴 파일
 *
 * 모든 admin 훅을 re-export
 * 기존 useAdminData.ts 호환성 유지
 */

// 타입 export
export * from './types';

// 오늘 수업 훅
export {
  useTodayClasses,
  useClassesByDate,
  useTodayClassesBySubject,
  useCurrentClasses,
} from './useAdminTodayClasses';

// 학년별 데이터 훅
export {
  useGradeStats,
  useGradeClasses,
  useGradeKPI,
} from './useAdminGradeData';

// 반별 기록 훅
export {
  useClassProgressRecords,
  useClassSummary,
} from './useAdminClassRecords';

// 모바일 데이터 훅
export {
  useAllClasses,
  useAllStudents,
} from './useAdminMobileData';

// KPI 훅
export { useAdminKPI } from './useAdminKPI';

// 통합 대시보드 훅
export {
  useTodayAllClasses,
  useClassScheduleDetails,
} from './useAdminDashboard';
