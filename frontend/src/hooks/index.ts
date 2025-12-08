/**
 * Custom Hooks Index (Phase 62-C)
 *
 * PageViewer 분리 훅들 export
 */

// Phase 62-C-1: 키보드 단축키 훅
export { usePageViewerKeyboard } from './usePageViewerKeyboard';
export type {
  UsePageViewerKeyboardParams,
  ParentProblemModeState,
} from './usePageViewerKeyboard';

// Phase 62-C-2: 크로스 페이지 훅
export { usePageViewerCrossPage } from './usePageViewerCrossPage';
export type {
  UsePageViewerCrossPageParams,
  UsePageViewerCrossPageReturn,
  CrossPageSelectionState,
} from './usePageViewerCrossPage';

// Phase 62-C-3: 그룹 CRUD 훅
export { usePageViewerGroups } from './usePageViewerGroups';
export type {
  UsePageViewerGroupsParams,
  UsePageViewerGroupsReturn,
} from './usePageViewerGroups';

// B-6: 오프라인 모드 훅
export { useOnlineStatus } from './useOnlineStatus';
export { useOfflineQueue } from './useOfflineQueue';
