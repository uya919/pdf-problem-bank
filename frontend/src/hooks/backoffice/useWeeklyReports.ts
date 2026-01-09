/**
 * 주간 학생 리포트 훅
 *
 * Stage 58: 강사가 주담임 학생에 대해 주간 평가를 작성하는 시스템
 *
 * 핵심 기능:
 * 1. 주담임 학생 목록 조회
 * 2. 오늘 작성할 학생 배정 (Round-robin)
 * 3. 리포트 CRUD
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase, isSupabaseConfigured } from './types';

// =====================================================
// 타입 정의
// =====================================================

/** 주간 리포트 데이터 */
export interface WeeklyReport {
  id: string;
  student_id: string;
  teacher_id: string;
  class_id: string | null;
  report_date: string;
  week_start: string;

  // 출결
  attendance_present: number;
  attendance_total: number;

  // 시험
  test_type: 'daily' | 'weekly' | 'monthly' | 'quiz' | null;
  test_count: number;
  test_score: number | null;
  test_class_avg: number | null;
  test_rank: number | null;
  test_total_students: number | null;

  // 숙제
  homework_score: number | null;  // 1-5

  // 강사 평가
  attitude_score: number | null;  // 1-5
  understanding_score: number | null;  // 1-5
  participation_score: number | null;  // 1-5

  // 텍스트 평가
  strengths: string | null;
  improvements: string | null;
  parent_message: string | null;
  teacher_note: string | null;

  // 메타
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

/** 리포트 생성/수정용 데이터 */
export interface WeeklyReportInput {
  student_id: string;
  class_id?: string | null;
  week_start: string;

  attendance_present?: number;
  attendance_total?: number;

  test_type?: 'daily' | 'weekly' | 'monthly' | 'quiz' | null;
  test_count?: number;
  test_score?: number | null;
  test_class_avg?: number | null;
  test_rank?: number | null;
  test_total_students?: number | null;

  homework_score?: number | null;

  attitude_score?: number | null;
  understanding_score?: number | null;
  participation_score?: number | null;

  strengths?: string | null;
  improvements?: string | null;
  parent_message?: string | null;
  teacher_note?: string | null;

  is_draft?: boolean;
}

/** 주담임 학생 정보 */
export interface HomeroomStudent {
  id: string;
  name: string;
  grade_id: string | null;
  grade_name: string | null;  // 학년 이름 (예: 초4, 중1)
  school: string | null;
  class_id: string;
  class_name: string;
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * 주의 시작일(월요일) 계산
 */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * 오늘 요일 인덱스 (0=월, 1=화, 2=수, 3=목, 4=금)
 */
export function getTodayDayIndex(): number {
  const day = new Date().getDay();
  // 일요일(0) → -1, 월요일(1) → 0, 화요일(2) → 1, ...
  return day === 0 ? -1 : day - 1;
}

/**
 * Round-robin 배정: 학생 목록을 5일에 분배
 */
export function assignStudentsToDay(
  students: HomeroomStudent[],
  dayIndex: number
): HomeroomStudent[] {
  if (dayIndex < 0 || dayIndex > 4) return [];
  return students.filter((_, idx) => idx % 5 === dayIndex);
}

// =====================================================
// 훅
// =====================================================

/**
 * 주담임 학생 목록 조회
 *
 * 조건: classes.homeroom_teacher_id = teacherId
 */
export function useHomeroomStudents(teacherId: string | null) {
  return useQuery({
    queryKey: ['homeroom-students', teacherId],
    queryFn: async (): Promise<HomeroomStudent[]> => {
      if (!teacherId) return [];

      // 1. 주담임인 반 목록 조회
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('homeroom_teacher_id', teacherId)
        .eq('is_active', true);

      if (classError) throw classError;
      if (!classes?.length) return [];

      // 타입 assertion으로 never 타입 회피
      const typedClasses = classes as { id: string; name: string }[];
      const classIds = typedClasses.map(c => c.id);
      const classMap = new Map(typedClasses.map(c => [c.id, c.name]));

      // 2. 해당 반들의 활성 등록 학생 조회 (학년 정보 포함)
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          class_id,
          student:students!inner(
            id,
            name,
            grade_id,
            school,
            grade:grades(name)
          )
        `)
        .in('class_id', classIds)
        .eq('is_active', true);

      if (enrollError) throw enrollError;
      if (!enrollments?.length) return [];

      // 3. 학생 목록 정리 (중복 제거, 이름순 정렬)
      // 타입 assertion으로 never 타입 회피
      type EnrollmentResult = {
        class_id: string;
        student: {
          id: string;
          name: string;
          grade_id: string | null;
          school: string | null;
          grade: { name: string } | null;
        };
      };
      const typedEnrollments = enrollments as unknown as EnrollmentResult[];
      const studentMap = new Map<string, HomeroomStudent>();

      for (const e of typedEnrollments) {
        const student = e.student;

        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            name: student.name,
            grade_id: student.grade_id,
            grade_name: student.grade?.name || null,
            school: student.school,
            class_id: e.class_id,
            class_name: classMap.get(e.class_id) || '',
          });
        }
      }

      // 이름순 정렬
      return Array.from(studentMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'ko')
      );
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}

/**
 * 오늘 작성할 학생 계산
 */
export function useTodayReportStudents(
  students: HomeroomStudent[] | undefined,
  dayIndex: number = getTodayDayIndex()
) {
  return useMemo(() => {
    if (!students?.length || dayIndex < 0 || dayIndex > 4) {
      return [];
    }
    return assignStudentsToDay(students, dayIndex);
  }, [students, dayIndex]);
}

/**
 * 이번 주 리포트 목록 조회
 */
export function useWeeklyReports(
  teacherId: string | null,
  weekStart: string = getWeekStart()
) {
  return useQuery({
    queryKey: ['weekly-reports', teacherId, weekStart],
    queryFn: async (): Promise<WeeklyReport[]> => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('student_weekly_reports')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('week_start', weekStart);

      if (error) throw error;
      return (data || []) as WeeklyReport[];
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}

/**
 * 특정 학생의 리포트 조회
 */
export function useStudentWeeklyReport(
  teacherId: string | null,
  studentId: string | null,
  weekStart: string = getWeekStart()
) {
  return useQuery({
    queryKey: ['weekly-report', teacherId, studentId, weekStart],
    queryFn: async (): Promise<WeeklyReport | null> => {
      if (!teacherId || !studentId) return null;

      const { data, error } = await supabase
        .from('student_weekly_reports')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('student_id', studentId)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (error) throw error;
      return data as WeeklyReport | null;
    },
    enabled: isSupabaseConfigured && !!teacherId && !!studentId,
  });
}

/**
 * 리포트 저장 (생성 또는 수정)
 */
export function useSaveWeeklyReport(teacherId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WeeklyReportInput): Promise<WeeklyReport> => {
      if (!teacherId) throw new Error('Teacher ID required');

      const weekStart = input.week_start || getWeekStart();

      // Upsert: student_id + teacher_id + week_start 조합으로 유니크
      const upsertData = {
        ...input,
        teacher_id: teacherId,
        week_start: weekStart,
        report_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };

      // 타입 assertion으로 never 타입 회피 (Supabase generated types 미지원 테이블)
      const { data, error } = await (supabase
        .from('student_weekly_reports') as ReturnType<typeof supabase.from>)
        .upsert(upsertData as Record<string, unknown>, {
          onConflict: 'student_id,teacher_id,week_start',
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WeeklyReport;
    },
    onSuccess: (_, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['weekly-reports', teacherId] });
      queryClient.invalidateQueries({
        queryKey: ['weekly-report', teacherId, variables.student_id],
      });
    },
    onError: (error) => {
      console.error('[useSaveWeeklyReport] Error:', error);
    },
  });
}

/**
 * 리포트 삭제
 */
export function useDeleteWeeklyReport(teacherId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string): Promise<void> => {
      if (!teacherId) throw new Error('Teacher ID required');

      const { error } = await supabase
        .from('student_weekly_reports')
        .delete()
        .eq('id', reportId)
        .eq('teacher_id', teacherId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-reports', teacherId] });
    },
  });
}

/**
 * 리포트 작성 완료 상태 계산
 *
 * 오늘 작성할 학생 중 몇 명 완료했는지 반환
 */
export function useReportProgress(
  todayStudents: HomeroomStudent[],
  reports: WeeklyReport[] | undefined
) {
  return useMemo(() => {
    if (!todayStudents.length) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const studentIds = new Set(todayStudents.map(s => s.id));
    const completedReports = (reports || []).filter(
      r => studentIds.has(r.student_id) && !r.is_draft
    );

    const completed = completedReports.length;
    const total = todayStudents.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }, [todayStudents, reports]);
}

// =====================================================
// 템플릿 칩 데이터
// =====================================================

export const STRENGTH_TEMPLATES = [
  '수업에 집중을 잘해요',
  '문제 풀이 속도가 빨라요',
  '질문을 적극적으로 해요',
  '오답 정리를 잘해요',
  '복습을 꼼꼼히 해와요',
  '숙제를 성실히 해와요',
];

export const IMPROVEMENT_TEMPLATES = [
  '풀이 과정을 더 자세히 쓰면 좋겠어요',
  '계산 실수를 줄이면 좋겠어요',
  '문제를 끝까지 읽는 습관이 필요해요',
  '오답 정리를 더 신경쓰면 좋겠어요',
  '복습 시간을 늘리면 좋겠어요',
  '수업 시간에 더 집중하면 좋겠어요',
];

export const PARENT_MESSAGE_TEMPLATES = [
  '이번 주도 열심히 했어요',
  '점점 실력이 늘고 있어요',
  '개념 이해도가 좋아지고 있어요',
  '꾸준히 노력하는 모습이 보여요',
  '다음 주에도 화이팅!',
];
