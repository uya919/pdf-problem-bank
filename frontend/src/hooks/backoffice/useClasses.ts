/**
 * 반 관련 훅
 *
 * - useClasses: 반 목록 조회
 * - useClassWithStudents: 반 상세 + 학생 목록
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { ClassWithDetails } from './types';

/**
 * 반 목록 조회
 *
 * @param options.status - 상태 필터 (호환성 유지)
 * @param options.isActive - 활성 상태 필터
 * @param options.teacherId - 담당 강사 필터 (주담임, 부담임, 담임 모두 포함)
 */
export function useClasses(options?: {
  status?: 'active' | 'inactive';
  isActive?: boolean;
  teacherId?: string;
}) {
  return useQuery({
    queryKey: ['classes', options],
    queryFn: async (): Promise<ClassWithDetails[]> => {
      let query = supabase
        .from('classes')
        .select(`
          *,
          teacher:profiles!classes_teacher_id_fkey(id, name, email),
          subjects(id, name, code, color),
          enrollments(count)
        `)
        .order('name');

      // is_active 필터 (pdf 스키마: boolean)
      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      } else if (options?.status) {
        query = query.eq('is_active', options.status === 'active');
      }
      // Stage 35: 담당 강사 필터 - 주담임, 부담임, 담임 모두 포함
      if (options?.teacherId) {
        query = query.or(`teacher_id.eq.${options.teacherId},assistant_teacher_id.eq.${options.teacherId},homeroom_teacher_id.eq.${options.teacherId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // enrollments count 추출
      return (data as unknown[]).map((item: unknown) => {
        const c = item as ClassWithDetails & { enrollments: { count: number }[] };
        return {
          ...c,
          student_count: c.enrollments?.[0]?.count || 0,
        };
      });
    },
    enabled: isSupabaseConfigured,
  });
}

/**
 * 반 상세 + 학생 목록
 *
 * @param classId - 반 ID
 */
export function useClassWithStudents(classId: string | null) {
  return useQuery({
    queryKey: ['class', classId, 'students'],
    queryFn: async () => {
      if (!classId) return null;

      // 반 정보 가져오기
      // PGRST201 방지: 명시적 FK 이름 사용 (classes_teacher_id_fkey)
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select(`
          *,
          teacher:profiles!classes_teacher_id_fkey(id, name, email)
        `)
        .eq('id', classId)
        .single();

      if (classError) {
        console.error('[useClassWithStudents] classError:', classError);
        throw classError;
      }

      // 활성 등록 학생 목록 가져오기 (is_active = true)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          id,
          student:students(id, name, phone)
        `)
        .eq('class_id', classId)
        .eq('is_active', true);

      if (enrollmentsError) {
        console.error('[useClassWithStudents] enrollmentsError:', enrollmentsError);
        throw enrollmentsError;
      }

      console.log('[useClassWithStudents] classId:', classId, 'enrollments:', enrollmentsData?.length);

      return {
        ...(classData as Record<string, unknown>),
        enrollments: enrollmentsData || [],
      };
    },
    enabled: isSupabaseConfigured && !!classId,
  });
}
