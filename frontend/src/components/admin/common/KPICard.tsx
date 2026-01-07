/**
 * Phase 8-C: KPICard
 *
 * 핵심 지표 카드 컴포넌트
 * - 토스 스타일 디자인
 * - 트렌드 표시 (상승/하락)
 */
import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'grey';
  size?: 'sm' | 'md' | 'lg';
}

const COLOR_STYLES = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-500',
    accent: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-500',
    accent: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-500',
    accent: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-500',
    accent: 'text-red-600',
  },
  grey: {
    bg: 'bg-grey-50',
    icon: 'text-grey-500',
    accent: 'text-grey-600',
  },
};

const SIZE_STYLES = {
  sm: {
    card: 'p-4',
    title: 'text-xs',
    value: 'text-xl',
    icon: 'w-8 h-8',
  },
  md: {
    card: 'p-5',
    title: 'text-sm',
    value: 'text-2xl',
    icon: 'w-10 h-10',
  },
  lg: {
    card: 'p-6',
    title: 'text-sm',
    value: 'text-3xl',
    icon: 'w-12 h-12',
  },
};

export function KPICard({
  title,
  value,
  unit,
  trend,
  icon,
  color = 'blue',
  size = 'md',
}: KPICardProps) {
  const colorStyle = COLOR_STYLES[color];
  const sizeStyle = SIZE_STYLES[size];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3.5 h-3.5" />;
    if (trend.value < 0) return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600';
    if (trend.value < 0) return 'text-red-600';
    return 'text-grey-500';
  };

  return (
    <div className={`bg-white rounded-xl border border-grey-200 ${sizeStyle.card} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 제목 */}
          <p className={`${sizeStyle.title} text-grey-500 font-medium mb-1`}>
            {title}
          </p>

          {/* 값 */}
          <div className="flex items-baseline gap-1">
            <span className={`${sizeStyle.value} font-bold text-grey-900`}>
              {value}
            </span>
            {unit && (
              <span className="text-sm text-grey-500">{unit}</span>
            )}
          </div>

          {/* 트렌드 */}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs font-medium">
                {trend.value > 0 ? '+' : ''}{trend.value}%
                {trend.label && <span className="text-grey-400 ml-1">{trend.label}</span>}
              </span>
            </div>
          )}
        </div>

        {/* 아이콘 */}
        {icon && (
          <div className={`${sizeStyle.icon} rounded-xl ${colorStyle.bg} flex items-center justify-center ${colorStyle.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
