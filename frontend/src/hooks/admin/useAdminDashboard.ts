/**
 * 통합 대시보드 훅
 *
 * useTodayAllClasses - 특정 날짜의 모든 수업 (정규 + 순환수업)
 * useClassScheduleDetails - 시간대별 수업 그룹핑
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRotationSchedules, useRotationScheduleDetail } from '../useRotation';
import { getRotationForDate } from '../../utils/rotationUtils';
import { formatDateKey } from '../../utils/weekUtils';
import type { DashboardClass, RotationActivityInfo, ClassScheduleDetail, TimeSlotGroup, ClassLevel } from '../../types/admin';
import { extractLevel, LEVEL_ORDER } from '../../types/admin';
import { useClassesByDate } from './useAdminTodayClasses';
import type { ClassRow, ProgressRow, HomeworkRow } from './types';

// =====================================================
// 통합 수업 훅 (Stage 14: 순환수업 대시보드 통합)
// =====================================================

/**
 * 특정 날짜의 모든 수업 조회 (정규 + 순환수업 통합)
 *
 * Stage 14: 순환수업을 대시보드에 통합 표시
 * Stage 15: 날짜 선택 기반 조회 지원
 *
 * @param dateStr - 'YYYY-MM-DD' 형식 (생략시 오늘)
 */
export function useTodayAllClasses(dateStr?: string) {
  // 날짜 계산
  const today = new Date();
  const todayStr = formatDateKey(today);
  const targetDateStr = dateStr || todayStr;

  // 날짜 파싱
  const [year, month, day] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const targetDow = targetDate.getDay();

  // 현재 시간 (상태 계산용)
  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  const isToday = targetDateStr === todayStr;

  // 1. 정규 수업 조회 (날짜 기반)
  const { data: regularClasses, isLoading: regularLoading } = useClassesByDate(targetDateStr);

  // 2. 활성화된 순환수업 목록 조회
  const { data: rotationSchedules, isLoading: rotationLoading } = useRotationSchedules();

  // 3. 선택된 요일에 해당하는 활성 순환수업 필터
  const targetRotationSchedules = rotationSchedules?.filter(
    (s) => s.day_of_week === targetDow && s.is_active
  ) || [];

  // 4. 각 순환수업의 상세 정보 조회
  const firstScheduleId = targetRotationSchedules.length > 0 ? targetRotationSchedules[0].id : null;
  const { data: rotationDetail } = useRotationScheduleDetail(firstScheduleId);

  // 5. 통합 결과 계산
  const allClasses: DashboardClass[] = useMemo(() => {
    const result: DashboardClass[] = [];

    // 5-1. 정규 수업 변환
    if (regularClasses) {
      regularClasses.forEach((cls) => {
        result.push({
          id: cls.id,
          name: cls.name,
          subject: cls.subject,
          startTime: cls.startTime,
          endTime: cls.endTime,
          teacher: cls.teacher,
          studentCount: cls.studentCount,
          status: cls.status,
          isRotation: false,
        });
      });
    }

    // 5-2. 순환수업 변환 (선택된 날짜 기준)
    targetRotationSchedules.forEach((schedule) => {
      const detail = schedule.id === firstScheduleId ? rotationDetail : null;

      if (!detail) {
        result.push(createRotationDashboardClass(schedule, null, currentTime, isToday));
      } else {
        // 선택된 날짜의 순환수업 활동 계산
        const targetActivity = getRotationForDate(
          targetDate,
          detail.schedule,
          detail.patterns,
          detail.exceptions
        );

        result.push(createRotationDashboardClass(schedule, targetActivity, currentTime, isToday));
      }
    });

    // 5-3. 시간순 정렬
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [regularClasses, targetRotationSchedules, rotationDetail, firstScheduleId, currentTime, isToday, targetDate]);

  return {
    data: allClasses,
    isLoading: regularLoading || rotationLoading,
    regularCount: regularClasses?.length || 0,
    rotationCount: targetRotationSchedules.length,
  };
}

/**
 * 순환수업을 DashboardClass로 변환
 * @param isToday - 오늘 날짜인지 여부 (current 상태 계산에 사용)
 */
function createRotationDashboardClass(
  schedule: { id: string; name: string; start_time: string; end_time: string },
  activity: { weekNumber: number; isHoliday: boolean; holidayReason?: string; activities: { gradeId: string; gradeName: string; activityType: string; activityName: string }[] } | null,
  currentTime: string,
  isToday: boolean = true
): DashboardClass {
  const startTime = schedule.start_time?.slice(0, 5) || '00:00';
  const endTime = schedule.end_time?.slice(0, 5) || '00:00';

  // 수업 상태 계산 (오늘인 경우만 current 가능)
  let status: 'upcoming' | 'current' | 'completed' = 'upcoming';
  if (isToday) {
    if (endTime < currentTime) {
      status = 'completed';
    } else if (startTime <= currentTime && endTime >= currentTime) {
      status = 'current';
    }
  }

  // 휴일인 경우
  if (activity?.isHoliday) {
    return {
      id: `rotation-${schedule.id}`,
      name: schedule.name,
      subject: '순환수업',
      startTime,
      endTime,
      status,
      isRotation: true,
      rotationScheduleId: schedule.id,
      isHoliday: true,
      holidayReason: activity.holidayReason,
    };
  }

  // 정상 순환수업
  const rotationActivities: RotationActivityInfo[] = activity?.activities.map((act) => ({
    gradeId: act.gradeId,
    gradeName: act.gradeName,
    activityType: act.activityType as 'english_class' | 'math_class' | 'math_test',
    activityName: act.activityName,
  })) || [];

  return {
    id: `rotation-${schedule.id}`,
    name: schedule.name,
    subject: '순환수업',
    startTime,
    endTime,
    status,
    isRotation: true,
    rotationScheduleId: schedule.id,
    rotationWeek: activity?.weekNumber,
    rotationActivities,
  };
}

// =====================================================
// 수업 카드 그리드 훅 (Stage 15: Supabase 연동)
// =====================================================

/**
 * 특정 날짜의 수업을 시간대별로 그룹핑하여 조회
 *
 * Stage 15: Supabase 연동 + 시간대별/레벨별 정렬
 * Stage 20: 과목 필터 지원
 *
 * @param dateStr - 'YYYY-MM-DD' 형식
 * @param subject - 과목 필터 ('all' | 'math' | 'english' | 'other')
 * @returns TimeSlotGroup[] (시간대별 그룹, 각 그룹 내 레벨순 정렬)
 */
export function useClassScheduleDetails(dateStr: string, subject?: string, teacherId?: string) {
  // 날짜 파싱
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dow = targetDate.getDay();

  // 오늘인지 확인 (현재 진행 중 상태 판별용)
  const now = new Date();
  const todayStr = formatDateKey(now);
  const isToday = dateStr === todayStr;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['admin', 'classScheduleDetails', dateStr, subject, teacherId],
    queryFn: async (): Promise<TimeSlotGroup[]> => {
      // 1. 해당 요일 수업 조회 (teachers 조인)
      // PGRST201 에러 수정: 외래키 이름 명시 (teacher_id → profiles)
      // Stage 34: day_of_week, start_times, end_times 추가 (요일별 시간)
      // Stage 35: teacherId 필터 추가 (강사 모드일 때 본인 수업만)
      let query = supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          start_time,
          end_time,
          day_of_week,
          start_times,
          end_times,
          level,
          teacher_id,
          teacher:profiles!classes_teacher_id_fkey(id, name)
        `)
        .eq('is_active', true)
        .contains('day_of_week', [dow]);

      // Stage 35: 강사 모드 - 주담임, 부담임, 담임 모두 포함
      if (teacherId) {
        query = query.or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`);
      }

      const { data: classesData, error: classesError } = await query.order('start_time');

      if (classesError) throw classesError;
      if (!classesData || classesData.length === 0) return [];

      let classes = classesData as unknown as ClassRow[];

      // Stage 20: 과목 필터 적용
      if (subject && subject !== 'all') {
        classes = classes.filter((cls) => {
          const classSubject = (cls.subject || '수학').toLowerCase();
          if (subject === 'math') {
            return classSubject === '수학' || classSubject === 'math';
          } else if (subject === 'english') {
            return classSubject === '영어' || classSubject === 'english';
          } else if (subject === 'other') {
            return classSubject !== '수학' && classSubject !== 'math' &&
                   classSubject !== '영어' && classSubject !== 'english';
          }
          return true;
        });
      }

      if (classes.length === 0) return [];
      const classIds = classes.map((c) => c.id);

      // 2. 수강 학생 수 조회 (enrollments)
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('is_active', true);

      const enrollments = (enrollmentsData || []) as { class_id: string }[];
      const studentCountMap = new Map<string, number>();
      enrollments.forEach((e) => {
        studentCountMap.set(e.class_id, (studentCountMap.get(e.class_id) || 0) + 1);
      });

      // 3. 진도/숙제 데이터 조회 (배치 쿼리)
      // 3-1. 지난 진도 (선택일 이전 가장 최근)
      const { data: lastProgressData } = await supabase
        .from('progress')
        .select('class_id, date, textbook, start_page, end_page')
        .in('class_id', classIds)
        .lt('date', dateStr)
        .order('date', { ascending: false });

      // 3-2. 오늘 진도
      const { data: todayProgressData } = await supabase
        .from('progress')
        .select('class_id, textbook, start_page, end_page')
        .in('class_id', classIds)
        .eq('date', dateStr);

      // 3-3. 지난 숙제 (마감일이 선택일 이전인 가장 최근)
      const { data: lastHomeworkData } = await supabase
        .from('homework')
        .select('class_id, textbook, page_range, description, due_date')
        .in('class_id', classIds)
        .lt('due_date', dateStr)
        .order('due_date', { ascending: false });

      // 3-4. 오늘 숙제 (마감일이 선택일인 것)
      const { data: todayHomeworkData } = await supabase
        .from('homework')
        .select('class_id, textbook, page_range, description')
        .in('class_id', classIds)
        .eq('due_date', dateStr);

      // 반별 최근 데이터 맵 생성
      const lastProgressMap = new Map<string, ProgressRow>();
      (lastProgressData || []).forEach((p: ProgressRow) => {
        if (!lastProgressMap.has(p.class_id)) {
          lastProgressMap.set(p.class_id, p);
        }
      });

      const todayProgressMap = new Map<string, ProgressRow>();
      (todayProgressData || []).forEach((p: ProgressRow) => {
        todayProgressMap.set(p.class_id, p);
      });

      const lastHomeworkMap = new Map<string, HomeworkRow>();
      (lastHomeworkData || []).forEach((h: HomeworkRow) => {
        if (!lastHomeworkMap.has(h.class_id)) {
          lastHomeworkMap.set(h.class_id, h);
        }
      });

      const todayHomeworkMap = new Map<string, HomeworkRow>();
      (todayHomeworkData || []).forEach((h: HomeworkRow) => {
        todayHomeworkMap.set(h.class_id, h);
      });

      // 4. ClassScheduleDetail로 변환
      const classDetails: ClassScheduleDetail[] = classes.map((cls) => {
        // Stage 34: 요일별 시간 계산 (start_times/end_times 배열 우선, fallback은 기존 시간)
        const dayIndex = cls.day_of_week?.indexOf(dow) ?? -1;
        const startTime = (() => {
          if (cls.start_times && dayIndex >= 0 && cls.start_times[dayIndex]) {
            return cls.start_times[dayIndex].slice(0, 5);
          }
          return cls.start_time?.slice(0, 5) || '00:00';
        })();
        const endTime = (() => {
          if (cls.end_times && dayIndex >= 0 && cls.end_times[dayIndex]) {
            return cls.end_times[dayIndex].slice(0, 5);
          }
          return cls.end_time?.slice(0, 5) || '00:00';
        })();

        // 현재 진행 중 상태 (오늘인 경우만)
        let isCurrent = false;
        if (isToday) {
          isCurrent = startTime <= currentTime && currentTime <= endTime;
        }

        // 선생님 정보
        const teacher = Array.isArray(cls.teacher) ? cls.teacher[0] : cls.teacher;

        // 레벨 추출 (반 이름에서)
        const level: ClassLevel = extractLevel(cls.name);

        // 지난 진도
        const lastProg = lastProgressMap.get(cls.id);
        const lastProgress = lastProg
          ? {
              bookName: lastProg.textbook || '-',
              pageRange: lastProg.start_page && lastProg.end_page
                ? `p.${lastProg.start_page}~${lastProg.end_page}`
                : '-',
            }
          : undefined;

        // 오늘 진도
        const todayProg = todayProgressMap.get(cls.id);
        const todayProgress = todayProg
          ? {
              bookName: todayProg.textbook || '-',
              pageRange: todayProg.start_page && todayProg.end_page
                ? `p.${todayProg.start_page}~${todayProg.end_page}`
                : '-',
            }
          : undefined;

        // 지난 숙제
        const lastHw = lastHomeworkMap.get(cls.id);
        const lastHomework = lastHw
          ? {
              bookName: lastHw.textbook || '-',
              pageRange: lastHw.page_range || '-',
              problems: lastHw.description || '-',
            }
          : undefined;

        // 오늘 숙제
        const todayHw = todayHomeworkMap.get(cls.id);
        const todayHomework = todayHw
          ? {
              bookName: todayHw.textbook || '-',
              pageRange: todayHw.page_range || '-',
              problems: todayHw.description || '-',
            }
          : undefined;

        return {
          id: cls.id,
          name: cls.name,
          teacherName: teacher?.name ? `${teacher.name}T` : '미배정',
          studentCount: studentCountMap.get(cls.id) || 0,
          level,
          lastProgress,
          lastHomework,
          todayProgress,
          todayHomework,
          memo: undefined, // TODO: 메모 테이블 연동
          startTime,
          endTime,
          isCurrent,
        };
      });

      // 5. 시간대별 그룹핑
      const timeSlotMap = new Map<string, ClassScheduleDetail[]>();
      classDetails.forEach((cls) => {
        const key = `${cls.startTime}-${cls.endTime}`;
        const group = timeSlotMap.get(key) || [];
        group.push(cls);
        timeSlotMap.set(key, group);
      });

      // 6. 각 그룹 내 레벨순 정렬 (심화 → 정규 → 기초), 같은 레벨은 이름순
      const timeSlotGroups: TimeSlotGroup[] = Array.from(timeSlotMap.entries())
        .map(([key, classes]) => {
          // 레벨순 → 이름순 정렬
          const sortedClasses = classes.sort((a, b) => {
            const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
            if (levelDiff !== 0) return levelDiff;
            return a.name.localeCompare(b.name, 'ko');
          });

          const [startTime, endTime] = key.split('-');
          return {
            timeSlot: `${startTime} ~ ${endTime}`,
            startTime,
            classCount: sortedClasses.length,
            classes: sortedClasses,
          };
        })
        // 시간순 정렬
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      return timeSlotGroups;
    },
    enabled: isSupabaseConfigured && !!dateStr,
    staleTime: 60 * 1000,
  });
}
