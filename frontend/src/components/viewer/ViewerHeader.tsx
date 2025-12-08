/**
 * ViewerHeader 컴포넌트
 * Phase 22-H-3: 듀얼 윈도우 뷰어 헤더
 *
 * 역할 배지, 문서명, 세션 상태 표시
 */
import { FileText, BookOpen, Keyboard, Link2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ViewerHeaderProps {
  documentName: string;
  totalPages: number;
  role: 'problem' | 'solution' | null;
  sessionId: string | null;
  isDualMode: boolean;
  onShowShortcuts?: () => void;
}

/** 역할 배지 컴포넌트 */
function RoleBadge({ role }: { role: 'problem' | 'solution' }) {
  const isProblem = role === 'problem';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
        isProblem
          ? 'bg-toss-blue text-white'
          : 'bg-purple-500 text-white'
      )}
    >
      {isProblem ? (
        <FileText className="w-4 h-4" />
      ) : (
        <BookOpen className="w-4 h-4" />
      )}
      {isProblem ? '문제 PDF' : '해설 PDF'}
    </div>
  );
}

/** 세션 상태 표시 */
function SessionStatus({ sessionId }: { sessionId: string }) {
  // 세션 ID 짧게 표시 (앞 8자리)
  const shortId = sessionId.slice(0, 8);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-lg text-sm text-grey-600">
      <Link2 className="w-4 h-4" />
      <span>세션: {shortId}...</span>
    </div>
  );
}

export function ViewerHeader({
  documentName,
  totalPages,
  role,
  sessionId,
  isDualMode,
  onShowShortcuts,
}: ViewerHeaderProps) {
  return (
    <header className="flex-shrink-0 bg-white border-b border-grey-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 좌측: 역할 배지 + 문서명 */}
        <div className="flex items-center gap-4">
          {/* 듀얼 모드일 때만 역할 배지 표시 */}
          {isDualMode && role && (
            <RoleBadge role={role} />
          )}

          <div>
            <h1 className="text-lg font-semibold text-grey-900">
              {documentName}
            </h1>
            <p className="text-sm text-grey-500">
              {totalPages}페이지 · {isDualMode ? '듀얼 매칭 모드' : '라벨링 작업'}
            </p>
          </div>
        </div>

        {/* 우측: 세션 정보, 단축키 */}
        <div className="flex items-center gap-3">
          {/* 듀얼 모드일 때 세션 정보 표시 */}
          {isDualMode && sessionId && (
            <SessionStatus sessionId={sessionId} />
          )}

          {/* 단축키 버튼 */}
          {onShowShortcuts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowShortcuts}
              className="text-grey-500"
            >
              <Keyboard className="w-4 h-4 mr-1.5" />
              단축키
              <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-grey-100 rounded">?</kbd>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
