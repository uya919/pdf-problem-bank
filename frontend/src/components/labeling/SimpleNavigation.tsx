/**
 * Phase 40: 간소화된 페이지 네비게이션
 * Phase 48: 페이지 직접 입력 기능 추가
 *
 * 토스 스타일의 미니멀한 네비게이션
 * - [< 이전] 페이지정보 [다음 >]
 * - 진행률 바
 * - 단축키 힌트 (한 줄)
 * - 페이지 번호 클릭하여 직접 입력
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SimpleNavigationProps {
  currentPage: number;
  totalPages: number;
  bookPage?: number;
  onPageChange: (page: number) => void;
}

export function SimpleNavigation({
  currentPage,
  totalPages,
  bookPage,
  onPageChange,
}: SimpleNavigationProps) {
  const progress = ((currentPage + 1) / totalPages) * 100;

  // Phase 48: 페이지 직접 입력 상태
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 편집 모드 진입 시 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handlePrev = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  // Phase 48: 페이지 번호 클릭
  const handlePageClick = () => {
    setInputValue(String(currentPage + 1));
    setIsEditing(true);
  };

  // Phase 48: 페이지 입력 제출
  const handleSubmit = () => {
    const page = parseInt(inputValue, 10);

    if (isNaN(page) || page < 1 || page > totalPages) {
      // 유효하지 않은 입력 - 원래 상태로 복원
      setIsEditing(false);
      return;
    }

    onPageChange(page - 1); // 0-based 인덱스
    setIsEditing(false);
  };

  // Phase 48: 키보드 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white border-b border-grey-100">
      {/* 네비게이션 */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* 이전 버튼 */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 0}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-grey-700 hover:bg-grey-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          이전
        </button>

        {/* 중앙: 페이지 정보 + 진행률 */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1 text-sm font-medium text-grey-800">
            {/* Phase 48: 페이지 번호 편집 가능 */}
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                onBlur={() => setIsEditing(false)}
                className="w-12 text-center font-medium border border-toss-blue rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-toss-blue/30"
                autoFocus
              />
            ) : (
              <button
                onClick={handlePageClick}
                className="hover:text-toss-blue hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                title="클릭하여 페이지 번호 입력"
              >
                {currentPage + 1}
              </button>
            )}
            <span className="text-grey-500">/ {totalPages}</span>
            {bookPage !== undefined && (
              <span className="text-grey-500 ml-1">(책 {bookPage}p)</span>
            )}
          </div>
          <div className="w-40 h-1 bg-grey-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-toss-blue rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages - 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-grey-700 hover:bg-grey-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          다음
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 단축키 힌트 */}
      <div className="flex items-center justify-center gap-3 px-4 py-2 bg-grey-50 border-t border-grey-100 text-xs text-grey-500">
        <span>
          <kbd className="px-1.5 py-0.5 bg-white border border-grey-200 rounded text-grey-600">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-grey-200 rounded text-grey-600 ml-0.5">→</kbd>
          <span className="ml-1">페이지</span>
        </span>
        <span className="text-grey-300">|</span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-white border border-grey-200 rounded text-grey-600">G</kbd>
          <span className="ml-1">그룹 생성</span>
        </span>
        <span className="text-grey-300">|</span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-white border border-grey-200 rounded text-grey-600">Esc</kbd>
          <span className="ml-1">선택 해제</span>
        </span>
      </div>
    </div>
  );
}
