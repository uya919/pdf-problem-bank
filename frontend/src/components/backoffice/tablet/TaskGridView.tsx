/**
 * TaskGridView - 태블릿용 업무 카드 2열 그리드
 *
 * 목업: docs/mockups/tablet-dashboard-v2.html (790-825줄)
 *
 * 구조:
 * - 2열 그리드 레이아웃
 * - 공지사항 카드 (아이콘, 제목, 뱃지, 리스트)
 * - 출결 카드 (아이콘, 제목, 뱃지, 리스트)
 */
import type { ReactNode } from 'react';

// ============ 타입 정의 ============

interface NoticeItem {
  id: string;
  title: string;
  time?: string;
}

interface AttendanceIssue {
  id: string;
  className: string;
  studentName: string;
  issue: string; // "결석", "조퇴", "지각"
}

interface TaskGridViewProps {
  notices: NoticeItem[];
  attendanceIssues: AttendanceIssue[];
  onNoticeClick?: (id: string) => void;
  onAttendanceClick?: (id: string) => void;
}

// ============ 메인 컴포넌트 ============

export function TaskGridView({
  notices,
  attendanceIssues,
  onNoticeClick,
  onAttendanceClick,
}: TaskGridViewProps) {
  // 공지사항 아이템 변환
  const noticeItems = notices.map((n) => ({
    id: n.id,
    text: n.title + (n.time ? ` (${n.time})` : ''),
  }));

  // 출결 아이템 변환
  const attendanceItems = attendanceIssues.map((a) => ({
    id: a.id,
    text: `${a.className}: ${a.studentName} ${a.issue}`,
  }));

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* 공지사항 카드 */}
      <TaskCard
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        }
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        title="공지사항"
        badge={notices.length}
        items={noticeItems}
        emptyText="공지사항 없음"
        onItemClick={onNoticeClick}
      />

      {/* 출결 카드 */}
      <TaskCard
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        title="출결"
        badge={attendanceIssues.length}
        items={attendanceItems}
        emptyText="출결 이슈 없음"
        onItemClick={onAttendanceClick}
      />
    </div>
  );
}

// ============ 서브 컴포넌트 ============

interface TaskCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  badge: number;
  items: Array<{ id: string; text: string }>;
  emptyText?: string;
  onItemClick?: (id: string) => void;
}

function TaskCard({
  icon,
  iconBg,
  iconColor,
  title,
  badge,
  items,
  emptyText,
  onItemClick,
}: TaskCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
          <span className="text-[14px] font-semibold text-gray-900">{title}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            badge > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
          }`}
        >
          {badge}
        </span>
      </div>

      {/* 리스트 */}
      {items.length > 0 ? (
        <ul className="space-y-0">
          {items.map((item) => (
            <li
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
            >
              <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="text-[13px] text-gray-700">{item.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-4 text-[13px] text-gray-400">{emptyText}</div>
      )}
    </div>
  );
}

export default TaskGridView;
