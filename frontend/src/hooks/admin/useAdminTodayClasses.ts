/**
 * 오늘 수업 관련 훅
 *
 * useTodayClasses - 오늘 전체 수업 조회
 * useClassesByDate - 특정 날짜 수업 조회
 * useTodayClassesBySubject - 과목별 오늘 수업
 * useCurrentClasses - 현재 진행 중 수업
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatDateKey } from '../../utils/weekUtils';
import type { ClassRow, TodayClass } from './types';

// =====================================================
// 오늘 수업 관련 훅
// =====================================================

/**
 * 오늘 수업 목록 조회 (전체)
 * 요일 기반으로 오늘 있는 모든 수업 조회
 *
 * 새 스키마: classes, teachers, enrollments
 */
export function useTodayClasses() {
  const today = new Date();
  const dow = today.getDay(); // 0=일, 1=월, ...
  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['admin', 'todayClasses', dow],
    queryFn: async (): Promise<TodayClass[]> => {
      // 1. 오늘 요일에 해당하는 수업 조회 (teachers 조인)
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          start_time,
          end_time,
          level,
          teacher:profiles(id, name)
        `)
        .eq('is_active', true)
        .contains('day_of_week', [dow])
        .order('start_time');

      if (error) throw error;
      if (!data) return [];

      // 타입 단언
      const classes = data as unknown as ClassRow[];

      // 2. 각 반의 학생 수 조회 (enrollments 테이블)
      const classIds = classes.map((c) => c.id);
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      // 반별 학생 수 계산
      const enrollments = (enrollmentData || []) as unknown as { class_id: string }[];
      const studentCountMap = new Map<string, number>();
      enrollments.forEach((e) => {
        const count = studentCountMap.get(e.class_id) || 0;
        studentCountMap.set(e.class_id, count + 1);
      });

      // 3. 결과 매핑
      return classes.map((cls) => {
        const startTime = cls.start_time?.slice(0, 5) || '00:00';
        const endTime = cls.end_time?.slice(0, 5) || '00:00';

        // 수업 상태 결정
        let status: 'upcoming' | 'current' | 'completed' = 'upcoming';
        if (endTime < currentTime) {
          status = 'completed';
        } else if (startTime <= currentTime && endTime >= currentTime) {
          status = 'current';
        }

        // teacher 타입 처리
        const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;

        return {
          id: cls.id,
          name: cls.name,
          subject: cls.subject || '수학',
          startTime,
          endTime,
          room: null, // 새 스키마에 room 없음
          teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
          studentCount: studentCountMap.get(cls.id) || 0,
          status,
        };
      });
    },
    enabled: isSupabaseConfigured,
    staleTime: 60 * 1000, // 1분 캐시
  });
}

/**
 * 특정 날짜의 수업 조회
 * @param dateStr - 'YYYY-MM-DD' 형식의 날짜 문자열
 */
export function useClassesByDate(dateStr: string) {
  // 날짜 파싱
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dow = targetDate.getDay(); // 0=일, 1=월, ...

  // 현재 시간 (상태 계산용)
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 오늘인지 확인
  const isToday = dateStr === formatDateKey(now);

  return useQuery({
    queryKey: ['admin', 'classesByDate', dateStr],
    queryFn: async (): Promise<TodayClass[]> => {
      // 1. 해당 요일에 해당하는 수업 조회
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          start_time,
          end_time,
          level,
          teacher:profiles(id, name)
        `)
        .eq('is_active', true)
        .contains('day_of_week', [dow])
        .order('start_time');

      if (error) throw error;
      if (!data) return [];

      const classes = data as unknown as ClassRow[];

      // 2. 각 반의 학생 수 조회
      const classIds = classes.map((c) => c.id);
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      const enrollments = (enrollmentData || []) as unknown as { class_id: string }[];
      const studentCountMap = new Map<string, number>();
      enrollments.forEach((e) => {
        studentCountMap.set(e.class_id, (studentCountMap.get(e.class_id) || 0) + 1);
      });

      // 3. 결과 매핑
      return classes.map((cls) => {
        const startTime = cls.start_time?.slice(0, 5) || '00:00';
        const endTime = cls.end_time?.slice(0, 5) || '00:00';

        // 수업 상태 결정 (오늘인 경우만 current 가능)
        let status: 'upcoming' | 'current' | 'completed' = 'upcoming';
        if (isToday) {
          if (endTime < currentTime) {
            status = 'completed';
          } else if (startTime <= currentTime && endTime >= currentTime) {
            status = 'current';
          }
        }

        const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;

        return {
          id: cls.id,
          name: cls.name,
          subject: cls.subject || '수학',
          startTime,
          endTime,
          room: null,
          teacher: teacher ? { id: teacher.id, name: teacher.name } : null,
          studentCount: studentCountMap.get(cls.id) || 0,
          status,
        };
      });
    },
    enabled: isSupabaseConfigured && !!dateStr,
    staleTime: 60 * 1000,
  });
}

/**
 * 과목별 오늘 수업 조회
 */
export function useTodayClassesBySubject(subject: string) {
  const { data: allClasses, ...rest } = useTodayClasses();

  const filteredClasses = allClasses?.filter(
    (cls) => cls.subject.toLowerCase() === subject.toLowerCase()
  );

  return { data: filteredClasses, ...rest };
}

/**
 * 현재 진행 중인 수업 조회
 */
export function useCurrentClasses() {
  const { data: allClasses, ...rest } = useTodayClasses();

  const currentClasses = allClasses?.filter((cls) => cls.status === 'current');

  return { data: currentClasses, ...rest };
}
