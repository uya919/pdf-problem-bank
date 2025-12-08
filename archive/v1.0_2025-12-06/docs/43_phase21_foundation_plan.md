# Phase 21: Foundation Layer - 상세 구현 계획

**작성일**: 2025-12-02
**목적**: 토스 스타일 UI 시스템 구축
**예상 소요**: 7-11일

---

## 개요

### 목표
```
현재 UI → 토스 스타일 디자인 시스템 적용
         → 일관된 컴포넌트 라이브러리 구축
         → 부드러운 애니메이션 시스템 적용
```

### 모듈 구성
| 모듈 | 내용 | 소요 | 의존성 |
|------|------|------|--------|
| A-1 | 디자인 시스템 (토큰, 설정) | 2-3일 | 없음 |
| A-2 | 공통 컴포넌트 | 3-5일 | A-1 |
| A-3 | 애니메이션 시스템 | 2-3일 | A-1, A-2 |

---

## A-1: 토스 스타일 디자인 시스템

### Step 1: Tailwind CSS 설정 업데이트
**파일**: `frontend/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // 토스 컬러 시스템
      colors: {
        toss: {
          blue: '#3182F6',
          'blue-light': '#E8F3FF',
          'blue-dark': '#1B64DA',
        },
        grey: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },

      // 타이포그래피
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },

      // 4px 그리드 스페이싱
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },

      // 토스 스타일 모서리
      borderRadius: {
        'sm': '8px',
        'DEFAULT': '12px',
        'md': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '32px',
      },

      // 그림자
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'xl': '0 16px 48px rgba(0, 0, 0, 0.16)',
      },

      // 애니메이션 (A-3에서 확장)
      transitionTimingFunction: {
        'toss': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
    },
  },
  plugins: [],
}

export default config
```

**체크리스트**:
- [ ] tailwind.config.ts 업데이트
- [ ] 기존 하드코딩된 색상 제거

---

### Step 2: CSS 변수 정의
**파일**: `frontend/src/styles/tokens.css`

```css
@layer base {
  :root {
    /* 컬러 토큰 */
    --color-primary: 49 130 246;        /* toss-blue RGB */
    --color-primary-light: 232 243 255;
    --color-primary-dark: 27 100 218;

    --color-background: 249 250 251;    /* grey-50 */
    --color-surface: 255 255 255;       /* white */
    --color-surface-secondary: 243 244 246; /* grey-100 */

    --color-text-primary: 17 24 39;     /* grey-900 */
    --color-text-secondary: 107 114 128; /* grey-500 */
    --color-text-tertiary: 156 163 175; /* grey-400 */

    --color-border: 229 231 235;        /* grey-200 */
    --color-divider: 243 244 246;       /* grey-100 */

    /* 상태 컬러 */
    --color-success: 16 185 129;
    --color-warning: 245 158 11;
    --color-error: 239 68 68;

    /* 스페이싱 */
    --spacing-unit: 4px;

    /* 모서리 */
    --radius-sm: 8px;
    --radius-md: 16px;
    --radius-lg: 24px;

    /* 그림자 */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);

    /* 애니메이션 */
    --duration-fast: 150ms;
    --duration-normal: 250ms;
    --duration-slow: 350ms;
    --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
    --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}
```

**체크리스트**:
- [ ] tokens.css 생성
- [ ] index.css에 import 추가

---

### Step 3: 글로벌 스타일 설정
**파일**: `frontend/src/styles/globals.css`

```css
@import './tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Pretendard 폰트 로드 */
  @font-face {
    font-family: 'Pretendard';
    src: url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
  }

  html {
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-grey-50 text-grey-900;
  }

  /* 포커스 스타일 (접근성) */
  *:focus-visible {
    @apply outline-none ring-2 ring-toss-blue ring-offset-2;
  }

  /* 스크롤바 스타일 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-grey-100 rounded;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-grey-300 rounded hover:bg-grey-400;
  }
}

@layer utilities {
  /* 토스 스타일 유틸리티 */
  .text-balance {
    text-wrap: balance;
  }

  .clickable {
    @apply cursor-pointer select-none active:scale-[0.98] transition-transform duration-150;
  }
}
```

**체크리스트**:
- [ ] globals.css 생성
- [ ] 기존 index.css 내용 이전
- [ ] main.tsx에서 import 경로 변경

---

### Step 4: 타입 정의
**파일**: `frontend/src/types/design-system.ts`

```typescript
// 컬러 타입
export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error';

// 사이즈 타입
export type Size = 'sm' | 'md' | 'lg';

// 버튼 변형
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';

// 배지 변형
export type BadgeVariant = 'solid' | 'subtle' | 'outline';

// 스페이싱
export type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

// 공통 컴포넌트 Props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}
```

**체크리스트**:
- [ ] design-system.ts 생성
- [ ] types/index.ts에 export 추가

---

## A-2: 공통 컴포넌트 라이브러리

### 폴더 구조
```
frontend/src/components/
├── ui/                      # 기본 UI 컴포넌트
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Card/
│   ├── Input/
│   ├── Modal/
│   ├── Toast/
│   ├── Badge/
│   └── index.ts             # 배럴 export
├── layout/                  # 레이아웃 컴포넌트
│   ├── Container.tsx
│   ├── Stack.tsx
│   └── index.ts
└── index.ts                 # 전체 배럴 export
```

---

### Step 5: Button 컴포넌트
**파일**: `frontend/src/components/ui/Button/Button.tsx`

```tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // 기본 스타일
  'inline-flex items-center justify-center font-medium transition-all duration-250 ease-toss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-toss-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.96]',
  {
    variants: {
      variant: {
        solid: 'bg-toss-blue text-white hover:bg-toss-blue-dark shadow-sm hover:shadow',
        outline: 'border-2 border-toss-blue text-toss-blue bg-transparent hover:bg-toss-blue-light',
        ghost: 'text-grey-700 hover:bg-grey-100',
        link: 'text-toss-blue underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3 text-body-sm rounded-sm',
        md: 'h-11 px-5 text-body rounded',
        lg: 'h-13 px-6 text-body-lg rounded-md',
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

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

**체크리스트**:
- [ ] class-variance-authority 설치 (`npm install class-variance-authority`)
- [ ] cn 유틸 함수 생성 (`frontend/src/lib/utils.ts`)
- [ ] Button.tsx 생성
- [ ] index.ts 배럴 export 추가

---

### Step 6: cn 유틸리티 함수
**파일**: `frontend/src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind 클래스를 안전하게 병합
 * clsx로 조건부 클래스 처리 + twMerge로 충돌 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**체크리스트**:
- [ ] clsx 설치 (`npm install clsx`)
- [ ] tailwind-merge 설치 (`npm install tailwind-merge`)
- [ ] utils.ts 생성

---

### Step 7: Card 컴포넌트
**파일**: `frontend/src/components/ui/Card/Card.tsx`

```tsx
import { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-md bg-white transition-all duration-250',
  {
    variants: {
      variant: {
        default: 'shadow-sm hover:shadow',
        outline: 'border border-grey-200',
        ghost: 'bg-grey-50',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      clickable: {
        true: 'cursor-pointer active:scale-[0.99] hover:shadow-md',
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

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, clickable, ...props }, ref) => {
    return (
      <div
        className={cn(cardVariants({ variant, padding, clickable, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// Card 하위 컴포넌트
const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-headline-sm text-grey-900', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-body text-grey-700', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4 border-t border-grey-100', className)}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardContent, CardFooter, cardVariants };
```

**체크리스트**:
- [ ] Card.tsx 생성
- [ ] index.ts 배럴 export 추가

---

### Step 8: Input 컴포넌트
**파일**: `frontend/src/components/ui/Input/Input.tsx`

```tsx
import { forwardRef, InputHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'w-full bg-white border text-grey-900 placeholder:text-grey-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-toss-blue focus:border-transparent disabled:bg-grey-50 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
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
      size: 'md',
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

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, label, helperText, errorMessage, id, ...props }, ref) => {
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
            inputVariants({ size, state: hasError ? 'error' : state, className })
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

export { Input, inputVariants };
```

**체크리스트**:
- [ ] Input.tsx 생성
- [ ] index.ts 배럴 export 추가

---

### Step 9: Badge 컴포넌트
**파일**: `frontend/src/components/ui/Badge/Badge.tsx`

```tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors',
  {
    variants: {
      variant: {
        solid: '',
        subtle: '',
        outline: 'bg-transparent border',
      },
      color: {
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
      { variant: 'solid', color: 'primary', className: 'bg-toss-blue text-white' },
      { variant: 'solid', color: 'success', className: 'bg-success text-white' },
      { variant: 'solid', color: 'warning', className: 'bg-warning text-white' },
      { variant: 'solid', color: 'error', className: 'bg-error text-white' },
      { variant: 'solid', color: 'grey', className: 'bg-grey-500 text-white' },

      // Subtle variants
      { variant: 'subtle', color: 'primary', className: 'bg-toss-blue-light text-toss-blue' },
      { variant: 'subtle', color: 'success', className: 'bg-green-50 text-success' },
      { variant: 'subtle', color: 'warning', className: 'bg-amber-50 text-warning' },
      { variant: 'subtle', color: 'error', className: 'bg-red-50 text-error' },
      { variant: 'subtle', color: 'grey', className: 'bg-grey-100 text-grey-600' },

      // Outline variants
      { variant: 'outline', color: 'primary', className: 'border-toss-blue text-toss-blue' },
      { variant: 'outline', color: 'success', className: 'border-success text-success' },
      { variant: 'outline', color: 'warning', className: 'border-warning text-warning' },
      { variant: 'outline', color: 'error', className: 'border-error text-error' },
      { variant: 'outline', color: 'grey', className: 'border-grey-300 text-grey-600' },
    ],
    defaultVariants: {
      variant: 'subtle',
      color: 'primary',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, color, size, ...props }, ref) => {
    return (
      <span
        className={cn(badgeVariants({ variant, color, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
```

**체크리스트**:
- [ ] Badge.tsx 생성
- [ ] index.ts 배럴 export 추가

---

### Step 10: Toast 시스템
**파일**: `frontend/src/components/ui/Toast/Toast.tsx`

```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// Toast 타입
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// Context
interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // 자동 제거
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// Toast 컨테이너
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// 개별 Toast 아이템
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-error" />,
    warning: <AlertCircle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-toss-blue" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-success/20',
    error: 'bg-red-50 border-error/20',
    warning: 'bg-amber-50 border-warning/20',
    info: 'bg-toss-blue-light border-toss-blue/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-md border shadow-lg min-w-[320px] max-w-[420px]',
        bgColors[toast.type]
      )}
    >
      {icons[toast.type]}
      <div className="flex-1">
        <p className="text-body font-medium text-grey-900">{toast.title}</p>
        {toast.description && (
          <p className="text-body-sm text-grey-600 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-grey-400 hover:text-grey-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export { ToastContext };
```

**체크리스트**:
- [ ] framer-motion 설치 (`npm install framer-motion`)
- [ ] lucide-react 설치 확인
- [ ] Toast.tsx 생성
- [ ] App.tsx에 ToastProvider 추가

---

### Step 11: Modal 컴포넌트
**파일**: `frontend/src/components/ui/Modal/Modal.tsx`

```tsx
import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 배경 오버레이 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* 모달 컨테이너 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all',
                  sizeClasses[size]
                )}
              >
                {/* 헤더 */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {title && (
                        <Dialog.Title className="text-headline-sm text-grey-900">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="text-body-sm text-grey-500 mt-1">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="text-grey-400 hover:text-grey-600 transition-colors p-1 -m-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* 컨텐츠 */}
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// 편의 컴포넌트
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'primary',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex gap-3 mt-6">
        <Button variant="ghost" onClick={onClose} fullWidth disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant="solid"
          onClick={onConfirm}
          fullWidth
          isLoading={isLoading}
          className={variant === 'danger' ? 'bg-error hover:bg-red-600' : ''}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
```

**체크리스트**:
- [ ] @headlessui/react 설치 (`npm install @headlessui/react`)
- [ ] Modal.tsx 생성
- [ ] index.ts 배럴 export 추가

---

### Step 12: 컴포넌트 배럴 Export
**파일**: `frontend/src/components/ui/index.ts`

```typescript
// Button
export { Button, buttonVariants } from './Button/Button';
export type { ButtonProps } from './Button/Button';

// Card
export { Card, CardHeader, CardTitle, CardContent, CardFooter, cardVariants } from './Card/Card';
export type { CardProps } from './Card/Card';

// Input
export { Input, inputVariants } from './Input/Input';
export type { InputProps } from './Input/Input';

// Badge
export { Badge, badgeVariants } from './Badge/Badge';
export type { BadgeProps } from './Badge/Badge';

// Toast
export { ToastProvider, useToast } from './Toast/Toast';

// Modal
export { Modal, ConfirmModal } from './Modal/Modal';
```

**체크리스트**:
- [ ] ui/index.ts 생성
- [ ] 각 컴포넌트 폴더에 index.ts 생성

---

## A-3: 애니메이션 시스템

### Step 13: Framer Motion 설정
**파일**: `frontend/src/lib/animations.ts`

```typescript
import { Variants } from 'framer-motion';

// 토스 스타일 Spring 설정
export const springConfig = {
  default: { type: 'spring', stiffness: 400, damping: 30 },
  gentle: { type: 'spring', stiffness: 200, damping: 20 },
  bouncy: { type: 'spring', stiffness: 500, damping: 25 },
  stiff: { type: 'spring', stiffness: 600, damping: 35 },
};

// 페이지 전환 애니메이션
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springConfig.default,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

// 리스트 아이템 애니메이션
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      ...springConfig.default,
    },
  }),
};

// 리스트 컨테이너
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// 페이드 인/아웃
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// 스케일 애니메이션 (버튼 클릭 등)
export const scaleVariants: Variants = {
  initial: { scale: 1 },
  tap: { scale: 0.96 },
  hover: { scale: 1.02 },
};

// 슬라이드 인
export const slideInVariants = {
  fromRight: {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: springConfig.default },
    exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } },
  },
  fromLeft: {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: springConfig.default },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.2 } },
  },
  fromBottom: {
    hidden: { y: '100%', opacity: 0 },
    visible: { y: 0, opacity: 1, transition: springConfig.default },
    exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
  },
};

// 카드 호버 효과
export const cardHoverVariants: Variants = {
  initial: { y: 0, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' },
  hover: {
    y: -2,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: springConfig.gentle,
  },
};
```

**체크리스트**:
- [ ] animations.ts 생성
- [ ] 각 컴포넌트에 애니메이션 적용

---

### Step 14: AnimatedPage 래퍼
**파일**: `frontend/src/components/layout/AnimatedPage.tsx`

```tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { pageTransition } from '@/lib/animations';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedPage({ children, className }: AnimatedPageProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

**체크리스트**:
- [ ] AnimatedPage.tsx 생성
- [ ] 페이지 컴포넌트에 적용

---

### Step 15: AnimatedList 컴포넌트
**파일**: `frontend/src/components/layout/AnimatedList.tsx`

```tsx
import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { listContainerVariants, listItemVariants } from '@/lib/animations';

interface AnimatedListProps {
  children: ReactNode[];
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children.map((child, index) => (
        <motion.div
          key={index}
          variants={listItemVariants}
          custom={index}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

**체크리스트**:
- [ ] AnimatedList.tsx 생성
- [ ] 리스트 UI에 적용

---

## 실행 순서 체크리스트

### Day 1-2: 기본 설정
- [ ] npm 패키지 설치
  ```bash
  npm install class-variance-authority clsx tailwind-merge framer-motion @headlessui/react
  ```
- [ ] tailwind.config.ts 업데이트
- [ ] tokens.css 생성
- [ ] globals.css 생성
- [ ] design-system.ts 타입 정의

### Day 3-4: 핵심 컴포넌트
- [ ] lib/utils.ts (cn 함수)
- [ ] Button 컴포넌트
- [ ] Card 컴포넌트
- [ ] Input 컴포넌트

### Day 5-6: 피드백 컴포넌트
- [ ] Badge 컴포넌트
- [ ] Toast 시스템
- [ ] Modal 컴포넌트
- [ ] 배럴 export 정리

### Day 7-8: 애니메이션
- [ ] animations.ts
- [ ] AnimatedPage 컴포넌트
- [ ] AnimatedList 컴포넌트
- [ ] 기존 컴포넌트에 애니메이션 적용

### Day 9-11: 통합 및 테스트
- [ ] App.tsx에 ToastProvider 추가
- [ ] 기존 UI 컴포넌트를 새 컴포넌트로 교체
- [ ] 스타일 충돌 해결
- [ ] 반응형 테스트

---

## 완료 조건

1. **디자인 시스템**
   - [ ] Tailwind 설정에 토스 컬러/타이포/스페이싱 반영
   - [ ] CSS 변수로 토큰 관리

2. **컴포넌트**
   - [ ] Button, Card, Input, Badge, Toast, Modal 완성
   - [ ] 모든 컴포넌트에 TypeScript 타입 적용
   - [ ] 배럴 export로 깔끔한 import

3. **애니메이션**
   - [ ] 버튼 클릭 시 scale 0.96 적용
   - [ ] 페이지 전환 애니메이션 적용
   - [ ] 리스트 stagger 효과 적용

4. **통합**
   - [ ] 기존 페이지에 새 컴포넌트 적용
   - [ ] 시각적 일관성 확인
   - [ ] 접근성(키보드 포커스) 확인

---

*이 계획의 승인 후 "A-1 진행해줘"로 시작하면 순차적으로 구현합니다.*
