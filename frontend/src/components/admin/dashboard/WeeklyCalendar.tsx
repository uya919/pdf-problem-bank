/**
 * WeeklyCalendar - PC 관리자 주간 캘린더
 *
 * Stage 13-B: 토스 UX 철학 리디자인
 * - 둥글둥글한 디자인 (rounded-3xl)
 * - border 제거, gap으로 구분
 * - 넉넉한 터치 영역 (44px 버튼)
 * - 오늘 버튼 pill 스타일
 *
 * Stage 14: 순환수업 마커 추가
 * - 순환수업 요일에 보라색 점 표시
 * - 휴일 등록된 날짜는 빨간색 휴일 표시
 *
 * Stage 16: 캘린더 통합 공지사항
 * - 캘린더 하단에 중요 알림 + 일반 공지 표시
 * - 권한별 공지 필터링 (admin/teacher)
 *
 * Stage 17: 공지 등록 모달
 * - + 버튼으로 공지 등록 모달 열기
 *
 * Stage 17-B: 중요 공지 미리보기
 * - isImportant=true 공지를 날짜 셀에 미리보기 표시
 *
 * Stage 20: 월간 캘린더 드롭다운
 * - "오늘" 버튼 → "월간" 버튼으로 변경
 * - 클릭 시 월간 캘린더 드롭다운 토글
 * - 날짜 선택 시 해당 주로 이동 + 드롭다운 닫기
 *
 * Stage 33: 등원 예정 표시
 * - 등원 확정된 학생이 있는 날짜에 초록색 뱃지 표시
 */

import { useState, useMemo } from 'react';
import { Plus, Calendar, ChevronUp } from 'lucide-react';
import { CalendarDayCell } from './CalendarDayCell';
import { MonthlyCalendarGrid } from './MonthlyCalendarGrid';
import { ImportantNotices } from './notices/ImportantNotices';
import { GeneralNotices } from './notices/GeneralNotices';
import { NoticeFormModal } from '../notice/NoticeFormModal';
import { useNoticesByImportance, useAdminNotices } from '../../../hooks/useAdminNotices';
import { useCreateNotice } from '../../../hooks/useCreateNotice';
import { useRotationSchedules, useRotationScheduleDetail } from '../../../hooks/useRotation';
import type { Notice, MonthRange } from '../../../types/admin';
import { CALENDAR_PRIORITY_ORDER } from '../../../types/admin';
import {
  getWeekRange,
  getWeekDays,
  getPreviousWeek,
  getNextWeek,
  formatWeekRangeLabel,
  formatDateKey,
  getMonthRangeFromWeek,
} from '../../../utils/weekUtils';
import type { WeekRange } from '../../../types/admin';

interface WeeklyCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

export function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
  // 현재 표시 중인 주 (선택된 날짜 기준)
  const [weekRange, setWeekRange] = useState<WeekRange>(() => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    return getWeekRange(new Date(year, month - 1, day));
  });

  // Stage 17: 공지 등록 모달 상태
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const { createNotice } = useCreateNotice();

  // Stage 20: 월간 캘린더 상태
  const [isMonthlyOpen, setIsMonthlyOpen] = useState(false);
  const [monthRange, setMonthRange] = useState<MonthRange>(() =>
    getMonthRangeFromWeek(weekRange)
  );

  // Stage 16: 선택된 날짜의 공지사항 (중요/일반 분리)
  const {
    important: importantNotices,
    general: generalNotices,
    isLoading,
  } = useNoticesByImportance(selectedDate);

  // Stage 14: 순환수업 데이터
  const { data: rotationSchedules } = useRotationSchedules();

  // 활성 순환수업 (첫 번째 것)
  const activeSchedule = rotationSchedules?.find((s) => s.is_active);
  const { data: rotationDetail } = useRotationScheduleDetail(activeSchedule?.id || null);

  // 순환수업 요일 및 휴일 정보
  const rotationInfo = useMemo(() => {
    if (!activeSchedule) return { dayOfWeek: -1, exceptions: new Set<string>() };

    const exceptions = new Set<string>(
      rotationDetail?.exceptions.map((e) => e.exception_date) || []
    );

    return {
      dayOfWeek: activeSchedule.day_of_week,
      exceptions,
    };
  }, [activeSchedule, rotationDetail]);

  // 주간 날짜 배열 생성 (공지 없이 날짜만)
  const weekDays = useMemo(() => {
    return getWeekDays(weekRange, {});
  }, [weekRange]);

  // Stage 17-B: 주간 공지 데이터 조회 (중요 공지 미리보기용)
  const { data: weekNoticesByDate } = useAdminNotices({ weekRange });

  // Stage 17-B + 확장: 날짜별 중요 공지 (isImportant=true) 매핑 - 우선순위 정렬
  const importantNoticesByDate = useMemo(() => {
    const map: Record<string, Notice[]> = {};
    if (!weekNoticesByDate) return map;

    Object.entries(weekNoticesByDate).forEach(([dateKey, notices]) => {
      // isImportant=true인 공지들을 우선순위 순서로 정렬
      const importantNotices = notices
        .filter((n) => n.isImportant)
        .sort((a, b) => {
          // 1. 유형 우선순위 (CALENDAR_PRIORITY_ORDER 순서)
          const aTypeIdx = CALENDAR_PRIORITY_ORDER.indexOf(a.type);
          const bTypeIdx = CALENDAR_PRIORITY_ORDER.indexOf(b.type);
          const aIdx = aTypeIdx === -1 ? 999 : aTypeIdx;
          const bIdx = bTypeIdx === -1 ? 999 : bTypeIdx;
          if (aIdx !== bIdx) return aIdx - bIdx;

          // 2. 같은 유형이면 priority 값으로 정렬 (높을수록 먼저)
          return b.priority - a.priority;
        });
      map[dateKey] = importantNotices;
    });

    return map;
  }, [weekNoticesByDate]);

  // 이전 주 이동
  const handlePrevWeek = () => setWeekRange(getPreviousWeek(weekRange));

  // 다음 주 이동
  const handleNextWeek = () => setWeekRange(getNextWeek(weekRange));

  // 오늘로 이동
  const handleGoToday = () => {
    const today = new Date();
    setWeekRange(getWeekRange(today));
    onDateSelect(formatDateKey(today));
  };

  // Stage 20: 월간 캘린더 토글
  const handleToggleMonthly = () => {
    if (!isMonthlyOpen) {
      // 열 때: 현재 주에 맞는 월로 설정
      setMonthRange(getMonthRangeFromWeek(weekRange));
    }
    setIsMonthlyOpen(!isMonthlyOpen);
  };

  // Stage 20: 월간에서 날짜 선택
  const handleMonthDateSelect = (date: Date) => {
    const dateKey = formatDateKey(date);
    const newWeekRange = getWeekRange(date);

    setWeekRange(newWeekRange);
    onDateSelect(dateKey);
    setIsMonthlyOpen(false); // 드롭다운 닫기
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-1">
          {/* 이전 주 버튼 */}
          <button
            onClick={handlePrevWeek}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-grey-100 text-grey-400 active:scale-95 transition-transform"
            aria-label="이전 주"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 주 표시 */}
          <span className="text-lg font-bold text-grey-900 px-2">
            {formatWeekRangeLabel(weekRange)}
          </span>

          {/* 다음 주 버튼 */}
          <button
            onClick={handleNextWeek}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-grey-100 text-grey-400 active:scale-95 transition-transform"
            aria-label="다음 주"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 로딩 표시 */}
          {isLoading && (
            <span className="ml-2 w-4 h-4 border-2 border-grey-300 border-t-toss-blue rounded-full animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stage 17: 공지 등록 버튼 */}
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-grey-100 text-grey-600 hover:bg-grey-200 active:scale-95 transition-all"
            aria-label="공지 등록"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Stage 20: 월간 버튼 (오늘 버튼 대체) */}
          <button
            onClick={handleToggleMonthly}
            className={`
              flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full
              active:scale-95 transition-all
              ${isMonthlyOpen
                ? 'bg-toss-blueDark text-white'
                : 'bg-toss-blue text-white hover:bg-toss-blueDark'
              }
            `}
          >
            {isMonthlyOpen ? (
              <>
                <ChevronUp className="w-4 h-4" />
                주간
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                월간
              </>
            )}
          </button>
        </div>
      </div>

      {/* 주간 그리드 (gap 기반 구분) */}
      <div className="px-3 pb-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            // Stage 14: 순환수업 마커 정보 계산
            const isRotationDay = day.dayOfWeek === rotationInfo.dayOfWeek;
            const isRotationHoliday = rotationInfo.exceptions.has(day.dateKey);

            return (
              <CalendarDayCell
                key={day.dateKey}
                day={day}
                isSelected={day.dateKey === selectedDate}
                onClick={() => onDateSelect(day.dateKey)}
                isRotationDay={isRotationDay}
                isRotationHoliday={isRotationHoliday}
                importantNotices={importantNoticesByDate[day.dateKey] || []}
              />
            );
          })}
        </div>
      </div>

      {/* Stage 20: 월간 캘린더 드롭다운 */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isMonthlyOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-3 pb-4">
          <MonthlyCalendarGrid
            monthRange={monthRange}
            onMonthChange={setMonthRange}
            onDateSelect={handleMonthDateSelect}
            selectedDate={selectedDate}
          />
        </div>
      </div>

      {/* Stage 16: 중요 알림 섹션 */}
      <ImportantNotices
        notices={importantNotices}
        onNoticeClick={(notice) => console.log('Notice clicked:', notice)}
      />

      {/* Stage 16: 일반 공지 섹션 */}
      <GeneralNotices
        notices={generalNotices}
        date={selectedDate}
        isEmpty={importantNotices.length === 0 && generalNotices.length === 0}
        onNoticeClick={(notice) => console.log('Notice clicked:', notice)}
      />

      {/* Stage 17: 공지 등록 모달 */}
      <NoticeFormModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        onSubmit={createNotice}
        defaultDate={selectedDate}
      />
    </div>
  );
}
