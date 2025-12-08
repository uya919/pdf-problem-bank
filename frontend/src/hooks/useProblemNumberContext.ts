/**
 * Phase 10-2: Problem Number Context Hook
 *
 * 페이지간 문항번호 연속성을 위한 Context Hook
 * 문서 전체의 그룹 요약 정보를 캐싱하고, 이전 페이지의 마지막 문항번호를 제공
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * 문서 전체의 그룹 요약을 조회하고 이전 페이지의 마지막 문항번호를 제공하는 Hook
 */
export function useProblemNumberContext(documentId: string) {
  // React Query로 문서 전체 그룹 요약 조회 및 캐싱
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['problemSummaries', documentId],
    queryFn: () => api.getGroupsSummary(documentId),
    staleTime: 30 * 1000,     // 30초간 신선 (그룹 추가 시 자주 변경됨)
    gcTime: 5 * 60 * 1000,    // 5분간 캐시 (cacheTime -> gcTime in React Query v5)
    refetchOnWindowFocus: false,
  });

  /**
   * 현재 페이지보다 이전 페이지들 중에서 마지막으로 사용된 문항번호 찾기
   *
   * @param currentPageIndex 현재 페이지 인덱스 (0-based)
   * @returns 이전 페이지의 마지막 문항번호 또는 null
   */
  const getLastProblemNumberBefore = (currentPageIndex: number): string | null => {
    if (!summary?.pages) return null;

    // 현재 페이지보다 이전 페이지들을 역순으로 검색
    for (let i = currentPageIndex - 1; i >= 0; i--) {
      const pageSummary = summary.pages.find((p) => p.page_index === i);
      if (pageSummary?.last_problem_number) {
        return pageSummary.last_problem_number;
      }
    }

    return null;
  };

  /**
   * 특정 페이지의 요약 정보 가져오기
   */
  const getPageSummary = (pageIndex: number) => {
    return summary?.pages.find((p) => p.page_index === pageIndex) || null;
  };

  return {
    summary,
    isLoading,
    error,
    getLastProblemNumberBefore,
    getPageSummary,
  };
}
