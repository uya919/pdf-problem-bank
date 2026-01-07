/**
 * ClassCardGrid - 수업 카드 그리드 컴포넌트
 *
 * Stage 15: 캘린더 스타일 대시보드
 * - 반응형 그리드 레이아웃 (3열 기본, 4열 xl)
 * - 로딩/빈 상태 처리
 */

import { Calendar } from 'lucide-react';
import { ClassCard } from './ClassCard';
import type { ClassScheduleDetail } from '../../../types/admin';

interface ClassCardGridProps {
  classes: ClassScheduleDetail[];
  isLoading?: boolean;
  onCardClick?: (classId: string) => void;
}

/**
 * 로딩 스켈레톤 카드
 */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-4 animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="mb-3">
        <div className="h-6 bg-grey-100 rounded w-24 mb-2" />
        <div className="h-4 bg-grey-100 rounded w-20" />
      </div>

      {/* 지난 수업 스켈레톤 */}
      <div className="bg-grey-50 rounded-xl p-3 mb-2">
        <div className="h-3 bg-grey-100 rounded w-16 mb-2" />
        <div className="space-y-1.5">
          <div className="h-4 bg-grey-100 rounded w-32" />
          <div className="h-4 bg-grey-100 rounded w-28" />
        </div>
      </div>

      {/* 오늘 수업 스켈레톤 */}
      <div className="bg-grey-100 rounded-xl p-3 mb-3">
        <div className="h-3 bg-grey-200 rounded w-16 mb-2" />
        <div className="space-y-1.5">
          <div className="h-4 bg-grey-200 rounded w-32" />
          <div className="h-4 bg-grey-200 rounded w-28" />
        </div>
      </div>

      {/* 메모 스켈레톤 */}
      <div className="h-4 bg-grey-100 rounded w-40" />
    </div>
  );
}

/**
 * 빈 상태 컴포넌트
 */
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-grey-400">
      <Calendar className="w-12 h-12 mb-4" />
      <p className="text-body">오늘 예정된 수업이 없습니다</p>
    </div>
  );
}

/**
 * 수업 카드 그리드 메인 컴포넌트
 */
export function ClassCardGrid({
  classes,
  isLoading = false,
  onCardClick,
}: ClassCardGridProps) {
  // 로딩 상태
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // 빈 상태
  if (classes.length === 0) {
    return (
      <div className="grid grid-cols-1">
        <EmptyState />
      </div>
    );
  }

  // 수업 카드 그리드
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {classes.map((classDetail) => (
        <ClassCard
          key={classDetail.id}
          classDetail={classDetail}
          onClick={() => onCardClick?.(classDetail.id)}
        />
      ))}
    </div>
  );
}
