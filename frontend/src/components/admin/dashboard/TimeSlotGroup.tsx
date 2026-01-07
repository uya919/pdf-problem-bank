/**
 * TimeSlotGroup - 시간대별 수업 그룹 컴포넌트
 *
 * Stage 15: Supabase 연동
 * - 동일 시간대 수업을 묶어서 표시
 * - 레벨별 정렬 (심화 → 정규 → 기초)
 * - 시간대 헤더 + 카드 그리드
 */

import { Clock } from 'lucide-react';
import { ClassCard } from './ClassCard';
import type { TimeSlotGroup as TimeSlotGroupType } from '../../../types/admin';

interface TimeSlotGroupProps {
  group: TimeSlotGroupType;
  onCardClick?: (classId: string) => void;
}

/**
 * 시간대별 수업 그룹 컴포넌트
 */
export function TimeSlotGroup({ group, onCardClick }: TimeSlotGroupProps) {
  const { timeSlot, classCount, classes } = group;

  // 현재 진행 중인 수업이 있는지 확인
  const hasCurrentClass = classes.some((c) => c.isCurrent);

  return (
    <div className="mb-6 last:mb-0">
      {/* 시간대 헤더 */}
      <div className="flex items-center gap-3 mb-3">
        {/* 시간대 아이콘 + 텍스트 */}
        <div className="flex items-center gap-2">
          <div
            className={`
              w-2 h-2 rounded-full
              ${hasCurrentClass ? 'bg-toss-blue animate-pulse' : 'bg-grey-300'}
            `}
          />
          <Clock
            className={`w-4 h-4 ${hasCurrentClass ? 'text-toss-blue' : 'text-grey-400'}`}
          />
          <span
            className={`
              text-headline-sm
              ${hasCurrentClass ? 'text-toss-blue' : 'text-grey-700'}
            `}
          >
            {timeSlot}
          </span>
        </div>

        {/* 수업 수 뱃지 */}
        <span className="text-body-sm text-grey-400">
          {classCount}개 수업
        </span>
      </div>

      {/* 수업 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {classes.map((classDetail) => (
          <ClassCard
            key={classDetail.id}
            classDetail={classDetail}
            onClick={() => onCardClick?.(classDetail.id)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 시간대별 그룹 목록 컴포넌트
 */
interface TimeSlotGroupListProps {
  groups: TimeSlotGroupType[];
  isLoading?: boolean;
  onCardClick?: (classId: string) => void;
}

/**
 * 로딩 스켈레톤
 */
function SkeletonTimeSlotGroup() {
  return (
    <div className="mb-6">
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-5 bg-grey-100 rounded w-32 animate-pulse" />
        <div className="h-4 bg-grey-100 rounded w-16 animate-pulse" />
      </div>

      {/* 카드 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
            <div className="h-6 bg-grey-100 rounded w-24 mb-2" />
            <div className="h-4 bg-grey-100 rounded w-20 mb-3" />
            <div className="bg-grey-50 rounded-xl p-3 mb-2">
              <div className="h-3 bg-grey-100 rounded w-16 mb-2" />
              <div className="h-4 bg-grey-100 rounded w-32" />
            </div>
            <div className="bg-grey-100 rounded-xl p-3">
              <div className="h-3 bg-grey-200 rounded w-16 mb-2" />
              <div className="h-4 bg-grey-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 빈 상태
 */
function EmptyState({ dateText }: { dateText?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-grey-400">
      <Clock className="w-12 h-12 mb-4" />
      <p className="text-body">
        {dateText ? `${dateText}에` : '오늘'} 예정된 수업이 없습니다
      </p>
    </div>
  );
}

export function TimeSlotGroupList({
  groups,
  isLoading = false,
  onCardClick,
}: TimeSlotGroupListProps) {
  // 로딩 상태
  if (isLoading) {
    return (
      <div>
        <SkeletonTimeSlotGroup />
        <SkeletonTimeSlotGroup />
      </div>
    );
  }

  // 빈 상태
  if (groups.length === 0) {
    return <EmptyState />;
  }

  // 시간대별 그룹 목록
  return (
    <div>
      {groups.map((group) => (
        <TimeSlotGroup
          key={group.timeSlot}
          group={group}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
