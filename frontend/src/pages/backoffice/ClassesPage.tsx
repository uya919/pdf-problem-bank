/**
 * ClassesPage v4 - 수업 페이지 (반응형)
 *
 * 목업: responsive-classes-page.html
 * 참조: 321, 322번 연구/개발 리포트
 *
 * 반응형 패턴:
 * - 모바일 (<768px): 반 탭 + 아코디언 섹션
 * - 태블릿 (≥768px): Master-Detail (반 목록 + 상세)
 *
 * Supabase 연결: Phase 4-A (2025-12-13)
 */
import { useState, useMemo, useEffect } from 'react';
import { useBreakpoint } from '../../hooks/useIsMobile';
import { MasterDetailLayout } from '../../components/responsive';
import { BottomNavBar } from './components/BottomNavBar';
import {
  ClassHeaderCard,
  AbsenceSection,
  ProgressTimelineSection,
  TestSection,
  StudentSection,
  PeriodType,
  AbsenceByDate,
  ProgressSession,
  TestData,
  Student,
} from '../../components/backoffice/classes';
import { DateRangeCalendarModal } from '../../components/backoffice/modals/DateRangeCalendarModal';
import { formatDateShort } from '../../utils/dateUtils';
import { useClasses, useClassWithStudents, useClassSessions } from '../../hooks/useBackofficeData';
import { useAuth } from '../../contexts/AuthContext';
import type { ClassSession as SupabaseClassSession } from '../../hooks/useBackofficeData';
import type { ClassWithDetails } from '../../types/database';

// =====================
// 헬퍼 함수
// =====================

/** 요일 숫자를 한글로 변환 */
const DAY_NAMES: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토'
};

/** day_of_week[] + start_time → "월/수 15:00" */
function formatSchedule(dayOfWeek: number[], startTime: string): string {
  if (!dayOfWeek || dayOfWeek.length === 0) return '';
  const days = dayOfWeek.map(d => DAY_NAMES[d] || '').filter(Boolean).join('/');
  const time = startTime?.slice(0, 5) || ''; // "15:00:00" → "15:00"
  return time ? `${days} ${time}` : days;
}

/** ClassWithDetails → ClassInfo 변환 */
function toClassInfo(cls: ClassWithDetails, students: Student[] = []): ClassInfo {
  return {
    id: cls.id,
    name: cls.name,
    subject: cls.subject || '',
    schedule: formatSchedule(cls.day_of_week || [], cls.start_time || ''),
    students,
  };
}

// =====================
// 타입 정의
// =====================

interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  schedule: string;
  students: Student[];
}

interface ClassSession {
  id: string;
  classId: string;
  date: string; // "2024-12-11"
  dateLabel: string; // "12/11 (수)"
  isToday?: boolean;
  absent: Array<{ id: string; name: string; reason?: string }>;
  progress: {
    chapter: string;
    textbook: string;
    pages: string;
    homework?: { range: string; submitted: number; total: number };
  };
  test?: {
    type: 'daily' | 'weekly' | 'monthly';
    range: string;
    totalScore: number;
    scores: Array<{ studentId: string; studentName: string; score: number }>;
  };
}

// Mock 데이터 제거됨 - Stage 38 (2026-01-04)
// 모든 데이터는 Supabase에서 조회

// =====================
// 메인 컴포넌트
// =====================

export default function ClassesPage() {
  const { isMobile, isTabletOrAbove } = useBreakpoint();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('2회');
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  // Stage 35-B: 로그인된 강사 ID 가져오기 (본인 반만 표시)
  const { profile } = useAuth();
  const teacherId = profile?.id || null;

  // =====================
  // Supabase 데이터 조회
  // =====================
  // Stage 35-B: 본인 담당 반만 조회 (teacherId 필터)
  const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({
    status: 'active',
    teacherId: teacherId || undefined,
  });
  const { data: selectedClassData } = useClassWithStudents(selectedClassId);

  // 세션 데이터 옵션 계산
  const sessionOptions = useMemo(() => {
    // 월간 + 커스텀 범위가 설정된 경우
    if (selectedPeriod === '월간' && customDateRange.start && customDateRange.end) {
      return {
        startDate: customDateRange.start.toISOString().split('T')[0],
        endDate: customDateRange.end.toISOString().split('T')[0],
      };
    }
    // 회차 기반
    const limitMap: Record<PeriodType, number> = {
      '2회': 2, '3회': 3, '5회': 5, '월간': 30
    };
    return { limit: limitMap[selectedPeriod] };
  }, [selectedPeriod, customDateRange]);

  const { data: supabaseSessions, isLoading: isLoadingSessions } = useClassSessions(
    selectedClassId,
    sessionOptions
  );

  // =====================
  // Supabase 데이터 변환 (Mock 제거)
  // =====================
  const classes: ClassInfo[] = useMemo(() => {
    if (supabaseClasses && supabaseClasses.length > 0) {
      return supabaseClasses.map(cls => toClassInfo(cls));
    }
    return [];
  }, [supabaseClasses]);

  // 선택된 반의 학생 목록 (Supabase 기반)
  const selectedClassStudents: Student[] = useMemo(() => {
    const classData = selectedClassData as {
      enrollments?: Array<{
        status: string;
        student: { id: string; name: string; grade?: string | null };
      }>;
    } | null;

    if (classData?.enrollments) {
      return classData.enrollments
        .filter(e => e.status === 'active')
        .map(e => ({
          id: e.student.id,
          name: e.student.name,
          grade: e.student.grade || '',
        }));
    }
    return [];
  }, [selectedClassData]);

  // 선택된 반 정보 (학생 포함)
  const selectedClass: ClassInfo | null = useMemo(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    if (!cls) return null;
    return { ...cls, students: selectedClassStudents };
  }, [classes, selectedClassId, selectedClassStudents]);

  // 초기 선택: 첫 번째 반
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // 기간에 따른 세션 필터링 (Supabase 기반, Mock 제거)
  const filteredSessions: ClassSession[] = useMemo(() => {
    // Supabase 데이터 사용 (이미 필터링됨)
    if (supabaseSessions && supabaseSessions.length > 0) {
      return supabaseSessions as ClassSession[];
    }
    // 데이터 없으면 빈 배열
    return [];
  }, [supabaseSessions]);

  // 날짜 범위 계산
  const dateRange = useMemo(() => {
    // 월간 커스텀 범위가 있으면 그것 사용
    if (selectedPeriod === '월간' && customDateRange.start && customDateRange.end) {
      return `${formatDateShort(customDateRange.start)}~${formatDateShort(customDateRange.end)}`;
    }

    if (filteredSessions.length === 0) return '';
    const first = filteredSessions[filteredSessions.length - 1];
    const last = filteredSessions[0];
    const formatDate = (dateLabel: string) => dateLabel.split(' ')[0]; // "12/11 (수)" -> "12/11"
    return `${formatDate(first.dateLabel)}~${formatDate(last.dateLabel)}`;
  }, [filteredSessions, selectedPeriod, customDateRange]);

  // 결석자 데이터 변환
  const absences: AbsenceByDate[] = useMemo(() => {
    return filteredSessions
      .filter((s) => s.absent.length > 0)
      .map((s) => ({
        date: s.dateLabel,
        isToday: s.isToday,
        students: s.absent.map((a) => ({
          id: a.id,
          name: a.name,
          reason: a.reason,
        })),
      }));
  }, [filteredSessions]);

  // 진도 데이터 변환
  const progressSessions: ProgressSession[] = useMemo(() => {
    return filteredSessions.map((s) => ({
      id: s.id,
      date: s.dateLabel,
      isToday: s.isToday,
      chapter: s.progress.chapter,
      textbook: s.progress.textbook,
      pages: s.progress.pages,
      homework: s.progress.homework,
    }));
  }, [filteredSessions]);

  // 시험 데이터 변환
  const tests: TestData[] = useMemo(() => {
    return filteredSessions
      .filter((s) => s.test)
      .map((s) => ({
        id: s.id,
        date: s.dateLabel,
        type: s.test!.type,
        range: s.test!.range,
        totalScore: s.test!.totalScore,
        scores: s.test!.scores,
      }));
  }, [filteredSessions]);

  // 월간 캘린더용 수업 날짜 (Supabase 데이터 기반)
  const classScheduleDates = useMemo(() => {
    // Supabase 세션이 있으면 사용
    if (supabaseSessions && supabaseSessions.length > 0) {
      return supabaseSessions.map((s) => new Date(s.date));
    }
    // Fallback: 빈 배열 (Mock 데이터 제거)
    return [];
  }, [supabaseSessions]);

  // 기간 선택 핸들러
  const handleRangeSelect = (start: Date, end: Date) => {
    setCustomDateRange({ start, end });
    setSelectedPeriod('월간');
  };

  // =====================
  // 로딩 상태
  // =====================
  if (isLoadingClasses || !selectedClass) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8B95A1]">수업 목록 불러오는 중...</p>
        </div>
        <BottomNavBar active="classes" />
      </div>
    );
  }

  // =====================
  // 공통 컨텐츠 (Detail)
  // =====================
  const classDetailContent = (
    <>
      {/* 반 정보 + 기간 선택 통합 헤더 */}
      <ClassHeaderCard
        className={selectedClass.name}
        subject={selectedClass.subject}
        schedule={selectedClass.schedule}
        selectedPeriod={selectedPeriod}
        dateRange={dateRange}
        onPeriodChange={setSelectedPeriod}
        onOpenMonthly={() => setShowDateRangeModal(true)}
      />

      {/* 결석자 섹션 */}
      <AbsenceSection absences={absences} />

      {/* 진도 타임라인 */}
      <ProgressTimelineSection sessions={progressSessions} />

      {/* 시험 섹션 */}
      <TestSection tests={tests} />

      {/* 학생 섹션 (최하단) */}
      <StudentSection students={selectedClass.students} />
    </>
  );

  // =====================
  // 태블릿: Master-Detail 레이아웃
  // =====================
  if (isTabletOrAbove) {
    return (
      <div className="h-screen flex flex-col bg-[#F9FAFB]">
        {/* 상단 헤더 */}
        <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-[#F2F4F6]">
          <h1 className="text-xl font-bold text-[#191F28]">수업</h1>
          <p className="text-sm text-[#8B95A1] mt-1">반별 수업 현황을 확인하세요</p>
        </div>

        {/* Master-Detail */}
        <div className="flex-1 overflow-hidden pb-16">
          <MasterDetailLayout
            masterWidth={260}
            hasSelection={true}
            master={
              <div className="h-full flex flex-col">
                {/* 검색 */}
                <div className="p-4 border-b">
                  <div className="relative">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="반 검색"
                      className="w-full pl-10 pr-4 py-2 bg-[#F2F4F6] rounded-lg text-sm placeholder-[#8B95A1] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    />
                  </div>
                </div>

                {/* 반 목록 */}
                <div className="flex-1 overflow-y-auto">
                  {classes.map((cls) => {
                    // Supabase 데이터에서 student_count 가져오기
                    const supabaseCls = supabaseClasses?.find(c => c.id === cls.id);
                    const studentCount = supabaseCls?.student_count ?? cls.students.length;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => setSelectedClassId(cls.id)}
                        className={`w-full px-4 py-3 text-left border-b border-[#F2F4F6] transition-colors ${
                          selectedClassId === cls.id
                            ? 'bg-[#EBF4FF] border-l-2 border-l-[#3182F6]'
                            : 'hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${selectedClassId === cls.id ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>
                            {cls.name}
                          </span>
                          <span className="text-xs text-[#8B95A1]">{studentCount}명</span>
                        </div>
                        <div className="text-xs text-[#8B95A1] mt-0.5">
                          {cls.subject} · {cls.schedule}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 반 추가 버튼 */}
                <div className="p-4 border-t">
                  <button className="w-full py-2.5 border border-dashed border-[#D1D6DB] rounded-lg text-sm text-[#6B7684] hover:bg-[#F9FAFB] transition-colors">
                    + 새 반 추가
                  </button>
                </div>
              </div>
            }
            detail={
              <div className="h-full overflow-y-auto pb-6">
                {classDetailContent}
              </div>
            }
          />
        </div>

        {/* 하단 네비게이션 */}
        <BottomNavBar active="classes" />

        {/* 기간 선택 모달 */}
        <DateRangeCalendarModal
          isOpen={showDateRangeModal}
          onClose={() => setShowDateRangeModal(false)}
          initialStart={customDateRange.start}
          initialEnd={customDateRange.end}
          onRangeSelect={handleRangeSelect}
          classScheduleDates={classScheduleDates}
        />
      </div>
    );
  }

  // =====================
  // 모바일: 기존 레이아웃
  // =====================
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-[#F2F4F6]">
        <div className="text-lg font-bold text-[#191F28]">수업</div>
      </div>

      {/* 반 탭 바 */}
      <div className="bg-white px-4 py-3 border-b border-[#F2F4F6]">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors relative ${
                selectedClassId === cls.id
                  ? 'bg-[#191F28] text-white'
                  : 'bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]'
              }`}
            >
              {cls.name}
              {selectedClassId === cls.id && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#3182F6] rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 상세 내용 */}
      {classDetailContent}

      {/* 하단 네비게이션 */}
      <BottomNavBar active="classes" />

      {/* 기간 선택 모달 */}
      <DateRangeCalendarModal
        isOpen={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        initialStart={customDateRange.start}
        initialEnd={customDateRange.end}
        onRangeSelect={handleRangeSelect}
        classScheduleDates={classScheduleDates}
      />
    </div>
  );
}
