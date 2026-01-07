/**
 * ScheduleTimeline - 오늘 수업 일정 타임라인
 *
 * 목업: dashboard-modal-final.html 기준
 * - 날짜 섹션 타이틀
 * - 시간 + 도트 + 반 이름 형식
 * - "다음" 뱃지 (current 상태)
 */
import { CalendarIcon } from '../../ui/Icons';

type ScheduleStatus = 'completed' | 'current' | 'upcoming';

interface Schedule {
  id: string;
  time: string;       // "15:00"
  name: string;       // "중1C반 완료" 또는 "중3A반"
  status: ScheduleStatus;
}

interface ScheduleTimelineProps {
  schedules: Schedule[];
  onSelect: (id: string) => void;
}

export function ScheduleTimeline({ schedules, onSelect }: ScheduleTimelineProps) {
  if (schedules.length === 0) {
    return null;
  }

  // 오늘 날짜 포맷
  const today = new Date();
  const dateStr = today.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="mb-4">
      {/* 섹션 타이틀 */}
      <h3 className="text-sm font-semibold text-[#333D4B] mb-3 flex items-center gap-1.5">
        <CalendarIcon size={16} className="text-gray-600" />
        <span>{dateStr}</span>
      </h3>

      {/* 카드 */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {schedules.map((schedule) => (
          <ScheduleItem
            key={schedule.id}
            schedule={schedule}
            onClick={() => onSelect(schedule.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface ScheduleItemProps {
  schedule: Schedule;
  onClick: () => void;
}

function ScheduleItem({ schedule, onClick }: ScheduleItemProps) {
  const isCompleted = schedule.status === 'completed';
  const isCurrent = schedule.status === 'current';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center p-3 hover:bg-[#F9FAFB] transition-colors"
    >
      {/* 시간 */}
      <span
        className={`w-12 text-sm font-medium flex-shrink-0 ${
          isCurrent ? 'text-[#3182F6] font-semibold' : 'text-[#6B7684]'
        }`}
      >
        {schedule.time}
      </span>

      {/* 도트 */}
      <span
        className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
          isCurrent ? 'bg-[#3182F6]' : 'bg-[#B0B8C1]'
        }`}
      />

      {/* 반 이름 */}
      <span
        className={`text-sm flex-1 text-left ${
          isCompleted
            ? 'text-[#8B95A1] line-through'
            : 'text-[#191F28]'
        }`}
      >
        {schedule.name}
      </span>

      {/* 다음 뱃지 */}
      {isCurrent && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F2F6FC] text-[#3182F6] ml-auto">
          다음
        </span>
      )}
    </button>
  );
}
