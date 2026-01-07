/**
 * HolidayHeroCard - 휴강일 히어로 카드
 *
 * Stage 30: 공휴일 자동 휴강 시스템
 *
 * 공휴일/휴강일에 표시되는 카드
 * - 공휴일명 + 이모지
 * - 회색 그라데이션 배경
 */
import { getHolidayEmoji } from '../../../hooks/useHolidays';

interface HolidayHeroCardProps {
  /** 공휴일/휴강일 이름 */
  holidayName: string;
  /** 선택된 날짜 */
  date?: Date;
}

export function HolidayHeroCard({ holidayName, date }: HolidayHeroCardProps) {
  const emoji = getHolidayEmoji(holidayName);

  // 날짜 포맷 (예: 12월 25일 수요일)
  const dateStr = date
    ? `${date.getMonth() + 1}월 ${date.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}요일`
    : '';

  return (
    <div
      className="rounded-2xl p-5 text-white mb-4"
      style={{ background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)' }}
    >
      <div className="text-center py-4">
        {/* 이모지 */}
        <div className="text-4xl mb-3">{emoji}</div>

        {/* 공휴일명 */}
        <div className="text-xl font-bold mb-1">{holidayName}</div>

        {/* 날짜 (선택적) */}
        {dateStr && (
          <div className="text-sm opacity-70 mb-3">{dateStr}</div>
        )}

        {/* 안내 메시지 */}
        <div className="text-sm opacity-80">
          오늘은 휴강입니다. 편안한 하루 보내세요!
        </div>
      </div>
    </div>
  );
}

export default HolidayHeroCard;
