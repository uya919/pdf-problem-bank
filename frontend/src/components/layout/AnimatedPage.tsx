/**
 * AnimatedPage Component
 * Phase 21-A3: 페이지 전환 애니메이션 래퍼
 *
 * 모든 페이지를 감싸서 일관된 전환 효과 적용
 */
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
