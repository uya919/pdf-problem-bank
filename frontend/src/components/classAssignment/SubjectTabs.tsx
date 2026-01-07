/**
 * 과목 탭 컴포넌트 (Phase 7-E)
 *
 * 수학/국어/영어 과목을 탭으로 표시
 * Tab 키로 과목 전환 가능
 */
import { useEffect, useCallback } from 'react';
import type { SubjectCode } from '@/types/database';
import { SUBJECT_CONFIG } from '@/types/database';

interface SubjectTabsProps {
  /** 현재 선택된 과목 */
  activeSubject: SubjectCode;
  /** 과목 변경 핸들러 */
  onSubjectChange: (subject: SubjectCode) => void;
  /** 과목별 미배정 학생 수 */
  unassignedCounts?: Record<SubjectCode, number>;
  /** Tab 키 단축키 활성화 */
  enableKeyboard?: boolean;
}

const SUBJECTS: SubjectCode[] = ['math', 'korean', 'english'];

export function SubjectTabs({
  activeSubject,
  onSubjectChange,
  unassignedCounts,
  enableKeyboard = true,
}: SubjectTabsProps) {
  // Tab 키로 과목 전환
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enableKeyboard) return;
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const currentIndex = SUBJECTS.indexOf(activeSubject);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + SUBJECTS.length) % SUBJECTS.length
          : (currentIndex + 1) % SUBJECTS.length;
        onSubjectChange(SUBJECTS[nextIndex]);
      }
    },
    [activeSubject, onSubjectChange, enableKeyboard]
  );

  useEffect(() => {
    if (enableKeyboard) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enableKeyboard]);

  return (
    <div className="flex gap-2 p-2 bg-gray-50 rounded-lg">
      {SUBJECTS.map((code, index) => {
        const config = SUBJECT_CONFIG[code];
        const isActive = activeSubject === code;
        const unassigned = unassignedCounts?.[code] ?? 0;

        return (
          <button
            key={code}
            onClick={() => onSubjectChange(code)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
              transition-all duration-200 flex-1 justify-center
              ${
                isActive
                  ? `bg-white shadow-sm border-2`
                  : 'bg-transparent hover:bg-white/50 border-2 border-transparent'
              }
            `}
            style={{
              borderColor: isActive ? config.color : 'transparent',
              color: isActive ? config.color : '#6B7280',
            }}
          >
            {/* 과목명 */}
            <span>{config.name}</span>

            {/* 미배정 카운트 */}
            {unassigned > 0 && (
              <span
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: isActive ? config.color : '#9CA3AF' }}
              >
                {unassigned}
              </span>
            )}

            {/* 단축키 힌트 (첫 번째만) */}
            {enableKeyboard && index === 0 && (
              <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
                (Tab)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
