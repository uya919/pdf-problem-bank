/**
 * Phase 66-67: 접기/펼치기 가능한 그리드 컴포넌트
 *
 * 반응형 그리드 + 1줄 접기 시스템
 * PC에서 더보기 버튼을 그리드 아이템으로 인라인 표시
 */
import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';
import { useResponsiveColumns } from '../../hooks/useResponsiveColumns';

interface CollapsibleGridProps {
  /** 그리드에 표시할 아이템들 */
  items: ReactNode[];
  /** 기본으로 표시할 행 수 (default: 1) */
  defaultRows?: number;
  /** 그리드 간격 클래스 (default: 'gap-3') */
  gapClass?: string;
  /** 추가 클래스 */
  className?: string;
  /** 기본 펼침 상태 */
  defaultExpanded?: boolean;
  /** 컴팩트 모드 (PC용 정사각형 카드) */
  compact?: boolean;
}

export function CollapsibleGrid({
  items,
  defaultRows = 1,
  gapClass = 'gap-3',
  className = '',
  defaultExpanded = false,
  compact = false,
}: CollapsibleGridProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const columns = useResponsiveColumns();

  // 표시할 아이템 수 계산
  // 더보기 버튼이 필요하면 마지막 슬롯을 예약 (8열이면 7개 데이터 + 더보기)
  const totalSlots = columns * defaultRows;
  const needsExpandButton = !isExpanded && items.length > totalSlots;
  const maxVisible = needsExpandButton ? totalSlots - 1 : totalSlots;
  const visibleCount = isExpanded ? items.length : Math.min(items.length, maxVisible);
  const hiddenCount = items.length - maxVisible;
  const hasMore = hiddenCount > 0;

  // 표시할 아이템
  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={className}>
      {/* 그리드 - lg:6열, xl:8열 추가 */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 ${gapClass}`}>
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: isExpanded ? 0.02 * Math.max(0, index - totalSlots) : 0 }}
            >
              {item}
            </motion.div>
          ))}

          {/* 더보기 버튼 - 그리드 아이템으로 인라인 표시 */}
          {hasMore && !isExpanded && (
            <motion.button
              key="expand-button"
              onClick={() => setIsExpanded(true)}
              className={`
                bg-grey-50 border-2 border-dashed border-grey-200 rounded-xl
                flex flex-col items-center justify-center
                hover:bg-grey-100 hover:border-grey-300 transition-colors
                text-grey-500 hover:text-grey-700
                ${compact ? 'aspect-square' : 'aspect-[4/5]'}
              `}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.98 }}
              aria-expanded={false}
            >
              <span className="text-xl font-bold">+{hiddenCount}</span>
              <span className="text-xs mt-1">더 보기</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 접기 버튼 - 펼친 상태에서만 아래에 표시 */}
      {isExpanded && items.length > totalSlots && (
        <motion.button
          onClick={() => setIsExpanded(false)}
          className="w-full mt-4 py-2 text-sm text-grey-400 hover:text-grey-600
                     rounded-xl transition-colors flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.98 }}
          aria-expanded={true}
        >
          <ChevronUp className="w-4 h-4" />
          접기
        </motion.button>
      )}
    </div>
  );
}
