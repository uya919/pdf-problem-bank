/**
 * 문제(Problem) API 클라이언트
 *
 * Phase 21+ A-2: Problem API 훅
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Problem,
  ProblemCreate,
  ProblemUpdate,
  ProblemFilter,
  ProblemListResponse,
  ProblemStats,
  ProblemSortOptions,
} from '../types/problem';

const API_BASE = 'http://localhost:8000/api/problems';

// ========== API 함수 ==========

async function fetchProblems(params: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
  filter?: Partial<ProblemFilter>;
}): Promise<ProblemListResponse> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDesc !== undefined) searchParams.set('sortDesc', String(params.sortDesc));

  // 필터 파라미터
  const filter = params.filter || {};
  if (filter.gradeIds?.length) searchParams.set('gradeIds', filter.gradeIds.join(','));
  if (filter.majorUnitIds?.length) searchParams.set('majorUnitIds', filter.majorUnitIds.join(','));
  if (filter.middleUnitIds?.length) searchParams.set('middleUnitIds', filter.middleUnitIds.join(','));
  if (filter.questionTypes?.length) searchParams.set('questionTypes', filter.questionTypes.join(','));
  if (filter.difficultyMin !== undefined) searchParams.set('difficultyMin', String(filter.difficultyMin));
  if (filter.difficultyMax !== undefined) searchParams.set('difficultyMax', String(filter.difficultyMax));
  if (filter.sourceTypes?.length) searchParams.set('sourceTypes', filter.sourceTypes.join(','));
  if (filter.years?.length) searchParams.set('years', filter.years.join(','));
  if (filter.tags?.length) searchParams.set('tags', filter.tags.join(','));
  if (filter.hasAnswer !== undefined) searchParams.set('hasAnswer', String(filter.hasAnswer));
  if (filter.hasSolution !== undefined) searchParams.set('hasSolution', String(filter.hasSolution));
  if (filter.isFavorite !== undefined) searchParams.set('isFavorite', String(filter.isFavorite));
  if (filter.searchQuery) searchParams.set('searchQuery', filter.searchQuery);

  const response = await fetch(`${API_BASE}?${searchParams}`);
  if (!response.ok) throw new Error('문제 목록 조회 실패');
  return response.json();
}

async function fetchProblem(id: string): Promise<Problem> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('문제 조회 실패');
  return response.json();
}

async function createProblem(data: ProblemCreate): Promise<Problem> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('문제 생성 실패');
  return response.json();
}

async function updateProblem(id: string, data: ProblemUpdate): Promise<Problem> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('문제 수정 실패');
  return response.json();
}

async function deleteProblem(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('문제 삭제 실패');
}

async function fetchProblemStats(): Promise<ProblemStats> {
  const response = await fetch(`${API_BASE}/stats/summary`);
  if (!response.ok) throw new Error('통계 조회 실패');
  return response.json();
}

async function fetchAllTags(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/tags/all`);
  if (!response.ok) throw new Error('태그 조회 실패');
  return response.json();
}

async function toggleFavorite(id: string): Promise<Problem> {
  const response = await fetch(`${API_BASE}/${id}/favorite`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('즐겨찾기 토글 실패');
  return response.json();
}

async function incrementUsage(id: string): Promise<Problem> {
  const response = await fetch(`${API_BASE}/${id}/use`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('사용 횟수 증가 실패');
  return response.json();
}

async function bulkCreate(items: ProblemCreate[]): Promise<Problem[]> {
  const response = await fetch(`${API_BASE}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!response.ok) throw new Error('일괄 생성 실패');
  return response.json();
}

async function fetchBySource(documentId: string, groupId?: string): Promise<Problem[]> {
  const url = groupId
    ? `${API_BASE}/by-source/${documentId}?groupId=${groupId}`
    : `${API_BASE}/by-source/${documentId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('출처별 조회 실패');
  return response.json();
}

/**
 * Phase F-1: 문제 일괄 조회
 */
async function bulkFetchProblems(ids: string[]): Promise<Problem[]> {
  if (ids.length === 0) return [];

  const response = await fetch(`${API_BASE}/bulk-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('일괄 조회 실패');
  return response.json();
}

async function searchProblems(
  filter: ProblemFilter,
  page = 1,
  pageSize = 20,
  sortBy = 'createdAt',
  sortDesc = true,
): Promise<ProblemListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortDesc: String(sortDesc),
  });

  const response = await fetch(`${API_BASE}/search?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filter),
  });
  if (!response.ok) throw new Error('검색 실패');
  return response.json();
}

/**
 * Phase 21+ C-1: 라벨링에서 문제은행으로 가져오기
 */
export interface ImportFromLabelingParams {
  documentId: string;
  documentName: string;
  problems: Array<{
    group_id: string;
    page_index: number;
    image_path: string;
    column?: string;
  }>;
  defaultSource?: {
    type?: 'book' | 'exam' | 'custom';
    name?: string;
    year?: number;
    month?: number;
    organization?: string;
  };
  classification?: {
    gradeId?: number;
    majorUnitId?: number;
    middleUnitId?: number;
    minorUnitId?: number;
    typeId?: number;
  };
  difficulty?: number;
  questionType?: 'multiple_choice' | 'short_answer' | 'essay';
}

async function importFromLabeling(params: ImportFromLabelingParams): Promise<Problem[]> {
  const response = await fetch(`${API_BASE}/import-from-labeling`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error('라벨링 가져오기 실패');
  return response.json();
}

// ========== Query Keys ==========

export const problemKeys = {
  all: ['problems'] as const,
  lists: () => [...problemKeys.all, 'list'] as const,
  list: (params: object) => [...problemKeys.lists(), params] as const,
  details: () => [...problemKeys.all, 'detail'] as const,
  detail: (id: string) => [...problemKeys.details(), id] as const,
  stats: () => [...problemKeys.all, 'stats'] as const,
  tags: () => [...problemKeys.all, 'tags'] as const,
  bySource: (documentId: string, groupId?: string) =>
    [...problemKeys.all, 'bySource', documentId, groupId] as const,
  bulk: (ids: string[]) => [...problemKeys.all, 'bulk', ids.sort().join(',')] as const,
};

// ========== Query Hooks ==========

/**
 * 문제 목록 조회
 */
export function useProblems(params: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
  filter?: Partial<ProblemFilter>;
  enabled?: boolean;
} = {}) {
  const { enabled = true, ...queryParams } = params;

  return useQuery({
    queryKey: problemKeys.list(queryParams),
    queryFn: () => fetchProblems(queryParams),
    enabled,
  });
}

/**
 * 단일 문제 조회
 */
export function useProblem(id: string | undefined) {
  return useQuery({
    queryKey: problemKeys.detail(id || ''),
    queryFn: () => fetchProblem(id!),
    enabled: !!id,
  });
}

/**
 * 문제 통계 조회
 */
export function useProblemStats() {
  return useQuery({
    queryKey: problemKeys.stats(),
    queryFn: fetchProblemStats,
  });
}

/**
 * 전체 태그 목록 조회
 */
export function useAllTags() {
  return useQuery({
    queryKey: problemKeys.tags(),
    queryFn: fetchAllTags,
  });
}

/**
 * 출처별 문제 조회
 */
export function useProblemsBySource(documentId: string, groupId?: string) {
  return useQuery({
    queryKey: problemKeys.bySource(documentId, groupId),
    queryFn: () => fetchBySource(documentId, groupId),
    enabled: !!documentId,
  });
}

/**
 * Phase F-1: 문제 일괄 조회
 *
 * 시험지 미리보기에서 여러 문제를 한 번에 조회할 때 사용
 */
export function useBulkProblems(ids: string[], enabled = true) {
  return useQuery({
    queryKey: problemKeys.bulk(ids),
    queryFn: () => bulkFetchProblems(ids),
    enabled: enabled && ids.length > 0,
  });
}

// ========== Mutation Hooks ==========

/**
 * 문제 생성
 */
export function useCreateProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
      queryClient.invalidateQueries({ queryKey: problemKeys.tags() });
    },
  });
}

/**
 * 문제 수정
 */
export function useUpdateProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProblemUpdate }) =>
      updateProblem(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: problemKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
    },
  });
}

/**
 * 문제 삭제
 */
export function useDeleteProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProblem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
    },
  });
}

/**
 * 즐겨찾기 토글
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleFavorite,
    onSuccess: (problem) => {
      queryClient.setQueryData(problemKeys.detail(problem.id), problem);
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
    },
  });
}

/**
 * 사용 횟수 증가
 */
export function useIncrementUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: incrementUsage,
    onSuccess: (problem) => {
      queryClient.setQueryData(problemKeys.detail(problem.id), problem);
    },
  });
}

/**
 * 문제 일괄 생성
 */
export function useBulkCreateProblems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkCreate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
      queryClient.invalidateQueries({ queryKey: problemKeys.tags() });
    },
  });
}

/**
 * 문제 검색 (POST)
 */
export function useSearchProblems() {
  return useMutation({
    mutationFn: ({
      filter,
      page,
      pageSize,
      sortBy,
      sortDesc,
    }: {
      filter: ProblemFilter;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortDesc?: boolean;
    }) => searchProblems(filter, page, pageSize, sortBy, sortDesc),
  });
}

/**
 * Phase 21+ C-1: 라벨링에서 문제은행으로 가져오기
 */
export function useImportFromLabeling() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importFromLabeling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
      queryClient.invalidateQueries({ queryKey: problemKeys.tags() });
    },
  });
}

/**
 * Phase 21+ C-2: 한글 파일에서 문제은행으로 가져오기
 */
export interface ImportFromHangulParams {
  problems: Array<{
    id: string;
    number: string;
    content_text: string;
    content_latex: string;
    answer?: string | null;
    answer_latex?: string | null;
    explanation?: string | null;
  }>;
  defaultSource?: {
    type?: 'book' | 'exam' | 'custom';
    name?: string;
  };
  classification?: {
    gradeId?: number;
    majorUnitId?: number;
    middleUnitId?: number;
    minorUnitId?: number;
    typeId?: number;
  };
  difficulty?: number;
  questionType?: 'multiple_choice' | 'short_answer' | 'essay';
}

async function importFromHangul(params: ImportFromHangulParams): Promise<Problem[]> {
  const response = await fetch(`${API_BASE}/import-from-hangul`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error('한글 파일 가져오기 실패');
  return response.json();
}

export function useImportFromHangul() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importFromHangul,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: problemKeys.lists() });
      queryClient.invalidateQueries({ queryKey: problemKeys.stats() });
      queryClient.invalidateQueries({ queryKey: problemKeys.tags() });
    },
  });
}
