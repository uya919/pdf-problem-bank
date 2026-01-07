/**
 * useDeleteNotice - 공지 삭제 훅
 *
 * Stage 16: 캘린더 통합 공지사항 DB 연동
 *
 * - Supabase notices 테이블 soft delete
 * - TanStack Query mutation 사용
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteNotice as deleteNoticeApi } from '@/api/notices';

/**
 * 공지 삭제 훅 (soft delete)
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useDeleteNotice();
 *
 * const handleDelete = () => {
 *   mutate('notice-123', {
 *     onSuccess: () => console.log('삭제됨'),
 *     onError: (error) => console.error('실패:', error),
 *   });
 * };
 * ```
 */
export function useDeleteNotice() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteNoticeApi,
    onSuccess: () => {
      // 캐시 무효화 (주간/월간 공지 다시 로드)
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
      console.log('[useDeleteNotice] 공지 삭제 성공');
    },
    onError: (error) => {
      console.error('[useDeleteNotice] 공지 삭제 실패:', error);
    },
  });
}

export default useDeleteNotice;
