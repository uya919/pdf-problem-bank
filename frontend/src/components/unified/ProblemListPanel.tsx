/**
 * 문제 목록 패널 (Phase 31-E, 31-H: 편집 기능 추가, 31-H-4: 백엔드 동기화)
 *
 * 문제 목록 + 연결 상태 + 선택 기능 + 편집 기능
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, CheckCircle2, ChevronRight, FileText, Edit2 } from 'lucide-react';
import { useMatchingStore, type ProblemItem } from '../../stores/matchingStore';
import { ProblemEditForm } from './ProblemEditForm';
import { api } from '../../api/client';
import { useToast } from '../Toast';

export function ProblemListPanel() {
  const { showToast } = useToast();
  const {
    activeTab,
    problems,
    selectedProblemId,
    selectProblem,
    selectNextUnlinked,
    selectPrevUnlinked,
    updateProblem,
    isLinked,
    getProgress,
  } = useMatchingStore();

  // Phase 31-H: 편집 모드 상태
  const [editingId, setEditingId] = useState<string | null>(null);

  // Phase 31-H-4: 백엔드 동기화 저장 핸들러
  const handleSave = async (problem: ProblemItem, updates: Partial<ProblemItem>) => {
    // 1. 로컬 스토어 업데이트 (즉시 반영)
    updateProblem(problem.groupId, updates);
    setEditingId(null);

    // 2. 백엔드 동기화 (비동기)
    try {
      await api.updateGroupInfo(
        problem.documentId,
        problem.pageIndex,
        problem.groupId,
        {
          problemNumber: updates.problemNumber,
          bookName: updates.bookName,
          course: updates.course,
          page: updates.page,
        }
      );
      console.log('[Phase 31-H-4] Group synced to backend');
    } catch (error) {
      console.error('[Phase 31-H-4] Failed to sync group:', error);
      showToast('백엔드 동기화 실패', 'error');
    }
  };

  const { linked, total, percent } = getProgress();
  const isComplete = total > 0 && linked === total;

  // 키보드 네비게이션 + Phase 31-H: E키 편집
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Phase 31-H: E키로 선택된 문제 편집
      if ((e.key === 'e' || e.key === 'E') && selectedProblemId && !editingId) {
        e.preventDefault();
        setEditingId(selectedProblemId);
        return;
      }

      // 해설 탭에서만 네비게이션 작동
      if (activeTab !== 'solution') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextUnlinked();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevUnlinked();
      } else if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        selectNextUnlinked();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectNextUnlinked, selectPrevUnlinked, selectedProblemId, editingId]);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b bg-grey-50">
        <h3 className="font-bold text-grey-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          문제 목록
        </h3>
        <p className="text-sm text-grey-500 mt-1">
          {total > 0 ? `${linked}/${total} 연결됨` : '문제를 먼저 등록하세요'}
        </p>
      </div>

      {/* 문제 리스트 */}
      <div className="flex-1 overflow-y-auto p-3">
        {problems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-grey-100 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-grey-400" />
            </div>
            <p className="text-grey-500 font-medium">등록된 문제가 없습니다</p>
            <p className="text-sm text-grey-400 mt-1">
              문제 탭에서 블록을 선택하고<br />
              <kbd className="px-1.5 py-0.5 bg-grey-100 rounded text-xs">G</kbd>키로 그룹을 생성하세요
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {problems.map((problem) => {
              const problemLinked = isLinked(problem.groupId);
              const selected = selectedProblemId === problem.groupId;
              const isEditing = editingId === problem.groupId;

              // Phase 31-H: 편집 모드
              if (isEditing) {
                return (
                  <motion.div
                    key={problem.groupId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-2"
                  >
                    <ProblemEditForm
                      problem={problem}
                      onSave={(updates) => handleSave(problem, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={problem.groupId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    // 연결되지 않은 문제만 선택 가능 (또는 해설 탭에서)
                    if (!problemLinked || activeTab === 'solution') {
                      selectProblem(problem.groupId);
                    }
                  }}
                  className={`group flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all ${
                    selected
                      ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                      : problemLinked
                        ? 'bg-green-50 border border-green-200 hover:border-green-300'
                        : 'bg-white border border-grey-200 hover:border-grey-300 hover:shadow-sm'
                  }`}
                >
                  {/* 상태 아이콘 */}
                  <div className="flex-shrink-0">
                    {problemLinked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : selected ? (
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <ChevronRight className="w-5 h-5 text-blue-500" />
                      </motion.div>
                    ) : (
                      <Circle className="w-5 h-5 text-grey-300" />
                    )}
                  </div>

                  {/* 문제 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${
                        selected ? 'text-blue-700' : problemLinked ? 'text-green-700' : 'text-grey-900'
                      }`}>
                        {problem.problemNumber}
                      </span>
                      {selected && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                          선택됨
                        </span>
                      )}
                      {problemLinked && !selected && (
                        <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
                          연결됨
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-grey-500 truncate">
                      {problem.displayName}
                    </p>
                  </div>

                  {/* Phase 31-H: 편집 버튼 (호버 시 표시) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(problem.groupId);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-grey-100 transition-all"
                    title="편집 (E)"
                  >
                    <Edit2 className="w-4 h-4 text-grey-400 hover:text-blue-500" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* 안내 메시지 (해설 탭에서 문제 선택 시) */}
      {activeTab === 'solution' && selectedProblemId && (
        <div className="p-4 border-t bg-gradient-to-r from-blue-50 to-purple-50">
          <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
            <span className="text-lg">💡</span>
            선택된 문제의 해설을 그룹핑하세요
          </p>
          <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 bg-white rounded shadow-sm">↑↓</kbd> 이동</span>
            <span><kbd className="px-1 py-0.5 bg-white rounded shadow-sm">Tab</kbd> 다음</span>
            <span><kbd className="px-1 py-0.5 bg-white rounded shadow-sm">G</kbd> 그룹</span>
          </p>
        </div>
      )}

      {/* 진행률 */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-grey-600 font-medium">진행률</span>
          <span className="font-bold text-grey-900">{percent}%</span>
        </div>
        <div className="h-2.5 bg-grey-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        {/* 완료 메시지 */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl text-center"
          >
            <p className="text-green-700 font-bold flex items-center justify-center gap-2">
              <span className="text-xl">🎉</span>
              모든 문제가 연결되었습니다!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
