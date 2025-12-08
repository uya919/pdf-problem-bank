/**
 * Card Component
 * Phase 21-A2: 토스 스타일 컴포넌트
 *
 * 토스 디자인 시스템 기반 카드
 * - 부드러운 그림자
 * - 호버 시 그림자 확대
 */
import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-md bg-white transition-all duration-250',
  {
    variants: {
      variant: {
        default: 'shadow-sm hover:shadow',
        elevated: 'shadow hover:shadow-md',
        outline: 'border border-grey-200 hover:border-grey-300',
        ghost: 'bg-grey-50 hover:bg-grey-100',
        interactive:
          'shadow-sm hover:shadow-md hover:scale-[1.01] cursor-pointer active:scale-[0.99]',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, className }))}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card 하위 컴포넌트
export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-headline-sm text-grey-900', className)}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-body-sm text-grey-500', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-body text-grey-700', className)} {...props} />
));

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-grey-100', className)}
    {...props}
  />
));

CardFooter.displayName = 'CardFooter';

export { cardVariants };
