/**
 * Phase 65-A: 빈 상태 컴포넌트
 *
 * 검색 결과 없음, 데이터 없음 등에 사용
 */
import { Search, FileQuestion, BookOpen } from 'lucide-react';

type EmptyType = 'search' | 'problems' | 'documents' | 'default';

interface EmptyStateProps {
  type?: EmptyType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const defaultContent: Record<EmptyType, { icon: React.ReactNode; title: string; description: string }> = {
  search: {
    icon: <Search className="w-12 h-12 text-grey-300" />,
    title: '찾는 문제가 없어요',
    description: '다른 검색어를 입력해 보세요',
  },
  problems: {
    icon: <FileQuestion className="w-12 h-12 text-grey-300" />,
    title: '아직 등록된 문제가 없어요',
    description: '문제를 내보내기 하면 이곳에 표시돼요',
  },
  documents: {
    icon: <BookOpen className="w-12 h-12 text-grey-300" />,
    title: '등록된 교재가 없어요',
    description: 'PDF를 업로드하고 문제를 내보내면 여기에 표시돼요',
  },
  default: {
    icon: <FileQuestion className="w-12 h-12 text-grey-300" />,
    title: '데이터가 없어요',
    description: '',
  },
};

export function EmptyState({ type = 'default', title, description, action }: EmptyStateProps) {
  const content = defaultContent[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-4">
        {content.icon}
      </div>
      <p className="text-lg font-medium text-grey-700 text-center">
        {title || content.title}
      </p>
      {(description || content.description) && (
        <p className="text-sm text-grey-500 mt-1 text-center">
          {description || content.description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-toss-blue text-white rounded-xl text-sm font-medium hover:bg-toss-blue-dark transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
