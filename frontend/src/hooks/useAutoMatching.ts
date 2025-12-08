/**
 * 자동 매칭 훅
 *
 * Phase 22-C: 문제-해설 자동 매칭 시스템
 * Phase 25: 매칭 영구 저장 기능 추가
 *
 * - 문제 창에서 라벨링 → 대기 상태 생성 (서버 저장)
 * - 해설 창에서 라벨링 → 가장 오래된 대기 문제와 자동 매칭 (서버 저장)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSyncChannel } from './useSyncChannel';
import { api } from '@/api/client';
import type {
  WindowRole,
  PendingProblem,
  ProblemSolutionMatch,
  SyncMessage,
  ProblemLabeledPayload,
  MatchCreatedPayload,
  MatchCancelledPayload,
  SyncStatePayload,
  GroupLink
} from '@/types/matching';
import type { ProblemGroup } from '@/api/client';

interface UseAutoMatchingOptions {
  /** 현재 문서 ID */
  documentId: string;
  /** 현재 페이지 */
  currentPage: number;
  /** 토스트 표시 함수 */
  showToast?: (message: string, type?: 'success' | 'warning' | 'error') => void;
  /** Phase 22-J-2: 자동 명명 콜백 (해설 그룹 이름 자동 설정) */
  onAutoName?: (groupId: string, solutionName: string) => void;
  /** Phase 22-K: 그룹 링크 설정 콜백 */
  onLinkGroup?: (groupId: string, link: GroupLink) => void;
}

interface UseAutoMatchingReturn {
  /** 대기 중인 문제 목록 */
  pendingProblems: PendingProblem[];
  /** 매칭된 쌍 목록 */
  matchedPairs: ProblemSolutionMatch[];
  /** 다음 대기 중인 문제 번호 */
  nextPendingNumber: string | null;
  /** 대기 중인 문제 수 */
  pendingCount: number;
  /** 매칭 완료 수 */
  matchedCount: number;
  /** 문제 라벨링 시 호출 (문제 창에서) */
  onProblemLabeled: (group: ProblemGroup) => void;
  /** 해설 라벨링 시 호출 (해설 창에서) */
  onSolutionLabeled: (group: ProblemGroup) => void;
  /** 매칭 취소 */
  cancelMatch: (matchId: string) => void;
  /** 연결된 창 수 */
  connectedWindows: number;
}

export function useAutoMatching(
  sessionId: string | null,
  role: WindowRole,
  options: UseAutoMatchingOptions
): UseAutoMatchingReturn {
  const { documentId, currentPage, showToast, onAutoName, onLinkGroup } = options;

  // 상태
  const [pendingProblems, setPendingProblems] = useState<PendingProblem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<ProblemSolutionMatch[]>([]);

  // 최신 상태 참조 (콜백 내에서 사용)
  const pendingRef = useRef(pendingProblems);
  pendingRef.current = pendingProblems;

  // 메시지 핸들러
  const handleMessage = useCallback((message: SyncMessage) => {
    console.log(`[Phase 22-C] Received message:`, message.type);

    switch (message.type) {
      case 'PROBLEM_LABELED': {
        // 해설 창에서: 대기 목록에 추가
        if (role === 'solution') {
          const payload = message.payload as ProblemLabeledPayload;
          setPendingProblems(prev => [...prev, payload]);
          showToast?.(`${payload.problemNumber}번 문제가 대기 목록에 추가됨`, 'success');
        }
        break;
      }

      case 'MATCH_CREATED': {
        // 문제 창에서: 매칭 결과 반영
        const payload = message.payload as MatchCreatedPayload;
        if (role === 'problem') {
          // 대기 목록에서 제거
          setPendingProblems(prev =>
            prev.filter(p => p.groupId !== payload.problem.groupId)
          );
          // 매칭 목록에 추가
          setMatchedPairs(prev => [...prev, payload]);

          // Phase 22-K: 문제 그룹에 해설 링크 설정
          const solutionName = `${payload.problem.problemNumber} [해설]`;
          onLinkGroup?.(payload.problem.groupId, {
            linkedGroupId: payload.solution.groupId,
            linkedDocumentId: payload.solution.documentId,
            linkedPageIndex: payload.solution.pageIndex,
            linkedName: solutionName,
            linkType: 'problem',  // 이 그룹은 문제이고, 해설과 연결됨
            linkedAt: payload.matchedAt
          });

          showToast?.(`${payload.problem.problemNumber}번 문제-해설 매칭 완료!`, 'success');
        }
        break;
      }

      case 'MATCH_CANCELLED': {
        const payload = message.payload as MatchCancelledPayload;
        // 매칭 목록에서 제거
        setMatchedPairs(prev => prev.filter(m => m.matchId !== payload.matchId));
        // 문제를 다시 대기 목록에 추가 (문제 창에서)
        if (role === 'problem') {
          // 원래 문제 정보를 찾아서 대기 목록에 추가
          const match = matchedPairs.find(m => m.matchId === payload.matchId);
          if (match) {
            setPendingProblems(prev => [...prev, match.problem]);
          }
        }
        showToast?.('매칭이 취소되었습니다', 'warning');
        break;
      }

      case 'SYNC_STATE': {
        // 상태 동기화 (새 창이 참여했을 때)
        const payload = message.payload as SyncStatePayload;
        setPendingProblems(payload.pendingProblems);
        setMatchedPairs(payload.matchedPairs);
        break;
      }

      case 'WINDOW_JOINED': {
        // 새 창이 참여하면 현재 상태 전송
        if (pendingRef.current.length > 0 || matchedPairs.length > 0) {
          send('SYNC_STATE', {
            pendingProblems: pendingRef.current,
            matchedPairs
          } as SyncStatePayload);
        }
        break;
      }
    }
  }, [role, showToast, matchedPairs, onLinkGroup]);

  // 채널 연결
  const { send, windowId, connectedWindows } = useSyncChannel(sessionId, {
    onMessage: handleMessage
  });

  // Phase 25-B: 세션 시작 시 기존 상태 로드
  useEffect(() => {
    if (!sessionId) return;

    const loadState = async () => {
      try {
        console.log(`[Phase 25-B] Loading session state: ${sessionId}`);
        const state = await api.getMatchingState(sessionId);

        if (state.exists) {
          // 서버에서 받은 데이터를 로컬 타입으로 변환
          const loadedPending: PendingProblem[] = state.pendingProblems.map((p: any) => ({
            problemNumber: p.problemNumber,
            groupId: p.groupId,
            documentId: p.documentId,
            pageIndex: p.pageIndex,
            createdAt: p.createdAt,
            windowId: p.windowId || ''
          }));

          const loadedMatches: ProblemSolutionMatch[] = state.matchedPairs.map((m: any) => ({
            matchId: m.matchId,
            sessionId: m.sessionId,
            problem: {
              problemNumber: m.problem.problemNumber,
              groupId: m.problem.groupId,
              documentId: m.problem.documentId,
              pageIndex: m.problem.pageIndex,
              createdAt: m.problem.createdAt,
              windowId: m.problem.windowId || ''
            },
            solution: {
              groupId: m.solution.groupId,
              documentId: m.solution.documentId,
              pageIndex: m.solution.pageIndex
            },
            matchedAt: m.matchedAt
          }));

          setPendingProblems(loadedPending);
          setMatchedPairs(loadedMatches);
          console.log(`[Phase 25-B] Loaded ${loadedPending.length} pending, ${loadedMatches.length} matches`);
        }
      } catch (error) {
        console.error('[Phase 25-B] Failed to load session state:', error);
      }
    };

    loadState();
  }, [sessionId]);

  // 문제 라벨링 시 (문제 창에서)
  // Phase 25-D: 서버에도 저장
  const onProblemLabeled = useCallback(async (group: ProblemGroup) => {
    if (role !== 'problem' || !sessionId) return;

    const pending: PendingProblem = {
      problemNumber: group.problemInfo?.problemNumber || `#${Date.now()}`,
      groupId: group.id,
      documentId,
      pageIndex: currentPage,
      createdAt: Date.now(),
      windowId
    };

    console.log(`[Phase 22-C] Problem labeled:`, pending.problemNumber);

    // 로컬 상태 업데이트
    setPendingProblems(prev => [...prev, pending]);

    // 다른 창에 알림
    send('PROBLEM_LABELED', pending);

    // Phase 25-D: 서버에 저장
    try {
      await api.addPending(sessionId, {
        problemNumber: pending.problemNumber,
        groupId: pending.groupId,
        documentId: pending.documentId,
        pageIndex: pending.pageIndex,
        createdAt: pending.createdAt,
        windowId: pending.windowId
      });
      console.log(`[Phase 25-D] Pending saved to server: ${pending.problemNumber}`);
    } catch (error) {
      console.error('[Phase 25-D] Failed to save pending to server:', error);
    }

    showToast?.(`${pending.problemNumber}번 문제 라벨링 완료! 해설 창에서 계속하세요.`, 'success');
  }, [role, sessionId, documentId, currentPage, windowId, send, showToast]);

  // 해설 라벨링 시 (해설 창에서)
  // Phase 25-A: 서버에도 저장
  const onSolutionLabeled = useCallback(async (group: ProblemGroup) => {
    if (role !== 'solution' || !sessionId) return;

    // 가장 오래된 대기 중인 문제와 매칭 (FIFO)
    const oldestPending = pendingRef.current[0];

    if (!oldestPending) {
      showToast?.('매칭할 문제가 없습니다. 문제 창에서 먼저 라벨링하세요.', 'warning');
      return;
    }

    // Phase 22-J-2: 자동 명명 - 문제명 + " [해설]"
    const solutionName = `${oldestPending.problemNumber} [해설]`;
    console.log(`[Phase 22-J-2] Auto-naming solution: ${solutionName}`);

    // 콜백을 통해 그룹 이름 업데이트 요청
    onAutoName?.(group.id, solutionName);

    const matchedAt = Date.now();
    const match: ProblemSolutionMatch = {
      matchId: `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId,
      problem: oldestPending,
      solution: {
        groupId: group.id,
        documentId,
        pageIndex: currentPage
      },
      matchedAt
    };

    console.log(`[Phase 22-C] Match created:`, match.problem.problemNumber);

    // Phase 22-K: 해설 그룹에 문제 링크 설정
    onLinkGroup?.(group.id, {
      linkedGroupId: oldestPending.groupId,
      linkedDocumentId: oldestPending.documentId,
      linkedPageIndex: oldestPending.pageIndex,
      linkedName: oldestPending.problemNumber,
      linkType: 'solution',  // 이 그룹은 해설이고, 문제와 연결됨
      linkedAt: matchedAt
    });

    // 로컬 상태 업데이트
    setPendingProblems(prev => prev.slice(1));  // 첫 번째 제거
    setMatchedPairs(prev => [...prev, match]);

    // 다른 창에 알림
    send('MATCH_CREATED', match);

    // Phase 25-A: 서버에 매칭 저장
    try {
      await api.addMatch(
        sessionId,
        {
          problemNumber: oldestPending.problemNumber,
          groupId: oldestPending.groupId,
          documentId: oldestPending.documentId,
          pageIndex: oldestPending.pageIndex,
          createdAt: oldestPending.createdAt,
          windowId: oldestPending.windowId
        },
        {
          groupId: group.id,
          documentId,
          pageIndex: currentPage
        }
      );
      console.log(`[Phase 25-A] Match saved to server: ${oldestPending.problemNumber}`);
    } catch (error) {
      console.error('[Phase 25-A] Failed to save match to server:', error);
      showToast?.('매칭 저장에 실패했습니다. 로컬에만 저장됩니다.', 'warning');
    }

    showToast?.(`${oldestPending.problemNumber} [해설] 매칭 완료!`, 'success');
  }, [role, sessionId, documentId, currentPage, send, showToast, onAutoName, onLinkGroup]);

  // 매칭 취소
  // Phase 25-C: 서버에도 반영
  const cancelMatch = useCallback(async (matchId: string) => {
    if (!sessionId) return;

    const match = matchedPairs.find(m => m.matchId === matchId);
    if (!match) return;

    // 로컬 상태 업데이트
    setMatchedPairs(prev => prev.filter(m => m.matchId !== matchId));

    // 문제를 다시 대기 목록에 추가
    setPendingProblems(prev => [...prev, match.problem]);

    // 다른 창에 알림
    send('MATCH_CANCELLED', {
      matchId,
      problemGroupId: match.problem.groupId
    } as MatchCancelledPayload);

    // Phase 25-C: 서버에서 매칭 삭제
    try {
      await api.removeMatch(sessionId, matchId);
      console.log(`[Phase 25-C] Match removed from server: ${matchId}`);
    } catch (error) {
      console.error('[Phase 25-C] Failed to remove match from server:', error);
    }

    showToast?.(`${match.problem.problemNumber}번 매칭이 취소되었습니다`, 'warning');
  }, [sessionId, matchedPairs, send, showToast]);

  return {
    pendingProblems,
    matchedPairs,
    nextPendingNumber: pendingProblems[0]?.problemNumber || null,
    pendingCount: pendingProblems.length,
    matchedCount: matchedPairs.length,
    onProblemLabeled,
    onSolutionLabeled,
    cancelMatch,
    connectedWindows
  };
}
