/**
 * 모바일용 데이터 훅
 *
 * useAllClasses - 전체 반 목록 조회
 * useAllStudents - 전체 학생 목록 조회
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MobileClassItem, MobileStudentItem } from './types';

// =====================================================
// 모바일용 훅
// =====================================================

/**
 * 전체 반 목록 조회 (모바일용)
 */
export function useAllClasses() {
  return useQuery({
    queryKey: ['admin', 'allClasses'],
    queryFn: async (): Promise<MobileClassItem[]> => {
      // 반 조회
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          level,
          start_time,
          end_time,
          day_of_week,
          grade:grades(name),
          teacher:profiles(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // 타입 단언
      const classes = (data || []) as unknown as {
        id: string;
        name: string;
        subject: string;
        level: string | null;
        start_time: string | null;
        end_time: string | null;
        day_of_week: number[] | null;
        grade: { name: string } | null;
        teacher: { name: string } | null;
      }[];

      // 수강 학생 수 조회
      const classIds = classes.map((c) => c.id);
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      const enrollments = (enrollmentsData || []) as { class_id: string }[];
      const countMap = new Map<string, number>();
      enrollments.forEach((e) => {
        countMap.set(e.class_id, (countMap.get(e.class_id) || 0) + 1);
      });

      // 학교급 결정 함수
      const getSchoolLevel = (gradeName: string | null | undefined): 'elementary' | 'middle' | 'high' => {
        if (!gradeName) return 'middle';
        if (gradeName.startsWith('초')) return 'elementary';
        if (gradeName.startsWith('고')) return 'high';
        return 'middle';
      };

      // 요일 변환
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const getDays = (dow: number[] | null) => {
        if (!dow || dow.length === 0) return '-';
        return dow.map((d) => dayNames[d]).join(', ');
      };

      return classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        subject: cls.subject || '수학',
        level: (cls.level as 'high' | 'mid' | 'low') || 'mid',
        teacherName: cls.teacher?.name || '미배정',
        studentCount: countMap.get(cls.id) || 0,
        scheduleTime: cls.start_time && cls.end_time
          ? `${cls.start_time.slice(0, 5)}-${cls.end_time.slice(0, 5)}`
          : '-',
        scheduleDays: getDays(cls.day_of_week),
        schoolLevel: getSchoolLevel(cls.grade?.name),
        currentProgress: '진도 미입력', // TODO: 진도 데이터 연결
      }));
    },
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 전체 학생 목록 조회 (모바일용)
 */
export function useAllStudents() {
  return useQuery({
    queryKey: ['admin', 'allStudents'],
    queryFn: async (): Promise<MobileStudentItem[]> => {
      // 학생 조회
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          school,
          parent_name,
          parent_phone,
          grade:grades(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // 타입 단언
      const students = (data || []) as unknown as {
        id: string;
        name: string;
        school: string | null;
        parent_name: string | null;
        parent_phone: string | null;
        grade: { name: string } | null;
      }[];

      // 수강 반 조회
      const studentIds = students.map((s) => s.id);
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          class:classes(name)
        `)
        .in('student_id', studentIds)
        .eq('is_active', true);

      const enrollments = (enrollmentsData || []) as unknown as {
        student_id: string;
        class: { name: string } | null;
      }[];

      // 학생별 수강 반 맵
      const classMap = new Map<string, string[]>();
      enrollments.forEach((e) => {
        if (e.class?.name) {
          const arr = classMap.get(e.student_id) || [];
          arr.push(e.class.name);
          classMap.set(e.student_id, arr);
        }
      });

      // 학교급 결정
      const getSchoolLevel = (gradeName: string | null | undefined): 'elementary' | 'middle' | 'high' => {
        if (!gradeName) return 'middle';
        if (gradeName.startsWith('초')) return 'elementary';
        if (gradeName.startsWith('고')) return 'high';
        return 'middle';
      };

      return students.map((s) => ({
        id: s.id,
        name: s.name,
        grade: s.grade?.name || '미지정',
        school: s.school,
        parentName: s.parent_name,
        parentPhone: s.parent_phone,
        classes: classMap.get(s.id) || [],
        schoolLevel: getSchoolLevel(s.grade?.name),
      }));
    },
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000,
  });
}
