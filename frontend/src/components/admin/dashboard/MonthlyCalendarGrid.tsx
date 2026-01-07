/**
 * MonthlyCalendarGrid - 월간 캘린더 드롭다운 그리드
 *
 * Stage 20: 월간 캘린더 드롭다운
 * - 42일 그리드 (6주)
 * - 날짜 선택 시 해당 주로 이동
 * - 반응형: PC는 텍스트 미리보기, 모바일은 점(●) 표시
 *
 * Stage 20-B: 폰트 스타일 변형 2 적용
 * - 날짜: 18px (text-lg) / font-semibold (600)
 * - 요일: 11px / font-medium
 * - 셀 높이: 64px
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthRange, MonthCalendarDay } from '../../../types/admin';
import {
  getMonthDays,
  getPreviousMonth,
  getNextMonth,
  formatMonthLabel,
  isCurrentMonth,
} from '../../../utils/weekUtils';
import { useMonthlyImportantNotices } from '../../../hooks/useAdminNotices';
import { useBreakpoint } from '../../../hooks/useIsMobile';

interface MonthlyCalendarGridProps {
  /** 현재 표시 중인 월 */
  monthRange: MonthRange;
  /** 월 변경 핸들러 */
  onMonthChange: (monthRange: MonthRange) => void;
  /** 날짜 선택 핸들러 */
  onDateSelect: (date: Date) => void;
  /** 현재 선택된 날짜 (주간 캘린더 기준) */
  selectedDate?: string;
}

const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 월간 캘린더 그리드 컴포넌트
 */
export function MonthlyCalendarGrid({
  monthRange,
  onMonthChange,
  onDateSelect,
  selectedDate,
}: MonthlyCalendarGridProps) {
  const { isMobile } = useBreakpoint();
  const { monthlyInfo, isLoading } = useMonthlyImportantNotices(monthRange);

  // 월간 날짜 배열 생성
  const monthDays = getMonthDays(monthRange);

  // 이전/다음 월 이동
  const handlePrevMonth = () => {
    onMonthChange(getPreviousMonth(monthRange));
  };

  const handleNextMonth = () => {
    onMonthChange(getNextMonth(monthRange));
  };

  // 오늘로 이동
  const handleToday = () => {
    const now = new Date();
    onMonthChange({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-grey-100 p-4">
      {/* 월 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-grey-50 transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-5 h-5 text-grey-500" />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-grey-800">
            {formatMonthLabel(monthRange)}
          </h3>
          {!isCurrentMonth(monthRange) && (
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm text-toss-blue bg-toss-blueLight rounded-full hover:bg-blue-100 transition-colors"
            >
              오늘
            </button>
          )}
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-grey-50 transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="w-5 h-5 text-grey-500" />
        </button>
      </div>

      {/* 요일 헤더 - 변형 2: 11px / font-medium */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_HEADERS.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[11px] font-medium py-2 ${
              idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-grey-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day) => (
          <MonthDayCell
            key={day.dateKey}
            day={day}
            isSelected={selectedDate === day.dateKey}
            onClick={() => onDateSelect(day.date)}
            noticeInfo={monthlyInfo[day.dateKey]}
            isMobile={isMobile}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 월간 날짜 셀 컴포넌트
// =====================================================

interface MonthDayCellProps {
  day: MonthCalendarDay;
  isSelected: boolean;
  onClick: () => void;
  noticeInfo?: {
    count: number;
    importantPreview: string | null;
    hasImportant: boolean;
  };
  isMobile: boolean;
  isLoading: boolean;
}

function MonthDayCell({
  day,
  isSelected,
  onClick,
  noticeInfo,
  isMobile,
}: MonthDayCellProps) {
  const { dateKey, isToday, isWeekend, isCurrentMonth } = day;
  const dayNumber = day.date.getDate();

  // 스타일 계산
  const textColor = !isCurrentMonth
    ? 'text-grey-300'
    : isToday
    ? 'text-white'
    : isWeekend
    ? day.dayOfWeek === 0
      ? 'text-red-400'
      : 'text-blue-400'
    : 'text-grey-700';

  const bgColor = isToday
    ? 'bg-toss-blue'
    : isSelected
    ? 'bg-toss-blueLight'
    : 'hover:bg-grey-50';

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-start
        min-h-[64px] p-1.5 rounded-xl
        transition-all cursor-pointer
        ${bgColor}
        ${isSelected && !isToday ? 'ring-2 ring-toss-blue ring-inset' : ''}
      `}
      aria-label={`${day.date.getMonth() + 1}월 ${dayNumber}일`}
    >
      {/* 날짜 숫자 - 변형 2: 18px (text-lg) / font-semibold */}
      <span
        className={`
          text-lg font-semibold
          ${textColor}
          ${isToday ? 'font-bold' : ''}
        `}
      >
        {dayNumber}
      </span>

      {/* 공지 표시 */}
      {noticeInfo && noticeInfo.count > 0 && (
        <div className="mt-0.5">
          {isMobile ? (
            // 모바일: 점(●) 표시
            <div className="flex gap-0.5 justify-center">
              {noticeInfo.hasImportant && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
              {noticeInfo.count > 1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-grey-400" />
              )}
              {noticeInfo.count > 2 && (
                <span className="w-1.5 h-1.5 rounded-full bg-grey-300" />
              )}
            </div>
          ) : (
            // PC: 텍스트 미리보기
            <div className="w-full px-0.5">
              {noticeInfo.importantPreview ? (
                <span className="text-[10px] text-red-500 truncate block">
                  {noticeInfo.importantPreview}
                </span>
              ) : (
                <span className="text-[10px] text-grey-400">
                  +{noticeInfo.count}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export default MonthlyCalendarGrid;
