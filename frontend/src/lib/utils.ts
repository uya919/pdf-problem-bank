/**
 * Utility functions for className merging
 * Phase 21-A1: 토스 스타일 디자인 시스템
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * clsx로 조건부 클래스 처리 + twMerge로 충돌 해결
 *
 * @example
 * cn('px-4 py-2', 'px-6') // => 'py-2 px-6'
 * cn('text-red-500', isActive && 'text-blue-500')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
