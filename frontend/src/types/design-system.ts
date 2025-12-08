/**
 * Design System Type Definitions
 * Phase 21-A1: 토스 스타일 디자인 시스템
 */

// 컬러 변형 타입
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

// 스페이싱 (4px 그리드 기반)
export type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

// 공통 컴포넌트 Props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 폼 컴포넌트 공통 Props
export interface FormComponentProps extends BaseComponentProps {
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

// 토스트 타입
export type ToastType = 'success' | 'error' | 'info' | 'warning';

// 토스트 데이터
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// 난이도 레벨 (1-5)
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

// 난이도 레이블
export const difficultyLabels: Record<DifficultyLevel, string> = {
  1: '매우 쉬움',
  2: '쉬움',
  3: '보통',
  4: '어려움',
  5: '매우 어려움',
};

// 난이도 컬러
export const difficultyColors: Record<DifficultyLevel, string> = {
  1: 'success',
  2: 'success',
  3: 'warning',
  4: 'error',
  5: 'error',
};
