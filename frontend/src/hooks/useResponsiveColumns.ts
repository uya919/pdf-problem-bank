/**
 * Phase 66-67: 반응형 열 수 계산 훅
 *
 * Tailwind 브레이크포인트와 동기화:
 * - 모바일 (~639px): 2열
 * - 태블릿 (640~767px): 3열
 * - PC md (768~1023px): 4열
 * - PC lg (1024~1279px): 6열
 * - PC xl (1280px~): 8열
 */
import { useState, useEffect } from 'react';

interface ResponsiveColumnsConfig {
  mobile?: number;       // default: 2
  tablet?: number;       // default: 3
  desktop?: number;      // default: 4
  largeDesktop?: number; // default: 6 (lg)
  xlDesktop?: number;    // default: 8 (xl)
}

/**
 * 화면 크기에 따른 그리드 열 수 반환
 */
export function useResponsiveColumns(config?: ResponsiveColumnsConfig) {
  const { mobile = 2, tablet = 3, desktop = 4, largeDesktop = 6, xlDesktop = 8 } = config || {};

  const getColumns = () => {
    if (typeof window === 'undefined') return desktop;
    if (window.innerWidth >= 1280) return xlDesktop;    // xl breakpoint
    if (window.innerWidth >= 1024) return largeDesktop; // lg breakpoint
    if (window.innerWidth >= 768) return desktop;       // md breakpoint
    if (window.innerWidth >= 640) return tablet;        // sm breakpoint
    return mobile;
  };

  const [columns, setColumns] = useState(getColumns);

  useEffect(() => {
    const handleResize = () => {
      setColumns(getColumns());
    };

    // 초기 설정
    handleResize();

    // 리사이즈 이벤트 리스너 (debounce 적용)
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [mobile, tablet, desktop, largeDesktop, xlDesktop]);

  return columns;
}
