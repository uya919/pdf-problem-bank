/**
 * Phase 38-2: 문제 목록 패널
 * Phase 45: 표시 형식 개선 ("베이직쎈 · 10p · 3번")
 *
 * 좌측 사이드바에 미연결/연결 문제 목록 표시
 * - 미연결 문제: 클릭하면 매칭 대상으로 선택
 * - 연결된 문제: 호버 시 해제 버튼 표시
 */
import { memo, useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Circle, CheckCircle2, ChevronRight, Link2Off, ArrowRight, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { parseProblemDisplayName } from '@/utils/problemDisplayUtils';
import {
  useWorkSessionStore,
  useUnlinkedProblems,
  useLinkedProblems,
  useSessionProgress,
  type LinkedProblemPair,
} from '@/stores/workSessionStore';
import type { ProblemReference } from '@/api/client';

interface ProblemListPanelProps {
  /** 패널 너비 */
  width?: number;
  /** 키보드 네비게이션 활성화 */
  enableKeyboard?: boolean;
  /** 문제 클릭 시 콜백 */
  onProblemClick?: (problem: ProblemReference) => void;
  /** 연결 해제 클릭 시 콜백 */
  onUnlinkClick?: (problemGroupId: string) => void;
}

export const ProblemListPanel = memo(function ProblemListPanel({
  width = 240,
  enableKeyboard = true,
  onProblemClick,
  onUnlinkClick,
}: ProblemListPanelProps) {
  const selectedProblemId = useWorkSessionStore((s) => s.selectedProblemId);
  const selectProblem = useWorkSessionStore((s) => s.selectProblem);
  const removeLink = useWorkSessionStore((s) => s.removeLink);
  const syncParentFlags = useWorkSessionStore((s) => s.syncParentFlags);

  const unlinkedProblems = useUnlinkedProblems();
  const linkedProblems = useLinkedProblems();
  const progress = useSessionProgress();

  const listRef = useRef<HTMLDivElement>(null);

  // Phase 49: 연결된 문제 접기 상태
  const [showAllLinked, setShowAllLinked] = useState(false);

  // Phase 56-O: 동기화 중 상태
  const [isSyncing, setIsSyncing] = useState(false);
  const LINKED_PREVIEW_COUNT = 3;

  // Phase 49: 표시할 연결된 문제 계산
  const displayedLinkedProblems = useMemo(() => {
    if (showAllLinked || linkedProblems.length <= LINKED_PREVIEW_COUNT) {
      return linkedProblems;
    }
    return linkedProblems.slice(0, LINKED_PREVIEW_COUNT);
  }, [linkedProblems, showAllLinked]);

  const hiddenLinkedCount = Math.max(0, linkedProblems.length - LINKED_PREVIEW_COUNT);

  // 문제 클릭 핸들러
  const handleProblemClick = useCallback(
    (problem: ProblemReference) => {
      selectProblem(problem.groupId);
      onProblemClick?.(problem);
    },
    [selectProblem, onProblemClick]
  );

  // 연결 해제 핸들러
  const handleUnlinkClick = useCallback(
    async (problemGroupId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await removeLink(problemGroupId);
        onUnlinkClick?.(problemGroupId);
      } catch (error) {
        console.error('[Phase 38-2] Failed to unlink:', error);
      }
    },
    [removeLink, onUnlinkClick]
  );

  // Phase 56-O: isParent 동기화 핸들러
  const handleSyncParentFlags = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncParentFlags();
      console.log('[Phase 56-O] Parent flags synced:', result.updated);
    } catch (error) {
      console.error('[Phase 56-O] Failed to sync parent flags:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, syncParentFlags]);

  // 키보드 네비게이션
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 다른 입력 필드에서는 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();

        const allProblems = [...unlinkedProblems, ...linkedProblems.map((p) => p.problem)];
        if (allProblems.length === 0) return;

        const currentIndex = allProblems.findIndex(
          (p) => p.groupId === selectedProblemId
        );

        let nextIndex: number;
        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex <= 0 ? allProblems.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex >= allProblems.length - 1 ? 0 : currentIndex + 1;
        }

        selectProblem(allProblems[nextIndex].groupId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboard, unlinkedProblems, linkedProblems, selectedProblemId, selectProblem]);

  return (
    <div
      className="flex flex-col h-full bg-grey-50 border-r border-grey-200"
      style={{ width }}
      ref={listRef}
    >
      {/* 미연결 문제 섹션 */}
      <div className="flex-1 overflow-y-auto">
        <SectionHeader
          title="미연결 문제"
          count={unlinkedProblems.length}
          color="text-yellow-600"
          onRefresh={handleSyncParentFlags}
          isRefreshing={isSyncing}
        />
        <div className="px-2 pb-2">
          {unlinkedProblems.length === 0 ? (
            <EmptyState message="모든 문제가 연결되었습니다" />
          ) : (
            unlinkedProblems.map((problem) => (
              <UnlinkedProblemItem
                key={problem.groupId}
                problem={problem}
                isSelected={problem.groupId === selectedProblemId}
                onClick={() => handleProblemClick(problem)}
              />
            ))
          )}
        </div>

        {/* 연결된 문제 섹션 */}
        <SectionHeader
          title="매칭 완료"
          count={linkedProblems.length}
          color="text-green-600"
        />
        <div className="px-2 pb-2">
          {linkedProblems.length === 0 ? (
            <EmptyState message="아직 연결된 문제가 없습니다" />
          ) : (
            <>
              {/* Phase 49: 표시 제한된 연결된 문제 목록 */}
              {displayedLinkedProblems.map((pair) => (
                <LinkedProblemItem
                  key={pair.problem.groupId}
                  pair={pair}
                  isSelected={pair.problem.groupId === selectedProblemId}
                  onClick={() => handleProblemClick(pair.problem)}
                  onUnlink={(e) => handleUnlinkClick(pair.problem.groupId, e)}
                />
              ))}

              {/* Phase 49: 접기/펼치기 버튼 */}
              {linkedProblems.length > LINKED_PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAllLinked(!showAllLinked)}
                  className="
                    w-full mt-2 px-3 py-2.5
                    bg-white hover:bg-grey-50
                    border border-grey-200
                    rounded-lg
                    transition-all duration-200
                    flex items-center justify-between
                    text-sm font-medium
                  "
                >
                  <span className="flex items-center gap-2">
                    {showAllLinked ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-grey-500" />
                        <span className="text-grey-700">접기</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-toss-blue" />
                        <span className="text-toss-blue">{hiddenLinkedCount}개 더보기</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-grey-400">
                    전체 {linkedProblems.length}개
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 하단 진행률 */}
      <div className="border-t border-grey-200 p-3 bg-white">
        <div className="flex items-center justify-between text-xs text-grey-600 mb-1.5">
          <span>진행률</span>
          <span className="font-medium">
            {progress.linked}/{progress.total} ({progress.percent}%)
          </span>
        </div>
        <div className="h-1.5 bg-grey-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-toss-blue rounded-full transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    </div>
  );
});

// 섹션 헤더
// Phase 56-O: onRefresh 콜백 및 isRefreshing 상태 추가
interface SectionHeaderProps {
  title: string;
  count: number;
  color: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const SectionHeader = memo(function SectionHeader({
  title,
  count,
  color,
  onRefresh,
  isRefreshing,
}: SectionHeaderProps) {
  return (
    <div className="sticky top-0 bg-grey-50 px-3 py-2 border-b border-grey-100">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-grey-600">{title}</span>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-medium ${color}`}>{count}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`
                p-0.5 rounded hover:bg-grey-200 transition-colors
                ${isRefreshing ? 'cursor-not-allowed opacity-50' : ''}
              `}
              title="모문제 정보 새로고침"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-grey-500 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// 빈 상태
interface EmptyStateProps {
  message: string;
}

const EmptyState = memo(function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-xs text-grey-400">{message}</p>
    </div>
  );
});

// 미연결 문제 아이템
interface UnlinkedProblemItemProps {
  problem: ProblemReference;
  isSelected: boolean;
  onClick: () => void;
}

const UnlinkedProblemItem = memo(function UnlinkedProblemItem({
  problem,
  isSelected,
  onClick,
}: UnlinkedProblemItemProps) {
  // Phase 45: displayName 파싱하여 구조화된 형식으로 표시
  const parsed = useMemo(
    () => parseProblemDisplayName(problem.displayName),
    [problem.displayName]
  );

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
        transition-colors duration-150
        ${
          isSelected
            ? 'bg-toss-blue/10 border-l-3 border-toss-blue'
            : 'hover:bg-grey-100'
        }
      `}
    >
      {isSelected ? (
        <ChevronRight className="w-4 h-4 text-toss-blue flex-shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-grey-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {parsed ? (
          // Phase 45: "베이직쎈 · 10p · 3번" 형식
          <span
            className={`text-sm font-medium truncate block ${
              isSelected ? 'text-toss-blue' : 'text-grey-700'
            }`}
            title={problem.displayName}
          >
            {/* Phase 45-Fix: 페이지 정보 없으면 생략 */}
            {parsed.page !== '-'
              ? `${parsed.bookName} · ${parsed.page}p · ${parsed.problemNumber}번`
              : parsed.bookName !== '-'
                ? `${parsed.bookName} · ${parsed.problemNumber}번`
                : `${parsed.problemNumber}번`}
          </span>
        ) : (
          // Fallback: 기존 형식
          <span
            className={`text-sm font-medium ${
              isSelected ? 'text-toss-blue' : 'text-grey-700'
            }`}
          >
            {problem.problemNumber}번
          </span>
        )}
      </div>
    </button>
  );
});

// 연결된 문제 아이템
interface LinkedProblemItemProps {
  pair: LinkedProblemPair;
  isSelected: boolean;
  onClick: () => void;
  onUnlink: (e: React.MouseEvent) => void;
}

const LinkedProblemItem = memo(function LinkedProblemItem({
  pair,
  isSelected,
  onClick,
  onUnlink,
}: LinkedProblemItemProps) {
  const { problem, link } = pair;

  // Phase 45: displayName 파싱하여 구조화된 형식으로 표시
  const parsed = useMemo(
    () => parseProblemDisplayName(problem.displayName),
    [problem.displayName]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`
        group w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
        transition-colors duration-150 cursor-pointer
        ${isSelected ? 'bg-green-50' : 'hover:bg-grey-100'}
      `}
    >
      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {parsed ? (
          // Phase 45: "베이직쎈 · 10p · 3번" 형식
          <div className="flex items-center gap-1">
            <span
              className="text-sm font-medium text-grey-700 truncate"
              title={problem.displayName}
            >
              {/* Phase 45-Fix: 페이지 정보 없으면 생략 */}
              {parsed.page !== '-'
                ? `${parsed.bookName} · ${parsed.page}p · ${parsed.problemNumber}번`
                : parsed.bookName !== '-'
                  ? `${parsed.bookName} · ${parsed.problemNumber}번`
                  : `${parsed.problemNumber}번`}
            </span>
            {/* Phase 57-A: 해설 뱃지 */}
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-toss-blue/10 text-toss-blue rounded flex-shrink-0">
              해설
            </span>
          </div>
        ) : (
          // Fallback: 기존 형식
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-grey-700">
              {problem.problemNumber}번
            </span>
            {/* Phase 57-A: 해설 뱃지 */}
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-toss-blue/10 text-toss-blue rounded flex-shrink-0">
              해설
            </span>
          </div>
        )}
      </div>
      <button
        onClick={onUnlink}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
        title="연결 해제"
      >
        <Link2Off className="w-3.5 h-3.5 text-red-500" />
      </button>
    </div>
  );
});

export default ProblemListPanel;
