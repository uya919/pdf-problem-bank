/**
 * 문제 등록/수정 모달 컴포넌트
 *
 * Phase 21+ B-3: 문제 등록/수정 폼
 *
 * 토스 스타일 풀스크린 모달
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { ProblemForm } from './ProblemForm';
import type { Problem, ProblemCreate, ProblemUpdate } from '../../types/problem';

interface ProblemFormModalProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 수정 모드일 때 기존 문제 데이터 */
  problem?: Problem;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 폼 제출 핸들러 */
  onSubmit: (data: ProblemCreate | ProblemUpdate) => void;
  /** 제출 중 상태 */
  isSubmitting?: boolean;
}

export function ProblemFormModal({
  open,
  problem,
  onClose,
  onSubmit,
  isSubmitting = false,
}: ProblemFormModalProps) {
  const isEditMode = !!problem;

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isSubmitting]);

  // 스크롤 방지
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onClose()}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl
              shadow-2xl overflow-hidden flex flex-col mx-4"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="p-2 -ml-2 rounded-xl hover:bg-grey-100 transition-colors
                    disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 text-grey-500" />
                </button>
                <h2 className="text-lg font-bold text-grey-900">
                  {isEditMode ? '문제 수정' : '새 문제 등록'}
                </h2>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 rounded-xl hover:bg-grey-100 transition-colors
                  disabled:opacity-50"
              >
                <X className="w-5 h-5 text-grey-500" />
              </button>
            </div>

            {/* 폼 컨텐츠 */}
            <div className="flex-1 overflow-y-auto p-6">
              <ProblemForm
                problem={problem}
                onSubmit={onSubmit}
                onCancel={onClose}
                isSubmitting={isSubmitting}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ProblemFormModal;
