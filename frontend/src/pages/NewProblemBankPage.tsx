/**
 * 새로운 문제은행 페이지
 *
 * Phase 21+ B-1: 문제은행 메인 UI
 *
 * 토스/애플 스타일 UI + 새로운 Problem API 연동
 */

import React, { useState, useCallback } from 'react';
import { Search, Plus, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StatsCards,
  ProblemGrid,
  FilterSidebar,
  NoSearchResults,
  ProblemDetailModal,
  ProblemFormModal,
} from '../components/problemBank';
import {
  useProblems,
  useProblemStats,
  useAllTags,
  useToggleFavorite,
  useCreateProblem,
  useUpdateProblem,
} from '../api/problems';
import type { Problem, ProblemFilter, ProblemCreate, ProblemUpdate } from '../types/problem';

export function NewProblemBankPage() {
  // 필터 상태
  const [filter, setFilter] = useState<Partial<ProblemFilter>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 뷰 모드
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 선택 상태 (다중 선택)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Phase 21+ B-2: 상세 모달 상태
  const [detailProblem, setDetailProblem] = useState<Problem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Phase 21+ B-3: 폼 모달 상태
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | undefined>(undefined);

  // API 쿼리
  const { data: problemsData, isLoading: problemsLoading } = useProblems({
    page,
    pageSize,
    filter: { ...filter, searchQuery: searchQuery || undefined },
  });

  const { data: stats, isLoading: statsLoading } = useProblemStats();
  const { data: allTags } = useAllTags();
  const toggleFavorite = useToggleFavorite();

  // Phase 21+ B-3: 문제 생성/수정 mutation
  const createProblem = useCreateProblem();
  const updateProblem = useUpdateProblem();

  // Phase 21+ B-3: 새 문제 추가 모달 열기
  const handleOpenAddModal = useCallback(() => {
    setEditingProblem(undefined);
    setIsFormModalOpen(true);
  }, []);

  // Phase 21+ B-3: 문제 수정 모달 열기
  const handleOpenEditModal = useCallback((problem: Problem) => {
    setEditingProblem(problem);
    setIsFormModalOpen(true);
    // 상세 모달이 열려있으면 닫기
    setIsDetailModalOpen(false);
  }, []);

  // Phase 21+ B-3: 폼 모달 닫기
  const handleCloseFormModal = useCallback(() => {
    setIsFormModalOpen(false);
    setTimeout(() => setEditingProblem(undefined), 300);
  }, []);

  // Phase 21+ B-3: 폼 제출 핸들러
  const handleFormSubmit = useCallback(
    (data: ProblemCreate | ProblemUpdate) => {
      if (editingProblem) {
        // 수정
        updateProblem.mutate(
          { id: editingProblem.id, data },
          {
            onSuccess: () => {
              handleCloseFormModal();
            },
          }
        );
      } else {
        // 생성
        createProblem.mutate(data as ProblemCreate, {
          onSuccess: () => {
            handleCloseFormModal();
          },
        });
      }
    },
    [editingProblem, createProblem, updateProblem, handleCloseFormModal]
  );

  // Phase 21+ B-2: 문제 카드 클릭 시 상세 모달 열기
  const handleProblemClick = useCallback((problem: Problem) => {
    setDetailProblem(problem);
    setIsDetailModalOpen(true);
  }, []);

  // 상세 모달 닫기
  const handleCloseDetail = useCallback(() => {
    setIsDetailModalOpen(false);
    // 애니메이션 완료 후 problem 초기화
    setTimeout(() => setDetailProblem(null), 300);
  }, []);

  // 다중 선택 토글 (Shift+클릭 또는 선택 모드에서 사용)
  const handleToggleSelect = useCallback((problem: Problem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(problem.id)) {
        next.delete(problem.id);
      } else {
        next.add(problem.id);
      }
      return next;
    });
  }, []);

  // 즐겨찾기 토글
  const handleFavorite = useCallback((problem: Problem) => {
    toggleFavorite.mutate(problem.id);
  }, [toggleFavorite]);

  // 필터 변경
  const handleFilterChange = useCallback((newFilter: Partial<ProblemFilter>) => {
    setFilter(newFilter);
    setPage(1); // 필터 변경 시 첫 페이지로
  }, []);

  // 필터 초기화
  const handleClearFilter = useCallback(() => {
    setFilter({});
    setSearchQuery('');
    setPage(1);
  }, []);

  // 검색
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  }, []);

  // 활성 필터 개수
  const activeFilterCount = Object.values(filter).filter((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== undefined && v !== null;
  }).length;

  const problems = problemsData?.items || [];
  const totalPages = problemsData?.totalPages || 0;

  return (
    <div className="min-h-screen bg-grey-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-grey-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-grey-900">문제은행</h1>
                <p className="text-sm text-grey-500 mt-1">
                  등록된 문제를 검색하고 관리하세요
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl
                  hover:bg-blue-600 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                문제 추가
              </button>
            </div>

            {/* 검색 바 */}
            <form onSubmit={handleSearch} className="mt-4 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="문제 검색 (태그, 분류, 출처)"
                  className="w-full pl-12 pr-4 py-3 bg-grey-50 border border-grey-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-grey-200 rounded-full"
                  >
                    <X className="w-4 h-4 text-grey-400" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors
                  ${showFilters || activeFilterCount > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white border-grey-200 text-grey-700 hover:bg-grey-50'
                  }
                `}
              >
                <SlidersHorizontal className="w-5 h-5" />
                필터
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 통계 카드 */}
        <StatsCards
          stats={stats}
          loading={statsLoading}
          className="mb-6"
        />

        {/* 레이아웃 */}
        <div className="flex gap-6">
          {/* 필터 사이드바 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex-shrink-0 overflow-hidden"
              >
                <FilterSidebar
                  filter={filter}
                  onChange={handleFilterChange}
                  onClear={handleClearFilter}
                  availableTags={allTags || []}
                  className="sticky top-32"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 문제 목록 */}
          <div className="flex-1 min-w-0">
            {/* 결과 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-grey-500">
                {problemsData?.total || 0}개의 문제
                {searchQuery && (
                  <span className="ml-2 text-blue-600">
                    "{searchQuery}" 검색 결과
                  </span>
                )}
              </div>
            </div>

            {/* 검색 결과 없음 */}
            {!problemsLoading && problems.length === 0 && searchQuery ? (
              <NoSearchResults query={searchQuery} />
            ) : (
              <>
                {/* 문제 그리드 */}
                <ProblemGrid
                  problems={problems}
                  loading={problemsLoading}
                  viewMode={viewMode}
                  selectedIds={selectedIds}
                  onSelect={handleProblemClick}
                  onFavorite={handleFavorite}
                  onViewModeChange={setViewMode}
                  emptyMessage="등록된 문제가 없습니다"
                />

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded-lg border border-grey-200 text-sm font-medium
                        disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grey-50
                        transition-colors"
                    >
                      이전
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`
                              w-10 h-10 rounded-lg text-sm font-medium transition-colors
                              ${page === pageNum
                                ? 'bg-blue-500 text-white'
                                : 'hover:bg-grey-100 text-grey-700'
                              }
                            `}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded-lg border border-grey-200 text-sm font-medium
                        disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grey-50
                        transition-colors"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 선택 모드 액션 바 */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="bg-grey-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium">
                  {selectedIds.size}
                </div>
                <span className="text-sm">개 선택됨</span>
              </div>

              <div className="w-px h-6 bg-grey-600" />

              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-grey-300 hover:text-white transition-colors"
              >
                선택 취소
              </button>

              <div className="w-px h-6 bg-grey-600" />

              <button
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-full text-sm font-medium transition-colors"
              >
                시험지에 추가
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 21+ B-2: 문제 상세 모달 */}
      <ProblemDetailModal
        problem={detailProblem}
        open={isDetailModalOpen}
        onClose={handleCloseDetail}
        onFavorite={handleFavorite}
        onEdit={handleOpenEditModal}
      />

      {/* Phase 21+ B-3: 문제 등록/수정 모달 */}
      <ProblemFormModal
        open={isFormModalOpen}
        problem={editingProblem}
        onClose={handleCloseFormModal}
        onSubmit={handleFormSubmit}
        isSubmitting={createProblem.isPending || updateProblem.isPending}
      />
    </div>
  );
}

export default NewProblemBankPage;
