/**
 * PdfThumbnailGrid - PDF 페이지 썸네일 그리드
 * Stage 18: PDF 교재 뷰어
 *
 * - PDF 페이지를 썸네일로 표시
 * - 페이지 클릭으로 범위 선택
 * - 선택된 범위 시각적 표시
 * - 반응형 레이아웃 (화면 크기에 따라 동적 열/크기 조절)
 * - 지난 수업 진도 표시
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js 워커 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfThumbnailGridProps {
  /** PDF 파일 URL */
  fileUrl: string;
  /** 선택된 시작 페이지 */
  selectedStart: number | null;
  /** 선택된 끝 페이지 */
  selectedEnd: number | null;
  /** 페이지 클릭 핸들러 */
  onPageClick: (pageNumber: number) => void;
  /** 총 페이지 수 전달 콜백 */
  onTotalPages: (total: number) => void;
  /** 페이지 더블클릭 핸들러 (단일 페이지 뷰로 전환) */
  onPageDoubleClick?: (pageNumber: number) => void;
  /** 지난 수업 범위 (시각화용) */
  lastProgress?: {
    startPage: number;
    endPage: number;
  };
}

export function PdfThumbnailGrid({
  fileUrl,
  selectedStart,
  selectedEnd,
  onPageClick,
  onTotalPages,
  onPageDoubleClick,
  lastProgress,
}: PdfThumbnailGridProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 컨테이너 크기 감지
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // ResizeObserver로 컨테이너 크기 감지
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 최적 페이지 크기 및 열 수 계산 (최소 2열 보장)
  const { pageWidth, columns } = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return { pageWidth: 300, columns: 2 }; // 기본값
    }

    const gap = 12; // gap-3
    const padding = 8; // p-2
    const labelHeight = 28; // 라벨 영역
    const MIN_COLUMNS = 2; // 최소 2열 보장

    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;

    // 1. 높이 기준 페이지 크기 계산 (세로 꽉 채움)
    const maxPageHeight = availableHeight - labelHeight;
    let calculatedWidth = maxPageHeight / 1.414; // A4 비율

    // 2. 이 크기로 몇 열이 들어가는지 계산
    let maxColumns = Math.floor((availableWidth + gap) / (calculatedWidth + gap));

    // 디버그 로그
    console.log('[PDF Grid Debug]', {
      containerSize,
      availableWidth,
      availableHeight,
      maxPageHeight,
      calculatedWidth,
      maxColumns,
    });

    // 3. 최소 2열 보장: 화면이 충분히 넓으면(400px+) 최소 2열
    if (maxColumns < MIN_COLUMNS && availableWidth >= 400) {
      // 2열이 들어가도록 페이지 너비 재계산
      calculatedWidth = (availableWidth - gap * (MIN_COLUMNS - 1)) / MIN_COLUMNS;
      maxColumns = MIN_COLUMNS;
      console.log('[PDF Grid Debug] Adjusted to 2 columns:', { calculatedWidth, maxColumns });
    }

    const finalColumns = Math.max(1, Math.min(6, maxColumns));

    return {
      pageWidth: calculatedWidth,
      columns: finalColumns,
    };
  }, [containerSize]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
      setIsLoading(false);
      onTotalPages(numPages);
    },
    [onTotalPages]
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF 로드 실패:', err);
    setError('PDF를 불러올 수 없습니다');
    setIsLoading(false);
  }, []);

  // 페이지가 선택 범위 내에 있는지 확인
  const isInRange = (page: number) => {
    if (selectedStart === null) return false;
    if (selectedEnd === null) return page === selectedStart;
    const min = Math.min(selectedStart, selectedEnd);
    const max = Math.max(selectedStart, selectedEnd);
    return page >= min && page <= max;
  };

  // 지난 수업 범위 확인
  const isInLastProgress = (page: number) => {
    if (!lastProgress) return false;
    return page >= lastProgress.startPage && page <= lastProgress.endPage;
  };

  // 마지막 진행 페이지 확인
  const isLastProgressEnd = (page: number) => {
    return lastProgress?.endPage === page;
  };

  // 마지막 진행 페이지로 스크롤
  useEffect(() => {
    if (!lastProgress || isLoading || numPages === 0) return;

    // 약간의 딜레이 후 스크롤 (렌더링 완료 대기)
    const timer = setTimeout(() => {
      const targetPage = lastProgress.endPage;
      const pageElement = containerRef.current?.querySelector(
        `[data-page="${targetPage}"]`
      );

      if (pageElement) {
        pageElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [lastProgress, isLoading, numPages]);

  // 에러
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 font-medium">{error}</p>
        <p className="text-gray-500 text-sm mt-2">파일을 확인해주세요</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-auto">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">PDF 로딩 중...</p>
          </div>
        }
      >
        {/* Grid wrapper - Document 컴포넌트 대신 여기에 grid 적용 */}
        <div
          className={isLoading ? '' : 'grid gap-3 p-2 justify-items-center'}
          style={isLoading ? undefined : {
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => {
        const isSelected = isInRange(pageNumber);
        const isStart = pageNumber === selectedStart;
        const isEnd = pageNumber === selectedEnd;
        const inLastProgress = isInLastProgress(pageNumber);
        const lastProgressEnd = isLastProgressEnd(pageNumber);

        return (
          <button
            key={pageNumber}
            data-page={pageNumber}
            onClick={() => onPageClick(pageNumber)}
            onDoubleClick={() => onPageDoubleClick?.(pageNumber)}
            className={`
              relative rounded-lg overflow-hidden border-2 transition-all
              hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
              focus:outline-none focus:ring-2 focus:ring-blue-400
              ${isSelected
                ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                : lastProgressEnd
                ? 'border-amber-400 ring-2 ring-amber-100'
                : inLastProgress
                ? 'border-gray-300 opacity-60'
                : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            {/* 지난 수업 오버레이 */}
            {inLastProgress && !isSelected && (
              <div className="absolute inset-0 bg-gray-500/20 z-10 flex items-center justify-center">
                <span className="bg-gray-800/70 text-white text-xs px-2 py-1 rounded">
                  지난 수업
                </span>
              </div>
            )}

            {/* 마지막 페이지 라벨 */}
            {lastProgressEnd && !isSelected && (
              <div className="absolute top-1 left-1 z-20">
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  마지막
                </span>
              </div>
            )}

            {/* PDF 페이지 썸네일 */}
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="w-full aspect-[1/1.414] bg-gray-100 animate-pulse flex items-center justify-center">
                  <span className="text-gray-400 text-xs">...</span>
                </div>
              }
            />

            {/* 페이지 번호 라벨 */}
            <div
              className={`
                absolute bottom-0 left-0 right-0 py-1.5 text-center text-xs font-semibold
                ${isSelected
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100/90 text-gray-600'
                }
              `}
            >
              {pageNumber}
            </div>

            {/* 시작/끝 표시 */}
            {(isStart || isEnd) && (
              <div
                className={`
                  absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold
                  ${isStart && isEnd
                    ? 'bg-blue-600 text-white'
                    : isStart
                    ? 'bg-green-500 text-white'
                    : 'bg-orange-500 text-white'
                  }
                `}
              >
                {isStart && isEnd ? '선택' : isStart ? '시작' : '끝'}
              </div>
            )}
          </button>
        );
      })}
        </div>
      </Document>
    </div>
  );
}

export default PdfThumbnailGrid;
