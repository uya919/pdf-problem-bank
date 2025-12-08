/**
 * Phase 38-3: 매칭 탭 헤더
 *
 * 문제/해설 탭 전환 + 진행률 바
 */
import { memo } from 'react';
import { FileText, BookOpen, Monitor } from 'lucide-react';
import { useSessionProgress } from '@/stores/workSessionStore';

interface MatchingTabHeaderProps {
  /** 현재 활성 탭 */
  activeTab: 'problem' | 'solution';
  /** 탭 전환 핸들러 */
  onTabChange: (tab: 'problem' | 'solution') => void;
  /** 문제 수 */
  problemCount: number;
  /** 동기화 중 여부 */
  isSyncing?: boolean;
  /** 분리 버튼 클릭 핸들러 (듀얼 윈도우) */
  onSplitWindow?: () => void;
  /** 세션 이름 */
  sessionName?: string;
}

export const MatchingTabHeader = memo(function MatchingTabHeader({
  activeTab,
  onTabChange,
  problemCount,
  isSyncing = false,
  onSplitWindow,
  sessionName,
}: MatchingTabHeaderProps) {
  const progress = useSessionProgress();

  return (
    <div className="bg-white border-b border-grey-100">
      {/* 상단: 세션 정보 + 진행률 */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-toss-blue/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-toss-blue" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-grey-900">
              {sessionName || '매칭 작업'}
            </h2>
            <p className="text-xs text-grey-500">
              {progress.linked}/{progress.total} 연결됨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 진행률 바 */}
          <div className="w-32">
            <div className="flex items-center justify-between text-xs text-grey-500 mb-1">
              <span>{progress.percent}%</span>
            </div>
            <div className="h-1.5 bg-grey-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-toss-blue rounded-full transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* 분리 버튼 */}
          {onSplitWindow && (
            <button
              onClick={onSplitWindow}
              className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
              title="듀얼 윈도우로 분리"
            >
              <Monitor className="w-4 h-4 text-grey-500" />
            </button>
          )}
        </div>
      </div>

      {/* 탭 버튼 */}
      <div className="flex px-4 border-t border-grey-50">
        <TabButton
          icon={<FileText className="w-4 h-4" />}
          label="문제"
          count={problemCount}
          shortcut="1"
          isActive={activeTab === 'problem'}
          disabled={isSyncing}
          onClick={() => onTabChange('problem')}
          activeColor="toss-blue"
        />

        <TabButton
          icon={<BookOpen className="w-4 h-4" />}
          label={isSyncing ? '동기화 중...' : '해설'}
          shortcut="2"
          isActive={activeTab === 'solution'}
          disabled={isSyncing}
          onClick={() => onTabChange('solution')}
          activeColor="purple-600"
        />
      </div>
    </div>
  );
});

// 탭 버튼 컴포넌트
interface TabButtonProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  shortcut: string;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
  activeColor: string;
}

const TabButton = memo(function TabButton({
  icon,
  label,
  count,
  shortcut,
  isActive,
  disabled,
  onClick,
  activeColor,
}: TabButtonProps) {
  const activeClasses = activeColor === 'toss-blue'
    ? 'text-toss-blue border-toss-blue'
    : 'text-purple-600 border-purple-600';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-2.5 text-sm font-medium
        border-b-2 transition-colors
        ${isActive ? activeClasses : 'text-grey-500 border-transparent hover:text-grey-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`text-xs ${isActive ? '' : 'text-grey-400'}`}>
          ({count})
        </span>
      )}
      <kbd className="ml-1 px-1.5 py-0.5 bg-grey-100 text-grey-500 text-xs rounded">
        {shortcut}
      </kbd>
    </button>
  );
});

export default MatchingTabHeader;
