/**
 * ClassGridView - 태블릿용 수업 카드 그리드
 *
 * 모바일 HeroCarousel의 태블릿 버전
 * - 2열 그리드 레이아웃 (3개 이상일 때 스크롤)
 * - 동일한 ClassSchedule 인터페이스 사용
 * - 동일한 액션 버튼 (출결, 진도)
 */
import type { ReactNode } from 'react';
import { CalendarIcon, NoteIcon, CheckIcon } from '../../ui/Icons';
import { Clock, Sun } from 'lucide-react';
import type { ClassSchedule, DayInfo } from '../dashboard/HeroCarousel';

interface ClassGridViewProps {
  classes: ClassSchedule[];
  onAttendance: (classId: string) => void;
  onProgress: (classId: string) => void;
  // 날짜 이동 관련 (옵션)
  prevDay?: DayInfo;
  nextDay?: DayInfo;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}

export function ClassGridView({
  classes,
  onAttendance,
  onProgress,
}: ClassGridViewProps) {
  // 수업이 없는 경우
  if (classes.length === 0) {
    return <NoClassCard />;
  }

  return (
    <div className="mb-4">
      {/* 섹션 타이틀 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px] font-semibold text-[#191F28]">
          오늘 수업
        </span>
        <span className="text-[13px] text-[#8B95A1]">{classes.length}개</span>
      </div>

      {/* 2열 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            classInfo={cls}
            onAttendance={() => onAttendance(cls.id)}
            onProgress={() => onProgress(cls.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ClassCard - 개별 수업 카드 (태블릿용)
 *
 * HeroCard와 동일한 디자인, 약간 컴팩트하게
 */
interface ClassCardProps {
  classInfo: ClassSchedule;
  onAttendance: () => void;
  onProgress: () => void;
}

function ClassCard({ classInfo, onAttendance, onProgress }: ClassCardProps) {
  const isCompleted = classInfo.status === 'completed';
  const isCurrent = classInfo.status === 'current';

  // 상태별 라벨
  const getStatusLabel = (): ReactNode => {
    if (isCompleted)
      return (
        <>
          <CheckIcon size={12} /> 수업 완료
        </>
      );
    if (isCurrent)
      return (
        <>
          <Clock size={12} /> 다음 수업
        </>
      );
    return (
      <>
        <CalendarIcon size={12} /> 예정된 수업
      </>
    );
  };

  // 상태별 배경 그라디언트
  const getBackground = () => {
    if (isCompleted) {
      return 'linear-gradient(135deg, #6B7684 0%, #4E5968 100%)';
    }
    return 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)';
  };

  return (
    <div
      className={`rounded-2xl p-4 text-white relative overflow-hidden ${
        isCurrent ? 'ring-2 ring-white/30 shadow-lg shadow-blue-500/30' : ''
      }`}
      style={{ background: getBackground() }}
    >
      {/* 상태 라벨 */}
      <div className="text-[11px] opacity-80 mb-2 flex items-center gap-1.5">
        <span>{getStatusLabel()}</span>
        {isCurrent && (
          <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">
            NOW
          </span>
        )}
      </div>

      {/* 시간 */}
      <div
        className={`text-xl font-bold mb-1 ${isCompleted ? 'opacity-70' : ''}`}
      >
        {classInfo.startTime} - {classInfo.endTime}
      </div>

      {/* 반 정보 */}
      <div
        className={`text-[13px] opacity-90 mb-3 ${isCompleted ? 'opacity-70' : ''}`}
      >
        {classInfo.name}
        {classInfo.subject && ` ${classInfo.subject}`}
        {classInfo.studentCount && ` | ${classInfo.studentCount}명`}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onAttendance}
          className={`flex-1 py-2 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isCompleted
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white text-[#3182F6] hover:bg-white/90'
          }`}
        >
          <span>{isCompleted ? '👁' : '✓'}</span>
          <span>{isCompleted ? '출결 보기' : '출결 체크'}</span>
        </button>
        <button
          onClick={onProgress}
          className={`flex-1 py-2 px-3 rounded-[10px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isCompleted
              ? 'bg-white/10 text-white/70 hover:bg-white/20'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          <NoteIcon size={14} />
          <span>{isCompleted ? '기록 보기' : '진도 기록'}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * NoClassCard - 수업 없음 카드 (태블릿용)
 */
function NoClassCard() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px] font-semibold text-[#191F28]">
          오늘 수업
        </span>
      </div>
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)',
        }}
      >
        <Sun size={40} className="mb-3 opacity-90" />
        <div className="text-lg font-bold mb-1">오늘 수업이 없습니다</div>
        <div className="text-[13px] opacity-80">편안한 하루 보내세요!</div>
      </div>
    </div>
  );
}

export default ClassGridView;
