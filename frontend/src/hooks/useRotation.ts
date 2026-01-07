/**
 * 순환수업 React Query 훅
 * @module hooks/useRotation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRotationSchedules,
  getRotationScheduleDetail,
  createRotationSchedule,
  updateRotationSchedule,
  deleteRotationSchedule,
  saveRotationPatterns,
  createRotationException,
  deleteRotationException,
  updateRotationTargetGrades,
} from '../api/rotation';
import {
  generateRotationSchedule,
  getTodayRotation,
} from '../utils/rotationUtils';
import type {
  CreateRotationScheduleInput,
  UpdateRotationScheduleInput,
  SavePatternInput,
  CreateExceptionInput,
  RotationActivity,
} from '../types/rotation';

// =============================================
// Query Keys
// =============================================

const rotationKeys = {
  all: ['rotation'] as const,
  schedules: () => [...rotationKeys.all, 'schedules'] as const,
  schedule: (id: string) => [...rotationKeys.all, 'schedule', id] as const,
  activities: (id: string, weeks: number) =>
    [...rotationKeys.all, 'activities', id, weeks] as const,
};

// =============================================
// 조회 훅
// =============================================

/**
 * 순환수업 목록 조회
 */
export function useRotationSchedules() {
  return useQuery({
    queryKey: rotationKeys.schedules(),
    queryFn: getRotationSchedules,
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

/**
 * 순환수업 상세 조회 (패턴, 예외, 대상학년 포함)
 * @param scheduleId - 순환수업 ID (null이면 비활성화)
 */
export function useRotationScheduleDetail(scheduleId: string | null) {
  return useQuery({
    queryKey: rotationKeys.schedule(scheduleId || ''),
    queryFn: () => getRotationScheduleDetail(scheduleId!),
    enabled: !!scheduleId,
    staleTime: 30 * 1000, // 30초 캐시
  });
}

/**
 * 계산된 순환수업 일정 조회
 * @param scheduleId - 순환수업 ID
 * @param weeks - 조회할 주 수 (기본 12)
 */
export function useRotationActivities(
  scheduleId: string | null,
  weeks: number = 12
) {
  const { data: detail, isLoading, error } = useRotationScheduleDetail(scheduleId);

  // 일정 계산
  const activities: RotationActivity[] =
    detail && detail.schedule.is_active
      ? generateRotationSchedule(
          detail.schedule,
          detail.patterns,
          detail.exceptions,
          weeks
        )
      : [];

  // 오늘의 순환수업
  const today: RotationActivity | null =
    detail && detail.schedule.is_active
      ? getTodayRotation(detail.schedule, detail.patterns, detail.exceptions)
      : null;

  return {
    activities,
    today,
    schedule: detail?.schedule || null,
    patterns: detail?.patterns || [],
    exceptions: detail?.exceptions || [],
    targetGrades: detail?.targetGrades || [],
    isLoading,
    error,
  };
}

// =============================================
// 생성/수정/삭제 훅
// =============================================

/**
 * 순환수업 생성
 */
export function useCreateRotationSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRotationScheduleInput) =>
      createRotationSchedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedules() });
    },
  });
}

/**
 * 순환수업 수정
 */
export function useUpdateRotationSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduleId,
      input,
    }: {
      scheduleId: string;
      input: UpdateRotationScheduleInput;
    }) => updateRotationSchedule(scheduleId, input),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedule(scheduleId) });
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedules() });
    },
  });
}

/**
 * 순환수업 삭제
 */
export function useDeleteRotationSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scheduleId: string) => deleteRotationSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedules() });
    },
  });
}

// =============================================
// 패턴 관리 훅
// =============================================

/**
 * 패턴 일괄 저장
 */
export function useSaveRotationPatterns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduleId,
      patterns,
    }: {
      scheduleId: string;
      patterns: SavePatternInput[];
    }) => saveRotationPatterns(scheduleId, patterns),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedule(scheduleId) });
    },
  });
}

// =============================================
// 예외/휴일 관리 훅
// =============================================

/**
 * 예외 추가
 */
export function useAddRotationException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExceptionInput) => createRotationException(input),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: rotationKeys.schedule(input.rotation_schedule_id),
      });
    },
  });
}

/**
 * 예외 삭제
 */
export function useDeleteRotationException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      exceptionId,
      scheduleId,
    }: {
      exceptionId: string;
      scheduleId: string;
    }) => deleteRotationException(exceptionId),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedule(scheduleId) });
    },
  });
}

// =============================================
// 대상 학년 관리 훅
// =============================================

/**
 * 대상 학년 업데이트
 */
export function useUpdateRotationTargetGrades() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduleId,
      gradeIds,
    }: {
      scheduleId: string;
      gradeIds: string[];
    }) => updateRotationTargetGrades(scheduleId, gradeIds),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: rotationKeys.schedule(scheduleId) });
    },
  });
}
