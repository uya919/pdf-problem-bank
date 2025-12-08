/**
 * 시험지(ExamPaper) API 클라이언트
 *
 * Phase 21+ D-1: ExamPaper API 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ExamPaper,
  ExamPaperCreate,
  ExamPaperUpdate,
  ExamPaperListResponse,
  ExamPaperStatus,
  AddProblemToExam,
} from '../types/examPaper';

const API_BASE = 'http://localhost:8000/api/exams';

// ========== API 함수 ==========

async function fetchExamPapers(params: {
  page?: number;
  pageSize?: number;
  status?: ExamPaperStatus;
}): Promise<ExamPaperListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.status) searchParams.set('status', params.status);

  const response = await fetch(`${API_BASE}?${searchParams}`);
  if (!response.ok) throw new Error('시험지 목록 조회 실패');
  return response.json();
}

async function fetchExamPaper(id: string): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('시험지 조회 실패');
  return response.json();
}

async function createExamPaper(data: ExamPaperCreate): Promise<ExamPaper> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('시험지 생성 실패');
  return response.json();
}

async function updateExamPaper(id: string, data: ExamPaperUpdate): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('시험지 수정 실패');
  return response.json();
}

async function deleteExamPaper(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('시험지 삭제 실패');
}

async function addProblemToExam(examId: string, data: AddProblemToExam): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('문제 추가 실패');
  return response.json();
}

async function addProblemsBulk(examId: string, params: {
  problemIds: string[];
  sectionId?: string;
  points?: number;
}): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/problems/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error('문제 일괄 추가 실패');
  return response.json();
}

async function removeProblemFromExam(examId: string, problemItemId: string): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/problems/${problemItemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('문제 제거 실패');
  return response.json();
}

async function updateProblemPoints(
  examId: string,
  problemItemId: string,
  points: number
): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/problems/${problemItemId}/points`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });
  if (!response.ok) throw new Error('배점 수정 실패');
  return response.json();
}

async function reorderProblems(
  examId: string,
  sectionId: string,
  problemItemIds: string[]
): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/problems/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionId, problemItemIds }),
  });
  if (!response.ok) throw new Error('순서 변경 실패');
  return response.json();
}

async function addSection(
  examId: string,
  title: string,
  description?: string
): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) throw new Error('섹션 추가 실패');
  return response.json();
}

async function removeSection(examId: string, sectionId: string): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/sections/${sectionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('섹션 삭제 실패');
  return response.json();
}

async function updateSection(
  examId: string,
  sectionId: string,
  data: { title?: string; description?: string }
): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/sections/${sectionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('섹션 수정 실패');
  return response.json();
}

async function duplicateExamPaper(examId: string, name?: string): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('시험지 복제 실패');
  return response.json();
}

async function updateStatus(examId: string, status: ExamPaperStatus): Promise<ExamPaper> {
  const response = await fetch(`${API_BASE}/${examId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('상태 변경 실패');
  return response.json();
}

// ========== Query Keys ==========

export const examPaperKeys = {
  all: ['exam-papers'] as const,
  lists: () => [...examPaperKeys.all, 'list'] as const,
  list: (params: object) => [...examPaperKeys.lists(), params] as const,
  details: () => [...examPaperKeys.all, 'detail'] as const,
  detail: (id: string) => [...examPaperKeys.details(), id] as const,
};

// ========== Query Hooks ==========

/**
 * 시험지 목록 조회
 */
export function useExamPapers(params: {
  page?: number;
  pageSize?: number;
  status?: ExamPaperStatus;
  enabled?: boolean;
} = {}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery({
    queryKey: examPaperKeys.list(queryParams),
    queryFn: () => fetchExamPapers(queryParams),
    enabled,
  });
}

/**
 * 단일 시험지 조회
 */
export function useExamPaper(id: string | undefined) {
  return useQuery({
    queryKey: examPaperKeys.detail(id || ''),
    queryFn: () => fetchExamPaper(id!),
    enabled: !!id,
  });
}

// ========== Mutation Hooks ==========

/**
 * 시험지 생성
 */
export function useCreateExamPaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExamPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 시험지 수정
 */
export function useUpdateExamPaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExamPaperUpdate }) =>
      updateExamPaper(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: examPaperKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 시험지 삭제
 */
export function useDeleteExamPaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteExamPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 시험지에 문제 추가
 */
export function useAddProblemToExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: AddProblemToExam }) =>
      addProblemToExam(examId, data),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 시험지에 여러 문제 일괄 추가
 */
export function useAddProblemsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, problemIds, sectionId, points }: {
      examId: string;
      problemIds: string[];
      sectionId?: string;
      points?: number;
    }) => addProblemsBulk(examId, { problemIds, sectionId, points }),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 시험지에서 문제 제거
 */
export function useRemoveProblemFromExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, problemItemId }: { examId: string; problemItemId: string }) =>
      removeProblemFromExam(examId, problemItemId),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 문제 배점 수정
 */
export function useUpdateProblemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, problemItemId, points }: {
      examId: string;
      problemItemId: string;
      points: number;
    }) => updateProblemPoints(examId, problemItemId, points),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
    },
  });
}

/**
 * 문제 순서 변경
 */
export function useReorderProblems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, sectionId, problemItemIds }: {
      examId: string;
      sectionId: string;
      problemItemIds: string[];
    }) => reorderProblems(examId, sectionId, problemItemIds),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
    },
  });
}

/**
 * 섹션 추가
 */
export function useAddSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, title, description }: {
      examId: string;
      title: string;
      description?: string;
    }) => addSection(examId, title, description),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
    },
  });
}

/**
 * 섹션 삭제
 */
export function useRemoveSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, sectionId }: { examId: string; sectionId: string }) =>
      removeSection(examId, sectionId),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
    },
  });
}

/**
 * 섹션 수정
 */
export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, sectionId, data }: {
      examId: string;
      sectionId: string;
      data: { title?: string; description?: string };
    }) => updateSection(examId, sectionId, data),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
    },
  });
}

/**
 * 시험지 복제
 */
export function useDuplicateExamPaper() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, name }: { examId: string; name?: string }) =>
      duplicateExamPaper(examId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}

/**
 * 시험지 상태 변경
 */
export function useUpdateExamStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ examId, status }: { examId: string; status: ExamPaperStatus }) =>
      updateStatus(examId, status),
    onSuccess: (exam) => {
      queryClient.setQueryData(examPaperKeys.detail(exam.id), exam);
      queryClient.invalidateQueries({ queryKey: examPaperKeys.lists() });
    },
  });
}
