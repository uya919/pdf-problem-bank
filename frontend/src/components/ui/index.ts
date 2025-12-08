/**
 * UI Components Barrel Export
 * Phase 21-A2: 토스 스타일 컴포넌트
 *
 * @example
 * import { Button, Card, Badge, Input, Modal } from '@/components/ui';
 */

// Button
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
} from './Card';
export type { CardProps } from './Card';

// Badge
export { Badge, DifficultyBadge, badgeVariants } from './Badge';
export type { BadgeProps } from './Badge';

// Input
export { Input, SearchInput, inputVariants } from './Input';
export type { InputProps } from './Input';

// Modal
export { Modal, ConfirmModal } from './Modal';
