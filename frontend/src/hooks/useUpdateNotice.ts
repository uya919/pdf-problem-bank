/**
 * useUpdateNotice - 공지 수정 훅
 *
 * Stage 16: 캘린더 통합 공지사항 DB 연동
 *
 * - Supabase notices 테이블 수정
 * - TanStack Query mutation 사용
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateNotice as updateNoticeApi } from '@/api/notices';
import type { CreateNoticeInput, Notice } from '@/types/admin';

interface UpdateNoticeParams {
  id: string;
  input: Partial<CreateNoticeInput>;
}

/**
 * 공지 수정 훅
 *
 * @example
 * ```tsx
 * const { mutate, isPending } = useUpdateNotice();
 *
 * const handleUpdate = () => {
 *   mutate(
 *     { id: 'notice-123', input: { title: '수정된 제목' } },
 *     {
 *       onSuccess: (notice) => console.log('수정됨:', notice),
 *       onError: (error) => console.error('실패:', error),
 *     }
 *   );
 * };
 * ```
 */
export function useUpdateNotice() {
  const queryClient = useQueryClient();

  return useMutation<Notice, Error, UpdateNoticeParams>({
    mutationFn: ({ id, input }) => updateNoticeApi(id, input),
    onSuccess: () => {
      // 캐시 무효화 (주간/월간 공지 다시 로드)
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
      console.log('[useUpdateNotice] 공지 수정 성공');
    },
    onError: (error) => {
      console.error('[useUpdateNotice] 공지 수정 실패:', error);
    },
  });
}

export default useUpdateNotice;
