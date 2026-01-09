/**
 * useBackofficeDashboardData - 백오피스 대시보드 계산 로직 훅
 *
 * BackofficeDemo.tsx에서 추출된 14개 useMemo 계산 로직
 * - 수업 스케줄 변환
 * - 출결/진도/숙제 데이터 변환
 * - 주간 데이터 계산
 * - 순환수업 통합
 */
import { useMemo } from 'react';
import type { ClassSchedule } from '../components/backoffice/dashboard';
import type {
  RotationSchedule,
  RotationPattern,
  RotationException,
  RotationScheduleDetail,
} from '../types/rotation';
import { getRotationForDate } from '../utils/rotationUtils';

// 날짜 포맷 헬퍼
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 타입 정의 - null과 undefined 모두 허용
interface ClassData {
  id: string;
  name: string;
  subject?: string | null;
  student_count?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  day_of_week?: number[] | null;
  teacher_id?: string | null;
  assistant_teacher_id?: string | null;
  homeroom_teacher_id?: string | null;
  assistant_days?: number[] | null;
  homeroom_days?: number[] | null;
  grades?: { name?: string | null } | null;
  subjects?: { name?: string | null } | null;
}

// RotationScheduleDetail을 사용하거나 undefined 허용
type RotationDetail = RotationScheduleDetail | null | undefined;

interface AttendanceData {
  id: string;
  className: string;
  studentCount: number;
  time: string;
  checked: boolean;
}

interface ProgressData {
  notRecorded?: {
    id: string;
    name: string;
    start_time?: string | null;
    end_time?: string | null;
  }[];
}

interface HomeworkData {
  id: string;
  className: string;
  range?: string | null;
  title?: string | null;
  submitted: number;
  notSubmitted: number;
}

interface NoticeData {
  id: string;
  title: string;
  type?: string;
}

interface RotationForDate {
  weekNumber: number;
  isHoliday: boolean;
  activities: {
    gradeName: string;
    activityType: string;
    activityName: string;
  }[];
}

interface DayInfo {
  date: string;
  dayOfWeek: string;
  classCount: number;
}

interface UseBackofficeDashboardDataParams {
  selectedDate: Date;
  teacherId: string;
  isTeacherMode: boolean;
  classesData: ClassData[] | null | undefined;
  rotationDetail: RotationDetail | null | undefined;
  realAttendanceData: AttendanceData[] | null | undefined;
  realProgressData: ProgressData | null | undefined;
  realHomeworkData: HomeworkData[] | null | undefined;
  noticesData: NoticeData[] | null | undefined;
  rawWeekClassesByDate: Record<string, ClassSchedule[]> | null | undefined;
}

// 공지 타입
type NoticeType = 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation';

interface UseBackofficeDashboardDataReturn {
  // 날짜 관련
  weekDates: Date[];
  prevDayInfo: DayInfo;
  nextDayInfo: DayInfo;
  selectedDateStr: string;
  // 수업 스케줄
  realClassSchedules: ClassSchedule[] | null;
  realClassesByDate: Record<string, ClassSchedule[]> | null;
  rotationForSelectedDate: RotationForDate | null;
  // 태스크 데이터
  realNotices: { id: string; title: string; subtitle: string; read: boolean; type?: NoticeType }[] | null;
  computedAttendances: { id: string; className: string; studentCount: number; time: string; status: 'completed' | 'upcoming'; checked: boolean }[] | null;
  computedProgresses: { id: string; className: string; time: string; lastProgress: string; recorded: boolean }[] | null;
  computedHomeworks: { id: string; className: string; range: string; submitted: number; notSubmitted: number; checked: boolean }[] | null;
}

export function useBackofficeDashboardData({
  selectedDate,
  teacherId,
  isTeacherMode,
  classesData,
  rotationDetail,
  realAttendanceData,
  realProgressData,
  realHomeworkData,
  noticesData,
  rawWeekClassesByDate,
}: UseBackofficeDashboardDataParams): UseBackofficeDashboardDataReturn {
  // 선택된 날짜 문자열
  const selectedDateStr = formatDateKey(selectedDate);

  // 주간 날짜 배열 계산 (선택된 날짜 기준 일~토)
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

  // 선택된 날짜의 순환수업 계산
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

  // 주간 수업 데이터에 순환수업 추가 (태블릿용)
  const realClassesByDate = useMemo(() => {
    if (!rawWeekClassesByDate && !rotationDetail) return null;

    const result: Record<string, ClassSchedule[]> = {};

    weekDates.forEach((date) => {
      const dateKey = formatDateKey(date);
      const existingClasses = rawWeekClassesByDate?.[dateKey] || [];
      result[dateKey] = [...existingClasses];

      if (rotationDetail?.schedule.is_active) {
        const rotationForDate = getRotationForDate(
          date,
          rotationDetail.schedule,
          rotationDetail.patterns,
          rotationDetail.exceptions
        );

        if (rotationForDate && !rotationForDate.isHoliday && classesData) {
          const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
          const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const todayKey = formatDateKey(now);

          let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
          if (dateKey < todayKey) {
            status = 'completed';
          } else if (dateKey === todayKey) {
            if (endTime < currentTime) {
              status = 'completed';
            } else if (startTime <= currentTime && endTime >= currentTime) {
              status = 'current';
            }
          }

          rotationForDate.activities.forEach((activity) => {
            const gradeName = activity.gradeName;
            const activityType = activity.activityType;
            const activityName = activity.activityName;
            const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
            const isEnglishActivity = activityType === 'english_class';

            const matchedClasses = classesData.filter((cls) => {
              const gradeData = cls.grades;
              let clsGradeName: string | undefined = gradeData?.name ?? undefined;
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
                const weekNumber = rotationForDate.weekNumber;
                result[dateKey].push({
                  id: cls.id,
                  name: cls.name,
                  subject: `순환 ${weekNumber}주차 (${activityName})`,
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

  // 실제 데이터를 UI 형식으로 변환 (선택된 날짜 기준)
  const realClassSchedules = useMemo(() => {
    const result: ClassSchedule[] = [];
    const selectedDow = selectedDate.getDay();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. 일반 수업 추가
    if (classesData && classesData.length > 0) {
      const filtered = classesData.filter((cls) => {
        if (isTeacherMode && teacherId) {
          if (cls.teacher_id === teacherId) {
            return cls.day_of_week?.includes(selectedDow);
          }
          if (cls.assistant_teacher_id === teacherId) {
            return cls.assistant_days?.includes(selectedDow);
          }
          if (cls.homeroom_teacher_id === teacherId) {
            return cls.homeroom_days?.includes(selectedDow);
          }
          return false;
        }
        return cls.day_of_week?.includes(selectedDow);
      });

      filtered.forEach((cls) => {
        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (cls.end_time && cls.end_time < currentTime) {
          status = 'completed';
        } else if (cls.start_time && cls.start_time <= currentTime && cls.end_time && cls.end_time >= currentTime) {
          status = 'current';
        }

        result.push({
          id: cls.id,
          name: cls.name,
          subject: cls.subjects?.name || cls.subject || '수학',
          studentCount: cls.student_count || 0,
          startTime: cls.start_time?.slice(0, 5) || '00:00',
          endTime: cls.end_time?.slice(0, 5) || '00:00',
          status,
        });
      });
    }

    // 2. 순환수업 추가
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday) {
      const rotationScheduleData = rotationDetail?.schedule;
      if (rotationScheduleData && classesData && classesData.length > 0) {
        const startTime = rotationScheduleData.start_time?.slice(0, 5) || '00:00';
        const endTime = rotationScheduleData.end_time?.slice(0, 5) || '00:00';

        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (endTime < currentTime) {
          status = 'completed';
        } else if (startTime <= currentTime && endTime >= currentTime) {
          status = 'current';
        }

        rotationForSelectedDate.activities.forEach((activity) => {
          const gradeName = activity.gradeName;
          const activityType = activity.activityType;
          const activityName = activity.activityName;
          const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
          const isEnglishActivity = activityType === 'english_class';

          const matchedClasses = classesData.filter((cls) => {
            const gradeData = cls.grades;
            let clsGradeName: string | undefined = gradeData?.name ?? undefined;
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
            const weekNumber = rotationForSelectedDate.weekNumber;
            result.push({
              id: cls.id,
              name: cls.name,
              subject: `순환 ${weekNumber}주차 (${activityName})`,
              studentCount: cls.student_count || 0,
              startTime,
              endTime,
              status,
            });
          });
        });
      }
    }

    if (result.length === 0) return null;
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [classesData, selectedDate, isTeacherMode, teacherId, rotationForSelectedDate, rotationDetail]);

  // 공지사항 변환
  const realNotices = useMemo(() => {
    if (!noticesData || noticesData.length === 0) return null;

    const validTypes: NoticeType[] = ['urgent', 'holiday', 'absence', 'exam', 'special', 'event', 'operation'];

    return noticesData.map((notice) => ({
      id: notice.id,
      title: notice.title || '',
      subtitle: notice.type === 'urgent' ? '긴급' :
                notice.type === 'absence' ? '결석' :
                notice.type === 'holiday' ? '휴원' :
                notice.type === 'exam' ? '시험' :
                notice.type || '',
      read: false,
      type: validTypes.includes(notice.type as NoticeType) ? (notice.type as NoticeType) : undefined,
    }));
  }, [noticesData]);

  // 출결 데이터 변환
  const computedAttendances = useMemo(() => {
    const result: { id: string; className: string; studentCount: number; time: string; status: 'completed' | 'upcoming'; checked: boolean }[] = [];

    // 1. 정규 수업 출결 데이터
    if (realAttendanceData && realAttendanceData.length > 0) {
      realAttendanceData.forEach((att) => {
        result.push({
          id: att.id,
          className: att.className,
          studentCount: att.studentCount,
          time: att.time,
          status: 'upcoming' as const,
          checked: att.checked,
        });
      });
    }

    // 2. 순환수업 출결 데이터 추가
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
      const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
        const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
        const isEnglishActivity = activityType === 'english_class';

        const matchedClasses = classesData.filter((cls) => {
          const gradeData = cls.grades;
          let clsGradeName: string | undefined = gradeData?.name ?? undefined;
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
              className: cls.name,
              studentCount: cls.student_count || 0,
              time: `${startTime}-${endTime}`,
              status: 'upcoming' as const,
              checked: false,
            });
          }
        });
      });
    }

    return result.length > 0 ? result.sort((a, b) => a.time.localeCompare(b.time)) : null;
  }, [realAttendanceData, rotationForSelectedDate, rotationDetail, classesData]);

  // 진도 데이터 변환
  const computedProgresses = useMemo(() => {
    const result: { id: string; className: string; time: string; lastProgress: string; recorded: boolean }[] = [];

    // 1. 정규 수업 진도 데이터
    if (realProgressData?.notRecorded) {
      realProgressData.notRecorded.forEach((cls) => {
        result.push({
          id: cls.id,
          className: cls.name,
          time: `${cls.start_time?.slice(0, 5)}-${cls.end_time?.slice(0, 5)}`,
          lastProgress: '',
          recorded: false,
        });
      });
    }

    // 2. 순환수업 진도 데이터 추가
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
      const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
        const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
        const isEnglishActivity = activityType === 'english_class';

        const matchedClasses = classesData.filter((cls) => {
          const gradeData = cls.grades;
          let clsGradeName: string | undefined = gradeData?.name ?? undefined;
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
              className: cls.name,
              time: `${startTime}-${endTime}`,
              lastProgress: '',
              recorded: false,
            });
          }
        });
      });
    }

    return result.length > 0 ? result.sort((a, b) => a.time.localeCompare(b.time)) : null;
  }, [realProgressData, rotationForSelectedDate, rotationDetail, classesData]);

  // 숙제 데이터 변환
  const computedHomeworks = useMemo(() => {
    const result: { id: string; className: string; range: string; submitted: number; notSubmitted: number; checked: boolean }[] = [];

    // 1. 정규 수업 숙제 데이터
    if (realHomeworkData && realHomeworkData.length > 0) {
      realHomeworkData.forEach((hw) => {
        result.push({
          id: hw.id,
          className: hw.className,
          range: hw.range || hw.title || '',
          submitted: hw.submitted,
          notSubmitted: hw.notSubmitted,
          checked: false,
        });
      });
    }

    // 2. 순환수업 숙제 데이터 추가
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
        const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
        const isEnglishActivity = activityType === 'english_class';

        const matchedClasses = classesData.filter((cls) => {
          const gradeData = cls.grades;
          let clsGradeName: string | undefined = gradeData?.name ?? undefined;
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
              className: cls.name,
              range: '',
              submitted: 0,
              notSubmitted: cls.student_count || 0,
              checked: false,
            });
          }
        });
      });
    }

    return result.length > 0 ? result : null;
  }, [realHomeworkData, rotationForSelectedDate, rotationDetail, classesData]);

  // 이전/다음 날짜 정보 계산
  const prevDayInfo = useMemo(() => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const key = formatDateKey(prevDate);
    const classCount = realClassesByDate?.[key]?.length ?? 0;
    return {
      date: formatDateLabel(prevDate),
      dayOfWeek: DAY_NAMES[prevDate.getDay()],
      classCount,
    };
  }, [selectedDate, realClassesByDate]);

  const nextDayInfo = useMemo(() => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    const key = formatDateKey(nextDate);
    const classCount = realClassesByDate?.[key]?.length ?? 0;
    return {
      date: formatDateLabel(nextDate),
      dayOfWeek: DAY_NAMES[nextDate.getDay()],
      classCount,
    };
  }, [selectedDate, realClassesByDate]);

  return {
    weekDates,
    prevDayInfo,
    nextDayInfo,
    selectedDateStr,
    realClassSchedules,
    realClassesByDate,
    rotationForSelectedDate,
    realNotices,
    computedAttendances,
    computedProgresses,
    computedHomeworks,
  };
}
