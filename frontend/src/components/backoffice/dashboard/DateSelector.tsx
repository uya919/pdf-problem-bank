/**
 * DateSelector - 날짜 선택 컴포넌트
 *
 * 기능:
 * - 날짜 바 클릭 → 주간 드롭다운 토글
 * - 요일 클릭 → 해당 날짜 선택
 * - "월간" 버튼 → 월간 캘린더 모달 열기
 *
 * Stage 13: 공지사항 점 표시 추가
 * - notices prop으로 날짜별 공지 전달
 * - 공지 유형별 색상 점 표시 (또는 간단한 주황색 점)
 */
import { useState, useRef, useEffect } from 'react';
import { CalendarIcon, CalendarMonthIcon } from '../../ui/Icons';
import type { Notice as AdminNotice, NoticesByDate as AdminNoticesByDate } from '../../../types/admin';
import { NOTICE_TYPE_STYLES } from '../../../types/admin';
import type { HolidayStatus } from '../../../hooks/useHolidays';

/** 간단한 공지 타입 (태블릿/모바일 공용) */
interface SimpleNotice {
  id: string;
  title: string;
  description?: string;
  time?: string;
}

/** Notice 또는 SimpleNotice 모두 지원 */
type Notice = AdminNotice | SimpleNotice;
type NoticesByDate = AdminNoticesByDate | Record<string, SimpleNotice[]>;

/** 공지가 AdminNotice 타입인지 확인 */
function isAdminNotice(notice: Notice): notice is AdminNotice {
  return 'type' in notice && typeof notice.type === 'string';
}

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onOpenMonthly: () => void;
  /** 수업이 있는 날짜들 (점 표시용) - 기존 호환 */
  classScheduleDates?: Date[];
  /** 날짜별 공지사항 (Stage 13) */
  noticesByDate?: NoticesByDate;
  /** 날짜별 휴일 상태 (Stage 30) */
  holidayStatusByDate?: Record<string, HolidayStatus>;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 주어진 날짜가 속한 주의 시작일(일요일)을 반환
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // 일요일 기준 (일요일=0)
  return new Date(d.setDate(diff));
}

/**
 * 주간 날짜 배열 생성 (일~토)
 */
function getWeekDays(date: Date): Date[] {
  const weekStart = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

/**
 * 주차 계산 (월의 몇 번째 주인지)
 */
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay();
  const offset = firstDayOfWeek; // 일요일 기준 (일요일=0)
  return Math.ceil((date.getDate() + offset) / 7);
}

/**
 * 두 날짜가 같은 날인지 비교
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function DateSelector({
  selectedDate,
  onDateChange,
  onOpenMonthly,
  classScheduleDates = [],
  noticesByDate = {},
  holidayStatusByDate = {},
}: DateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const weekDays = getWeekDays(selectedDate);
  const weekOfMonth = getWeekOfMonth(selectedDate);
  const month = selectedDate.getMonth() + 1;

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 이전/다음 주 이동
  const goToPrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  // 날짜에 수업이 있는지 확인 (기존 호환)
  const hasClass = (date: Date) => {
    return classScheduleDates.some((d) => isSameDay(d, date));
  };

  // 날짜의 공지사항 가져오기 (Stage 13)
  const getNoticesForDate = (date: Date): Notice[] => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return noticesByDate[dateKey] || [];
  };

  // 날짜의 휴일 상태 가져오기 (Stage 30)
  const getHolidayStatusForDate = (date: Date): HolidayStatus | undefined => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidayStatusByDate[dateKey];
  };

  const isToday = isSameDay(selectedDate, today);

  return (
    <div className="relative" ref={containerRef}>
      {/* 날짜 바 (트리거) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <CalendarIcon className="text-gray-600" size={20} />
        <span className="font-semibold text-gray-900">
          {month}월 {selectedDate.getDate()}일
        </span>
        <span className="text-gray-500">({DAY_NAMES[selectedDate.getDay()]})</span>
        {isToday && (
          <span className="px-2 py-0.5 bg-blue-50 text-[#3182F6] text-xs font-medium rounded-full">
            오늘
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 주간 드롭다운 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-slideDown">
          {/* 주차 헤더 + 월간 버튼 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevWeek}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-medium text-gray-700">
                {month}월 {weekOfMonth}주차
              </span>
              <button
                onClick={goToNextWeek}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* 월간 버튼 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenMonthly();
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <CalendarMonthIcon className="text-gray-500" size={16} />
              <span>월간</span>
            </button>
          </div>

          {/* 요일 그리드 */}
          <div className="px-4 py-3">
            {/* 요일 헤더 */}
            <div className="flex justify-between mb-2">
              {DAY_NAMES.map((day, i) => (
                <span
                  key={day}
                  className={`text-xs w-10 text-center ${i === 0 || i === 6 ? 'text-red-300' : 'text-gray-400'}`}
                >
                  {day}
                </span>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div className="flex justify-between">
              {weekDays.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const hasClassOnDay = hasClass(date);
                const notices = getNoticesForDate(date);
                // Stage 30: 휴일 상태
                const holidayStatus = getHolidayStatusForDate(date);
                const isHoliday = holidayStatus?.isHoliday && !holidayStatus?.hasException;

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      onDateChange(date);
                      setIsOpen(false);
                    }}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl min-w-[40px] transition-colors ${
                      isSelected
                        ? 'bg-[#3182F6] text-white'
                        : isHoliday
                        ? 'bg-red-50'
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        isSelected
                          ? 'text-white'
                          : isHoliday || isWeekend
                          ? 'text-red-400'
                          : 'text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {/* Stage 30: 휴일 이름 */}
                    {isHoliday && !isSelected && (
                      <span className="text-[9px] text-red-500 truncate max-w-[38px] leading-tight">
                        {holidayStatus?.holidayName?.slice(0, 3)}
                      </span>
                    )}
                    {/* 공지사항 점 표시 (Stage 13) - 최대 2개 */}
                    {notices.length > 0 ? (
                      <div className="flex gap-0.5 mt-1">
                        {notices.slice(0, 2).map((notice, idx) => {
                          // AdminNotice면 type별 색상, SimpleNotice면 주황색
                          const dotColor = isSelected
                            ? 'bg-white/70'
                            : isAdminNotice(notice)
                            ? NOTICE_TYPE_STYLES[notice.type].badgeBgColor
                            : 'bg-orange-400';
                          return (
                            <div
                              key={idx}
                              className={`w-1 h-1 rounded-full ${dotColor}`}
                            />
                          );
                        })}
                      </div>
                    ) : hasClassOnDay ? (
                      /* 기존 수업 점 표시 (호환) */
                      <div
                        className={`w-1 h-1 rounded-full mt-1 ${
                          isSelected ? 'bg-white' : 'bg-[#3182F6]'
                        }`}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease;
        }
      `}</style>
    </div>
  );
}

export default DateSelector;
