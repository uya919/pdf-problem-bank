/**
 * AdminBottomNav - 관리자 모바일 하단 네비게이션
 *
 * 강사용 BottomNav와 비교:
 * - 강사: 홈, 수업, 학생, 기록, 더보기
 * - 관리자: 홈, 공지, 반, 학생, 설정
 *
 * 차이점:
 * - "수업" → "반" (전체 수업 모니터링)
 * - "기록" → "공지" (공지사항 등록/확인)
 */
import { useLocation, useNavigate } from 'react-router-dom';

// ============ 타입 정의 ============

type TabId = 'home' | 'notice' | 'classes' | 'students' | 'settings';

interface NavItem {
  id: TabId;
  label: string;
  path: string;
}

interface AdminBottomNavProps {
  badges?: Partial<Record<TabId, number>>;
}

// ============ 탭 설정 ============

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '홈', path: '/admin-mobile' },
  { id: 'notice', label: '공지', path: '/admin-mobile/notice' },
  { id: 'classes', label: '반', path: '/admin-mobile/classes' },
  { id: 'students', label: '학생', path: '/admin-mobile/students' },
  { id: 'settings', label: '설정', path: '/admin-mobile/settings' },
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

function NoticeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={active ? 0 : 2}
      viewBox="0 0 24 24"
    >
      {active ? (
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      ) : (
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-6 h-6 ${active ? 'text-[#3182F6]' : 'text-[#8B95A1]'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const ICONS: Record<TabId, React.FC<{ active: boolean }>> = {
  home: HomeIcon,
  notice: NoticeIcon,
  classes: ClassesIcon,
  students: StudentsIcon,
  settings: SettingsIcon,
};

// ============ 메인 컴포넌트 ============

export function AdminBottomNav({ badges = {} }: AdminBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = (): TabId => {
    const path = location.pathname;
    if (path.startsWith('/admin-mobile/notice')) return 'notice';
    if (path.startsWith('/admin-mobile/classes')) return 'classes';
    if (path.startsWith('/admin-mobile/students')) return 'students';
    if (path.startsWith('/admin-mobile/settings')) return 'settings';
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
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F04452] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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

export default AdminBottomNav;
