/**
 * ClassCard - 수업 카드 컴포넌트
 *
 * Stage 15: 캘린더 스타일 대시보드
 * - 지난 수업 / 오늘 수업 영역 분리 (배경색 구분)
 * - 캘린더와 동일한 둥근 모서리, 호버 효과
 * - 토스 디자인 철학 적용
 */

import { MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ClassScheduleDetail, ClassProgress, ClassHomework } from '../../../types/admin';

interface ClassCardProps {
  classDetail: ClassScheduleDetail;
  onClick?: () => void;
}

/**
 * 진도/숙제 표시 헬퍼
 */
function formatProgress(progress?: ClassProgress): string {
  if (!progress) return '-';
  return `${progress.bookName}_${progress.pageRange}`;
}

function formatHomework(homework?: ClassHomework): string {
  if (!homework) return '-';
  return `${homework.bookName}_${homework.pageRange} ${homework.problems}`;
}

/**
 * 지난/오늘 수업 섹션 컴포넌트
 */
interface TimeSlotSectionProps {
  type: 'last' | 'today';
  progress?: ClassProgress;
  homework?: ClassHomework;
}

function TimeSlotSection({ type, progress, homework }: TimeSlotSectionProps) {
  const isToday = type === 'today';

  // 스타일 결정
  const bgColor = isToday ? 'bg-toss-blueLight' : 'bg-grey-50';
  const labelColor = isToday ? 'text-toss-blue' : 'text-grey-400';
  const sublabelColor = isToday ? 'text-toss-blue/70' : 'text-grey-400';
  const contentColor = isToday ? 'text-grey-900 font-medium' : 'text-grey-700';

  const label = isToday ? '오늘 수업' : '지난 수업';
  const Icon = isToday ? ChevronRight : ChevronLeft;

  return (
    <div className={`${bgColor} rounded-xl p-3`}>
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3 h-3 ${labelColor}`} />
        <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
      </div>

      {/* 진도/숙제 정보 */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className={`text-xs ${sublabelColor} w-8 flex-shrink-0`}>진도</span>
          <span className={`text-sm ${contentColor} truncate`}>
            {formatProgress(progress)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-xs ${sublabelColor} w-8 flex-shrink-0`}>숙제</span>
          <span className={`text-sm ${contentColor} truncate`}>
            {formatHomework(homework)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 수업 카드 메인 컴포넌트
 */
export function ClassCard({ classDetail, onClick }: ClassCardProps) {
  const {
    name,
    teacherName,
    studentCount,
    lastProgress,
    lastHomework,
    todayProgress,
    todayHomework,
    memo,
    isCurrent,
  } = classDetail;

  // 현재 진행 중인 수업 강조
  const currentStyle = isCurrent
    ? 'ring-2 ring-toss-blue ring-inset bg-toss-blueLight/30'
    : '';

  return (
    <div
      className={`
        bg-white rounded-2xl p-4 cursor-pointer
        transition-all duration-200
        hover:bg-grey-50/50
        active:scale-[0.99]
        ${currentStyle}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* 헤더: 반 이름, 강사, 학생 수 */}
      <div className="mb-3">
        <h3 className="text-headline-sm text-grey-900">{name}</h3>
        <p className="text-body-sm text-grey-500">
          {teacherName} · {studentCount}명
        </p>
      </div>

      {/* 지난 수업 (회색 영역) */}
      <div className="mb-2">
        <TimeSlotSection
          type="last"
          progress={lastProgress}
          homework={lastHomework}
        />
      </div>

      {/* 오늘 수업 (파랑 영역) */}
      <div className="mb-3">
        <TimeSlotSection
          type="today"
          progress={todayProgress}
          homework={todayHomework}
        />
      </div>

      {/* 메모 */}
      {memo && (
        <div className="flex items-center gap-2 text-body-sm text-grey-600 px-1">
          <MessageSquare className="w-4 h-4 text-grey-400 flex-shrink-0" />
          <span className="truncate">{memo}</span>
        </div>
      )}
    </div>
  );
}
