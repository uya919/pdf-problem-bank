/**
 * Phase 65-A: 빠른 접근 카드
 *
 * 토스 스타일의 2열 그리드 접근 카드
 */
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface QuickAccessCardProps {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  color?: 'blue' | 'green' | 'amber' | 'grey';
}

const colorVariants = {
  blue: 'bg-toss-blue/5 hover:bg-toss-blue/10',
  green: 'bg-green-50 hover:bg-green-100',
  amber: 'bg-amber-50 hover:bg-amber-100',
  grey: 'bg-grey-50 hover:bg-grey-100',
};

export function QuickAccessCard({
  icon,
  title,
  subtitle,
  onClick,
  color = 'grey',
}: QuickAccessCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex-1 rounded-2xl p-4 text-left transition-colors ${colorVariants[color]}`}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl mb-2">{icon}</div>
          <p className="text-sm font-semibold text-grey-900">{title}</p>
          <p className="text-xs text-grey-500 mt-0.5">{subtitle}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-grey-300 mt-1" />
      </div>
    </motion.button>
  );
}
