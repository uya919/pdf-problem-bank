/**
 * useDocumentPairs 훅
 *
 * Phase 22-L: 문서 페어링 관리
 *
 * 문제집-해설집 문서 쌍을 영구적으로 저장하고 관리
 */

import { useState, useCallback, useEffect } from 'react';
import { api, type DocumentPair, type DocumentPairStats } from '@/api/client';

interface UseDocumentPairsOptions {
  /** 자동 로드 여부 (기본: true) */
  autoLoad?: boolean;
  /** 초기 상태 필터 */
  statusFilter?: 'active' | 'archived';
}

interface UseDocumentPairsReturn {
  /** 페어 목록 */
  pairs: DocumentPair[];
  /** 통계 */
  stats: DocumentPairStats | null;
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 */
  error: string | null;
  /** 페어 목록 새로고침 */
  refresh: () => Promise<void>;
  /** 새 페어 생성 */
  createPair: (problemDocId: string, solutionDocId: string) => Promise<DocumentPair | null>;
  /** 페어 삭제 */
  deletePair: (pairId: string, hardDelete?: boolean) => Promise<boolean>;
  /** 특정 문서의 페어 찾기 */
  findPairForDocument: (documentId: string) => DocumentPair | undefined;
  /** 특정 문서가 문제집인 페어 찾기 */
  findPairByProblemDoc: (problemDocId: string) => DocumentPair | undefined;
  /** 특정 문서가 해설집인 페어 찾기 */
  findPairBySolutionDoc: (solutionDocId: string) => DocumentPair | undefined;
}

export function useDocumentPairs(
  options: UseDocumentPairsOptions = {}
): UseDocumentPairsReturn {
  const { autoLoad = true, statusFilter } = options;

  const [pairs, setPairs] = useState<DocumentPair[]>([]);
  const [stats, setStats] = useState<DocumentPairStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 페어 목록 로드
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [pairsResult, statsResult] = await Promise.all([
        api.getDocumentPairs(statusFilter),
        api.getDocumentPairStats()
      ]);

      setPairs(pairsResult.items);
      setStats(statsResult);
    } catch (err) {
      console.error('[Phase 22-L] Failed to load document pairs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load document pairs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // 자동 로드
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  // 새 페어 생성
  const createPair = useCallback(async (
    problemDocId: string,
    solutionDocId: string
  ): Promise<DocumentPair | null> => {
    try {
      const pair = await api.createDocumentPair({
        problem_document_id: problemDocId,
        solution_document_id: solutionDocId
      });

      // 로컬 상태 업데이트
      setPairs(prev => [...prev, pair]);

      // 통계 갱신
      if (stats) {
        setStats({
          ...stats,
          total_pairs: stats.total_pairs + 1,
          active_pairs: stats.active_pairs + 1
        });
      }

      console.log('[Phase 22-L] Document pair created:', pair.id);
      return pair;
    } catch (err) {
      console.error('[Phase 22-L] Failed to create document pair:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document pair');
      return null;
    }
  }, [stats]);

  // 페어 삭제
  const deletePair = useCallback(async (
    pairId: string,
    hardDelete = false
  ): Promise<boolean> => {
    try {
      await api.deleteDocumentPair(pairId, hardDelete);

      // 로컬 상태 업데이트
      if (hardDelete) {
        setPairs(prev => prev.filter(p => p.id !== pairId));
      } else {
        setPairs(prev => prev.map(p =>
          p.id === pairId ? { ...p, status: 'archived' as const } : p
        ));
      }

      // 통계 갱신
      await api.getDocumentPairStats().then(setStats);

      console.log('[Phase 22-L] Document pair deleted:', pairId);
      return true;
    } catch (err) {
      console.error('[Phase 22-L] Failed to delete document pair:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete document pair');
      return false;
    }
  }, []);

  // 특정 문서의 페어 찾기 (문제집 또는 해설집으로)
  const findPairForDocument = useCallback((documentId: string): DocumentPair | undefined => {
    return pairs.find(p =>
      p.problem_document_id === documentId ||
      p.solution_document_id === documentId
    );
  }, [pairs]);

  // 특정 문서가 문제집인 페어 찾기
  const findPairByProblemDoc = useCallback((problemDocId: string): DocumentPair | undefined => {
    return pairs.find(p => p.problem_document_id === problemDocId);
  }, [pairs]);

  // 특정 문서가 해설집인 페어 찾기
  const findPairBySolutionDoc = useCallback((solutionDocId: string): DocumentPair | undefined => {
    return pairs.find(p => p.solution_document_id === solutionDocId);
  }, [pairs]);

  return {
    pairs,
    stats,
    loading,
    error,
    refresh,
    createPair,
    deletePair,
    findPairForDocument,
    findPairByProblemDoc,
    findPairBySolutionDoc
  };
}
