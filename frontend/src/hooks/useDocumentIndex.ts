/**
 * useDocumentIndex Hook (Phase 34.5-B)
 *
 * 문서 목록에서 인덱스 생성
 */
import { useMemo } from 'react';
import { useDocuments } from './useDocuments';
import { buildDocumentIndex } from '../lib/documentParser';
import type { DocumentIndex } from '../lib/documentParser';

export function useDocumentIndex() {
  const { data: documents, isLoading } = useDocuments();

  const index = useMemo<DocumentIndex | null>(() => {
    if (!documents || documents.length === 0) return null;
    return buildDocumentIndex(documents);
  }, [documents]);

  return { index, isLoading };
}
