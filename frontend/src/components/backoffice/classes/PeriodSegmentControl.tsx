/**
 * PeriodSegmentControl - 기간 선택 세그먼트 컨트롤
 *
 * 목업: classes-page-v3-segment-control.html
 * - 2회/3회/5회/월간 선택
 * - 미니 사이즈 (높이 28px)
 * - 1탭 = 1액션 원칙
 */

export type PeriodType = '2회' | '3회' | '5회' | '월간';

interface PeriodSegmentControlProps {
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  onOpenMonthly?: () => void;
  className?: string;
}

const PERIODS: PeriodType[] = ['2회', '3회', '5회', '월간'];

export function PeriodSegmentControl({
  selectedPeriod,
  onPeriodChange,
  onOpenMonthly,
  className = '',
}: PeriodSegmentControlProps) {
  const handleClick = (period: PeriodType) => {
    if (period === '월간' && onOpenMonthly) {
      onOpenMonthly();
    }
    onPeriodChange(period);
  };

  return (
    <div
      className={`inline-flex bg-[#F2F4F6] rounded-md p-0.5 ${className}`}
    >
      {PERIODS.map((period) => (
        <button
          key={period}
          onClick={() => handleClick(period)}
          className={`
            px-2 py-1 rounded text-xs font-medium min-w-[36px] text-center
            transition-all duration-200
            ${
              selectedPeriod === period
                ? 'bg-[#191F28] text-white shadow-sm'
                : 'text-[#6B7684] hover:bg-[#E5E8EB]'
            }
          `}
        >
          {period}
        </button>
      ))}
    </div>
  );
}

export default PeriodSegmentControl;
