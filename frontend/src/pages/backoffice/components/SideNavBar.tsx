/**
 * SideNavBar - 태블릿/데스크톱용 좌측 네비게이션 바
 *
 * 연구 결과 (323_tablet_navigation_and_error_research.md):
 * - 64px 미니 사이드바
 * - 아이콘 + 라벨 세로 배치
 * - 토스 디자인 원칙: Focus, Simple, Immediate, Consistent
 */
import { useNavigate, useLocation } from 'react-router-dom';

type TabId = 'home' | 'classes' | 'students' | 'records' | 'more';

export function SideNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 경로에서 활성 탭 결정
  const getActiveTab = (): TabId => {
    const path = location.pathname;
    if (path.startsWith('/classes')) return 'classes';
    if (path.startsWith('/students')) return 'students';
    if (path.startsWith('/records')) return 'records';
    if (path.startsWith('/more')) return 'more';
    return 'home';
  };

  const active = getActiveTab();

  const tabs: { id: TabId; icon: string; label: string; path: string }[] = [
    { id: 'home', icon: 'home', label: '홈', path: '/backoffice' },
    { id: 'classes', icon: 'book', label: '수업', path: '/classes' },
    { id: 'students', icon: 'users', label: '학생', path: '/students' },
    { id: 'records', icon: 'edit', label: '기록', path: '/records' },
  ];

  return (
    <nav className="w-16 h-full flex flex-col bg-white border-r border-[#F2F4F6] flex-shrink-0">
      {/* 상단: 로고 */}
      <div className="h-16 flex items-center justify-center border-b border-[#F2F4F6]">
        <div className="w-8 h-8 bg-[#3182F6] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">혜</span>
        </div>
      </div>

      {/* 중앙: 네비게이션 메뉴 */}
      <div className="flex-1 flex flex-col items-center py-4 gap-1">
        {tabs.map((tab) => (
          <NavItem
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            active={active === tab.id}
            onClick={() => navigate(tab.path)}
          />
        ))}
      </div>

      {/* 하단: 더보기/설정 */}
      <div className="pb-4 flex flex-col items-center">
        <NavItem
          icon="more"
          label="더보기"
          active={active === 'more'}
          onClick={() => navigate('/more')}
        />
      </div>
    </nav>
  );
}

/**
 * 네비게이션 아이템 (세로 배치)
 */
function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const color = active ? '#3182F6' : '#8B95A1';
  const bgColor = active ? 'bg-[#EBF4FF]' : 'hover:bg-[#F9FAFB]';

  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
    book: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    users: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    ),
    edit: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    more: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="19" r="1" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all ${bgColor}`}
      style={{ color }}
    >
      {icons[icon]}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default SideNavBar;
