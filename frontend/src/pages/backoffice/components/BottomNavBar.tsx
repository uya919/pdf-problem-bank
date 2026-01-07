/**
 * BottomNavBar - 공통 하단 네비게이션 바
 *
 * 모바일/태블릿 통합 네비게이션 (324번 연구 리포트)
 * - 5개 탭: 홈, 수업, 학생, 기록, 더보기
 * - 활성 탭 파란색 강조
 * - 태블릿: 아이콘/터치영역 확대, 중앙 정렬
 */
import { useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../../../hooks/useIsMobile';

type TabId = 'home' | 'classes' | 'students' | 'records' | 'more';

interface BottomNavBarProps {
  active: TabId;
}

export function BottomNavBar({ active }: BottomNavBarProps) {
  const navigate = useNavigate();
  const { isTabletOrAbove } = useBreakpoint();

  const tabs: { id: TabId; icon: string; label: string; path: string }[] = [
    { id: 'home', icon: 'home', label: '홈', path: '/backoffice' },
    { id: 'classes', icon: 'book', label: '수업', path: '/classes' },
    { id: 'students', icon: 'users', label: '학생', path: '/students' },
    { id: 'records', icon: 'edit', label: '기록', path: '/records' },
    { id: 'more', icon: 'more', label: '더보기', path: '/more' },
  ];

  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F4F6] z-50
        flex items-center
        ${isTabletOrAbove ? 'h-16 justify-center' : 'h-[60px]'}
      `}
    >
      {/* 태블릿: 최대 너비 제한 + 균등 분배 */}
      <div
        className={`
          flex items-center w-full
          ${isTabletOrAbove ? 'max-w-lg justify-evenly' : ''}
        `}
      >
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={active === tab.id}
            onClick={() => navigate(tab.path)}
            isTablet={isTabletOrAbove}
          />
        ))}
      </div>
    </nav>
  );
}

/**
 * 네비게이션 아이템
 * - 모바일: 22px 아이콘, flex-1
 * - 태블릿: 24px 아이콘, 64px 터치 영역
 */
function NavItem({
  icon,
  label,
  active = false,
  onClick,
  isTablet = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  isTablet?: boolean;
}) {
  const color = active ? '#3182F6' : '#8B95A1';
  const iconSize = isTablet ? 24 : 22;

  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
    book: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    users: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
    edit: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    more: (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95
        ${isTablet ? 'w-16 h-14' : 'flex-1 h-full'}
      `}
      style={{ color }}
    >
      {icons[icon]}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export default BottomNavBar;
