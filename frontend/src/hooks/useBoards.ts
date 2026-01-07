/**
 * useBoards - Timetable Studio 보드 관리 훅
 *
 * Stage 5: FigJam 스타일 캔버스 데이터 관리
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBoards,
  fetchBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  autoSave,
  loadAutoSave,
  clearAutoSave,
} from '../api/boards';
import type { CreateBoardInput, UpdateBoardInput, CanvasState, TimetableBoard } from '../types/canvas';

// ============================================
// Query Keys
// ============================================

export const boardsKeys = {
  all: ['boards'] as const,
  lists: () => [...boardsKeys.all, 'list'] as const,
  list: () => [...boardsKeys.lists()] as const,
  details: () => [...boardsKeys.all, 'detail'] as const,
  detail: (id: string) => [...boardsKeys.details(), id] as const,
};

// ============================================
// Queries
// ============================================

/**
 * 보드 목록 조회
 */
export function useBoards() {
  return useQuery({
    queryKey: boardsKeys.list(),
    queryFn: fetchBoards,
  });
}

/**
 * 단일 보드 조회
 */
export function useBoard(id: string | null) {
  return useQuery({
    queryKey: boardsKeys.detail(id || ''),
    queryFn: () => (id ? fetchBoard(id) : null),
    enabled: !!id,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * 보드 생성
 */
export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() });
    },
  });
}

/**
 * 보드 업데이트
 */
export function useUpdateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBoardInput }) =>
      updateBoard(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() });
      queryClient.setQueryData(boardsKeys.detail(data.id), data);
    },
  });
}

/**
 * 보드 삭제
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsKeys.lists() });
    },
  });
}

// ============================================
// Auto Save
// ============================================

/**
 * 자동 저장 훅
 */
export function useAutoSave() {
  return {
    save: autoSave,
    load: loadAutoSave,
    clear: clearAutoSave,
  };
}

// ============================================
// Board Selection State
// ============================================

import { useState, useCallback } from 'react';

/**
 * 보드 선택 상태 관리
 */
export function useBoardSelection() {
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const selectBoard = useCallback((id: string | null) => {
    setSelectedBoardId(id);
  }, []);

  return {
    selectedBoardId,
    selectBoard,
    isModalOpen,
    openModal,
    closeModal,
  };
}
