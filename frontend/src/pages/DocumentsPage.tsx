/**
 * Documents Page (Phase 6-3: Redesigned)
 *
 * Modern card grid layout with filtering and sorting
 * Phase 22-M: 문서 페어 섹션 추가
 * Phase 27: 문서 페어링 영구 연결 기능
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadButton } from '../components/UploadButton';
import { DocumentCard } from '../components/ui/DocumentCard';
import { DocumentFilters, type FilterStatus, type SortBy } from '../components/DocumentFilters';
import { DocumentPairCard } from '../components/matching/DocumentPairCard';
import { PairConfirmDialog } from '../components/matching/PairConfirmDialog';
import { DocumentMergeAnimation } from '../components/matching/DocumentMergeAnimation';
import { useDocuments, useDeleteDocument } from '../hooks/useDocuments';
import { useDocumentPairs } from '../hooks/useDocumentPairs';
import { useDocumentSelectionStore } from '../stores/useDocumentSelectionStore';
import { launchDualWindows } from '../utils/dualWindowLauncher';
import { Loader2, AlertCircle, Upload, Link2, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Document, DocumentPair } from '../api/client';
import { useToast } from '../components/Toast';

export function DocumentsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: documents, isLoading, error } = useDocuments();
  const deleteMutation = useDeleteDocument();

  // Phase 22-M: 문서 페어
  const { pairs, createPair, deletePair, refresh: refreshPairs } = useDocumentPairs();
  const [pairsSectionOpen, setPairsSectionOpen] = useState(true);

  // Phase 27: 문서 선택 상태
  const {
    problemDocument,
    solutionDocument,
    showPairConfirmDialog,
    isPairing,
    selectAsProblem,
    selectAsSolution,
    clearSelection,
    closePairConfirmDialog,
    startPairing,
    completePairing,
    isDocumentSelected
  } = useDocumentSelectionStore();

  const [isCreatingPair, setIsCreatingPair] = useState(false);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  // Phase 27-F: 페어된 문서 ID 집합
  const pairedDocumentIds = useMemo(() => {
    const ids = new Set<string>();
    pairs.forEach(pair => {
      if (pair.status === 'active') {
        ids.add(pair.problem_document_id);
        ids.add(pair.solution_document_id);
      }
    });
    return ids;
  }, [pairs]);

  // Phase 27-F: 페어된 문서 숨기기 토글
  const [hidePairedDocuments, setHidePairedDocuments] = useState(false);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    if (!documents) return [];

    let result = [...documents];

    // Phase 27-F: 페어된 문서 필터링
    if (hidePairedDocuments) {
      result = result.filter(doc => !pairedDocumentIds.has(doc.document_id));
    }

    // Search filter
    if (searchQuery) {
      result = result.filter((doc) =>
        doc.document_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((doc) => {
        const progress = (doc.analyzed_pages / doc.total_pages) * 100;
        if (statusFilter === 'completed') return progress === 100;
        if (statusFilter === 'processing') return progress > 0 && progress < 100;
        if (statusFilter === 'pending') return progress === 0;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.created_at - a.created_at;
        case 'oldest':
          return a.created_at - b.created_at;
        case 'name':
          return a.document_id.localeCompare(b.document_id);
        case 'progress':
          const progressA = (a.analyzed_pages / a.total_pages) * 100;
          const progressB = (b.analyzed_pages / b.total_pages) * 100;
          return progressB - progressA;
        default:
          return 0;
      }
    });

    return result;
  }, [documents, searchQuery, statusFilter, sortBy, hidePairedDocuments, pairedDocumentIds]);

  // Handlers
  const handleDocumentSelect = (doc: Document) => {
    navigate('/labeling', { state: { document: doc } });
  };

  const handleDelete = async (documentId: string) => {
    try {
      await deleteMutation.mutateAsync(documentId);
      showToast('문서가 삭제되었습니다', 'success');
      setSelectedDocuments((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    } catch (error: any) {
      console.error('삭제 실패:', error);
      showToast(
        `삭제 실패: ${error.response?.data?.detail || error.message}`,
        'error'
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) {
      showToast('선택된 문서가 없습니다', 'warning');
      return;
    }

    if (!confirm(`선택된 ${selectedDocuments.size}개의 문서를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedDocuments).map((id) => deleteMutation.mutateAsync(id))
      );
      showToast(`${selectedDocuments.size}개 문서가 삭제되었습니다`, 'success');
      setSelectedDocuments(new Set());
    } catch (error: any) {
      console.error('일괄 삭제 실패:', error);
      showToast('일부 문서 삭제에 실패했습니다', 'error');
    }
  };

  // Phase 22-M: 듀얼 창 열기
  const handleOpenDual = async (pair: DocumentPair) => {
    const result = await launchDualWindows(pair);
    if (result.success) {
      showToast('듀얼 창이 열렸습니다', 'success');
    } else {
      showToast(result.error || '창 열기 실패', 'error');
    }
  };

  // Phase 22-M: 페어 삭제
  const handleDeletePair = async (pairId: string) => {
    const success = await deletePair(pairId);
    if (success) {
      showToast('페어가 삭제되었습니다', 'success');
    } else {
      showToast('페어 삭제 실패', 'error');
    }
  };

  // Phase 27: 페어 생성 핸들러
  const handleCreatePair = useCallback(async () => {
    if (!problemDocument || !solutionDocument) return;

    setIsCreatingPair(true);
    startPairing();

    try {
      const result = await createPair(problemDocument.id, solutionDocument.id);

      if (result) {
        showToast('문서가 연결되었습니다! 이제 듀얼 창으로 함께 열 수 있습니다.', 'success');
        completePairing();
        await refreshPairs();
      } else {
        showToast('페어 생성에 실패했습니다', 'error');
        clearSelection();
      }
    } catch (error) {
      console.error('[Phase 27] Failed to create pair:', error);
      showToast('페어 생성 중 오류가 발생했습니다', 'error');
      clearSelection();
    } finally {
      setIsCreatingPair(false);
    }
  }, [problemDocument, solutionDocument, createPair, startPairing, completePairing, clearSelection, refreshPairs, showToast]);

  // Phase 27: 문서 선택 핸들러
  const handleSetAsProblem = useCallback((doc: Document) => {
    selectAsProblem(doc);
    const role = isDocumentSelected(doc.document_id);
    if (role === 'problem') {
      showToast(`"${doc.document_id}" 문제 지정이 해제되었습니다`, 'info');
    } else {
      showToast(`"${doc.document_id}"가 문제집으로 지정되었습니다`, 'success');
    }
  }, [selectAsProblem, isDocumentSelected, showToast]);

  const handleSetAsSolution = useCallback((doc: Document) => {
    selectAsSolution(doc);
    const role = isDocumentSelected(doc.document_id);
    if (role === 'solution') {
      showToast(`"${doc.document_id}" 해설 지정이 해제되었습니다`, 'info');
    } else {
      showToast(`"${doc.document_id}"가 해설집으로 지정되었습니다`, 'success');
    }
  }, [selectAsSolution, isDocumentSelected, showToast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-grey-600">문서 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h3 className="mt-4 text-lg font-semibold text-grey-900">데이터 로딩 실패</h3>
          <p className="mt-2 text-sm text-grey-600">
            {(error as Error).message}
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!documents || documents.length === 0) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-grey-900">문서 관리</h1>
            <p className="mt-2 text-grey-600">
              PDF를 업로드하고 관리하세요
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex h-96 items-center justify-center rounded-xl border-2 border-dashed border-grey-300 bg-grey-50">
          <div className="text-center">
            <Upload className="mx-auto h-16 w-16 text-grey-400" />
            <h3 className="mt-4 text-lg font-semibold text-grey-900">문서가 없습니다</h3>
            <p className="mt-2 text-sm text-grey-600">
              PDF를 업로드하여 시작하세요
            </p>
            <div className="mt-6">
              <UploadButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-grey-900">문서 관리</h1>
          <p className="mt-2 text-grey-600">
            PDF를 업로드하고 관리하세요
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDocuments.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              선택 삭제 ({selectedDocuments.size})
            </button>
          )}
          <UploadButton />
        </div>
      </div>

      {/* Phase 22-M: 문서 페어 섹션 */}
      {pairs.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 shadow-sm overflow-hidden">
          <button
            onClick={() => setPairsSectionOpen(!pairsSectionOpen)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-grey-900">문제-해설 페어</span>
              <span className="text-sm text-grey-500">({pairs.length}개)</span>
            </div>
            {pairsSectionOpen ? (
              <ChevronUp className="w-5 h-5 text-grey-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-grey-400" />
            )}
          </button>
          {pairsSectionOpen && (
            <div className="px-6 pb-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pairs.filter(p => p.status === 'active').map((pair) => (
                  <DocumentPairCard
                    key={pair.id}
                    pair={pair}
                    onOpenDual={handleOpenDual}
                    onDelete={handleDeletePair}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-grey-200 bg-white p-6 shadow-sm">
        <DocumentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          totalCount={documents.length}
          filteredCount={filteredAndSortedDocuments.length}
        />

        {/* Phase 27-F: 페어된 문서 숨기기 토글 */}
        {pairs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-grey-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hidePairedDocuments}
                onChange={(e) => setHidePairedDocuments(e.target.checked)}
                className="w-4 h-4 rounded border-grey-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-grey-600">
                페어된 문서 숨기기
              </span>
              {hidePairedDocuments && (
                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                  {pairedDocumentIds.size}개 숨김
                </span>
              )}
            </label>
          </div>
        )}
      </div>

      {/* Phase 27: 선택 상태 표시 바 */}
      {(problemDocument || solutionDocument) && (
        <div className="sticky top-0 z-20 rounded-lg border border-purple-200 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link2 className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-grey-700">페어링 선택 중</span>
              <div className="flex items-center gap-2">
                {problemDocument ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    문제: {problemDocument.name.slice(0, 20)}{problemDocument.name.length > 20 ? '...' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-grey-100 text-grey-500 text-sm">
                    문제 선택 대기
                  </span>
                )}
                <span className="text-grey-400">+</span>
                {solutionDocument ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    해설: {solutionDocument.name.slice(0, 20)}{solutionDocument.name.length > 20 ? '...' : ''}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-grey-100 text-grey-500 text-sm">
                    해설 선택 대기
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-full hover:bg-white/50 text-grey-400 hover:text-grey-600 transition-colors"
              title="선택 취소"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Document Grid */}
      {filteredAndSortedDocuments.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-grey-200 bg-grey-50">
          <div className="text-center text-grey-600">
            <AlertCircle className="mx-auto h-12 w-12 text-grey-400" />
            <p className="mt-4">검색 결과가 없습니다</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedDocuments.map((doc) => (
            <DocumentCard
              key={doc.document_id}
              document={doc}
              onSelect={handleDocumentSelect}
              onDelete={handleDelete}
              selected={selectedDocuments.has(doc.document_id)}
              // Phase 27: 페어링 props
              pairingRole={isDocumentSelected(doc.document_id)}
              onSetAsProblem={() => handleSetAsProblem(doc)}
              onSetAsSolution={() => handleSetAsSolution(doc)}
            />
          ))}
        </div>
      )}

      {/* Phase 27: 페어 확인 다이얼로그 */}
      <PairConfirmDialog
        isOpen={showPairConfirmDialog}
        onClose={closePairConfirmDialog}
        onConfirm={handleCreatePair}
        problemDocName={problemDocument?.name || ''}
        solutionDocName={solutionDocument?.name || ''}
        isLoading={isCreatingPair}
      />

      {/* Phase 27-D: 머지 애니메이션 */}
      <DocumentMergeAnimation
        isVisible={isPairing}
        problemDocName={problemDocument?.name || ''}
        solutionDocName={solutionDocument?.name || ''}
      />
    </div>
  );
}
