/**
 * Toast 알림 시스템
 * Phase 21-A2: 토스 스타일 컴포넌트
 * Phase 33-C: 액션 버튼 지원 추가
 *
 * - Framer Motion 애니메이션
 * - title + description 지원
 * - 자동 제거 (4초 기본)
 * - 액션 버튼 지원 (실행취소 등)
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Toast 타입
type ToastType = 'success' | 'error' | 'info' | 'warning';

// Phase 33-C: 액션 버튼 타입
interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAction;  // Phase 33-C
}

// Phase 33-C: 하위 호환성을 위한 옵션 타입
type ToastOptions = ToastType | {
  type?: ToastType;
  description?: string;
  duration?: number;
  action?: ToastAction;
};

// Context
interface ToastContextValue {
  toasts: Toast[];
  showToast: (title: string, options?: ToastOptions) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    title: string,
    options?: ToastOptions
  ) => {
    const id = Math.random().toString(36).substring(2, 11);

    // Phase 33-C: 하위 호환성 - 문자열 또는 객체 처리
    const parsedOptions = typeof options === 'string'
      ? { type: options }
      : options;

    const newToast: Toast = {
      id,
      title,
      type: parsedOptions?.type ?? 'info',
      description: parsedOptions?.description,
      duration: parsedOptions?.duration ?? 4000,
      action: parsedOptions?.action,
    };

    setToasts((prev) => [...prev, newToast]);

    // 자동 제거 (액션이 있으면 더 길게 유지)
    const duration = parsedOptions?.action ? (newToast.duration ?? 4000) + 2000 : newToast.duration;
    if (duration && duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast 컨테이너
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// 개별 Toast 아이템
function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <AlertCircle className="w-5 h-5 text-error" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-toss-blue" />,
  };

  const bgColors = {
    success: 'bg-success-light border-success/20',
    error: 'bg-error-light border-error/20',
    warning: 'bg-warning-light border-warning/20',
    info: 'bg-toss-blue-light border-toss-blue/20',
  };

  // Phase 33-C: 액션 버튼 클릭 핸들러
  const handleActionClick = () => {
    toast.action?.onClick();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-md border shadow-lg min-w-[320px] max-w-[420px]',
        bgColors[toast.type]
      )}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-grey-900">{toast.title}</p>
        {toast.description && (
          <p className="text-body-sm text-grey-600 mt-0.5">{toast.description}</p>
        )}
        {/* Phase 33-C: 액션 버튼 */}
        {toast.action && (
          <button
            onClick={handleActionClick}
            className="mt-2 text-body-sm font-medium text-toss-blue hover:text-toss-blue-dark transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-grey-400 hover:text-grey-600 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export { ToastContext };
