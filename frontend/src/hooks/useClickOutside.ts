/**
 * useClickOutside - 외부 클릭 감지 훅
 *
 * Stage 17: 공지 등록 모달
 * - 드롭다운 외부 클릭 시 닫기용
 */

import { useEffect, RefObject } from 'react';

/**
 * ref 요소 외부 클릭 시 handler 호출
 *
 * @param ref - 감지할 요소의 ref
 * @param handler - 외부 클릭 시 호출할 함수
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // ref가 없거나 ref 내부 클릭이면 무시
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
