/**
 * useCreateNotice - 공지 생성 훅
 *
 * Stage 16: 캘린더 통합 공지사항 DB 연동
 * Stage 17: 공지 등록 모달
 * Stage 17-B: 중요 체크 지원
 *
 * - Supabase notices 테이블에 공지 생성
 * - TanStack Query 캐시 무효화
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createNotice as createNoticeApi } from '@/api/notices';
import type { CreateNoticeInput, Notice } from '@/types/admin';

// =====================================================
// 타입 정의
// =====================================================

interface UseCreateNoticeResult {
  /** 공지 생성 함수 */
  createNotice: (input: CreateNoticeInput) => Promise<Notice>;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 상태 */
  error: Error | null;
  /** 에러 초기화 */
  clearError: () => void;
}

// =====================================================
// 훅 구현
// =====================================================

/**
 * 공지 생성 훅
 *
 * @example
 * ```tsx
 * const { createNotice, isLoading } = useCreateNotice();
 *
 * const handleSubmit = async (input: CreateNoticeInput) => {
 *   try {
 *     const notice = await createNotice(input);
 *     console.log('생성됨:', notice);
 *   } catch (error) {
 *     console.error('실패:', error);
 *   }
 * };
 * ```
 */
export function useCreateNotice(): UseCreateNoticeResult {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createNotice = useCallback(async (input: CreateNoticeInput): Promise<Notice> => {
    setIsLoading(true);
    setError(null);

    try {
      // Supabase API 호출
      const notice = await createNoticeApi(input);

      // 캐시 무효화 (주간/월간 공지 다시 로드)
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });

      console.log('[useCreateNotice] 공지 생성 성공:', notice.id);
      return notice;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('공지 생성 실패');
      console.error('[useCreateNotice] 공지 생성 실패:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createNotice,
    isLoading,
    error,
    clearError,
  };
}

export default useCreateNotice;
