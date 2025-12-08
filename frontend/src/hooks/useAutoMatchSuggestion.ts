/**
 * Phase 38-4: 자동 매칭 제안 훅
 *
 * 해설 그룹핑 시 자동으로 문제 번호 매칭 제안
 */
import { useState, useCallback } from 'react';
import { useUnlinkedProblems, useWorkSessionStore } from '@/stores/workSessionStore';
import type { ProblemReference } from '@/api/client';

export interface MatchSuggestion {
  /** 해설 그룹 ID */
  solutionGroupId: string;
  /** 해설 그룹 이름 */
  solutionName: string;
  /** 제안된 문제 */
  suggestedProblem: ProblemReference | null;
  /** 표시 여부 */
  isVisible: boolean;
}

/**
 * 문제 번호 추출 정규식
 */
export function extractProblemNumber(text: string | undefined): string | null {
  if (!text) return null;

  const patterns = [
    /(\d+)번/,         // "3번"
    /문제\s*(\d+)/,    // "문제 3"
    /^(\d+)$/,         // "3"
    /\[(\d+)\]/,       // "[3]"
    /p(\d+)/i,         // "P3"
    /^(\d+)[.-]/,      // "3.", "3-"
    /#(\d+)/,          // "#3"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 자동 매칭 제안 알고리즘
 */
export function suggestMatch(
  solutionGroupName: string | undefined,
  unlinkedProblems: ProblemReference[]
): ProblemReference | null {
  if (unlinkedProblems.length === 0) return null;

  // 1. 해설 이름에서 문제 번호 추출
  const number = extractProblemNumber(solutionGroupName);

  // 2. 번호 일치하는 미연결 문제 찾기
  if (number) {
    const match = unlinkedProblems.find(
      (p) => p.problemNumber === number || p.problemNumber === `${number}번`
    );
    if (match) return match;
  }

  // 3. 없으면 FIFO (첫 번째 미연결 문제)
  return unlinkedProblems[0];
}

/**
 * 자동 매칭 제안 훅
 */
export function useAutoMatchSuggestion() {
  const [suggestion, setSuggestion] = useState<MatchSuggestion | null>(null);
  const unlinkedProblems = useUnlinkedProblems();
  const createLink = useWorkSessionStore((s) => s.createLink);
  const selectNextUnlinkedProblem = useWorkSessionStore((s) => s.selectNextUnlinkedProblem);

  /**
   * 매칭 제안 표시
   */
  const showSuggestion = useCallback(
    (solutionGroupId: string, solutionName: string) => {
      const suggested = suggestMatch(solutionName, unlinkedProblems);
      setSuggestion({
        solutionGroupId,
        solutionName,
        suggestedProblem: suggested,
        isVisible: true,
      });

      // 3초 후 자동 숨김 (사용자 입력 없으면)
      setTimeout(() => {
        setSuggestion((prev) => {
          if (prev?.solutionGroupId === solutionGroupId && prev.isVisible) {
            return { ...prev, isVisible: false };
          }
          return prev;
        });
      }, 5000);
    },
    [unlinkedProblems]
  );

  /**
   * 제안 승인 (연결 생성)
   */
  const acceptSuggestion = useCallback(
    async (solutionDocumentId: string, solutionPageIndex: number) => {
      if (!suggestion?.suggestedProblem) return false;

      try {
        await createLink({
          problemGroupId: suggestion.suggestedProblem.groupId,
          solutionGroupId: suggestion.solutionGroupId,
          solutionDocumentId,
          solutionPageIndex,
        });
        selectNextUnlinkedProblem();
        setSuggestion(null);
        return true;
      } catch (error) {
        console.error('[Phase 38-4] Failed to create link:', error);
        return false;
      }
    },
    [suggestion, createLink, selectNextUnlinkedProblem]
  );

  /**
   * 제안 무시
   */
  const dismissSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  /**
   * 수동 매칭 요청
   */
  const requestManualMatch = useCallback(() => {
    if (suggestion) {
      setSuggestion({ ...suggestion, isVisible: false });
      return suggestion.solutionGroupId;
    }
    return null;
  }, [suggestion]);

  return {
    suggestion,
    showSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    requestManualMatch,
    hasUnlinkedProblems: unlinkedProblems.length > 0,
  };
}

export default useAutoMatchSuggestion;
