/**
 * Phase 65-B: 문제은행 통계 Hooks
 *
 * 문제은행 메인 화면용 통계 데이터 조회
 */
import { useMemo } from 'react';
import { useAllExportedProblems, useDocuments, useLinkedSolutions } from './useDocuments';

interface ProblemBankStats {
  total: number;
  documentCount: number;
  linkedCount: number;
  linkedPercent: number;
  todayCount: number;
}

/**
 * 문제은행 전체 통계
 */
export function useProblemBankStats() {
  const { data: problemsData, isLoading: problemsLoading } = useAllExportedProblems({ limit: 1 });
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { data: linkedData, isLoading: linkedLoading } = useLinkedSolutions();

  const stats = useMemo<ProblemBankStats | undefined>(() => {
    if (!problemsData) return undefined;

    const total = problemsData.total || 0;
    const linkedCount = linkedData?.total || 0;
    const documentCount = documents?.length || 0;

    return {
      total,
      documentCount,
      linkedCount,
      linkedPercent: total > 0 ? Math.round((linkedCount / total) * 100) : 0,
      todayCount: 0, // TODO: API에서 제공 필요
    };
  }, [problemsData, documents, linkedData]);

  return {
    data: stats,
    isLoading: problemsLoading || documentsLoading || linkedLoading,
  };
}

interface DocumentWithStats {
  id: string;
  name: string;
  problemCount: number;
  linkedCount: number;
  pageRange?: string;
}

/**
 * 문서별 통계 (교재별 목록용)
 */
export function useDocumentsWithStats() {
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { data: problemsData, isLoading: problemsLoading } = useAllExportedProblems();
  const { data: linkedData, isLoading: linkedLoading } = useLinkedSolutions();

  const documentsWithStats = useMemo<DocumentWithStats[] | undefined>(() => {
    if (!documents || !problemsData) return undefined;

    // 문서별 문제 수 집계
    const problemsByDoc = new Map<string, { count: number; pages: Set<number> }>();
    problemsData.problems?.forEach((p) => {
      const docId = p.document_id;
      const existing = problemsByDoc.get(docId) || { count: 0, pages: new Set<number>() };
      existing.count++;
      if (p.problem_info?.page) {
        existing.pages.add(p.problem_info.page);
      }
      problemsByDoc.set(docId, existing);
    });

    // 문서별 해설 연결 수 집계
    // links는 Record<string, SolutionLink> (key: "documentId|pageIndex|groupId")
    const linkedByDoc = new Map<string, number>();
    if (linkedData?.links) {
      Object.keys(linkedData.links).forEach((key) => {
        const documentId = key.split('|')[0];
        const count = linkedByDoc.get(documentId) || 0;
        linkedByDoc.set(documentId, count + 1);
      });
    }

    return documents.map((doc) => {
      const stats = problemsByDoc.get(doc.document_id);
      const pages = stats?.pages ? Array.from(stats.pages).sort((a, b) => a - b) : [];

      return {
        id: doc.document_id,
        name: doc.document_id, // 문서 ID를 이름으로 사용 (메타데이터 있으면 교체)
        problemCount: stats?.count || 0,
        linkedCount: linkedByDoc.get(doc.document_id) || 0,
        pageRange: pages.length > 0
          ? `${pages[0]}p - ${pages[pages.length - 1]}p`
          : undefined,
      };
    }).filter((doc) => doc.problemCount > 0); // 문제가 있는 문서만 표시
  }, [documents, problemsData, linkedData]);

  return {
    data: documentsWithStats,
    isLoading: documentsLoading || problemsLoading || linkedLoading,
  };
}

interface RecentProblem {
  id: string;
  thumbnail: string;
  displayName: string;
  problemNumber?: string;
  page?: number;
  documentId: string;
}

/**
 * 최근 문제 조회
 */
export function useRecentProblems(limit: number = 4) {
  const { data: problemsData, isLoading } = useAllExportedProblems({ limit });

  const recentProblems = useMemo<RecentProblem[] | undefined>(() => {
    if (!problemsData?.problems) return undefined;

    return problemsData.problems.slice(0, limit).map((p) => ({
      id: `${p.document_id}-${p.page_index}-${p.group_id}`,
      thumbnail: `/api/export/documents/${p.document_id}/problems/image?image_path=${encodeURIComponent(p.image_path)}`,
      displayName: p.problem_info?.problemNumber || p.group_id,
      problemNumber: p.problem_info?.problemNumber,
      page: p.problem_info?.page,
      documentId: p.document_id,
    }));
  }, [problemsData, limit]);

  return {
    data: recentProblems,
    isLoading,
  };
}

/**
 * 특정 교재의 문제 목록 (해설 연결 정보 포함)
 */
export function useProblemsByBook(bookId: string) {
  const { data: problemsData, isLoading: problemsLoading } = useAllExportedProblems({
    documentId: bookId,
  });
  const { data: linkedData, isLoading: linkedLoading } = useLinkedSolutions();

  const data = useMemo(() => {
    if (!problemsData?.problems) return undefined;

    const problems = problemsData.problems.filter((p) => p.document_id === bookId);

    // 해설 연결 정보 맵 생성 (key: "documentId|pageIndex|groupId")
    const linkedKeys = new Set<string>();
    if (linkedData?.links) {
      Object.keys(linkedData.links).forEach((key) => linkedKeys.add(key));
    }

    // 페이지 범위 계산
    const pages = problems
      .map((p) => p.problem_info?.page)
      .filter((p): p is number => p !== undefined)
      .sort((a, b) => a - b);

    const pageRange = pages.length > 0
      ? `${pages[0]}p - ${pages[pages.length - 1]}p`
      : '';

    return {
      bookName: bookId,
      problems: problems.map((p) => {
        const linkKey = `${p.document_id}|${p.page_index}|${p.group_id}`;
        return {
          id: `${p.document_id}-${p.page_index}-${p.group_id}`,
          thumbnail: `/api/export/documents/${p.document_id}/problems/image?image_path=${encodeURIComponent(p.image_path)}`,
          displayName: p.problem_info?.problemNumber || p.group_id,
          problemNumber: p.problem_info?.problemNumber,
          page: p.problem_info?.page || p.page_index + 1,
          documentId: p.document_id,
          pageIndex: p.page_index,
          groupId: p.group_id,
          hasLinkedSolution: linkedKeys.has(linkKey),
        };
      }),
      pageRange,
      hasMore: problemsData.has_more,
    };
  }, [problemsData, bookId, linkedData]);

  return {
    data,
    isLoading: problemsLoading || linkedLoading,
  };
}
