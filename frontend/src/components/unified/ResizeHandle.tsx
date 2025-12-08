/**
 * 리사이즈 핸들 컴포넌트 (Phase 31-I)
 *
 * 드래그로 패널 너비 조절
 */
import { useState, useRef, useCallback } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  onDoubleClick?: () => void;
}

export function ResizeHandle({ onResize, onDoubleClick }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // 오른쪽에서 왼쪽으로 드래그하면 delta > 0 (패널 확장)
      const delta = startXRef.current - moveEvent.clientX;
      startXRef.current = moveEvent.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onResize]);

  return (
    <div
      className={`w-1.5 flex-shrink-0 cursor-col-resize transition-colors relative group ${
        isDragging ? 'bg-blue-500' : 'bg-grey-200 hover:bg-blue-400'
      }`}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      title="드래그: 크기 조절 | 더블클릭: 기본 크기"
    >
      {/* 호버 시 더 넓은 영역 표시 */}
      <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-blue-100/50 transition-colors" />

      {/* 중앙 핸들 표시 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-grey-400 group-hover:bg-blue-500 transition-colors" />
    </div>
  );
}
