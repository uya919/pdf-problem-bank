/**
 * Phase 8-C: PageHeader
 *
 * 페이지 상단 헤더 컴포넌트
 * - 제목 + 설명
 * - 액션 버튼
 * - 탭 네비게이션 (선택)
 *
 * 반응형:
 * - < 768px: 제목/액션 세로 배치
 * - >= 768px: 가로 배치
 */
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  tabs?: ReactNode;
  breadcrumb?: { label: string; path?: string }[];
}

export function PageHeader({
  title,
  description,
  actions,
  tabs,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="mb-4 md:mb-6">
      {/* 브레드크럼 */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm text-grey-500 mb-2 md:mb-3 overflow-x-auto">
          {breadcrumb.map((item, index) => (
            <span key={index} className="flex items-center gap-1.5 whitespace-nowrap">
              {index > 0 && <span className="text-grey-300">/</span>}
              {item.path ? (
                <a href={item.path} className="hover:text-grey-700 transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-grey-900 font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* 제목 + 액션 - 반응형 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-grey-900 truncate">{title}</h1>
          {description && (
            <p className="text-sm md:text-base text-grey-500 mt-0.5 md:mt-1 truncate">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto pb-1 md:pb-0">
            {actions}
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      {tabs && (
        <div className="mt-3 md:mt-4 border-b border-grey-200 overflow-x-auto">
          {tabs}
        </div>
      )}
    </div>
  );
}

/**
 * 탭 버튼 컴포넌트
 */
interface TabButtonProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  count?: number;
}

export function TabButton({ children, active, onClick, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors
        ${active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-grey-500 hover:text-grey-700 hover:border-grey-300'
        }
      `}
    >
      {children}
      {count !== undefined && (
        <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
          active ? 'bg-blue-100 text-blue-600' : 'bg-grey-100 text-grey-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
