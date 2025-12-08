/**
 * Button Component
 * Phase 21-A2: 토스 스타일 컴포넌트
 *
 * 토스 디자인 시스템 기반 버튼
 * - 클릭 시 scale(0.96) 애니메이션
 * - solid, outline, ghost, link 변형
 */
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // 기본 스타일
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-250 ease-toss-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]',
  {
    variants: {
      variant: {
        // 기본 변형
        solid:
          'bg-toss-blue text-white hover:bg-toss-blue-dark shadow-sm hover:shadow',
        outline:
          'border-2 border-toss-blue text-toss-blue bg-transparent hover:bg-toss-blue-light',
        ghost:
          'text-grey-700 hover:bg-grey-100',
        link:
          'text-toss-blue underline-offset-4 hover:underline p-0 h-auto',
        danger:
          'bg-error text-white hover:bg-red-600 shadow-sm',
        success:
          'bg-success text-white hover:bg-emerald-600 shadow-sm',
        // 호환성 별칭 (기존 코드 지원)
        primary:
          'bg-toss-blue text-white hover:bg-toss-blue-dark shadow-sm hover:shadow',
        secondary:
          'border border-grey-300 text-grey-700 bg-white hover:bg-grey-50',
        warning:
          'bg-warning text-white hover:bg-amber-600 shadow-sm',
      },
      size: {
        sm: 'h-9 px-3 text-body-sm rounded-sm',
        md: 'h-11 px-5 text-body rounded',
        lg: 'h-13 px-6 text-body-lg rounded-md',
        icon: 'h-10 w-10 rounded',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
