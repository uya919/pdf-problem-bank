/**
 * AdminTopNav - 관리자 상단 네비게이션
 *
 * v5 디자인: 64px 높이, 고정 위치
 * - 왼쪽: 로고 + 메뉴 탭
 * - 오른쪽: 역할 토글 + 과목 필터 + 아이콘 버튼 + 설정 드롭다운 + 사용자 프로필
 *
 * 반응형:
 * - < 768px: 로고만, 메뉴는 드롭다운
 * - 768px ~ 1024px: 메뉴 스크롤, 일부 아이콘 숨김
 * - >= 1024px: 전체 표시
 *
 * Phase 8-8: 역할별 네비게이션
 * Stage 29-E: RoleToggle 추가 (강사↔관리자 전환)
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { SubjectSelector } from './SubjectSelector';
import { RoleToggle } from '../RoleToggle';
import { useAuth } from '../../../contexts/AuthContext';
import { ChangePasswordModal } from '../../auth/ChangePasswordModal';
import { Settings, LayoutGrid } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  shortLabel?: string;
}

const navItems: NavItem[] = [
  { path: '/admin', label: '대시보드', shortLabel: '홈' },
  { path: '/admin/grade-overview', label: '반', shortLabel: '반' },
  { path: '/admin/students', label: '학생' },
  { path: '/admin/consultations', label: '상담' },
  // { path: '/admin/attendance', label: '출결' }, // 임시 숨김
  { path: '/admin/operations', label: '운영' },
  // 순환수업은 운영 페이지 좌측 사이드바로 이동
];

interface AdminTopNavProps {
  userName?: string;
  userRole?: string;
}

export function AdminTopNav({
  userName = '김수학',
  userRole = '수학 관리자'
}: AdminTopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // 실제 사용자 정보
  const displayName = profile?.name || userName;
  const displayRole = profile?.role === 'owner' ? '원장' : profile?.role === 'admin' ? '관리자' : userRole;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 현재 경로와 가장 일치하는 네비게이션 아이템 찾기
  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  // 현재 활성 메뉴 이름
  const activeItem = navItems.find((item) => isActive(item.path));

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-grey-200 flex items-center justify-between px-3 md:px-4 lg:px-6 z-[100]">
      {/* 왼쪽: 로고 + 메뉴 */}
      <div className="flex items-center gap-2 md:gap-4 lg:gap-8 flex-1 min-w-0">
        {/* 로고 */}
        <Link to="/admin" className="flex items-center gap-2 no-underline flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            혜
          </div>
          <span className="text-lg font-bold text-grey-900 hidden sm:block">혜윰</span>
        </Link>

        {/* 모바일: 드롭다운 메뉴 */}
        {isMobile ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-grey-100 rounded-lg text-sm font-medium text-grey-900"
            >
              {activeItem?.shortLabel || activeItem?.label || '메뉴'}
              <svg className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-grey-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`
                      block px-4 py-2.5 text-sm no-underline
                      ${isActive(item.path)
                        ? 'text-blue-600 bg-blue-50 font-medium'
                        : 'text-grey-700 hover:bg-grey-50'
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 태블릿/PC: 메뉴 탭 (가로 스크롤 가능) */
          <div className="overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-3 lg:px-4 py-2 text-sm font-medium rounded-lg transition-all no-underline whitespace-nowrap flex-shrink-0
                    ${isActive(item.path)
                      ? 'text-grey-900 bg-grey-100'
                      : 'text-grey-500 hover:text-grey-700 hover:bg-grey-50'
                    }
                  `}
                >
                  {isTablet ? (item.shortLabel || item.label) : item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽: 역할 토글 + 과목 필터 + 아이콘 + 프로필 */}
      <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-shrink-0">
        {/* Stage 29-E: 역할 토글 - 태블릿 이상에서만 */}
        <div className="hidden md:block">
          <RoleToggle />
        </div>

        {/* 과목 필터 - 태블릿 이상에서만 */}
        <div className="hidden md:block">
          <SubjectSelector />
        </div>

        {/* 구분선 - PC에서만 */}
        <div className="hidden lg:block w-px h-6 bg-grey-200" />

        {/* 검색 버튼 - PC에서만 */}
        <button className="hidden lg:flex w-10 h-10 items-center justify-center text-grey-500 hover:bg-grey-50 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* 설정 드롭다운 - PC에서만 (원장 왼쪽) */}
        <div className="relative hidden lg:block" ref={settingsMenuRef}>
          <button
            onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            className={`
              w-10 h-10 flex items-center justify-center rounded-lg transition-colors
              ${settingsMenuOpen ? 'bg-grey-100 text-grey-900' : 'text-grey-500 hover:bg-grey-50 hover:text-grey-700'}
            `}
            title="설정"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* 설정 드롭다운 메뉴 */}
          {settingsMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-grey-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-grey-100">
                <p className="text-xs font-medium text-grey-500">도구</p>
              </div>
              <button
                onClick={() => {
                  setSettingsMenuOpen(false);
                  navigate('/admin/hyeyumjam');
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-grey-700 hover:bg-grey-50 flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4 text-blue-500" />
                HyeyumJam
              </button>
            </div>
          )}
        </div>

        {/* 사용자 프로필 - 드롭다운 메뉴 포함 */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-1.5 md:gap-2 py-1.5 pl-1.5 pr-2 md:pr-3 bg-grey-50 rounded-full cursor-pointer hover:bg-grey-100 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
              {displayName.charAt(0)}
            </div>
            <span className="hidden md:block text-sm font-medium text-grey-900">{displayName}</span>
            <span className="hidden lg:block text-xs text-grey-500">{displayRole}</span>
            <svg className={`w-4 h-4 text-grey-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 드롭다운 메뉴 */}
          {profileMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-grey-200 rounded-xl shadow-lg py-1 z-50">
              {/* 사용자 정보 */}
              <div className="px-4 py-3 border-b border-grey-100">
                <p className="text-sm font-medium text-grey-900">{displayName}</p>
                <p className="text-xs text-grey-500">{displayRole}</p>
              </div>

              {/* 비밀번호 변경 */}
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  setShowPasswordModal(true);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-grey-700 hover:bg-grey-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                비밀번호 변경
              </button>

              {/* 강사 모드로 전환 */}
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/backoffice');
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-grey-700 hover:bg-grey-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                강사 모드로 전환
              </button>

              {/* 사용자 관리 (owner만) */}
              {profile?.role === 'owner' && (
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/admin/users');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-grey-700 hover:bg-grey-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  사용자 관리
                </button>
              )}

              {/* 로그아웃 */}
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </nav>
  );
}
