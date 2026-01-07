/**
 * WeekCalendarGrid - 태블릿용 주간 캘린더 그리드
 *
 * 목업: docs/mockups/tablet-dashboard-v2.html
 *
 * 인터랙션:
 * - 날짜 1탭: onDateSelect 호출 (대시보드 전환)
 * - 같은 날짜 재탭: 공지 툴팁 표시
 *
 * Phase 28-A: 공지 텍스트 표시 (최대 2개 + +N)
 * Stage 30: 휴일 표시 추가
 */
import { useState, useCallback } from 'react';
import { CalendarMonthIcon } from '../../ui/Icons';
import { NoticeTooltip, type Notice } from './NoticeTooltip';
import type { HolidayStatus } from '../../../hooks/useHolidays';

/** 공지 유형별 점 색상 */
function getNoticeDotColor(notice: Notice): string {
  if (notice.type) {
    if (notice.type === 'urgent' || notice.type === 'absence') return 'bg-red-500';
    if (notice.type === 'holiday') return 'bg-orange-500';
  }
  return 'bg-[#3182F6]';
}

interface WeekCalendarGridProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onOpenMonthly: () => void;
  /** 날짜별 공지 데이터 (key: 'YYYY-MM-DD') */
  noticesByDate?: Record<string, Notice[]>;
  /** 날짜별 휴일 상태 (key: 'YYYY-MM-DD') - Stage 30 */
  holidayStatusByDate?: Record<string, HolidayStatus>;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** 주어진 날짜가 속한 주의 시작일(일요일) 반환 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

/** 주간 날짜 배열 생성 (일~토) */
function getWeekDays(date: Date): Date[] {
  const weekStart = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

/** 주차 계산 */
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  return Math.ceil((date.getDate() + firstDayOfWeek) / 7);
}

/** 두 날짜가 같은 날인지 비교 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** 날짜를 'YYYY-MM-DD' 형식으로 변환 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function WeekCalendarGrid({
  selectedDate,
  onDateSelect,
  onOpenMonthly,
  noticesByDate = {},
  holidayStatusByDate = {},
}: WeekCalendarGridProps) {
  const [tooltipDay, setTooltipDay] = useState<number | null>(null);
  const [lastClickedDay, setLastClickedDay] = useState<number | null>(null);

  const today = new Date();
  const weekDays = getWeekDays(selectedDate);
  const weekOfMonth = getWeekOfMonth(selectedDate);
  const month = selectedDate.getMonth() + 1;

  // 이전/다음 주 이동
  const goToPrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateSelect(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateSelect(newDate);
  };

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((date: Date) => {
    const day = date.getDate();
    const dateKey = formatDateKey(date);
    const notices = noticesByDate[dateKey] || [];

    // 같은 날짜 재탭 → 툴팁 표시
    if (isSameDay(date, selectedDate) && lastClickedDay === day) {
      if (notices.length > 0) {
        setTooltipDay(tooltipDay === day ? null : day);
      }
      return;
    }

    // 다른 날짜 탭 → 날짜 선택
    setTooltipDay(null);
    setLastClickedDay(day);
    onDateSelect(date);
  }, [selectedDate, lastClickedDay, tooltipDay, noticesByDate, onDateSelect]);

  // 툴팁 닫기
  const closeTooltip = useCallback(() => {
    setTooltipDay(null);
  }, []);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-[15px] font-semibold text-gray-900">
            {month}월 {weekOfMonth}주차
          </span>
          <button
            onClick={goToNextWeek}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 월간 버튼 */}
        <button
          onClick={onOpenMonthly}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-[13px] text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <CalendarMonthIcon size={16} className="text-gray-500" />
          <span>월간</span>
        </button>
      </div>

      {/* 주간 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date) => {
          const day = date.getDate();
          const dayIndex = date.getDay();
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const isSunday = dayIndex === 0;
          const isSaturday = dayIndex === 6;
          const dateKey = formatDateKey(date);
          const notices = noticesByDate[dateKey] || [];
          const hasNotices = notices.length > 0;
          const showTooltip = tooltipDay === day;
          // Stage 30: 휴일 상태
          const holidayStatus = holidayStatusByDate[dateKey];
          const isHoliday = holidayStatus?.isHoliday && !holidayStatus?.hasException;

          return (
            <div
              key={dateKey}
              className="week-day relative"
            >
              <button
                onClick={() => handleDateClick(date)}
                className={`
                  w-full min-h-[100px] p-2 rounded-xl text-center cursor-pointer transition-all flex flex-col
                  ${isSelected ? 'bg-[#F2F6FC]' : 'hover:bg-gray-100'}
                  ${isToday ? 'border-2 border-[#3182F6]' : ''}
                  ${isHoliday ? 'bg-red-50' : ''}
                `}
              >
                {/* 요일 */}
                <div
                  className={`text-[11px] mb-1 ${
                    isSunday ? 'text-red-500' : isSaturday ? 'text-[#3182F6]' : 'text-gray-500'
                  }`}
                >
                  {DAY_NAMES[dayIndex]}
                </div>

                {/* 날짜 */}
                <div
                  className={`text-[16px] font-semibold mb-1 ${
                    isSelected
                      ? 'text-[#3182F6] font-bold'
                      : isHoliday || isSunday
                      ? 'text-red-500'
                      : isSaturday
                      ? 'text-[#3182F6]'
                      : 'text-gray-900'
                  }`}
                >
                  {day}
                </div>

                {/* Stage 30: 휴일 이름 표시 */}
                {isHoliday && holidayStatus?.holidayName && (
                  <div className="text-[10px] text-red-500 font-medium truncate px-0.5 mb-1">
                    {holidayStatus.holidayName}
                  </div>
                )}

                {/* 공지 텍스트 표시 (최대 2개 + +N) - Phase 28-A */}
                {hasNotices && (
                  <div className="mt-auto space-y-0.5 w-full text-left">
                    {notices.slice(0, 2).map((notice, i) => (
                      <div key={i} className="flex items-center gap-1 px-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getNoticeDotColor(notice)}`} />
                        <span className="text-[10px] text-gray-600 truncate leading-tight">
                          {notice.title}
                        </span>
                      </div>
                    ))}
                    {notices.length > 2 && (
                      <div className="text-[10px] text-gray-400 text-center">
                        +{notices.length - 2}
                      </div>
                    )}
                  </div>
                )}
              </button>

              {/* 툴팁 */}
              <NoticeTooltip
                notices={notices}
                visible={showTooltip}
                onClose={closeTooltip}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekCalendarGrid;
