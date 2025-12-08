/**
 * 페이지 뷰어 메인 컴포넌트
 *
 * Phase 3, 8, 9, 10-2, 11-2, 21.8
 * Phase 39: 레거시 매칭 시스템 제거, 콜백 인터페이스 추가
 *
 * 페이지 이미지, 블록, 그룹을 표시하고 관리
 * - 그룹 생성/삭제/업데이트 이벤트를 콜백으로 전달 (Props Down, Events Up)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePageBlocks,
  usePageGroups,
  useSavePageGroups,
  useBookPage,
  useDocumentSettings,
  useSaveDocumentSettings,
} from '../hooks/useDocuments';
import { useProblemNumberContext } from '../hooks/useProblemNumberContext';
import { useVisitedPages } from '../hooks/useVisitedPages';
import { PageCanvas } from '../components/PageCanvas';
import { SimpleNavigation } from '../components/labeling';
import { PageViewerSidebar } from '../components/PageViewerSidebar';
import { DocumentSettingsModal } from '../components/DocumentSettingsModal';
import { useToast } from '../components/Toast';
// Phase 34-A-2: document_id 파싱
import { extractBookNameAndCourse } from '../utils/documentUtils';
// Phase 44-D: 로그 레벨 시스템
import { logger } from '../utils/logger';
// Phase 56-H: 연속 문제번호 계산
import { getNextProblemNumberWithContext } from '../utils/problemNumberUtils';
// Phase 63: 그룹 연결 정보 주입
import { enrichGroupsWithLinks } from '../utils/groupUtils';
// Phase 45-D: 저장된 페이지만 표시
import { useWorkSessionStore } from '../stores/workSessionStore';
import type { ProblemGroup, PageGroups, ProblemInfo, CrossPageSegment } from '../api/client';
import { api } from '../api/client';

// Phase 50-C: 크로스 페이지 선택 상태 타입
interface CrossPageSelectionState {
  isActive: boolean;
  sourcePageIndex: number;
  sourceColumn: "L" | "R";
  sourceBlockIds: number[];
}

// Phase 39: 콜백 인터페이스 추가
interface PageViewerProps {
  documentId: string;
  totalPages: number;
  /** Phase 39: 외부에서 초기 페이지 지정 */
  initialPage?: number;
  /** Phase 39-A: 새 그룹 생성 시 사용할 이름 (해설 자동 명명용) */
  suggestedGroupName?: string;
  /** Phase 41-B: 선택된 문제 정보 (해설 자동 맵핑용) */
  selectedProblemInfo?: {
    bookName?: string;
    course?: string;
    page?: number;
    problemNumber?: string;
  };
  /** Phase 39: 그룹 생성 시 부모에게 알림 */
  onGroupCreated?: (group: ProblemGroup, pageIndex: number) => void;
  /** Phase 39: 그룹 삭제 시 부모에게 알림 */
  onGroupDeleted?: (groupId: string, pageIndex: number) => void;
  /** Phase 39: 그룹 정보 업데이트 시 부모에게 알림 */
  onGroupUpdated?: (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => void;
  /** Phase 48-B: 페이지 변경 시 부모에게 알림 (탭별 페이지 기억용) */
  onPageChange?: (page: number) => void;
}

export function PageViewer({
  documentId,
  totalPages,
  initialPage = 0,
  suggestedGroupName,
  selectedProblemInfo,
  onGroupCreated,
  onGroupDeleted,
  onGroupUpdated,
  onPageChange,
}: PageViewerProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  // Phase 39: initialPage prop으로 초기 페이지 설정
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);
  const [_isSaving, setIsSaving] = useState(false);
  const [_lastSaved, setLastSaved] = useState<Date | null>(null);
  // Phase 9: 자동 편집 모드
  const [autoEditGroupId, setAutoEditGroupId] = useState<string | null>(null);
  // Phase 11-2: 디바운스 타이머 추적
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 26: 초기 로드 상태 추적 (빈 배열로 덮어쓰기 방지)
  const isInitialLoadRef = useRef(true);
  // Phase 34-F: 페이지 전환 시 이전 그룹 저장용 ref
  const prevPageRef = useRef(currentPage);
  const localGroupsRef = useRef<ProblemGroup[]>([]);
  // Phase 23: 확정 중인 그룹 ID (로딩 표시용)
  const [confirmingGroupId, setConfirmingGroupId] = useState<string | null>(null);

  // Phase 59-A: 페이지 전환 중 상태 (Race Condition 방지)
  const [isPageChanging, setIsPageChanging] = useState(false);

  // Phase 60-D: 미저장 변경사항 추적 (페이지 이탈 방지용)
  const hasUnsavedChangesRef = useRef(false);

  // Phase 50-C: 크로스 페이지 선택 상태
  const [crossPageSelection, setCrossPageSelection] = useState<CrossPageSelectionState>({
    isActive: false,
    sourcePageIndex: -1,
    sourceColumn: "L",
    sourceBlockIds: [],
  });

  // Phase 56-F: 현재 선택된 그룹 ID (단축키용)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Phase 56-G: 모문제 등록 모드 상태
  interface ParentProblemModeState {
    isActive: boolean;            // 모문제 등록 모드 활성화
    parentGroupId: string | null; // 현재 모문제 그룹 ID
    childNumbers: string[];       // 등록된 하위문제 번호들
  }
  const [parentProblemMode, setParentProblemMode] = useState<ParentProblemModeState>({
    isActive: false,
    parentGroupId: null,
    childNumbers: [],
  });

  // Phase 29-D: 문서 설정 모달 상태
  const [showDocumentSettings, setShowDocumentSettings] = useState(false);
  const [hasCheckedSettings, setHasCheckedSettings] = useState(false);

  // Phase 60-D: 페이지 이탈 방지 (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        // 크롬에서는 커스텀 메시지가 무시되지만, 표준 호환을 위해 설정
        e.returnValue = '저장되지 않은 변경사항이 있습니다.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Phase 39: initialPage 변경 시 currentPage 동기화
  // Phase 48-B: 부모에서 온 값이므로 onPageChange 호출하지 않음 (무한 루프 방지)
  useEffect(() => {
    if (currentPage !== initialPage) {
      setCurrentPage(initialPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPage]);

  // 페이지 블록 조회
  const { data: blocksData, isLoading: blocksLoading } = usePageBlocks(
    documentId,
    currentPage
  );

  // 페이지 그룹 조회
  const { data: groupsData } = usePageGroups(documentId, currentPage);

  // Phase 58-B: 이전 페이지 그룹 조회 (XP 그룹의 모문제 연결용)
  // 현재 페이지에 XP 그룹이 있으면 이전 페이지의 모문제를 가져옴
  const hasXPGroups = localGroups.some(g => g.column === 'XP');
  const { data: prevPageGroupsData } = usePageGroups(
    documentId,
    currentPage > 0 ? currentPage - 1 : -1  // -1이면 enabled: false로 쿼리 실행 안됨
  );

  // Phase 58-B: 이전 페이지의 모문제 그룹 목록
  const previousPageParentGroups = useMemo(() => {
    if (!hasXPGroups || !prevPageGroupsData?.groups) return [];
    return prevPageGroupsData.groups
      .filter(g => g.isParent === true)
      .map(g => ({
        ...g,
        pageIndex: currentPage - 1,
      }));
  }, [hasXPGroups, prevPageGroupsData, currentPage]);

  // 그룹 저장 mutation
  const saveGroupsMutation = useSavePageGroups();

  // Phase 8: 책 페이지 오프셋
  const { bookPage } = useBookPage(documentId, currentPage);
  const { data: documentSettings } = useDocumentSettings(documentId);
  const saveSettingsMutation = useSaveDocumentSettings();

  // Phase 10-2: 문항번호 연속성 (페이지간)
  const { getLastProblemNumberBefore } = useProblemNumberContext(documentId);
  const previousPageLastNumber = getLastProblemNumberBefore(currentPage);

  // Phase 40: 방문한 페이지 추적
  const { getVisitedList } = useVisitedPages(documentId, currentPage);
  const visitedPages = getVisitedList().filter(p => p !== currentPage);

  // Phase 45-D: 저장된 페이지만 표시 (세션 데이터에서 추출)
  const currentSession = useWorkSessionStore(state => state.currentSession);

  // Phase 63: 세션 링크 정보를 그룹에 주입 (연결 배지 표시용)
  const enrichedGroups = useMemo(() =>
    enrichGroupsWithLinks(localGroups, currentSession),
    [localGroups, currentSession]
  );

  const savedPages = useMemo(() => {
    if (!currentSession?.problems) return [];
    const pages = [...new Set(currentSession.problems.map(p => p.pageIndex))];
    return pages.filter(p => p !== currentPage).sort((a, b) => a - b);
  }, [currentSession?.problems, currentPage]);

  // Phase 45-D: 세션이 있으면 저장된 페이지, 없으면 방문한 페이지 표시
  const displayPages = currentSession ? savedPages : visitedPages;
  const sectionTitle = currentSession ? "저장된 페이지" : "방문한 페이지";

  // Phase 29-D: 문서 설정 확인 및 모달 표시
  useEffect(() => {
    if (!hasCheckedSettings && documentSettings !== undefined) {
      setHasCheckedSettings(true);
      // defaultBookName이 없으면 설정 모달 표시
      if (!documentSettings?.defaultBookName) {
        setShowDocumentSettings(true);
      }
    }
  }, [documentSettings, hasCheckedSettings]);

  // Phase 29-D: 문서 기본 설정 저장 핸들러
  const handleSaveDocumentDefaults = async (settings: { bookName: string; course: string }) => {
    try {
      await saveSettingsMutation.mutateAsync({
        documentId,
        settings: {
          defaultBookName: settings.bookName,
          defaultCourse: settings.course,
        },
      });
      setShowDocumentSettings(false);
      showToast(`"${settings.bookName}" 설정이 저장되었습니다`, 'success');
    } catch (error) {
      console.error('문서 설정 저장 실패:', error);
      showToast('설정 저장에 실패했습니다', 'error');
    }
  };

  // Phase 11-3: 즉시 저장 (디바운스 우회, 명시적 pageIndex 전달)
  const saveImmediately = async (groups: ProblemGroup[], targetPageIndex: number) => {
    // 대기 중인 디바운스 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    console.log(`[SaveImmediately] Immediate save to page ${targetPageIndex}`);

    // 즉시 저장 실행
    await saveGroups(groups, targetPageIndex);
  };

  // Phase 8: 그룹 문항 정보 업데이트 핸들러
  // Phase 39: 업데이트 시 onGroupUpdated 콜백 호출
  const handleUpdateGroupInfo = async (groupId: string, problemInfo: ProblemInfo) => {
    const updatedGroups = localGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          problemInfo,
          updatedAt: new Date().toISOString(),
        };
      }
      return group;
    });
    setLocalGroups(updatedGroups);

    // Phase 39: 부모 컴포넌트에 그룹 업데이트 알림
    onGroupUpdated?.(groupId, problemInfo, currentPage);

    // 자동완성용: 마지막 사용 값 저장
    try {
      await saveSettingsMutation.mutateAsync({
        documentId,
        settings: {
          defaultBookName: problemInfo.bookName,
          defaultCourse: problemInfo.course,
        },
      });
    } catch (error) {
      console.error('설정 저장 실패:', error);
    }

    // Phase 11-3: 문항 정보 업데이트 시 즉시 저장 (명시적 pageIndex)
    console.log(`[UpdateGroupInfo] Saving group ${groupId} to page ${currentPage}`);
    await saveImmediately(updatedGroups, currentPage);
    showToast('문항 정보가 저장되었습니다', 'success');
  };

  // Phase 56: 모문제 토글 핸들러
  const handleToggleIsParent = async (groupId: string) => {
    const updatedGroups = localGroups.map(group => {
      if (group.id === groupId) {
        const newIsParent = !group.isParent;
        return {
          ...group,
          isParent: newIsParent,
          // 모문제가 되면 parentGroupId 제거
          parentGroupId: newIsParent ? undefined : group.parentGroupId,
          updatedAt: new Date().toISOString(),
        };
      }
      // 만약 이 그룹이 모문제로 지정되면, 이 그룹을 참조하던 하위문제들의 참조 유지
      // 모문제가 해제되면 이 그룹을 참조하던 하위문제들의 parentGroupId 제거
      if (group.parentGroupId === groupId) {
        const targetGroup = localGroups.find(g => g.id === groupId);
        if (targetGroup?.isParent) {
          // 모문제 해제 → 하위문제 연결 해제
          return {
            ...group,
            parentGroupId: undefined,
            updatedAt: new Date().toISOString(),
          };
        }
      }
      return group;
    });
    setLocalGroups(updatedGroups);
    await saveImmediately(updatedGroups, currentPage);

    const targetGroup = localGroups.find(g => g.id === groupId);
    if (targetGroup?.isParent) {
      showToast('모문제 지정이 해제되었습니다', 'success');
    } else {
      showToast('모문제로 지정되었습니다', 'success');
    }
  };

  // Phase 56: 모문제 연결 설정 핸들러
  const handleSetParentGroup = async (groupId: string, parentGroupId: string | null) => {
    const updatedGroups = localGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          parentGroupId: parentGroupId || undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return group;
    });
    setLocalGroups(updatedGroups);
    await saveImmediately(updatedGroups, currentPage);

    if (parentGroupId) {
      const parentGroup = localGroups.find(g => g.id === parentGroupId);
      const parentName = parentGroup?.problemInfo?.problemNumber || parentGroupId;
      showToast(`모문제 "${parentName}"에 연결되었습니다`, 'success');
    } else {
      showToast('모문제 연결이 해제되었습니다', 'success');
    }
  };

  // Phase 56-G: 모문제 완료 처리 함수
  const finalizeParentProblem = async () => {
    if (!parentProblemMode.isActive || !parentProblemMode.parentGroupId) return;

    const childNums = parentProblemMode.childNumbers;

    // 모문제 이름 자동 생성
    let parentName: string;
    if (childNums.length === 0) {
      parentName = '(빈 모문제)';
    } else if (childNums.length === 1) {
      parentName = `${childNums[0]}의 모문제`;
    } else {
      parentName = `${childNums[0]}~${childNums[childNums.length - 1]}의 모문제`;
    }

    // 모문제 그룹 업데이트
    const updatedGroups = localGroups.map(g =>
      g.id === parentProblemMode.parentGroupId
        ? {
            ...g,
            displayName: parentName,
            problemInfo: g.problemInfo ? { ...g.problemInfo, problemNumber: parentName } : undefined,
          }
        : g
    );
    setLocalGroups(updatedGroups);
    await saveImmediately(updatedGroups, currentPage);

    // 모드 해제
    setParentProblemMode({
      isActive: false,
      parentGroupId: null,
      childNumbers: [],
    });

    showToast(`모문제 "${parentName}" 등록 완료`, 'success');
  };

  // 그룹 데이터 동기화
  // Phase 26: 서버 데이터 로드 완료 시 isInitialLoadRef를 false로 설정
  // Phase 49: currentPage 의존성 추가 (React Query 캐시 참조 문제 해결)
  // Phase 52: 그룹 로딩의 단일 책임점 - page transition effect에서 setLocalGroups([]) 제거
  useEffect(() => {
    if (groupsData && groupsData.page_index === currentPage) {
      // 캐시된 페이지 복귀 또는 새 데이터 로드 완료
      setLocalGroups(groupsData.groups || []);
      isInitialLoadRef.current = false;
      logger.debug('PageViewer', `Loaded ${groupsData.groups?.length || 0} groups for page ${currentPage}`);
    }
    // Phase 52: groupsData가 없거나 다른 페이지 데이터인 경우
    // - 새 페이지로 이동 중이면 React Query가 로딩 중
    // - isInitialLoadRef.current = true 상태이므로 자동 저장 차단됨
    // - 이전 페이지 그룹이 잠시 보일 수 있지만 phase 49 조건으로 덮어쓰기 차단
  }, [groupsData, currentPage]);

  // Phase 34-F: localGroups 변경 시 ref 동기화 (페이지 전환 시 저장용)
  useEffect(() => {
    localGroupsRef.current = localGroups;
  }, [localGroups]);

  // Phase 21.8: 페이지 변경 시 선택 초기화
  // Phase 26: isInitialLoadRef를 true로 설정하여 빈 배열 저장 방지
  // Phase 34-F: 페이지 변경 전 이전 페이지 그룹 자동 저장
  // Phase 44-A: 스냅샷 복사로 타이밍 이슈 해결
  // Phase 52: setLocalGroups([]) 제거 - groupsData effect에서 처리 (덮어쓰기 버그 수정)
  // Phase 59-A: safePageChange에서 저장 시 중복 저장 방지
  useEffect(() => {
    const prevPage = prevPageRef.current;

    // 페이지 번호 업데이트
    prevPageRef.current = currentPage;

    // Phase 52: 선택만 초기화, localGroups는 groupsData effect에서 처리
    // Phase 50-C: 크로스 페이지 모드에서는 선택 유지
    if (!crossPageSelection.isActive) {
      setSelectedBlocks([]);
    }
    isInitialLoadRef.current = true;  // 새 페이지 로드 시작 - 자동 저장 비활성화
    logger.debug('PageViewer', `Page ${currentPage} ready for data (prev: ${prevPage})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, crossPageSelection.isActive]);

  // Phase 56-F: 블록 선택 시 해당 그룹도 자동 선택 (단축키용)
  useEffect(() => {
    if (selectedBlocks.length > 0) {
      const matchingGroup = localGroups.find(g =>
        g.block_ids.some(id => selectedBlocks.includes(id))
      );
      setSelectedGroupId(matchingGroup?.id || null);
    } else {
      setSelectedGroupId(null);
    }
  }, [selectedBlocks, localGroups]);

  // 자동 저장 (디바운스: 2초)
  // Phase 11-3: 디바운스 타이머를 ref로 추적, 명시적 pageIndex 전달
  // Phase 26: 초기 로드 중에는 저장하지 않음 (빈 배열로 덮어쓰기 방지)
  useEffect(() => {
    // 초기 로드 시 저장하지 않음
    if (!groupsData) return;

    // Phase 26: 서버 데이터 로드 전에는 저장하지 않음
    if (isInitialLoadRef.current) {
      console.log(`[Phase 26] Skipping auto-save: initial load in progress`);
      return;
    }

    // Phase 60-D: 변경사항이 있음을 표시 (저장 전까지 유지)
    hasUnsavedChangesRef.current = true;

    // 기존 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 현재 페이지를 클로저 외부에서 캡처
    const pageToSave = currentPage;

    // 2초 후 자동 저장
    debounceTimerRef.current = setTimeout(() => {
      console.log(`[Debounce] Auto-saving page ${pageToSave}`);
      saveGroups(localGroups, pageToSave);
      debounceTimerRef.current = null;
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [localGroups]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Phase 11-3: Ctrl+S 즉시 저장 (입력 필드에서도 동작, 명시적 pageIndex)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        console.log(`[Ctrl+S] Saving current page ${currentPage}`);
        await saveImmediately(localGroups, currentPage);
        showToast('변경사항이 즉시 저장되었습니다', 'success');
        return;
      }

      // 입력 필드에서는 단축키 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          // Phase 59-A: safePageChange 사용 (Race Condition 방지)
          if (currentPage > 0) {
            await safePageChange(currentPage - 1);
          }
          break;
        case 'ArrowRight':
          // Phase 59-A: safePageChange 사용 (Race Condition 방지)
          if (currentPage < totalPages - 1) {
            await safePageChange(currentPage + 1);
          }
          break;
        case 'g':
        case 'G':
        case 'Enter':
          // Phase 9-3: G 키로 그룹 생성, Phase 21.6: Enter 키 추가
          // Phase 50-C: 크로스 페이지 모드일 때는 크로스 페이지 그룹 생성
          // Phase 56-G: 모문제 모드 종료 후 일반 그룹 생성
          if (selectedBlocks.length > 0) {
            e.preventDefault();

            // 모문제 모드 종료 처리 (있으면)
            if (parentProblemMode.isActive) {
              await finalizeParentProblem();
            }

            if (crossPageSelection.isActive) {
              handleCreateCrossPageGroup();
            } else {
              handleCreateGroup();
            }
          }
          break;
        case 'Delete':
        case 'Backspace':
          // 선택된 블록이 있으면 해당 그룹 삭제
          if (selectedBlocks.length > 0) {
            e.preventDefault();
            const groupToDelete = localGroups.find((g) =>
              g.block_ids.every((id) => selectedBlocks.includes(id)) &&
              selectedBlocks.every((id) => g.block_ids.includes(id))
            );
            if (groupToDelete) {
              handleDeleteGroup(groupToDelete.id);
              setSelectedBlocks([]);
            }
          }
          break;
        case 'Escape':
          // Phase 50-C: 크로스 페이지 모드 취소
          // Phase 56-G: 모문제 모드 취소
          if (crossPageSelection.isActive) {
            handleCancelCrossPage();
          } else if (parentProblemMode.isActive) {
            // 모문제 모드 종료 (생성된 그룹 유지)
            await finalizeParentProblem();
          } else {
            // 선택 해제
            setSelectedBlocks([]);
          }
          break;
        case 'p':
        case 'P':
          // Phase 50-C: P키로 크로스 페이지 모드 시작
          if (selectedBlocks.length > 0 && !crossPageSelection.isActive) {
            e.preventDefault();
            handleStartCrossPage();
          }
          break;
        case 'm':
        case 'M':
          // Phase 56-G: M키로 모문제 생성 + 모드 진입
          if (selectedBlocks.length > 0) {
            e.preventDefault();

            // 이미 모드 중이면 이전 모문제 완료
            if (parentProblemMode.isActive) {
              await finalizeParentProblem();
            }

            // 1. 블록 정보 가져오기
            const currentBlocks = blocksData?.blocks || [];
            const selectedBlocksInfo = currentBlocks.filter((b) => selectedBlocks.includes(b.block_id));
            const columns = [...new Set(selectedBlocksInfo.map((b) => b.column))];
            const column = columns.length === 1 ? columns[0] : 'X';

            // 2. 모문제 그룹 생성
            const newGroupId = `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newGroup: ProblemGroup = {
              id: newGroupId,
              block_ids: [...selectedBlocks],
              column: column as 'L' | 'R' | 'X',
              isParent: true,
              problemInfo: {
                problemNumber: '(모문제)',
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const updatedGroups = [...localGroups, newGroup];
            setLocalGroups(updatedGroups);
            await saveImmediately(updatedGroups, currentPage);

            // 3. 모문제 모드 진입
            setParentProblemMode({
              isActive: true,
              parentGroupId: newGroupId,
              childNumbers: [],
            });

            // 4. 블록 선택 해제
            setSelectedBlocks([]);

            showToast('모문제 모드: L키로 하위문제 추가, G키로 완료', 'info');
          }
          break;
        case 'l':
        case 'L':
          // Phase 56-H: L키로 하위문제 생성 + 연속 번호 + 메타데이터
          if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
            e.preventDefault();

            // 1. 페이지 연속 번호 계산 (Phase 56-H)
            const nextNumber = getNextProblemNumberWithContext(
              localGroups,
              previousPageLastNumber
            );

            // 2. 블록 정보 가져오기
            const currentBlocksL = blocksData?.blocks || [];
            const selectedBlocksInfoL = currentBlocksL.filter((b) => selectedBlocks.includes(b.block_id));
            const columnsL = [...new Set(selectedBlocksInfoL.map((b) => b.column))];
            const columnL = columnsL.length === 1 ? columnsL[0] : 'X';

            // 3. 메타데이터 준비 (Phase 56-H)
            const { bookName, course } = extractBookNameAndCourse(documentId);

            // 4. 하위문제 그룹 생성 (메타데이터 포함)
            const newChildGroupId = `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newChildGroup: ProblemGroup = {
              id: newChildGroupId,
              block_ids: [...selectedBlocks],
              column: columnL as 'L' | 'R' | 'X',
              isParent: false,
              parentGroupId: parentProblemMode.parentGroupId || undefined,
              problemInfo: {
                problemNumber: nextNumber,
                // Phase 56-H: 일반 문제와 동일한 메타데이터
                bookName: documentSettings?.defaultBookName || bookName,
                course: documentSettings?.defaultCourse || course,
                page: bookPage,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const updatedGroupsL = [...localGroups, newChildGroup];
            setLocalGroups(updatedGroupsL);
            await saveImmediately(updatedGroupsL, currentPage);

            // 5. 상태 업데이트
            setParentProblemMode(prev => ({
              ...prev,
              childNumbers: [...prev.childNumbers, nextNumber],
            }));

            // Phase 56-J: 편집 모드 활성화 (일반 문제와 동일하게 우측 패널 열림)
            setAutoEditGroupId(newChildGroupId);

            // 6. 블록 선택 해제
            setSelectedBlocks([]);
          } else if (selectedBlocks.length > 0 && !parentProblemMode.isActive) {
            showToast('먼저 M키로 모문제를 생성하세요', 'warning');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages, selectedBlocks, localGroups, crossPageSelection.isActive, selectedGroupId, parentProblemMode, isPageChanging]);

  // 블록 선택 핸들러
  // Phase 53-A: isShiftSelect 파라미터 추가 (크로스 컬럼 선택)
  const handleBlockSelect = (blockId: number, isMultiSelect: boolean, isShiftSelect?: boolean) => {
    setSelectedBlocks((prev) => {
      if (isMultiSelect || isShiftSelect) {
        // Ctrl+클릭 또는 Shift+클릭: 토글/추가
        if (prev.includes(blockId)) {
          return prev.filter((id) => id !== blockId);
        } else {
          return [...prev, blockId];
        }
      } else {
        // 일반 클릭: 단일 선택
        return [blockId];
      }
    });
  };

  // 그룹 생성
  // Phase 33-C: 그룹 생성 시 자동으로 문제은행에 등록
  // Phase 39: 그룹 생성 시 onGroupCreated 콜백 호출
  // Phase 53-B: 크로스 컬럼 감지
  // Phase 53-C: 그룹 데이터 모델 확장 (segments)
  const handleCreateGroup = async () => {
    if (selectedBlocks.length === 0) return;

    // Phase 53-B: 선택된 블록들의 컬럼 분석
    const selectedBlocksData = blocksData?.blocks.filter(
      (b) => selectedBlocks.includes(b.block_id)
    ) || [];
    if (selectedBlocksData.length === 0) return;

    const columns = new Set(selectedBlocksData.map(b => b.column));
    const isCrossColumn = columns.size > 1;  // L과 R 모두 포함

    // 컬럼 결정
    let column: "L" | "R" | "X";
    if (isCrossColumn) {
      column = "X";
    } else {
      column = (selectedBlocksData[0]?.column as "L" | "R") || "L";
    }

    // Phase 47: 그룹 ID 생성 - 페이지 정보 포함하여 전역 고유성 보장
    // 형식: "p{페이지번호}_{컬럼}{순번}" (예: "p10_L1", "p18_R2", "p10_X1")
    const existingGroups = localGroups.filter((g) => g.column === column);
    const maxNumber = existingGroups.reduce((max, g) => {
      // 새 형식 "p10_L1" 또는 기존 형식 "L1" 모두 처리
      const match = g.id.match(/(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[0], 10));
      }
      return max;
    }, 0);
    const newGroupId = `p${currentPage}_${column}${maxNumber + 1}`;

    // 새 그룹 생성 - Phase 33-C: 자동으로 confirmed 상태로 생성
    // Phase 39-A: suggestedGroupName이 있으면 problemInfo에 설정 (해설 자동 명명)
    let newGroup: ProblemGroup = {
      id: newGroupId,
      column: column,
      block_ids: [...selectedBlocks].sort((a, b) => a - b),
      status: 'confirmed',
      exportedAt: new Date().toISOString(),
      ...(suggestedGroupName && {
        problemInfo: {
          problemNumber: suggestedGroupName,
        },
      }),
    };

    // Phase 53-C: 크로스 컬럼 그룹일 경우 segments 추가
    if (isCrossColumn) {
      const lBlocks = selectedBlocksData.filter(b => b.column === "L");
      const rBlocks = selectedBlocksData.filter(b => b.column === "R");

      // 한국어 책 읽기 순서: L(왼쪽) → R(오른쪽) 고정
      const segments = [
        { column: "L" as const, block_ids: lBlocks.map(b => b.block_id), order: 0 },
        { column: "R" as const, block_ids: rBlocks.map(b => b.block_id), order: 1 },
      ].filter(seg => seg.block_ids.length > 0);

      newGroup = {
        ...newGroup,
        segments,
      };
    }

    // Phase 60-C: Optimistic Update - 이전 상태 저장
    const previousGroups = [...localGroups];
    const previousSelectedBlocks = [...selectedBlocks];

    const updatedGroups = [...localGroups, newGroup];
    setLocalGroups(updatedGroups);
    localGroupsRef.current = updatedGroups;
    setSelectedBlocks([]);

    // Phase 9: 자동 편집 모드 트리거
    setAutoEditGroupId(newGroupId);

    // Phase 39: 부모 컴포넌트에 그룹 생성 알림
    // UnifiedWorkPage에서 workSessionStore와 연동
    onGroupCreated?.(newGroup, currentPage);

    // Phase 33-C: 그룹 저장 후 자동으로 문제은행에 등록
    // Phase 56-L: Race condition 방지를 위한 재시도 로직 추가
    const exportWithRetry = async (maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Phase 53-Fix-C: X 그룹은 segments 포함하여 직접 전달
          if (newGroup.column === 'X' && newGroup.segments) {
            await api.exportGroupWithData(documentId, currentPage, newGroupId, newGroup);
            console.log(`[Phase 53-Fix-C] X 그룹 세로 합성 export: ${newGroupId}`);
          } else {
            await api.exportGroup(documentId, currentPage, newGroupId);
          }
          return true; // 성공
        } catch (error) {
          console.warn(`[Phase 56-L] Export attempt ${attempt + 1}/${maxRetries} failed:`, error);
          if (attempt < maxRetries - 1) {
            // 재시도 전 대기 (지수 백오프: 150ms, 300ms)
            await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
          } else {
            throw error; // 마지막 시도 실패
          }
        }
      }
      return false;
    };

    try {
      // 1. 먼저 그룹 저장
      await saveImmediately(updatedGroups, currentPage);

      // Phase 56-L: 파일 시스템 반영 대기 (100ms)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. 그룹 이미지 크롭 & 내보내기 (재시도 로직 포함)
      await exportWithRetry(3);

      // 3. 성공 토스트 (실행취소 버튼 포함)
      showToast('문제가 문제은행에 등록되었습니다', {
        type: 'success',
        action: {
          label: '실행취소',
          onClick: () => handleUndoExport(newGroupId),
        },
      });

      console.log(`[Phase 39] Group ${newGroupId} created and auto-registered`);
    } catch (error: any) {
      console.error('[Phase 33-C] Auto-export failed:', error);

      // Phase 60-C: 롤백 - 이전 상태로 복원
      setLocalGroups(previousGroups);
      localGroupsRef.current = previousGroups;
      setSelectedBlocks(previousSelectedBlocks);
      setAutoEditGroupId(null);

      // Phase 56-L: 구체적인 에러 메시지
      const errorMessage = error?.response?.status === 404
        ? '그룹 저장 실패. 다시 시도해주세요.'
        : '그룹 생성에 실패했습니다. 다시 시도해주세요.';
      showToast(errorMessage, { type: 'error' });
    }
  };

  // Phase 33-C: 실행취소 핸들러 (그룹 삭제 + export 파일 삭제)
  const handleUndoExport = async (groupId: string) => {
    try {
      // 1. export된 파일 삭제
      await api.deleteProblem(documentId, currentPage, groupId);

      // 2. 로컬 그룹 목록에서 삭제
      const updatedGroups = localGroups.filter(g => g.id !== groupId);
      setLocalGroups(updatedGroups);

      // 3. 서버에 저장
      await saveImmediately(updatedGroups, currentPage);

      showToast('등록이 취소되었습니다', { type: 'info' });
      console.log(`[Phase 33-C] Undo export for group ${groupId}`);
    } catch (error) {
      console.error('[Phase 33-C] Undo failed:', error);
      showToast('실행취소에 실패했습니다', { type: 'error' });
    }
  };

  // 그룹 삭제
  // Phase 39: 삭제 시 onGroupDeleted 콜백 호출
  // Phase 60-C: Optimistic Update with rollback
  const handleDeleteGroup = async (groupId: string) => {
    // Optimistic Update: 즉시 UI 업데이트
    const previousGroups = [...localGroups];
    const updatedGroups = localGroups.filter((g) => g.id !== groupId);
    setLocalGroups(updatedGroups);
    localGroupsRef.current = updatedGroups;

    // Phase 39: 부모 컴포넌트에 그룹 삭제 알림
    onGroupDeleted?.(groupId, currentPage);

    // Phase 60-C: 즉시 저장 시도 및 실패 시 롤백
    try {
      await saveGroups(updatedGroups, currentPage);
      showToast('그룹이 삭제되었습니다', 'success');
    } catch (error) {
      console.error('[Phase 60-C] Delete rollback:', error);
      // 롤백: 이전 상태로 복원
      setLocalGroups(previousGroups);
      localGroupsRef.current = previousGroups;
      showToast('삭제 실패, 다시 시도해주세요', 'error');
    }
  };

  // Phase 50-C: 크로스 페이지 모드 시작
  const handleStartCrossPage = () => {
    if (selectedBlocks.length === 0) {
      showToast('먼저 블록을 선택하세요', 'warning');
      return;
    }

    // 선택된 블록들의 컬럼 확인
    const currentBlocks = blocksData?.blocks || [];
    const selectedBlocksInfo = currentBlocks.filter((b) => selectedBlocks.includes(b.block_id));
    const columns = [...new Set(selectedBlocksInfo.map((b) => b.column))];

    // 크로스 페이지는 단일 컬럼에서만 시작 가능 (보통 R컬럼)
    if (columns.length > 1) {
      showToast('크로스 페이지는 한 컬럼에서만 시작할 수 있습니다', 'warning');
      return;
    }

    const sourceColumn = (columns[0] || "R") as "L" | "R";

    // R컬럼에서만 크로스 페이지 시작 권장
    if (sourceColumn !== "R") {
      showToast('크로스 페이지는 보통 오른쪽 컬럼(R)에서 시작합니다', 'info');
    }

    // 마지막 페이지인지 확인
    if (currentPage >= totalPages - 1) {
      showToast('마지막 페이지입니다. 다음 페이지가 없습니다.', 'warning');
      return;
    }

    // 크로스 페이지 선택 상태 저장
    setCrossPageSelection({
      isActive: true,
      sourcePageIndex: currentPage,
      sourceColumn: sourceColumn,
      sourceBlockIds: [...selectedBlocks],
    });

    // 다음 페이지로 이동
    setCurrentPage(currentPage + 1);
    showToast(`다음 페이지에서 이어지는 블록을 선택하고 Enter를 누르세요`, 'info');
  };

  // Phase 50-C: 크로스 페이지 그룹 생성
  const handleCreateCrossPageGroup = async () => {
    if (!crossPageSelection.isActive) return;
    if (selectedBlocks.length === 0) {
      showToast('다음 페이지에서 이어지는 블록을 선택하세요', 'warning');
      return;
    }

    // 현재 페이지 블록 데이터
    const currentBlocks = blocksData?.blocks || [];
    const currentPageBlocks = currentBlocks.filter((b) => selectedBlocks.includes(b.block_id));
    const currentColumns = [...new Set(currentPageBlocks.map((b) => b.column))];

    // 다음 페이지는 L컬럼에서만 선택 가능
    if (currentColumns.length > 1 || currentColumns[0] !== "L") {
      showToast('다음 페이지에서는 왼쪽 컬럼(L)만 선택 가능합니다', 'warning');
      return;
    }

    // 그룹 ID 생성 - XP 그룹용
    const sourcePageIndex = crossPageSelection.sourcePageIndex;
    const existingXPGroups = localGroups.filter((g) => g.column === 'XP');
    const maxXPNumber = existingXPGroups.reduce((max, g) => {
      const match = g.id.match(/(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[0], 10));
      }
      return max;
    }, 0);
    const newGroupId = `p${sourcePageIndex}_XP${maxXPNumber + 1}`;

    // crossPageSegments 구성
    const crossPageSegments = [
      {
        page: crossPageSelection.sourcePageIndex,
        column: crossPageSelection.sourceColumn,
        block_ids: crossPageSelection.sourceBlockIds,
        order: 0,
      },
      {
        page: currentPage,
        column: "L" as const,
        block_ids: [...selectedBlocks],
        order: 1,
      },
    ];

    // 전체 블록 ID (첫 페이지 기준)
    const allBlockIds = crossPageSelection.sourceBlockIds;

    // 크로스 페이지 그룹 생성
    const newGroup: ProblemGroup = {
      id: newGroupId,
      block_ids: allBlockIds,
      column: 'XP', // 크로스 페이지 표시
      crossPageSegments,
      status: 'confirmed',
      exportedAt: new Date().toISOString(),
    };

    // 첫 페이지의 그룹 목록에 추가 (sourcePageIndex의 groups.json에 저장)
    // 먼저 첫 페이지의 그룹 로드
    try {
      const sourcePageGroups = await queryClient.fetchQuery({
        queryKey: ['groups', documentId, crossPageSelection.sourcePageIndex],
        queryFn: () => api.getPageGroups(documentId, crossPageSelection.sourcePageIndex),
      });

      const updatedSourceGroups = [...(sourcePageGroups?.groups || []), newGroup];

      // 첫 페이지에 저장
      await saveGroupsMutation.mutateAsync({
        documentId,
        pageIndex: crossPageSelection.sourcePageIndex,
        groups: {
          document_id: documentId,
          page_index: crossPageSelection.sourcePageIndex,
          groups: updatedSourceGroups,
        },
      });

      // 자동 내보내기
      await api.exportGroupWithData(documentId, crossPageSelection.sourcePageIndex, newGroupId, newGroup);

      // Phase 50-C Fix: workSessionStore에 그룹 등록 (문제은행 연결용)
      onGroupCreated?.(newGroup, crossPageSelection.sourcePageIndex);

      // 상태 초기화
      setCrossPageSelection({
        isActive: false,
        sourcePageIndex: -1,
        sourceColumn: "L",
        sourceBlockIds: [],
      });
      setSelectedBlocks([]);

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['groups', documentId, crossPageSelection.sourcePageIndex] });
      queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });

      showToast('크로스 페이지 문제가 생성되었습니다!', 'success');
      console.log(`[Phase 50-C] Cross-page group created: ${newGroupId}`);

      // 첫 페이지로 돌아가기 (선택사항)
      setCurrentPage(crossPageSelection.sourcePageIndex);
    } catch (error) {
      console.error('[Phase 50-C] Cross-page group creation failed:', error);
      showToast('크로스 페이지 그룹 생성에 실패했습니다', 'error');
    }
  };

  // Phase 50-C: 크로스 페이지 모드 취소
  const handleCancelCrossPage = () => {
    if (!crossPageSelection.isActive) return;

    const sourcePageIndex = crossPageSelection.sourcePageIndex;

    setCrossPageSelection({
      isActive: false,
      sourcePageIndex: -1,
      sourceColumn: "L",
      sourceBlockIds: [],
    });
    setSelectedBlocks([]);

    // 원래 페이지로 돌아가기
    setCurrentPage(sourcePageIndex);
    showToast('크로스 페이지 선택이 취소되었습니다', 'info');
  };

  // 그룹 선택 (그룹의 블록들을 선택)
  const handleGroupSelect = (blockIds: number[]) => {
    setSelectedBlocks(blockIds);
  };

  // 그룹 저장 (서버)
  // Phase 11-3: 명시적 pageIndex 전달로 클로저 문제 해결
  const saveGroups = async (groups: ProblemGroup[], targetPageIndex: number) => {
    const groupsData: PageGroups = {
      document_id: documentId,
      page_index: targetPageIndex,
      groups: groups,
    };

    // 디버깅 로그
    console.log(`[SaveGroups] Saving to page ${targetPageIndex}, current page: ${currentPage}`);
    console.log(`[SaveGroups] Groups count: ${groups.length}`);

    setIsSaving(true);
    try {
      await saveGroupsMutation.mutateAsync({
        documentId,
        pageIndex: targetPageIndex,
        groups: groupsData,
      });
      setLastSaved(new Date());

      // Phase 60-D: 저장 성공 시 미저장 상태 해제
      hasUnsavedChangesRef.current = false;

      // Phase 10-2: 그룹 저장 후 요약 캐시 무효화 (다음 페이지에서 최신 정보 반영)
      queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });

      console.log(`[SaveGroups] ✅ Successfully saved to page ${targetPageIndex}`);
    } catch (error) {
      console.error('그룹 저장 실패:', error);
      showToast('그룹 저장에 실패했습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Phase 59-A: 안전한 페이지 전환 함수 (Race Condition 방지)
  const safePageChange = useCallback(async (newPage: number) => {
    // 유효성 검사
    if (newPage < 0 || newPage >= totalPages) return;
    if (newPage === currentPage) return;
    if (isPageChanging) {
      console.log('[Phase 59-A] Page change in progress, ignoring');
      return;
    }

    setIsPageChanging(true);
    try {
      // 모문제 모드 자동 완료
      if (parentProblemMode.isActive) {
        await finalizeParentProblem();
      }

      // 현재 페이지 저장 완료 대기
      const groupsToSave = [...localGroupsRef.current];
      if (groupsToSave.length > 0) {
        logger.info('PageViewer', `[Phase 59-A] Saving ${groupsToSave.length} groups before page change`);
        await saveGroups(groupsToSave, currentPage);
      }

      // 저장 완료 후 페이지 전환
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      logger.debug('PageViewer', `[Phase 59-A] Page changed to ${newPage}`);
    } catch (error) {
      console.error('[Phase 59-A] Page change failed:', error);
      showToast('페이지 전환 중 오류가 발생했습니다', 'error');
    } finally {
      setIsPageChanging(false);
    }
  }, [currentPage, totalPages, isPageChanging, parentProblemMode.isActive, onPageChange, showToast]);

  // 현재 페이지 내보내기 (Phase 4)
  const _handleExportPage = async () => {
    if (localGroups.length === 0) {
      showToast('내보낼 그룹이 없습니다. 먼저 그룹을 생성하세요.', 'warning');
      return;
    }

    if (!confirm(`현재 페이지의 ${localGroups.length}개 그룹을 이미지로 내보내시겠습니까?`)) {
      return;
    }

    try {
      const result = await api.exportPageProblems(documentId, currentPage);
      showToast(`${result.exported_count}개의 문제가 성공적으로 내보내졌습니다!`, 'success');
    } catch (error) {
      console.error('내보내기 실패:', error);
      showToast('내보내기에 실패했습니다', 'error');
    }
  };

  // Phase 23: 개별 그룹 확정 (자동으로 문제은행에 등록)
  const handleConfirmGroup = useCallback(async (groupId: string) => {
    setConfirmingGroupId(groupId);
    try {
      // Phase 53-Fix-C: 확정할 그룹 찾기
      const targetGroup = localGroups.find(g => g.id === groupId);

      // 1. 로컬 상태 업데이트 (즉시 반영)
      const updatedGroups = localGroups.map(g =>
        g.id === groupId
          ? { ...g, status: 'confirmed' as const, exportedAt: new Date().toISOString() }
          : g
      );
      setLocalGroups(updatedGroups);

      // 2. 그룹 정보 서버에 저장
      await saveImmediately(updatedGroups, currentPage);

      // 3. 이미지 크롭 & 내보내기 API 호출
      // Phase 53-Fix-C: X 그룹은 segments 포함하여 직접 전달
      if (targetGroup?.column === 'X' && targetGroup?.segments) {
        await api.exportGroupWithData(documentId, currentPage, groupId, targetGroup);
        console.log(`[Phase 53-Fix-C] X 그룹 세로 합성 export: ${groupId}`);
      } else {
        await api.exportGroup(documentId, currentPage, groupId);
      }

      // 4. 성공 알림
      showToast('문제가 문제은행에 등록되었습니다', 'success');
      console.log(`[Phase 23] Group ${groupId} confirmed and exported`);
    } catch (error) {
      console.error('그룹 확정 실패:', error);
      showToast('그룹 확정에 실패했습니다', 'error');
      // 실패 시 상태 롤백
      setLocalGroups(localGroups);
    } finally {
      setConfirmingGroupId(null);
    }
  }, [localGroups, documentId, currentPage, showToast]);

  // Phase 23: 전체 그룹 확정
  const handleConfirmAll = useCallback(async () => {
    const unconfirmedGroups = localGroups.filter(g => g.status !== 'confirmed');
    if (unconfirmedGroups.length === 0) {
      showToast('확정할 그룹이 없습니다', 'warning');
      return;
    }

    if (!confirm(`${unconfirmedGroups.length}개의 미확정 그룹을 모두 확정하시겠습니까?`)) {
      return;
    }

    // 순차적으로 확정 (병렬 실행 시 서버 부하 우려)
    for (const group of unconfirmedGroups) {
      await handleConfirmGroup(group.id);
    }

    showToast(`${unconfirmedGroups.length}개 그룹이 문제은행에 등록되었습니다`, 'success');
  }, [localGroups, handleConfirmGroup, showToast]);

  if (blocksLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-grey-500">페이지 로딩 중...</div>
      </div>
    );
  }

  if (!blocksData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">페이지 데이터를 불러올 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase 29-D: 문서 설정 모달 */}
      {/* Phase 34-A-2: document_id 파싱하여 기본값 제안 */}
      <DocumentSettingsModal
        isOpen={showDocumentSettings}
        onClose={() => setShowDocumentSettings(false)}
        onSave={handleSaveDocumentDefaults}
        documentName={documentId}
        initialBookName={documentSettings?.defaultBookName || extractBookNameAndCourse(documentId).bookName}
        initialCourse={documentSettings?.defaultCourse || extractBookNameAndCourse(documentId).course}
      />

      {/* Phase 59-A: 페이지 전환 중 로딩 오버레이 */}
      {isPageChanging && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-grey-600">페이지 저장 중...</span>
          </div>
        </div>
      )}

      {/* Phase 40: 간소화된 네비게이션 */}
      {/* Phase 48-B: 페이지 변경 시 부모에게도 알림 */}
      {/* Phase 59-A: safePageChange 사용 */}
      <SimpleNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        bookPage={bookPage}
        onPageChange={(page) => safePageChange(page)}
      />

      {/* 메인 영역: 캔버스 + 그룹 패널 */}
      {/* Phase 39: 항상 그룹 패널 표시 (레거시 조건 제거) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 캔버스 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-grey-200 overflow-hidden">
            <PageCanvas
              documentId={documentId}
              pageIndex={currentPage}
              blocks={blocksData.blocks}
              groups={localGroups}
              selectedBlocks={selectedBlocks}
              onBlockSelect={handleBlockSelect}
              onGroupCreate={handleCreateGroup}
            />
          </div>
        </div>

        {/* Phase 61-A: 사이드바 컴포넌트 분리 */}
        {/* Phase 63: enrichedGroups로 변경 (연결 배지 표시) */}
        <PageViewerSidebar
          bookPage={bookPage}
          currentPage={currentPage}
          localGroups={enrichedGroups}
          isPageChanging={isPageChanging}
          displayPages={displayPages}
          sectionTitle={sectionTitle}
          currentSession={currentSession}
          onPageChange={safePageChange}
          groupPanelProps={{
            selectedBlocks,
            onCreateGroup: handleCreateGroup,
            onDeleteGroup: handleDeleteGroup,
            onGroupSelect: handleGroupSelect,
            bookPage,
            defaultBookName: documentSettings?.defaultBookName || extractBookNameAndCourse(documentId).bookName,
            defaultCourse: documentSettings?.defaultCourse || extractBookNameAndCourse(documentId).course,
            onUpdateGroupInfo: handleUpdateGroupInfo,
            autoEditGroupId,
            onAutoEditComplete: () => setAutoEditGroupId(null),
            previousPageLastNumber,
            onConfirmGroup: handleConfirmGroup,
            onConfirmAll: handleConfirmAll,
            confirmingGroupId,
            selectedProblemInfo,
            crossPageMode: crossPageSelection.isActive ? {
              isActive: true,
              sourcePageIndex: crossPageSelection.sourcePageIndex,
              sourceColumn: crossPageSelection.sourceColumn,
              sourceBlockCount: crossPageSelection.sourceBlockIds.length,
            } : undefined,
            onStartCrossPage: handleStartCrossPage,
            onCancelCrossPage: handleCancelCrossPage,
            onToggleIsParent: handleToggleIsParent,
            onSetParentGroup: handleSetParentGroup,
            parentProblemMode,
            previousPageParentGroups,
          }}
        />
      </div>
    </div>
  );
}
