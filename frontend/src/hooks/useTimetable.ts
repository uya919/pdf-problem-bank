/**
 * Timetable Studio 훅
 *
 * Stage 5: Timetable Studio 재설계
 * - 시나리오 CRUD 훅
 * - 슬롯 CRUD 훅
 */

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchScenarios,
  fetchActiveScenarios,
  fetchScenarioById,
  createScenario,
  updateScenario,
  deleteScenario,
  fetchSlotsByScenario,
  createSlot,
  updateSlot,
  deleteSlot,
  deleteSlots,
  clearScenarioSlots,
} from '@/api/timetable';
import type {
  TimetableScenario,
  TimetableSlot,
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateSlotInput,
  UpdateSlotInput,
} from '@/types/timetable';

// =====================================================
// 시나리오 훅
// =====================================================

/**
 * 시나리오 목록 조회 훅
 */
export function useScenarios(options?: { activeOnly?: boolean }) {
  const activeOnly = options?.activeOnly ?? false;

  return useQuery({
    queryKey: ['timetable', 'scenarios', { activeOnly }],
    queryFn: () => (activeOnly ? fetchActiveScenarios() : fetchScenarios()),
    staleTime: 60 * 1000,
  });
}

/**
 * 시나리오 단건 조회 훅
 */
export function useScenario(id: string | null) {
  return useQuery({
    queryKey: ['timetable', 'scenario', id],
    queryFn: () => fetchScenarioById(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

/**
 * 시나리오 생성 훅
 */
export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation<TimetableScenario, Error, CreateScenarioInput>({
    mutationFn: createScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'scenarios'] });
      console.log('[useCreateScenario] 시나리오 생성 성공');
    },
    onError: (error) => {
      console.error('[useCreateScenario] 시나리오 생성 실패:', error);
    },
  });
}

/**
 * 시나리오 수정 훅
 */
export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation<TimetableScenario, Error, { id: string; input: UpdateScenarioInput }>({
    mutationFn: ({ id, input }) => updateScenario(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['timetable', 'scenario', variables.id] });
      console.log('[useUpdateScenario] 시나리오 수정 성공');
    },
    onError: (error) => {
      console.error('[useUpdateScenario] 시나리오 수정 실패:', error);
    },
  });
}

/**
 * 시나리오 삭제 훅
 */
export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'scenarios'] });
      console.log('[useDeleteScenario] 시나리오 삭제 성공');
    },
    onError: (error) => {
      console.error('[useDeleteScenario] 시나리오 삭제 실패:', error);
    },
  });
}

// =====================================================
// 슬롯 훅
// =====================================================

/**
 * 시나리오별 슬롯 목록 조회 훅
 */
export function useSlots(scenarioId: string | null) {
  return useQuery({
    queryKey: ['timetable', 'slots', scenarioId],
    queryFn: () => fetchSlotsByScenario(scenarioId!),
    enabled: !!scenarioId,
    staleTime: 30 * 1000,
  });
}

/**
 * 슬롯 생성 훅
 */
export function useCreateSlot() {
  const queryClient = useQueryClient();

  return useMutation<TimetableSlot, Error, CreateSlotInput>({
    mutationFn: createSlot,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'slots', variables.scenarioId] });
      console.log('[useCreateSlot] 슬롯 생성 성공');
    },
    onError: (error) => {
      console.error('[useCreateSlot] 슬롯 생성 실패:', error);
    },
  });
}

/**
 * 슬롯 수정 훅
 */
export function useUpdateSlot() {
  const queryClient = useQueryClient();

  return useMutation<TimetableSlot, Error, { id: string; input: UpdateSlotInput; scenarioId: string }>({
    mutationFn: ({ id, input }) => updateSlot(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'slots', variables.scenarioId] });
      console.log('[useUpdateSlot] 슬롯 수정 성공');
    },
    onError: (error) => {
      console.error('[useUpdateSlot] 슬롯 수정 실패:', error);
    },
  });
}

/**
 * 슬롯 삭제 훅
 */
export function useDeleteSlot() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; scenarioId: string }>({
    mutationFn: ({ id }) => deleteSlot(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'slots', variables.scenarioId] });
      console.log('[useDeleteSlot] 슬롯 삭제 성공');
    },
    onError: (error) => {
      console.error('[useDeleteSlot] 슬롯 삭제 실패:', error);
    },
  });
}

/**
 * 여러 슬롯 일괄 삭제 훅
 */
export function useDeleteSlots() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { ids: string[]; scenarioId: string }>({
    mutationFn: ({ ids }) => deleteSlots(ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'slots', variables.scenarioId] });
      console.log('[useDeleteSlots] 슬롯 일괄 삭제 성공');
    },
    onError: (error) => {
      console.error('[useDeleteSlots] 슬롯 일괄 삭제 실패:', error);
    },
  });
}

/**
 * 시나리오 슬롯 전체 삭제 훅
 */
export function useClearScenarioSlots() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: clearScenarioSlots,
    onSuccess: (_, scenarioId) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', 'slots', scenarioId] });
      console.log('[useClearScenarioSlots] 시나리오 슬롯 전체 삭제 성공');
    },
    onError: (error) => {
      console.error('[useClearScenarioSlots] 시나리오 슬롯 전체 삭제 실패:', error);
    },
  });
}

/**
 * 여러 시나리오의 슬롯을 한번에 조회하는 훅 (비교 뷰용)
 */
export function useMultipleSlots(scenarioIds: string[]) {
  // useQueries를 사용하여 여러 쿼리를 병렬로 실행
  const results = useQueries({
    queries: scenarioIds.map((id) => ({
      queryKey: ['timetable', 'slots', id],
      queryFn: () => fetchSlotsByScenario(id),
      enabled: !!id,
      staleTime: 30 * 1000,
    })),
  });

  // 모든 데이터를 Map 형태로 반환
  const slotsMap: Record<string, TimetableSlot[]> = {};
  let isLoading = false;
  let isError = false;

  results.forEach((result, index) => {
    if (result.isLoading) isLoading = true;
    if (result.isError) isError = true;
    if (result.data) {
      slotsMap[scenarioIds[index]] = result.data;
    }
  });

  return {
    slotsMap,
    isLoading,
    isError,
  };
}
