/**
 * PlaceholderView - 미개발 기능 플레이스홀더
 */

interface PlaceholderViewProps {
  title: string;
  icon: string;
  description: string;
  badge?: string;
  badgeType?: 'warning' | 'info';
}

export function PlaceholderView({
  title,
  icon,
  description,
  badge,
  badgeType = 'warning',
}: PlaceholderViewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[500px]">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-grey-900 mb-2">{title}</h2>
      <p className="text-grey-500 text-center max-w-md">{description}</p>
      {badge && (
        <span
          className={`
            mt-4 px-3 py-1 text-sm font-medium rounded-full
            ${badgeType === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}
          `}
        >
          {badge}
        </span>
      )}
      <p className="mt-6 text-sm text-grey-400">이 기능은 개발 중입니다</p>
    </div>
  );
}
