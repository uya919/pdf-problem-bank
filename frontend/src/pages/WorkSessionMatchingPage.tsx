/**
 * 작업 세션 매칭 페이지 (Phase 32-E)
 *
 * Step 3: 문제-해설 매칭
 * - 문제 목록에서 선택
 * - 해설 문서에서 그룹 생성 시 자동 연결
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Link as LinkIcon,
  FileText,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useDocument, usePageBlocks, usePageGroups, useSavePageGroups } from '@/hooks/useDocuments';
import { useWorkSessionStore } from '@/stores/workSessionStore';
import { PageCanvas } from '@/components/PageCanvas';
import { PageNavigation } from '@/components/PageNavigation';
import { useToast } from '@/components/Toast';
import type { ProblemGroup, ProblemInfo, ProblemReference } from '@/api/client';

export function WorkSessionMatchingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);

  const {
    currentSession,
    isLoading,
    error,
    loadSession,
    updateSession,
    createLink,
    getProgress,
    getUnlinkedProblems,
    getLinkForProblem,
  } = useWorkSessionStore();

  // 세션 로드
  useEffect(() => {
    if (sessionId && !currentSession) {
      loadSession(sessionId);
    }
  }, [sessionId, currentSession, loadSession]);

  // 해설 문서 정보
  const { data: solutionDoc } = useDocument(currentSession?.solutionDocumentId || '');
  const { data: blocksData, isLoading: blocksLoading } = usePageBlocks(
    currentSession?.solutionDocumentId || '',
    currentPage
  );
  const { data: groupsData } = usePageGroups(
    currentSession?.solutionDocumentId || '',
    currentPage
  );
  const saveGroupsMutation = useSavePageGroups();

  // 그룹 데이터 동기화
  useEffect(() => {
    if (groupsData) {
      setLocalGroups(groupsData.groups || []);
    }
  }, [groupsData]);

  // 페이지 변경 시 초기화
  useEffect(() => {
    setSelectedBlocks([]);
  }, [currentPage]);

  // 첫 미연결 문제 자동 선택
  useEffect(() => {
    if (currentSession && !selectedProblemId) {
      const unlinked = getUnlinkedProblems();
      if (unlinked.length > 0) {
        setSelectedProblemId(unlinked[0].groupId);
      }
    }
  }, [currentSession, selectedProblemId, getUnlinkedProblems]);

  // 블록 선택 핸들러
  // Phase 53-A: isShiftSelect 파라미터 추가
  const handleBlockSelect = useCallback((blockId: number, isMultiSelect: boolean, isShiftSelect?: boolean) => {
    setSelectedBlocks((prev) => {
      if (isMultiSelect || isShiftSelect) {
        return prev.includes(blockId)
          ? prev.filter((id) => id !== blockId)
          : [...prev, blockId];
      }
      return prev.includes(blockId) ? [] : [blockId];
    });
  }, []);

  // 그룹 생성 및 자동 연결
  const handleGroupCreate = useCallback(
    async (blockIds: number[]) => {
      if (blockIds.length === 0 || !currentSession || !selectedProblemId) {
        showToast('먼저 문제 목록에서 연결할 문제를 선택하세요', 'warning');
        return;
      }

      const selectedProblem = currentSession.problems.find(
        (p) => p.groupId === selectedProblemId
      );
      if (!selectedProblem) return;

      // 그룹 ID 생성
      const groupId = `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // 문제 정보
      const problemInfo: ProblemInfo = {
        bookName: '',
        course: '',
        page: currentPage + 1,
        problemNumber: `${selectedProblem.problemNumber}[해설]`,
      };

      const newGroup: ProblemGroup = {
        id: groupId,
        // Phase 62-A: 빈 문자열 대신 'L' 사용 (해설 그룹 기본값)
        column: 'L',
        block_ids: blockIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        problemInfo,
      };

      const updatedGroups = [...localGroups, newGroup];
      setLocalGroups(updatedGroups);
      setSelectedBlocks([]);

      // 그룹 저장
      if (currentSession.solutionDocumentId) {
        await saveGroupsMutation.mutateAsync({
          documentId: currentSession.solutionDocumentId,
          pageIndex: currentPage,
          groups: updatedGroups,
        });
      }

      // 연결 생성
      await createLink({
        problemGroupId: selectedProblemId,
        solutionGroupId: groupId,
        solutionDocumentId: currentSession.solutionDocumentId || '',
        solutionPageIndex: currentPage,
      });

      showToast(`${selectedProblem.problemNumber}번 해설이 연결되었습니다`, 'success');

      // 다음 미연결 문제 선택
      setTimeout(() => {
        const unlinked = getUnlinkedProblems();
        if (unlinked.length > 0) {
          setSelectedProblemId(unlinked[0].groupId);
        } else {
          setSelectedProblemId(null);
        }
      }, 100);
    },
    [
      currentSession,
      selectedProblemId,
      currentPage,
      localGroups,
      saveGroupsMutation,
      createLink,
      showToast,
      getUnlinkedProblems,
    ]
  );

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        if (selectedBlocks.length > 0) {
          handleGroupCreate(selectedBlocks);
        }
      }

      if (e.key === 'Escape') {
        setSelectedBlocks([]);
      }

      // 이전/다음 문제
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevUnlinked();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextUnlinked();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlocks, handleGroupCreate]);

  // 이전/다음 미연결 문제 선택
  const selectPrevUnlinked = () => {
    const unlinked = getUnlinkedProblems();
    if (unlinked.length === 0) return;
    const currentIndex = unlinked.findIndex((p) => p.groupId === selectedProblemId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : unlinked.length - 1;
    setSelectedProblemId(unlinked[prevIndex].groupId);
  };

  const selectNextUnlinked = () => {
    const unlinked = getUnlinkedProblems();
    if (unlinked.length === 0) return;
    const currentIndex = unlinked.findIndex((p) => p.groupId === selectedProblemId);
    const nextIndex = currentIndex < unlinked.length - 1 ? currentIndex + 1 : 0;
    setSelectedProblemId(unlinked[nextIndex].groupId);
  };

  // 완료 처리
  const handleComplete = async () => {
    if (!currentSession) return;
    await updateSession({ step: 'completed', status: 'completed' });
    showToast('매칭이 완료되었습니다!', 'success');
    navigate('/work');
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-grey-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !currentSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-grey-900 mb-2">
            세션을 찾을 수 없습니다
          </h2>
          <Button variant="solid" onClick={() => navigate('/work')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const progress = getProgress();
  const unlinkedProblems = getUnlinkedProblems();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 bg-white border-b border-grey-100 px-6 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/work"
              className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-grey-600" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-grey-900">
                  {currentSession.name || currentSession.problemDocumentId}
                </h1>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-medium rounded-full">
                  Step 3: 매칭
                </span>
              </div>
              <p className="text-sm text-grey-500">
                {progress.linked}/{progress.total} 연결 완료 ({progress.percent}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-grey-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-toss-blue rounded-full transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-sm text-grey-500">{progress.percent}%</span>
            </div>

            <Button
              variant="solid"
              size="sm"
              onClick={handleComplete}
              disabled={progress.linked < progress.total}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              완료
            </Button>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-green-600">
            <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
            </div>
            <span>문제 라벨링</span>
          </div>
          <div className="w-8 h-px bg-green-300" />
          <div className="flex items-center gap-1.5 text-green-600">
            <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
            </div>
            <span>해설 설정</span>
          </div>
          <div className="w-8 h-px bg-green-300" />
          <div className="flex items-center gap-1.5 text-purple-600">
            <div className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
              3
            </div>
            <span className="font-medium">매칭</span>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Problem List Sidebar */}
        <aside className="w-64 bg-white border-r border-grey-100 flex flex-col">
          <div className="p-4 border-b border-grey-100">
            <h2 className="font-medium text-grey-900">
              미연결 문제 ({unlinkedProblems.length})
            </h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-grey-500">
              <span className="flex items-center gap-1">
                <ChevronUp className="w-3 h-3" /> <ChevronDown className="w-3 h-3" /> 이동
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-grey-100">
            {unlinkedProblems.map((problem) => (
              <button
                key={problem.groupId}
                onClick={() => setSelectedProblemId(problem.groupId)}
                className={`w-full p-3 text-left transition-colors ${
                  selectedProblemId === problem.groupId
                    ? 'bg-purple-50 border-l-2 border-purple-500'
                    : 'hover:bg-grey-50'
                }`}
              >
                <p className="font-medium text-grey-900">{problem.problemNumber}번</p>
                <p className="text-xs text-grey-500">p{problem.pageIndex + 1}</p>
              </button>
            ))}

            {unlinkedProblems.length === 0 && (
              <div className="p-6 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-grey-600">모든 문제가 연결되었습니다!</p>
              </div>
            )}
          </div>

          {/* Connected Problems */}
          <div className="border-t border-grey-100">
            <div className="p-3 text-xs text-grey-500">
              연결됨: {currentSession.links.length}개
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto bg-grey-100 p-4">
            {blocksLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PageCanvas
                documentId={currentSession.solutionDocumentId || ''}
                pageIndex={currentPage}
                blocks={blocksData?.blocks || []}
                groups={localGroups}
                selectedBlocks={selectedBlocks}
                onBlockSelect={handleBlockSelect}
                onGroupCreate={handleGroupCreate}
              />
            )}
          </div>

          {/* Selection Info */}
          {selectedBlocks.length > 0 && (
            <div className="px-4 py-2 bg-purple-50 border-t border-purple-200">
              <p className="text-sm text-purple-700 flex items-center gap-2">
                <span className="font-bold">{selectedBlocks.length}개</span> 블록 선택됨
                <span className="text-purple-500">|</span>
                <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm text-xs">G</kbd>
                <span>그룹 생성</span>
              </p>
            </div>
          )}

          {/* Selected Problem Info */}
          {selectedProblemId && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
              <p className="text-sm text-blue-700">
                <LinkIcon className="w-4 h-4 inline mr-1.5" />
                <span className="font-medium">
                  {
                    currentSession.problems.find((p) => p.groupId === selectedProblemId)
                      ?.problemNumber
                  }
                  번
                </span>
                에 연결할 해설 블록을 선택하세요
              </p>
            </div>
          )}

          {/* Page Navigation */}
          <PageNavigation
            currentPage={currentPage}
            totalPages={solutionDoc?.total_pages || 0}
            onPageChange={setCurrentPage}
            bookPage={currentPage + 1}
          />
        </main>
      </div>
    </div>
  );
}
