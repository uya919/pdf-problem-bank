/**
 * 학년별 데이터 훅
 *
 * useGradeStats - 학년별 통계 (탭 표시용)
 * useGradeClasses - 학년별 반 상세 정보
 * useGradeKPI - 학년별 KPI 계산
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ClassRow, GradeStats, GradeClass, ProgressRow, HomeworkRow } from './types';

// =====================================================
// 학년별 데이터 훅
// =====================================================

/**
 * 학년별 통계 조회 (탭 표시용)
 *
 * 새 스키마: grades, classes, enrollments 사용
 */
export function useGradeStats() {
  return useQuery({
    queryKey: ['admin', 'gradeStats'],
    queryFn: async (): Promise<GradeStats[]> => {
      // 1. 학년 목록 조회
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('id, name, division, sort_order')
        .order('sort_order');

      if (gradesError) throw gradesError;

      // 2. 모든 활성 반 조회 (grade 조인)
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          grade_id,
          grade:grades(id, name)
        `)
        .eq('is_active', true);

      if (classesError) throw classesError;

      // 타입 단언 (먼저 적용)
      const classes = (classesData || []) as unknown as { id: string; name: string; grade_id: string | null; grade: { id: string; name: string } | null }[];

      // 3. 수강 데이터 조회
      const classIds = classes.map((c) => c.id);
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      const enrollments = (enrollmentsData || []) as unknown as { class_id: string }[];

      // 반별 학생 수 계산
      const studentCountMap = new Map<string, number>();
      enrollments.forEach((e) => {
        const count = studentCountMap.get(e.class_id) || 0;
        studentCountMap.set(e.class_id, count + 1);
      });

      // 학년별 통계 계산
      const gradeMap = new Map<string, { classCount: number; studentCount: number }>();

      classes.forEach((cls) => {
        // grade 테이블 사용 또는 반 이름에서 추출
        const gradeName = cls.grade?.name || (() => {
          const gradeMatch = cls.name.match(/^(중[1-3]|고[1-3]|초[1-6])/);
          return gradeMatch ? gradeMatch[1] : '기타';
        })();

        const current = gradeMap.get(gradeName) || { classCount: 0, studentCount: 0 };
        current.classCount += 1;
        current.studentCount += studentCountMap.get(cls.id) || 0;
        gradeMap.set(gradeName, current);
      });

      // 정렬된 배열로 변환
      const gradeOrder = ['초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
      return gradeOrder
        .filter((g) => gradeMap.has(g))
        .map((g) => ({
          grade: g,
          ...gradeMap.get(g)!,
        }));
    },
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

/**
 * 학년별 반 상세 정보 조회
 *
 * 새 스키마: classes, teachers, enrollments, progress, homework, submissions
 */
export function useGradeClasses(grade: string) {
  return useQuery({
    queryKey: ['admin', 'gradeClasses', grade],
    queryFn: async (): Promise<GradeClass[]> => {
      // 1. 해당 학년 반 조회 (teachers 조인)
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          level,
          teacher:profiles(id, name)
        `)
        .eq('is_active', true)
        .ilike('name', `${grade}%`)
        .order('name');

      if (error) throw error;
      if (!data) return [];

      // 타입 단언
      const classes = data as unknown as ClassRow[];
      const classIds = classes.map((c) => c.id);

      // 2. 수강 학생 수 조회 (enrollments)
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('class_id, student_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      const enrollments = (enrollmentsData || []) as unknown as { class_id: string; student_id: string }[];
      const studentCountMap = new Map<string, number>();
      const classStudentsMap = new Map<string, string[]>();
      enrollments.forEach((e) => {
        studentCountMap.set(e.class_id, (studentCountMap.get(e.class_id) || 0) + 1);
        const students = classStudentsMap.get(e.class_id) || [];
        students.push(e.student_id);
        classStudentsMap.set(e.class_id, students);
      });

      // 3. 각 반의 최근 진도 조회 (start_page, end_page 사용)
      const { data: progressRaw } = await supabase
        .from('progress')
        .select('class_id, date, textbook, start_page, end_page, topic')
        .in('class_id', classIds)
        .order('date', { ascending: false });

      const progressData = (progressRaw || []) as unknown as ProgressRow[];
      const progressMap = new Map<string, ProgressRow>();
      progressData.forEach((p) => {
        if (!progressMap.has(p.class_id)) {
          progressMap.set(p.class_id, p);
        }
      });

      // 4. 각 반의 최근 숙제 + 제출 현황 조회 (submissions 사용)
      const { data: homeworkRaw } = await supabase
        .from('homework')
        .select(`
          id,
          class_id,
          textbook,
          page_range,
          description,
          due_date,
          submissions(
            status,
            student:students(name)
          )
        `)
        .in('class_id', classIds)
        .order('due_date', { ascending: false });

      const homeworkData = (homeworkRaw || []) as unknown as HomeworkRow[];
      const homeworkMap = new Map<string, HomeworkRow>();
      homeworkData.forEach((h) => {
        if (!homeworkMap.has(h.class_id)) {
          homeworkMap.set(h.class_id, h);
        }
      });

      // 5. 결과 매핑
      return classes.map((cls) => {
        const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;
        const studentCount = studentCountMap.get(cls.id) || 0;

        // 진도 정보 (start_page, end_page 사용)
        const progress = progressMap.get(cls.id);
        const currentPage = progress?.end_page || progress?.start_page || 0;

        // 숙제 정보
        const homework = homeworkMap.get(cls.id);
        const submissions = (homework?.submissions || []) as {
          status: string;
          student: { name: string } | null;
        }[];
        const submitted = submissions.filter(
          (s) => s.status === 'submitted' || s.status === 'graded'
        ).length;
        const pending = submissions
          .filter((s) => s.status === 'pending')
          .map((s) => s.student?.name || '');

        // 레벨 (DB에서 가져오거나 이름에서 추정)
        let level: 'high' | 'mid' | 'low' = (cls.level as 'high' | 'mid' | 'low') || 'mid';
        if (!cls.level) {
          if (cls.name.includes('A')) level = 'high';
          else if (cls.name.includes('C')) level = 'low';
        }

        return {
          id: cls.id,
          name: cls.name,
          level,
          studentCount,
          teacher: teacher?.name || '미배정',
          progress: {
            textbook: progress?.textbook || '미등록',
            currentPage,
            targetPage: 200, // 기본값
            lastDate: progress?.date || '-',
          },
          homework: {
            range: homework?.page_range || homework?.description || '미등록',
            dueDate: homework?.due_date || '-',
            submitted,
            total: studentCount,
            pending,
          },
        };
      });
    },
    enabled: isSupabaseConfigured && !!grade,
    staleTime: 60 * 1000, // 1분 캐시
  });
}

/**
 * 학년별 KPI 계산
 */
export function useGradeKPI(grade: string) {
  const { data: classes } = useGradeClasses(grade);

  if (!classes || classes.length === 0) {
    return {
      studentCount: 0,
      averageProgressRate: 0,
      homeworkSubmissionRate: 0,
      attendanceRate: 96, // 기본값
      progressTrend: 0,
      homeworkTrend: 0,
      attendanceTrend: 0,
    };
  }

  const studentCount = classes.reduce((sum, c) => sum + c.studentCount, 0);

  const avgProgress =
    classes.length > 0
      ? Math.round(
          classes.reduce(
            (sum, c) =>
              sum + (c.progress.currentPage / c.progress.targetPage) * 100,
            0
          ) / classes.length
        )
      : 0;

  const totalHomework = classes.reduce((sum, c) => sum + c.homework.total, 0);
  const submittedHomework = classes.reduce((sum, c) => sum + c.homework.submitted, 0);
  const homeworkRate =
    totalHomework > 0 ? Math.round((submittedHomework / totalHomework) * 100) : 0;

  return {
    studentCount,
    averageProgressRate: avgProgress,
    homeworkSubmissionRate: homeworkRate,
    attendanceRate: 96, // TODO: 실제 데이터로 계산
    progressTrend: 3, // TODO: 추세 계산
    homeworkTrend: -2,
    attendanceTrend: 1,
  };
}
