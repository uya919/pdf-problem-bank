/**
 * KPICard - 출결 KPI 카드 컴포넌트
 */
import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number;
  unit: string;
  icon: ReactNode;
  color?: 'green' | 'red' | 'blue';
  loading?: boolean;
}

export function KPICard({ label, value, unit, icon, color, loading }: KPICardProps) {
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
  };

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-grey-500 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-grey-100 rounded animate-pulse" />
      ) : (
        <div className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-grey-900'}`}>
          {value}
          <span className="text-sm font-medium text-grey-500 ml-1">{unit}</span>
        </div>
      )}
    </div>
  );
}
