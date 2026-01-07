/**
 * SlotCell - 시간표 슬롯 셀 컴포넌트
 *
 * Stage 5-C: 단일 시간표 그리드
 * Stage 5-H: 반응형 최적화
 * Stage 5-I: 애니메이션 + 폴리시
 * - 빈 셀: 드롭 영역
 * - 할당된 셀: 반 정보 표시
 * - compact 모드: 모바일/태블릿용
 * - 슬롯 등장/삭제 애니메이션
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TimetableSlot, DayOfWeek } from '@/types/timetable';

interface SlotCellProps {
  dayOfWeek: DayOfWeek;
  time: string;
  slot?: TimetableSlot;
  onClick?: () => void;
  onDelete?: () => void;
  isDropTarget?: boolean;
  /** 컴팩트 모드 (모바일용) */
  compact?: boolean;
}

/** 과목별 색상 매핑 */
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  수학: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  영어: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  국어: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  과학: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  사회: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
};

const DEFAULT_COLOR = { bg: 'bg-grey-50', text: 'text-grey-700', border: 'border-grey-200' };

/**
 * 슬롯 셀
 */
export function SlotCell({
  slot,
  onClick,
  onDelete,
  isDropTarget = false,
  compact = false,
}: SlotCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // 슬롯이 새로 생성되면 애니메이션 트리거
  useEffect(() => {
    if (slot) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 300);
      return () => clearTimeout(timer);
    }
  }, [slot?.id]);

  // 빈 셀
  if (!slot) {
    return (
      <div
        className={`
          h-full w-full
          cursor-pointer transition-all duration-200
          ${isDropTarget
            ? 'bg-blue-50/70 ring-2 ring-blue-300 ring-inset'
            : 'hover:bg-grey-50/80'
          }
        `}
        onClick={onClick}
        data-droppable="true"
      />
    );
  }

  // 할당된 셀
  const color = slot.subject ? (SUBJECT_COLORS[slot.subject] || DEFAULT_COLOR) : DEFAULT_COLOR;

  return (
    <div
      className={`
        relative h-full w-full ${compact ? 'p-0.5' : 'p-1.5'}
        cursor-pointer transition-all
        ${isNew ? 'animate-slot-enter' : ''}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`
          h-full ${compact ? 'rounded-md p-1' : 'rounded-lg p-2'}
          ${color.bg} ${color.text} border ${color.border}
          transition-all duration-200
          hover:shadow-md hover:scale-[1.02]
        `}
      >
        {/* 반 이름 */}
        <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold truncate`}>
          {slot.className || '미지정'}
        </div>

        {/* 강사 이름 (compact에서는 숨김) */}
        {!compact && slot.teacherName && (
          <div className="text-[10px] opacity-70 truncate mt-0.5">
            {slot.teacherName}
          </div>
        )}

        {/* 강의실 (compact에서는 숨김) */}
        {!compact && slot.room && (
          <div className="text-[10px] opacity-50 truncate">
            {slot.room}
          </div>
        )}

        {/* 삭제 버튼 (호버 시) */}
        {isHovered && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`
              absolute ${compact ? 'top-0 right-0 p-0.5' : 'top-1 right-1 p-1'}
              bg-white rounded-full shadow-md
              text-grey-400 hover:text-red-500 hover:scale-110
              transition-all duration-150
            `}
          >
            <X className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
          </button>
        )}
      </div>
    </div>
  );
}
