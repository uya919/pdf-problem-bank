/**
 * 배정 해제 드롭존 (Phase 8-C)
 *
 * 학생을 드롭하면 배정이 해제됨
 */
import { useDroppable } from '@dnd-kit/core';

interface UnassignDropZoneProps {
  isVisible?: boolean;
}

export function UnassignDropZone({ isVisible = true }: UnassignDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassign-zone',
  });

  if (!isVisible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center transition-all
        ${isOver
          ? 'border-red-400 bg-red-50 scale-[1.02]'
          : 'border-gray-300 bg-gray-50/50'
        }
      `}
    >
      <div className={`${isOver ? 'text-red-500' : 'text-gray-400'}`}>
        <svg
          className="w-8 h-8 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <p className="text-sm font-medium">
          {isOver ? '여기에 드롭하여 배정 해제' : '배정된 학생을 여기에 드롭하면 배정이 해제됩니다'}
        </p>
        <p className="text-xs mt-1 text-gray-400">
          또는 <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">Backspace</kbd> 키 사용
        </p>
      </div>
    </div>
  );
}
