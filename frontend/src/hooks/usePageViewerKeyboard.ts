/**
 * usePageViewerKeyboard Hook (Phase 62-C-1)
 *
 * PageViewer에서 키보드 단축키 관련 로직을 분리
 * - Ctrl+S: 즉시 저장
 * - Arrow Left/Right: 페이지 이동
 * - G/Enter: 그룹 생성
 * - Delete/Backspace: 그룹 삭제
 * - Escape: 모드 취소
 * - P: 크로스 페이지 모드
 * - M: 모문제 생성
 * - L: 하위문제 생성
 */
import { useEffect } from 'react';
import type { ProblemGroup } from '../api/client';

// 블록 데이터 타입
interface BlockData {
  block_id: number;
  column: string;
  [key: string]: unknown;
}

// ============================================
// Type Definitions
// ============================================

export interface ParentProblemModeState {
  isActive: boolean;
  parentGroupId: string | null;
  childNumbers: string[];
}

export interface CrossPageSelectionState {
  isActive: boolean;
  sourcePageIndex: number;
  sourceColumn: 'L' | 'R';
  sourceBlockIds: number[];
}

export interface UsePageViewerKeyboardParams {
  currentPage: number;
  totalPages: number;
  selectedBlocks: number[];
  localGroups: ProblemGroup[];
  blocksData: { blocks: BlockData[] } | undefined;
  crossPageSelection: CrossPageSelectionState;
  parentProblemMode: ParentProblemModeState;
  isPageChanging: boolean;
  documentId: string;
  bookPage?: string;
  documentSettings?: { defaultBookName?: string; defaultCourse?: string } | null;
  previousPageLastNumber: number;

  // State setters
  setLocalGroups: (groups: ProblemGroup[]) => void;
  setSelectedBlocks: (blocks: number[]) => void;
  setAutoEditGroupId: (id: string | null) => void;
  setParentProblemMode: (mode: ParentProblemModeState | ((prev: ParentProblemModeState) => ParentProblemModeState)) => void;

  // Callbacks
  saveImmediately: (groups: ProblemGroup[], pageIndex: number) => Promise<void>;
  safePageChange: (pageIndex: number) => Promise<void>;
  handleCreateGroup: () => Promise<void>;
  handleDeleteGroup: (groupId: string) => Promise<void>;
  handleStartCrossPage: () => void;
  handleCreateCrossPageGroup: () => void;
  handleCancelCrossPage: () => void;
  finalizeParentProblem: () => Promise<void>;
  getNextProblemNumberWithContext: (groups: ProblemGroup[], prevLastNum: number) => string;
  extractBookNameAndCourse: (docId: string) => { bookName: string; course: string };
  showToast: (message: string, options?: any) => void;
}

// ============================================
// Hook Implementation
// ============================================

export function usePageViewerKeyboard({
  currentPage,
  totalPages,
  selectedBlocks,
  localGroups,
  blocksData,
  crossPageSelection,
  parentProblemMode,
  isPageChanging,
  documentId,
  bookPage,
  documentSettings,
  previousPageLastNumber,
  setLocalGroups,
  setSelectedBlocks,
  setAutoEditGroupId,
  setParentProblemMode,
  saveImmediately,
  safePageChange,
  handleCreateGroup,
  handleDeleteGroup,
  handleStartCrossPage,
  handleCreateCrossPageGroup,
  handleCancelCrossPage,
  finalizeParentProblem,
  getNextProblemNumberWithContext,
  extractBookNameAndCourse,
  showToast,
}: UsePageViewerKeyboardParams): void {

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+S 즉시 저장 (입력 필드에서도 동작)
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
          if (currentPage > 0) {
            await safePageChange(currentPage - 1);
          }
          break;

        case 'ArrowRight':
          if (currentPage < totalPages - 1) {
            await safePageChange(currentPage + 1);
          }
          break;

        case 'g':
        case 'G':
        case 'Enter':
          // G 키로 그룹 생성, Enter 키 추가
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
              g.block_ids.every((id: number) => selectedBlocks.includes(id)) &&
              selectedBlocks.every((id: number) => g.block_ids.includes(id))
            );
            if (groupToDelete) {
              handleDeleteGroup(groupToDelete.id);
              setSelectedBlocks([]);
            }
          }
          break;

        case 'Escape':
          // 크로스 페이지 모드 취소 또는 모문제 모드 취소
          if (crossPageSelection.isActive) {
            handleCancelCrossPage();
          } else if (parentProblemMode.isActive) {
            await finalizeParentProblem();
          } else {
            setSelectedBlocks([]);
          }
          break;

        case 'p':
        case 'P':
          // P키로 크로스 페이지 모드 시작
          if (selectedBlocks.length > 0 && !crossPageSelection.isActive) {
            e.preventDefault();
            handleStartCrossPage();
          }
          break;

        case 'm':
        case 'M':
          // M키로 모문제 생성 + 모드 진입
          if (selectedBlocks.length > 0) {
            e.preventDefault();

            // 이미 모드 중이면 이전 모문제 완료
            if (parentProblemMode.isActive) {
              await finalizeParentProblem();
            }

            // 블록 정보 가져오기
            const currentBlocks = blocksData?.blocks || [];
            const selectedBlocksInfo = currentBlocks.filter((b) => selectedBlocks.includes(b.block_id));
            const columns = [...new Set(selectedBlocksInfo.map((b) => b.column))];
            const column = columns.length === 1 ? columns[0] : 'X';

            // 모문제 그룹 생성
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

            // 모문제 모드 진입
            setParentProblemMode({
              isActive: true,
              parentGroupId: newGroupId,
              childNumbers: [],
            });

            // 블록 선택 해제
            setSelectedBlocks([]);

            showToast('모문제 모드: L키로 하위문제 추가, G키로 완료', 'info');
          }
          break;

        case 'l':
        case 'L':
          // L키로 하위문제 생성
          if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
            e.preventDefault();

            // 페이지 연속 번호 계산
            const nextNumber = getNextProblemNumberWithContext(
              localGroups,
              previousPageLastNumber
            );

            // 블록 정보 가져오기
            const currentBlocksL = blocksData?.blocks || [];
            const selectedBlocksInfoL = currentBlocksL.filter((b) => selectedBlocks.includes(b.block_id));
            const columnsL = [...new Set(selectedBlocksInfoL.map((b) => b.column))];
            const columnL = columnsL.length === 1 ? columnsL[0] : 'X';

            // 메타데이터 준비
            const { bookName, course } = extractBookNameAndCourse(documentId);

            // 하위문제 그룹 생성
            const newChildGroupId = `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newChildGroup: ProblemGroup = {
              id: newChildGroupId,
              block_ids: [...selectedBlocks],
              column: columnL as 'L' | 'R' | 'X',
              isParent: false,
              parentGroupId: parentProblemMode.parentGroupId || undefined,
              problemInfo: {
                problemNumber: nextNumber,
                bookName: documentSettings?.defaultBookName || bookName,
                course: documentSettings?.defaultCourse || course,
                page: bookPage ? parseInt(bookPage, 10) : undefined,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            const updatedGroupsL = [...localGroups, newChildGroup];
            setLocalGroups(updatedGroupsL);
            await saveImmediately(updatedGroupsL, currentPage);

            // 상태 업데이트
            setParentProblemMode(prev => ({
              ...prev,
              childNumbers: [...prev.childNumbers, nextNumber],
            }));

            // 편집 모드 활성화
            setAutoEditGroupId(newChildGroupId);

            // 블록 선택 해제
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
  }, [
    currentPage,
    totalPages,
    selectedBlocks,
    localGroups,
    crossPageSelection.isActive,
    parentProblemMode,
    isPageChanging,
  ]);
}

export default usePageViewerKeyboard;
