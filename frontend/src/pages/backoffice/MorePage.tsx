/**
 * MorePage - 더보기 페이지
 *
 * Phase 5 구현:
 * - 프로필 카드 (통계 포함)
 * - 관리 메뉴 (아이콘 박스 스타일)
 * - 설정 메뉴
 * - 로그아웃
 *
 * Phase 8-8: 역할별 네비게이션
 * - admin/owner: 관리자 모드 전환 메뉴 추가
 */
import { useNavigate } from 'react-router-dom';
import { BottomNavBar } from './components/BottomNavBar';
import { useAuth } from '../../contexts/AuthContext';

interface MenuItem {
  icon: React.ReactNode;
  iconBgColor: string;
  label: string;
  badge?: number;
  subLabel?: string;
  onClick?: () => void;
}

export default function MorePage() {
  const navigate = useNavigate();
  const { isAdmin, isOwner, profile, signOut } = useAuth();

  // 관리자/원장만 볼 수 있는 관리자 모드 전환 메뉴
  const showAdminSwitch = isAdmin || isOwner;

  // 로그아웃 처리
  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // 관리 메뉴
  const managementMenus: MenuItem[] = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      iconBgColor: 'bg-[#FFF3E0]',
      label: '공지사항',
      badge: 2,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      iconBgColor: 'bg-[#E3F2FD]',
      label: '회의 관리',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      ),
      iconBgColor: 'bg-[#E8F5E9]',
      label: '신규 상담/등록',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B1FA2" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
      iconBgColor: 'bg-[#F3E5F5]',
      label: '교재 관리',
    },
  ];

  // 설정 메뉴
  const settingsMenus: MenuItem[] = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
      iconBgColor: 'bg-[#F2F4F6]',
      label: '알림 설정',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      iconBgColor: 'bg-[#F2F4F6]',
      label: '앱 정보',
      subLabel: 'v1.0.0',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      iconBgColor: 'bg-[#F2F4F6]',
      label: '고객센터',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-[#F2F4F6]">
        <div className="text-[20px] font-bold text-[#191F28]">더보기</div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4 space-y-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3182F6] to-[#00C896] flex items-center justify-center text-white text-xl font-bold">
              {profile?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="text-[17px] font-bold text-[#191F28]">{profile?.name || '사용자'}</div>
              <div className="text-[13px] text-[#8B95A1]">
                {profile?.role === 'owner' ? '원장' : profile?.role === 'admin' ? '관리자' : '강사'}
              </div>
            </div>
            <button className="px-3 py-1.5 bg-[#F2F4F6] text-[#6B7684] text-[12px] font-medium rounded-lg hover:bg-[#E5E8EB] transition-colors">
              프로필 편집
            </button>
          </div>

          {/* 통계 요약 */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#F2F4F6]">
            <div className="text-center">
              <div className="text-[18px] font-bold text-[#191F28]">12</div>
              <div className="text-[11px] text-[#8B95A1]">담당 학생</div>
            </div>
            <div className="text-center">
              <div className="text-[18px] font-bold text-[#191F28]">5</div>
              <div className="text-[11px] text-[#8B95A1]">수업 반</div>
            </div>
            <div className="text-center">
              <div className="text-[18px] font-bold text-[#3182F6]">89%</div>
              <div className="text-[11px] text-[#8B95A1]">출석률</div>
            </div>
          </div>
        </div>

        {/* 관리 메뉴 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="text-[13px] font-semibold text-[#8B95A1] px-4 pt-4 pb-2">관리</div>
          {managementMenus.map((menu, idx) => (
            <MenuItemRow key={idx} menu={menu} />
          ))}
        </div>

        {/* 관리자 전환 메뉴 (admin/owner만) */}
        {showAdminSwitch && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="text-[13px] font-semibold text-[#8B95A1] px-4 pt-4 pb-2">관리자 메뉴</div>
            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2">
                    <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[15px] text-[#191F28]">관리자 모드로 전환</span>
                  <p className="text-[12px] text-[#8B95A1]">학원 전체 관리 페이지</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}

        {/* 설정 메뉴 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="text-[13px] font-semibold text-[#8B95A1] px-4 pt-4 pb-2">설정</div>
          {settingsMenus.map((menu, idx) => (
            <MenuItemRow key={idx} menu={menu} />
          ))}
        </div>

        {/* 로그아웃 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-4 text-[15px] text-[#F04452] font-medium hover:bg-[#FFF5F5] transition-colors"
          >
            로그아웃
          </button>
        </div>

        {/* 버전 정보 */}
        <div className="text-center text-[12px] text-[#B0B8C1] py-2">
          혜윰 학원 관리 시스템 v1.0.0
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <BottomNavBar active="more" />
    </div>
  );
}

function MenuItemRow({ menu }: { menu: MenuItem }) {
  return (
    <button
      onClick={menu.onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${menu.iconBgColor} flex items-center justify-center`}>
          {menu.icon}
        </div>
        <span className="text-[15px] text-[#191F28]">{menu.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {menu.badge && (
          <span className="px-2 py-0.5 bg-[#F04452] text-white text-[11px] font-bold rounded-full">
            {menu.badge}
          </span>
        )}
        {menu.subLabel && (
          <span className="text-[12px] text-[#8B95A1]">{menu.subLabel}</span>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B8C1" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  );
}
