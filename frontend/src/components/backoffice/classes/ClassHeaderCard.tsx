/**
 * ClassHeaderCard - 반 정보 + 기간 선택 통합 헤더
 *
 * 목업: classes-page-v3-segment-control.html (방안 C)
 * - 행 1: 반 이름 + 세그먼트 컨트롤
 * - 행 2: 과목/시간 + 날짜 범위
 * - 높이: ~56px
 */
import { PeriodSegmentControl, PeriodType } from './PeriodSegmentControl';

interface ClassHeaderCardProps {
  className: string;
  subject: string;
  schedule: string;
  selectedPeriod: PeriodType;
  dateRange: string;
  onPeriodChange: (period: PeriodType) => void;
  onOpenMonthly: () => void;
}

export function ClassHeaderCard({
  className,
  subject,
  schedule,
  selectedPeriod,
  dateRange,
  onPeriodChange,
  onOpenMonthly,
}: ClassHeaderCardProps) {
  return (
    <div className="bg-white mx-4 mt-4 rounded-2xl border border-[#E5E8EB] overflow-hidden">
      <div className="px-4 py-3">
        {/* 행 1: 반 이름 + 세그먼트 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#191F28]">{className}</h2>
          <PeriodSegmentControl
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
            onOpenMonthly={onOpenMonthly}
          />
        </div>

        {/* 행 2: 과목/시간 + 날짜 범위 */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-[#8B95A1]">
            {subject} · {schedule}
          </span>
          <span className="text-xs text-[#8B95A1]">{dateRange}</span>
        </div>
      </div>
    </div>
  );
}

export default ClassHeaderCard;
