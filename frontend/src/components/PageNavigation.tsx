/**
 * Page Navigation Component (Phase 6-4: Redesigned, Phase 8: Book Page Support)
 *
 * Modern navigation with icons, progress bar, and keyboard shortcuts
 * Now supports book page offset for displaying actual book page numbers
 */
import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings, BookOpen, X, Check } from 'lucide-react';
import { Button } from './ui/Button';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  // Phase 8: Book page offset support
  bookPage?: number;
  startPage?: number;
  increment?: number;
  onOffsetChange?: (startPage: number, increment: number) => void;
}

export function PageNavigation({
  currentPage,
  totalPages,
  onPageChange,
  bookPage,
  startPage = 1,
  increment = 1,
  onOffsetChange,
}: PageNavigationProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [tempStartPage, setTempStartPage] = useState(startPage);
  const [tempIncrement, setTempIncrement] = useState(increment);

  const progress = ((currentPage + 1) / totalPages) * 100;

  // 책 페이지 표시 여부 (설정이 있으면 표시)
  const showBookPage = bookPage !== undefined && onOffsetChange !== undefined;

  const handlePrevious = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    onPageChange(0);
  };

  const handleLast = () => {
    onPageChange(totalPages - 1);
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10) - 1;
    if (!isNaN(page) && page >= 0 && page < totalPages) {
      onPageChange(page);
    }
  };

  // 설정 저장
  const handleSaveSettings = () => {
    if (onOffsetChange) {
      onOffsetChange(tempStartPage, tempIncrement);
    }
    setShowSettings(false);
  };

  // 설정 취소
  const handleCancelSettings = () => {
    setTempStartPage(startPage);
    setTempIncrement(increment);
    setShowSettings(false);
  };

  // Phase 10-1: 현재 페이지 기준으로 startPage 설정 (간소화)
  // 현재 표시된 책 페이지를 그대로 유지하도록 startPage 계산
  const handleSetCurrentAsStart = () => {
    if (bookPage === undefined) return;

    // 현재 표시된 책 페이지를 기준으로 startPage 계산
    // 예: 현재 PDF 7페이지에 책 15페이지가 표시 중이면, PDF 1 = 책 9로 설정
    const calculatedStartPage = bookPage - currentPage * increment;
    setTempStartPage(calculatedStartPage);
  };

  return (
    <div className="space-y-3">
      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: First & Previous */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleFirst}
            disabled={currentPage === 0}
            variant="outline"
            size="sm"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={handlePrevious}
            disabled={currentPage === 0}
            variant="outline"
            size="md"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            이전
          </Button>
        </div>

        {/* Center: Page Input + Book Page */}
        <div className="flex items-center gap-4">
          {/* PDF Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-grey-700">PDF</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage + 1}
              onChange={handlePageInput}
              className="w-16 px-2 py-2 border border-grey-300 rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm font-medium text-grey-500">
              / {totalPages}
            </span>
          </div>

          {/* Book Page (Phase 8) */}
          {showBookPage && (
            <>
              <div className="h-6 w-px bg-grey-300" />
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-grey-700">책</span>
                <span className="px-3 py-2 bg-purple-100 text-purple-800 font-bold rounded-lg min-w-[60px] text-center">
                  {bookPage}p
                </span>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSettings
                      ? 'bg-purple-100 text-purple-600'
                      : 'hover:bg-grey-100 text-grey-500'
                  }`}
                  title="페이지 오프셋 설정"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Next & Last */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1}
            variant="outline"
            size="md"
          >
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            onClick={handleLast}
            disabled={currentPage >= totalPages - 1}
            variant="outline"
            size="sm"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Page Offset Settings Panel (Phase 8) */}
      {showSettings && showBookPage && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-purple-900 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              페이지 오프셋 설정
            </h4>
            <button
              onClick={handleCancelSettings}
              className="p-1 hover:bg-purple-100 rounded"
            >
              <X className="w-4 h-4 text-purple-600" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Page */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                PDF 1페이지 = 책 페이지
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempStartPage}
                  onChange={(e) => setTempStartPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleSetCurrentAsStart}
                  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm whitespace-nowrap"
                  title={`현재 책 페이지(${bookPage}p)를 고정`}
                >
                  현재 고정
                </button>
              </div>
            </div>

            {/* Increment */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-1">
                증가량
              </label>
              <select
                value={tempIncrement}
                onChange={(e) => setTempIncrement(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={1}>1 (일반)</option>
                <option value={2}>2 (양면)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-purple-200">
            <p className="text-sm text-purple-600">
              예시: PDF {currentPage + 1}p → 책 {tempStartPage + currentPage * tempIncrement}p
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCancelSettings}
                variant="outline"
                size="sm"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveSettings}
                variant="primary"
                size="sm"
              >
                <Check className="w-4 h-4 mr-1" />
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-grey-600">
          <span>진행률</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-grey-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-center gap-4 text-xs text-grey-500">
        <span>← → 페이지 이동</span>
        <span className="text-grey-300">|</span>
        <span>G 그룹 생성</span>
        <span className="text-grey-300">|</span>
        <span>Ctrl+S 즉시 저장</span>
        <span className="text-grey-300">|</span>
        <span>Esc 선택 해제</span>
      </div>
    </div>
  );
}
