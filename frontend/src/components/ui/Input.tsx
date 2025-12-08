/**
 * Input Component
 * Phase 21-A2: 토스 스타일 컴포넌트
 *
 * 토스 디자인 시스템 기반 입력 필드
 * - 라벨, 헬퍼 텍스트, 에러 메시지 지원
 * - 포커스 시 toss-blue 링 효과
 */
import { forwardRef, InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'w-full bg-white border text-grey-900 placeholder:text-grey-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-toss-blue focus:border-transparent disabled:bg-grey-50 disabled:cursor-not-allowed',
  {
    variants: {
      inputSize: {
        sm: 'h-9 px-3 text-body-sm rounded-sm',
        md: 'h-11 px-4 text-body rounded',
        lg: 'h-13 px-5 text-body-lg rounded-md',
      },
      state: {
        default: 'border-grey-200 hover:border-grey-300',
        error: 'border-error focus:ring-error',
        success: 'border-success focus:ring-success',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, state, label, helperText, errorMessage, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!errorMessage;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-sm font-medium text-grey-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            inputVariants({ inputSize, state: hasError ? 'error' : state, className })
          )}
          ref={ref}
          {...props}
        />
        {(helperText || errorMessage) && (
          <p className={cn(
            'mt-1.5 text-caption',
            hasError ? 'text-error' : 'text-grey-500'
          )}>
            {errorMessage || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { inputVariants };

// 검색 입력 필드
export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-grey-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <Input
          ref={ref}
          type="search"
          className={cn('pl-10', className)}
          placeholder="검색..."
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
