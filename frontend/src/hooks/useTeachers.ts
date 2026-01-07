/**
 * 강사 관리 TanStack Query Hooks
 * - useTeachers: 강사 목록 조회
 * - useCreateTeacher: 강사 생성
 * - useUpdateTeacher: 강사 수정
 * - useDeleteTeacher: 강사 삭제 (soft delete)
 *
 * Stage 9 확장: Supabase 연결
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  restoreTeacher,
  Teacher,
  CreateTeacherInput,
  UpdateTeacherInput,
} from '../api/teachers';

// Query Keys
export const teacherKeys = {
  all: ['teachers'] as const,
  lists: () => [...teacherKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...teacherKeys.lists(), filters] as const,
  details: () => [...teacherKeys.all, 'detail'] as const,
  detail: (id: string) => [...teacherKeys.details(), id] as const,
};

// =====================================================
// Queries
// =====================================================

/**
 * 강사 목록 조회
 */
export function useTeachers() {
  return useQuery({
    queryKey: teacherKeys.lists(),
    queryFn: getTeachers,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// =====================================================
// Mutations
// =====================================================

/**
 * 강사 생성
 */
export function useCreateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTeacherInput) => createTeacher(input),
    onSuccess: () => {
      // 강사 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
    onError: (error) => {
      console.error('강사 생성 실패:', error);
    },
  });
}

/**
 * 강사 수정
 */
export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTeacherInput }) =>
      updateTeacher(id, input),
    onSuccess: (data) => {
      // 강사 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
      // 개별 강사 캐시 업데이트
      queryClient.setQueryData(teacherKeys.detail(data.id), data);
    },
    onError: (error) => {
      console.error('강사 수정 실패:', error);
    },
  });
}

/**
 * 강사 삭제 (soft delete)
 */
export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeacher(id),
    onSuccess: () => {
      // 강사 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
    onError: (error) => {
      console.error('강사 삭제 실패:', error);
    },
  });
}

/**
 * 강사 복원
 */
export function useRestoreTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreTeacher(id),
    onSuccess: () => {
      // 강사 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: teacherKeys.lists() });
    },
    onError: (error) => {
      console.error('강사 복원 실패:', error);
    },
  });
}

// =====================================================
// Helper Types (UI용 변환)
// =====================================================

/**
 * Supabase Teacher → UI용 Teacher 변환
 */
export interface UITeacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  classes: string[];  // TODO: teacher_classes 테이블 연결 시 구현
  status: 'active' | 'inactive';
  note: string;
}

/**
 * Supabase Teacher를 UI용으로 변환
 */
export function toUITeacher(teacher: Teacher): UITeacher {
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    phone: teacher.phone || '',
    subject: teacher.subject || '',
    classes: [],  // TODO: teacher_classes 연결 시 구현
    status: teacher.is_active ? 'active' : 'inactive',
    note: teacher.note || '',
  };
}

/**
 * UI Teacher를 Supabase용으로 변환
 */
export function fromUITeacher(uiTeacher: Partial<UITeacher>): UpdateTeacherInput {
  return {
    name: uiTeacher.name,
    email: uiTeacher.email,
    phone: uiTeacher.phone || undefined,
    subject: uiTeacher.subject || undefined,
    note: uiTeacher.note || undefined,
    is_active: uiTeacher.status === 'active',
  };
}
