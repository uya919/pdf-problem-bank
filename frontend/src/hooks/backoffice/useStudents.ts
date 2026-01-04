/**
 * 학생 관련 훅
 *
 * - useStudents: 학생 목록 조회
 * - useStudent: 학생 상세 조회
 * - useStudentStats: 학생 통계 (출석률, 숙제율, 성적)
 * - useStudentScores: 학생 성적 시계열
 * - useStudentActivities: 학생 활동 내역
 * - useStudentNotes: 학생 메모 CRUD
 *
 * Stage 37: Supabase 연결 (2026-01-04)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { StudentWithEnrollments } from './types';

// =====================================================
// Stage 37: 학생 상세 페이지용 타입
// =====================================================

/** 학생 통계 */
export interface StudentStats {
  attendanceRate: number;
  homeworkRate: number;
  averageScore: number;
  recentScore: number;
  scoreTrend: number;
  absenceCount: number;
}

/** 성적 기록 */
export interface ScoreRecord {
  date: string;
  score: number;
}

/** 활동 기록 */
export interface ActivityRecord {
  id: string;
  date: string;
  type: 'attendance' | 'absence' | 'homework' | 'test';
  status?: 'present' | 'absent' | 'late' | 'excused' | 'submitted' | 'not_submitted';
  detail?: string;
  score?: number;
  scoreDiff?: number;
}

/** 학생 메모 */
export interface StudentNote {
  id: string;
  date: string;
  content: string;
}

/**
 * 학생 목록 조회
 *
 * @param options.status - 상태 필터 (호환성 유지)
 * @param options.isActive - 활성 상태 필터
 * @param options.grade - 학년 필터
 * @param options.search - 이름 검색
 */
export function useStudents(options?: {
  status?: 'active' | 'inactive' | 'graduated';
  isActive?: boolean;
  grade?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['students', options],
    queryFn: async (): Promise<StudentWithEnrollments[]> => {
      let query = supabase
        .from('students')
        .select(`
          *,
          grade:grades(id, name),
          enrollments(
            *,
            class:classes(id, name, subject, level, created_at)
          )
        `)
        .order('name');

      // is_active 필터 (pdf 스키마: boolean)
      if (options?.isActive !== undefined) {
        query = query.eq('is_active', options.isActive);
      } else if (options?.status) {
        // 호환성: status='active' → is_active=true
        query = query.eq('is_active', options.status === 'active');
      }
      if (options?.grade) {
        query = query.eq('grade_id', options.grade);
      }
      if (options?.search) {
        query = query.ilike('name', `%${options.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StudentWithEnrollments[];
    },
    enabled: isSupabaseConfigured,
  });
}

/**
 * 학생 상세 조회
 *
 * @param studentId - 학생 ID
 */
export function useStudent(studentId: string | null) {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: async (): Promise<StudentWithEnrollments | null> => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          enrollments(
            *,
            class:classes(*)
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data as StudentWithEnrollments;
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}

// =====================================================
// Stage 37: 학생 상세 페이지용 훅
// =====================================================

/**
 * 학생 통계 조회
 * 출석률, 숙제율, 평균 성적, 최근 성적, 추세 계산
 */
export function useStudentStats(studentId: string | null) {
  return useQuery({
    queryKey: ['studentStats', studentId],
    queryFn: async (): Promise<StudentStats> => {
      if (!studentId) {
        return {
          attendanceRate: 0,
          homeworkRate: 0,
          averageScore: 0,
          recentScore: 0,
          scoreTrend: 0,
          absenceCount: 0,
        };
      }

      // 최근 30일 기준
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      // 출결 데이터 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: attendanceData } = await (supabase as any)
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', startDate);

      interface AttendanceRow { status: string }
      const typedAttendance = (attendanceData || []) as AttendanceRow[];
      const totalAttendance = typedAttendance.length;
      const presentCount = typedAttendance.filter(a => a.status === 'present').length;
      const absenceCount = typedAttendance.filter(a => a.status === 'absent').length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

      // 숙제 제출 데이터 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: homeworkData } = await (supabase as any)
        .from('homework_submissions')
        .select('status')
        .eq('student_id', studentId);

      interface HomeworkRow { status: string }
      const typedHomework = (homeworkData || []) as HomeworkRow[];
      const totalHomework = typedHomework.length;
      const submittedCount = typedHomework.filter(h => h.status === 'submitted' || h.status === 'graded').length;
      const homeworkRate = totalHomework > 0 ? Math.round((submittedCount / totalHomework) * 100) : 100;

      // 시험 성적 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: scoresData } = await (supabase as any)
        .from('exam_scores')
        .select('score, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10);

      interface ScoreRow { score: number; created_at: string }
      const typedScores = (scoresData || []) as ScoreRow[];
      const scores = typedScores.map(s => s.score);
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const recentScore = scores[0] || 0;

      // 추세 계산 (최근 5회 vs 이전 5회)
      let scoreTrend = 0;
      if (scores.length >= 2) {
        const recent = scores.slice(0, Math.min(5, Math.floor(scores.length / 2)));
        const older = scores.slice(Math.min(5, Math.floor(scores.length / 2)));
        if (recent.length > 0 && older.length > 0) {
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          scoreTrend = Math.round(recentAvg - olderAvg);
        }
      }

      return {
        attendanceRate,
        homeworkRate,
        averageScore,
        recentScore,
        scoreTrend,
        absenceCount,
      };
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}

/**
 * 학생 성적 시계열 조회
 */
export function useStudentScores(studentId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['studentScores', studentId, limit],
    queryFn: async (): Promise<ScoreRecord[]> => {
      if (!studentId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('exam_scores')
        .select('score, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      interface ExamScoreRow { score: number; created_at: string }
      return ((data || []) as ExamScoreRow[]).map(s => ({
        date: s.created_at.split('T')[0],
        score: s.score,
      }));
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}

/**
 * 학생 활동 내역 조회 (출결 + 숙제 + 시험 통합)
 */
export function useStudentActivities(studentId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['studentActivities', studentId, limit],
    queryFn: async (): Promise<ActivityRecord[]> => {
      if (!studentId) return [];

      const activities: ActivityRecord[] = [];

      // 출결 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: attendanceData } = await (supabase as any)
        .from('attendance')
        .select('id, date, status, note')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(limit);

      interface AttendanceActivityRow { id: string; date: string; status: string; note: string | null }
      ((attendanceData || []) as AttendanceActivityRow[]).forEach(a => {
        activities.push({
          id: `att-${a.id}`,
          date: a.date,
          type: a.status === 'absent' ? 'absence' : 'attendance',
          status: a.status as ActivityRecord['status'],
          detail: a.note || undefined,
        });
      });

      // 숙제 제출 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: homeworkData } = await (supabase as any)
        .from('homework_submissions')
        .select('id, submitted_at, status, homework:homework(title)')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      interface HomeworkActivityRow { id: string; submitted_at: string; status: string; homework: { title: string } | null }
      ((homeworkData || []) as HomeworkActivityRow[]).forEach(hw => {
        activities.push({
          id: `hw-${hw.id}`,
          date: hw.submitted_at?.split('T')[0] || '',
          type: 'homework',
          status: hw.status === 'submitted' ? 'submitted' : 'not_submitted',
          detail: hw.homework?.title || undefined,
        });
      });

      // 시험 성적 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: scoreData } = await (supabase as any)
        .from('exam_scores')
        .select('id, score, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      interface ScoreRow { id: string; score: number; created_at: string }
      const typedScores = (scoreData || []) as ScoreRow[];
      typedScores.forEach((s, idx, arr) => {
        const scoreDiff = idx < arr.length - 1 ? s.score - arr[idx + 1].score : undefined;
        activities.push({
          id: `score-${s.id}`,
          date: s.created_at.split('T')[0],
          type: 'test',
          score: s.score,
          scoreDiff,
        });
      });

      // 날짜순 정렬 (최신순)
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return activities.slice(0, limit);
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}

/**
 * 학생 메모 조회
 */
export function useStudentNotes(studentId: string | null) {
  return useQuery({
    queryKey: ['studentNotes', studentId],
    queryFn: async (): Promise<StudentNote[]> => {
      if (!studentId) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('student_notes')
        .select('id, content, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        // 테이블이 없으면 빈 배열 반환
        console.warn('student_notes 테이블 조회 실패:', error.message);
        return [];
      }

      interface NoteRow { id: string; content: string; created_at: string }
      return ((data || []) as NoteRow[]).map(n => ({
        id: n.id,
        date: n.created_at.split('T')[0],
        content: n.content,
      }));
    },
    enabled: isSupabaseConfigured && !!studentId,
  });
}

/**
 * 학생 메모 추가
 */
export function useAddStudentNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, content }: { studentId: string; content: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('student_notes')
        .insert({ student_id: studentId, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['studentNotes', variables.studentId] });
    },
  });
}
