/**
 * 단축키 안내 모달 (Phase 7-E)
 *
 * 키보드 단축키 목록을 보여주는 모달
 */
import { useState } from 'react';

interface ShortcutModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
}

const SHORTCUTS = [
  { category: '반 배정', items: [
    { key: 'Q', description: '심화반 배정' },
    { key: 'W', description: '정규반 배정' },
    { key: 'E', description: '정규2반 배정' },
    { key: 'R', description: '기초반 배정' },
    { key: 'Tab', description: '건너뛰기 (맨 아래로)' },
    { key: 'Backspace', description: '배정 해제' },
  ]},
  { category: '학생 선택', items: [
    { key: '↑ / ↓', description: '이전/다음 학생 선택' },
    { key: 'Shift + Click', description: '범위 선택' },
    { key: 'Ctrl + Click', description: '다중 선택' },
    { key: 'Ctrl + A', description: '전체 선택' },
    { key: 'Esc', description: '선택 해제' },
  ]},
  { category: '필터', items: [
    { key: 'Tab', description: '다음 과목으로 이동 (미선택 시)' },
    { key: 'Ctrl + 1/2/3', description: '초등/중등/고등 필터' },
    { key: '1~6', description: '학년 선택' },
  ]},
  { category: '기타', items: [
    { key: '?', description: '단축키 안내 열기' },
  ]},
];

export function ShortcutModal({ isOpen, onClose }: ShortcutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">키보드 단축키</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 단축키 목록 */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
          {SHORTCUTS.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-gray-700">{item.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 rounded border border-gray-200 text-gray-600">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Esc 또는 바깥 클릭으로 닫기
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 단축키 버튼 (모달 열기용)
 */
export function ShortcutButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>단축키</span>
        <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white rounded border border-gray-200">
          ?
        </kbd>
      </button>

      <ShortcutModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
