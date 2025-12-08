/**
 * SearchResultItem Component (Phase 34.5-F)
 *
 * 검색 결과 항목 - 하이라이트 + 상태 표시
 */
import { FileText, Check, AlertCircle } from 'lucide-react';
import type { DocumentCombo } from '../../lib/documentParser';

interface SearchResultItemProps {
  combo: DocumentCombo;
  query: string;
  onClick: () => void;
}

export function SearchResultItem({ combo, query, onClick }: SearchResultItemProps) {
  // 검색어 하이라이트
  const highlightText = (text: string) => {
    if (!query.trim()) return text;

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let result = text;

    terms.forEach((term) => {
      const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
      result = result.replace(
        regex,
        '<mark class="bg-yellow-200 text-yellow-900 rounded px-0.5">$1</mark>'
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-grey-50 transition-colors text-left"
    >
      {/* 아이콘 */}
      <div
        className={`
        p-2 rounded-lg flex-shrink-0
        ${combo.isComplete ? 'bg-green-100' : 'bg-amber-100'}
      `}
      >
        <FileText
          className={`w-5 h-5 ${combo.isComplete ? 'text-green-600' : 'text-amber-600'}`}
        />
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-grey-900">
          {highlightText(`${combo.grade} ${combo.course}`)}
        </div>
        <div className="text-sm text-grey-500 truncate">
          {highlightText(combo.series)}
        </div>
      </div>

      {/* 상태 */}
      <div className="flex items-center gap-1 text-xs flex-shrink-0">
        {combo.isComplete ? (
          <span className="flex items-center gap-1 text-green-600">
            <Check className="w-3 h-3" />
            완비
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="w-3 h-3" />
            일부
          </span>
        )}
      </div>
    </button>
  );
}

// 정규식 특수문자 이스케이프
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
