/**
 * Document Settings Modal (Phase 29-D)
 *
 * 문서 기본 설정 모달 - 처음 라벨링 시작 시 한 번만 표시
 * 교재명, 과정을 설정하면 이후 모든 그룹에 자동 적용
 */
import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';

interface DocumentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { bookName: string; course: string }) => void;
  documentName?: string;
  initialBookName?: string;
  initialCourse?: string;
}

export function DocumentSettingsModal({
  isOpen,
  onClose,
  onSave,
  documentName,
  initialBookName = '',
  initialCourse = '',
}: DocumentSettingsModalProps) {
  const [bookName, setBookName] = useState(initialBookName);
  const [course, setCourse] = useState(initialCourse);

  // 초기값이 변경되면 업데이트
  useEffect(() => {
    setBookName(initialBookName);
    setCourse(initialCourse);
  }, [initialBookName, initialCourse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookName.trim()) {
      onSave({ bookName: bookName.trim(), course: course.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && bookName.trim()) {
      e.preventDefault();
      onSave({ bookName: bookName.trim(), course: course.trim() });
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <Dialog.Title className="text-xl font-bold">
                      문서 기본 설정
                    </Dialog.Title>
                  </div>
                  <p className="text-blue-100 text-sm">
                    이 설정은 모든 문제에 자동 적용됩니다
                  </p>
                  {documentName && (
                    <p className="mt-2 text-xs text-blue-200 truncate">
                      {documentName}
                    </p>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* 교재명 */}
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-2">
                      교재명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="예: 수학의 정석, 쎈, 마플"
                      className="w-full px-4 py-3 border border-grey-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      autoFocus
                    />
                  </div>

                  {/* 과정 */}
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-2">
                      과정 (선택)
                    </label>
                    <input
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="예: 고등수학(상), 수학I, 공통수학2"
                      className="w-full px-4 py-3 border border-grey-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* 안내 메시지 */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
                    <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">빠른 라벨링 팁</p>
                      <p className="text-blue-600 mt-1">
                        블록 선택 → G키 → Enter만 누르면 끝!
                      </p>
                    </div>
                  </div>

                  {/* 버튼 */}
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={!bookName.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    시작하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
