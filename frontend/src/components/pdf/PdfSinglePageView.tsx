/**
 * PdfSinglePageView - PDF 단일 페이지 뷰어
 * Stage 18: PDF 교재 뷰어
 *
 * - 한 페이지씩 크게 보기
 * - 페이지 네비게이션 (이전/다음, 직접 입력)
 * - 줌 인/아웃
 */

import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSinglePageViewProps {
  /** PDF 파일 URL */
  fileUrl: string;
  /** 현재 페이지 번호 */
  currentPage: number;
  /** 총 페이지 수 */
  totalPages: number;
  /** 페이지 변경 핸들러 */
  onPageChange: (page: number) => void;
  /** 총 페이지 수 전달 콜백 */
  onTotalPages: (total: number) => void;
  /** 페이지 선택 핸들러 (범위 선택 시) */
  onSelectPage?: (page: number) => void;
}

export function PdfSinglePageView({
  fileUrl,
  currentPage,
  totalPages,
  onPageChange,
  onTotalPages,
  onSelectPage,
}: PdfSinglePageViewProps) {
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [pageInputValue, setPageInputValue] = useState(currentPage.toString());

  // 현재 페이지가 변경되면 입력값도 업데이트
  useEffect(() => {
    setPageInputValue(currentPage.toString());
  }, [currentPage]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setIsLoading(false);
      onTotalPages(numPages);
    },
    [onTotalPages]
  );

  // 줌 컨트롤
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setScale(1.0);

  // 페이지 네비게이션
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

  // 페이지 직접 입력
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setPageInputValue(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    }
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col h-full">
      {/* 컨트롤 바 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        {/* 페이지 네비게이션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="이전 페이지 (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              onKeyDown={handlePageInputKeyDown}
              className="w-14 px-2 py-1.5 text-center border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
            />
            <span className="text-gray-500 text-sm">/ {totalPages}</span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="다음 페이지 (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="축소"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <button
            onClick={handleZoomReset}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            title="100%로 초기화"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 3.0}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="확대"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        {/* 페이지 선택 버튼 (옵션) */}
        {onSelectPage && (
          <button
            onClick={() => onSelectPage(currentPage)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            이 페이지 선택
          </button>
        )}
      </div>

      {/* PDF 페이지 영역 */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-gray-200">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">페이지 로딩 중...</p>
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={null}
          className="shadow-2xl"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <div className="w-[600px] h-[800px] bg-white animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          />
        </Document>
      </div>

      {/* 하단 안내 */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50 border-t text-center">
        <p className="text-xs text-gray-500">
          ← → 키로 페이지 이동 · 더블클릭으로 페이지 선택
        </p>
      </div>
    </div>
  );
}

export default PdfSinglePageView;
