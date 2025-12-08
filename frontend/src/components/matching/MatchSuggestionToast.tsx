/**
 * Phase 38-4: 매칭 제안 토스트
 *
 * 해설 그룹핑 시 자동 매칭 제안 표시
 */
import { memo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Hand, X } from 'lucide-react';
import type { MatchSuggestion } from '@/hooks/useAutoMatchSuggestion';

interface MatchSuggestionToastProps {
  /** 현재 제안 */
  suggestion: MatchSuggestion | null;
  /** 승인 핸들러 */
  onAccept: () => void;
  /** 수동 매칭 핸들러 */
  onManual: () => void;
  /** 닫기 핸들러 */
  onDismiss: () => void;
}

export const MatchSuggestionToast = memo(function MatchSuggestionToast({
  suggestion,
  onAccept,
  onManual,
  onDismiss,
}: MatchSuggestionToastProps) {
  // 키보드 이벤트 핸들러
  useEffect(() => {
    if (!suggestion?.isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          onAccept();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          onManual();
          break;
        case 'Escape':
          e.preventDefault();
          onDismiss();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestion?.isVisible, onAccept, onManual, onDismiss]);

  const isVisible = suggestion?.isVisible && suggestion.suggestedProblem;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-grey-200 px-5 py-4 min-w-[320px]">
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-grey-900">자동 매칭 제안</p>
                  <p className="text-xs text-grey-500">
                    "{suggestion?.solutionName}" 해설
                  </p>
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-grey-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-grey-400" />
              </button>
            </div>

            {/* 제안 내용 */}
            <div className="bg-grey-50 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-grey-600">
                <span className="font-semibold text-toss-blue">
                  {suggestion?.suggestedProblem?.problemNumber}번
                </span>
                {' '}문제와 연결할까요?
              </p>
              {suggestion?.suggestedProblem?.displayName && (
                <p className="text-xs text-grey-400 mt-1 truncate">
                  {suggestion.suggestedProblem.displayName}
                </p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-toss-blue text-white rounded-xl font-medium text-sm hover:bg-toss-blue/90 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                승인
                <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 text-white/90 text-xs rounded">
                  Enter
                </kbd>
              </button>
              <button
                onClick={onManual}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-grey-100 text-grey-700 rounded-xl font-medium text-sm hover:bg-grey-200 transition-colors"
              >
                <Hand className="w-4 h-4" />
                수동
                <kbd className="ml-1 px-1.5 py-0.5 bg-grey-200 text-grey-500 text-xs rounded">
                  M
                </kbd>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// 매칭 없음 알림 토스트
interface NoMatchToastProps {
  isVisible: boolean;
  solutionName?: string;
  onManual: () => void;
  onDismiss: () => void;
}

export const NoMatchToast = memo(function NoMatchToast({
  isVisible,
  solutionName,
  onManual,
  onDismiss,
}: NoMatchToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-yellow-200 px-5 py-4 min-w-[300px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Hand className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-grey-900">매칭할 문제가 없습니다</p>
                <p className="text-xs text-grey-500">
                  {solutionName ? `"${solutionName}" 해설` : '수동으로 선택해주세요'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onManual}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-xl font-medium text-sm hover:bg-yellow-600 transition-colors"
              >
                <Hand className="w-4 h-4" />
                수동 선택
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2.5 bg-grey-100 text-grey-700 rounded-xl font-medium text-sm hover:bg-grey-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default MatchSuggestionToast;
