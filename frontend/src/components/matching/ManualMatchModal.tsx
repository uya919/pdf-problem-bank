/**
 * Phase 38-5: 수동 매칭 모달
 *
 * 자동 매칭이 틀렸을 때 사용자가 직접 문제 선택
 */
import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Search, Circle, CheckCircle2 } from 'lucide-react';
import { useUnlinkedProblems, useWorkSessionStore } from '@/stores/workSessionStore';
import type { ProblemReference } from '@/api/client';

interface ManualMatchModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 해설 그룹 ID */
  solutionGroupId: string;
  /** 해설 그룹 이름 */
  solutionName?: string;
  /** 해설 문서 ID */
  solutionDocumentId: string;
  /** 해설 페이지 인덱스 */
  solutionPageIndex: number;
  /** 제안된 문제 ID (하이라이트용) */
  suggestedProblemId?: string;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 연결 완료 핸들러 */
  onLinked?: (problemId: string) => void;
}

export const ManualMatchModal = memo(function ManualMatchModal({
  isOpen,
  solutionGroupId,
  solutionName,
  solutionDocumentId,
  solutionPageIndex,
  suggestedProblemId,
  onClose,
  onLinked,
}: ManualMatchModalProps) {
  const unlinkedProblems = useUnlinkedProblems();
  const createLink = useWorkSessionStore((s) => s.createLink);
  const selectNextUnlinkedProblem = useWorkSessionStore((s) => s.selectNextUnlinkedProblem);

  const [selectedId, setSelectedId] = useState<string | null>(suggestedProblemId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // 제안된 문제가 변경되면 선택 상태 업데이트
  useEffect(() => {
    if (suggestedProblemId) {
      setSelectedId(suggestedProblemId);
    }
  }, [suggestedProblemId]);

  // 검색 필터링
  const filteredProblems = searchQuery
    ? unlinkedProblems.filter(
        (p) =>
          p.problemNumber.includes(searchQuery) ||
          p.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : unlinkedProblems;

  // 연결 실행
  const handleLink = useCallback(async () => {
    if (!selectedId || isLinking) return;

    setIsLinking(true);
    try {
      await createLink({
        problemGroupId: selectedId,
        solutionGroupId,
        solutionDocumentId,
        solutionPageIndex,
      });
      selectNextUnlinkedProblem();
      onLinked?.(selectedId);
      onClose();
    } catch (error) {
      console.error('[Phase 38-5] Failed to create link:', error);
    } finally {
      setIsLinking(false);
    }
  }, [
    selectedId,
    isLinking,
    solutionGroupId,
    solutionDocumentId,
    solutionPageIndex,
    createLink,
    selectNextUnlinkedProblem,
    onLinked,
    onClose,
  ]);

  // 키보드 이벤트
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (selectedId) {
            e.preventDefault();
            handleLink();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveSelection(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveSelection(1);
          break;
      }
    };

    const moveSelection = (direction: number) => {
      if (filteredProblems.length === 0) return;
      const currentIndex = filteredProblems.findIndex((p) => p.groupId === selectedId);
      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) nextIndex = filteredProblems.length - 1;
      if (nextIndex >= filteredProblems.length) nextIndex = 0;
      setSelectedId(filteredProblems[nextIndex].groupId);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedId, filteredProblems, handleLink, onClose]);

  // 모달 열릴 때 검색 초기화
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-grey-900">수동 매칭</h2>
                    {solutionName && (
                      <p className="text-sm text-grey-500">"{solutionName}" 해설</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-grey-500" />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-grey-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="문제 번호로 검색..."
                    className="w-full pl-10 pr-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              {/* Problem List */}
              <div className="max-h-[300px] overflow-y-auto">
                {filteredProblems.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm text-grey-500">
                      {searchQuery
                        ? '검색 결과가 없습니다'
                        : '연결할 수 있는 문제가 없습니다'}
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {filteredProblems.map((problem) => (
                      <ProblemOption
                        key={problem.groupId}
                        problem={problem}
                        isSelected={problem.groupId === selectedId}
                        isSuggested={problem.groupId === suggestedProblemId}
                        onClick={() => setSelectedId(problem.groupId)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-grey-100 flex items-center justify-between">
                <div className="text-xs text-grey-400">
                  <kbd className="px-1.5 py-0.5 bg-grey-100 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-grey-100 rounded ml-1">↓</kbd>
                  <span className="ml-2">선택</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-grey-700 hover:bg-grey-100 rounded-xl transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleLink}
                    disabled={!selectedId || isLinking}
                    className="px-4 py-2 text-sm font-medium text-white bg-toss-blue hover:bg-toss-blue/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Link2 className="w-4 h-4" />
                    {isLinking ? '연결 중...' : '연결'}
                    <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">Enter</kbd>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// 문제 옵션 컴포넌트
interface ProblemOptionProps {
  problem: ProblemReference;
  isSelected: boolean;
  isSuggested: boolean;
  onClick: () => void;
}

const ProblemOption = memo(function ProblemOption({
  problem,
  isSelected,
  isSuggested,
  onClick,
}: ProblemOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-5 py-3 text-left transition-colors
        ${isSelected ? 'bg-toss-blue/10' : 'hover:bg-grey-50'}
      `}
    >
      {isSelected ? (
        <CheckCircle2 className="w-5 h-5 text-toss-blue flex-shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-grey-300 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isSelected ? 'text-toss-blue' : 'text-grey-900'
            }`}
          >
            {problem.problemNumber}번
          </span>
          {isSuggested && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-600 rounded">
              추천
            </span>
          )}
        </div>
        {problem.displayName && (
          <p className="text-xs text-grey-500 truncate mt-0.5">
            {problem.displayName}
          </p>
        )}
      </div>
    </button>
  );
});

export default ManualMatchModal;
