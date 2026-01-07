/**
 * 사용자 관리 훅 (Phase 8-5)
 * TanStack Query를 사용한 사용자 관리 API 연동
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsers,
  createUser,
  updateUserRole,
  resetPassword,
  deactivateUser,
  activateUser,
  deleteUser,
  UserRole,
  CreateUserData,
  UserProfile
} from '../api/adminUsers';

// =====================================================
// Query Keys
// =====================================================

export const adminUsersKeys = {
  all: ['adminUsers'] as const,
  list: (filters?: { role?: UserRole; is_active?: boolean }) =>
    [...adminUsersKeys.all, 'list', filters] as const
};

// =====================================================
// Queries
// =====================================================

/**
 * 사용자 목록 조회 훅
 */
export function useUsers(filters?: { role?: UserRole; is_active?: boolean }) {
  return useQuery({
    queryKey: adminUsersKeys.list(filters),
    queryFn: () => getUsers(filters),
    staleTime: 30 * 1000, // 30초
  });
}

// =====================================================
// Mutations
// =====================================================

/**
 * 사용자 생성 훅
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserData) => createUser(data),
    onSuccess: () => {
      // 사용자 목록 새로고침
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    }
  });
}

/**
 * 권한 변경 훅
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'teacher' | 'admin' }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    }
  });
}

/**
 * 비밀번호 리셋 훅
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => resetPassword(userId)
  });
}

/**
 * 사용자 비활성화 훅
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    }
  });
}

/**
 * 사용자 재활성화 훅
 */
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    }
  });
}

/**
 * 사용자 삭제 훅 (완전 삭제, 복구 불가)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKeys.all });
    }
  });
}

// =====================================================
// Helper Hooks
// =====================================================

/**
 * 역할 한글 변환
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    teacher: '강사',
    admin: '관리자',
    owner: '원장'
  };
  return labels[role] || role;
}

/**
 * 역할 색상
 */
export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    teacher: 'bg-blue-100 text-blue-700',
    admin: 'bg-purple-100 text-purple-700',
    owner: 'bg-amber-100 text-amber-700'
  };
  return colors[role] || 'bg-grey-100 text-grey-700';
}
