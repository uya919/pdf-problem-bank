/**
 * RecentUsedSection Component (Phase 34.5-G)
 *
 * 최근 사용 섹션 - QuickStartCard 그리드
 */
import { motion } from 'framer-motion';
import { Clock, Search } from 'lucide-react';
import { QuickStartCard } from './QuickStartCard';
import type { RecentUsedItem } from '../../hooks/useRecentUsed';

interface RecentUsedSectionProps {
  items: RecentUsedItem[];
  onStart: (item: RecentUsedItem) => void;
}

export function RecentUsedSection({ items, onStart }: RecentUsedSectionProps) {
  // 최근 사용 없음
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-grey-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6 text-grey-400" />
        </div>
        <p className="text-grey-500 font-medium">최근 사용한 문서가 없습니다</p>
        <p className="text-sm text-grey-400 mt-1">
          검색하거나 아래에서 찾아보세요
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-amber-500 text-lg">⭐</span>
        <span className="text-sm font-semibold text-grey-700">최근 사용</span>
        <span className="text-xs text-grey-400">클릭하면 바로 시작</span>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item, index) => (
          <motion.div
            key={item.comboId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <QuickStartCard item={item} onStart={() => onStart(item)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
