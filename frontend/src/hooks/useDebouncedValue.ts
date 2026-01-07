/**
 * useDebouncedValue - 값 debounce 훅
 *
 * Stage 17: 공지 등록 모달
 * - 검색 입력 debounce용
 */

import { useState, useEffect } from 'react';

/**
 * 값이 변경된 후 지정된 시간이 지나야 반환값이 업데이트됨
 *
 * @param value - debounce할 값
 * @param delay - 지연 시간 (ms), 기본 300ms
 * @returns debounced 값
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
