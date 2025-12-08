/**
 * Problem Bank Page (Phase 6-5)
 *
 * Display and manage exported problem images
 */
import { useState, useMemo, useEffect } from 'react';
import { useDocuments, useExportedProblems, useDeleteProblem } from '../hooks/useDocuments';
import { ProblemCard } from '../components/ui/ProblemCard';
import { ProblemModal } from '../components/ui/ProblemModal';
import { Loader2, AlertCircle, Search, Filter, SortAsc, Database } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/Toast';
import { api } from '../api/client';

type SortBy = 'newest' | 'oldest' | 'page';

export function ProblemBankPage() {
  const { showToast } = useToast();
  const { data: documents } = useDocuments();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const { data: problems, isLoading, error } = useExportedProblems(selectedDocumentId);
  const deleteMutation = useDeleteProblem();

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // Selected problem for modal
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Filter and sort problems
  const filteredAndSortedProblems = useMemo(() => {
    if (!problems) return [];

    let result = [...problems];

    // Search filter (problem_id or group_id)
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.problem_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.group_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Page filter
    if (pageFilter !== 'all') {
      result = result.filter((p) => p.page_index === pageFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.created_at || 0) - (a.created_at || 0);
        case 'oldest':
          return (a.created_at || 0) - (b.created_at || 0);
        case 'page':
          return a.page_index - b.page_index || a.group_id.localeCompare(b.group_id);
        default:
          return 0;
      }
    });

    return result;
  }, [problems, searchQuery, pageFilter, sortBy]);

  // Get unique page numbers for filter
  const pageNumbers = useMemo(() => {
    if (!problems) return [];
    const pages = [...new Set(problems.map((p) => p.page_index))];
    return pages.sort((a, b) => a - b);
  }, [problems]);

  // Handlers
  const handleView = (problem: any) => {
    setSelectedProblem(problem);
    setIsModalOpen(true);
  };

  const handleDelete = async (problemId: string) => {
    if (!selectedDocumentId) return;

    // Parse problem_id to get pageIndex and groupId
    // Format: {document_id}_page_{pageIndex}_{groupId}
    const parts = problemId.split('_');
    const pageIndex = parseInt(parts[2], 10);
    const groupId = parts.slice(3).join('_');

    try {
      await deleteMutation.mutateAsync({
        documentId: selectedDocumentId,
        pageIndex,
        groupId,
      });
      showToast('문제가 삭제되었습니다', 'success');
    } catch (error: any) {
      console.error('삭제 실패:', error);
      showToast(`삭제 실패: ${error.response?.data?.detail || error.message}`, 'error');
    }
  };

  // Loading state
  if (isLoading && selectedDocumentId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-grey-600">문제 목록을 불러오는 중...</p>
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
          <p className="mt-2 text-sm text-grey-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8" />
              <h1 className="text-3xl font-bold">문제 은행</h1>
            </div>
            <p className="mt-2 text-emerald-100">
              내보낸 문제 이미지를 관리하고 검색하세요
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {filteredAndSortedProblems.length}
            </div>
            <div className="text-sm text-emerald-100">개의 문제</div>
          </div>
        </div>
      </div>

      {/* Document Selector */}
      <div className="rounded-lg border border-grey-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-grey-700">문서 선택:</label>
          <select
            value={selectedDocumentId}
            onChange={(e) => setSelectedDocumentId(e.target.value)}
            className="flex-1 px-4 py-2 border border-grey-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">-- 문서를 선택하세요 --</option>
            {documents?.map((doc) => (
              <option key={doc.document_id} value={doc.document_id}>
                {doc.document_id} ({doc.total_pages}페이지)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Show filters only when document is selected */}
      {selectedDocumentId && (
        <>
          {/* Filters */}
          <div className="rounded-lg border border-grey-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" />
                <input
                  type="text"
                  placeholder="문제 ID 또는 그룹 ID로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-grey-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                />
              </div>

              {/* Filters & Sort */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Page Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-grey-600" />
                  <span className="text-sm font-medium text-grey-700">페이지:</span>
                  <select
                    value={pageFilter}
                    onChange={(e) =>
                      setPageFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))
                    }
                    className="px-3 py-1.5 border border-grey-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">전체</option>
                    {pageNumbers.map((page) => (
                      <option key={page} value={page}>
                        P{page + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <SortAsc className="w-5 h-5 text-grey-600" />
                  <span className="text-sm font-medium text-grey-700">정렬:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="px-3 py-1.5 border border-grey-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="newest">최신순</option>
                    <option value="oldest">오래된 순</option>
                    <option value="page">페이지 순</option>
                  </select>
                </div>
              </div>

              {/* Result Count */}
              <div className="flex items-center justify-between text-sm text-grey-600">
                <span>
                  {filteredAndSortedProblems.length === problems?.length
                    ? `전체 ${problems?.length || 0}개 문제`
                    : `${filteredAndSortedProblems.length}개 문제 (전체 ${problems?.length || 0}개 중)`}
                </span>
                {searchQuery && <Badge variant="secondary">검색: {searchQuery}</Badge>}
              </div>
            </div>
          </div>

          {/* Problem Grid */}
          {filteredAndSortedProblems.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-grey-200 bg-grey-50">
              <div className="text-center text-grey-600">
                <AlertCircle className="mx-auto h-12 w-12 text-grey-400" />
                <p className="mt-4">
                  {problems?.length === 0
                    ? '내보낸 문제가 없습니다. 먼저 라벨링 페이지에서 문제를 내보내세요.'
                    : '검색 결과가 없습니다'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAndSortedProblems.map((problem) => (
                <ProblemCard
                  key={problem.problem_id}
                  problem={problem}
                  imageUrl={api.getProblemImageUrl(selectedDocumentId, problem.image_path)}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* No document selected state */}
      {!selectedDocumentId && (
        <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-grey-300 bg-grey-50">
          <div className="text-center text-grey-600">
            <Database className="mx-auto h-16 w-16 text-grey-400" />
            <p className="mt-4 text-lg font-medium">문서를 선택하세요</p>
            <p className="mt-2 text-sm">위의 드롭다운에서 문서를 선택하면 문제 목록이 표시됩니다</p>
          </div>
        </div>
      )}

      {/* Problem Modal */}
      <ProblemModal
        problem={selectedProblem}
        imageUrl={
          selectedProblem
            ? api.getProblemImageUrl(selectedDocumentId, selectedProblem.image_path)
            : ''
        }
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={handleDelete}
      />
    </div>
  );
}
