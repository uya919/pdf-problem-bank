/**
 * 학부 필터 컴포넌트 (Phase 7-E)
 *
 * 초등/중등/고등 필터링
 * Ctrl+1/2/3 단축키로 전환
 */
import { useEffect, useCallback } from 'react';
import type { Division } from '@/types/database';
import { DIVISION_NAMES } from '@/types/database';

interface DivisionFilterProps {
  /** 현재 선택된 학부 */
  activeDivision: Division | null;
  /** 학부 변경 핸들러 */
  onDivisionChange: (division: Division | null) => void;
  /** 학부별 학생 수 */
  studentCounts?: Record<Division, number>;
  /** 키보드 단축키 활성화 */
  enableKeyboard?: boolean;
}

const DIVISIONS: Division[] = ['elementary', 'middle', 'high'];
const DIVISION_SHORTCUTS: Record<string, Division> = {
  '1': 'elementary',
  '2': 'middle',
  '3': 'high',
};

export function DivisionFilter({
  activeDivision,
  onDivisionChange,
  studentCounts,
  enableKeyboard = true,
}: DivisionFilterProps) {
  // Ctrl+1/2/3 단축키
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeyboard) return;
      if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        const division = DIVISION_SHORTCUTS[e.key];
        if (division) {
          e.preventDefault();
          // 같은 학부 클릭 시 필터 해제
          onDivisionChange(activeDivision === division ? null : division);
        }
      }
    },
    [activeDivision, onDivisionChange, enableKeyboard]
  );

  useEffect(() => {
    if (enableKeyboard) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableKeyboard]);

  return (
    <div className="flex gap-1.5">
      {/* 전체 보기 버튼 */}
      <button
        onClick={() => onDivisionChange(null)}
        className={`
          px-3 py-1.5 rounded-md text-sm font-medium transition-colors
          ${
            activeDivision === null
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
        `}
      >
        전체
      </button>

      {/* 학부별 버튼 */}
      {DIVISIONS.map((division, index) => {
        const isActive = activeDivision === division;
        const count = studentCounts?.[division] ?? 0;

        return (
          <button
            key={division}
            onClick={() => onDivisionChange(isActive ? null : division)}
            className={`
              px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              flex items-center gap-1.5
              ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <span>{DIVISION_NAMES[division]}</span>
            {count > 0 && (
              <span
                className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-400'}`}
              >
                ({count})
              </span>
            )}
            {enableKeyboard && (
              <span
                className={`text-xs ${isActive ? 'text-gray-400' : 'text-gray-300'} hidden sm:inline`}
              >
                ⌃{index + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
