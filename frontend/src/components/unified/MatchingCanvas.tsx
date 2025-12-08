/**
 * 매칭 캔버스 컴포넌트 (Phase 31-F, 31-J: 줌 기능)
 *
 * 탭에 따라 문제/해설 PDF를 표시하고
 * 그룹 생성 시 자동으로 연결 처리
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePageBlocks, usePageGroups, useSavePageGroups, useDocumentSettings } from '../../hooks/useDocuments';
import { PageCanvas } from '../PageCanvas';
import { PageNavigation } from '../PageNavigation';
import { ZoomControls } from './ZoomControls';
import { useMatchingStore, formatDisplayName } from '../../stores/matchingStore';
import { useToast } from '../Toast';
import type { ProblemGroup, ProblemInfo } from '../../api/client';
// Phase 34-A-2: document_id 파싱
import { extractBookNameAndCourse } from '../../utils/documentUtils';

interface MatchingCanvasProps {
  documentId: string;
  totalPages: number;
}

export function MatchingCanvas({ documentId, totalPages }: MatchingCanvasProps) {
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);
  const isInitialLoadRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Phase 31-J: 줌 상태
  const [zoomScale, setZoomScale] = useState(1);

  // matchingStore
  const {
    activeTab,
    problemDocId,
    selectedProblemId,
    addProblem,
    createLink,
    selectNextUnlinked,
    problems,
  } = useMatchingStore();

  // 현재 탭에 맞는 문서인지 확인
  const isProblemDoc = documentId === problemDocId;
  const isSolutionTab = activeTab === 'solution';

  // 블록 데이터 조회
  const { data: blocksData, isLoading: blocksLoading } = usePageBlocks(documentId, currentPage);

  // 그룹 데이터 조회
  const { data: groupsData } = usePageGroups(documentId, currentPage);

  // 문서 설정 조회
  const { data: documentSettings } = useDocumentSettings(documentId);

  // 그룹 저장 mutation
  const saveGroupsMutation = useSavePageGroups();

  // 그룹 데이터 동기화
  useEffect(() => {
    if (groupsData) {
      setLocalGroups(groupsData.groups || []);
      isInitialLoadRef.current = false;
    }
  }, [groupsData]);

  // Phase 31-G: 문서(탭) 변경 시 페이지 리셋
  // Phase 31-J: 줌도 리셋
  useEffect(() => {
    setCurrentPage(0);
    setSelectedBlocks([]);
    setLocalGroups([]);
    setZoomScale(1);
    isInitialLoadRef.current = true;
  }, [documentId]);

  // 페이지 변경 시 초기화
  useEffect(() => {
    setSelectedBlocks([]);
    setLocalGroups([]);
    isInitialLoadRef.current = true;
  }, [currentPage]);

  // 그룹 저장 함수
  const saveGroups = useCallback(async (groups: ProblemGroup[], pageIndex: number) => {
    try {
      await saveGroupsMutation.mutateAsync({
        documentId,
        pageIndex,
        groups,
      });
    } catch (error) {
      console.error('[MatchingCanvas] Save failed:', error);
    }
  }, [documentId, saveGroupsMutation]);

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (!groupsData || isInitialLoadRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const pageToSave = currentPage;
    debounceTimerRef.current = setTimeout(() => {
      saveGroups(localGroups, pageToSave);
      debounceTimerRef.current = null;
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localGroups, currentPage, groupsData, saveGroups]);

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

  // 그룹 생성 핸들러
  const handleGroupCreate = useCallback((blockIds: number[]) => {
    if (blockIds.length === 0) return;

    // 해설 탭에서 선택된 문제가 없으면 그룹 생성 차단
    if (isSolutionTab && !selectedProblemId) {
      showToast('먼저 문제 목록에서 연결할 문제를 선택하세요', 'warning');
      return;
    }

    // 그룹 ID 생성
    const groupId = `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 문제 번호 결정
    let problemNumber = '1';
    if (isProblemDoc) {
      // 문제 탭: 현재 등록된 문제 수 + 1
      problemNumber = String(problems.length + 1);
    } else if (selectedProblemId) {
      // 해설 탭: 선택된 문제의 번호 + "[해설]"
      const linkedProblem = problems.find(p => p.groupId === selectedProblemId);
      if (linkedProblem) {
        problemNumber = `${linkedProblem.problemNumber}[해설]`;
      }
    }

    // Phase 34-A-2: 기본 문제 정보 (document_id 파싱하여 기본값 사용)
    const parsed = extractBookNameAndCourse(documentId);
    const problemInfo: ProblemInfo = {
      bookName: documentSettings?.defaultBookName || parsed.bookName,
      course: documentSettings?.defaultCourse || parsed.course,
      page: currentPage + 1,
      problemNumber,
    };

    // Phase 53: column 필드 추가 (기본값 L)
    const newGroup: ProblemGroup = {
      id: groupId,
      column: "L",  // 기본값
      block_ids: blockIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      problemInfo,
    };

    const updatedGroups = [...localGroups, newGroup];
    setLocalGroups(updatedGroups);
    setSelectedBlocks([]);

    // 문제 탭에서 그룹 생성 시 matchingStore에 문제 등록
    if (isProblemDoc) {
      // Phase 34-A: 새로운 displayName 형식 (시리즈_과정_p페이지_문항번호번)
      const baseDisplayName = formatDisplayName(problemInfo);
      const fullDisplayName = baseDisplayName !== '정보 없음'
        ? `${baseDisplayName}_${problemNumber}번`
        : `${problemNumber}번`;
      addProblem({
        groupId,
        problemNumber,
        displayName: fullDisplayName,
        pageIndex: currentPage,
        documentId,
        blockIds,
        // Phase 62-A: createdAt 필수 필드 추가
        createdAt: Date.now(),
      });
      showToast(`${problemNumber}번 문제가 등록되었습니다`, 'success');
    }

    // 해설 탭에서 그룹 생성 시 자동 연결
    if (isSolutionTab && selectedProblemId) {
      createLink(selectedProblemId, groupId, currentPage);

      const linkedProblem = problems.find(p => p.groupId === selectedProblemId);
      showToast(`${linkedProblem?.problemNumber || ''}번 해설이 연결되었습니다`, 'success');

      // 다음 미연결 문제로 자동 이동
      setTimeout(() => selectNextUnlinked(), 300);
    }

    // 즉시 저장
    saveGroups(updatedGroups, currentPage);
  }, [
    isSolutionTab,
    selectedProblemId,
    isProblemDoc,
    problems,
    documentSettings,
    currentPage,
    localGroups,
    documentId,
    addProblem,
    createLink,
    selectNextUnlinked,
    saveGroups,
    showToast,
  ]);

  // 키보드 단축키 (G키 그룹 생성, ←/→ 페이지 전환)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Phase 31-G: 페이지 전환 단축키
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        e.preventDefault();
        setCurrentPage(currentPage - 1);
        return;
      }
      if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
        e.preventDefault();
        setCurrentPage(currentPage + 1);
        return;
      }

      // G키로 그룹 생성
      if (e.key === 'g' || e.key === 'G') {
        if (selectedBlocks.length > 0) {
          handleGroupCreate(selectedBlocks);
        }
      }

      // Escape로 선택 해제
      if (e.key === 'Escape') {
        setSelectedBlocks([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlocks, handleGroupCreate, currentPage, totalPages]);

  return (
    <div className="h-full flex flex-col">
      {/* Phase 31-J: 줌 컨트롤 (캔버스 상단) */}
      <div className="flex items-center justify-between px-4 py-2 bg-grey-50 border-b">
        <div className="text-sm text-grey-600">
          페이지 {currentPage + 1} / {totalPages}
        </div>
        <ZoomControls scale={zoomScale} onScaleChange={setZoomScale} />
      </div>

      {/* 캔버스 영역 */}
      <div className="flex-1 overflow-auto bg-grey-100">
        {blocksLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-grey-500">페이지 로딩 중...</p>
            </div>
          </div>
        ) : (
          <PageCanvas
            documentId={documentId}
            pageIndex={currentPage}
            blocks={blocksData?.blocks || []}
            groups={localGroups}
            selectedBlocks={selectedBlocks}
            onBlockSelect={handleBlockSelect}
            onGroupCreate={handleGroupCreate}
            zoomScale={zoomScale}
            onZoomChange={setZoomScale}
          />
        )}
      </div>

      {/* 안내 메시지 */}
      {selectedBlocks.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-700 flex items-center gap-2">
            <span className="font-bold">{selectedBlocks.length}개</span> 블록 선택됨
            <span className="text-blue-500">|</span>
            <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm text-xs">G</kbd>
            <span>그룹 생성</span>
            <kbd className="px-1.5 py-0.5 bg-white rounded shadow-sm text-xs ml-2">ESC</kbd>
            <span>선택 해제</span>
          </p>
        </div>
      )}

      {/* 해설 탭에서 선택된 문제가 없을 때 안내 */}
      {isSolutionTab && !selectedProblemId && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
          <p className="text-sm text-amber-700 font-medium">
            오른쪽 문제 목록에서 연결할 문제를 선택하세요
          </p>
        </div>
      )}

      {/* 페이지 네비게이션 */}
      <PageNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        bookPage={currentPage + 1}
      />
    </div>
  );
}
