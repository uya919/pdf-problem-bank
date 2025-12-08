/**
 * KeyboardShortcutsHelp Component
 * Phase 21.6: 키보드 단축키 도움말 모달
 *
 * 토스 스타일 - 깔끔한 단축키 안내
 */
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: '페이지 이동',
    shortcuts: [
      { keys: ['←', '→'], description: '이전/다음 페이지' },
      { keys: ['Home'], description: '첫 페이지로 이동' },
      { keys: ['End'], description: '마지막 페이지로 이동' },
    ],
  },
  {
    title: '블록 선택',
    shortcuts: [
      { keys: ['클릭'], description: '블록 선택/해제' },
      { keys: ['Shift', '클릭'], description: '범위 선택' },
      { keys: ['Ctrl', 'A'], description: '전체 선택' },
      { keys: ['Esc'], description: '선택 해제' },
    ],
  },
  {
    title: '그룹 작업',
    shortcuts: [
      { keys: ['Enter'], description: '선택된 블록으로 그룹 생성' },
      { keys: ['Delete'], description: '선택된 그룹 삭제' },
      { keys: ['G'], description: '그룹 패널 토글' },
    ],
  },
  {
    title: '뷰 컨트롤',
    shortcuts: [
      { keys: ['+', '-'], description: '확대/축소' },
      { keys: ['0'], description: '원본 크기로 보기' },
      { keys: ['F'], description: '화면에 맞추기' },
    ],
  },
  {
    title: '기타',
    shortcuts: [
      { keys: ['?'], description: '단축키 도움말 (이 창)' },
      { keys: ['Ctrl', 'S'], description: '저장' },
    ],
  },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-grey-700 bg-grey-100 border border-grey-200 rounded-md shadow-sm">
      {children}
    </kbd>
  );
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel
                as={motion.div}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-toss-blue-light rounded-xl flex items-center justify-center">
                      <Keyboard className="w-5 h-5 text-toss-blue" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-grey-900">
                        키보드 단축키
                      </Dialog.Title>
                      <p className="text-sm text-grey-500">
                        빠른 작업을 위한 단축키
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-grey-400 hover:text-grey-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-6">
                  {shortcutGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-sm font-medium text-grey-500 mb-3">
                        {group.title}
                      </h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-grey-50 transition-colors"
                          >
                            <span className="text-sm text-grey-700">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIdx) => (
                                <Fragment key={keyIdx}>
                                  {keyIdx > 0 && (
                                    <span className="text-grey-300 text-xs mx-0.5">+</span>
                                  )}
                                  <KeyBadge>{key}</KeyBadge>
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-grey-50 border-t border-grey-100">
                  <p className="text-xs text-grey-500 text-center">
                    <kbd className="px-1.5 py-0.5 text-xs bg-white border border-grey-200 rounded">?</kbd>
                    <span className="ml-2">를 누르면 언제든 이 도움말을 볼 수 있습니다</span>
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
