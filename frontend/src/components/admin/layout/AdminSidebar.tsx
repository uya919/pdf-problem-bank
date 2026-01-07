/**
 * Phase 8-A: AdminSidebar
 *
 * 관리자용 사이드바 네비게이션
 * - 토스 스타일 디자인
 * - 메뉴 그룹핑
 * - 접기/펼치기 기능 (Phase 8-D)
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarDays,
  FileText,
  ClipboardList,
  Settings,
  ChevronDown,
  ChevronRight,
  BookOpen,
  RefreshCw,
  BookMarked,
  Briefcase,
  MessageSquare,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/admin',
  },
  {
    id: 'grades',
    label: '학년별 현황',
    icon: <GraduationCap className="w-5 h-5" />,
    path: '/admin/grades',
  },
  {
    id: 'operations',
    label: '운영도구',
    icon: <Briefcase className="w-5 h-5" />,
    children: [
      { label: '반 관리', path: '/admin/classes' },
      { label: '시간표 관리', path: '/admin/classes/schedule' },
      { label: '사용자 관리', path: '/admin/users' },
      { label: '교재 관리', path: '/admin/textbooks' },
      { label: '학생 관리', path: '/admin/students' },
    ],
  },
  {
    id: 'rotation',
    label: '순환수업',
    icon: <RefreshCw className="w-5 h-5" />,
    path: '/admin/rotation',
  },
  {
    id: 'consultation',
    label: '상담 관리',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      { label: '신규 상담', path: '/admin/consultation/new' },
      { label: '학생 상담', path: '/admin/consultation/student' },
      { label: '상담 목록', path: '/admin/consultation/list' },
    ],
  },
  {
    id: 'exams',
    label: '시험 관리',
    icon: <ClipboardList className="w-5 h-5" />,
    path: '/admin/exams',
  },
  {
    id: 'reports',
    label: '리포트',
    icon: <FileText className="w-5 h-5" />,
    path: '/admin/reports',
  },
];

const BOTTOM_MENU: MenuItem[] = [
  {
    id: 'settings',
    label: '설정',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { label: '과목별 관리자', path: '/admin/settings/subject-managers' },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['operations', 'consultation']);

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]
    );
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const active = isActive(item.path);

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-lg
              text-grey-700 hover:bg-grey-100 transition-colors
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-grey-500">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-grey-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-grey-400" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-8 mt-1 space-y-1">
              {item.children?.map((child) => (
                <Link
                  key={child.path}
                  to={child.path}
                  className={`
                    block px-3 py-2 rounded-lg text-sm
                    ${isActive(child.path)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-grey-600 hover:bg-grey-100'
                    }
                    transition-colors
                  `}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        to={item.path || '#'}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg
          ${active
            ? 'bg-blue-50 text-blue-600'
            : 'text-grey-700 hover:bg-grey-100'
          }
          transition-colors
        `}
      >
        <span className={active ? 'text-blue-600' : 'text-grey-500'}>
          {item.icon}
        </span>
        <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-grey-200 flex flex-col">
      {/* 로고 영역 */}
      <div className="h-16 px-5 flex items-center border-b border-grey-100">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">혜</span>
          </div>
          <span className="text-lg font-bold text-grey-900">혜윰 관리</span>
        </Link>
      </div>

      {/* 메인 메뉴 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map(renderMenuItem)}
      </nav>

      {/* 하단 메뉴 */}
      <div className="p-3 border-t border-grey-100 space-y-1">
        {BOTTOM_MENU.map(renderMenuItem)}

        {/* 강사용 모바일 전환 링크 */}
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-grey-600 hover:bg-grey-100 transition-colors"
        >
          <span className="text-grey-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
          </span>
          <span className="text-sm font-medium">강사용 모바일</span>
        </Link>
      </div>
    </aside>
  );
}
