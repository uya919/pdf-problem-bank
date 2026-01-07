/**
 * 배정 결과 토스트 알림 (Phase 8-F)
 *
 * 배정/해제 결과를 애니메이션과 함께 표시
 */
import { useState, useEffect } from 'react';
import type { ClassLevel } from '@/types/database';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  level?: ClassLevel;
  count?: number;
}

interface AssignmentToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

/** 레벨별 색상 */
const LEVEL_COLORS: Record<ClassLevel, string> = {
  advanced: 'bg-blue-500',
  regular: 'bg-gray-500',
  regular2: 'bg-gray-400',
  basic: 'bg-orange-500',
};

/** 레벨별 라벨 */
const LEVEL_LABELS: Record<ClassLevel, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
};

export function AssignmentToast({ toast, onClose }: AssignmentToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 등장 애니메이션
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // 자동 닫기 (3초 후)
    const closeTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300);
    }, 3000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(closeTimer);
    };
  }, [toast.id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg
        transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        ${toast.type === 'error' ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-200'}
      `}
    >
      {/* 레벨 배지 (성공 시) */}
      {toast.type === 'success' && toast.level && (
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold
          ${LEVEL_COLORS[toast.level]}
        `}>
          {LEVEL_LABELS[toast.level].charAt(0)}
        </div>
      )}

      {/* 아이콘 (에러 시) */}
      {toast.type === 'error' && (
        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}

      {/* 정보 아이콘 */}
      {toast.type === 'info' && (
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}

      {/* 메시지 */}
      <div className="flex-1">
        <p className={`text-sm font-medium ${toast.type === 'error' ? 'text-red-700' : 'text-gray-900'}`}>
          {toast.message}
        </p>
        {toast.count && toast.count > 1 && (
          <p className="text-xs text-gray-500 mt-0.5">
            {toast.count}명 처리됨
          </p>
        )}
      </div>

      {/* 닫기 버튼 */}
      <button
        onClick={handleClose}
        className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** 토스트 컨테이너 */
interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <AssignmentToast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

/** 토스트 생성 유틸리티 */
export function createToast(
  type: ToastData['type'],
  message: string,
  options?: { level?: ClassLevel; count?: number }
): ToastData {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    message,
    ...options,
  };
}
