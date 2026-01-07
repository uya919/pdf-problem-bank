/**
 * Card - 기본 카드 컴포넌트
 *
 * 디자인 스펙:
 * - 흰색 배경
 * - rounded-2xl (16px)
 * - shadow-sm
 */
import { TW } from './tokens';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`${TW.card} p-4 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * HeroCard - 그라디언트 히어로 카드
 *
 * 디자인 스펙:
 * - 그라디언트 배경: #3182F6 → #2563eb
 * - 흰색 텍스트
 * - 반투명 버튼
 */
interface HeroCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HeroCard({ children, className = '' }: HeroCardProps) {
  return (
    <div className={`${TW.heroGradient} rounded-2xl p-5 text-white ${className}`}>
      {children}
    </div>
  );
}
