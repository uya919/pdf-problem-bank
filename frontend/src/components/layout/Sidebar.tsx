/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar with menu items
 */
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Edit3,
  Database,
  GitMerge,
  Activity,
  BarChart3,
  Settings,
  HelpCircle,
  FileUp,
  Library,
  ClipboardList,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route: string;
  badge?: number | string;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
    route: '/',
  },
  {
    id: 'documents',
    label: '문서 관리',
    icon: FileText,
    route: '/documents',
  },
  {
    id: 'labeling',
    label: '라벨링 작업',
    icon: Edit3,
    route: '/labeling',
  },
  {
    id: 'problem-bank',
    label: '문제은행',
    icon: Database,
    route: '/problems',
  },
  {
    id: 'hangul-upload',
    label: '한글 파일',
    icon: FileUp,
    route: '/hangul',
  },
  {
    id: 'integrated-bank',
    label: '통합 문제은행',
    icon: Library,
    route: '/bank',
  },
  {
    id: 'exam-builder',
    label: '시험지 빌더',
    icon: ClipboardList,
    route: '/exam-builder',
  },
  {
    id: 'solutions',
    label: '해설 연결',
    icon: GitMerge,
    route: '/solutions',
  },
  {
    id: 'tasks',
    label: '작업 관리',
    icon: Activity,
    route: '/tasks',
  },
  {
    id: 'statistics',
    label: '통계',
    icon: BarChart3,
    route: '/stats',
  },
];

const systemItems: NavItem[] = [
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    route: '/settings',
  },
  {
    id: 'help',
    label: '도움말',
    icon: HelpCircle,
    route: '/help',
  },
];

export function Sidebar() {
  const location = useLocation();

  const isActive = (route: string) => {
    if (route === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(route);
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-grey-200 bg-white">
      <div className="flex h-full flex-col">
        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.route);

              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    active
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700'
                      : 'text-grey-700 hover:bg-grey-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-colors',
                      active ? 'text-blue-600' : 'text-grey-500 group-hover:text-grey-700'
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <Badge variant={active ? 'primary' : 'default'}>
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* System Navigation */}
        <div className="border-t border-grey-200 p-4">
          <div className="space-y-1">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.route);

              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                    active
                      ? 'bg-grey-100 text-grey-900'
                      : 'text-grey-600 hover:bg-grey-50 hover:text-grey-900'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      active ? 'text-grey-700' : 'text-grey-400 group-hover:text-grey-600'
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
