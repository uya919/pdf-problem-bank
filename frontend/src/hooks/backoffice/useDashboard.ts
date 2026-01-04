/**
 * 대시보드 관련 훅
 *
 * - useDashboardStats: 대시보드 통계
 * - useClassScheduleDates: 수업 일정
 * - useStudentsStats: 복수 학생 통계 (배열)
 * - useClassSessions: 반 세션 데이터
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, formatDateLabel, DAY_NAMES_KO } from './types';
import type { AttendanceStatus, Progress } from './types';

/** 세션 내 결석 학생 정보 */
interface SessionAbsent {
  id: string;
  name: string;
  reason?: string;
}

/** 세션 내 진도 정보 */
interface SessionProgress {
  chapter: string;
  textbook: string;
  pages: string;
  homework?: {
    range: string;
    submitted: number;
    total: number;
  };
}

/** 세션 내 시험 점수 */
interface SessionTestScore {
  studentId: string;
  studentName: string;
  score: number;
}

/** 세션 내 시험 정보 */
interface SessionTest {
  type: 'daily' | 'weekly' | 'monthly';
  range: string;
  totalScore: number;
  scores: SessionTestScore[];
}

/** ClassSession 타입 */
export interface ClassSession {
  id: string;
  classId: string;
  date: string;
  dateLabel: string;
  isToday?: boolean;
  absent: SessionAbsent[];
  progress: SessionProgress;
  test?: SessionTest;
}

/** 학생 통계 타입 */
export interface StudentStatsData {
  attendanceRate: number;
  homeworkRate: number;
  averageScore: number;
  recentScore: number;
  scoreTrend: number;
  absenceCount: number;
}

/**
 * 대시보드 통계
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [
        studentsResult,
        classesResult,
        todayAttendanceResult,
        weekHomeworkResult,
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('classes').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('attendance').select('status').eq('date', today),
        supabase.from('homework').select('id').gte('due_date', today).lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      ]);

      const attendance = (todayAttendanceResult.data || []) as { status: AttendanceStatus }[];
      const presentCount = attendance.filter((a) => a.status === 'present').length;
      const absentCount = attendance.filter((a) => a.status === 'absent').length;
      const lateCount = attendance.filter((a) => a.status === 'late').length;

      return {
        totalStudents: studentsResult.count || 0,
        totalClasses: classesResult.count || 0,
        todayAttendance: {
          total: attendance.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        },
        weekHomeworkCount: weekHomeworkResult.data?.length || 0,
      };
    },
    enabled: isSupabaseConfigured,
  });
}

/**
 * 수업이 있는 날짜 계산 (특정 기간 내)
 */
export function useClassScheduleDates(
  teacherId: string | null,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ['classes', 'scheduleDates', teacherId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
    queryFn: async (): Promise<Date[]> => {
      if (!teacherId) return [];

      const { data, error } = await supabase
        .from('classes')
        .select('day_of_week')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      if (error) throw error;

      const allDaysOfWeek = new Set<number>();
      (data as { day_of_week: number[] }[]).forEach((cls) => {
        cls.day_of_week?.forEach((dow) => allDaysOfWeek.add(dow));
      });

      const dates: Date[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        if (allDaysOfWeek.has(current.getDay())) {
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }

      return dates;
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}

/**
 * 복수 학생 통계 조회 (배열)
 *
 * @param studentIds - 통계를 조회할 학생 ID 배열
 */
export function useStudentsStats(studentIds: string[]) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthEndStr = monthEnd.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['studentStats', studentIds.join(','), monthStartStr],
    queryFn: async (): Promise<Record<string, StudentStatsData>> => {
      if (!studentIds || studentIds.length === 0) return {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: attendanceData, error: attError } = await (supabase as any)
        .from('attendance')
        .select('student_id, status, date')
        .in('student_id', studentIds)
        .gte('date', monthStartStr)
        .lte('date', monthEndStr);

      if (attError) throw attError;

      type AttRow = { student_id: string; status: string; date: string };
      const typedAtt = (attendanceData || []) as AttRow[];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: homeworkData, error: hwError } = await (supabase as any)
        .from('homework_submissions')
        .select(`
          student_id,
          status,
          homework:homework(due_date)
        `)
        .in('student_id', studentIds);

      if (hwError) throw hwError;

      type HwRow = { student_id: string; status: string; homework: { due_date: string } | null };
      const typedHw = (homeworkData || []) as HwRow[];

      const monthHw = typedHw.filter(h => {
        const dueDate = h.homework?.due_date;
        return dueDate && dueDate >= monthStartStr && dueDate <= monthEndStr;
      });

      const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const twoMonthsAgoStr = twoMonthsAgo.toISOString().split('T')[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: examData, error: examError } = await (supabase as any)
        .from('exam_scores')
        .select('student_id, score, exam_date')
        .in('student_id', studentIds)
        .gte('exam_date', twoMonthsAgoStr)
        .order('exam_date', { ascending: false });

      if (examError) throw examError;

      type ExamRow = { student_id: string; score: number; exam_date: string };
      const typedExams = (examData || []) as ExamRow[];

      const result: Record<string, StudentStatsData> = {};

      for (const studentId of studentIds) {
        const studentAtt = typedAtt.filter(a => a.student_id === studentId);
        const totalAttRecords = studentAtt.length;
        const presentCount = studentAtt.filter(a => a.status === 'present' || a.status === 'late').length;
        const absenceCount = studentAtt.filter(a => a.status === 'absent').length;
        const attendanceRate = totalAttRecords > 0
          ? Math.round((presentCount / totalAttRecords) * 100)
          : 100;

        const studentHw = monthHw.filter(h => h.student_id === studentId);
        const totalHw = studentHw.length;
        const submittedHw = studentHw.filter(h => h.status === 'submitted' || h.status === 'graded').length;
        const homeworkRate = totalHw > 0
          ? Math.round((submittedHw / totalHw) * 100)
          : 100;

        const studentExams = typedExams.filter(e => e.student_id === studentId);
        const allScores = studentExams.map(e => Number(e.score) || 0);
        const averageScore = allScores.length > 0
          ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
          : 0;
        const recentScore = allScores.length > 0 ? allScores[0] : 0;

        let scoreTrend = 0;
        if (allScores.length >= 2) {
          scoreTrend = allScores[0] - allScores[1];
        }

        result[studentId] = {
          attendanceRate,
          homeworkRate,
          averageScore,
          recentScore,
          scoreTrend,
          absenceCount,
        };
      }

      return result;
    },
    enabled: isSupabaseConfigured && studentIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 반의 세션 데이터 조회 (ClassesPage용)
 *
 * @param classId - 반 ID
 * @param options.limit - 조회할 세션 수
 */
export function useClassSessions(
  classId: string | null,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
) {
  const limit = options?.limit || 10;
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['classSessions', classId, limit, options?.startDate, options?.endDate],
    queryFn: async (): Promise<ClassSession[]> => {
      if (!classId) return [];

      let progressQuery = supabase
        .from('progress')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false });

      if (options?.startDate) {
        progressQuery = progressQuery.gte('date', options.startDate);
      }
      if (options?.endDate) {
        progressQuery = progressQuery.lte('date', options.endDate);
      }
      if (!options?.startDate && !options?.endDate) {
        progressQuery = progressQuery.limit(limit);
      }

      const { data: progressData, error: progressError } = await progressQuery;
      if (progressError) throw progressError;

      if (!progressData || progressData.length === 0) return [];

      type ProgressRow = { date: string; topic?: string; textbook?: string; pages?: string };
      const typedProgress = progressData as ProgressRow[];

      const dates = [...new Set(typedProgress.map(p => p.date))];

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          student:students(id, name)
        `)
        .eq('class_id', classId)
        .in('date', dates)
        .neq('status', 'present');

      if (attendanceError) throw attendanceError;

      type AttendanceRow = { date: string; status: string; student: { id: string; name: string } | null };
      const typedAttendance = (attendanceData || []) as AttendanceRow[];

      const { data: homeworkData, error: homeworkError } = await supabase
        .from('homework')
        .select(`
          *,
          submissions:homework_submissions(status)
        `)
        .eq('class_id', classId)
        .in('assigned_date', dates);

      if (homeworkError) throw homeworkError;

      type HomeworkRow = { assigned_date: string; title: string; description?: string; submissions: { status: string }[] };
      const typedHomework = (homeworkData || []) as HomeworkRow[];

      const { data: examData, error: examError } = await supabase
        .from('exam_scores')
        .select(`
          *,
          student:students(id, name)
        `)
        .eq('class_id', classId)
        .in('exam_date', dates);

      if (examError) throw examError;

      type ExamRow = { exam_date: string; exam_type: string; exam_name: string; score: number; student: { id: string; name: string } | null };
      const typedExams = (examData || []) as ExamRow[];

      const { count: studentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('is_active', true);

      const sessions: ClassSession[] = dates.map((date, index) => {
        const dayProgress = typedProgress.find(p => p.date === date);

        const dayAbsent: SessionAbsent[] = typedAttendance
          .filter(a => a.date === date)
          .map(a => {
            const statusMap: Record<string, string> = {
              absent: '',
              late: '지각',
              early_leave: '조퇴',
              excused: '사유',
            };
            return {
              id: a.student?.id || '',
              name: a.student?.name || '(알 수 없음)',
              reason: statusMap[a.status] || undefined,
            };
          });

        const dayHomework = typedHomework.find(h => h.assigned_date === date);
        let homeworkInfo: SessionProgress['homework'] | undefined;
        if (dayHomework) {
          const subs = dayHomework.submissions || [];
          const submitted = subs.filter(s => s.status === 'submitted' || s.status === 'graded').length;
          homeworkInfo = {
            range: dayHomework.description || dayHomework.title,
            submitted,
            total: studentCount || 0,
          };
        }

        const dayExams = typedExams.filter(e => e.exam_date === date);
        let testInfo: SessionTest | undefined;
        if (dayExams.length > 0) {
          const firstExam = dayExams[0];
          const examTypeMap: Record<string, 'daily' | 'weekly' | 'monthly'> = {
            daily: 'daily',
            weekly: 'weekly',
            monthly: 'monthly',
          };
          const scores: SessionTestScore[] = dayExams.map(e => ({
            studentId: e.student?.id || '',
            studentName: e.student?.name || '',
            score: Number(e.score) || 0,
          }));
          testInfo = {
            type: examTypeMap[firstExam.exam_type] || 'daily',
            range: firstExam.exam_name || '',
            totalScore: 100,
            scores: scores.sort((a, b) => b.score - a.score),
          };
        }

        return {
          id: `session-${date}-${index}`,
          classId,
          date,
          dateLabel: formatDateLabel(date),
          isToday: date === today,
          absent: dayAbsent,
          progress: {
            chapter: dayProgress?.topic || '',
            textbook: dayProgress?.textbook || '',
            pages: dayProgress?.pages || '',
            homework: homeworkInfo,
          },
          test: testInfo,
        };
      });

      return sessions;
    },
    enabled: isSupabaseConfigured && !!classId,
  });
}
