/**
 * 성적 관련 훅
 *
 * - useExamScores: 성적 조회
 * - useSaveExamScores: 성적 저장
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { ExamScoreWithStudent } from './types';

/**
 * 성적 조회 (반별)
 *
 * @param classId - 반 ID
 */
export function useExamScores(classId: string | null) {
  return useQuery({
    queryKey: ['exam_scores', classId],
    queryFn: async (): Promise<ExamScoreWithStudent[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('exam_scores')
        .select(`
          *,
          student:students(id, name, grade)
        `)
        .eq('class_id', classId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return data as ExamScoreWithStudent[];
    },
    enabled: isSupabaseConfigured && !!classId,
  });
}

/**
 * 성적 저장 (upsert)
 */
export function useSaveExamScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: {
      class_id: string;
      student_id: string;
      exam_type: 'daily' | 'weekly' | 'monthly' | 'school_midterm_1' | 'school_final_1' | 'school_midterm_2' | 'school_final_2' | 'other';
      exam_date: string;
      exam_name: string;
      correct_answers?: number;
      total_questions?: number;
      manual_score?: number;
      notes?: string;
    }[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('exam_scores')
        .upsert(records, {
          onConflict: 'class_id,student_id,exam_date,exam_type',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_scores'] });
    },
  });
}
