/**
 * MinimalSidebar Component
 * Phase 21.5: 3개 핵심 메뉴 사이드바
 *
 * 토스 스타일 - 심플하고 직관적인 네비게이션
 */
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  Library,
  FileText,
  Settings,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    icon: Upload,
    label: '등록 & 라벨링',
    path: '/',
    description: '파일 업로드, 수동 라벨링'
  },
  {
    icon: Library,
    label: '문제은행',
    path: '/bank',
    description: '문제 검색, 관리'
  },
  {
    icon: FileText,
    label: '시험지',
    path: '/exam',
    description: '시험지 생성'
  },
];

interface LabelingProgressProps {
  current: number;
  target: number;
}

function LabelingProgress({ current, target }: LabelingProgressProps) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-grey-600 font-medium">라벨링 진행률</span>
        <span className="text-toss-blue font-semibold">{current.toLocaleString()} / {target.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-grey-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-toss-blue to-blue-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-grey-500 mt-1.5">
        {percentage.toFixed(1)}% 완료 · 딥러닝 학습까지 {(target - current).toLocaleString()}페이지
      </p>
    </div>
  );
}

export function MinimalSidebar() {
  const location = useLocation();

  // TODO: API에서 실제 진행률 가져오기
  const labelingProgress = { current: 127, target: 1000 };

  return (
    <aside className="w-64 h-screen bg-white border-r border-grey-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-grey-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-toss-blue to-blue-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-grey-900 text-lg">문제은행</h1>
            <p className="text-xs text-grey-500">Math Problem Bank</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path === '/' && location.pathname.startsWith('/labeling'));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-toss-blue-light text-toss-blue'
                  : 'text-grey-600 hover:bg-grey-50'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-colors',
                isActive ? 'text-toss-blue' : 'text-grey-400 group-hover:text-grey-600'
              )} />
              <div className="flex-1">
                <span className={cn(
                  'font-medium text-sm',
                  isActive ? 'text-toss-blue' : 'text-grey-700'
                )}>
                  {item.label}
                </span>
                <p className={cn(
                  'text-xs mt-0.5',
                  isActive ? 'text-toss-blue/70' : 'text-grey-400'
                )}>
                  {item.description}
                </p>
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-toss-blue" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Labeling Progress */}
      <div className="border-t border-grey-100">
        <LabelingProgress
          current={labelingProgress.current}
          target={labelingProgress.target}
        />
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-grey-100">
        <NavLink
          to="/settings"
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200',
            location.pathname === '/settings'
              ? 'bg-grey-100 text-grey-900'
              : 'text-grey-500 hover:bg-grey-50 hover:text-grey-700'
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">설정</span>
        </NavLink>
      </div>
    </aside>
  );
}
