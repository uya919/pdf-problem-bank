/**
 * 숙제 관련 훅
 *
 * - useHomework: 숙제 조회 (반별)
 * - useWeekHomework: 이번 주 숙제
 * - useSaveHomeworkSubmissions: 숙제 제출 저장
 * - useHomeworkByDate: 날짜별 숙제
 * - useTodayHomework: 오늘 숙제 현황
 * - useHomeworkForTeacherByDate: 선생님별 날짜 숙제
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { HomeworkWithSubmissions } from './types';

/**
 * 숙제 조회 (반별)
 *
 * @param classId - 반 ID
 */
export function useHomework(classId: string | null) {
  return useQuery({
    queryKey: ['homework', classId],
    queryFn: async (): Promise<HomeworkWithSubmissions[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          submissions:homework_submissions(
            *,
            student:students(id, name)
          )
        `)
        .eq('class_id', classId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as HomeworkWithSubmissions[];
    },
    enabled: isSupabaseConfigured && !!classId,
  });
}

/**
 * 이번 주 숙제 (전체)
 */
export function useWeekHomework() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return useQuery({
    queryKey: ['homework', 'week'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          *,
          class:classes(id, name)
        `)
        .gte('due_date', weekStart.toISOString().split('T')[0])
        .lte('due_date', weekEnd.toISOString().split('T')[0])
        .order('due_date');

      if (error) throw error;
      return data;
    },
    enabled: isSupabaseConfigured,
  });
}

/**
 * 숙제 제출 기록 저장
 */
export function useSaveHomeworkSubmissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: {
      homework_id: string;
      student_id: string;
      status: 'pending' | 'submitted' | 'graded';
    }[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('homework_submissions')
        .upsert(records, {
          onConflict: 'homework_id,student_id',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework'] });
    },
  });
}

/**
 * 특정 날짜의 반 숙제 조회
 *
 * @param classId - 반 ID
 * @param date - 날짜 (YYYY-MM-DD)
 */
export function useHomeworkByDate(classId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['homework', 'byDate', classId, date],
    queryFn: async () => {
      if (!classId || !date) return null;

      // 해당 날짜에 할당된 숙제 조회
      const { data, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          submissions:homework_submissions(
            id,
            student_id,
            status,
            student:students(id, name)
          )
        `)
        .eq('class_id', classId)
        .eq('assigned_date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        throw error;
      }
      return data;
    },
    enabled: isSupabaseConfigured && !!classId && !!date,
  });
}

/**
 * 오늘 숙제 현황 조회 (선생님별)
 *
 * @param teacherId - 선생님 ID
 */
export function useTodayHomework(teacherId: string | null) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['homework', 'today', teacherId, today],
    queryFn: async () => {
      if (!teacherId) return [];

      // Stage 35: 선생님의 반 목록 (주담임, 부담임, 담임 모두 포함)
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      if (classError) throw classError;

      // 타입 단언
      interface ClassIdName { id: string; name: string }
      const typedClasses = (classes || []) as unknown as ClassIdName[];
      const classIds = typedClasses.map((c) => c.id);
      if (classIds.length === 0) return [];

      // 오늘 마감인 숙제
      const { data: homework, error: hwError } = await supabase
        .from('homework')
        .select(`
          *,
          class:classes(id, name),
          submissions:homework_submissions(status)
        `)
        .eq('due_date', today)
        .in('class_id', classIds);

      if (hwError) throw hwError;

      // 타입 단언
      interface HomeworkRow {
        id: string;
        title: string | null;
        description: string | null;
        class: { id: string; name: string } | null;
        submissions: { status: string }[];
      }
      const typedHomework = (homework || []) as unknown as HomeworkRow[];

      return typedHomework.map((hw) => {
        const submissions = hw.submissions || [];
        const submitted = submissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
        const total = submissions.length;
        return {
          id: hw.id,
          className: hw.class?.name || '',
          title: hw.title,
          range: hw.description || '',
          submitted,
          notSubmitted: total - submitted,
          total,
        };
      });
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}

/**
 * 선택된 날짜의 숙제 현황 조회
 *
 * @param teacherId - 선생님 ID
 * @param date - 선택된 날짜 (YYYY-MM-DD)
 */
export function useHomeworkForTeacherByDate(teacherId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['homework', 'byDate', 'teacher', teacherId, date],
    queryFn: async () => {
      if (!teacherId || !date) return [];

      // Stage 35: 선생님의 반 목록 (주담임, 부담임, 담임 모두 포함)
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      if (classError) throw classError;

      interface ClassIdName { id: string; name: string }
      const typedClasses = (classes || []) as unknown as ClassIdName[];
      const classIds = typedClasses.map((c) => c.id);
      if (classIds.length === 0) return [];

      // 해당 날짜 마감인 숙제
      const { data: homework, error: hwError } = await supabase
        .from('homework')
        .select(`
          *,
          class:classes(id, name),
          submissions:homework_submissions(status)
        `)
        .eq('due_date', date)
        .in('class_id', classIds);

      if (hwError) throw hwError;

      interface HomeworkRow {
        id: string;
        title: string | null;
        description: string | null;
        class: { id: string; name: string } | null;
        submissions: { status: string }[];
      }
      const typedHomework = (homework || []) as unknown as HomeworkRow[];

      return typedHomework.map((hw) => {
        const submissions = hw.submissions || [];
        const submitted = submissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
        const total = submissions.length;
        return {
          id: hw.id,
          className: hw.class?.name || '',
          title: hw.title,
          range: hw.description || '',
          submitted,
          notSubmitted: total - submitted,
          total,
        };
      });
    },
    enabled: isSupabaseConfigured && !!teacherId && !!date,
  });
}
