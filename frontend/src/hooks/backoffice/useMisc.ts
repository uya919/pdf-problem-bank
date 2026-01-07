/**
 * 기타 훅
 *
 * - useAnnouncements: 공지사항 (레거시)
 * - useNoticesByDate: 날짜별 공지
 * - useTodos: TODO 목록
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { Announcement, Todo, Notice } from './types';

/**
 * 최근 공지사항 (announcements 테이블 - 레거시)
 *
 * @param limit - 조회 개수
 */
export function useAnnouncements(limit = 10) {
  return useQuery({
    queryKey: ['announcements', limit],
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: isSupabaseConfigured,
  });
}

/**
 * 날짜별 공지사항 (notices 테이블)
 * Stage 35: myClassIds로 강사 담당 반 필터링
 *
 * @param date - 조회할 날짜 (YYYY-MM-DD)
 * @param myClassIds - 강사 담당 반 ID 목록 (선택사항)
 * @param options.enabled - 쿼리 활성화 여부
 */
export function useNoticesByDate(
  date: string,
  myClassIds?: string[],
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['notices', 'byDate', date, myClassIds?.join(',') || 'all'],
    queryFn: async (): Promise<Notice[]> => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('date', date)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;

      let notices = data as Notice[];

      // Stage 35-B: target_class_ids 필터링
      if (myClassIds !== undefined) {
        notices = notices.filter((notice) => {
          // target_class_ids가 없으면 모든 강사가 볼 수 있음
          if (!notice.target_class_ids || notice.target_class_ids.length === 0) {
            return true;
          }
          // myClassIds가 빈 배열이면 target_class_ids 있는 공지는 안 보임
          if (myClassIds.length === 0) {
            return false;
          }
          // target_class_ids가 있으면 본인 담당 반이 포함되어 있어야 함
          return notice.target_class_ids.some((classId) => myClassIds.includes(classId));
        });
      }

      return notices;
    },
    enabled: isSupabaseConfigured && !!date && (options?.enabled ?? true),
  });
}

/**
 * 내 TODO 목록
 *
 * @param userId - 사용자 ID
 */
export function useTodos(userId: string | null) {
  return useQuery({
    queryKey: ['todos', userId],
    queryFn: async (): Promise<Todo[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Todo[];
    },
    enabled: isSupabaseConfigured && !!userId,
  });
}
