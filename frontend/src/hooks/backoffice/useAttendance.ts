/**
 * 출결 관련 훅
 *
 * - useAttendance: 출결 조회 (반별)
 * - useTodayAttendance: 오늘 출결
 * - useSaveAttendance: 출결 저장
 * - useAttendanceByDate: 날짜별 출결
 * - useTodayAttendanceForTeacher: 선생님별 오늘 출결
 * - useAttendanceForTeacherByDate: 선생님별 날짜 출결
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, STUDENT_COLORS } from './types';
import type {
  AttendanceWithStudent,
  AttendanceStatus,
  ClassAttendanceData,
  RecordAttendanceStatus,
  AttendanceRecordData,
} from './types';

/**
 * 출결 조회 (반별, 날짜별)
 */
export function useAttendance(options: {
  classId: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['attendance', options],
    queryFn: async (): Promise<AttendanceWithStudent[]> => {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          student:students(id, name, grade)
        `)
        .eq('class_id', options.classId)
        .order('date', { ascending: false });

      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AttendanceWithStudent[];
    },
    enabled: isSupabaseConfigured && !!options.classId,
  });
}

/**
 * 오늘 출결 현황 (전체)
 */
export function useTodayAttendance() {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance', 'today', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          student:students(id, name, grade),
          class:classes(id, name)
        `)
        .eq('date', today);

      if (error) throw error;
      return data;
    },
    enabled: isSupabaseConfigured,
  });
}

/**
 * 출결 저장 (upsert)
 */
export function useSaveAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: {
      class_id: string;
      student_id: string;
      date: string;
      status: AttendanceStatus;
      note?: string;
    }[]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('attendance')
        .upsert(records, {
          onConflict: 'class_id,student_id,date',
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

/**
 * 특정 날짜의 반별 출결 현황 조회
 *
 * @param teacherId - 선생님 ID
 * @param date - 조회할 날짜 (YYYY-MM-DD)
 */
export function useAttendanceByDate(teacherId: string | null, date: string) {
  return useQuery({
    queryKey: ['attendance', 'byDate', teacherId, date],
    queryFn: async (): Promise<ClassAttendanceData[]> => {
      if (!teacherId || !date) return [];

      // Stage 35-B: 해당 날짜에 수업이 있는 반 조회 (역할별 요일 필터링)
      const targetDate = new Date(date);
      const dow = targetDate.getDay();

      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time, teacher_id, assistant_teacher_id, homeroom_teacher_id, day_of_week, assistant_days, homeroom_days')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true)
        .order('start_time');

      if (classError) throw classError;
      if (!classes || classes.length === 0) return [];

      type ClassRow = {
        id: string;
        name: string;
        start_time: string | null;
        end_time: string | null;
        teacher_id: string | null;
        assistant_teacher_id: string | null;
        homeroom_teacher_id: string | null;
        day_of_week: number[] | null;
        assistant_days: number[] | null;
        homeroom_days: number[] | null;
      };

      // Stage 35-B: 역할별 요일 필터링
      const typedClasses = (classes as ClassRow[]).filter((cls) => {
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

      const results: ClassAttendanceData[] = [];

      for (const cls of typedClasses) {
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select(`
            student:students(id, name)
          `)
          .eq('class_id', cls.id)
          .eq('is_active', true);

        if (enrollError) throw enrollError;

        type EnrollRow = { student: { id: string; name: string } | null };
        const typedEnroll = (enrollments || []) as EnrollRow[];
        const studentList = typedEnroll
          .filter(e => e.student)
          .map(e => e.student!);

        if (studentList.length === 0) continue;

        const studentIds = studentList.map(s => s.id);
        const { data: attendanceData, error: attError } = await supabase
          .from('attendance')
          .select('student_id, status, note')
          .eq('class_id', cls.id)
          .eq('date', date)
          .in('student_id', studentIds);

        if (attError) throw attError;

        type AttRow = { student_id: string; status: string; note?: string | null };
        const typedAtt = (attendanceData || []) as AttRow[];

        const attMap = new Map<string, AttRow>();
        typedAtt.forEach(a => attMap.set(a.student_id, a));

        const records: AttendanceRecordData[] = studentList.map((student, index) => {
          const att = attMap.get(student.id);
          let status: RecordAttendanceStatus = 'present';
          let note: string | undefined;

          if (att) {
            if (att.status === 'absent' || att.status === 'excused') {
              status = 'absent';
            } else if (att.status === 'late' || att.status === 'early_leave') {
              status = 'late';
            } else {
              status = 'present';
            }
            note = att.note || undefined;
          }

          return {
            studentId: student.id,
            studentName: student.name,
            studentColor: STUDENT_COLORS[index % STUDENT_COLORS.length],
            status,
            note,
          };
        });

        results.push({
          classId: cls.id,
          className: cls.name,
          time: `${cls.start_time?.slice(0, 5) || '00:00'} - ${cls.end_time?.slice(0, 5) || '00:00'}`,
          records,
        });
      }

      return results;
    },
    enabled: isSupabaseConfigured && !!teacherId && !!date,
  });
}

/**
 * 오늘 출결 현황 상세 조회 (선생님별)
 *
 * @param teacherId - 선생님 ID
 */
export function useTodayAttendanceForTeacher(teacherId: string | null) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance', 'today', 'teacher', teacherId, today],
    queryFn: async () => {
      if (!teacherId) return [];

      // Stage 35: 선생님의 오늘 수업 (주담임, 부담임, 담임 모두 포함)
      const dow = new Date().getDay();
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true)
        .contains('day_of_week', [dow])
        .order('start_time');

      if (classError) throw classError;

      interface AttendanceClassRow {
        id: string;
        name: string;
        start_time: string | null;
        end_time: string | null;
      }
      const typedClasses = (classes || []) as unknown as AttendanceClassRow[];

      if (typedClasses.length === 0) return [];

      const results = await Promise.all(
        typedClasses.map(async (cls) => {
          const { count: studentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('is_active', true);

          const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('date', today);

          return {
            id: cls.id,
            className: cls.name,
            time: `${cls.start_time?.slice(0, 5)}-${cls.end_time?.slice(0, 5)}`,
            studentCount: studentCount || 0,
            checked: (attendanceCount || 0) > 0,
          };
        })
      );

      return results;
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}

/**
 * 선택된 날짜의 출결 현황 조회 (선생님별)
 *
 * @param teacherId - 선생님 ID
 * @param date - 선택된 날짜 (YYYY-MM-DD)
 */
export function useAttendanceForTeacherByDate(teacherId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['attendance', 'byDate', 'teacher', teacherId, date],
    queryFn: async () => {
      if (!teacherId || !date) return [];

      const targetDate = new Date(date);
      const dow = targetDate.getDay();

      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time, teacher_id, assistant_teacher_id, homeroom_teacher_id, day_of_week, assistant_days, homeroom_days')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true)
        .order('start_time');

      if (classError) throw classError;

      interface AttendanceClassRow {
        id: string;
        name: string;
        start_time: string | null;
        end_time: string | null;
        teacher_id: string | null;
        assistant_teacher_id: string | null;
        homeroom_teacher_id: string | null;
        day_of_week: number[] | null;
        assistant_days: number[] | null;
        homeroom_days: number[] | null;
      }

      const typedClasses = ((classes || []) as unknown as AttendanceClassRow[]).filter((cls) => {
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

      if (typedClasses.length === 0) return [];

      const results = await Promise.all(
        typedClasses.map(async (cls) => {
          const { count: studentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('is_active', true);

          const { count: attendanceCount } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id)
            .eq('date', date);

          return {
            id: cls.id,
            className: cls.name,
            time: `${cls.start_time?.slice(0, 5)}-${cls.end_time?.slice(0, 5)}`,
            studentCount: studentCount || 0,
            checked: (attendanceCount || 0) > 0,
          };
        })
      );

      return results;
    },
    enabled: isSupabaseConfigured && !!teacherId && !!date,
  });
}
