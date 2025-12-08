/**
 * 줌 컨트롤 컴포넌트 (Phase 31-J)
 *
 * 캔버스 확대/축소 버튼 + 휠 줌 지원
 */
import { memo, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ZoomControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
  step?: number;
}

// 줌 레벨 상수
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const ZOOM_STEP = 0.25;

export const ZoomControls = memo(function ZoomControls({
  scale,
  onScaleChange,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
  step = ZOOM_STEP,
}: ZoomControlsProps) {
  // 줌 인
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(maxScale, scale + step);
    onScaleChange(newScale);
  }, [scale, maxScale, step, onScaleChange]);

  // 줌 아웃
  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(minScale, scale - step);
    onScaleChange(newScale);
  }, [scale, minScale, step, onScaleChange]);

  // 리셋 (100%)
  const handleReset = useCallback(() => {
    onScaleChange(1);
  }, [onScaleChange]);

  // 키보드 단축키 (+/- 줌, 0 리셋)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + 조합은 브라우저 기본 동작 유지
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset]);

  const percentage = Math.round(scale * 100);

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border px-2 py-1">
      {/* 줌 아웃 */}
      <button
        onClick={handleZoomOut}
        disabled={scale <= minScale}
        className="p-1.5 rounded hover:bg-grey-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="축소 (-)"
      >
        <ZoomOut className="w-4 h-4 text-grey-600" />
      </button>

      {/* 현재 줌 레벨 */}
      <button
        onClick={handleReset}
        className="min-w-[48px] px-2 py-1 text-sm font-medium text-grey-700 hover:bg-grey-100 rounded transition-colors"
        title="100%로 리셋 (0)"
      >
        {percentage}%
      </button>

      {/* 줌 인 */}
      <button
        onClick={handleZoomIn}
        disabled={scale >= maxScale}
        className="p-1.5 rounded hover:bg-grey-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="확대 (+)"
      >
        <ZoomIn className="w-4 h-4 text-grey-600" />
      </button>

      {/* Fit to width */}
      <div className="w-px h-4 bg-grey-200 mx-1" />
      <button
        onClick={handleReset}
        className="p-1.5 rounded hover:bg-grey-100 transition-colors"
        title="화면에 맞추기"
      >
        <Maximize2 className="w-4 h-4 text-grey-600" />
      </button>
    </div>
  );
});
