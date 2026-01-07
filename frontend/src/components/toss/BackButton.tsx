/**
 * Phase 65-A: 뒤로가기 버튼
 *
 * 토스 스타일 네비게이션 버튼
 */
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  onClick?: () => void;
}

export function BackButton({ label = '뒤로', onClick }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-0.5 text-grey-600 hover:text-grey-900 transition-colors -ml-1"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
