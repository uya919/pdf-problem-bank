/**
 * CalendarDayCell - 주간 캘린더 날짜 셀
 *
 * Stage 13-B: 토스 UX 철학 리디자인
 * - 중앙 정렬 레이아웃
 * - 오늘: 원형 파란 배경 + 펄스 애니메이션
 * - 공지: 뱃지 스타일 (색상별)
 * - active: scale 피드백
 *
 * Stage 14: 순환수업 마커 추가
 * - 순환수업 요일: 보라색 점
 * - 순환수업 휴일: 빨간색 X
 *
 * Stage 17-B: 중요 공지 미리보기
 * - isImportant=true 공지는 날짜 셀에 제목 일부 표시
 *
 * Stage 33: 등원 예정 표시
 * - 등원 예정 학생이 있으면 초록색 점 + 이름 일부 표시
 */

import { RefreshCw } from 'lucide-react';
import type { CalendarDay, Notice } from '../../../types/admin';
import { NOTICE_TYPE_STYLES } from '../../../types/admin';

interface CalendarDayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onClick: () => void;
  isRotationDay?: boolean;
  isRotationHoliday?: boolean;
  /** 중요 공지 목록 (우선순위 정렬됨, 최대 2개 + overflow) */
  importantNotices?: Notice[];
}

/** 공지 유형별 아이콘 */
const NOTICE_TYPE_ICONS: Record<string, string> = {
  urgent: '🚨',
  enrollment: '🆕',
  absence: '❌',
  holiday: '🏖️',
  exam: '📝',
  special: '⭐',
  event: '📣',
  operation: '⚙️',
};

export function CalendarDayCell({
  day,
  isSelected,
  onClick,
  isRotationDay = false,
  isRotationHoliday = false,
  importantNotices = [],
}: CalendarDayCellProps) {
  const { date, dayName, isToday, isWeekend, notices } = day;
  const dayNumber = date.getDate();

  // 중요 공지 최대 2개 표시 + overflow
  const visibleImportant = importantNotices.slice(0, 2);
  const overflowCount = importantNotices.length - 2;

  // 요일 텍스트 색상
  const dayTextColor = isToday
    ? 'text-toss-blue font-medium'
    : isWeekend
    ? 'text-grey-300'
    : 'text-grey-400';

  // 날짜 숫자 색상
  const numberTextColor = isWeekend ? 'text-grey-400' : 'text-grey-700';

  // 셀 배경
  const cellBg = isToday
    ? 'bg-toss-blueLight'
    : isSelected
    ? 'ring-2 ring-toss-blue ring-inset'
    : '';

  // 공지 최대 2개
  const visibleNotices = notices.slice(0, 2);

  return (
    <div
      className={`
        rounded-2xl p-3 cursor-pointer transition-all min-h-[100px]
        active:scale-[0.98]
        ${cellBg}
        ${!isToday && !isSelected ? 'hover:bg-grey-50' : ''}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* 날짜 (중앙 정렬) */}
      <div className="text-center mb-2">
        <div className={`text-xs mb-1 ${dayTextColor}`}>{dayName}</div>

        {isToday ? (
          // 오늘: 원형 배경 + 펄스 애니메이션
          <div className="inline-flex items-center justify-center w-10 h-10 bg-toss-blue rounded-full animate-pulse-soft">
            <span className="text-xl font-bold text-white">{dayNumber}</span>
          </div>
        ) : (
          // 일반 날짜
          <span className={`text-xl font-semibold ${numberTextColor}`}>
            {dayNumber}
          </span>
        )}
      </div>

      {/* 공지 뱃지 */}
      {visibleNotices.length > 0 && (
        <div className="space-y-1.5">
          {visibleNotices.map((notice) => (
            <div key={notice.id} className="flex justify-center">
              <div className={`px-2.5 py-1 rounded-lg ${NOTICE_TYPE_STYLES[notice.type].badgeBgColor}`}>
                <span className={`text-xs font-medium ${NOTICE_TYPE_STYLES[notice.type].badgeTextColor}`}>
                  {notice.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* +N개 더 */}
      {notices.length > 2 && (
        <div className="text-center text-[10px] text-grey-400 mt-1">
          +{notices.length - 2}개 더
        </div>
      )}

      {/* Stage 14: 순환수업 마커 */}
      {isRotationDay && (
        <div className="flex justify-center mt-2">
          {isRotationHoliday ? (
            // 휴일: 빨간색 X 표시
            <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 rounded text-xs text-red-500">
              <RefreshCw className="w-3 h-3" />
              <span className="line-through">순환</span>
            </div>
          ) : (
            // 정상 순환수업: 보라색 표시
            <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded text-xs text-purple-600">
              <RefreshCw className="w-3 h-3" />
              <span>순환</span>
            </div>
          )}
        </div>
      )}

      {/* 중요 공지 미리보기 (최대 2개 + overflow) */}
      {visibleImportant.length > 0 && (
        <div className="mt-2 px-1 space-y-1">
          {visibleImportant.map((notice) => {
            const style = NOTICE_TYPE_STYLES[notice.type];
            const icon = NOTICE_TYPE_ICONS[notice.type] || '📌';
            const preview = notice.title.length > 8
              ? notice.title.slice(0, 8) + '...'
              : notice.title;

            return (
              <div
                key={notice.id}
                className={`flex items-center gap-1 text-[10px] ${style.textColor} ${style.bgColor} rounded px-1.5 py-0.5`}
              >
                <span>{icon}</span>
                <span className="truncate">{preview}</span>
              </div>
            );
          })}
          {overflowCount > 0 && (
            <div className="text-[10px] text-grey-400 px-1.5">
              +{overflowCount}개
            </div>
          )}
        </div>
      )}
    </div>
  );
}
