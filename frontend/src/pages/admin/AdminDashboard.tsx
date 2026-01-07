/**
 * Phase 10: AdminDashboard (v5 레이아웃)
 *
 * 관리자 메인 대시보드
 * - v5 디자인: 상단 네비게이션 + 접을 수 있는 우측 사이드바
 * - 전역 과목 필터 적용 (헤더의 SubjectSelector 사용)
 * - 오늘 수업 일정 카드 그리드 (캘린더 스타일)
 *
 * Stage 13: 주간 캘린더 추가
 * - 날짜 선택 시 해당 일자 데이터 표시
 * - 공지사항 표시 (PC: 텍스트)
 *
 * Stage 14: 순환수업 대시보드 통합
 * - 정규 수업과 순환수업 통합 표시
 * - 순환수업 시각적 구분 (보라색 배경)
 *
 * Stage 15: 캘린더 스타일 카드 그리드
 * - "현재 진행 중" 섹션 제거
 * - 수업 카드에 지난 진도/숙제, 오늘 진도/숙제, 메모 표시
 * - 영역 분리형 디자인 (회색: 지난 수업, 파랑: 오늘 수업)
 * - 시간대별 그룹핑 + 레벨별 정렬 (심화 → 정규 → 기초)
 * - Supabase 실제 데이터 연동
 *
 * Stage 19: 관리자 진도/숙제 모달 통합
 * - 반 카드 클릭 시 강사용 ProgressModal 표시
 * - 관리자는 수정 가능
 *
 * Supabase 연동: 2024-12-14, 2025-12-21 (시간대별 그룹핑)
 */
import { useState, useMemo } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { WeeklyCalendar, TimeSlotGroupList } from '../../components/admin/dashboard';
import { useClassScheduleDetails } from '../../hooks/useAdminData';
import { useRotationSchedules, useRotationScheduleDetail } from '../../hooks/useRotation';
import { getRotationForDate } from '../../utils/rotationUtils';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useSubjectStore, SUBJECT_LABELS } from '../../stores/subjectStore';
import { formatDateKey } from '../../utils/weekUtils';
import { Calendar, PartyPopper } from 'lucide-react';
import { useHolidayStatus, getHolidayEmoji } from '../../hooks/useHolidays';
import type { TimeSlotGroup, ClassScheduleDetail } from '../../types/admin';
import { extractLevel, LEVEL_ORDER } from '../../types/admin';
// Stage 35: viewMode 연동
import { useViewModeStore } from '../../stores/viewModeStore';
import { useAuth } from '../../contexts/AuthContext';
// Stage 35-수정: 강사 모드 순환수업 담당 반 표시용
import { useClasses } from '../../hooks/useClasses';

// 강사용 모달 import
import { ProgressModal, AttendanceModal, HomeworkModal } from '../../components/backoffice/modals';
import type { AttendanceStudent, HomeworkStudent } from '../../components/backoffice/modals';
import {
  useTextbooks,
  useSaveProgress,
  // Stage 48: useLastProgressBefore, useProgressByDate는 ProgressModal 내부로 이동
  useClassWithStudents,
  useSaveAttendance,
  useSaveHomeworkSubmissions,
  useHomeworkByDate,
  useSaveExamScores,
  useAttendanceByClassAndDate,
} from '../../hooks/useBackofficeData';
import { useTestStore } from '../../stores/testStore';
import type { TestRecord } from '../../types/test';

// ============================================
// Mock Data 제거 - Supabase 실제 데이터 사용
// ============================================

export default function AdminDashboard() {
  // 선택된 날짜 상태 (Stage 13)
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));

  // 전역 과목 필터 사용
  const { subject: globalSubject } = useSubjectStore();

  // Stage 35: viewMode 연동 - 강사 모드일 때 본인 수업만 표시
  const { viewMode } = useViewModeStore();
  const { user } = useAuth();
  const isTeacherMode = viewMode === 'teacher';
  const teacherIdForFilter = isTeacherMode ? user?.id : undefined;

  // 선택된 날짜가 오늘인지 확인
  const isToday = selectedDate === formatDateKey(new Date());

  // Stage 30: 휴강일 여부 확인
  const { data: holidayStatus, isLoading: holidayLoading } = useHolidayStatus(selectedDate);

  // Stage 15: 시간대별 그룹핑된 수업 데이터 조회 (Supabase 연동)
  // Stage 20: 전역 과목 필터 적용
  // Stage 35: 강사 모드일 때 본인 수업만 조회
  const { data: regularTimeSlotGroups, isLoading: groupsLoading } = useClassScheduleDetails(selectedDate, globalSubject, teacherIdForFilter);

  // Stage 35-수정: 순환수업에서 개별 반 표시용
  // 강사 모드: 본인 담당 반만 / 관리자 모드: 전체 반
  const { data: allClassesData } = useClasses({
    status: 'active',
    teacherId: isTeacherMode ? user?.id : undefined,
  });

  // Stage 20: 순환수업 조회 및 통합
  const [year, month, day] = selectedDate.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const targetDow = targetDate.getDay();

  const { data: rotationSchedules, isLoading: rotationLoading } = useRotationSchedules();

  // 선택된 요일에 해당하는 활성 순환수업 필터
  const targetRotationSchedules = useMemo(() => {
    return rotationSchedules?.filter(
      (s) => s.day_of_week === targetDow && s.is_active
    ) || [];
  }, [rotationSchedules, targetDow]);

  // 첫 번째 순환수업의 상세 정보 조회
  const firstScheduleId = targetRotationSchedules.length > 0 ? targetRotationSchedules[0].id : null;
  const { data: rotationDetail } = useRotationScheduleDetail(firstScheduleId);

  // 현재 시간 (상태 계산용)
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 정규 수업 + 순환수업 통합
  const timeSlotGroups = useMemo((): TimeSlotGroup[] => {
    const regularGroups = regularTimeSlotGroups || [];

    // 순환수업이 없으면 정규 수업만 반환
    if (targetRotationSchedules.length === 0) {
      return regularGroups;
    }

    // 순환수업을 ClassScheduleDetail로 변환
    const rotationClasses: ClassScheduleDetail[] = [];

    targetRotationSchedules.forEach((schedule) => {
      const detail = schedule.id === firstScheduleId ? rotationDetail : null;

      // 선택된 날짜의 순환수업 활동 계산
      const activity = detail
        ? getRotationForDate(targetDate, detail.schedule, detail.patterns, detail.exceptions)
        : null;

      // 휴일인 경우 스킵 (또는 휴일로 표시)
      if (activity?.isHoliday) {
        return;
      }

      // 과목 필터 적용
      const activities = activity?.activities || [];

      // 활동 유형에 따라 필터링
      let filteredActivities = activities;
      if (globalSubject && globalSubject !== 'all') {
        filteredActivities = activities.filter((act) => {
          if (globalSubject === 'math') {
            return act.activityType === 'math_class' || act.activityType === 'math_test';
          } else if (globalSubject === 'english') {
            return act.activityType === 'english_class';
          }
          return false;
        });
      }

      // 필터링 결과가 없으면 스킵
      if (globalSubject !== 'all' && filteredActivities.length === 0) {
        return;
      }

      const startTime = schedule.start_time?.slice(0, 5) || '00:00';
      const endTime = schedule.end_time?.slice(0, 5) || '00:00';
      const isCurrent = isToday && startTime <= currentTime && currentTime <= endTime;

      // Stage 35-수정: 순환수업 학년에 해당하는 반을 개별 표시 (강사/관리자 모두)
      if (allClassesData && allClassesData.length > 0) {
        // 순환수업에 포함된 학년들
        const rotationGradeNames = filteredActivities.map((a) => a.gradeName);
        const weekNumber = activity?.weekNumber || 1;

        // 해당 학년의 반들 찾기
        const rotationMatchedClasses = allClassesData.filter((cls) => {
          // grades 조인 데이터 또는 반 이름에서 학년 추출
          const gradeData = (cls as { grades?: { name?: string } }).grades;
          let gradeName: string | undefined = gradeData?.name;
          if (!gradeName) {
            // 반 이름에서 학년 추출 (예: "중1 수학 심화반" → "중1")
            const match = cls.name.match(/^(중[123]|고[123]|초[3-6])/);
            gradeName = match ? match[1] : undefined;
          }
          return gradeName && rotationGradeNames.includes(gradeName);
        });

        // 해당 반들을 개별 항목으로 추가 (출석/진도 기록 가능)
        rotationMatchedClasses.forEach((cls) => {
          // 담당 강사 이름 가져오기
          const teacherData = (cls as { teacher?: { name?: string } }).teacher;
          const teacherName = teacherData?.name || '미배정';

          rotationClasses.push({
            id: cls.id, // 실제 반 ID 사용 (출석/진도 모달에서 사용)
            name: cls.name,
            teacherName: teacherName,
            studentCount: cls.student_count || 0,
            level: extractLevel(cls.name),
            startTime,
            endTime,
            isCurrent,
            memo: `순환 ${weekNumber}주차`,
          });
        });
      }
    });

    // 순환수업이 없으면 정규 수업만 반환
    if (rotationClasses.length === 0) {
      return regularGroups;
    }

    // 정규 수업 그룹에 순환수업 추가
    const allGroups = [...regularGroups];

    // 순환수업을 시간대에 맞춰 추가
    rotationClasses.forEach((rotCls) => {
      const timeSlotKey = `${rotCls.startTime} ~ ${rotCls.endTime}`;
      const existingGroup = allGroups.find((g) => g.timeSlot === timeSlotKey);

      if (existingGroup) {
        // 기존 그룹에 추가
        existingGroup.classes.push(rotCls);
        existingGroup.classCount++;
        // 레벨순 재정렬
        existingGroup.classes.sort((a, b) => {
          const levelDiff = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
          if (levelDiff !== 0) return levelDiff;
          return a.name.localeCompare(b.name, 'ko');
        });
      } else {
        // 새 그룹 생성
        allGroups.push({
          timeSlot: timeSlotKey,
          startTime: rotCls.startTime,
          classCount: 1,
          classes: [rotCls],
        });
      }
    });

    // 시간순 정렬
    return allGroups.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [regularTimeSlotGroups, targetRotationSchedules, rotationDetail, firstScheduleId, targetDate, globalSubject, isToday, currentTime, allClassesData]);

  // 총 수업 수 계산
  const totalClassCount = useMemo(() => {
    if (!timeSlotGroups) return 0;
    return timeSlotGroups.reduce((sum, group) => sum + group.classCount, 0);
  }, [timeSlotGroups]);

  // 선택된 날짜 표시 텍스트
  const selectedDateText = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }, [selectedDate]);

  // =====================================================
  // Stage 19: 모달 상태 및 훅
  // =====================================================
  const testStore = useTestStore();

  // 진도 모달 상태
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // 출결 모달 상태
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<{
    classId: string;
    className: string;
    time: string;
  } | null>(null);

  // 숙제 모달 상태
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [selectedHomeworkClass, setSelectedHomeworkClass] = useState<{
    classId: string;
    className: string;
    range: string;
  } | null>(null);

  // 선택된 수업 정보 찾기 (timeSlotGroups에서)
  const selectedClass = useMemo((): ClassScheduleDetail | null => {
    if (!selectedClassId || !timeSlotGroups) return null;
    for (const group of timeSlotGroups) {
      const found = group.classes.find((c) => c.id === selectedClassId);
      if (found) return found;
    }
    return null;
  }, [selectedClassId, timeSlotGroups]);

  // 교재 자동완성
  const { data: textbooks } = useTextbooks(selectedClassId || undefined);
  const saveProgress = useSaveProgress();

  // Stage 48: 진도 조회는 ProgressModal 내부에서 수행
  // useLastProgressBefore, useProgressByDate 제거됨

  // 학생 목록 조회
  const { data: classStudentsData } = useClassWithStudents(selectedClassId);

  // 출결 저장
  const saveAttendance = useSaveAttendance();

  // 출결 모달용: 기존 출결 데이터 로드
  const { data: existingAttendanceData } = useAttendanceByClassAndDate(
    selectedAttendanceClass?.classId || null,
    selectedDate
  );

  // 숙제 저장
  const prevDateStr = useMemo(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const prev = new Date(year, month - 1, day);
    prev.setDate(prev.getDate() - 1);
    return formatDateKey(prev);
  }, [selectedDate]);
  const { data: homeworkData } = useHomeworkByDate(selectedHomeworkClass?.classId || null, prevDateStr);
  const saveHomeworkSubmissions = useSaveHomeworkSubmissions();

  // 성적 저장
  const saveExamScores = useSaveExamScores();

  // 학생 목록 (모달용)
  const modalStudents = useMemo(() => {
    interface ClassWithEnrollments {
      enrollments?: { student: { id: string; name: string } | null }[];
    }
    const typedData = classStudentsData as unknown as ClassWithEnrollments | null;
    if (typedData?.enrollments) {
      return typedData.enrollments
        .filter((e) => e.student !== null)
        .map((e) => ({ id: e.student!.id, name: e.student!.name }));
    }
    return [];
  }, [classStudentsData]);

  // 출결 학생 목록 (기존 출결 데이터 병합)
  const attendanceStudents: AttendanceStudent[] = useMemo(() => {
    // 기존 출결 데이터를 Map으로 변환
    const existingMap = new Map<string, { status: string; note: string | null }>();
    if (existingAttendanceData) {
      existingAttendanceData.forEach((att) => {
        existingMap.set(att.student_id, { status: att.status, note: att.note });
      });
    }

    return modalStudents.map((s) => {
      const existing = existingMap.get(s.id);
      if (existing) {
        // DB status를 모달 status로 변환
        let modalStatus: 'present' | 'late' | 'absent' | null = null;
        if (existing.status === 'present') modalStatus = 'present';
        else if (existing.status === 'late' || existing.status === 'early_leave') modalStatus = 'late';
        else if (existing.status === 'absent' || existing.status === 'excused') modalStatus = 'absent';

        return {
          ...s,
          status: modalStatus,
          reason: existing.note || undefined,
        };
      }
      return { ...s, status: null };
    });
  }, [modalStudents, existingAttendanceData]);

  // 카드 클릭 핸들러 - 진도 모달 열기
  const handleCardClick = (classId: string) => {
    setSelectedClassId(classId);
    setProgressModalOpen(true);
  };

  // 진도 저장 핸들러
  const handleSaveProgress = (data: {
    topic: string;
    textbook: string;
    startPage: string;
    endPage: string;
    homeworkTextbook: string;
    homeworkStartPage: string;
    homeworkEndPage: string;
    notes: string;
  }) => {
    // Stage 50: pages → startPage, endPage 분리 (Supabase 스키마 일치)
    if (selectedClassId) {
      saveProgress.mutate({
        class_id: selectedClassId,
        date: selectedDate,
        textbook: data.textbook,
        startPage: data.startPage,
        endPage: data.endPage,
        topic: data.topic,
        notes: data.notes,
      });
    }
    setProgressModalOpen(false);
  };

  // 시험 저장 핸들러
  const handleSaveTest = async (testData: Omit<TestRecord, 'id' | 'createdAt'>) => {
    interface ClassEnrollmentsData {
      enrollments?: { student: { id: string; name: string } | null }[];
    }
    const typedClassData = classStudentsData as unknown as ClassEnrollmentsData | null;

    if (typedClassData?.enrollments && testData.classId) {
      try {
        const enrollments = typedClassData.enrollments;
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

        if (records.length > 0) {
          await saveExamScores.mutateAsync(records);
        }
      } catch (error) {
        console.error('성적 저장 실패:', error);
      }
    }
    testStore.addRecord(testData);
  };

  // 출결 저장 핸들러
  const handleSaveAttendance = async (students: AttendanceStudent[]) => {
    if (!selectedAttendanceClass) return;

    interface ClassEnrollmentsData {
      enrollments?: { student: { id: string; name: string } | null }[];
    }
    const typedData = classStudentsData as unknown as ClassEnrollmentsData | null;

    if (typedData?.enrollments) {
      try {
        const records = students
          .map((s) => {
            const enrollment = typedData.enrollments?.find((e) => e.student?.name === s.name);
            if (!enrollment?.student || !s.status) return null;
            return {
              class_id: selectedAttendanceClass.classId,
              student_id: enrollment.student.id,
              date: selectedDate,
              status: s.status,
              notes: s.customReason || s.reason || undefined,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (records.length > 0) {
          await saveAttendance.mutateAsync(records);
        }
      } catch (error) {
        console.error('출결 저장 실패:', error);
      }
    }
    setAttendanceModalOpen(false);
  };

  // 숙제 저장 핸들러
  const handleSaveHomework = async (students: HomeworkStudent[]) => {
    interface HomeworkWithSubmissions {
      id: string;
      submissions?: { student: { id: string; name: string } | null }[];
    }
    const typedHomework = homeworkData as unknown as HomeworkWithSubmissions | null;

    if (typedHomework?.id) {
      try {
        const records = students
          .map((s) => {
            const submission = typedHomework.submissions?.find((sub) => sub.student?.name === s.name);
            if (!submission?.student) return null;
            return {
              homework_id: typedHomework.id,
              student_id: submission.student.id,
              status: s.submitted ? ('submitted' as const) : ('pending' as const),
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (records.length > 0) {
          await saveHomeworkSubmissions.mutateAsync(records);
        }
      } catch (error) {
        console.error('숙제 저장 실패:', error);
      }
    }
    setHomeworkModalOpen(false);
  };

  return (
    <AdminLayoutV5>
      <div className="space-y-5">
        {/* Supabase 연결 상태 표시 */}
        {!isSupabaseConfigured && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-700">
            Supabase 미연결 - Mock 데이터 표시 중
          </div>
        )}

        {/* 주간 캘린더 (Stage 13) */}
        <WeeklyCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        {/* Stage 15: 수업 카드 그리드 (시간대별 그룹핑) */}
        {/* Stage 30: 휴강일 표시 */}
        {holidayStatus?.isHoliday && holidayStatus.holidayName && (
          <section className="bg-gradient-to-r from-grey-100 to-grey-50 rounded-2xl p-6 border border-grey-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-3xl">{getHolidayEmoji(holidayStatus.holidayName)}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <PartyPopper className="w-5 h-5 text-grey-500" />
                  <span className="text-lg font-bold text-grey-900">{holidayStatus.holidayName}</span>
                </div>
                <p className="text-sm text-grey-600">
                  {selectedDateText} · <span className="text-red-500 font-medium">휴강</span>
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-grey-50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-grey-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-grey-400" />
              {isToday ? '오늘' : selectedDateText.split(' ').slice(-2).join(' ')} 수업 일정
              {globalSubject !== 'all' && ` (${SUBJECT_LABELS[globalSubject]})`}
            </h3>
            <span className="text-sm text-grey-500">
              {selectedDateText} · 총 {totalClassCount}개 수업
            </span>
          </div>

          {/* 휴강일 안내 메시지 */}
          {holidayStatus?.isHoliday && !holidayLoading && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
              <span className="font-medium">{holidayStatus.holidayName}</span>
              <span>휴강일입니다. 수업이 없습니다.</span>
            </div>
          )}

          <TimeSlotGroupList
            groups={timeSlotGroups || []}
            isLoading={groupsLoading || rotationLoading || holidayLoading}
            onCardClick={handleCardClick}
          />
        </section>
      </div>

      {/* Stage 19: 진도 모달 (PC 중앙 모달) */}
      {/* Stage 48: lastProgress, todayProgress는 모달 내부에서 조회 */}
      {selectedClass && (
        <ProgressModal
          isOpen={progressModalOpen}
          onClose={() => {
            setProgressModalOpen(false);
            setSelectedClassId(null);
          }}
          classInfo={{
            id: selectedClass.id,
            name: selectedClass.name,
            startTime: selectedClass.startTime,
            studentCount: selectedClass.studentCount,
          }}
          students={modalStudents}
          textbooks={textbooks || []}
          selectedDate={(() => {
            const [y, m, d] = selectedDate.split('-').map(Number);
            return new Date(y, m - 1, d);
          })()}
          onSave={handleSaveProgress}
          onSaveTest={handleSaveTest}
          variant="center"
        />
      )}

      {/* Stage 19: 출결 모달 */}
      {selectedAttendanceClass && (
        <AttendanceModal
          isOpen={attendanceModalOpen}
          onClose={() => {
            setAttendanceModalOpen(false);
            setSelectedAttendanceClass(null);
          }}
          className={selectedAttendanceClass.className}
          time={selectedAttendanceClass.time}
          students={attendanceStudents}
          onSave={handleSaveAttendance}
        />
      )}

      {/* Stage 19: 숙제 모달 */}
      {selectedHomeworkClass && (
        <HomeworkModal
          isOpen={homeworkModalOpen}
          onClose={() => {
            setHomeworkModalOpen(false);
            setSelectedHomeworkClass(null);
          }}
          className={selectedHomeworkClass.className}
          range={selectedHomeworkClass.range}
          students={modalStudents.map((s) => ({ ...s, submitted: false }))}
          onSave={handleSaveHomework}
        />
      )}
    </AdminLayoutV5>
  );
}

// ============================================
// Sub Components (더 이상 사용하지 않음 - Stage 15에서 ClassCardGrid로 대체)
// ============================================

// 기존 ClassCard, OtherSubjectSummary, ScheduleRow, RotationClassChip 삭제
// → ClassCard, ClassCardGrid 컴포넌트로 대체
