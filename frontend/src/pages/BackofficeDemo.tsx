/**
 * BackofficeDemo - 백오피스 대시보드 데모 페이지
 *
 * 목업: docs/mockups/dashboard-layout-v2.html 기준
 * - 날짜 선택 (주간 드롭다운 + 월간 모달)
 * - 히어로 캐러셀
 * - 공지 + 할일 통합 카드
 *
 * Phase 2: hyeyum Supabase 실제 데이터 연동 (2025-12-12)
 */
import { useState, useMemo } from 'react';
import { StatusDot, UserIcon } from '../components/ui/Icons';
import {
  useClasses,
  useTodayAttendance,
  useAnnouncements,
  useDashboardStats,
  useClassScheduleDates,
  // Phase 2-C: 태블릿 뷰 실제 데이터
  useWeekClassesByDate,
  useWeekNoticesByDate,
  useWeekAttendanceIssuesByDate,
  // Phase 310: 교재 자동완성 & 진도 저장
  useTextbooks,
  useSaveProgress,
  // Stage 48: useLastProgressBefore, useProgressByDate는 ProgressModal 내부로 이동
  // Phase 7-1: 출결 저장
  useSaveAttendance,
  useClassWithStudents,
  // Phase 7-3: 숙제 저장
  useSaveHomeworkSubmissions,
  useHomeworkByDate,
  // Phase 7-4: 성적 저장
  useSaveExamScores,
  // 공지사항 (notices 테이블)
  useNoticesByDate,
  // 선택된 날짜 기반 출결/진도/숙제
  useAttendanceForTeacherByDate,
  useProgressForTeacherByDate,
  useHomeworkForTeacherByDate,
  // 출결 모달용: 기존 출결 데이터 로드
  useAttendanceByClassAndDate,
} from '../hooks/useBackofficeData';
import { useIsTablet } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useRotationSchedules, useRotationScheduleDetail } from '../hooks/useRotation';
import { getRotationForDate, formatDateToString } from '../utils/rotationUtils';
import {
  NoClassHeroCard,
  HeroCarousel,
  DateSelector,
  TaskBadgeCard,
  HolidayHeroCard,
} from '../components/backoffice/dashboard';
import { BottomNav } from '../components/backoffice/navigation';
import type { ClassSchedule } from '../components/backoffice/dashboard';
import { TabletDashboard } from '../components/backoffice/tablet';
import type { Notice } from '../components/backoffice/tablet';
import {
  ProgressModal,
  MonthlyCalendarModal,
  AttendanceModal,
  HomeworkModal,
} from '../components/backoffice/modals';
import type { AttendanceStudent, HomeworkStudent, AttendanceStatus } from '../components/backoffice/modals';
import { useTestStore } from '../stores/testStore';
import { useViewModeStore } from '../stores/viewModeStore';
import { RoleToggle } from '../components/admin/RoleToggle';
import { useHolidayStatus, useMonthHolidayStatus } from '../hooks/useHolidays';
import type { TestRecord } from '../types/test';


// 날짜 포맷 헬퍼
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// Phase 310-B: mockLastProgress 제거 - 실제 Supabase 데이터 사용

export function BackofficeDemo() {
  const testStore = useTestStore();
  const { user, isLoading: authLoading, role } = useAuth();

  // =====================================================
  // Stage 29-F: viewMode 기반 수업 필터링
  // - 강사 역할(role=teacher): 항상 본인 수업만 (viewMode 무시)
  // - 관리자/원장 역할 + teacher 모드: 본인 수업만
  // - 관리자/원장 역할 + admin 모드: 전체 수업
  // =====================================================
  const { viewMode } = useViewModeStore();

  // 강사 역할이면 viewMode와 관계없이 항상 본인 수업만
  const isActualTeacher = role === 'teacher';
  const isTeacherMode = isActualTeacher || viewMode === 'teacher';

  // =====================================================
  // Supabase 실제 데이터 훅 (hyeyum 연동)
  // 강사 모드: 로그인한 사용자 기준으로 조회
  // 관리자 모드: 전체 수업 조회
  // =====================================================
  const teacherId = user?.id || '';
  const teacherName = (user?.user_metadata?.name as string) || (user?.email?.split('@')[0]) || '선생님';

  // Stage 29-F: 강사 모드일 때 본인 수업만 표시
  // - 강사 역할(role=teacher): 항상 본인 수업만
  // - 관리자/원장 + teacher 모드: 본인 수업만
  // - 관리자/원장 + admin 모드: 전체 수업
  const { data: classesData, isLoading: classesLoading, error: classesError } = useClasses({
    status: 'active',
    teacherId: isTeacherMode ? teacherId : undefined,
  });


  const { data: todayAttendanceData } = useTodayAttendance();
  const { data: announcementsData } = useAnnouncements(5);
  const { data: dashboardStats } = useDashboardStats();

  // Phase 2-B: 실제 데이터 훅
  // 수업 있는 날짜 (파란 점 표시용) - 현재 월 기준
  const scheduleStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(1); // 이번 달 1일
    return d;
  }, []);
  const scheduleEndDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // 이번 달 마지막 날
    return d;
  }, []);
  const { data: realClassScheduleDates } = useClassScheduleDates(
    teacherId,
    scheduleStartDate,
    scheduleEndDate
  );

  // 태블릿 감지
  const isTablet = useIsTablet();

  // 날짜 상태 (다른 훅보다 먼저 선언 - 선택된 날짜 기반 조회를 위해)
  const [selectedDate, setSelectedDate] = useState(new Date());
  // 로컬 시간대 기준 날짜 문자열 (toISOString()은 UTC로 변환되어 하루 밀릴 수 있음)
  const selectedDateStr = formatDateKey(selectedDate);

  // Stage 30: 휴강일 상태 조회
  const { data: holidayStatus, isLoading: holidayLoading } = useHolidayStatus(selectedDateStr);
  // Stage 30: 월별 휴일 상태 (캘린더용)
  const { data: monthHolidayStatus } = useMonthHolidayStatus(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );

  // 선택된 날짜 기반 출결/진도/숙제 현황
  const { data: realAttendanceData, isLoading: attendanceLoading } = useAttendanceForTeacherByDate(teacherId, selectedDateStr);
  const { data: realProgressData, isLoading: progressLoading } = useProgressForTeacherByDate(teacherId, selectedDateStr);
  const { data: realHomeworkData, isLoading: homeworkLoading } = useHomeworkForTeacherByDate(teacherId, selectedDateStr);

  // Stage 35: 강사 담당 반 ID 목록 (공지 필터링용)
  const myClassIds = useMemo(() => {
    if (!isTeacherMode || !classesData) return undefined;
    return classesData.map((cls) => cls.id);
  }, [isTeacherMode, classesData]);

  // Stage 35-B: myClassIds 준비 완료 상태 (공지 쿼리 실행 조건)
  const isMyClassIdsReady = !classesLoading && (isTeacherMode ? !!classesData : true);

  // 공지사항 로딩 상태 (Stage 35-B: myClassIds 준비된 후에만 쿼리 실행)
  const { data: noticesData, isLoading: noticesLoading } = useNoticesByDate(
    selectedDateStr,
    myClassIds,
    { enabled: isMyClassIdsReady }
  );

  // TaskBadgeCard 데이터 로딩 중 여부
  const isTaskDataLoading = attendanceLoading || progressLoading || homeworkLoading || noticesLoading;

  // Phase 2-C: 태블릿 뷰 실제 데이터 훅
  // 현재 주의 날짜 배열 계산 (선택된 날짜 기준 일~토)
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    // 이번 주 일요일로 이동
    current.setDate(current.getDate() - dayOfWeek);
    // 일~토 7일 추가
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedDate]);

  const weekStartDate = weekDates[0];
  const weekEndDate = weekDates[6];

  // 주간 수업 데이터 (태블릿용)
  const { data: rawWeekClassesByDate } = useWeekClassesByDate(teacherId, weekDates);

  // 주간 공지사항 데이터 (태블릿용) - Stage 35-B: myClassIds 준비된 후에만 쿼리 실행
  const { data: realNoticesByDate } = useWeekNoticesByDate(
    teacherId,
    weekStartDate,
    weekEndDate,
    myClassIds,
    { enabled: isMyClassIdsReady }
  );

  // 주간 출결 이슈 데이터 (태블릿용)
  const { data: realAttendanceIssuesByDate } = useWeekAttendanceIssuesByDate(teacherId, weekStartDate, weekEndDate);

  // 순환수업 데이터 조회
  const { data: rotationSchedules } = useRotationSchedules();
  // 활성화된 순환수업의 첫 번째 스케줄 사용 (보통 하나만 활성화)
  const activeRotationSchedule = rotationSchedules?.find((s) => s.is_active);
  const { data: rotationDetail } = useRotationScheduleDetail(activeRotationSchedule?.id || null);

  // 모달 상태
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  // 캐러셀 시작 위치 (이전 날짜로 가면 'last', 다음 날짜로 가면 'first')
  const [carouselStartPosition, setCarouselStartPosition] = useState<'first' | 'last'>('first');

  // Phase 2: 날짜 전환 애니메이션 상태
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('left');

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

  // Stage 35-C: 주간 수업 데이터에 순환수업 추가 (태블릿용)
  const realClassesByDate = useMemo(() => {
    if (!rawWeekClassesByDate && !rotationDetail) return null;

    const result: Record<string, ClassSchedule[]> = {};

    // 각 날짜별로 순환수업 추가
    weekDates.forEach((date) => {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const existingClasses = rawWeekClassesByDate?.[dateKey] || [];
      result[dateKey] = [...existingClasses];

      // 순환수업 확인 (수요일 등 지정된 요일)
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

          // 수업 상태 결정
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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

      // 시간순 정렬
      result[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return result;
  }, [rawWeekClassesByDate, weekDates, rotationDetail, classesData]);

  // 실제 데이터를 UI 형식으로 변환 (선택된 날짜 기준)
  const realClassSchedules = useMemo(() => {
    const result: ClassSchedule[] = [];

    // 선택된 날짜의 요일 (0=일, 1=월, ..., 6=토)
    const selectedDow = selectedDate.getDay();
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. 일반 수업 추가
    // Stage 35-B: 강사 역할에 따른 요일 필터링
    // - 주담임(teacher_id): day_of_week 기준
    // - 부담임(assistant_teacher_id): assistant_days 기준
    // - 담임(homeroom_teacher_id): homeroom_days 기준
    if (classesData && classesData.length > 0) {
      const filtered = classesData.filter((cls) => {
        // 강사 모드일 때만 역할별 요일 필터링 적용
        if (isTeacherMode && teacherId) {
          // 주담임인 경우: day_of_week 체크
          if (cls.teacher_id === teacherId) {
            return cls.day_of_week?.includes(selectedDow);
          }
          // 부담임인 경우: assistant_days 체크
          if (cls.assistant_teacher_id === teacherId) {
            return cls.assistant_days?.includes(selectedDow);
          }
          // 담임인 경우: homeroom_days 체크
          if (cls.homeroom_teacher_id === teacherId) {
            return cls.homeroom_days?.includes(selectedDow);
          }
          return false;
        }
        // 관리자 모드: 기존 로직 (day_of_week만 체크)
        return cls.day_of_week?.includes(selectedDow);
      });

      filtered.forEach((cls) => {
        // 수업 상태 결정
        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (cls.end_time && cls.end_time < currentTime) {
          status = 'completed';
        } else if (cls.start_time && cls.start_time <= currentTime && cls.end_time && cls.end_time >= currentTime) {
          status = 'current';
        }

        result.push({
          id: cls.id,
          name: cls.name,
          // subjects 조인 데이터에서 과목 이름 가져오기 (없으면 subject 컬럼 사용)
          subject: (cls as { subjects?: { name?: string } }).subjects?.name || cls.subject || '수학',
          studentCount: cls.student_count || 0,
          startTime: cls.start_time?.slice(0, 5) || '00:00',
          endTime: cls.end_time?.slice(0, 5) || '00:00',
          status,
        });
      });
    }

    // 2. 순환수업 추가 (해당 요일인 경우)
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday) {
      const rotationScheduleData = rotationDetail?.schedule;
      if (rotationScheduleData) {
        // 순환수업 시간 (schedule에서 가져옴)
        const startTime = rotationScheduleData.start_time?.slice(0, 5) || '00:00';
        const endTime = rotationScheduleData.end_time?.slice(0, 5) || '00:00';

        // 순환수업 상태 결정
        let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (endTime < currentTime) {
          status = 'completed';
        } else if (startTime <= currentTime && endTime >= currentTime) {
          status = 'current';
        }

        // Stage 35-수정: 순환수업 해당 학년의 반을 개별 표시 (강사/관리자 모두)
        // 활동 타입에 맞는 과목의 반만 표시 (수학 수업/테스트 → 수학 반, 영어 수업 → 영어 반)
        if (classesData && classesData.length > 0) {
          // 순환수업 활동별로 처리
          rotationForSelectedDate.activities.forEach((activity) => {
            const gradeName = activity.gradeName;
            const activityType = activity.activityType;
            const activityName = activity.activityName;

            // 활동 타입에 따른 과목 매칭
            // math_class, math_test → 수학 반
            // english_class → 영어 반
            const isMathActivity = activityType === 'math_class' || activityType === 'math_test';
            const isEnglishActivity = activityType === 'english_class';

            // 해당 학년 + 해당 과목의 반들 찾기
            const matchedClasses = classesData.filter((cls) => {
              // 학년 추출
              const gradeData = (cls as { grades?: { name?: string } }).grades;
              let clsGradeName: string | undefined = gradeData?.name;
              if (!clsGradeName) {
                const match = cls.name.match(/^(중[123]|고[123]|초[3-6])/);
                clsGradeName = match ? match[1] : undefined;
              }

              // 학년이 일치하지 않으면 제외
              if (clsGradeName !== gradeName) return false;

              // 과목 추출 (반 이름에서)
              const isMathClass = cls.name.includes('수학');
              const isEnglishClass = cls.name.includes('영어');

              // 활동 타입과 과목 매칭
              if (isMathActivity && isMathClass) return true;
              if (isEnglishActivity && isEnglishClass) return true;

              return false;
            });

            // 해당 반들을 개별 항목으로 추가 (출석/진도 기록 가능)
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
    }

    // 정렬 후 반환
    if (result.length === 0) {
      return null;
    }

    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [classesData, selectedDate, rotationForSelectedDate, rotationDetail]);

  // 공지사항 변환 - notices 테이블 사용 (선택된 날짜 기준)
  const realNotices = useMemo(() => {
    if (!noticesData || noticesData.length === 0) return null;

    return noticesData.map((notice) => ({
      id: notice.id,
      title: notice.title || '',
      subtitle: notice.type === 'urgent' ? '긴급' :
                notice.type === 'absence' ? '결석' :
                notice.type === 'holiday' ? '휴원' :
                notice.type === 'exam' ? '시험' :
                notice.type || '',
      read: false,
      // 중요 공지 강조를 위한 type 전달
      type: notice.type as 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation' | undefined,
    }));
  }, [noticesData]);

  // Supabase 연결 상태 표시
  const connectionStatus = isSupabaseConfigured
    ? { connected: true, label: 'hyeyum 연결됨' }
    : { connected: false, label: 'Mock 데이터' };

  // Phase 2-B: 실제 데이터를 TaskBadgeCard 형식으로 변환
  // Stage 35-C: 순환수업 데이터도 포함
  const computedAttendances = useMemo(() => {
    const result: { id: string; className: string; studentCount: number; time: string; status: 'completed' | 'upcoming'; checked: boolean }[] = [];

    console.log('[computedAttendances] rotationForSelectedDate:', rotationForSelectedDate);
    console.log('[computedAttendances] classesData:', classesData?.length);

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

    // 2. 순환수업 출결 데이터 추가 (정규 수업에 없는 것만)
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
      const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
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

        console.log('[computedAttendances] matchedClasses for', gradeName, activityType, ':', matchedClasses.map(c => c.name));
        matchedClasses.forEach((cls) => {
          // 정규 수업에 이미 있는지 확인 (중복 방지)
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

    console.log('[computedAttendances] final result:', result.length, result.map(r => r.className));
    return result.length > 0 ? result.sort((a, b) => a.time.localeCompare(b.time)) : null;
  }, [realAttendanceData, rotationForSelectedDate, rotationDetail, classesData]);

  // Stage 35-C: 순환수업 데이터도 포함
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

    // 2. 순환수업 진도 데이터 추가 (정규 수업에 없는 것만)
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      const startTime = rotationDetail.schedule.start_time?.slice(0, 5) || '00:00';
      const endTime = rotationDetail.schedule.end_time?.slice(0, 5) || '00:00';

      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
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

  // Stage 35-C: 순환수업 데이터도 포함
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

    // 2. 순환수업 숙제 데이터 추가 (정규 수업에 없는 것만)
    if (rotationForSelectedDate && !rotationForSelectedDate.isHoliday && rotationDetail?.schedule && classesData) {
      rotationForSelectedDate.activities.forEach((activity) => {
        const gradeName = activity.gradeName;
        const activityType = activity.activityType;
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

  // 진도 모달 상태
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Phase 310: 교재 자동완성 & 진도 저장
  const { data: textbooks } = useTextbooks(selectedClassId || undefined);
  const saveProgress = useSaveProgress();

  // Stage 48: 진도 데이터 조회는 ProgressModal 내부에서 직접 수행
  // (스와이프 후 진도 데이터 중복 버그 수정)
  // useLastProgressBefore, useProgressByDate 제거됨

  // 출결 모달 상태
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<{
    classId: string;
    className: string;
    time: string;
    students: AttendanceStudent[];
  } | null>(null);

  // Phase 7-1: 출결 저장 mutation & 실제 학생 데이터
  const saveAttendance = useSaveAttendance();
  const { data: attendanceClassStudents } = useClassWithStudents(selectedAttendanceClass?.classId || null);

  // 출결 모달용: 기존 출결 데이터 로드
  const { data: existingAttendanceData } = useAttendanceByClassAndDate(
    selectedAttendanceClass?.classId || null,
    selectedDateStr
  );

  // Phase 7-1: 실제 학생 데이터 우선 사용 + 기존 출결 데이터 병합
  const attendanceModalStudents: AttendanceStudent[] = useMemo(() => {
    // 타입 단언 - useClassWithStudents 응답 형식
    interface EnrollmentWithStudent {
      id: string;
      student: { id: string; name: string; phone?: string } | null;
    }
    interface ClassWithEnrollments {
      enrollments?: EnrollmentWithStudent[];
    }
    const typedData = attendanceClassStudents as unknown as ClassWithEnrollments | null;

    // 기존 출결 데이터를 Map으로 변환
    const existingMap = new Map<string, { status: string; note: string | null }>();
    if (existingAttendanceData) {
      existingAttendanceData.forEach((att) => {
        existingMap.set(att.student_id, { status: att.status, note: att.note });
      });
    }

    // Supabase 학생 데이터가 있으면 사용
    if (typedData?.enrollments && typedData.enrollments.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const students = (typedData.enrollments as any[])
        .filter((e) => e.student !== null && e.student !== undefined)
        .map((e) => {
          const existing = existingMap.get(e.student.id);
          if (existing) {
            // DB status를 모달 status로 변환
            let modalStatus: AttendanceStatus = null;
            if (existing.status === 'present') modalStatus = 'present';
            else if (existing.status === 'late' || existing.status === 'early_leave') modalStatus = 'late';
            else if (existing.status === 'absent' || existing.status === 'excused') modalStatus = 'absent';

            return {
              id: e.student.id,
              name: e.student.name,
              status: modalStatus,
              reason: existing.note || undefined,
            };
          }
          return {
            id: e.student.id,
            name: e.student.name,
            status: null as AttendanceStatus,
          };
        });
      return students;
    }
    // Mock fallback
    return selectedAttendanceClass?.students || [];
  }, [attendanceClassStudents, selectedAttendanceClass?.students, existingAttendanceData]);

  // 숙제 모달 상태
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [selectedHomeworkClass, setSelectedHomeworkClass] = useState<{
    classId: string;
    className: string;
    range: string;
    students: HomeworkStudent[];
  } | null>(null);

  // Phase 7-3: 숙제 저장 mutation & 실제 데이터
  const saveHomeworkSubmissions = useSaveHomeworkSubmissions();
  // 이전 날짜의 숙제를 확인 (오늘 숙제 확인은 어제 배정된 숙제)
  const prevDateStr = useMemo(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    return prev.toISOString().split('T')[0];
  }, [selectedDate]);
  const { data: homeworkData } = useHomeworkByDate(selectedHomeworkClass?.classId || null, prevDateStr);

  // Phase 7-4: 성적 저장 mutation
  const saveExamScores = useSaveExamScores();

  // 오늘 수업 유무는 realClassSchedules로 자동 판단

  // 이전/다음 날짜 정보 계산
  const prevDayInfo = useMemo(() => {
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const key = formatDateKey(prevDate);
    // Supabase에서 가져온 실제 데이터 사용
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
    // Supabase에서 가져온 실제 데이터 사용
    const classCount = realClassesByDate?.[key]?.length ?? 0;
    return {
      date: formatDateLabel(nextDate),
      dayOfWeek: DAY_NAMES[nextDate.getDay()],
      classCount,
    };
  }, [selectedDate, realClassesByDate]);

  // 날짜 이동 핸들러 (애니메이션 포함)
  const handlePrevDay = () => {
    if (isTransitioning) return;

    // 1. 애니메이션 시작 (오른쪽으로 밀려남)
    setTransitionDirection('right');
    setIsTransitioning(true);

    // 2. 애니메이션 중간에 데이터 변경
    setTimeout(() => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
      setCarouselStartPosition('last'); // 이전 날짜 → 마지막 수업부터
    }, 150);

    // 3. 애니메이션 종료
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  const handleNextDay = () => {
    if (isTransitioning) return;

    // 1. 애니메이션 시작 (왼쪽으로 밀려남)
    setTransitionDirection('left');
    setIsTransitioning(true);

    // 2. 애니메이션 중간에 데이터 변경
    setTimeout(() => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
      setCarouselStartPosition('first'); // 다음 날짜 → 첫 수업부터
    }, 150);

    // 3. 애니메이션 종료
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  };

  // TaskBadgeCard 핸들러들
  const handleNoticeRead = (id: string) => {
    // 공지 읽음 처리는 Supabase에서 관리
    console.log('공지 읽음:', id);
  };

  const handleAttendanceCheck = (id: string) => {
    // 출결 모달 열기 - computedAttendances에서 찾기
    const attendance = computedAttendances?.find((a) => a.id === id);

    if (attendance) {
      setSelectedAttendanceClass({
        classId: id,
        className: attendance.className,
        time: attendance.time,
        students: [], // 실제 학생은 useClassWithStudents에서 로드
      });
      setAttendanceModalOpen(true);
    }
  };

  const handleProgressRecord = (id: string) => {
    // 진도 기록 모달 열기
    setSelectedClassId(id);
    setProgressModalOpen(true);
  };

  const handleHomeworkCheck = (id: string) => {
    // 숙제 모달 열기 - computedHomeworks에서 찾기
    const homework = computedHomeworks?.find((h) => h.id === id);

    if (homework) {
      setSelectedHomeworkClass({
        classId: id,
        className: homework.className,
        range: homework.range || '',
        students: [], // 실제 학생은 useHomeworkByDate에서 로드
      });
      setHomeworkModalOpen(true);
    }
  };

  const handleSaveProgress = () => {
    // 진도 저장 후 모달 닫기
    setProgressModalOpen(false);
  };

  // 출결 저장 핸들러 (Phase 7-1: Supabase 연결)
  const handleSaveAttendance = async (students: AttendanceStudent[]) => {
    console.log('출결 저장:', students);

    if (selectedAttendanceClass) {
      const { classId } = selectedAttendanceClass;
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Phase 7-1: 실제 학생 데이터가 있으면 Supabase에 저장
      // 타입 단언
      interface ClassEnrollmentsData {
        enrollments?: { student: { id: string; name: string } | null }[];
      }
      const typedClassData = attendanceClassStudents as unknown as ClassEnrollmentsData | null;

      if (typedClassData?.enrollments && typedClassData.enrollments.length > 0) {
        try {
          const enrollments = typedClassData.enrollments;

          const records = students
            .map((s) => {
              // 이름으로 매칭하여 실제 student_id 찾기
              const enrollment = enrollments.find(
                (e) => e.student?.name === s.name
              );
              if (!enrollment?.student || !s.status) return null;

              // note 필드에 사유 저장 (기타 사유 포함)
              const noteValue = s.customReason || s.reason || undefined;

              return {
                class_id: classId,
                student_id: enrollment.student.id,
                date: dateStr,
                status: s.status,
                note: noteValue,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

          if (records.length > 0) {
            await saveAttendance.mutateAsync(records);
            console.log('Supabase 출결 저장 완료:', records.length, '건');
          }
        } catch (error) {
          console.error('Supabase 출결 저장 실패:', error);
          // 에러 발생 시에도 UI는 업데이트
        }
      } else {
        console.log('Mock 모드 - Supabase 저장 건너뜀');
      }
    }
  };

  // 숙제 저장 핸들러 (Phase 7-3: Supabase 연결)
  const handleSaveHomework = async (students: HomeworkStudent[]) => {
    console.log('숙제 저장:', students);

    if (selectedHomeworkClass) {
      // Phase 7-3: homework 데이터가 있으면 Supabase에 저장
      // 타입 단언
      interface HomeworkWithSubmissions {
        id: string;
        submissions?: { student: { id: string; name: string } | null }[];
      }
      const typedHomework = homeworkData as unknown as HomeworkWithSubmissions | null;

      if (typedHomework && typedHomework.id) {
        try {
          const submissions = typedHomework.submissions || [];

          const records = students
            .map((s) => {
              // 이름으로 매칭하여 실제 student_id 찾기
              const submission = submissions.find(
                (sub) => sub.student?.name === s.name
              );
              // submission이 있으면 기존 student_id 사용, 없으면 건너뜀
              const studentId = submission?.student?.id;
              if (!studentId) return null;

              return {
                homework_id: typedHomework.id,
                student_id: studentId,
                status: s.submitted ? 'submitted' as const : 'pending' as const,
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

          if (records.length > 0) {
            await saveHomeworkSubmissions.mutateAsync(records);
            console.log('Supabase 숙제 제출 저장 완료:', records.length, '건');
          }
        } catch (error) {
          console.error('Supabase 숙제 제출 저장 실패:', error);
        }
      } else {
        console.log('Mock 모드 또는 숙제 데이터 없음 - Supabase 저장 건너뜀');
      }
    }
  };

  // 시험 저장 핸들러 (Phase 7-4: Supabase 연결)
  const handleSaveTest = async (testData: Omit<TestRecord, 'id' | 'createdAt'>) => {
    console.log('시험 저장:', testData);

    // Phase 7-4: Supabase에 성적 저장
    // attendanceClassStudents에서 실제 학생 ID 가져오기
    // 타입 단언
    interface TestClassData {
      enrollments?: { student: { id: string; name: string } | null }[];
    }
    const typedTestClassData = attendanceClassStudents as unknown as TestClassData | null;

    if (typedTestClassData?.enrollments && testData.classId) {
      try {
        const enrollments = typedTestClassData.enrollments;

        const records = testData.scores
          .filter((s) => s.score !== null)
          .map((s) => {
            // 이름으로 매칭하여 실제 student_id 찾기
            const enrollment = enrollments.find(
              (e) => e.student?.name === s.studentName
            );
            if (!enrollment?.student) return null;

            return {
              class_id: testData.classId,
              student_id: enrollment.student.id,
              exam_type: testData.testType as 'daily' | 'weekly' | 'monthly' | 'school_midterm_1' | 'school_final_1' | 'school_midterm_2' | 'school_final_2' | 'other',
              exam_date: testData.date,
              exam_name: testData.range || `${testData.testType} 테스트`,
              total_questions: testData.totalScore,
              manual_score: s.score ?? undefined,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (records.length > 0) {
          await saveExamScores.mutateAsync(records);
          console.log('Supabase 성적 저장 완료:', records.length, '건');
        }
      } catch (error) {
        console.error('Supabase 성적 저장 실패:', error);
      }
    } else {
      console.log('Mock 모드 - Supabase 저장 건너뜀');
    }

    // 로컬 스토어에도 저장 (항상 실행)
    testStore.addRecord(testData);
  };

  // HeroCarousel 핸들러 - 출결 모달 열기 (Phase 7-1: classId 포함)
  const handleAttendance = (classId: string) => {
    // classesData(전체 반) > realClassSchedules(오늘 반) 순으로 찾기
    const dbCls = classesData?.find((c) => c.id === classId);
    const realCls = realClassSchedules?.find((c) => c.id === classId);

    // DB 데이터 우선, 없으면 realClassSchedules
    let cls: { id: string; name: string; startTime: string; endTime: string } | null = null;
    if (dbCls) {
      cls = {
        id: dbCls.id,
        name: dbCls.name,
        startTime: dbCls.start_time?.slice(0, 5) || '00:00',
        endTime: dbCls.end_time?.slice(0, 5) || '00:00',
      };
    } else if (realCls) {
      cls = realCls;
    }

    console.log('[handleAttendance] classId:', classId, 'found:', !!cls, 'dbCls:', !!dbCls);

    if (cls) {
      // 시간 문자열 생성
      const timeStr = `${cls.startTime}-${cls.endTime}`;
      setSelectedAttendanceClass({
        classId, // Supabase UUID
        className: cls.name,
        time: timeStr,
        students: [], // 실제 학생 데이터는 useClassWithStudents에서 로드
      });
      setAttendanceModalOpen(true);
    }
  };

  const handleProgress = (classId: string) => {
    setSelectedClassId(classId);
    setProgressModalOpen(true);
  };

  // 선택된 수업 정보 (모달용)
  // Phase 310-B: classesData(전체 반) > realClassSchedules(오늘 반) > mock 순으로 찾기
  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;

    // 1. classesData에서 찾기 (Supabase UUID 매칭, 전체 반)
    if (classesData) {
      const fromDB = classesData.find((c) => c.id === selectedClassId);
      if (fromDB) {
        return {
          id: fromDB.id,
          name: fromDB.name,
          // subjects 조인 데이터에서 과목 이름 가져오기
          subject: (fromDB as { subjects?: { name?: string } }).subjects?.name || fromDB.subject || '수학',
          studentCount: fromDB.student_count || 0,
          startTime: fromDB.start_time?.slice(0, 5) || '00:00',
          endTime: fromDB.end_time?.slice(0, 5) || '00:00',
          status: 'upcoming' as const,
        };
      }
    }

    // 2. realClassSchedules에서 찾기 (오늘 날짜 반)
    if (realClassSchedules) {
      const fromReal = realClassSchedules.find((c) => c.id === selectedClassId);
      if (fromReal) return fromReal;
    }

    // 3. 데이터 없음
    return undefined;
  }, [selectedClassId, classesData, realClassSchedules]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 헤더 - Safe Area 자동 대응 */}
      <header className="bg-white border-b border-[#F2F4F6] px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#3182F6]">혜윰학원</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Stage 29: 관리자/원장만 역할 토글 표시 */}
          {!isActualTeacher && <RoleToggle className="mr-2" />}
          <span className="text-sm font-medium text-gray-700">{teacherName} 선생님</span>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <UserIcon className="text-blue-500" size={18} />
          </div>
        </div>
      </header>

      {/* 콘텐츠 - 태블릿/모바일 분기 */}
      {isTablet ? (
        /* 태블릿 레이아웃 */
        <TabletDashboard
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          classesByDate={realClassesByDate || {}}
          noticesByDate={realNoticesByDate || {}}
          attendanceIssuesByDate={realAttendanceIssuesByDate || {}}
          onAttendance={handleAttendance}
          onProgress={handleProgress}
          onNoticeClick={(id) => console.log('공지 클릭:', id)}
          onAttendanceIssueClick={(id) => console.log('출결 이슈 클릭:', id)}
          classScheduleDates={realClassScheduleDates || []}
          holidayStatusByDate={monthHolidayStatus || {}}
        />
      ) : (
        /* 모바일 레이아웃 */
        <main className="p-4 pb-20 space-y-4">
          {/* 1. 날짜 선택 (주간 드롭다운) */}
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onOpenMonthly={() => setMonthlyModalOpen(true)}
            classScheduleDates={realClassScheduleDates || []}
            noticesByDate={realNoticesByDate || {}}
            holidayStatusByDate={monthHolidayStatus || {}}
          />

          {/* 2. 히어로 카드 - Stage 30: 휴강일 체크 추가 */}
          {classesLoading || holidayLoading ? (
            <div className="rounded-2xl p-5 bg-gray-100 animate-pulse h-[200px]" />
          ) : holidayStatus?.isHoliday && holidayStatus.holidayName ? (
            /* Stage 30: 휴강일이면 HolidayHeroCard 표시 */
            <HolidayHeroCard
              holidayName={holidayStatus.holidayName}
              date={selectedDate}
            />
          ) : (
            <div className="overflow-hidden">
              <div
                className={`transition-all duration-300 ease-out ${
                  isTransitioning
                    ? transitionDirection === 'left'
                      ? '-translate-x-4 opacity-0'
                      : 'translate-x-4 opacity-0'
                    : 'translate-x-0 opacity-100'
                }`}
              >
                <HeroCarousel
                  classes={realClassSchedules || []}
                  onAttendance={handleAttendance}
                  onProgress={handleProgress}
                  prevDay={prevDayInfo}
                  nextDay={nextDayInfo}
                  onPrevDay={handlePrevDay}
                  onNextDay={handleNextDay}
                  startPosition={carouselStartPosition}
                />
            </div>
          </div>
        )}

          {/* 3. 통합 업무 뱃지 카드 - Phase 2-B: 실제 데이터 우선 사용 */}
          {isTaskDataLoading ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 h-12 bg-gray-100 rounded-xl" />
                ))}
              </div>
              <div className="mt-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ) : (
            <TaskBadgeCard
              notices={realNotices || []}
              attendances={computedAttendances || []}
              progresses={computedProgresses || []}
              homeworks={computedHomeworks || []}
              onNoticeRead={handleNoticeRead}
              onAttendanceCheck={handleAttendanceCheck}
              onProgressRecord={handleProgressRecord}
              onHomeworkCheck={handleHomeworkCheck}
            />
          )}
        </main>
      )}

      {/* 하단 네비게이션 */}
      <BottomNav />

      {/* 월간 캘린더 모달 */}
      <MonthlyCalendarModal
        isOpen={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        classScheduleDates={realClassScheduleDates || []}
        noticesByDate={realNoticesByDate || {}}
      />

      {/* 진도 모달 */}
      <ProgressModal
        isOpen={progressModalOpen}
        onClose={() => setProgressModalOpen(false)}
        classInfo={{
          id: selectedClass?.id,
          name: selectedClass?.name || '',
          subject: selectedClass?.subject,
          studentCount: selectedClass?.studentCount,
          startTime: selectedClass?.startTime,
        }}
        students={[]}
        // Stage 48: lastProgress, todayProgress는 이제 ProgressModal 내부에서 직접 조회
        // (스와이프 후 진도 데이터 중복 버그 수정)
        selectedDate={selectedDate}
        onSave={(data) => {
          // Phase 310-B: 선택된 날짜로 Supabase에 저장
          if (selectedClassId) {
            saveProgress.mutate({
              class_id: selectedClassId,
              date: selectedDate.toISOString().split('T')[0],
              textbook: data.textbook,
              pages: `${data.startPage}-${data.endPage}`,
              topic: data.topic,
              notes: data.notes,
            });
          }
          // 모달 닫기
          handleSaveProgress();
        }}
        onSaveTest={handleSaveTest}
        textbooks={textbooks || []}
      />

      {/* 출결 모달 - Phase 7-1: 실제 학생 데이터 우선 사용 */}
      {selectedAttendanceClass && (
        <AttendanceModal
          isOpen={attendanceModalOpen}
          onClose={() => setAttendanceModalOpen(false)}
          className={selectedAttendanceClass.className}
          time={selectedAttendanceClass.time}
          students={attendanceModalStudents}
          onSave={handleSaveAttendance}
        />
      )}

      {/* 숙제 모달 */}
      {selectedHomeworkClass && (
        <HomeworkModal
          isOpen={homeworkModalOpen}
          onClose={() => setHomeworkModalOpen(false)}
          className={selectedHomeworkClass.className}
          range={selectedHomeworkClass.range}
          students={selectedHomeworkClass.students}
          onSave={handleSaveHomework}
        />
      )}
    </div>
  );
}

export default BackofficeDemo;
