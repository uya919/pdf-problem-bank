/**
 * Admin KPI 훅
 *
 * useAdminKPI - Admin 대시보드 KPI 조회
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AdminKPI, AttendanceRow, ProgressRow } from './types';

// =====================================================
// 유틸리티 함수
// =====================================================

/** 이번 주 월요일 날짜 구하기 */
function getWeekStartDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 월요일 기준
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return monday.toISOString().split('T')[0];
}

// =====================================================
// Admin KPI 훅
// =====================================================

/**
 * Admin 대시보드 KPI 조회
 *
 * 새 스키마: classes, attendance, progress, submissions
 */
export function useAdminKPI() {
  const today = new Date().toISOString().split('T')[0];
  const dow = new Date().getDay();

  return useQuery({
    queryKey: ['admin', 'kpi', today],
    queryFn: async (): Promise<AdminKPI> => {
      // 병렬로 여러 쿼리 실행
      const [
        classesResult,
        attendanceResult,
        progressResult,
        homeworkResult,
        weekAttendanceResult,
      ] = await Promise.all([
        // 1. 오늘 수업 수 (is_active 사용)
        supabase
          .from('classes')
          .select('id', { count: 'exact' })
          .eq('is_active', true)
          .contains('day_of_week', [dow]),

        // 2. 오늘 출결 기록된 반 수
        supabase
          .from('attendance')
          .select('class_id')
          .eq('date', today),

        // 3. 오늘 진도 기록된 반 수
        supabase
          .from('progress')
          .select('class_id')
          .eq('date', today),

        // 4. 이번 주 미제출 숙제 수 (submissions 테이블)
        supabase
          .from('submissions')
          .select('id', { count: 'exact' })
          .eq('status', 'pending'),

        // 5. 이번 주 출결 (출석률 계산용)
        supabase
          .from('attendance')
          .select('status')
          .gte('date', getWeekStartDate()),
      ]);

      // 오늘 수업 수
      const todayClassCount = classesResult.count || 0;

      // 타입 단언
      const attendanceData = (attendanceResult.data || []) as unknown as AttendanceRow[];
      const progressData = (progressResult.data || []) as unknown as ProgressRow[];
      const weekAttendanceData = (weekAttendanceResult.data || []) as unknown as AttendanceRow[];

      // 출결 기록된 반 (unique)
      const attendedClassIds = new Set(
        attendanceData.map((a) => a.class_id)
      );
      const pendingAttendance = todayClassCount - attendedClassIds.size;

      // 진도 기록된 반 (unique)
      const progressClassIds = new Set(
        progressData.map((p) => p.class_id)
      );
      const pendingProgress = todayClassCount - progressClassIds.size;

      // 미제출 숙제
      const pendingHomework = homeworkResult.count || 0;

      // 주간 출석률
      const presentCount = weekAttendanceData.filter(
        (a) => a.status === 'present' || a.status === 'late'
      ).length;
      const weeklyAttendanceRate =
        weekAttendanceData.length > 0
          ? Math.round((presentCount / weekAttendanceData.length) * 100 * 10) / 10
          : 100;

      return {
        todayClasses: todayClassCount,
        pendingAttendance: Math.max(0, pendingAttendance),
        pendingProgress: Math.max(0, pendingProgress),
        pendingHomework,
        weeklyAttendanceRate,
      };
    },
    enabled: isSupabaseConfigured,
    staleTime: 30 * 1000, // 30초 캐시
  });
}
