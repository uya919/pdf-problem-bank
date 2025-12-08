/**
 * Group Manager Hook (Phase 29-E)
 *
 * 그룹 CRUD, 저장, 동기화 로직을 관리하는 커스텀 훅
 * PageViewer에서 분리됨
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePageGroups, useSavePageGroups } from './useDocuments';
import { useToast } from '../components/Toast';
import type { ProblemGroup, ProblemInfo } from '../api/client';

interface UseGroupManagerProps {
  documentId: string;
  currentPage: number;
}

interface UseGroupManagerReturn {
  // State
  localGroups: ProblemGroup[];
  isSaving: boolean;
  lastSaved: Date | null;
  autoEditGroupId: string | null;

  // Actions
  setLocalGroups: React.Dispatch<React.SetStateAction<ProblemGroup[]>>;
  setAutoEditGroupId: (id: string | null) => void;
  // Phase 62-A: column 타입을 구체적으로 지정
  createGroup: (blockIds: number[], column: "L" | "R" | "X") => ProblemGroup;
  deleteGroup: (groupId: string) => void;
  updateGroupInfo: (groupId: string, problemInfo: ProblemInfo, saveSettingsFn?: (info: ProblemInfo) => Promise<void>) => Promise<void>;
  saveImmediately: (groups?: ProblemGroup[], pageIndex?: number) => Promise<void>;

  // Refs
  isInitialLoadRef: React.MutableRefObject<boolean>;
}

export function useGroupManager({
  documentId,
  currentPage,
}: UseGroupManagerProps): UseGroupManagerReturn {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoEditGroupId, setAutoEditGroupId] = useState<string | null>(null);

  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Data
  const { data: groupsData } = usePageGroups(documentId, currentPage);
  const saveGroupsMutation = useSavePageGroups();

  // 그룹 저장 함수
  const saveGroups = useCallback(async (groups: ProblemGroup[], pageIndex: number) => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await saveGroupsMutation.mutateAsync({
        documentId,
        pageIndex,
        groups,
      });
      setLastSaved(new Date());
      queryClient.invalidateQueries({
        queryKey: ['pageGroups', documentId, pageIndex],
      });
    } catch (error) {
      console.error('그룹 저장 실패:', error);
      showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [documentId, isSaving, queryClient, saveGroupsMutation, showToast]);

  // 즉시 저장 (디바운스 우회)
  const saveImmediately = useCallback(async (groups?: ProblemGroup[], pageIndex?: number) => {
    // 대기 중인 디바운스 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const groupsToSave = groups ?? localGroups;
    const targetPage = pageIndex ?? currentPage;

    await saveGroups(groupsToSave, targetPage);
  }, [localGroups, currentPage, saveGroups]);

  // 그룹 생성
  // Phase 53: column 타입 변경 ("L" | "R" | "X")
  const createGroup = useCallback((blockIds: number[], column: "L" | "R" | "X"): ProblemGroup => {
    const existingIds = localGroups.map(g => {
      const match = g.id.match(/^([LRX])(\d+)$/);
      return match ? parseInt(match[2], 10) : 0;
    });
    const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    const newGroup: ProblemGroup = {
      id: `${column}${nextNumber}`,
      block_ids: blockIds,
      column,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedGroups = [...localGroups, newGroup];
    setLocalGroups(updatedGroups);
    setAutoEditGroupId(newGroup.id);

    return newGroup;
  }, [localGroups]);

  // 그룹 삭제
  const deleteGroup = useCallback((groupId: string) => {
    const updatedGroups = localGroups.filter(g => g.id !== groupId);
    setLocalGroups(updatedGroups);
    showToast('그룹이 삭제되었습니다', 'info');
  }, [localGroups, showToast]);

  // 그룹 정보 업데이트
  const updateGroupInfo = useCallback(async (
    groupId: string,
    problemInfo: ProblemInfo,
    saveSettingsFn?: (info: ProblemInfo) => Promise<void>
  ) => {
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

    // 자동완성용: 마지막 사용 값 저장
    if (saveSettingsFn) {
      try {
        await saveSettingsFn(problemInfo);
      } catch (error) {
        console.error('설정 저장 실패:', error);
      }
    }

    // 즉시 저장
    await saveImmediately(updatedGroups, currentPage);
    showToast('문항 정보가 저장되었습니다', 'success');
  }, [localGroups, currentPage, saveImmediately, showToast]);

  // 그룹 데이터 동기화
  useEffect(() => {
    if (groupsData) {
      setLocalGroups(groupsData.groups || []);
      isInitialLoadRef.current = false;
      console.log(`[Phase 29-E] Data loaded from server, auto-save enabled`);
    }
  }, [groupsData]);

  // 페이지 변경 시 초기화
  useEffect(() => {
    setLocalGroups([]);
    isInitialLoadRef.current = true;
    console.log(`[Phase 29-E] Page changed to ${currentPage}, resetting groups`);
  }, [currentPage]);

  // 자동 저장 (디바운스: 2초)
  useEffect(() => {
    if (!groupsData) return;
    if (isInitialLoadRef.current) {
      console.log(`[Phase 29-E] Skipping auto-save: initial load in progress`);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const pageToSave = currentPage;

    debounceTimerRef.current = setTimeout(() => {
      console.log(`[Phase 29-E] Auto-saving page ${pageToSave}`);
      saveGroups(localGroups, pageToSave);
      debounceTimerRef.current = null;
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [localGroups, groupsData, currentPage, saveGroups]);

  return {
    localGroups,
    isSaving,
    lastSaved,
    autoEditGroupId,
    setLocalGroups,
    setAutoEditGroupId,
    createGroup,
    deleteGroup,
    updateGroupInfo,
    saveImmediately,
    isInitialLoadRef,
  };
}
