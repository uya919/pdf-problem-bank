/**
 * Badge Component
 * Phase 21-A2: 토스 스타일 컴포넌트
 *
 * 상태 표시 또는 레이블용 배지
 * - solid, subtle, outline 변형
 * - 난이도, 단원 표시에 활용
 */
import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors',
  {
    variants: {
      variant: {
        // 기본 변형
        solid: '',
        subtle: '',
        outline: 'bg-transparent border',
        // 호환성 별칭 (기존 코드 지원) - subtle 스타일 사용
        primary: '',
        secondary: '',
        success: '',
        warning: '',
        error: '',
        default: '',
      },
      colorScheme: {
        primary: '',
        success: '',
        warning: '',
        error: '',
        grey: '',
      },
      size: {
        sm: 'px-2 py-0.5 text-caption rounded-sm',
        md: 'px-2.5 py-1 text-body-sm rounded',
        lg: 'px-3 py-1.5 text-body rounded',
      },
    },
    compoundVariants: [
      // Solid variants
      { variant: 'solid', colorScheme: 'primary', className: 'bg-toss-blue text-white' },
      { variant: 'solid', colorScheme: 'success', className: 'bg-success text-white' },
      { variant: 'solid', colorScheme: 'warning', className: 'bg-warning text-white' },
      { variant: 'solid', colorScheme: 'error', className: 'bg-error text-white' },
      { variant: 'solid', colorScheme: 'grey', className: 'bg-grey-500 text-white' },

      // Subtle variants
      { variant: 'subtle', colorScheme: 'primary', className: 'bg-toss-blue-light text-toss-blue' },
      { variant: 'subtle', colorScheme: 'success', className: 'bg-success-light text-success' },
      { variant: 'subtle', colorScheme: 'warning', className: 'bg-warning-light text-warning' },
      { variant: 'subtle', colorScheme: 'error', className: 'bg-error-light text-error' },
      { variant: 'subtle', colorScheme: 'grey', className: 'bg-grey-100 text-grey-600' },

      // Outline variants
      { variant: 'outline', colorScheme: 'primary', className: 'border-toss-blue text-toss-blue' },
      { variant: 'outline', colorScheme: 'success', className: 'border-success text-success' },
      { variant: 'outline', colorScheme: 'warning', className: 'border-warning text-warning' },
      { variant: 'outline', colorScheme: 'error', className: 'border-error text-error' },
      { variant: 'outline', colorScheme: 'grey', className: 'border-grey-300 text-grey-600' },

      // 호환성 별칭 (기존 코드 지원)
      { variant: 'primary', className: 'bg-toss-blue-light text-toss-blue' },
      { variant: 'secondary', className: 'bg-grey-100 text-grey-600' },
      { variant: 'success', className: 'bg-success-light text-success' },
      { variant: 'warning', className: 'bg-warning-light text-warning' },
      { variant: 'error', className: 'bg-error-light text-error' },
      { variant: 'default', className: 'bg-grey-100 text-grey-600' },
    ],
    defaultVariants: {
      variant: 'subtle',
      colorScheme: 'primary',
      size: 'md',
    },
  }
);

// Omit 'color' to avoid conflict with HTMLSpanElement
export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'>,
    VariantProps<typeof badgeVariants> {
  /** @deprecated Use colorScheme instead */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'grey';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, colorScheme, color, size, ...props }, ref) => {
    // Support legacy 'color' prop
    const resolvedColorScheme = colorScheme ?? color;
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, colorScheme: resolvedColorScheme, size, className }))}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

// 난이도 배지 헬퍼
export function DifficultyBadge({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  const colors: Record<number, 'success' | 'warning' | 'error'> = {
    1: 'success',
    2: 'success',
    3: 'warning',
    4: 'error',
    5: 'error',
  };

  const labels: Record<number, string> = {
    1: '매우 쉬움',
    2: '쉬움',
    3: '보통',
    4: '어려움',
    5: '매우 어려움',
  };

  return (
    <Badge variant="subtle" colorScheme={colors[level]} size="sm">
      {labels[level]}
    </Badge>
  );
}

export { badgeVariants };
