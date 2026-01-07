/**
 * MonthlyCalendarModal - 월간 캘린더 모달
 *
 * 기능:
 * - 7x5 월간 캘린더 그리드
 * - 수업 있는 날 점 표시
 * - 이전/다음 월 네비게이션
 * - 바텀시트 형태
 */
import { useState, useEffect } from 'react';
import { useIsTablet } from '../../../hooks/useIsMobile';

/** 간단한 공지 타입 (태블릿/모바일 공용) */
interface SimpleNotice {
  id: string;
  title: string;
  description?: string;
  time?: string;
  /** 공지 유형 (Phase 28-B: 중요공지 색상 표시용) */
  type?: 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation';
}

/** 공지 유형별 점 색상 */
function getNoticeDotColor(notice: SimpleNotice): string {
  if (notice.type) {
    if (notice.type === 'urgent' || notice.type === 'absence') return 'bg-red-500';
    if (notice.type === 'holiday') return 'bg-orange-500';
  }
  return 'bg-orange-400';
}

/** 날짜별 공지 맵 */
type NoticesByDate = Record<string, SimpleNotice[]>;

interface MonthlyCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  /** 수업이 있는 날짜들 */
  classScheduleDates?: Date[];
  /** 날짜별 공지사항 (Stage 13 확장) */
  noticesByDate?: NoticesByDate;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 월의 첫째 날과 마지막 날 반환
 */
function getMonthBoundaries(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { firstDay, lastDay };
}

/**
 * 캘린더 그리드용 날짜 배열 생성 (이전/다음 달 포함)
 * 일요일 시작 기준 (일~토)
 */
function getCalendarDays(year: number, month: number): (Date | null)[] {
  const { firstDay, lastDay } = getMonthBoundaries(year, month);
  const days: (Date | null)[] = [];

  // 첫째 날의 요일 (일요일 = 0 기준, 그대로 사용)
  const startDay = firstDay.getDay();

  // 이전 달 날짜들
  const prevMonth = new Date(year, month, 0);
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonth.getDate() - i);
    days.push(d);
  }

  // 현재 달 날짜들
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // 다음 달 날짜들 (6주 채우기)
  const remaining = 42 - days.length; // 6주 * 7일
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
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

/**
 * 두 날짜가 같은 달인지 비교
 */
function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

/** 날짜를 'YYYY-MM-DD' 형식으로 변환 */
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function MonthlyCalendarModal({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  classScheduleDates = [],
  noticesByDate = {},
}: MonthlyCalendarModalProps) {
  const [viewDate, setViewDate] = useState(selectedDate);
  const today = new Date();
  const isTablet = useIsTablet();

  // 모달 열릴 때 선택된 날짜의 월로 설정
  useEffect(() => {
    if (isOpen) {
      setViewDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const calendarDays = getCalendarDays(viewDate.getFullYear(), viewDate.getMonth());

  // 이전/다음 달 이동
  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // 날짜에 수업이 있는지 확인
  const hasClass = (date: Date) => {
    return classScheduleDates.some((d) => isSameDay(d, date));
  };

  // 날짜의 공지사항 가져오기
  const getNoticesForDate = (date: Date): SimpleNotice[] => {
    const dateKey = formatDateKey(date);
    return noticesByDate[dateKey] || [];
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] bg-white rounded-t-3xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 월 헤더 */}
        <div className="flex items-center justify-between px-5 py-2">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-lg">
            {viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월
          </span>
          <button
            onClick={goToNextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 px-5 py-2">
          {DAY_NAMES.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs py-2 ${
                i === 0 || i === 6 ? 'text-red-300' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 px-5 pb-6">
          {calendarDays.map((date, index) => {
            if (!date) return <div key={index} />;

            const isCurrentMonth = isSameMonth(date, viewDate);
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isSameDay(date, today);
            const hasClassOnDay = hasClass(date);
            const notices = getNoticesForDate(date);
            const hasNotices = notices.length > 0;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#3182F6] text-white'
                    : isTodayDate
                    ? 'bg-blue-50 text-[#3182F6] font-medium'
                    : isCurrentMonth
                    ? isWeekend
                      ? 'text-red-400 hover:bg-gray-100'
                      : 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300'
                }`}
              >
                <span>{date.getDate()}</span>
                {/* 공지사항 표시 - Phase 28-B: 반응형 (모바일=점, 태블릿=텍스트) */}
                {isCurrentMonth && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5 min-h-[16px]">
                    {hasNotices ? (
                      isTablet ? (
                        // 태블릿: 텍스트 표시 (1개 + +N)
                        <>
                          {notices.slice(0, 1).map((notice, i) => (
                            <div key={i} className="flex items-center gap-0.5 max-w-full px-0.5">
                              <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isSelected ? 'bg-white' : getNoticeDotColor(notice)}`} />
                              <span className={`text-[8px] truncate leading-tight ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                                {notice.title.length > 6 ? notice.title.slice(0, 6) + '..' : notice.title}
                              </span>
                            </div>
                          ))}
                          {notices.length > 1 && (
                            <span className={`text-[8px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                              +{notices.length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        // 모바일: 점 표시 (최대 2개)
                        <div className="flex gap-0.5">
                          {notices.slice(0, 2).map((notice, i) => (
                            <div
                              key={i}
                              className={`w-1 h-1 rounded-full ${
                                isSelected ? 'bg-white' : getNoticeDotColor(notice)
                              }`}
                            />
                          ))}
                        </div>
                      )
                    ) : hasClassOnDay ? (
                      // 수업 점
                      <div
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-[#3182F6]'
                        }`}
                      />
                    ) : null}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-center gap-4 px-5 pb-6 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#3182F6]" />
            <span>수업</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span>공지</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-lg bg-[#3182F6]" />
            <span>선택됨</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease;
        }
      `}</style>
    </div>
  );
}

export default MonthlyCalendarModal;
