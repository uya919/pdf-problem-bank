/**
 * TabletDashboard - 태블릿용 대시보드 레이아웃
 *
 * 목업: docs/mockups/tablet-dashboard-v2.html
 *
 * 구조:
 * - WeekCalendarGrid (주간 캘린더 + 점 + 툴팁)
 * - ClassGridView (2열 수업 카드)
 * - TaskBadgeCard (2열 업무 카드)
 */
import { useState, useMemo } from 'react';
import { WeekCalendarGrid, type Notice } from './index';
import { TaskGridView } from './TaskGridView';
import { MonthlyCalendarModal } from '../modals/MonthlyCalendarModal';
import type { ClassSchedule } from '../dashboard/HeroCarousel';
import type { HolidayStatus } from '../../../hooks/useHolidays';

/** 출결 이슈 타입 */
interface AttendanceIssue {
  id: string;
  className: string;
  studentName: string;
  issue: string;
}

interface TabletDashboardProps {
  /** 선택된 날짜 */
  selectedDate: Date;
  /** 날짜 변경 핸들러 */
  onDateChange: (date: Date) => void;
  /** 날짜별 수업 데이터 */
  classesByDate: Record<string, ClassSchedule[]>;
  /** 날짜별 공지 데이터 */
  noticesByDate: Record<string, Notice[]>;
  /** 날짜별 출결 이슈 데이터 */
  attendanceIssuesByDate?: Record<string, AttendanceIssue[]>;
  /** 출결 체크 핸들러 */
  onAttendance: (classId: string) => void;
  /** 진도 기록 핸들러 */
  onProgress: (classId: string) => void;
  /** 공지 클릭 핸들러 */
  onNoticeClick?: (id: string) => void;
  /** 출결 이슈 클릭 핸들러 */
  onAttendanceIssueClick?: (id: string) => void;
  /** 수업 있는 날짜들 (월간 캘린더용) */
  classScheduleDates?: Date[];
  /** 날짜별 휴일 상태 (key: 'YYYY-MM-DD') - Stage 30 */
  holidayStatusByDate?: Record<string, HolidayStatus>;
}

/** 날짜를 'YYYY-MM-DD' 형식으로 변환 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 두 날짜가 같은 날인지 비교 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function TabletDashboard({
  selectedDate,
  onDateChange,
  classesByDate,
  noticesByDate,
  attendanceIssuesByDate = {},
  onAttendance,
  onProgress,
  onNoticeClick,
  onAttendanceIssueClick,
  classScheduleDates = [],
  holidayStatusByDate = {},
}: TabletDashboardProps) {
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const today = new Date();

  // 선택된 날짜의 수업
  const selectedDateKey = formatDateKey(selectedDate);
  const classesForDate = classesByDate[selectedDateKey] || [];

  // 날짜 라벨
  const isToday = isSameDay(selectedDate, today);
  const dateLabel = isToday
    ? '오늘 수업'
    : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 수업`;

  // 선택된 날짜의 공지 (업무 카드에 표시)
  const noticesForDate = useMemo(() => {
    const notices = noticesByDate[selectedDateKey] || [];
    return notices.map((n) => ({
      id: n.id,
      title: n.title,
      time: n.time,
    }));
  }, [noticesByDate, selectedDateKey]);

  // 선택된 날짜의 출결 이슈
  const attendanceIssuesForDate = useMemo(() => {
    return attendanceIssuesByDate[selectedDateKey] || [];
  }, [attendanceIssuesByDate, selectedDateKey]);

  return (
    <div className="max-w-[896px] mx-auto px-5 pb-20">
      {/* 주간 캘린더 */}
      <div className="mt-4">
        <WeekCalendarGrid
          selectedDate={selectedDate}
          onDateSelect={onDateChange}
          onOpenMonthly={() => setMonthlyModalOpen(true)}
          noticesByDate={noticesByDate}
          holidayStatusByDate={holidayStatusByDate}
        />
      </div>

      {/* 수업 카드 (2열 그리드) */}
      <div className="mb-4">
        {/* 섹션 타이틀 */}
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-[18px] h-[18px] text-gray-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[15px] font-semibold text-gray-900">
            {dateLabel}
          </span>
          <span className="text-[13px] text-gray-400">
            {classesForDate.length}개
          </span>
        </div>

        {/* 수업 그리드 또는 없음 표시 */}
        {classesForDate.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {classesForDate.map((cls) => (
              <ClassCard
                key={cls.id}
                classInfo={cls}
                onAttendance={() => onAttendance(cls.id)}
                onProgress={() => onProgress(cls.id)}
              />
            ))}
          </div>
        ) : (
          <NoClassCard />
        )}
      </div>

      {/* 업무 현황 (2열 그리드) */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-[18px] h-[18px] text-gray-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-[15px] font-semibold text-gray-900">
            업무 현황
          </span>
        </div>

        <TaskGridView
          notices={noticesForDate}
          attendanceIssues={attendanceIssuesForDate}
          onNoticeClick={onNoticeClick}
          onAttendanceClick={onAttendanceIssueClick}
        />
      </div>

      {/* 월간 캘린더 모달 */}
      <MonthlyCalendarModal
        isOpen={monthlyModalOpen}
        onClose={() => setMonthlyModalOpen(false)}
        selectedDate={selectedDate}
        onDateSelect={onDateChange}
        classScheduleDates={classScheduleDates}
      />
    </div>
  );
}

/** 개별 수업 카드 */
interface ClassCardProps {
  classInfo: ClassSchedule;
  onAttendance: () => void;
  onProgress: () => void;
}

function ClassCard({ classInfo, onAttendance, onProgress }: ClassCardProps) {
  const isCompleted = classInfo.status === 'completed';
  const isCurrent = classInfo.status === 'current';

  const getBackground = () => {
    if (isCompleted) {
      return 'linear-gradient(135deg, #6B7684 0%, #4E5968 100%)';
    }
    return 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)';
  };

  return (
    <div
      className={`rounded-2xl p-4 text-white relative overflow-hidden ${
        isCurrent ? 'ring-2 ring-white/30 shadow-lg shadow-blue-500/30' : ''
      }`}
      style={{ background: getBackground() }}
    >
      {/* 상태 */}
      <div className="text-[11px] opacity-80 mb-2 flex items-center gap-1.5">
        {isCompleted && (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
            수업 완료
          </>
        )}
        {isCurrent && (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            다음 수업
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">NOW</span>
          </>
        )}
        {classInfo.status === 'upcoming' && (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            예정된 수업
          </>
        )}
      </div>

      {/* 시간 */}
      <div className={`text-xl font-bold mb-1 ${isCompleted ? 'opacity-70' : ''}`}>
        {classInfo.startTime} - {classInfo.endTime}
      </div>

      {/* 반 정보 - 학년_과목_단계 형식으로 표시 (ex: 중1 수학 정규) */}
      <div className={`text-[13px] opacity-90 mb-3 ${isCompleted ? 'opacity-70' : ''}`}>
        {classInfo.name}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onAttendance}
          className={`flex-1 py-2 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isCompleted
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white text-[#3182F6] hover:bg-white/90'
          }`}
        >
          {isCompleted ? '출결 보기' : '출결 체크'}
        </button>
        <button
          onClick={onProgress}
          className={`flex-1 py-2 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isCompleted
              ? 'bg-white/10 text-white/70 hover:bg-white/20'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          {isCompleted ? '기록 보기' : '진도 기록'}
        </button>
      </div>
    </div>
  );
}

/** 수업 없음 카드 */
function NoClassCard() {
  return (
    <div
      className="rounded-2xl p-6 text-white relative overflow-hidden flex flex-col items-center justify-center col-span-2"
      style={{ background: 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)' }}
    >
      <svg className="w-10 h-10 mb-3 opacity-90" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      <div className="text-lg font-bold mb-1">이 날은 수업이 없습니다</div>
      <div className="text-[13px] opacity-80">편안한 하루 보내세요!</div>
    </div>
  );
}

export default TabletDashboard;
