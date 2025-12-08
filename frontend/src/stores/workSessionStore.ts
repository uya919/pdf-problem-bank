/**
 * 작업 세션 스토어 (Phase 32 → Phase 33)
 *
 * Phase 33: 통합 워크플로우
 * - 세션 생성 시 문제+해설 문서 동시 지정
 * - 탭 전환으로 라벨링+매칭 통합
 * - 그룹 생성 시 자동 문제은행 등록
 *
 * 백엔드와 동기화되어 데이터 영속성 보장
 */
import { create } from 'zustand';
import { useMemo } from 'react';
import { api } from '../api/client';
import type { WorkSession, ProblemReference, ProblemSolutionLink } from '../api/client';
// Re-export for backward compatibility
export type { WorkSession, ProblemReference, ProblemSolutionLink };
// Phase 44-D: 로그 레벨 시스템
import { logger } from '../utils/logger';
// Phase 56-K: 올바른 책이름 추출 함수 사용
import { extractBookNameAndCourse } from '../utils/documentUtils';

// Phase 33-G: 참조 안정성을 위한 상수 (빈 배열/객체)
const EMPTY_PROBLEMS: ProblemReference[] = [];
const EMPTY_PROGRESS = { linked: 0, total: 0, percent: 0 } as const;
const EMPTY_LINKS: ProblemSolutionLink[] = [];

// Phase 48: 페이지 저장 디바운스 (1초)
let savePageTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSavePage = (
  sessionId: string,
  page: number,
  tab: 'problem' | 'solution'
) => {
  if (savePageTimeout) {
    clearTimeout(savePageTimeout);
  }
  savePageTimeout = setTimeout(async () => {
    try {
      const updateData = tab === 'problem'
        ? { lastProblemPage: page }
        : { lastSolutionPage: page };
      await api.updateWorkSession(sessionId, updateData);
      console.log(`[Phase 48] Page saved: ${tab} = ${page}`);
    } catch (error) {
      console.error('[Phase 48] Failed to save page:', error);
    }
  }, 1000);
};

// Phase 33: 탭 타입
type ActiveTab = 'problem' | 'solution';

// Phase 38: 매칭 모드 타입
type MatchingMode = 'auto' | 'manual';

interface WorkSessionStore {
  // === 현재 세션 ===
  currentSession: WorkSession | null;
  isLoading: boolean;
  error: string | null;

  // === 세션 목록 ===
  sessions: WorkSession[];
  sessionsLoading: boolean;

  // === Phase 33: 통합 캔버스 탭 상태 ===
  activeTab: ActiveTab;
  problemPage: number;
  solutionPage: number;
  selectedProblemId: string | null; // 해설 연결을 위해 선택된 문제

  // === Phase 38: 매칭 모드 ===
  matchingMode: MatchingMode;
  setMatchingMode: (mode: MatchingMode) => void;

  // === Actions ===

  // 세션 목록 로드
  fetchSessions: (options?: { status?: string }) => Promise<void>;

  // 새 세션 생성 (Phase 33: 양쪽 문서 필수)
  createSession: (data: {
    problemDocumentId: string;
    problemDocumentName?: string;
    solutionDocumentId: string;
    solutionDocumentName?: string;
    name?: string;
  }) => Promise<WorkSession>;

  // 세션 로드
  loadSession: (sessionId: string) => Promise<void>;

  // 세션 업데이트
  updateSession: (data: {
    name?: string;
    solutionDocumentId?: string;
    solutionDocumentName?: string;
    step?: 'labeling' | 'setup' | 'matching' | 'completed';
    status?: 'active' | 'completed' | 'cancelled';
  }) => Promise<void>;

  // 세션 삭제
  deleteSession: (sessionId: string) => Promise<void>;

  // 세션 언로드 (현재 세션 해제)
  unloadSession: () => void;

  // === 문제 관리 ===

  // 문제 추가
  // Phase 56-I: 메타데이터 필드 추가
  addProblem: (data: {
    groupId: string;
    pageIndex: number;
    problemNumber: string;
    displayName?: string;
    bookName?: string;
    course?: string;
    page?: number;
    isParent?: boolean;
  }) => Promise<void>;

  // 문제 삭제
  removeProblem: (groupId: string) => Promise<void>;

  // groups.json에서 문제 동기화
  syncProblems: () => Promise<void>;

  // Phase 37-D: 완전 양방향 동기화
  fullSync: () => Promise<{
    success: boolean;
    problems_added: number;
    problems_removed: number;
    problems_updated: number;
    links_synced: number;
  }>;

  // Phase 37-D: 동기화 상태 확인
  getSyncStatus: () => Promise<{
    status: 'synced' | 'pending' | 'conflict' | 'error';
    groupsCount: number;
    sessionCount: number;
    linksCount: number;
    error?: string;
  }>;

  // Phase 46-A: displayName 새로고침 (레거시 데이터 업그레이드)
  refreshDisplayNames: () => Promise<{
    success: boolean;
    updated: number;
  }>;

  // Phase 56-O: isParent 필드 동기화 (기존 데이터 호환)
  syncParentFlags: () => Promise<{
    success: boolean;
    updated: number;
  }>;

  // === 연결 관리 ===

  // 연결 생성
  createLink: (data: {
    problemGroupId: string;
    solutionGroupId: string;
    solutionDocumentId: string;
    solutionPageIndex: number;
  }) => Promise<void>;

  // 연결 삭제
  removeLink: (problemGroupId: string) => Promise<void>;

  // Phase 56-R: 해설 그룹 ID로 연결 삭제 (해설 삭제 시 자동 연결 해제)
  removeLinkBySolutionGroupId: (solutionGroupId: string) => Promise<
    Array<{ groupId: string; problemNumber: string }>
  >;

  // === 헬퍼 ===

  // 특정 문제의 연결 정보 조회
  getLinkForProblem: (problemGroupId: string) => ProblemSolutionLink | null;

  // 연결되지 않은 문제 목록
  getUnlinkedProblems: () => ProblemReference[];

  // 진행률 계산
  getProgress: () => { linked: number; total: number; percent: number };

  // 문서로 세션 찾기
  findSessionByDocument: (documentId: string) => Promise<WorkSession | null>;

  // === Phase 33: 탭 네비게이션 ===

  // 탭 전환
  setActiveTab: (tab: ActiveTab) => void;

  // 페이지 이동
  setProblemPage: (page: number) => void;
  setSolutionPage: (page: number) => void;

  // 현재 탭의 페이지 이동
  setCurrentPage: (page: number) => void;
  getCurrentPage: () => number;

  // 문제 선택 (해설 연결용)
  selectProblem: (problemId: string | null) => void;

  // 다음 미연결 문제로 이동
  selectNextUnlinkedProblem: () => void;

  // 탭 상태 리셋
  resetTabState: () => void;
}

export const useWorkSessionStore = create<WorkSessionStore>((set, get) => ({
  // 초기 상태
  currentSession: null,
  isLoading: false,
  error: null,
  sessions: [],
  sessionsLoading: false,

  // Phase 33: 탭 상태 초기값
  activeTab: 'problem',
  problemPage: 0,
  solutionPage: 0,
  selectedProblemId: null,

  // Phase 38: 매칭 모드 초기값
  matchingMode: 'auto',

  // 세션 목록 로드
  fetchSessions: async (options) => {
    set({ sessionsLoading: true });
    try {
      const response = await api.getWorkSessions(options);
      set({ sessions: response.items, sessionsLoading: false });
    } catch (error) {
      console.error('[Phase 32] Failed to fetch sessions:', error);
      set({ sessionsLoading: false });
    }
  },

  // 새 세션 생성
  createSession: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.createWorkSession(data);
      set((state) => ({
        currentSession: session,
        sessions: [session, ...state.sessions],
        isLoading: false,
      }));
      console.log('[Phase 32] Session created:', session.sessionId);
      return session;
    } catch (error) {
      const message = error instanceof Error ? error.message : '세션 생성 실패';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // 세션 로드
  // Phase 34-E: 세션 로드 후 자동으로 groups.json에서 문제 동기화
  // Phase 48: 마지막 작업 페이지 복원
  loadSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getWorkSession(sessionId);
      // Phase 48: 세션에 저장된 마지막 페이지로 복원
      set({
        currentSession: response.session,
        isLoading: false,
        problemPage: response.session.lastProblemPage || 0,
        solutionPage: response.session.lastSolutionPage || 0,
      });
      console.log('[Phase 48] Session loaded with pages:', sessionId,
        'problem:', response.session.lastProblemPage || 0,
        'solution:', response.session.lastSolutionPage || 0);

      // Phase 34-E: 세션 로드 후 자동 동기화
      // problemDocumentId가 있으면 groups.json에서 문제 목록 동기화
      if (response.session?.problemDocumentId) {
        try {
          await get().syncProblems();
          console.log('[Phase 34-E] Problems synced on session load');
        } catch (syncError) {
          // 동기화 실패는 무시 (groups.json이 없을 수 있음 - 첫 작업 시)
          console.warn('[Phase 34-E] Sync skipped (may be normal if no groups yet):', syncError);
        }

        // Phase 56-P: isParent 필드 자동 동기화 (기존 데이터 호환)
        try {
          const result = await api.syncParentFlags(sessionId);
          if (result.session) {
            set({ currentSession: result.session });
          }
          if (result.updated > 0) {
            console.log(`[Phase 56-P] isParent synced: ${result.updated} updated`);
          }
        } catch (parentFlagError) {
          // isParent 동기화 실패는 무시 (치명적이지 않음)
          console.warn('[Phase 56-P] isParent sync skipped:', parentFlagError);
        }

        // Phase 59-B: orphan 문제 자동 정리 (groups.json에 없는 문제 삭제)
        try {
          const validateResult = await api.validateSync(sessionId);
          if (validateResult.issues_fixed > 0) {
            console.log(`[Phase 59-B] validateSync: ${validateResult.issues_fixed} orphan problems removed`);
            // 세션 다시 로드하여 최신 상태 반영
            const refreshedSession = await api.getWorkSession(sessionId);
            set({ currentSession: refreshedSession.session });
          }
        } catch (validateError) {
          // 검증 실패는 무시 (치명적이지 않음)
          console.warn('[Phase 59-B] validateSync skipped:', validateError);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '세션 로드 실패';
      set({ error: message, isLoading: false, currentSession: null });
      throw error;
    }
  },

  // 세션 업데이트
  updateSession: async (data) => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    set({ isLoading: true, error: null });
    try {
      const updated = await api.updateWorkSession(currentSession.sessionId, data);
      set((state) => ({
        currentSession: updated,
        sessions: state.sessions.map((s) =>
          s.sessionId === updated.sessionId ? updated : s
        ),
        isLoading: false,
      }));
      console.log('[Phase 32] Session updated:', currentSession.sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '세션 업데이트 실패';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // 세션 삭제
  deleteSession: async (sessionId) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteWorkSession(sessionId);
      set((state) => ({
        currentSession:
          state.currentSession?.sessionId === sessionId ? null : state.currentSession,
        sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
        isLoading: false,
      }));
      console.log('[Phase 32] Session deleted:', sessionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '세션 삭제 실패';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // 세션 언로드
  unloadSession: () => {
    set({ currentSession: null, error: null });
    console.log('[Phase 32] Session unloaded');
  },

  // 문제 추가
  addProblem: async (data) => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    // Phase 56-I: 메타데이터 기반 displayName 생성
    const problemData = { ...data };
    if (!problemData.displayName) {
      // Phase 56-I: 전달된 메타데이터 우선 사용
      if (problemData.bookName && problemData.page) {
        problemData.displayName = `${problemData.bookName}_p${problemData.page}_${problemData.problemNumber}번`;
        logger.debug('WorkSession', `[Phase 56-I] Generated displayName from metadata: ${problemData.displayName}`);
      } else {
        // Fallback: displayName이 전달되지 않은 경우 (레거시 호환)
        // Phase 56-K: problemDocumentId에서 올바르게 책이름 추출 (시리즈명)
        const docId = currentSession.problemDocumentId || '';
        const { bookName } = extractBookNameAndCourse(docId);
        const page = (problemData.pageIndex ?? 0) + 1;
        problemData.displayName = `${bookName}_p${page}_${problemData.problemNumber}번`;
        logger.debug('WorkSession', `[Phase 56-K Fallback] Auto-generated displayName: ${problemData.displayName}`);
      }
    } else {
      logger.debug('WorkSession', `[Phase 51] Using provided displayName: ${problemData.displayName}`);
    }

    try {
      const updated = await api.addProblemToSession(currentSession.sessionId, problemData);
      set({ currentSession: updated });
      console.log('[Phase 32] Problem added:', problemData.problemNumber);
    } catch (error: unknown) {
      // Phase 42 디버깅: 상세 에러 정보 출력
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; config?: { url?: string } };
        console.error('[Phase 32] Failed to add problem:', {
          status: axiosError.response?.status,
          detail: axiosError.response?.data?.detail,
          url: axiosError.config?.url,
          groupId: problemData.groupId,
          sessionId: currentSession.sessionId,
        });
      } else {
        console.error('[Phase 32] Failed to add problem:', error);
      }
      throw error;
    }
  },

  // 문제 삭제
  removeProblem: async (groupId) => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      const updated = await api.removeProblemFromSession(currentSession.sessionId, groupId);
      set({ currentSession: updated });
      console.log('[Phase 32] Problem removed:', groupId);
    } catch (error) {
      console.error('[Phase 32] Failed to remove problem:', error);
      throw error;
    }
  },

  // groups.json에서 문제 동기화
  syncProblems: async () => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    set({ isLoading: true });
    try {
      const updated = await api.syncProblemsFromGroups(currentSession.sessionId);
      set({ currentSession: updated, isLoading: false });
      console.log('[Phase 32] Problems synced:', updated.problems.length);
    } catch (error) {
      console.error('[Phase 32] Failed to sync problems:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Phase 37-D: 완전 양방향 동기화
  fullSync: async () => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    set({ isLoading: true });
    try {
      const result = await api.fullSync(currentSession.sessionId);
      // Phase 37-D Fix: 세션 반환 시에만 업데이트, 없으면 기존 유지
      if (result.session) {
        set({ currentSession: result.session, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      console.log('[Phase 37-D] Full sync completed:', {
        added: result.problems_added,
        removed: result.problems_removed,
        updated: result.problems_updated,
        links: result.links_synced
      });
      return {
        success: result.success,
        problems_added: result.problems_added,
        problems_removed: result.problems_removed,
        problems_updated: result.problems_updated,
        links_synced: result.links_synced
      };
    } catch (error) {
      console.error('[Phase 37-D] Failed to full sync:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Phase 37-D: 동기화 상태 확인
  // Phase 44-B-FIX-2: 순수 함수로 변경 (자동 동기화는 SyncIndicator에서 처리)
  getSyncStatus: async () => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      const status = await api.getSyncStatus(currentSession.sessionId);
      logger.debug('SyncStore', `Status: ${status.status}`);
      return status;
    } catch (error) {
      logger.error('SyncStore', 'Failed to get sync status', error);
      throw error;
    }
  },

  // Phase 46-A: displayName 새로고침
  refreshDisplayNames: async () => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      const result = await api.refreshDisplayNames(currentSession.sessionId);
      if (result.session) {
        set({ currentSession: result.session });
      }
      logger.info('WorkSession', `displayName 새로고침 완료: ${result.updated}개 업데이트`);
      return {
        success: result.success,
        updated: result.updated,
      };
    } catch (error) {
      logger.error('WorkSession', 'Failed to refresh displayNames', error);
      throw error;
    }
  },

  // Phase 56-O: isParent 필드 동기화
  syncParentFlags: async () => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      const result = await api.syncParentFlags(currentSession.sessionId);
      if (result.session) {
        set({ currentSession: result.session });
      }
      logger.info('WorkSession', `isParent 동기화 완료: ${result.updated}개 업데이트`);
      return {
        success: result.success,
        updated: result.updated,
      };
    } catch (error) {
      logger.error('WorkSession', 'Failed to sync parent flags', error);
      throw error;
    }
  },

  // 연결 생성
  createLink: async (data) => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      const updated = await api.createSessionLink(currentSession.sessionId, data);
      set({ currentSession: updated });
      console.log('[Phase 32] Link created:', data.problemGroupId, '→', data.solutionGroupId);
    } catch (error) {
      console.error('[Phase 32] Failed to create link:', error);
      throw error;
    }
  },

  // 연결 삭제
  removeLink: async (problemGroupId) => {
    const { currentSession } = get();
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      const updated = await api.removeSessionLink(currentSession.sessionId, problemGroupId);
      set({ currentSession: updated });
      console.log('[Phase 32] Link removed:', problemGroupId);
    } catch (error) {
      console.error('[Phase 32] Failed to remove link:', error);
      throw error;
    }
  },

  // Phase 56-R: 해설 그룹 ID로 연결 찾아서 삭제 (해설 삭제 시 자동 연결 해제)
  removeLinkBySolutionGroupId: async (solutionGroupId) => {
    const { currentSession } = get();
    if (!currentSession) {
      return [];
    }

    // 해설 그룹 ID로 연결 찾기 (1:N 가능성 고려)
    const linksToRemove = currentSession.links.filter(
      (l) => l.solutionGroupId === solutionGroupId
    );

    if (linksToRemove.length === 0) {
      console.log('[Phase 56-R] No links found for solution:', solutionGroupId);
      return [];
    }

    // 각 연결 삭제
    const unlinkedProblems: Array<{ groupId: string; problemNumber: string }> = [];
    for (const link of linksToRemove) {
      try {
        await api.removeSessionLink(currentSession.sessionId, link.problemGroupId);
        const problem = currentSession.problems.find((p) => p.groupId === link.problemGroupId);
        if (problem) {
          unlinkedProblems.push({
            groupId: link.problemGroupId,
            problemNumber: problem.problemNumber,
          });
        }
      } catch (error) {
        console.error('[Phase 56-R] Failed to remove link:', link.problemGroupId, error);
      }
    }

    // 세션 갱신
    // Phase 62-A: getWorkSession은 WorkSessionDetailResponse 반환, .session 추출
    const updated = await api.getWorkSession(currentSession.sessionId);
    set({ currentSession: updated.session });

    console.log('[Phase 56-R] Unlinked problems:', unlinkedProblems);
    return unlinkedProblems;
  },

  // 특정 문제의 연결 정보 조회
  getLinkForProblem: (problemGroupId) => {
    const { currentSession } = get();
    if (!currentSession) return null;
    return currentSession.links.find((l) => l.problemGroupId === problemGroupId) || null;
  },

  // 연결되지 않은 문제 목록
  // Phase 56-M: 모문제(isParent)는 해설 연결 불필요하므로 제외
  // Phase 56-N: displayName 패턴 필터링 (기존 데이터 호환)
  getUnlinkedProblems: () => {
    const { currentSession } = get();
    if (!currentSession) return [];
    const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));
    return currentSession.problems.filter((p) =>
      !linkedIds.has(p.groupId) &&
      !p.isParent &&
      // Phase 56-N: displayName 패턴으로 모문제 추가 필터링 (기존 데이터 호환)
      !p.displayName?.includes('(모문제)') &&
      !p.problemNumber?.includes('모문제')
    );
  },

  // 진행률 계산
  getProgress: () => {
    const { currentSession } = get();
    if (!currentSession) return { linked: 0, total: 0, percent: 0 };
    const total = currentSession.problems.length;
    const linked = currentSession.links.length;
    const percent = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { linked, total, percent };
  },

  // 문서로 세션 찾기
  findSessionByDocument: async (documentId) => {
    try {
      const response = await api.findSessionsByDocument(documentId);
      // 가장 최근의 활성 세션 반환
      const activeSession = response.items.find((s) => s.status === 'active');
      return activeSession || null;
    } catch (error) {
      console.error('[Phase 32] Failed to find session:', error);
      return null;
    }
  },

  // === Phase 33: 탭 네비게이션 구현 ===

  // 탭 전환
  setActiveTab: (tab) => {
    set({ activeTab: tab });
    console.log('[Phase 33] Active tab:', tab);
  },

  // 페이지 이동
  setProblemPage: (page) => {
    set({ problemPage: page });
  },

  setSolutionPage: (page) => {
    set({ solutionPage: page });
  },

  // 현재 탭의 페이지 이동
  // Phase 48: 페이지 변경 시 백엔드에 저장 (디바운스)
  setCurrentPage: (page) => {
    const { activeTab, currentSession } = get();
    if (activeTab === 'problem') {
      set({ problemPage: page });
    } else {
      set({ solutionPage: page });
    }

    // Phase 48: 세션이 있으면 백엔드에 저장
    if (currentSession) {
      debouncedSavePage(currentSession.sessionId, page, activeTab);
    }
  },

  // 현재 탭의 페이지 번호 반환
  getCurrentPage: () => {
    const { activeTab, problemPage, solutionPage } = get();
    return activeTab === 'problem' ? problemPage : solutionPage;
  },

  // 문제 선택 (해설 연결용)
  selectProblem: (problemId) => {
    set({ selectedProblemId: problemId });
    if (problemId) {
      console.log('[Phase 33] Problem selected for linking:', problemId);
    }
  },

  // 다음 미연결 문제로 이동
  // Phase 56-Q: 다음 미연결 문제로 이동 (버그 수정)
  // 기존 버그: 연결 후 unlinked 배열에서 현재 문제를 찾지 못해 항상 첫 번째로 이동
  // 수정: 전체 problems 배열에서 현재 위치 기준으로 다음 미연결 문제 찾기
  selectNextUnlinkedProblem: () => {
    const { currentSession, selectedProblemId } = get();
    if (!currentSession) return;

    const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));

    // Phase 56-Q: 유효한 문제 판별 함수 (Phase 56-M/N 필터링 포함)
    const isValidProblem = (p: ProblemReference) =>
      !linkedIds.has(p.groupId) &&
      !p.isParent &&
      !p.displayName?.includes('(모문제)') &&
      !p.problemNumber?.includes('모문제');

    const allProblems = currentSession.problems;

    // 전체 배열에서 현재 위치 찾기 (연결된 문제도 찾을 수 있음)
    const currentIndex = allProblems.findIndex((p) => p.groupId === selectedProblemId);

    if (currentIndex === -1) {
      // 현재 문제를 못 찾으면 첫 번째 미연결로
      const first = allProblems.find(isValidProblem);
      set({ selectedProblemId: first?.groupId || null });
      return;
    }

    // 현재 위치 이후에서 첫 번째 미연결 문제 찾기
    for (let i = currentIndex + 1; i < allProblems.length; i++) {
      if (isValidProblem(allProblems[i])) {
        set({ selectedProblemId: allProblems[i].groupId });
        console.log('[Phase 56-Q] Next problem:', allProblems[i].problemNumber);
        return;
      }
    }

    // 끝까지 못 찾으면 처음부터 검색 (순환)
    for (let i = 0; i < currentIndex; i++) {
      if (isValidProblem(allProblems[i])) {
        set({ selectedProblemId: allProblems[i].groupId });
        console.log('[Phase 56-Q] Next problem (wrapped):', allProblems[i].problemNumber);
        return;
      }
    }

    // 모든 문제가 연결됨
    set({ selectedProblemId: null });
    console.log('[Phase 56-Q] All problems linked!');
  },

  // 탭 상태 리셋
  resetTabState: () => {
    set({
      activeTab: 'problem',
      problemPage: 0,
      solutionPage: 0,
      selectedProblemId: null,
      matchingMode: 'auto',
    });
    console.log('[Phase 33] Tab state reset');
  },

  // Phase 38: 매칭 모드 설정
  setMatchingMode: (mode) => {
    set({ matchingMode: mode });
    console.log('[Phase 38] Matching mode:', mode);
  },
}));

// React Query 훅으로 export (선택적 사용)
export function useCurrentSession() {
  const session = useWorkSessionStore((state) => state.currentSession);
  const isLoading = useWorkSessionStore((state) => state.isLoading);
  const error = useWorkSessionStore((state) => state.error);
  return { session, isLoading, error };
}

// Phase 33-G: 원시 상태 구독 + useMemo로 무한 루프 방지
export function useSessionProgress() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    const total = problems?.length ?? 0;
    const linked = links?.length ?? 0;
    if (total === 0 && linked === 0) return EMPTY_PROGRESS;
    const percent = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { linked, total, percent };
  }, [problems, links]);
}

// Phase 33-G: 원시 상태 구독 + useMemo로 무한 루프 방지
// Phase 56-N: displayName 패턴 필터링 추가
export function useUnlinkedProblems() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    if (!problems || problems.length === 0) return EMPTY_PROBLEMS;
    const linkedIds = new Set((links ?? []).map((l) => l.problemGroupId));
    // Phase 56-M: 모문제(isParent) 제외
    // Phase 56-N: displayName 패턴으로 모문제 추가 필터링 (기존 데이터 호환)
    return problems.filter((p) =>
      !linkedIds.has(p.groupId) &&
      !p.isParent &&
      !p.displayName?.includes('(모문제)') &&
      !p.problemNumber?.includes('모문제')
    );
  }, [problems, links]);
}

// Phase 33-G: 탭 상태 훅 (useMemo로 반환 객체 안정화)
export function useTabState() {
  const activeTab = useWorkSessionStore((state) => state.activeTab);
  const problemPage = useWorkSessionStore((state) => state.problemPage);
  const solutionPage = useWorkSessionStore((state) => state.solutionPage);
  const selectedProblemId = useWorkSessionStore((state) => state.selectedProblemId);
  const setActiveTab = useWorkSessionStore((state) => state.setActiveTab);
  const setCurrentPage = useWorkSessionStore((state) => state.setCurrentPage);
  const selectProblem = useWorkSessionStore((state) => state.selectProblem);

  return useMemo(() => ({
    activeTab,
    problemPage,
    solutionPage,
    selectedProblemId,
    currentPage: activeTab === 'problem' ? problemPage : solutionPage,
    setActiveTab,
    setCurrentPage,
    selectProblem,
  }), [
    activeTab,
    problemPage,
    solutionPage,
    selectedProblemId,
    setActiveTab,
    setCurrentPage,
    selectProblem,
  ]);
}

// Phase 33: 선택된 문제 정보 훅
export function useSelectedProblem() {
  const currentSession = useWorkSessionStore((state) => state.currentSession);
  const selectedProblemId = useWorkSessionStore((state) => state.selectedProblemId);

  if (!currentSession || !selectedProblemId) return null;
  return currentSession.problems.find((p) => p.groupId === selectedProblemId) || null;
}

// Phase 38: 연결된 문제 목록 훅 (문제-해설 쌍)
export interface LinkedProblemPair {
  problem: ProblemReference;
  link: ProblemSolutionLink;
}

export function useLinkedProblems(): LinkedProblemPair[] {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    if (!problems || !links || links.length === 0) return [];

    const linkMap = new Map(links.map((l) => [l.problemGroupId, l]));

    return problems
      .filter((p) => linkMap.has(p.groupId))
      .map((p) => ({
        problem: p,
        link: linkMap.get(p.groupId)!,
      }));
  }, [problems, links]);
}

// Phase 38: 매칭 모드 훅
export function useMatchingMode() {
  const matchingMode = useWorkSessionStore((state) => state.matchingMode);
  const setMatchingMode = useWorkSessionStore((state) => state.setMatchingMode);
  return { matchingMode, setMatchingMode };
}
