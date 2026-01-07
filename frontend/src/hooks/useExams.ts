/**
 * 시험 관리 React Query 훅
 * @module hooks/useExams
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi } from '../api/exams';
import type { ExamFilters, CreateExamInput, AnswerStatus, ExamStatus } from '../types/exam';

// ===== Query Keys =====
export const examKeys = {
  all: ['exams'] as const,
  list: (filters?: ExamFilters) => [...examKeys.all, 'list', filters] as const,
  detail: (id: string) => [...examKeys.all, 'detail', id] as const,
};

// ===== 조회 훅 =====

/**
 * 시험 목록 조회
 */
export function useExams(filters?: ExamFilters) {
  return useQuery({
    queryKey: examKeys.list(filters),
    queryFn: () => examApi.getExams(filters),
    staleTime: 30 * 1000, // 30초 캐시
  });
}

/**
 * 시험 상세 조회
 */
export function useExamDetail(examId: string | null) {
  return useQuery({
    queryKey: examKeys.detail(examId || ''),
    queryFn: () => examApi.getExamDetail(examId!),
    enabled: !!examId,
    staleTime: 10 * 1000, // 10초 캐시
  });
}

// ===== 변경 훅 =====

/**
 * 시험 생성
 */
export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExamInput) => examApi.createExam(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

/**
 * 답안 저장
 */
export function useSaveAnswers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      studentId,
      answers,
    }: {
      examId: string;
      studentId: string;
      answers: AnswerStatus[];
    }) => examApi.saveAnswers(examId, studentId, answers),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.list() });
    },
  });
}

/**
 * 반배정 적용
 */
export function useApplyClassAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      assignments,
    }: {
      examId: string;
      assignments: { studentId: string; className: string }[];
    }) => examApi.applyClassAssignment(examId, assignments),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.list() });
    },
  });
}

/**
 * 시험 삭제
 */
export function useDeleteExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (examId: string) => examApi.deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all });
    },
  });
}

/**
 * 시험 상태 변경
 */
export function useUpdateExamStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      examId,
      status,
    }: {
      examId: string;
      status: ExamStatus;
    }) => examApi.updateExamStatus(examId, status),
    onSuccess: (_, { examId }) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) });
      queryClient.invalidateQueries({ queryKey: examKeys.list() });
    },
  });
}
