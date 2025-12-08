/**
 * Animation System
 * Phase 21-A3: Framer Motion 애니메이션 설정
 *
 * 토스 스타일 Spring 기반 애니메이션
 */
import type { Variants } from 'framer-motion';

// 토스 스타일 Spring 설정
export const springConfig = {
  default: { type: 'spring' as const, stiffness: 400, damping: 30 },
  gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
  bouncy: { type: 'spring' as const, stiffness: 500, damping: 25 },
  stiff: { type: 'spring' as const, stiffness: 600, damping: 35 },
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
  fromTop: {
    hidden: { y: '-100%', opacity: 0 },
    visible: { y: 0, opacity: 1, transition: springConfig.default },
    exit: { y: '-100%', opacity: 0, transition: { duration: 0.2 } },
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

// 팝업/모달 애니메이션
export const popupVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springConfig.default,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// 체크 애니메이션 (승인 버튼 등)
export const checkVariants: Variants = {
  unchecked: { pathLength: 0 },
  checked: {
    pathLength: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// 진행률 바 애니메이션
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: springConfig.gentle,
  }),
};
