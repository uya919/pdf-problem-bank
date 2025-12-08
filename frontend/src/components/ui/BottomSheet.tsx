/**
 * 바텀시트 컴포넌트
 *
 * Phase 21+ A-3: 분류 선택 컴포넌트
 *
 * 토스 스타일의 바텀시트 모달 컴포넌트
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  /** 열림 상태 */
  open: boolean;

  /** 닫기 콜백 */
  onClose: () => void;

  /** 제목 */
  title?: string;

  /** 높이 (기본: 70vh) */
  height?: string;

  /** 자식 요소 */
  children: React.ReactNode;

  /** 닫기 버튼 표시 여부 */
  showCloseButton?: boolean;

  /** 백드롭 클릭으로 닫기 여부 */
  closeOnBackdropClick?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  title,
  height = '70vh',
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
}: BottomSheetProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // 바디 스크롤 방지
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // 백드롭 클릭 핸들러
  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdropClick) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={handleBackdropClick}
          />

          {/* 시트 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl flex flex-col"
            style={{ height, maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-grey-300 rounded-full" />
            </div>

            {/* 헤더 */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <h2 className="text-lg font-semibold text-grey-900">
                  {title || ''}
                </h2>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 hover:bg-grey-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-grey-500" />
                  </button>
                )}
              </div>
            )}

            {/* 컨텐츠 */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default BottomSheet;
