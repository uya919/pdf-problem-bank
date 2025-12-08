/**
 * QuickStartCard Component (Phase 34.5-G)
 *
 * 빠른 시작 카드 - 최근 사용 항목용
 */
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import type { RecentUsedItem } from '../../hooks/useRecentUsed';

interface QuickStartCardProps {
  item: RecentUsedItem;
  onStart: () => void;
}

// 학년별 색상
const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  초: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  중: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  고: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export function QuickStartCard({ item, onStart }: QuickStartCardProps) {
  const colorKey = item.grade.charAt(0) as '초' | '중' | '고';
  const colors = gradeColors[colorKey] || gradeColors['고'];

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onStart}
      className={`
        w-full p-4 rounded-xl text-left transition-all border
        ${colors.bg} ${colors.border} hover:shadow-md
      `}
    >
      {/* 학년 뱃지 */}
      <div className={`text-xs font-bold ${colors.text} mb-1.5`}>{item.grade}</div>

      {/* 과정 */}
      <div className="font-semibold text-grey-900 truncate text-sm">{item.course}</div>

      {/* 시리즈 */}
      <div className="text-sm text-grey-500 truncate mt-0.5">{item.series}</div>

      {/* 바로 시작 버튼 */}
      <div
        className={`
        flex items-center gap-1.5 mt-3 text-sm font-medium ${colors.text}
      `}
      >
        <Play className="w-4 h-4" />
        바로 시작
      </div>
    </motion.button>
  );
}
