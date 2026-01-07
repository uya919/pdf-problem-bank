/**
 * useIsMobile - 모바일/태블릿 뷰 감지 훅
 *
 * 768px 기준으로 모바일(< 768px)과 태블릿+(≥ 768px) 구분
 * - 모바일: 스와이프, 아코디언, BottomSheet
 * - 태블릿+: 그리드, 펼침, CenteredModal
 */
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * 현재 뷰포트가 모바일인지 확인
 * @returns true if viewport < 768px
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    // SSR 대응: window가 없으면 모바일로 기본값
    if (typeof window === 'undefined') return true;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    // 리사이즈 핸들러 (디바운스 적용)
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      }, 100); // 100ms 디바운스
    };

    // 초기값 설정
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // 리스너 등록
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isMobile;
}

/**
 * 현재 뷰포트가 태블릿 이상인지 확인
 * @returns true if viewport >= 768px
 */
export function useIsTablet(): boolean {
  return !useIsMobile();
}

/**
 * 브레이크포인트 타입
 */
export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1024;

/**
 * 현재 뷰포트의 브레이크포인트 반환
 * - mobile: < 768px
 * - tablet: 768px ~ 1023px
 * - desktop: >= 1024px
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'mobile';
    return getBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBreakpoint(getBreakpoint(window.innerWidth));
      }, 100);
    };

    setBreakpoint(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isTabletOrAbove: breakpoint !== 'mobile',
    isDesktopOrAbove: breakpoint === 'desktop',
  };
}

function getBreakpoint(width: number): Breakpoint {
  if (width < TABLET_BREAKPOINT) return 'mobile';
  if (width < DESKTOP_BREAKPOINT) return 'tablet';
  return 'desktop';
}

/**
 * 미디어 쿼리 기반 뷰포트 감지 (더 정확함)
 * @param query CSS 미디어 쿼리 문자열
 * @returns 미디어 쿼리 매칭 여부
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // 초기값 설정
    setMatches(mediaQuery.matches);

    // 리스너 등록 (modern API 우선)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 레거시 브라우저 대응
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

export default useIsMobile;
