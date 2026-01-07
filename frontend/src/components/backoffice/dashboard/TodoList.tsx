/**
 * TodoList - 오늘 할 일 목록 컴포넌트
 *
 * 목업: dashboard-modal-final.html 기준
 * - "오늘 할 일" 섹션 타이틀
 * - 아이콘 + 제목 + 뱃지 형식
 * - 체크박스 없음 (목업 기준)
 */
import { ChecklistIcon } from '../../ui/Icons';

interface Todo {
  id: string;
  title: string;      // "출결 미입력"
  subtitle: string;   // "중1C반, 중2B반"
  count: string;      // "2건"
  icon: string;       // "✓"
  bgColor: string;    // "#E8F5E9"
}

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* 섹션 타이틀 */}
      <h3 className="text-sm font-semibold text-[#333D4B] mb-3 flex items-center gap-1.5">
        <ChecklistIcon size={16} className="text-gray-600" />
        <span>오늘 할 일</span>
      </h3>

      {/* 카드 */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {todos.map((todo, index) => (
          <div
            key={todo.id}
            className={`flex items-center p-3.5 ${
              index !== todos.length - 1 ? 'border-b border-[#F2F4F6]' : ''
            }`}
          >
            {/* 아이콘 박스 - 목업 스타일 */}
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center mr-3 text-[15px] flex-shrink-0"
              style={{ backgroundColor: todo.bgColor }}
            >
              {todo.icon}
            </div>

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#191F28]">
                {todo.title}
              </div>
              <div className="text-xs text-[#6B7684] mt-0.5">
                {todo.subtitle}
              </div>
            </div>

            {/* 뱃지 - 빨간색 */}
            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-[#FFEBEE] text-[#F04452]">
              {todo.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
