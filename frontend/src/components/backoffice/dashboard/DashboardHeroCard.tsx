/**
 * DashboardHeroCard - 대시보드 그라디언트 히어로 카드
 *
 * 목업: dashboard-modal-final.html 기준
 * - 그라디언트 배경: #3182F6 → #2563eb
 * - "다음 수업 5분 후" 형식
 * - "17:00 - 19:00" 시간
 * - "중3A반 수학 | 학생 8명" 정보
 */
import { CheckIcon, NoteIcon } from '../../ui/Icons';
import { Clock } from 'lucide-react';

interface ClassInfo {
  name: string;          // "중3A반"
  subject: string;       // "수학"
  studentCount: number;  // 8
}

interface ScheduleInfo {
  startTime: string;     // "17:00"
  endTime: string;       // "19:00"
  minutesUntil: number;  // 5 (분 후 시작)
}

interface DashboardHeroCardProps {
  classInfo: ClassInfo;
  schedule: ScheduleInfo;
  onAttendance: () => void;
  onProgress: () => void;
}

export function DashboardHeroCard({
  classInfo,
  schedule,
  onAttendance,
  onProgress,
}: DashboardHeroCardProps) {
  return (
    <div
      className="rounded-2xl p-5 text-white mb-4"
      style={{ background: 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)' }}
    >
      {/* 라벨 */}
      <div className="text-xs opacity-80 mb-2 flex items-center gap-1.5">
        <Clock size={12} />
        <span>다음 수업 {schedule.minutesUntil}분 후</span>
      </div>

      {/* 시간 - 목업: "17:00 - 19:00" */}
      <div className="text-2xl font-bold mb-1">
        {schedule.startTime} - {schedule.endTime}
      </div>

      {/* 반 정보 - 목업: "중3A반 수학 | 학생 8명" */}
      <div className="text-sm opacity-90 mb-4">
        {classInfo.name} {classInfo.subject} | 학생 {classInfo.studentCount}명
      </div>

      {/* 액션 버튼 - 목업 스타일 */}
      <div className="flex gap-2">
        <button
          onClick={onAttendance}
          className="flex-1 py-2.5 px-4 rounded-[10px] bg-white text-[#3182F6] text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <CheckIcon size={16} />
          <span>출결 체크</span>
        </button>
        <button
          onClick={onProgress}
          className="flex-1 py-2.5 px-4 rounded-[10px] bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <NoteIcon size={16} />
          <span>진도 기록</span>
        </button>
      </div>
    </div>
  );
}

/**
 * NoClassHeroCard - 수업이 없을 때 표시
 */
export function NoClassHeroCard() {
  return (
    <div
      className="rounded-2xl p-5 text-white mb-4"
      style={{ background: 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)' }}
    >
      <div className="text-center py-4">
        <div className="text-3xl mb-2">☀️</div>
        <div className="text-lg font-semibold">오늘 수업이 없습니다</div>
        <div className="text-sm opacity-80 mt-1">편안한 하루 보내세요!</div>
      </div>
    </div>
  );
}
