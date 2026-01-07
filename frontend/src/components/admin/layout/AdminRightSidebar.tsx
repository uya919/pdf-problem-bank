/**
 * AdminRightSidebar - 접을 수 있는 우측 사이드바
 *
 * v5 디자인:
 * - 접힘: 56px (아이콘만 표시)
 * - 펼침: 280px (전체 콘텐츠 표시)
 * - 기본값: 접힌 상태
 */
import { useState, ReactNode } from 'react';
import {
  Check,
  FileText,
  BookOpen,
  User,
  ClipboardList,
  Bell,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';

interface QuickAction {
  icon: ReactNode;
  label: string;
  badge?: number;
  color: 'blue' | 'green' | 'orange';
}

interface Alert {
  type: 'warning' | 'info';
  message: string;
}

interface AdminRightSidebarProps {
  userName?: string;
  userRole?: string;
  stats?: {
    classes: number;
    students: number;
    attendanceRate: number;
  };
  quickActions?: QuickAction[];
  alerts?: Alert[];
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function AdminRightSidebar({
  userName = '김수학',
  userRole = '수학 관리자',
  stats = { classes: 8, students: 68, attendanceRate: 96 },
  quickActions = [
    { icon: <Check className="w-4 h-4" />, label: '출결 체크', badge: 3, color: 'blue' },
    { icon: <FileText className="w-4 h-4" />, label: '진도 기록', badge: 2, color: 'green' },
    { icon: <BookOpen className="w-4 h-4" />, label: '숙제 확인', badge: 8, color: 'orange' },
  ],
  alerts = [
    { type: 'warning', message: '중3C반 숙제 미제출 4명' },
    { type: 'warning', message: '중2A반 결석 1명 (김○○)' },
    { type: 'warning', message: '고1B반 지각 1명 (박○○)' },
    { type: 'info', message: '겨울방학 특강 안내' },
    { type: 'info', message: '12/20 휴원 공지' },
  ],
  defaultExpanded = false,
  onExpandedChange,
}: AdminRightSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    onExpandedChange?.(newValue);
  };

  const colorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
  };

  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const totalBadges = quickActions.reduce((sum, a) => sum + (a.badge || 0), 0);

  return (
    <aside
      className={`
        fixed top-16 right-0 h-[calc(100vh-64px)] bg-white border-l border-grey-200
        transition-all duration-250 ease-out z-50 overflow-hidden
        ${isExpanded ? 'w-[280px]' : 'w-14'}
      `}
    >
      {/* 토글 버튼 */}
      <button
        onClick={handleToggle}
        className="absolute top-4 left-0 -translate-x-1/2 w-6 h-6 bg-white border border-grey-200 rounded-full flex items-center justify-center text-grey-500 hover:text-grey-700 hover:border-blue-500 hover:bg-grey-50 transition-all z-10"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-250 ${isExpanded ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* 접힌 상태: 아이콘들 */}
      <div
        className={`
          absolute inset-0 flex flex-col items-center pt-14 gap-1
          transition-opacity duration-150
          ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <IconButton icon={<User className="w-5 h-5" />} tooltip="내 정보" onClick={handleToggle} />
        <IconButton icon={<ClipboardList className="w-5 h-5" />} tooltip={`할 일 (${totalBadges})`} badge={totalBadges} badgeColor="blue" onClick={handleToggle} />
        <IconButton icon={<Check className="w-5 h-5" />} tooltip={`출결 미입력 (${quickActions[0]?.badge || 0})`} badge={quickActions[0]?.badge} onClick={handleToggle} />
        <IconButton icon={<Bell className="w-5 h-5" />} tooltip={`알림 (${alerts.length})`} badge={warningCount} onClick={handleToggle} />
      </div>

      {/* 펼친 상태: 전체 콘텐츠 */}
      <div
        className={`
          h-full overflow-y-auto p-5 pt-12
          transition-opacity duration-150
          ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* 내 정보 */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">
            내 정보
          </h3>
          <div className="bg-grey-50 rounded-xl p-4">
            <div className="text-base font-semibold text-grey-900">{userName}</div>
            <div className="text-sm text-blue-500 font-medium mt-0.5">{userRole}</div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-grey-200">
              <div className="text-center">
                <div className="text-lg font-bold text-grey-900">{stats.classes}</div>
                <div className="text-xs text-grey-500">담당 반</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-grey-900">{stats.students}</div>
                <div className="text-xs text-grey-500">학생</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-grey-900">{stats.attendanceRate}%</div>
                <div className="text-xs text-grey-500">출석률</div>
              </div>
            </div>
          </div>
        </section>

        {/* 빠른 액션 */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">
            빠른 액션
          </h3>
          <div className="space-y-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                className="w-full flex items-center justify-between p-3.5 bg-white border border-grey-200 rounded-xl hover:bg-grey-50 hover:border-blue-500 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${colorClasses[action.color]}`}>
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium text-grey-900">{action.label}</span>
                </div>
                {action.badge && (
                  <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                    {action.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 알림 */}
        <section>
          <h3 className="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">
            알림 <span className="text-red-500">({alerts.length})</span>
          </h3>
          <div className="space-y-0">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 py-2.5 border-b border-grey-100 last:border-b-0"
              >
                <div
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                    ${alert.type === 'warning' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}
                  `}
                >
                  {alert.type === 'warning' ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Megaphone className="w-3 h-3" />
                  )}
                </div>
                <span className="text-sm text-grey-600 leading-snug">{alert.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

// 아이콘 버튼 (접힌 상태용)
function IconButton({
  icon,
  tooltip,
  badge,
  badgeColor = 'red',
  onClick,
}: {
  icon: ReactNode;
  tooltip: string;
  badge?: number;
  badgeColor?: 'red' | 'blue';
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-grey-50 transition-colors relative group text-grey-500"
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span
          className={`
            absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] font-semibold text-white rounded-full flex items-center justify-center
            ${badgeColor === 'blue' ? 'bg-blue-500' : 'bg-red-500'}
          `}
        >
          {badge}
        </span>
      )}
      {/* 툴팁 */}
      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-grey-900 text-white text-xs font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
        {tooltip}
        <span className="absolute left-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-grey-900" />
      </span>
    </button>
  );
}
