/**
 * AnimatedList Component
 * Phase 21-A3: 리스트 stagger 애니메이션 래퍼
 *
 * 리스트 아이템들이 순차적으로 나타나는 효과
 */
import { motion } from 'framer-motion';
import { ReactNode, Children } from 'react';
import { listContainerVariants, listItemVariants } from '@/lib/animations';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  const childArray = Children.toArray(children);

  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {childArray.map((child, index) => (
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

// 개별 아이템 래퍼 (수동 사용 시)
interface AnimatedItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function AnimatedItem({ children, index = 0, className }: AnimatedItemProps) {
  return (
    <motion.div
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      className={className}
    >
      {children}
    </motion.div>
  );
}
