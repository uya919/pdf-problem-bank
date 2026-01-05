/**
 * useStudentDetail - 학생 상세 정보 조회 훅
 *
 * 학생의 출결, 성적, 숙제 현황을 조회합니다.
 * 모달에서 학생 상세 정보를 표시할 때 사용합니다.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AttendanceStatus, ExamScore, HomeworkSubmission } from '../types/database';

/** 학생 상세 정보 */
export interface StudentDetail {
  // 출결 통계 (최근 30일)
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number; // 출석률 (%)
  };
  // 최근 성적 (최근 5개)
  recentScores: Array<{
    id: string;
    exam_name: string;
    exam_date: string;
    score: number | null;
    exam_type: string;
  }>;
  // 평균 성적
  averageScore: number | null;
  // 숙제 현황 (이번 달)
  homework: {
    submitted: number;
    pending: number;
    total: number;
    rate: number; // 제출률 (%)
  };
}

/** Mock 상세 데이터 */
const createMockDetail = (): StudentDetail => ({
  attendance: {
    present: 12,
    absent: 1,
    late: 2,
    excused: 0,
    rate: 80,
  },
  recentScores: [
    { id: '1', exam_name: '주간 테스트 4주차', exam_date: '2025-01-03', score: 85, exam_type: 'weekly' },
    { id: '2', exam_name: '주간 테스트 3주차', exam_date: '2024-12-27', score: 78, exam_type: 'weekly' },
    { id: '3', exam_name: '월말 평가', exam_date: '2024-12-20', score: 92, exam_type: 'monthly' },
  ],
  averageScore: 85,
  homework: {
    submitted: 8,
    pending: 2,
    total: 10,
    rate: 80,
  },
});

/**
 * 학생 상세 정보 조회 훅
 *
 * @param studentId - 학생 ID
 * @param options.enabled - 쿼리 활성화 여부
 * @returns 학생 상세 정보, 로딩 상태, 에러
 */
export function useStudentDetail(
  studentId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: async (): Promise<StudentDetail> => {
      // Supabase 미설정 또는 studentId 없음
      if (!isSupabaseConfigured || !studentId) {
        console.log('[useStudentDetail] Mock 모드, Mock 데이터 반환');
        return createMockDetail();
      }

      try {
        // 날짜 계산
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        // 병렬로 데이터 조회
        const [attendanceResult, scoresResult, homeworkResult] = await Promise.all([
          // 1. 출결 데이터 (최근 30일)
          supabase
            .from('attendance')
            .select('status')
            .eq('student_id', studentId)
            .gte('date', formatDate(thirtyDaysAgo))
            .lte('date', formatDate(today)),

          // 2. 최근 성적 (최근 5개)
          supabase
            .from('exam_scores')
            .select('id, exam_name, exam_date, score, exam_type')
            .eq('student_id', studentId)
            .order('exam_date', { ascending: false })
            .limit(5),

          // 3. 숙제 제출 현황 (이번 달)
          supabase
            .from('homework_submissions')
            .select(`
              status,
              homework:homework_id(assigned_date)
            `)
            .eq('student_id', studentId)
        ]);

        // 출결 통계 계산 - 타입 assertion 추가
        const attendanceData = (attendanceResult.data || []) as Array<{ status: string }>;
        const attendanceStats = {
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          rate: 0,
        };

        for (const record of attendanceData) {
          const status = record.status as AttendanceStatus;
          if (status === 'present') attendanceStats.present++;
          else if (status === 'absent') attendanceStats.absent++;
          else if (status === 'late') attendanceStats.late++;
          else if (status === 'excused') attendanceStats.excused++;
        }

        const totalAttendance = attendanceData.length;
        attendanceStats.rate = totalAttendance > 0
          ? Math.round((attendanceStats.present / totalAttendance) * 100)
          : 0;

        // 성적 데이터 - 타입 assertion 추가
        type ScoreRecord = { id: string; exam_name: string; exam_date: string; score: number | null; exam_type: string };
        const scoresData = (scoresResult.data || []) as ScoreRecord[];
        const recentScores = scoresData.map(s => ({
          id: s.id,
          exam_name: s.exam_name,
          exam_date: s.exam_date,
          score: s.score,
          exam_type: s.exam_type,
        }));

        // 평균 성적 계산
        const validScores = scoresData.filter(s => s.score !== null);
        const averageScore = validScores.length > 0
          ? Math.round(validScores.reduce((sum, s) => sum + (s.score || 0), 0) / validScores.length)
          : null;

        // 숙제 통계 계산 (이번 달 것만)
        const homeworkData = (homeworkResult.data || []) as Array<{
          status: string;
          homework: { assigned_date: string } | null;
        }>;

        const thisMonthHomework = homeworkData.filter(h => {
          const assignedDate = h.homework?.assigned_date;
          if (!assignedDate) return false;
          return new Date(assignedDate) >= startOfMonth;
        });

        const homeworkStats = {
          submitted: thisMonthHomework.filter(h => h.status === 'submitted' || h.status === 'graded').length,
          pending: thisMonthHomework.filter(h => h.status === 'pending').length,
          total: thisMonthHomework.length,
          rate: 0,
        };
        homeworkStats.rate = homeworkStats.total > 0
          ? Math.round((homeworkStats.submitted / homeworkStats.total) * 100)
          : 0;

        return {
          attendance: attendanceStats,
          recentScores,
          averageScore,
          homework: homeworkStats,
        };

      } catch (error) {
        console.error('[useStudentDetail] 조회 실패:', error);
        return createMockDetail();
      }
    },
    enabled: options?.enabled !== false && !!studentId,
    staleTime: 1000 * 60 * 2, // 2분간 캐시
  });
}
