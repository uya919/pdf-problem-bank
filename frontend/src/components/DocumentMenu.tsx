/**
 * DocumentMenu Component
 * Phase 21.7: 문서 더보기 메뉴
 *
 * 토스 스타일 - 깔끔한 드롭다운 메뉴
 */
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { MoreVertical, Settings, Trash2, FileText, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentMenuProps {
  documentId: string;
  documentName: string;
  onDelete: () => void;
  onSettings?: () => void;
  // Phase 22-G: 역할 지정
  onSetAsProblem?: () => void;
  onSetAsSolution?: () => void;
  isProblemDisabled?: boolean;   // 이미 다른 문서가 문제로 지정됨
  isSolutionDisabled?: boolean;  // 이미 다른 문서가 해설로 지정됨
  isCurrentProblem?: boolean;    // 이 문서가 현재 문제로 지정됨
  isCurrentSolution?: boolean;   // 이 문서가 현재 해설로 지정됨
}

export function DocumentMenu({
  documentId,
  documentName,
  onDelete,
  onSettings,
  // Phase 22-G
  onSetAsProblem,
  onSetAsSolution,
  isProblemDisabled,
  isSolutionDisabled,
  isCurrentProblem,
  isCurrentSolution
}: DocumentMenuProps) {
  return (
    <Menu as="div" className="relative">
      {/* 메뉴 버튼 */}
      <Menu.Button
        className={cn(
          'p-2 rounded-lg transition-colors',
          'text-grey-400 hover:text-grey-600 hover:bg-grey-100',
          'focus:outline-none focus:ring-2 focus:ring-toss-blue focus:ring-offset-2'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className="w-5 h-5" />
      </Menu.Button>

      {/* 드롭다운 메뉴 */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute right-0 z-10 mt-1 w-48',
            'bg-white rounded-xl shadow-lg',
            'border border-grey-100',
            'focus:outline-none',
            'overflow-hidden'
          )}
        >
          {/* Phase 22-G: 매칭에 사용 섹션 */}
          {(onSetAsProblem || onSetAsSolution) && (
            <>
              {/* 섹션 헤더 */}
              <div className="px-4 py-2 text-xs font-medium text-grey-400 uppercase tracking-wider">
                매칭에 사용
              </div>

              {/* 문제로 지정 */}
              {onSetAsProblem && (
                <Menu.Item disabled={isProblemDisabled && !isCurrentProblem}>
                  {({ active, disabled }) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) onSetAsProblem();
                      }}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-3 text-sm',
                        disabled
                          ? 'text-grey-300 cursor-not-allowed'
                          : active
                            ? 'bg-toss-blue-light text-toss-blue'
                            : 'text-grey-700',
                        isCurrentProblem && 'bg-toss-blue-light'
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      {isCurrentProblem ? '문제 지정 해제' : '문제로 지정'}
                    </button>
                  )}
                </Menu.Item>
              )}

              {/* 해설로 지정 */}
              {onSetAsSolution && (
                <Menu.Item disabled={isSolutionDisabled && !isCurrentSolution}>
                  {({ active, disabled }) => (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) onSetAsSolution();
                      }}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-3 text-sm',
                        disabled
                          ? 'text-grey-300 cursor-not-allowed'
                          : active
                            ? 'bg-purple-50 text-purple-600'
                            : 'text-grey-700',
                        isCurrentSolution && 'bg-purple-50'
                      )}
                    >
                      <BookOpen className="w-4 h-4" />
                      {isCurrentSolution ? '해설 지정 해제' : '해설로 지정'}
                    </button>
                  )}
                </Menu.Item>
              )}

              {/* 구분선 */}
              <div className="border-t border-grey-100 my-1" />
            </>
          )}

          {/* 문서 설정 (선택적) */}
          {onSettings && (
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettings();
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 text-sm text-grey-700',
                    active && 'bg-grey-50'
                  )}
                >
                  <Settings className="w-4 h-4" />
                  문서 설정
                </button>
              )}
            </Menu.Item>
          )}

          {/* 구분선 */}
          {onSettings && <div className="border-t border-grey-100" />}

          {/* 삭제 */}
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 text-sm',
                  'text-error',
                  active && 'bg-red-50'
                )}
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
