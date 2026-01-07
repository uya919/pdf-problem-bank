/**
 * Button - Toss 스타일 버튼 컴포넌트
 *
 * 디자인 스펙:
 * - primary: 흰색 배경, 파란색 텍스트 (히어로 카드용)
 * - secondary: 반투명 흰색 배경 (히어로 카드용)
 * - cta: 파란색 배경, 흰색 텍스트 (액션 버튼)
 * - ghost: 투명 배경, 회색 텍스트
 */
import { TW } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'ghost';

interface ButtonProps {
  variant?: ButtonVariant;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: TW.btnPrimary,
  secondary: TW.btnSecondary,
  cta: TW.btnCta,
  ghost: TW.btnGhost,
};

export function Button({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${variantStyles[variant]} transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
