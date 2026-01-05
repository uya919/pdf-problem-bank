/**
 * viewModeStore - 강사/관리자 뷰 모드 상태 관리
 *
 * Stage 29-A: 역할 토글 + UI 통합
 *
 * - localStorage 저장으로 새로고침 시 유지
 * - 강사는 항상 'teacher' 모드
 * - 관리자/원장만 토글 가능
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'teacher' | 'admin';

interface ViewModeState {
  /** 현재 뷰 모드 */
  viewMode: ViewMode;
  /** 뷰 모드 설정 */
  setViewMode: (mode: ViewMode) => void;
  /** 뷰 모드 토글 */
  toggleViewMode: () => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'teacher', // 기본값: 강사 모드
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleViewMode: () =>
        set((state) => ({
          viewMode: state.viewMode === 'admin' ? 'teacher' : 'admin',
        })),
    }),
    {
      name: 'hyeyum-view-mode', // localStorage 키
    }
  )
);

export default useViewModeStore;
