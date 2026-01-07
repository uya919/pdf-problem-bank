/**
 * Phase 64-B: 페이지네이션 컴포넌트
 *
 * 토스 스타일의 간결한 페이지네이션
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 50,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // 페이지 번호 버튼 생성 (최대 5개)
  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);

    // 끝에서 시작점 조정
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* 페이지 네비게이션 */}
      <div className="flex items-center gap-1">
        {/* 이전 */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-3 py-2 text-sm text-grey-600 hover:bg-grey-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">이전</span>
        </button>

        {/* 페이지 번호 */}
        <div className="flex items-center gap-1">
          {getPageNumbers()[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="px-3 py-2 text-sm text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
              >
                1
              </button>
              {getPageNumbers()[0] > 2 && (
                <span className="px-2 text-grey-400">...</span>
              )}
            </>
          )}

          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                page === currentPage
                  ? 'bg-toss-blue text-white font-medium'
                  : 'text-grey-600 hover:bg-grey-100'
              }`}
            >
              {page}
            </button>
          ))}

          {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <>
              {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                <span className="px-2 text-grey-400">...</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-2 text-sm text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* 다음 */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-3 py-2 text-sm text-grey-600 hover:bg-grey-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="다음 페이지"
        >
          <span className="hidden sm:inline">다음</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 정보 표시 */}
      {totalItems !== undefined && (
        <p className="text-sm text-grey-500">
          {itemsPerPage * (currentPage - 1) + 1} - {Math.min(itemsPerPage * currentPage, totalItems)} / 총 {totalItems.toLocaleString()}개
        </p>
      )}
    </div>
  );
}
