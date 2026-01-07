/**
 * BottomSheet - 바텀시트 모달 컴포넌트
 *
 * 목업: dashboard-modal-final.html 기준
 * - 하단에서 슬라이드 업
 * - 둥근 상단 모서리
 * - 뒤로가기 + 타이틀 + 닫기 버튼 헤더
 *
 * Stage 19: PC 모드 추가
 * - variant="center": PC 중앙 모달 (max-w-lg, 최대 높이 80%)
 * - variant="bottom": 모바일 바텀시트 (기본)
 */
import { useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** 모달 스타일: "bottom" (모바일), "center" (PC) */
  variant?: 'bottom' | 'center';
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  variant = 'bottom',
}: BottomSheetProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // PC 중앙 모달 스타일
  if (variant === 'center') {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 - PC 스타일 */}
          <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-[#191F28]">{title}</h2>
              {subtitle && (
                <p className="text-sm text-[#6B7684] mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[#8B95A1] hover:text-[#4E5968] hover:bg-[#F2F4F6] rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 바디 - 스크롤 가능, 하단 패딩 줄임 */}
          <div className="flex-1 overflow-y-auto px-5 py-4 pb-20">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 모바일 바텀시트 스타일 (기본)
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] max-h-[90%] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 목업 스타일 */}
        <div className="px-5 py-4 border-b border-[#F2F4F6] flex items-start justify-between">
          {/* 뒤로가기 버튼 */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333D4B" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 타이틀 */}
          <div className="flex-1 text-center px-2">
            <h2 className="text-base font-semibold text-[#191F28] leading-snug">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#6B7684] mt-0.5">{subtitle}</p>
            )}
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#F2F4F6] rounded-full"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E5968" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 바디 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
          {children}
        </div>
      </div>
    </div>
  );
}
