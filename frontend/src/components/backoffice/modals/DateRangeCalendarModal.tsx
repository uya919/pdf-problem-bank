/**
 * DateRangeCalendarModal - 기간 선택 캘린더 모달
 *
 * 기능:
 * - 시작일 ~ 종료일 범위 선택
 * - 프리셋 버튼 (이번 주, 지난 주, 이번 달, 지난 달)
 * - 범위 하이라이트
 * - 적용/초기화 버튼
 */
import { useState, useEffect, useMemo } from 'react';
import {
  isSameDay,
  isSameMonth,
  isInRange,
  getCalendarDays,
  formatDateWithDay,
  getCurrentWeekRange,
  getLastWeekRange,
  getCurrentMonthRange,
  getLastMonthRange,
} from '../../../utils/dateUtils';

interface DateRangeCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStart?: Date | null;
  initialEnd?: Date | null;
  onRangeSelect: (start: Date, end: Date) => void;
  classScheduleDates?: Date[];
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface Preset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

const PRESETS: Preset[] = [
  { label: '이번 주', getRange: getCurrentWeekRange },
  { label: '지난 주', getRange: getLastWeekRange },
  { label: '이번 달', getRange: getCurrentMonthRange },
  { label: '지난 달', getRange: getLastMonthRange },
];

export function DateRangeCalendarModal({
  isOpen,
  onClose,
  initialStart,
  initialEnd,
  onRangeSelect,
  classScheduleDates = [],
}: DateRangeCalendarModalProps) {
  // 임시 선택값
  const [tempStart, setTempStart] = useState<Date | null>(initialStart ?? null);
  const [tempEnd, setTempEnd] = useState<Date | null>(initialEnd ?? null);

  // 캘린더 보기 월
  const [viewDate, setViewDate] = useState(initialStart ?? new Date());

  const today = new Date();

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setTempStart(initialStart ?? null);
      setTempEnd(initialEnd ?? null);
      setViewDate(initialStart ?? new Date());
    }
  }, [isOpen, initialStart, initialEnd]);

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

  // 캘린더 날짜 배열
  const calendarDays = useMemo(
    () => getCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    // Case 1: 아무것도 선택 안됨 → 시작일 설정
    if (!tempStart) {
      setTempStart(date);
      setTempEnd(null);
      return;
    }

    // Case 2: 시작일만 있음 → 종료일 설정
    if (tempStart && !tempEnd) {
      if (date < tempStart) {
        // 시작일보다 이전 → 시작일 재설정
        setTempStart(date);
      } else if (isSameDay(date, tempStart)) {
        // 같은 날 클릭 → 당일만 선택
        setTempEnd(date);
      } else {
        // 이후 날짜 → 종료일 설정
        setTempEnd(date);
      }
      return;
    }

    // Case 3: 둘 다 있음 → 초기화 후 새로 시작
    setTempStart(date);
    setTempEnd(null);
  };

  // 프리셋 클릭 핸들러
  const handlePresetClick = (preset: Preset) => {
    const { start, end } = preset.getRange();
    setTempStart(start);
    setTempEnd(end);
    setViewDate(start);
  };

  // 프리셋 활성화 여부 확인
  const isPresetActive = (preset: Preset): boolean => {
    if (!tempStart || !tempEnd) return false;
    const { start, end } = preset.getRange();
    return isSameDay(tempStart, start) && isSameDay(tempEnd, end);
  };

  // 적용 버튼
  const handleApply = () => {
    if (tempStart && tempEnd) {
      onRangeSelect(tempStart, tempEnd);
      onClose();
    }
  };

  // 초기화 버튼
  const handleReset = () => {
    setTempStart(null);
    setTempEnd(null);
  };

  // 이전/다음 월 이동
  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // 수업 있는 날인지 확인
  const hasClass = (date: Date) => {
    return classScheduleDates.some((d) => isSameDay(d, date));
  };

  // 날짜 스타일 결정
  const getDateStyle = (date: Date) => {
    const isStart = tempStart && isSameDay(date, tempStart);
    const isEnd = tempEnd && isSameDay(date, tempEnd);
    const inRange = tempStart && tempEnd && isInRange(date, tempStart, tempEnd);
    const isCurrentMonth = isSameMonth(date, viewDate);
    const isTodayDate = isSameDay(date, today);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // 범위 배경 (시작~종료 사이)
    let bgClass = '';
    if (inRange && !isStart && !isEnd) {
      bgClass = 'bg-[#E8F4FF]';
    }

    // 시작일/종료일 스타일
    if (isStart && isEnd) {
      // 단일 날짜 선택
      return `bg-[#3182F6] text-white rounded-xl ${bgClass}`;
    }
    if (isStart) {
      return `bg-[#3182F6] text-white rounded-l-xl ${inRange ? 'rounded-r-none' : 'rounded-xl'}`;
    }
    if (isEnd) {
      return `bg-[#3182F6] text-white rounded-r-xl ${inRange ? 'rounded-l-none' : 'rounded-xl'}`;
    }

    // 범위 내
    if (inRange) {
      return 'bg-[#E8F4FF] text-[#3182F6]';
    }

    // 오늘
    if (isTodayDate && isCurrentMonth) {
      return 'bg-blue-50 text-[#3182F6] font-medium rounded-xl';
    }

    // 현재 월 여부
    if (!isCurrentMonth) {
      return 'text-gray-300';
    }

    // 주말
    if (isWeekend) {
      return 'text-red-400 hover:bg-gray-100 rounded-xl';
    }

    return 'text-gray-700 hover:bg-gray-100 rounded-xl';
  };

  if (!isOpen) return null;

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

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-2">
          <span className="font-semibold text-lg">기간 선택</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 프리셋 버튼 */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isPresetActive(preset)
                  ? 'bg-[#3182F6] text-white'
                  : 'bg-[#F2F4F6] text-[#6B7684] hover:bg-[#E5E8EB]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 선택된 범위 표시 */}
        <div className="px-5 py-3 bg-[#FAFBFC]">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="text-center">
              <div className="text-[10px] text-[#8B95A1] mb-0.5">시작</div>
              <div className={`font-medium ${tempStart ? 'text-[#191F28]' : 'text-[#B0B8C1]'}`}>
                {tempStart ? formatDateWithDay(tempStart) : '--/-- (--)'}
              </div>
            </div>
            <div className="text-[#B0B8C1]">→</div>
            <div className="text-center">
              <div className="text-[10px] text-[#8B95A1] mb-0.5">종료</div>
              <div className={`font-medium ${tempEnd ? 'text-[#191F28]' : 'text-[#B0B8C1]'}`}>
                {tempEnd ? formatDateWithDay(tempEnd) : '--/-- (--)'}
              </div>
            </div>
          </div>
          {!tempStart && (
            <div className="text-center text-xs text-[#8B95A1] mt-2">
              시작일을 선택하세요
            </div>
          )}
          {tempStart && !tempEnd && (
            <div className="text-center text-xs text-[#3182F6] mt-2">
              종료일을 선택하세요
            </div>
          )}
        </div>

        {/* 월 헤더 */}
        <div className="flex items-center justify-between px-5 py-3">
          <button
            onClick={goToPrevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-semibold text-base">
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
        <div className="grid grid-cols-7 px-5 py-1">
          {DAY_NAMES.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs py-1 ${
                i === 0 || i === 6 ? 'text-red-300' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-1 px-5 pb-4">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, viewDate);
            const hasClassOnDay = hasClass(date);
            const isStart = tempStart && isSameDay(date, tempStart);
            const isEnd = tempEnd && isSameDay(date, tempEnd);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(date)}
                className={`aspect-square flex flex-col items-center justify-center text-sm transition-colors ${getDateStyle(date)}`}
              >
                <span>{date.getDate()}</span>
                {hasClassOnDay && isCurrentMonth && (
                  <div
                    className={`w-1 h-1 rounded-full mt-0.5 ${
                      isStart || isEnd ? 'bg-white' : 'bg-[#3182F6]'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 px-5 pb-6">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl border border-[#E5E8EB] text-[#6B7684] font-medium text-sm hover:bg-[#F9FAFB]"
          >
            초기화
          </button>
          <button
            onClick={handleApply}
            disabled={!tempStart || !tempEnd}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${
              tempStart && tempEnd
                ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'
                : 'bg-[#E5E8EB] text-[#B0B8C1] cursor-not-allowed'
            }`}
          >
            적용하기
          </button>
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

export default DateRangeCalendarModal;
