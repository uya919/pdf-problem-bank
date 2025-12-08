/**
 * 창 역할 선택 모달
 *
 * Phase 22-B: 듀얼 윈도우 매칭 시스템
 *
 * 매칭 모드 진입 시 문제 창/해설 창 역할을 선택
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, BookOpen, X } from 'lucide-react';
import type { WindowRole } from '@/types/matching';

interface RoleSelectorProps {
  /** 표시 여부 */
  isOpen: boolean;
  /** 세션 ID */
  sessionId: string;
  /** 역할 선택 콜백 */
  onRoleSelected: (role: WindowRole) => void;
  /** 닫기 콜백 */
  onClose: () => void;
}

export function RoleSelector({
  isOpen,
  sessionId,
  onRoleSelected,
  onClose
}: RoleSelectorProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-grey-400 hover:text-grey-600
                       rounded-full hover:bg-grey-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 헤더 */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-grey-900 mb-2">
              창 역할 선택
            </h2>
            <p className="text-grey-500">
              듀얼 모니터에서 각 창의 역할을 지정하세요
            </p>
          </div>

          {/* 역할 선택 버튼 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* 문제 창 */}
            <button
              onClick={() => onRoleSelected('problem')}
              className="group p-6 border-2 border-grey-200 rounded-xl
                         hover:border-blue-500 hover:bg-blue-50
                         transition-all duration-200 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full
                            flex items-center justify-center
                            group-hover:bg-blue-200 group-hover:scale-110
                            transition-all duration-200">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div className="font-semibold text-grey-900 mb-1">문제 창</div>
              <div className="text-sm text-grey-500">
                문제 PDF를 라벨링합니다
              </div>
            </button>

            {/* 해설 창 */}
            <button
              onClick={() => onRoleSelected('solution')}
              className="group p-6 border-2 border-grey-200 rounded-xl
                         hover:border-green-500 hover:bg-green-50
                         transition-all duration-200 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full
                            flex items-center justify-center
                            group-hover:bg-green-200 group-hover:scale-110
                            transition-all duration-200">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <div className="font-semibold text-grey-900 mb-1">해설 창</div>
              <div className="text-sm text-grey-500">
                해설 PDF를 라벨링합니다
              </div>
            </button>
          </div>

          {/* 세션 정보 */}
          <div className="p-4 bg-grey-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-grey-600">세션 ID</span>
              <code className="px-2 py-1 bg-grey-200 rounded text-sm font-mono">
                {sessionId}
              </code>
            </div>
            <p className="text-xs text-grey-400 mt-2">
              다른 브라우저 창에서 같은 세션 ID로 접속하면 자동으로 연결됩니다
            </p>
          </div>

          {/* 사용 안내 */}
          <div className="mt-6 text-center text-xs text-grey-400">
            <p>문제 창에서 라벨링 후 해설 창에서 라벨링하면 자동 매칭됩니다</p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
