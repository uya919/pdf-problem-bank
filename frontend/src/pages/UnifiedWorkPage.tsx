/**
 * 통합 작업 페이지 (Phase 33-D → Phase 39)
 *
 * 문제 라벨링과 해설 매칭을 탭으로 통합
 * - 문제 탭: 문제 문서 라벨링 → addProblem
 * - 해설 탭: 해설 문서에서 매칭 → createLink
 * - 좌측: 문제 목록 패널 (Phase 38)
 *
 * Phase 39: PageViewer 콜백을 workSessionStore와 연결
 */
import { useEffect, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  PanelLeftClose,
  PanelLeft,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { PageViewer } from './PageViewer';
import { Button } from '@/components/ui';
import { SyncIndicator } from '@/components/SyncIndicator';
import { ProblemListPanel } from '@/components/matching';
import { useDocument } from '@/hooks/useDocuments';
import { useToast } from '@/components/Toast';
import {
  useWorkSessionStore,
  useTabState,
  useUnlinkedProblems,
  useSessionProgress,
} from '@/stores/workSessionStore';
import type { ProblemGroup, ProblemInfo } from '@/api/client';
import { formatDisplayNameFromInfo } from '@/utils/displayNameUtils';

export function UnifiedWorkPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    currentSession,
    isLoading,
    error,
    loadSession,
    fullSync,
    resetTabState,
    // Phase 39: 문제/연결 관리 액션
    addProblem,
    removeProblem,
    createLink,
    // Phase 41: 다음 미연결 문제 자동 선택
    selectNextUnlinkedProblem,
    // Phase 46-A: displayName 새로고침
    refreshDisplayNames,
    // Phase 56-R: 해설 삭제 시 연결 자동 해제
    removeLinkBySolutionGroupId,
  } = useWorkSessionStore();

  const {
    activeTab,
    currentPage,
    selectedProblemId,
    setActiveTab,
    setCurrentPage,
    selectProblem,
  } = useTabState();

  const unlinkedProblems = useUnlinkedProblems();
  const progress = useSessionProgress();

  // Phase 36: 동기화 중 상태
  const [isSyncing, setIsSyncing] = useState(false);

  // Phase 46-A: displayName 새로고침 상태
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Phase 38: 사이드바 표시 상태
  const [showSidebar, setShowSidebar] = useState(true);

  // Phase 46-A: displayName 새로고침 핸들러
  const handleRefreshDisplayNames = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshDisplayNames();
      if (result.updated > 0) {
        showToast(`${result.updated}개 문제의 표시명이 업데이트되었습니다`, 'success');
      } else {
        showToast('모든 문제의 표시명이 최신 상태입니다', 'info');
      }
    } catch (error) {
      showToast('표시명 새로고침에 실패했습니다', 'error');
      console.error('[Phase 46-A] Failed to refresh display names:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshDisplayNames, showToast]);

  // Phase 39: 그룹 생성 콜백
  // 문제 탭에서는 addProblem, 해설 탭에서는 createLink 호출
  // Phase 39-A: 해설 탭에서는 문제명 + "_해설" 자동 명명
  const handleGroupCreated = useCallback(async (group: ProblemGroup, pageIndex: number) => {
    console.log('[Phase 39] Group created:', group.id, 'tab:', activeTab, 'page:', pageIndex);

    if (activeTab === 'problem') {
      // 문제 탭: 새 문제를 세션에 추가
      const problemNumber = group.problemInfo?.problemNumber || group.id;

      // Phase 51: Backend와 동일한 형식으로 displayName 생성
      // {bookName}_{course}_p{page}_{problemNumber}번
      const displayName = formatDisplayNameFromInfo(
        group.problemInfo,
        pageIndex,
        problemNumber
      );

      try {
        await addProblem({
          groupId: group.id,
          pageIndex,
          problemNumber,
          displayName,  // Phase 51: 명시적 전달
        });
        showToast(`${problemNumber}번 문제가 추가되었습니다`, 'success');
      } catch (error) {
        console.error('[Phase 39] Failed to add problem:', error);
        showToast('문제 추가에 실패했습니다', 'error');
      }
    } else {
      // 해설 탭: 선택된 문제와 연결
      if (selectedProblemId) {
        // Phase 41: 선택된 문제 정보 조회
        const selectedProblem = currentSession?.problems.find(
          p => p.groupId === selectedProblemId
        );
        const problemNumber = selectedProblem?.problemNumber || '?';

        try {
          await createLink({
            problemGroupId: selectedProblemId,
            solutionGroupId: group.id,
            solutionDocumentId: currentSession?.solutionDocumentId || '',
            solutionPageIndex: pageIndex,
          });

          // Phase 41-A: 연결 완료 후 처리
          const totalProblems = currentSession?.problems.length || 0;
          const linkedCount = (currentSession?.links.length || 0) + 1; // 방금 연결한 것 포함

          if (linkedCount >= totalProblems && totalProblems > 0) {
            // Phase 41-A-3: 모든 문제 연결 완료
            showToast('모든 문제 연결 완료! 🎉', 'success');
            selectProblem(null);
            console.log('[Phase 41] All problems linked!');
          } else {
            // Phase 41-A-1: 간결한 Toast 메시지
            showToast(`${problemNumber}번 해설 연결 완료!`, 'success');
            // Phase 41-A-2: 다음 미연결 문제로 자동 이동
            selectNextUnlinkedProblem();
            console.log('[Phase 41] Auto-advancing to next unlinked problem');
          }
        } catch (error) {
          console.error('[Phase 41] Failed to create link:', error);
          showToast('연결 생성에 실패했습니다', 'error');
        }
      } else {
        showToast('먼저 연결할 문제를 선택하세요', 'warning');
      }
    }
  }, [activeTab, selectedProblemId, currentSession, addProblem, createLink, selectProblem, selectNextUnlinkedProblem, showToast]);

  // Phase 39: 그룹 삭제 콜백
  // Phase 56-R: 해설 탭에서 삭제 시 연결 자동 해제
  const handleGroupDeleted = useCallback(async (groupId: string, pageIndex: number) => {
    console.log('[Phase 39] Group deleted:', groupId, 'page:', pageIndex);

    if (activeTab === 'problem') {
      try {
        await removeProblem(groupId);
        showToast('문제가 삭제되었습니다', 'info');
      } catch (error) {
        console.error('[Phase 39] Failed to remove problem:', error);
      }
    } else if (activeTab === 'solution') {
      // Phase 56-R: 해설 삭제 시 연결 자동 해제
      try {
        const unlinkedProblems = await removeLinkBySolutionGroupId(groupId);
        if (unlinkedProblems && unlinkedProblems.length > 0) {
          const names = unlinkedProblems.map((p) => p.problemNumber).join(', ');
          showToast(`${names}번 연결이 해제되었습니다`, 'info');

          // 첫 번째 해제된 문제 자동 선택 (빠른 재연결 가능)
          selectProblem(unlinkedProblems[0].groupId);
        }
      } catch (error) {
        console.error('[Phase 56-R] Failed to unlink:', error);
      }
    }
  }, [activeTab, removeProblem, removeLinkBySolutionGroupId, selectProblem, showToast]);

  // Phase 39: 그룹 업데이트 콜백
  // Phase 45-Fix-3: 문항번호 수정 시 세션 즉시 업데이트
  const handleGroupUpdated = useCallback(async (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => {
    console.log('[Phase 45-Fix-3] Group updated:', groupId, problemInfo, 'page:', pageIndex);

    if (activeTab === 'problem') {
      // addProblem은 upsert로 동작 (Phase 43)
      // displayName은 workSessionStore에서 자동 생성
      try {
        await addProblem({
          groupId,
          pageIndex,
          problemNumber: problemInfo.problemNumber || groupId,
        });
        console.log('[Phase 45-Fix-3] Problem updated in session:', problemInfo.problemNumber);
      } catch (error) {
        console.error('[Phase 45-Fix-3] Failed to update problem:', error);
      }
    }
  }, [activeTab, addProblem]);

  // Phase 39-A: 해설 자동 명명 - 선택된 문제명 + "_해설"
  const suggestedGroupName = useMemo(() => {
    if (activeTab !== 'solution' || !selectedProblemId) return undefined;

    const selectedProblem = currentSession?.problems.find(
      p => p.groupId === selectedProblemId
    );
    if (!selectedProblem) return undefined;

    const problemName = selectedProblem.displayName || selectedProblem.problemNumber || `문제 ${selectedProblemId}`;
    return `${problemName}_해설`;
  }, [activeTab, selectedProblemId, currentSession?.problems]);

  // Phase 41-B: 선택된 문제 정보 추출 (해설 자동 맵핑용)
  const selectedProblemInfo = useMemo(() => {
    if (activeTab !== 'solution' || !selectedProblemId) return undefined;

    const selectedProblem = currentSession?.problems.find(
      p => p.groupId === selectedProblemId
    );
    if (!selectedProblem) return undefined;

    // displayName 형식: "베이직쎈_공통수학1_p2_3번" 파싱
    // 또는 단순히 problemNumber만 있을 수 있음
    const displayName = selectedProblem.displayName || '';
    const parts = displayName.split('_');

    let bookName: string | undefined;
    let course: string | undefined;
    let page: number | undefined;

    if (parts.length >= 3) {
      // 예: ["베이직쎈", "공통수학1", "p2", "3번"]
      bookName = parts[0];
      course = parts[1];
      // p2 형식에서 숫자 추출
      const pageMatch = parts[2]?.match(/p(\d+)/i);
      if (pageMatch) {
        page = parseInt(pageMatch[1], 10);
      }
    }

    return {
      bookName,
      course,
      page,
      problemNumber: selectedProblem.problemNumber,
    };
  }, [activeTab, selectedProblemId, currentSession?.problems]);

  // Phase 37-D: 탭 전환 핸들러 (해설 탭 전환 시 양방향 동기화)
  const handleTabChange = useCallback(async (tab: 'problem' | 'solution') => {
    // 문제 탭 → 해설 탭 전환 시 fullSync (양방향 동기화)
    if (tab === 'solution' && activeTab === 'problem') {
      setIsSyncing(true);
      try {
        const result = await fullSync();
        console.log('[Phase 37-D] Full sync before solution tab:', result);
      } catch (error) {
        console.warn('[Phase 37-D] Sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    }
    setActiveTab(tab);
  }, [activeTab, setActiveTab, fullSync]);

  // Phase 33-G: 세션 로드 (의존성 최소화)
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  // Phase 33-G: cleanup 분리 (언마운트 시에만 실행)
  useEffect(() => {
    return () => {
      resetTabState();
    };
  }, [resetTabState]);

  // 문서 정보 조회
  const { data: problemDoc, isLoading: problemDocLoading } = useDocument(
    currentSession?.problemDocumentId || ''
  );
  const { data: solutionDoc, isLoading: solutionDocLoading } = useDocument(
    currentSession?.solutionDocumentId || ''
  );

  // 현재 탭의 문서
  const currentDoc = activeTab === 'problem' ? problemDoc : solutionDoc;
  const currentDocId = activeTab === 'problem'
    ? currentSession?.problemDocumentId
    : currentSession?.solutionDocumentId;

  // 페이지 이동
  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    const totalPages = currentDoc?.total_pages || 0;
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, currentDoc, setCurrentPage]);

  // Phase 33-F: 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '1':
          handleTabChange('problem');
          break;
        case '2':
          handleTabChange('solution');
          break;
        case 'Tab':
          if (!e.shiftKey) {
            e.preventDefault();
            handleTabChange(activeTab === 'problem' ? 'solution' : 'problem');
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            handlePrevPage();
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            handleNextPage();
          }
          break;
        // Phase 33-F: 미연결 문제 선택
        case 'ArrowUp':
          if (unlinkedProblems.length > 0) {
            e.preventDefault();
            const currentIndex = selectedProblemId
              ? unlinkedProblems.findIndex(p => p.groupId === selectedProblemId)
              : -1;
            const prevIndex = currentIndex <= 0 ? unlinkedProblems.length - 1 : currentIndex - 1;
            selectProblem(unlinkedProblems[prevIndex].groupId);
          }
          break;
        case 'ArrowDown':
          if (unlinkedProblems.length > 0) {
            e.preventDefault();
            const currentIndex = selectedProblemId
              ? unlinkedProblems.findIndex(p => p.groupId === selectedProblemId)
              : -1;
            const nextIndex = currentIndex >= unlinkedProblems.length - 1 ? 0 : currentIndex + 1;
            selectProblem(unlinkedProblems[nextIndex].groupId);
          }
          break;
        case 'Escape':
          // Phase 33-F: 선택 해제
          selectProblem(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleTabChange, handlePrevPage, handleNextPage, unlinkedProblems, selectedProblemId, selectProblem]);

  // 로딩 상태
  if (isLoading || problemDocLoading || solutionDocLoading) {
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
  // Phase 56-S: 방어적 코딩 - problems/links undefined 체크 추가
  if (error || !currentSession || !currentSession.problems || !currentSession.links) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-grey-900 mb-2">
            세션을 찾을 수 없습니다
          </h2>
          <p className="text-grey-600 mb-6">{error || '세션 데이터가 유효하지 않습니다'}</p>
          <Button variant="solid" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 bg-white border-b border-grey-100"
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-grey-600" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-grey-900">
                  {currentSession.name || '작업 세션'}
                </h1>
                <p className="text-sm text-grey-500">
                  {currentSession.problems.length}개 문제 · {progress.percent}% 연결
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Phase 38: 사이드바 토글 */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
                title={showSidebar ? '사이드바 숨기기' : '사이드바 보기'}
              >
                {showSidebar ? (
                  <PanelLeftClose className="w-5 h-5 text-grey-500" />
                ) : (
                  <PanelLeft className="w-5 h-5 text-grey-500" />
                )}
              </button>

              {/* Phase 37-D3: 동기화 상태 표시 */}
              <SyncIndicator compact />

              {/* Phase 46-A: displayName 새로고침 버튼 */}
              <button
                onClick={handleRefreshDisplayNames}
                disabled={isRefreshing}
                className={`
                  p-1.5 rounded-lg transition-colors
                  ${isRefreshing
                    ? 'bg-grey-100 cursor-not-allowed'
                    : 'hover:bg-grey-100'}
                `}
                title="문제 표시명 새로고침"
              >
                <RefreshCw
                  className={`w-4 h-4 text-grey-500 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              <span className="text-sm text-grey-500">
                {progress.linked}/{progress.total} 완료
              </span>
              {progress.percent === 100 && (
                <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  완료
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 border-b border-grey-200 -mb-px">
            <button
              onClick={() => handleTabChange('problem')}
              disabled={isSyncing}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'problem'
                  ? 'text-toss-blue border-toss-blue'
                  : 'text-grey-500 border-transparent hover:text-grey-700'}
                ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <FileText className="w-4 h-4" />
              문제 ({currentSession.problems.length})
              <kbd className="ml-1 px-1.5 py-0.5 bg-grey-100 text-grey-500 text-xs rounded">1</kbd>
            </button>

            <button
              onClick={() => handleTabChange('solution')}
              disabled={isSyncing}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'solution'
                  ? 'text-purple-600 border-purple-600'
                  : 'text-grey-500 border-transparent hover:text-grey-700'}
                ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <BookOpen className="w-4 h-4" />
              {isSyncing ? '동기화 중...' : '해설'}
              <kbd className="ml-1 px-1.5 py-0.5 bg-grey-100 text-grey-500 text-xs rounded">2</kbd>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Phase 38: 좌측 사이드바 */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 overflow-hidden"
            >
              <ProblemListPanel
                width={260}
                enableKeyboard={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Canvas */}
        <main className="flex-1 overflow-hidden relative">
          {currentDocId && currentDoc && (
            <PageViewer
              documentId={currentDocId}
              totalPages={currentDoc.total_pages}
              initialPage={currentPage}
              key={`${currentDocId}-${activeTab}`}
              // Phase 39: 콜백 연결
              onGroupCreated={handleGroupCreated}
              onGroupDeleted={handleGroupDeleted}
              onGroupUpdated={handleGroupUpdated}
              // Phase 39-A: 해설 자동 명명 - 문제명_해설 형식으로 생성
              suggestedGroupName={suggestedGroupName}
              // Phase 41-B: 선택된 문제 정보 전달 (해설 자동 맵핑용)
              selectedProblemInfo={selectedProblemInfo}
              // Phase 48-B: 페이지 변경 시 탭별 페이지 기억
              onPageChange={setCurrentPage}
            />
          )}

          {/* Page Navigation Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur rounded-full shadow-lg px-2 py-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="p-1.5 hover:bg-grey-100 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-grey-600" />
            </button>
            <span className="text-sm text-grey-700 min-w-[80px] text-center">
              {currentPage + 1} / {currentDoc?.total_pages || 0}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= (currentDoc?.total_pages || 1) - 1}
              className="p-1.5 hover:bg-grey-100 rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-grey-600" />
            </button>
          </div>
        </main>
      </div>

      {/* Unlinked Problems Bar */}
      <footer className="flex-shrink-0 bg-white border-t border-grey-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* 미연결 문제 */}
          <div className="flex items-center gap-2 overflow-x-auto flex-1">
            <span className="text-sm text-grey-500 flex-shrink-0 flex items-center gap-1">
              <LinkIcon className="w-4 h-4" />
              미연결:
            </span>

            {unlinkedProblems.length === 0 ? (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                모두 연결됨
              </span>
            ) : (
              unlinkedProblems.map((problem) => (
                <button
                  key={problem.groupId}
                  onClick={() => selectProblem(problem.groupId)}
                  className={`
                    px-3 py-1 rounded-full text-sm transition-colors flex-shrink-0
                    ${selectedProblemId === problem.groupId
                      ? 'bg-toss-blue text-white'
                      : 'bg-grey-100 text-grey-700 hover:bg-toss-blue/10 hover:text-toss-blue'}
                  `}
                >
                  {problem.problemNumber}번
                </button>
              ))
            )}

            {selectedProblemId && activeTab === 'solution' && (
              <span className="ml-2 text-xs text-purple-600 flex-shrink-0">
                해설 영역을 선택하여 연결하세요
              </span>
            )}
          </div>

          {/* Phase 33-F: 키보드 힌트 */}
          <div className="flex items-center gap-3 text-xs text-grey-400 flex-shrink-0 ml-4">
            <Keyboard className="w-3.5 h-3.5" />
            <span><kbd className="px-1 py-0.5 bg-grey-100 rounded">1</kbd><kbd className="px-1 py-0.5 bg-grey-100 rounded ml-0.5">2</kbd> 탭</span>
            <span><kbd className="px-1 py-0.5 bg-grey-100 rounded">↑</kbd><kbd className="px-1 py-0.5 bg-grey-100 rounded ml-0.5">↓</kbd> 선택</span>
            <span><kbd className="px-1 py-0.5 bg-grey-100 rounded">G</kbd> 그룹</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
