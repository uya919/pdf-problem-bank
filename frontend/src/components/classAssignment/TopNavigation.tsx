/**
 * 상단 네비게이션 바 (Phase 9-A)
 *
 * 목업 그대로 구현:
 * - 혜윰학원 로고
 * - 메뉴: 대시보드, 학년별현황, 학생관리(활성), 출결
 * - 우측: 단축키 버튼 + 사용자명
 */

interface TopNavigationProps {
  onShortcutClick: () => void;
}

export function TopNavigation({ onShortcutClick }: TopNavigationProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center px-6">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-gray-900">혜윰학원</span>
        <div className="flex gap-1">
          <a href="/admin" className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-lg">
            대시보드
          </a>
          <a href="/admin/grade-overview" className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-lg">
            학년별 현황
          </a>
          <a href="/admin/subject-assignment" className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-lg">
            학생 관리
          </a>
          <a href="/admin/attendance" className="px-4 py-2 text-gray-500 hover:text-gray-700 rounded-lg">
            출결
          </a>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <button
          onClick={onShortcutClick}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          단축키
        </button>
        <span className="text-sm text-gray-600">김수학 원장님</span>
      </div>
    </nav>
  );
}
