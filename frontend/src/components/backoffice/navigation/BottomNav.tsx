/**
 * BottomNav - 하단 네비게이션 바
 *
 * 토스 스타일 하단 탭 네비게이션
 * - 5개 탭: 홈, 수업, 학생, 기록, 더보기
 * - 활성 탭 파란색 강조
 * - 뱃지 지원 (알림 개수)
 */
import { useLocation, useNavigate } from 'react-router-dom';

// ============ 타입 정의 ============

type TabId = 'home' | 'classes' | 'students' | 'records' | 'more';

interface NavItem {
  id: TabId;
  label: string;
  path: string;
  badge?: number;
}

interface BottomNavProps {
  badges?: Partial<Record<TabId, number>>;
}

// ============ 탭 설정 ============

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '홈', path: '/backoffice' },
  { id: 'classes', label: '수업', path: '/backoffice/classes' },
  { id: 'students', label: '학생', path: '/backoffice/students' },
  { id: 'records', label: '기록', path: '/backoffice/records' },
  { id: 'more', label: '더보기', path: '/backoffice/more' },
];

// ============ 아이콘 컴포넌트 ============

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 0 : 2}
      viewBox="0 0 24 24"
    >
      {active ? (
        <path d="M12 3L4 9v12h5v-7h6v7h5V9l-8-6z" />
      ) : (
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      )}
    </svg>
  );
}

function ClassesIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function StudentsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function RecordsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const ICONS: Record<TabId, React.FC<{ active: boolean }>> = {
  home: HomeIcon,
  classes: ClassesIcon,
  students: StudentsIcon,
  records: RecordsIcon,
  more: MoreIcon,
};

// ============ 메인 컴포넌트 ============

export function BottomNav({ badges = {} }: BottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // 현재 활성 탭 확인
  const getActiveTab = (): TabId => {
    const path = location.pathname;
    if (path.startsWith('/backoffice/classes')) return 'classes';
    if (path.startsWith('/backoffice/students')) return 'students';
    if (path.startsWith('/backoffice/records')) return 'records';
    if (path.startsWith('/backoffice/more')) return 'more';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F2F4F6] shadow-[0_-2px_10px_rgba(0,0,0,0.04)] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = ICONS[item.id];
          const badge = badges[item.id];

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center w-16 h-full transition-transform active:scale-95"
            >
              <div className="relative">
                <Icon active={isActive} />
                {badge && badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F04452] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 ${
                  isActive ? 'font-semibold text-[#3182F6]' : 'font-medium text-[#8B95A1]'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
