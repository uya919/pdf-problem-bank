/**
 * DeleteConfirmModal Component
 * Phase 21.7: 문서 삭제 확인 모달
 *
 * 토스 스타일 - 명확한 경고와 확인
 */
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  documentName: string;
  totalPages?: number;
  hasLabelingData?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  documentName,
  totalPages,
  hasLabelingData = false
}: DeleteConfirmModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 배경 오버레이 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* 모달 컨테이너 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-error" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-grey-900">
                      문서 삭제
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    disabled={isDeleting}
                    className="p-2 text-grey-400 hover:text-grey-600 rounded-lg hover:bg-grey-100 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 본문 */}
                <div className="px-6 py-6">
                  <p className="text-grey-700 mb-4">
                    <strong className="text-grey-900 break-all">"{documentName}"</strong>
                    <br />
                    문서를 삭제하시겠습니까?
                  </p>

                  {/* 삭제될 데이터 목록 */}
                  <div className="bg-grey-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-grey-600">삭제되는 항목:</p>
                    <ul className="text-sm text-grey-700 space-y-1 ml-4">
                      {totalPages && (
                        <li className="list-disc">페이지 이미지 ({totalPages}개)</li>
                      )}
                      <li className="list-disc">블록 분석 데이터</li>
                      {hasLabelingData && (
                        <li className="list-disc text-error font-medium">
                          라벨링 작업 데이터 (복구 불가)
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* 경고 메시지 */}
                  <p className="text-sm text-grey-500 mt-4">
                    삭제된 문서는 복구할 수 없습니다.
                  </p>
                </div>

                {/* 푸터 (버튼) */}
                <div className="flex gap-3 px-6 py-4 bg-grey-50 border-t border-grey-100">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isDeleting}
                  >
                    취소
                  </Button>
                  <Button
                    variant="solid"
                    className="flex-1 bg-error hover:bg-red-600 text-white"
                    onClick={onConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        삭제 중...
                      </>
                    ) : (
                      '삭제'
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
