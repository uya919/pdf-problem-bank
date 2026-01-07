/**
 * 학년 일괄 승급 훅
 *
 * 미리보기, 실행, 통계 조회, 이력, 롤백 기능 제공
 * V2: 반(class) 자동 승급 포함
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPromotionPreview,
  executePromotion,
  getGradeStats,
  getPromotionHistory,
  rollbackPromotion,
  getPromotionPreviewV2,
  executePromotionV2,
  batchAssignEnrollments,
  PromotionPreviewResponse,
  PromotionExecuteResponse,
  GradeStats,
  PromotionHistoryResponse,
  RollbackResponse,
  PromotionPreviewResponseV2,
  PromotionExecuteResponseV2,
  BatchAssignRequest,
  BatchAssignResponse,
} from '../api/gradePromotion';

/**
 * 학년 승급 미리보기
 */
export function usePromotionPreview() {
  return useQuery<PromotionPreviewResponse, Error>({
    queryKey: ['grade-promotion', 'preview'],
    queryFn: getPromotionPreview,
    staleTime: 1000 * 60 * 5, // 5분
    enabled: false, // 수동으로 fetch
  });
}

/**
 * 학년 일괄 승급 실행
 */
export function useExecutePromotion() {
  const queryClient = useQueryClient();

  return useMutation<PromotionExecuteResponse, Error, void>({
    mutationFn: executePromotion,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['grade-promotion'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
}

/**
 * 학년별 학생 수 통계
 */
export function useGradeStats() {
  return useQuery<GradeStats, Error>({
    queryKey: ['grade-promotion', 'stats'],
    queryFn: getGradeStats,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 승급 이력 조회
 */
export function usePromotionHistory() {
  return useQuery<PromotionHistoryResponse, Error>({
    queryKey: ['grade-promotion', 'history'],
    queryFn: getPromotionHistory,
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 승급 롤백
 */
export function useRollbackPromotion() {
  const queryClient = useQueryClient();

  return useMutation<RollbackResponse, Error, string>({
    mutationFn: rollbackPromotion,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['grade-promotion'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
}

// =====================================================
// V2 Hooks (반 승급 포함)
// =====================================================

/**
 * 학년 승급 미리보기 V2 (반 정보 포함)
 */
export function usePromotionPreviewV2() {
  return useQuery<PromotionPreviewResponseV2, Error>({
    queryKey: ['grade-promotion', 'preview', 'v2'],
    queryFn: getPromotionPreviewV2,
    staleTime: 1000 * 60 * 5, // 5분
    enabled: false, // 수동으로 fetch
  });
}

/**
 * 학년 일괄 승급 실행 V2 (반 승급 포함)
 */
export function useExecutePromotionV2() {
  const queryClient = useQueryClient();

  return useMutation<PromotionExecuteResponseV2, Error, void>({
    mutationFn: executePromotionV2,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['grade-promotion'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

/**
 * 미배정 enrollment 일괄 배정
 *
 * 승급 후 반 해제된 학생들을 빠르게 새 반에 배정
 */
export function useBatchAssignEnrollments() {
  const queryClient = useQueryClient();

  return useMutation<BatchAssignResponse, Error, BatchAssignRequest>({
    mutationFn: batchAssignEnrollments,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['grade-promotion'] });
    },
  });
}
