/**
 * Phase 27-C: 페어 확인 다이얼로그
 *
 * 문제집-해설집 연결 전 확인하는 모달
 * 토스 스타일 깔끔한 디자인
 */
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FileText, BookOpen, Link2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/Button';

interface PairConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  problemDocName: string;
  solutionDocName: string;
  isLoading?: boolean;
}

export function PairConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  problemDocName,
  solutionDocName,
  isLoading = false
}: PairConfirmDialogProps) {
  // 파일명에서 확장자 제거
  const cleanName = (name: string) => {
    return name.replace(/\.pdf$/i, '').replace(/\.hwp$/i, '').replace(/\.hwpx$/i, '');
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 배경 오버레이 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* 헤더 */}
                <div className="relative px-6 pt-6 pb-4 border-b border-grey-100">
                  <Dialog.Title className="text-xl font-bold text-grey-900 text-center">
                    문서를 연결하시겠어요?
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-grey-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-grey-400" />
                  </button>
                </div>

                {/* 본문 */}
                <div className="px-6 py-6">
                  <div className="flex flex-col items-center gap-3">
                    {/* 문제집 */}
                    <motion.div
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-600 font-medium mb-0.5">문제집</p>
                        <p className="text-sm font-semibold text-grey-900 truncate" title={problemDocName}>
                          {cleanName(problemDocName)}
                        </p>
                      </div>
                    </motion.div>

                    {/* 연결 아이콘 */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full"
                    >
                      <Link2 className="w-5 h-5 text-purple-600" />
                    </motion.div>

                    {/* 해설집 */}
                    <motion.div
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-full flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-600 font-medium mb-0.5">해설집</p>
                        <p className="text-sm font-semibold text-grey-900 truncate" title={solutionDocName}>
                          {cleanName(solutionDocName)}
                        </p>
                      </div>
                    </motion.div>
                  </div>

                  {/* 설명 */}
                  <p className="mt-5 text-center text-sm text-grey-500">
                    연결하면 두 문서를 듀얼 창으로 함께 열 수 있어요.
                    <br />
                    언제든지 연결을 해제할 수 있습니다.
                  </p>
                </div>

                {/* 푸터 */}
                <div className="px-6 pb-6 flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        연결 중...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        연결하기
                      </span>
                    )}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
