/**
 * PdfViewerModal - PDF 뷰어 전체 화면 모달
 * Stage 18: PDF 교재 뷰어
 *
 * 기능:
 * - 썸네일 그리드 / 단일 페이지 전환
 * - 페이지 범위 선택 (시작 → 끝)
 * - 선택 완료 시 콜백으로 범위 전달
 */

import { useState, useCallback, useEffect } from 'react';
import { X, Grid, FileText, Check, RotateCcw } from 'lucide-react';
import { PdfThumbnailGrid } from './PdfThumbnailGrid';
import { PdfSinglePageView } from './PdfSinglePageView';
import type { PageRange, PdfViewerMode } from '@/types/textbook';

interface PdfViewerModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** PDF 파일 URL */
  fileUrl: string;
  /** 교재 이름 (헤더 표시) */
  textbookName: string;
  /** 페이지 범위 선택 완료 핸들러 */
  onSelectRange: (range: PageRange) => void;
  /** 초기 선택 범위 (수정 시) */
  initialRange?: PageRange;
  /** 지난 수업 진도 (시각화용) */
  lastProgress?: {
    startPage: number;
    endPage: number;
    date: string;
  };
}

export function PdfViewerModal({
  isOpen,
  onClose,
  fileUrl,
  textbookName,
  onSelectRange,
  initialRange,
  lastProgress,
}: PdfViewerModalProps) {
  // 뷰 모드 (그리드 / 단일 페이지)
  const [mode, setMode] = useState<PdfViewerMode>('grid');

  // 현재 페이지 (단일 페이지 모드)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // 선택 상태
  const [startPage, setStartPage] = useState<number | null>(
    initialRange?.startPage ?? null
  );
  const [endPage, setEndPage] = useState<number | null>(
    initialRange?.endPage ?? null
  );
  const [selectingEnd, setSelectingEnd] = useState(false);

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setStartPage(initialRange?.startPage ?? null);
      setEndPage(initialRange?.endPage ?? null);
      setSelectingEnd(false);
      setMode('grid');
      setCurrentPage(1);
    }
  }, [isOpen, initialRange]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // 스크롤 잠금
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 페이지 클릭 핸들러 (썸네일 그리드)
  const handlePageClick = useCallback(
    (pageNumber: number) => {
      if (!selectingEnd) {
        // 시작 페이지 선택
        setStartPage(pageNumber);
        setEndPage(null);
        setSelectingEnd(true);
      } else {
        // 끝 페이지 선택
        if (startPage !== null) {
          // 시작보다 작으면 swap
          if (pageNumber < startPage) {
            setEndPage(startPage);
            setStartPage(pageNumber);
          } else {
            setEndPage(pageNumber);
          }
        }
        setSelectingEnd(false);
      }
    },
    [selectingEnd, startPage]
  );

  // 단일 페이지 모드에서 페이지 선택
  const handleSelectCurrentPage = useCallback(
    (page: number) => {
      handlePageClick(page);
    },
    [handlePageClick]
  );

  // 썸네일 더블클릭 → 단일 페이지 모드
  const handlePageDoubleClick = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    setMode('single');
  }, []);

  // 선택 완료
  const handleConfirm = useCallback(() => {
    if (startPage !== null) {
      onSelectRange({
        startPage,
        endPage: endPage ?? startPage,
      });
      onClose();
    }
  }, [startPage, endPage, onSelectRange, onClose]);

  // 선택 초기화
  const handleReset = () => {
    setStartPage(null);
    setEndPage(null);
    setSelectingEnd(false);
  };

  if (!isOpen) return null;

  const hasSelection = startPage !== null;
  const rangeText = hasSelection
    ? endPage !== null && endPage !== startPage
      ? `p.${startPage} ~ ${endPage}`
      : `p.${startPage}`
    : '페이지를 선택하세요';

  const selectionHint = selectingEnd
    ? '끝 페이지를 클릭하세요'
    : hasSelection
    ? '범위가 선택되었습니다'
    : '시작 페이지를 클릭하세요';

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="닫기 (ESC)"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{textbookName}</h2>
            <p className="text-sm text-gray-500">{selectionHint}</p>
          </div>
        </div>

        {/* 뷰 모드 전환 */}
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'grid'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">그리드</span>
            </button>
            <button
              onClick={() => setMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">페이지</span>
            </button>
          </div>

          {totalPages > 0 && (
            <span className="text-sm text-gray-500">
              총 {totalPages}페이지
            </span>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        {mode === 'grid' ? (
          <div className="h-full overflow-auto bg-gray-100">
            <PdfThumbnailGrid
              fileUrl={fileUrl}
              selectedStart={startPage}
              selectedEnd={endPage}
              onPageClick={handlePageClick}
              onTotalPages={setTotalPages}
              onPageDoubleClick={handlePageDoubleClick}
              lastProgress={lastProgress ? {
                startPage: lastProgress.startPage,
                endPage: lastProgress.endPage,
              } : undefined}
            />
          </div>
        ) : (
          <PdfSinglePageView
            fileUrl={fileUrl}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onTotalPages={setTotalPages}
            onSelectPage={handleSelectCurrentPage}
          />
        )}
      </div>

      {/* 하단 선택 바 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-t shadow-lg">
        <div className="flex items-center gap-4">
          {/* 선택 범위 표시 */}
          <div
            className={`
              text-lg font-bold px-4 py-2 rounded-xl
              ${hasSelection
                ? 'bg-blue-50 text-blue-600'
                : 'bg-gray-100 text-gray-400'
              }
            `}
          >
            {rangeText}
          </div>

          {/* 초기화 버튼 */}
          {hasSelection && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
          )}
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={handleConfirm}
          disabled={!hasSelection}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all
            ${hasSelection
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-5 h-5" />
          선택 완료
        </button>
      </div>
    </div>
  );
}

export default PdfViewerModal;
