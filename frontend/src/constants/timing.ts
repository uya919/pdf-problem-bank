/**
 * Phase 12-4: 시간 관련 상수
 *
 * 자동 저장, 데이터 갱신 간격, 캐시 시간 등
 */

// 자동 저장
export const DEBOUNCE_SAVE_MS = 2000;
export const AUTO_EDIT_DELAY_MS = 100;

// 데이터 갱신 간격 (React Query refetchInterval)
export const REFETCH_DOCUMENTS_MS = 5000;
export const REFETCH_TASK_STATUS_MS = 2000;
export const REFETCH_DASHBOARD_MS = 10000;
export const REFETCH_PROBLEMS_MS = 5000;

// 캐시 유지 시간 (React Query staleTime, gcTime)
export const CACHE_SETTINGS_MS = 5 * 60 * 1000;  // 5분
export const CACHE_DEFAULT_MS = 60 * 1000;       // 1분
export const CACHE_SHORT_MS = 30 * 1000;         // 30초

// 애니메이션
export const ANIMATION_DURATION_MS = 300;
export const TOAST_DURATION_MS = 3000;
export const MODAL_CLOSE_DELAY_MS = 150;

// Phase 61-C: 연결 대기
export const INITIAL_CONNECTION_WAIT_MS = 3000;
