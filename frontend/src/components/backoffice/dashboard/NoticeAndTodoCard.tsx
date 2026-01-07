/**
 * NoticeAndTodoCard - 공지 + 할일 통합 카드
 *
 * 목업: dashboard-layout-v2.html 기준
 * - 요약 헤더 (공지 N개 · 할일 N개)
 * - 공지: 리스트 형태 (항상 표시)
 * - 할일: 뱃지 형태 (항상 표시)
 */
import { BellIcon, ChecklistIcon } from '../../ui/Icons';

interface Notice {
  id: string;
  title: string;
  meta?: string;
  read: boolean;
}

interface Todo {
  id: string;
  title: string;
  subtitle?: string;
  count: string;
  icon: string;
  bgColor: string;
}

interface NoticeAndTodoCardProps {
  notices: Notice[];
  todos: Todo[];
  onToggleNotice?: (id: string) => void;
  onTodoClick?: (id: string) => void;
}

// 뱃지 색상 매핑
const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  '#E8F5E9': { bg: 'bg-green-50', text: 'text-green-700' },
  '#E3F2FD': { bg: 'bg-blue-50', text: 'text-blue-700' },
  '#FFF3E0': { bg: 'bg-orange-50', text: 'text-orange-700' },
};

export function NoticeAndTodoCard({
  notices,
  todos,
  onToggleNotice,
  onTodoClick,
}: NoticeAndTodoCardProps) {
  const unreadCount = notices.filter((n) => !n.read).length;
  const todoCount = todos.length;

  // 공지와 할일 모두 없는 경우
  if (notices.length === 0 && todos.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-center py-6 text-gray-500">
          <span className="text-2xl mb-2 block">🎉</span>
          <p>오늘 할 일을 모두 완료했어요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* 요약 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <BellIcon size={16} />
          <span>공지</span>
          <span className="font-semibold text-gray-900">{unreadCount}</span>
        </div>
        <span className="text-gray-300">·</span>
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <ChecklistIcon size={16} />
          <span>할일</span>
          <span className="font-semibold text-gray-900">{todoCount}</span>
        </div>
      </div>

      {/* 공지사항 (항상 표시) */}
      {notices.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          {notices.slice(0, 3).map((notice, index) => (
            <div
              key={notice.id}
              className={`flex items-start gap-2 ${
                index > 0 ? 'pt-2 mt-2 border-t border-gray-50' : ''
              } ${notice.read ? 'opacity-50' : ''}`}
              onClick={() => onToggleNotice?.(notice.id)}
            >
              {/* 빨간 점 */}
              <div
                className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                  notice.read ? 'bg-gray-300' : 'bg-red-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{notice.title}</p>
                {notice.meta && (
                  <p className="text-xs text-gray-400 mt-0.5">{notice.meta}</p>
                )}
              </div>
            </div>
          ))}
          {notices.length > 3 && (
            <button className="w-full text-center text-xs text-[#3182F6] mt-2 py-1">
              외 {notices.length - 3}개 더보기
            </button>
          )}
        </div>
      )}

      {/* 할일 뱃지 (항상 표시, 1줄) */}
      {todos.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex gap-2">
            {todos.map((todo) => {
              const colors = BADGE_COLORS[todo.bgColor] || {
                bg: 'bg-gray-100',
                text: 'text-gray-700',
              };

              return (
                <button
                  key={todo.id}
                  onClick={() => onTodoClick?.(todo.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-2xl text-[13px] font-semibold whitespace-nowrap transition-transform hover:scale-105 ${colors.bg} ${colors.text}`}
                >
                  <span className="text-xs">{todo.icon}</span>
                  <span>{todo.title} {todo.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default NoticeAndTodoCard;
