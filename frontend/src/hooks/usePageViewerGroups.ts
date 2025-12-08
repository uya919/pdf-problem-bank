/**
 * usePageViewerGroups Hook (Phase 62-C-3)
 *
 * PageViewer에서 그룹 CRUD 관련 로직을 분리
 * - 그룹 생성/삭제
 * - 그룹 정보 업데이트
 * - 그룹 확정 (문제은행 등록)
 * - 실행취소
 */
import { useCallback } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { api } from '../api/client';
import type { ProblemGroup, ProblemInfo } from '../api/client';

// ============================================
// Type Definitions
// ============================================

export interface UsePageViewerGroupsParams {
  documentId: string;
  currentPage: number;
  localGroups: ProblemGroup[];
  localGroupsRef: React.MutableRefObject<ProblemGroup[]>;
  selectedBlocks: number[];
  blocksData: { blocks: Array<{ block_id: number; column: string }> } | undefined;
  suggestedGroupName?: string;

  // State setters
  setLocalGroups: (groups: ProblemGroup[]) => void;
  setSelectedBlocks: (blocks: number[]) => void;
  setAutoEditGroupId: (id: string | null) => void;
  setConfirmingGroupId: (id: string | null) => void;

  // Mutations
  saveSettingsMutation: UseMutationResult<any, Error, { documentId: string; settings: any }>;

  // Callbacks
  saveImmediately: (groups: ProblemGroup[], pageIndex: number) => Promise<void>;
  saveGroups: (groups: ProblemGroup[], pageIndex: number) => Promise<void>;
  onGroupCreated?: (group: ProblemGroup, pageIndex: number) => void;
  onGroupUpdated?: (groupId: string, problemInfo: ProblemInfo, pageIndex: number) => void;
  onGroupDeleted?: (groupId: string, pageIndex: number) => void;
  showToast: (message: string, options?: any) => void;
}

export interface UsePageViewerGroupsReturn {
  handleCreateGroup: () => Promise<void>;
  handleDeleteGroup: (groupId: string) => Promise<void>;
  handleUpdateGroupInfo: (groupId: string, problemInfo: ProblemInfo) => Promise<void>;
  handleUndoExport: (groupId: string) => Promise<void>;
  handleConfirmGroup: (groupId: string) => Promise<void>;
  handleConfirmAll: () => Promise<void>;
}

// ============================================
// Hook Implementation
// ============================================

export function usePageViewerGroups({
  documentId,
  currentPage,
  localGroups,
  localGroupsRef,
  selectedBlocks,
  blocksData,
  suggestedGroupName,
  setLocalGroups,
  setSelectedBlocks,
  setAutoEditGroupId,
  setConfirmingGroupId,
  saveSettingsMutation,
  saveImmediately,
  saveGroups,
  onGroupCreated,
  onGroupUpdated,
  onGroupDeleted,
  showToast,
}: UsePageViewerGroupsParams): UsePageViewerGroupsReturn {

  // ============================================
  // 그룹 정보 업데이트
  // ============================================
  const handleUpdateGroupInfo = useCallback(async (groupId: string, problemInfo: ProblemInfo) => {
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

    // 부모 컴포넌트에 그룹 업데이트 알림
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

    // 즉시 저장
    console.log(`[UpdateGroupInfo] Saving group ${groupId} to page ${currentPage}`);
    await saveImmediately(updatedGroups, currentPage);
    showToast('문항 정보가 저장되었습니다', 'success');
  }, [localGroups, currentPage, documentId, setLocalGroups, saveSettingsMutation, saveImmediately, onGroupUpdated, showToast]);

  // ============================================
  // 실행취소 (그룹 삭제 + export 파일 삭제)
  // ============================================
  const handleUndoExport = useCallback(async (groupId: string) => {
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
  }, [documentId, currentPage, localGroups, setLocalGroups, saveImmediately, showToast]);

  // ============================================
  // 그룹 생성
  // ============================================
  const handleCreateGroup = useCallback(async () => {
    if (selectedBlocks.length === 0) return;

    // 선택된 블록들의 컬럼 분석
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

    // 그룹 ID 생성 - 페이지 정보 포함하여 전역 고유성 보장
    const existingGroups = localGroups.filter((g) => g.column === column);
    const maxNumber = existingGroups.reduce((max, g) => {
      const match = g.id.match(/(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[0], 10));
      }
      return max;
    }, 0);
    const newGroupId = `p${currentPage}_${column}${maxNumber + 1}`;

    // 새 그룹 생성
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

    // 크로스 컬럼 그룹일 경우 segments 추가
    if (isCrossColumn) {
      const lBlocks = selectedBlocksData.filter(b => b.column === "L");
      const rBlocks = selectedBlocksData.filter(b => b.column === "R");

      const segments = [
        { column: "L" as const, block_ids: lBlocks.map(b => b.block_id), order: 0 },
        { column: "R" as const, block_ids: rBlocks.map(b => b.block_id), order: 1 },
      ].filter(seg => seg.block_ids.length > 0);

      newGroup = {
        ...newGroup,
        segments,
      };
    }

    // Optimistic Update - 이전 상태 저장
    const previousGroups = [...localGroups];
    const previousSelectedBlocks = [...selectedBlocks];

    const updatedGroups = [...localGroups, newGroup];
    setLocalGroups(updatedGroups);
    localGroupsRef.current = updatedGroups;
    setSelectedBlocks([]);

    // 자동 편집 모드 트리거
    setAutoEditGroupId(newGroupId);

    // 부모 컴포넌트에 그룹 생성 알림
    onGroupCreated?.(newGroup, currentPage);

    // 그룹 저장 후 자동으로 문제은행에 등록 (재시도 로직 포함)
    const exportWithRetry = async (maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (newGroup.column === 'X' && newGroup.segments) {
            await api.exportGroupWithData(documentId, currentPage, newGroupId, newGroup);
            console.log(`[Phase 53-Fix-C] X 그룹 세로 합성 export: ${newGroupId}`);
          } else {
            await api.exportGroup(documentId, currentPage, newGroupId);
          }
          return true;
        } catch (error) {
          console.warn(`[Phase 56-L] Export attempt ${attempt + 1}/${maxRetries} failed:`, error);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
          } else {
            throw error;
          }
        }
      }
      return false;
    };

    try {
      // 1. 먼저 그룹 저장
      await saveImmediately(updatedGroups, currentPage);

      // 파일 시스템 반영 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      // 2. 그룹 이미지 크롭 & 내보내기
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

      // 롤백 - 이전 상태로 복원
      setLocalGroups(previousGroups);
      localGroupsRef.current = previousGroups;
      setSelectedBlocks(previousSelectedBlocks);
      setAutoEditGroupId(null);

      const errorMessage = error?.response?.status === 404
        ? '그룹 저장 실패. 다시 시도해주세요.'
        : '그룹 생성에 실패했습니다. 다시 시도해주세요.';
      showToast(errorMessage, { type: 'error' });
    }
  }, [
    selectedBlocks, blocksData, localGroups, localGroupsRef, currentPage, documentId,
    suggestedGroupName, setLocalGroups, setSelectedBlocks, setAutoEditGroupId,
    saveImmediately, onGroupCreated, showToast, handleUndoExport
  ]);

  // ============================================
  // 그룹 삭제
  // ============================================
  const handleDeleteGroup = useCallback(async (groupId: string) => {
    // Optimistic Update: 즉시 UI 업데이트
    const previousGroups = [...localGroups];
    const updatedGroups = localGroups.filter((g) => g.id !== groupId);
    setLocalGroups(updatedGroups);
    localGroupsRef.current = updatedGroups;

    // 부모 컴포넌트에 그룹 삭제 알림
    onGroupDeleted?.(groupId, currentPage);

    // 즉시 저장 시도 및 실패 시 롤백
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
  }, [localGroups, localGroupsRef, currentPage, setLocalGroups, saveGroups, onGroupDeleted, showToast]);

  // ============================================
  // 개별 그룹 확정 (문제은행에 등록)
  // ============================================
  const handleConfirmGroup = useCallback(async (groupId: string) => {
    setConfirmingGroupId(groupId);
    try {
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
  }, [localGroups, documentId, currentPage, setLocalGroups, setConfirmingGroupId, saveImmediately, showToast]);

  // ============================================
  // 전체 그룹 확정
  // ============================================
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

  return {
    handleCreateGroup,
    handleDeleteGroup,
    handleUpdateGroupInfo,
    handleUndoExport,
    handleConfirmGroup,
    handleConfirmAll,
  };
}

export default usePageViewerGroups;
