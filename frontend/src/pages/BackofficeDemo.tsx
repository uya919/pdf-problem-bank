/**
 * BackofficeDemo - 백오피스 대시보드 데모 페이지
 *
 * Stage 54-A: 대형 파일 리팩토링 (1,133줄 → ~350줄)
 * - useBackofficeDashboardData: 데이터 계산 로직 분리
 * - useBackofficeModals: 모달 상태 관리 분리
 */
import { useState, useMemo, useCallback } from 'react';
import { UserIcon } from '../components/ui/Icons';
import {
  useClasses,
  useClassScheduleDates,
  useWeekClassesByDate,
  useWeekNoticesByDate,
  useWeekAttendanceIssuesByDate,
  useTextbooks,
  useSaveProgress,
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
} from '../hooks/useBackofficeData';
import { useIsTablet } from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import { useRotationSchedules, useRotationScheduleDetail } from '../hooks/useRotation';
import { useBackofficeDashboardData, formatDateKey } from '../hooks/useBackofficeDashboardData';
import {
  HeroCarousel,
  DateSelector,
  TaskBadgeCard,
  HolidayHeroCard,
} from '../components/backoffice/dashboard';
import { BottomNav } from '../components/backoffice/navigation';
import { TabletDashboard } from '../components/backoffice/tablet';
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

export function BackofficeDemo() {
  const testStore = useTestStore();
  const { user, role } = useAuth();
  const { viewMode } = useViewModeStore();

  // 강사/관리자 모드 결정
  const isActualTeacher = role === 'teacher';
  const isTeacherMode = isActualTeacher || viewMode === 'teacher';

  // 사용자 정보
  const teacherId = user?.id || '';
  const teacherName = (user?.user_metadata?.name as string) || (user?.email?.split('@')[0]) || '선생님';

  // 날짜 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateStr = formatDateKey(selectedDate);

  // 캐러셀 시작 위치 및 애니메이션 상태
  const [carouselStartPosition, setCarouselStartPosition] = useState<'first' | 'last'>('first');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('left');

  // 모달 상태
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<{
    classId: string;
    className: string;
    time: string;
    students: AttendanceStudent[];
  } | null>(null);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [selectedHomeworkClass, setSelectedHomeworkClass] = useState<{
    classId: string;
    className: string;
    range: string;
    students: HomeworkStudent[];
  } | null>(null);

  // 태블릿 감지
  const isTablet = useIsTablet();

  // ========== 데이터 훅 ==========

  // 반 목록
  const { data: classesData, isLoading: classesLoading } = useClasses({
    status: 'active',
    teacherId: isTeacherMode ? teacherId : undefined,
  });

  // 수업 날짜 (파란 점 표시용)
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
  const { data: realClassScheduleDates } = useClassScheduleDates(teacherId, scheduleStartDate, scheduleEndDate);

  // 휴강일 상태
  const { data: holidayStatus, isLoading: holidayLoading } = useHolidayStatus(selectedDateStr);
  const { data: monthHolidayStatus } = useMonthHolidayStatus(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );

  // 선택된 날짜 기반 데이터
  const { data: realAttendanceData, isLoading: attendanceLoading } = useAttendanceForTeacherByDate(teacherId, selectedDateStr);
  const { data: realProgressData, isLoading: progressLoading } = useProgressForTeacherByDate(teacherId, selectedDateStr);
  const { data: realHomeworkData, isLoading: homeworkLoading } = useHomeworkForTeacherByDate(teacherId, selectedDateStr);

  // 강사 담당 반 ID 목록
  const myClassIds = useMemo(() => {
    if (!isTeacherMode || !classesData) return undefined;
    return classesData.map((cls) => cls.id);
  }, [isTeacherMode, classesData]);
  const isMyClassIdsReady = !classesLoading && (isTeacherMode ? !!classesData : true);

  // 공지사항
  const { data: noticesData, isLoading: noticesLoading } = useNoticesByDate(
    selectedDateStr,
    myClassIds,
    { enabled: isMyClassIdsReady }
  );

  // 순환수업 데이터
  const { data: rotationSchedules } = useRotationSchedules();
  const activeRotationSchedule = rotationSchedules?.find((s) => s.is_active);
  const { data: rotationDetail } = useRotationScheduleDetail(activeRotationSchedule?.id || null);

  // 주간 데이터 (태블릿용)
  const weekDatesForHook = useMemo(() => {
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
  const weekStartDate = weekDatesForHook[0];
  const weekEndDate = weekDatesForHook[6];

  const { data: rawWeekClassesByDate } = useWeekClassesByDate(teacherId, weekDatesForHook);
  const { data: realNoticesByDate } = useWeekNoticesByDate(
    teacherId,
    weekStartDate,
    weekEndDate,
    myClassIds,
    { enabled: isMyClassIdsReady }
  );
  const { data: realAttendanceIssuesByDate } = useWeekAttendanceIssuesByDate(teacherId, weekStartDate, weekEndDate);

  // ========== 계산 로직 (useBackofficeDashboardData) ==========
  const {
    prevDayInfo,
    nextDayInfo,
    realClassSchedules,
    realClassesByDate,
    realNotices,
    computedAttendances,
    computedProgresses,
    computedHomeworks,
  } = useBackofficeDashboardData({
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
  });

  // ========== 모달 관련 훅 ==========
  const { data: textbooks } = useTextbooks(selectedClassId || undefined);
  const saveProgress = useSaveProgress();
  const saveAttendance = useSaveAttendance();
  const { data: attendanceClassStudents } = useClassWithStudents(selectedAttendanceClass?.classId || null);
  const { data: existingAttendanceData } = useAttendanceByClassAndDate(
    selectedAttendanceClass?.classId || null,
    selectedDateStr
  );

  const saveHomeworkSubmissions = useSaveHomeworkSubmissions();
  // Stage 59: 숙제 모달용 학생 데이터 조회 추가
  const { data: homeworkClassStudents } = useClassWithStudents(selectedHomeworkClass?.classId || null);
  const prevDateStr = useMemo(() => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    // Stage 59: UTC → Local 시간 기준 날짜 사용
    return formatDateKey(prev);
  }, [selectedDate]);
  const { data: homeworkData } = useHomeworkByDate(selectedHomeworkClass?.classId || null, prevDateStr);
  const saveExamScores = useSaveExamScores();

  // 출결 모달 학생 데이터
  const attendanceModalStudents: AttendanceStudent[] = useMemo(() => {
    interface EnrollmentWithStudent {
      id: string;
      student: { id: string; name: string; phone?: string } | null;
    }
    interface ClassWithEnrollments {
      enrollments?: EnrollmentWithStudent[];
    }
    const typedData = attendanceClassStudents as unknown as ClassWithEnrollments | null;

    const existingMap = new Map<string, { status: string; note: string | null }>();
    if (existingAttendanceData) {
      existingAttendanceData.forEach((att) => {
        existingMap.set(att.student_id, { status: att.status, note: att.note });
      });
    }

    if (typedData?.enrollments && typedData.enrollments.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const students = (typedData.enrollments as any[])
        .filter((e) => e.student !== null && e.student !== undefined)
        .map((e) => {
          const existing = existingMap.get(e.student.id);
          if (existing) {
            let modalStatus: AttendanceStatus = null;
            if (existing.status === 'present') modalStatus = 'present';
            else if (existing.status === 'late' || existing.status === 'early_leave') modalStatus = 'late';
            else if (existing.status === 'absent' || existing.status === 'excused') modalStatus = 'absent';

            return { id: e.student.id, name: e.student.name, status: modalStatus, reason: existing.note || undefined };
          }
          return { id: e.student.id, name: e.student.name, status: null as AttendanceStatus };
        });
      return students;
    }
    return selectedAttendanceClass?.students || [];
  }, [attendanceClassStudents, selectedAttendanceClass?.students, existingAttendanceData]);

  // Stage 59: 숙제 모달 학생 데이터
  const homeworkModalStudents: HomeworkStudent[] = useMemo(() => {
    interface EnrollmentWithStudent {
      id: string;
      student: { id: string; name: string } | null;
    }
    interface ClassWithEnrollments {
      enrollments?: EnrollmentWithStudent[];
    }
    const typedData = homeworkClassStudents as unknown as ClassWithEnrollments | null;

    // 기존 숙제 제출 데이터 매핑
    interface HomeworkWithSubmissions {
      submissions?: { student_id: string; status: string }[];
    }
    const typedHomework = homeworkData as unknown as HomeworkWithSubmissions | null;
    const submissionMap = new Map<string, boolean>();
    if (typedHomework?.submissions) {
      typedHomework.submissions.forEach((sub) => {
        submissionMap.set(sub.student_id, sub.status === 'submitted');
      });
    }

    if (typedData?.enrollments && typedData.enrollments.length > 0) {
      const students = typedData.enrollments
        .filter((e) => e.student !== null && e.student !== undefined)
        .map((e) => ({
          id: e.student!.id,
          name: e.student!.name,
          submitted: submissionMap.get(e.student!.id) ?? null,
        }));
      return students;
    }
    return [];
  }, [homeworkClassStudents, homeworkData]);

  // 선택된 수업 정보
  const selectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    if (classesData) {
      const fromDB = classesData.find((c) => c.id === selectedClassId);
      if (fromDB) {
        return {
          id: fromDB.id,
          name: fromDB.name,
          subject: (fromDB as { subjects?: { name?: string } }).subjects?.name || fromDB.subject || '수학',
          studentCount: fromDB.student_count || 0,
          startTime: fromDB.start_time?.slice(0, 5) || '00:00',
          endTime: fromDB.end_time?.slice(0, 5) || '00:00',
          status: 'upcoming' as const,
        };
      }
    }
    if (realClassSchedules) {
      const fromReal = realClassSchedules.find((c) => c.id === selectedClassId);
      if (fromReal) return fromReal;
    }
    return undefined;
  }, [selectedClassId, classesData, realClassSchedules]);

  // 로딩 상태
  const isTaskDataLoading = attendanceLoading || progressLoading || homeworkLoading || noticesLoading;

  // ========== 핸들러 ==========

  const handlePrevDay = useCallback(() => {
    if (isTransitioning) return;
    setTransitionDirection('right');
    setIsTransitioning(true);
    setTimeout(() => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
      setCarouselStartPosition('last');
    }, 150);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning, selectedDate]);

  const handleNextDay = useCallback(() => {
    if (isTransitioning) return;
    setTransitionDirection('left');
    setIsTransitioning(true);
    setTimeout(() => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
      setCarouselStartPosition('first');
    }, 150);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning, selectedDate]);

  const handleNoticeRead = useCallback((id: string) => console.log('공지 읽음:', id), []);

  const handleAttendanceCheck = useCallback((id: string) => {
    const attendance = computedAttendances?.find((a) => a.id === id);
    if (attendance) {
      setSelectedAttendanceClass({ classId: id, className: attendance.className, time: attendance.time, students: [] });
      setAttendanceModalOpen(true);
    }
  }, [computedAttendances]);

  const handleProgressRecord = useCallback((id: string) => {
    setSelectedClassId(id);
    setProgressModalOpen(true);
  }, []);

  const handleHomeworkCheck = useCallback((id: string) => {
    const homework = computedHomeworks?.find((h) => h.id === id);
    if (homework) {
      setSelectedHomeworkClass({ classId: id, className: homework.className, range: homework.range || '', students: [] });
      setHomeworkModalOpen(true);
    }
  }, [computedHomeworks]);

  const handleSaveProgress = useCallback(() => setProgressModalOpen(false), []);

  const handleAttendance = useCallback((classId: string) => {
    const dbCls = classesData?.find((c) => c.id === classId);
    const realCls = realClassSchedules?.find((c) => c.id === classId);
    let cls: { id: string; name: string; startTime: string; endTime: string } | null = null;
    if (dbCls) {
      cls = { id: dbCls.id, name: dbCls.name, startTime: dbCls.start_time?.slice(0, 5) || '00:00', endTime: dbCls.end_time?.slice(0, 5) || '00:00' };
    } else if (realCls) {
      cls = realCls;
    }
    if (cls) {
      setSelectedAttendanceClass({ classId, className: cls.name, time: `${cls.startTime}-${cls.endTime}`, students: [] });
      setAttendanceModalOpen(true);
    }
  }, [classesData, realClassSchedules]);

  const handleProgress = useCallback((classId: string) => {
    setSelectedClassId(classId);
    setProgressModalOpen(true);
  }, []);

  const handleSaveAttendance = useCallback(async (students: AttendanceStudent[]) => {
    if (selectedAttendanceClass) {
      const { classId } = selectedAttendanceClass;
      // Stage 59: UTC → Local 시간 기준 날짜 사용 (타임존 버그 수정)
      const dateStr = formatDateKey(selectedDate);
      interface ClassEnrollmentsData { enrollments?: { student: { id: string; name: string } | null }[]; }
      const typedClassData = attendanceClassStudents as unknown as ClassEnrollmentsData | null;

      if (typedClassData?.enrollments && typedClassData.enrollments.length > 0) {
        try {
          const enrollments = typedClassData.enrollments;
          const records = students
            .map((s) => {
              const enrollment = enrollments.find((e) => e.student?.name === s.name);
              if (!enrollment?.student || !s.status) return null;
              return { class_id: classId, student_id: enrollment.student.id, date: dateStr, status: s.status, note: s.customReason || s.reason || undefined };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);
          if (records.length > 0) await saveAttendance.mutateAsync(records);
        } catch (error) {
          console.error('Supabase 출결 저장 실패:', error);
        }
      }
    }
  }, [selectedAttendanceClass, selectedDate, attendanceClassStudents, saveAttendance]);

  const handleSaveHomework = useCallback(async (students: HomeworkStudent[]) => {
    if (selectedHomeworkClass) {
      interface HomeworkWithSubmissions { id: string; submissions?: { student: { id: string; name: string } | null }[]; }
      const typedHomework = homeworkData as unknown as HomeworkWithSubmissions | null;

      if (typedHomework && typedHomework.id) {
        try {
          const submissions = typedHomework.submissions || [];
          const records = students
            .map((s) => {
              const submission = submissions.find((sub) => sub.student?.name === s.name);
              const studentId = submission?.student?.id;
              if (!studentId) return null;
              return { homework_id: typedHomework.id, student_id: studentId, status: s.submitted ? 'submitted' as const : 'pending' as const };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);
          if (records.length > 0) await saveHomeworkSubmissions.mutateAsync(records);
        } catch (error) {
          console.error('Supabase 숙제 제출 저장 실패:', error);
        }
      }
    }
  }, [selectedHomeworkClass, homeworkData, saveHomeworkSubmissions]);

  const handleSaveTest = useCallback(async (testData: Omit<TestRecord, 'id' | 'createdAt'>) => {
    interface TestClassData { enrollments?: { student: { id: string; name: string } | null }[]; }
    const typedTestClassData = attendanceClassStudents as unknown as TestClassData | null;

    if (typedTestClassData?.enrollments && testData.classId) {
      try {
        const enrollments = typedTestClassData.enrollments;
        const records = testData.scores
          .filter((s) => s.score !== null)
          .map((s) => {
            const enrollment = enrollments.find((e) => e.student?.name === s.studentName);
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
        if (records.length > 0) await saveExamScores.mutateAsync(records);
      } catch (error) {
        console.error('Supabase 성적 저장 실패:', error);
      }
    }
    testStore.addRecord(testData);
  }, [attendanceClassStudents, saveExamScores, testStore]);

  // ========== JSX ==========
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* 헤더 */}
      <header className="bg-white border-b border-[#F2F4F6] px-4 py-3 flex items-center justify-between"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#3182F6]">혜윰학원</span>
        </div>
        <div className="flex items-center gap-2">
          {!isActualTeacher && <RoleToggle className="mr-2" />}
          <span className="text-sm font-medium text-gray-700">{teacherName} 선생님</span>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <UserIcon className="text-blue-500" size={18} />
          </div>
        </div>
      </header>

      {/* 콘텐츠 */}
      {isTablet ? (
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
        <main className="p-4 pb-20 space-y-4">
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onOpenMonthly={() => setMonthlyModalOpen(true)}
            classScheduleDates={realClassScheduleDates || []}
            noticesByDate={realNoticesByDate || {}}
            holidayStatusByDate={monthHolidayStatus || {}}
          />

          {classesLoading || holidayLoading ? (
            <div className="rounded-2xl p-5 bg-gray-100 animate-pulse h-[200px]" />
          ) : holidayStatus?.isHoliday && holidayStatus.holidayName ? (
            <HolidayHeroCard holidayName={holidayStatus.holidayName} date={selectedDate} />
          ) : (
            <div className="overflow-hidden">
              <div className={`transition-all duration-300 ease-out ${
                isTransitioning
                  ? transitionDirection === 'left' ? '-translate-x-4 opacity-0' : 'translate-x-4 opacity-0'
                  : 'translate-x-0 opacity-100'
              }`}>
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

          {isTaskDataLoading ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => <div key={i} className="flex-1 h-12 bg-gray-100 rounded-xl" />)}
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

      <BottomNav />

      {/* 모달들 */}
      <MonthlyCalendarModal
        isOpen={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        classScheduleDates={realClassScheduleDates || []}
        noticesByDate={realNoticesByDate || {}}
      />

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
        selectedDate={selectedDate}
        onSave={(data) => {
          if (selectedClassId) {
            // Stage 59: UTC → Local 시간 기준 날짜 사용 + 성공 시에만 모달 닫기
            saveProgress.mutate({
              class_id: selectedClassId,
              date: formatDateKey(selectedDate),
              textbook: data.textbook,
              startPage: data.startPage,
              endPage: data.endPage,
              topic: data.topic,
              notes: data.notes,
            }, {
              onSuccess: () => {
                handleSaveProgress();
              }
            });
          }
        }}
        onSaveTest={handleSaveTest}
        textbooks={textbooks || []}
      />

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

      {selectedHomeworkClass && (
        <HomeworkModal
          isOpen={homeworkModalOpen}
          onClose={() => setHomeworkModalOpen(false)}
          className={selectedHomeworkClass.className}
          range={selectedHomeworkClass.range}
          students={homeworkModalStudents}
          onSave={handleSaveHomework}
        />
      )}
    </div>
  );
}

export default BackofficeDemo;
