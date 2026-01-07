/**
 * 과목별 관리자 설정 훅
 * Stage 33: 상담 관리 시스템
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubjectsWithManagers,
  updateSubjectManagers,
  getAdminUsers,
} from '../api/classes';

/**
 * 과목별 관리자 정보 조회 훅
 */
export function useSubjectsWithManagers() {
  return useQuery({
    queryKey: ['subjects-with-managers'],
    queryFn: getSubjectsWithManagers,
    staleTime: 1000 * 60 * 10, // 10분
  });
}

/**
 * 관리자/원장 목록 조회 훅
 */
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    staleTime: 1000 * 60 * 10, // 10분
  });
}

/**
 * 과목별 관리자 업데이트 훅
 */
export function useUpdateSubjectManagers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subjectId,
      managerIds,
    }: {
      subjectId: string;
      managerIds: string[];
    }) => updateSubjectManagers(subjectId, managerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects-with-managers'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}
