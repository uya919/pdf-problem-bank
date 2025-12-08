/**
 * LinkedBadge 컴포넌트
 *
 * Phase 22-K: 문제-해설 연결 관계 시각화 배지
 *
 * 문제 그룹에는 "해설: 1번 [해설]" 표시
 * 해설 그룹에는 "문제: 1번" 표시
 */
import { Link2, FileText, BookOpen, ExternalLink, X } from 'lucide-react';

interface LinkedBadgeProps {
  /** 이 그룹의 역할: problem이면 해설과 연결됨, solution이면 문제와 연결됨 */
  linkType: 'problem' | 'solution';
  /** 연결된 그룹의 표시 이름 */
  linkedName: string;
  /** 연결된 문서로 이동 */
  onNavigate?: () => void;
  /** 연결 해제 */
  onUnlink?: () => void;
  /** 컴팩트 모드 (작은 공간에서 사용) */
  compact?: boolean;
}

export function LinkedBadge({
  linkType,
  linkedName,
  onNavigate,
  onUnlink,
  compact = false
}: LinkedBadgeProps) {
  // problem이면 해설과 연결된 것, solution이면 문제와 연결된 것
  const isProblem = linkType === 'problem';
  const label = isProblem ? '해설:' : '문제:';

  if (compact) {
    return (
      <div
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs
          ${isProblem ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}
        `}
        title={`${label} ${linkedName}`}
      >
        <Link2 className="w-3 h-3" />
        {isProblem ? (
          <BookOpen className="w-3 h-3" />
        ) : (
          <FileText className="w-3 h-3" />
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
        ${isProblem
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
        }
      `}
    >
      <Link2 className="w-3 h-3 flex-shrink-0" />
      {isProblem ? (
        <BookOpen className="w-3 h-3 flex-shrink-0" />
      ) : (
        <FileText className="w-3 h-3 flex-shrink-0" />
      )}
      <span className="font-medium whitespace-nowrap">
        {label}
      </span>
      <span className="truncate max-w-[100px]" title={linkedName}>
        {linkedName}
      </span>

      {onNavigate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className={`
            p-0.5 rounded transition-colors flex-shrink-0
            ${isProblem
              ? 'hover:bg-green-100'
              : 'hover:bg-blue-100'
            }
          `}
          title="연결된 문서로 이동"
          aria-label={`연결된 ${isProblem ? '해설' : '문제'}로 이동`}
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      )}

      {onUnlink && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
          className="p-0.5 rounded text-grey-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
          title="연결 해제"
          aria-label="연결 해제"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
