/**
 * useBackofficeDashboard - 강사 대시보드 데이터 훅
 *
 * BackofficeDemo.tsx에서 데이터 로딩 로직을 분리
 * - 수업 목록, 출결, 진도, 숙제 데이터
 * - 순환수업 계산
 * - 주간/월간 캘린더 데이터
 */
import { useMemo } from 'react';
import {
  useClasses,
  useTodayAttendance,
  useAnnouncements,
  useDashboardStats,
  useClassScheduleDates,
  useWeekClassesByDate,
  useWeekNoticesByDate,
  useWeekAttendanceIssuesByDate,
  useTextbooks,
  useSaveProgress,
  useLastProgressBefore,
  useProgressByDate,
  useSaveAttendance,
  useClassWithStudents,
  useSaveHomeworkSubmissions,
  useHomeworkByDate,
  useSaveExamScores,
  useNoticesByDate,
  useAttendanceForTeacherByDate,
  useProgressForTeacherByDate,
  useHomeworkForTeacherByDate,
  useAttendanceByClassAndDate,
} from './useBackofficeData';
import { useRotationSchedules, useRotationScheduleDetail } from './useRotation';
import { getRotationForDate } from '../utils/rotationUtils';
import type { ClassSchedule } from '../components/backoffice/dashboard';

// 날짜 포맷 헬퍼
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface UseBackofficeDashboardOptions {
  teacherId: string;
  selectedDate: Date;
  isTeacherMode: boolean;
}

interface UseBackofficeDashboardResult {
  // 기본 데이터
  classesData: ReturnType<typeof useClasses>['data'];
  classesLoading: boolean;
  classesError: ReturnType<typeof useClasses>['error'];
  todayAttendanceData: ReturnType<typeof useTodayAttendance>['data'];
  announcementsData: ReturnType<typeof useAnnouncements>['data'];
  dashboardStats: ReturnType<typeof useDashboardStats>['data'];

  // 스케줄 날짜
  realClassScheduleDates: string[] | undefined;

  // 주간 데이터
  realClassesByDate: Record<string, ClassSchedule[]> | null;
  realNoticesByDate: ReturnType<typeof useWeekNoticesByDate>['data'];
  realAttendanceIssuesByDate: ReturnType<typeof useWeekAttendanceIssuesByDate>['data'];
  weekDates: Date[];

  // 선택 날짜 기반 수업 목록
  realClassSchedules: ClassSchedule[];

  // 선택 날짜 기반 할일 현황
  realNotices: ReturnType<typeof useNoticesByDate>['data'];
  realAttendanceData: ReturnType<typeof useAttendanceForTeacherByDate>['data'];
  realProgressData: ReturnType<typeof useProgressForTeacherByDate>['data'];
  realHomeworkData: ReturnType<typeof useHomeworkForTeacherByDate>['data'];
  isTaskDataLoading: boolean;

  // 순환수업
  rotationForSelectedDate: ReturnType<typeof getRotationForDate>;
  rotationDetail: ReturnType<typeof useRotationScheduleDetail>['data'];

  // 교재
  textbooks: ReturnType<typeof useTextbooks>['data'];

  // 뮤테이션
  saveProgress: ReturnType<typeof useSaveProgress>;
  saveAttendance: ReturnType<typeof useSaveAttendance>;
  saveHomework: ReturnType<typeof useSaveHomeworkSubmissions>;
  saveExamScores: ReturnType<typeof useSaveExamScores>;

  // 진도 데이터
  lastProgressData: ReturnType<typeof useLastProgressBefore>['data'];
  todayProgressData: ReturnType<typeof useProgressByDate>['data'];

  // 출결 모달용
  useClassWithStudentsHook: typeof useClassWithStudents;
  useAttendanceByClassAndDateHook: typeof useAttendanceByClassAndDate;

  // 숙제 모달용
  useHomeworkByDateHook: typeof useHomeworkByDate;

  // 내 반 ID 목록 (공지 필터링용)
  myClassIds: string[] | undefined;
}

export function useBackofficeDashboard({
  teacherId,
  selectedDate,
  isTeacherMode,
}: UseBackofficeDashboardOptions): UseBackofficeDashboardResult {
  const selectedDateStr = formatDateKey(selectedDate);

  // 기본 데이터
  const { data: classesData, isLoading: classesLoading, error: classesError } = useClasses({
    status: 'active',
    teacherId: isTeacherMode ? teacherId : undefined,
  });
  const { data: todayAttendanceData } = useTodayAttendance();
  const { data: announcementsData } = useAnnouncements(5);
  const { data: dashboardStats } = useDashboardStats();

  // 수업 있는 날짜 (캘린더 파란 점 표시용)
  const scheduleStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  }, []);
  const scheduleEndDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d;
  }, []);
  const { data: realClassScheduleDates } = useClassScheduleDates(
    teacherId,
    scheduleStartDate,
    scheduleEndDate
  );

  // 내 반 ID 목록 (공지 필터링용)
  const myClassIds = useMemo(() => {
    if (!isTeacherMode || !classesData) return undefined;
    return classesData.map((cls) => cls.id);
  }, [isTeacherMode, classesData]);

  const isMyClassIdsReady = !classesLoading && (isTeacherMode ? !!classesData : true);

  // 선택된 날짜 기반 데이터
  const { data: realAttendanceData, isLoading: attendanceLoading } = useAttendanceForTeacherByDate(teacherId, selectedDateStr);
  const { data: realProgressData, isLoading: progressLoading } = useProgressForTeacherByDate(teacherId, selectedDateStr);
  const { data: realHomeworkData, isLoading: homeworkLoading } = useHomeworkForTeacherByDate(teacherId, selectedDateStr);
  const { data: noticesData, isLoading: noticesLoading } = useNoticesByDate(
    selectedDateStr,
    myClassIds,
    { enabled: isMyClassIdsReady }
  );

  const isTaskDataLoading = attendanceLoading || progressLoading || homeworkLoading || noticesLoading;

  // 주간 날짜 배열 계산
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    current.setDate(current.getDate() - dayOfWeek);
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedDate]);

  const weekStartDate = weekDates[0];
  const weekEndDate = weekDates[6];

  // 주간 데이터
  const { data: rawWeekClassesByDate } = useWeekClassesByDate(teacherId, weekDates);
  const { data: realNoticesByDate } = useWeekNoticesByDate(
    teacherId,
    weekStartDate,
    weekEndDate,
    myClassIds,
    { enabled: isMyClassIdsReady }
  );
  const { data: realAttendanceIssuesByDate } = useWeekAttendanceIssuesByDate(teacherId, weekStartDate, weekEndDate);

  // 순환수업
  const { data: rotationSchedules } = useRotationSchedules();
  const activeRotationSchedule = rotationSchedules?.find((s) => s.is_active);
  const { data: rotationDetail } = useRotationScheduleDetail(activeRotationSchedule?.id || null);

  const rotationForSelectedDate = useMemo(() => {
    if (!rotationDetail || !rotationDetail.schedule.is_active) {
      return null;
    }
    return getRotationForDate(
      selectedDate,
      rotationDetail.schedule,
      rotationDetail.patterns,
      rotationDetail.exceptions
    );
  }, [selectedDate, rotationDetail]);

  // 주간 수업 데이터 + 순환수업
  const realClassesByDate = useMemo(() => {
    if (!rawWeekClassesByDate && !rotationDetail) return null;

    const result: Record<string, ClassSchedule[]> = {};

    weekDates.forEach((date) => {
      const dateKey = formatDateKey(date);
      const existingClasses = rawWeekClassesByDate?.[dateKey] || [];
      result[dateKey] = [...existingClasses];

      // 순환수업 추가
      if (rotationDetail?.schedule.is_active && classesData) {
        const rotationForDate = getRotationForDate(
          date,
          rotationDetail.schedule,
          rotationDetail.patterns,
          rotationDetail.exceptions
        );

        if (rotationForDate && !rotationForDate.isHoliday) {
          const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
          const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const todayKey = formatDateKey(now);

          let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
          if (dateKey < todayKey) {
            status = 'completed';
          } else if (dateKey === todayKey) {
            if (endTime < currentTime) status = 'completed';
            else if (startTime <= currentTime && endTime >= currentTime) status = 'current';
          }

          rotationForDate.activities.forEach((activity) => {
            const gradeName = activity.gradeName;
            const activityType = activity.activityType;
            const activityName = activity.activityName;
            const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
            const isEnglishActivity = activityType === 'english_class';

            const matchedClasses = classesData.filter((cls) => {
              const gradeData = (cls as { grades?: { name?: string } }).grades;
              let clsGradeName: string | undefined = gradeData?.name;
              if (!clsGradeName) {
                const match = cls.name.match(/^(중[123]|고[123]|초[3-6])/);
                clsGradeName = match ? match[1] : undefined;
              }
              if (clsGradeName !== gradeName) return false;

              const isMathClass = cls.name.includes('수학');
              const isEnglishClass = cls.name.includes('영어');

              if (isMathActivity && isMathClass) return true;
              if (isEnglishActivity && isEnglishClass) return true;
              return false;
            });

            matchedClasses.forEach((cls) => {
              const exists = result[dateKey].some((r) => r.id === cls.id);
              if (!exists) {
                result[dateKey].push({
                  id: cls.id,
                  name: cls.name,
                  subject: `순환 ${rotationForDate.weekNumber}주차 (${activityName})`,
                  studentCount: cls.student_count || 0,
                  startTime,
                  endTime,
                  status,
                });
              }
            });
          });
        }
      }

      result[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return result;
  }, [rawWeekClassesByDate, weekDates, rotationDetail, classesData]);

  // 선택된 날짜 기준 수업 목록
  const realClassSchedules = useMemo(() => {
    const result: ClassSchedule[] = [];
    const selectedDow = selectedDate.getDay();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 일반 수업
    if (classesData && classesData.length > 0) {
      const filtered = classesData.filter((cls) => {
        if (isTeacherMode && teacherId) {
          if (cls.teacher_id === teacherId) return cls.day_of_week?.includes(selectedDow);
          if (cls.assistant_teacher_id === teacherId) return cls.assistant_days?.includes(selectedDow);
          if (cls.homeroom_teacher_id === teacherId) return cls.homeroom_days?.includes(selectedDow);
          return false;
        }
        return cls.day_of_week?.includes(selectedDow);
      });

      filtered.forEach((cls) => {
        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (cls.end_time && cls.end_time < currentTime) status = 'completed';
        else if (cls.start_time && cls.start_time <= currentTime && cls.end_time && cls.end_time >= currentTime) status = 'current';

        result.push({
          id: cls.id,
          name: cls.name,
          subject: (cls as { subjects?: { name?: string } }).subjects?.name || cls.subject || '수학',
          studentCount: cls.student_count || 0,
          startTime: cls.start_time?.slice(0, 5) || '00:00',
          endTime: cls.end_time?.slice(0, 5) || '00:00',
          status,
        });
      });
    }

    // 순환수업 추가
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
      const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (endTime < currentTime) status = 'completed';
      else if (startTime <= currentTime && endTime >= currentTime) status = 'current';

      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
        const activityName = activity.activityName;
        const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
        const isEnglishActivity = activityType === 'english_class';

        const matchedClasses = classesData.filter((cls) => {
          const gradeData = (cls as { grades?: { name?: string } }).grades;
          let clsGradeName: string | undefined = gradeData?.name;
          if (!clsGradeName) {
            const match = cls.name.match(/^(중[123]|고[123]|초[3-6])/);
            clsGradeName = match ? match[1] : undefined;
          }
          if (clsGradeName !== gradeName) return false;
          const isMathClass = cls.name.includes('수학');
          const isEnglishClass = cls.name.includes('영어');
          if (isMathActivity && isMathClass) return true;
          if (isEnglishActivity && isEnglishClass) return true;
          return false;
        });

        matchedClasses.forEach((cls) => {
          const exists = result.some((r) => r.id === cls.id);
          if (!exists) {
            result.push({
              id: cls.id,
              name: cls.name,
              subject: `순환 ${rotationForSelectedDate.weekNumber}주차 (${activityName})`,
              studentCount: cls.student_count || 0,
              startTime,
              endTime,
              status,
            });
          }
        });
      });
    }

    result.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return result;
  }, [selectedDate, classesData, isTeacherMode, teacherId, rotationForSelectedDate, rotationDetail]);

  // 교재
  const { data: textbooks } = useTextbooks();

  // 뮤테이션
  const saveProgress = useSaveProgress();
  const saveAttendance = useSaveAttendance();
  const saveHomework = useSaveHomeworkSubmissions();
  const saveExamScores = useSaveExamScores();

  // 진도 데이터
  const { data: lastProgressData } = useLastProgressBefore(null, selectedDateStr);
  const { data: todayProgressData } = useProgressByDate(null, selectedDateStr);

  return {
    classesData,
    classesLoading,
    classesError,
    todayAttendanceData,
    announcementsData,
    dashboardStats,
    realClassScheduleDates,
    realClassesByDate,
    realNoticesByDate,
    realAttendanceIssuesByDate,
    weekDates,
    realClassSchedules,
    realNotices: noticesData,
    realAttendanceData,
    realProgressData,
    realHomeworkData,
    isTaskDataLoading,
    rotationForSelectedDate,
    rotationDetail,
    textbooks,
    saveProgress,
    saveAttendance,
    saveHomework,
    saveExamScores,
    lastProgressData,
    todayProgressData,
    useClassWithStudentsHook: useClassWithStudents,
    useAttendanceByClassAndDateHook: useAttendanceByClassAndDate,
    useHomeworkByDateHook: useHomeworkByDate,
    myClassIds,
  };
}

export default useBackofficeDashboard;
