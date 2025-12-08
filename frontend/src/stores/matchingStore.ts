/**
 * 매칭 스토어 (Phase 31-D)
 *
 * 싱글 탭 매칭 시스템의 상태 관리
 * - 문제 목록 관리
 * - 문제-해설 연결 정보
 * - 선택 상태 관리
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 문제 아이템 타입
export interface ProblemItem {
  groupId: string;
  problemNumber: string;
  displayName: string;  // "베이직쎈_공통수학1_p18"
  pageIndex: number;
  documentId: string;
  blockIds: number[];
  createdAt: number;
  // Phase 31-H: 편집 가능 필드
  bookName?: string;
  course?: string;
  page?: number;
}

// 연결 정보 타입
export interface LinkInfo {
  problemId: string;
  solutionId: string;
  solutionPageIndex: number;
  linkedAt: number;
}

interface MatchingStore {
  // === 문서 정보 ===
  problemDocId: string | null;
  solutionDocId: string | null;
  problemDocName: string;
  solutionDocName: string;

  // === 모드 ===
  activeTab: 'problem' | 'solution';

  // === 문제 목록 ===
  problems: ProblemItem[];

  // === 선택 상태 ===
  selectedProblemId: string | null;

  // === 연결 정보 ===
  links: LinkInfo[];

  // === Actions ===
  // 초기화
  initSession: (problemDocId: string, solutionDocId: string, problemName: string, solutionName: string) => void;
  resetSession: () => void;

  // 탭 전환
  setActiveTab: (tab: 'problem' | 'solution') => void;

  // 문제 관리
  addProblem: (problem: ProblemItem) => void;
  removeProblem: (groupId: string) => void;
  updateProblem: (groupId: string, updates: Partial<ProblemItem>) => void;

  // 선택
  selectProblem: (groupId: string | null) => void;
  selectNextUnlinked: () => void;
  selectPrevUnlinked: () => void;

  // 연결
  createLink: (problemId: string, solutionId: string, solutionPageIndex: number) => void;
  removeLink: (problemId: string) => void;

  // 헬퍼
  isLinked: (problemId: string) => boolean;
  getLinkedSolutionId: (problemId: string) => string | null;
  getUnlinkedProblems: () => ProblemItem[];
  getProgress: () => { linked: number; total: number; percent: number };
  getSelectedProblem: () => ProblemItem | null;
}

export const useMatchingStore = create<MatchingStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      problemDocId: null,
      solutionDocId: null,
      problemDocName: '',
      solutionDocName: '',
      activeTab: 'problem',
      problems: [],
      selectedProblemId: null,
      links: [],

      // 세션 초기화
      initSession: (problemDocId, solutionDocId, problemName, solutionName) => {
        const state = get();
        // 같은 문서라면 기존 상태 유지
        if (state.problemDocId === problemDocId && state.solutionDocId === solutionDocId) {
          console.log('[Phase 31] Session already initialized, keeping state');
          return;
        }

        console.log('[Phase 31] Initializing new session');
        set({
          problemDocId,
          solutionDocId,
          problemDocName: problemName,
          solutionDocName: solutionName,
          activeTab: 'problem',
          problems: [],
          selectedProblemId: null,
          links: [],
        });
      },

      resetSession: () => {
        console.log('[Phase 31] Resetting session');
        set({
          problemDocId: null,
          solutionDocId: null,
          problemDocName: '',
          solutionDocName: '',
          activeTab: 'problem',
          problems: [],
          selectedProblemId: null,
          links: [],
        });
      },

      // 탭 전환
      setActiveTab: (tab) => {
        set({ activeTab: tab });
        // 해설 탭으로 전환 시 첫 번째 미연결 문제 선택
        if (tab === 'solution') {
          const unlinked = get().getUnlinkedProblems();
          if (unlinked.length > 0 && !get().selectedProblemId) {
            set({ selectedProblemId: unlinked[0].groupId });
          }
        }
      },

      // 문제 추가
      addProblem: (problem) => {
        console.log('[Phase 31] Adding problem:', problem.problemNumber);
        set((state) => ({
          problems: [...state.problems, problem],
        }));
      },

      // 문제 삭제
      removeProblem: (groupId) => {
        console.log('[Phase 31] Removing problem:', groupId);
        set((state) => ({
          problems: state.problems.filter(p => p.groupId !== groupId),
          links: state.links.filter(l => l.problemId !== groupId),
          selectedProblemId: state.selectedProblemId === groupId ? null : state.selectedProblemId,
        }));
      },

      // 문제 업데이트 (Phase 31-H: displayName 자동 포맷팅)
      updateProblem: (groupId, updates) => {
        set((state) => ({
          problems: state.problems.map(p => {
            if (p.groupId !== groupId) return p;

            const updated = { ...p, ...updates };

            // bookName, course, page 중 하나라도 있으면 displayName 자동 생성
            // Phase 34-A: 새로운 형식 (시리즈_과정_p페이지_문항번호번)
            if (updates.bookName !== undefined || updates.course !== undefined || updates.page !== undefined) {
              const baseDisplayName = formatDisplayName({
                bookName: updated.bookName,
                course: updated.course,
                page: updated.page,
              });
              updated.displayName = baseDisplayName !== '정보 없음'
                ? `${baseDisplayName}_${updated.problemNumber}번`
                : `${updated.problemNumber}번`;
            }

            return updated;
          }),
        }));
        console.log('[Phase 31-H] Updated problem:', groupId, updates);
      },

      // 문제 선택
      selectProblem: (groupId) => {
        console.log('[Phase 31] Selecting problem:', groupId);
        set({ selectedProblemId: groupId });
      },

      // 다음 미연결 문제 선택
      selectNextUnlinked: () => {
        const { problems, links, selectedProblemId } = get();
        const linkedIds = new Set(links.map(l => l.problemId));
        const unlinked = problems.filter(p => !linkedIds.has(p.groupId));

        if (unlinked.length === 0) {
          console.log('[Phase 31] All problems linked!');
          set({ selectedProblemId: null });
          return;
        }

        const currentIndex = unlinked.findIndex(p => p.groupId === selectedProblemId);
        const nextIndex = currentIndex < unlinked.length - 1 ? currentIndex + 1 : 0;
        const nextProblem = unlinked[nextIndex];
        console.log('[Phase 31] Selecting next unlinked:', nextProblem.problemNumber);
        set({ selectedProblemId: nextProblem.groupId });
      },

      // 이전 미연결 문제 선택
      selectPrevUnlinked: () => {
        const { problems, links, selectedProblemId } = get();
        const linkedIds = new Set(links.map(l => l.problemId));
        const unlinked = problems.filter(p => !linkedIds.has(p.groupId));

        if (unlinked.length === 0) {
          set({ selectedProblemId: null });
          return;
        }

        const currentIndex = unlinked.findIndex(p => p.groupId === selectedProblemId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : unlinked.length - 1;
        const prevProblem = unlinked[prevIndex];
        console.log('[Phase 31] Selecting prev unlinked:', prevProblem.problemNumber);
        set({ selectedProblemId: prevProblem.groupId });
      },

      // 연결 생성
      createLink: (problemId, solutionId, solutionPageIndex) => {
        const problem = get().problems.find(p => p.groupId === problemId);
        console.log('[Phase 31] Creating link:', problem?.problemNumber, '→', solutionId);

        set((state) => ({
          links: [
            ...state.links.filter(l => l.problemId !== problemId),
            { problemId, solutionId, solutionPageIndex, linkedAt: Date.now() },
          ],
        }));
      },

      // 연결 해제
      removeLink: (problemId) => {
        console.log('[Phase 31] Removing link for:', problemId);
        set((state) => ({
          links: state.links.filter(l => l.problemId !== problemId),
        }));
      },

      // 연결 여부 확인
      isLinked: (problemId) => {
        return get().links.some(l => l.problemId === problemId);
      },

      // 연결된 해설 ID 조회
      getLinkedSolutionId: (problemId) => {
        const link = get().links.find(l => l.problemId === problemId);
        return link?.solutionId || null;
      },

      // 미연결 문제 목록
      getUnlinkedProblems: () => {
        const { problems, links } = get();
        const linkedIds = new Set(links.map(l => l.problemId));
        return problems.filter(p => !linkedIds.has(p.groupId));
      },

      // 진행률
      getProgress: () => {
        const { problems, links } = get();
        const total = problems.length;
        const linked = links.length;
        const percent = total > 0 ? Math.round((linked / total) * 100) : 0;
        return { linked, total, percent };
      },

      // 선택된 문제 조회
      getSelectedProblem: () => {
        const { problems, selectedProblemId } = get();
        return problems.find(p => p.groupId === selectedProblemId) || null;
      },
    }),
    {
      name: 'matching-store-v1',
      partialize: (state) => ({
        problemDocId: state.problemDocId,
        solutionDocId: state.solutionDocId,
        problemDocName: state.problemDocName,
        solutionDocName: state.solutionDocName,
        problems: state.problems,
        links: state.links,
        activeTab: state.activeTab,
      }),
    }
  )
);

// 헬퍼: 표시명 포맷
export function formatDisplayName(info?: {
  bookName?: string;
  course?: string;
  page?: number;
}): string {
  if (!info) return '정보 없음';
  const parts: string[] = [];
  if (info.bookName) parts.push(info.bookName);
  if (info.course) parts.push(info.course);
  if (info.page) parts.push(`p${info.page}`);
  return parts.length > 0 ? parts.join('_') : '정보 없음';
}
