/**
 * 주간 데이터 관련 훅
 *
 * - useWeekClassesByDate: 주간 반별 수업
 * - useWeekNoticesByDate: 주간 공지
 * - useWeekAttendanceIssuesByDate: 주간 출결 이슈
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { TabletClassSchedule, TabletNotice, TabletAttendanceIssue } from './types';

/**
 * 주간 날짜별 수업 조회 (태블릿용)
 *
 * @param teacherId - 선생님 ID
 * @param weekDates - 조회할 날짜 배열
 */
export function useWeekClassesByDate(teacherId: string | null, weekDates: Date[]) {
  const dateKeys = weekDates.map(
    (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  );

  return useQuery({
    queryKey: ['classes', 'byWeek', teacherId, dateKeys.join(',')],
    queryFn: async (): Promise<Record<string, TabletClassSchedule[]>> => {
      if (!teacherId || weekDates.length === 0) return {};

      // Stage 35-B: 선생님의 모든 활성 수업 가져오기
      const { data: classes, error } = await supabase
        .from('classes')
        .select('id, name, subject, day_of_week, start_time, end_time, teacher_id, assistant_teacher_id, homeroom_teacher_id, assistant_days, homeroom_days')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true)
        .order('start_time');

      if (error) throw error;
      if (!classes) return {};

      interface WeekClassRow {
        id: string;
        name: string;
        subject: string | null;
        day_of_week: number[];
        start_time: string | null;
        end_time: string | null;
        teacher_id: string | null;
        assistant_teacher_id: string | null;
        homeroom_teacher_id: string | null;
        assistant_days: number[] | null;
        homeroom_days: number[] | null;
      }
      const typedClasses = classes as unknown as WeekClassRow[];

      // 각 반의 학생 수 조회
      const classStudentCounts = await Promise.all(
        typedClasses.map(async (cls) => {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('is_active', true);
          return { id: cls.id, count: count || 0 };
        })
      );

      const studentCountMap = new Map(classStudentCounts.map((c) => [c.id, c.count]));
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const result: Record<string, TabletClassSchedule[]> = {};

      for (const date of weekDates) {
        const dow = date.getDay();
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // Stage 35-B: 역할별 요일 필터링
        const dayClasses = typedClasses.filter((cls) => {
          if (cls.teacher_id === teacherId) {
            return cls.day_of_week?.includes(dow);
          }
          if (cls.assistant_teacher_id === teacherId) {
            return cls.assistant_days?.includes(dow);
          }
          if (cls.homeroom_teacher_id === teacherId) {
            return cls.homeroom_days?.includes(dow);
          }
          return false;
        });

        result[dateKey] = dayClasses.map((cls) => {
          let status: 'completed' | 'current' | 'upcoming' = 'upcoming';

          if (dateKey < todayKey) {
            status = 'completed';
          } else if (dateKey === todayKey) {
            const startTime = cls.start_time?.slice(0, 5) || '00:00';
            const endTime = cls.end_time?.slice(0, 5) || '23:59';

            if (endTime < currentTime) {
              status = 'completed';
            } else if (startTime <= currentTime && endTime >= currentTime) {
              status = 'current';
            }
          }

          return {
            id: cls.id,
            name: cls.name,
            subject: cls.subject || '수학',
            studentCount: studentCountMap.get(cls.id) || 0,
            startTime: cls.start_time?.slice(0, 5) || '00:00',
            endTime: cls.end_time?.slice(0, 5) || '00:00',
            status,
          };
        }).sort((a, b) => a.startTime.localeCompare(b.startTime));
      }

      return result;
    },
    enabled: isSupabaseConfigured && !!teacherId && weekDates.length > 0,
  });
}

/**
 * 주간 날짜별 공지사항 조회 (태블릿용)
 *
 * @param teacherId - 선생님 ID
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @param myClassIds - 담당 반 ID 목록 (선택사항)
 * @param options.enabled - 쿼리 활성화 여부
 */
export function useWeekNoticesByDate(
  teacherId: string | null,
  startDate: Date,
  endDate: Date,
  myClassIds?: string[],
  options?: { enabled?: boolean }
) {
  const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['notices', 'byWeek', teacherId, startKey, endKey, myClassIds?.join(',') || 'all'],
    queryFn: async (): Promise<Record<string, TabletNotice[]>> => {
      if (!teacherId) return {};

      const { data, error } = await supabase
        .from('notices')
        .select('id, title, description, date, start_time, target_class_ids')
        .eq('is_active', true)
        .gte('date', startKey)
        .lte('date', endKey)
        .order('priority', { ascending: false });

      if (error) throw error;

      interface NoticeRow {
        id: string;
        title: string;
        description: string | null;
        date: string;
        start_time: string | null;
        target_class_ids: string[] | null;
      }
      let typedData = (data || []) as unknown as NoticeRow[];

      // Stage 35-B: target_class_ids 필터링
      if (myClassIds !== undefined) {
        typedData = typedData.filter((notice) => {
          if (!notice.target_class_ids || notice.target_class_ids.length === 0) {
            return true;
          }
          if (myClassIds.length === 0) {
            return false;
          }
          return notice.target_class_ids.some((classId) => myClassIds.includes(classId));
        });
      }

      const result: Record<string, TabletNotice[]> = {};

      typedData.forEach((notice) => {
        const dateKey = notice.date;
        if (!result[dateKey]) {
          result[dateKey] = [];
        }

        result[dateKey].push({
          id: notice.id,
          title: notice.title,
          description: notice.description || '',
          time: notice.start_time?.slice(0, 5),
        });
      });

      return result;
    },
    enabled: isSupabaseConfigured && !!teacherId && (options?.enabled ?? true),
  });
}

/**
 * 주간 날짜별 출결 이슈 조회 (태블릿용)
 *
 * @param teacherId - 선생님 ID
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 */
export function useWeekAttendanceIssuesByDate(
  teacherId: string | null,
  startDate: Date,
  endDate: Date
) {
  const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['attendance', 'issues', 'byWeek', teacherId, startKey, endKey],
    queryFn: async (): Promise<Record<string, TabletAttendanceIssue[]>> => {
      if (!teacherId) return {};

      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      if (classError) throw classError;
      if (!classes || classes.length === 0) return {};

      interface IssueClassRow { id: string; name: string }
      const typedClasses = classes as unknown as IssueClassRow[];

      const classIds = typedClasses.map((c) => c.id);
      const classNameMap = new Map(typedClasses.map((c) => [c.id, c.name]));

      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          status,
          class_id,
          student:students(id, name)
        `)
        .in('class_id', classIds)
        .in('status', ['absent', 'late', 'early_leave'])
        .gte('date', startKey)
        .lte('date', endKey);

      if (attError) throw attError;

      interface AttendanceIssueRow {
        id: string;
        date: string;
        status: string;
        class_id: string;
        student: { id: string; name: string } | null;
      }
      const typedAttendance = (attendance || []) as unknown as AttendanceIssueRow[];

      const result: Record<string, TabletAttendanceIssue[]> = {};

      const statusMap: Record<string, string> = {
        absent: '결석',
        late: '지각',
        early_leave: '조퇴',
      };

      typedAttendance.forEach((att) => {
        const dateKey = att.date;
        if (!result[dateKey]) {
          result[dateKey] = [];
        }

        result[dateKey].push({
          id: att.id,
          className: classNameMap.get(att.class_id) || '',
          studentName: att.student?.name || '(알 수 없음)',
          issue: statusMap[att.status] || att.status,
        });
      });

      return result;
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}
