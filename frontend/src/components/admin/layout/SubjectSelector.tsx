/**
 * Phase 2: SubjectSelector
 *
 * 헤더 우측 과목 필터 드롭다운
 * - 수학/영어/국어/전체 선택
 * - 토스 스타일 pill 버튼
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { useSubjectStore, Subject, SUBJECT_LABELS, SUBJECT_COLORS } from '../../../stores/subjectStore';

export function SubjectSelector() {
  const { subject, setSubject } = useSubjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const subjects: Subject[] = ['math', 'english', 'korean', 'all'];

  return (
    <div ref={dropdownRef} className="relative">
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 border
          ${subject === 'all'
            ? 'bg-grey-100 text-grey-700 border-grey-200 hover:bg-grey-200'
            : SUBJECT_COLORS[subject] + ' border-transparent'
          }
        `}
      >
        <BookOpen className="w-4 h-4" />
        <span>{SUBJECT_LABELS[subject]}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-grey-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSubject(s);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2.5 text-left text-sm flex items-center gap-2
                transition-colors
                ${subject === s
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-grey-700 hover:bg-grey-50'
                }
              `}
            >
              {/* 선택 표시 */}
              <span className={`
                w-2 h-2 rounded-full
                ${subject === s ? 'bg-blue-500' : 'bg-transparent'}
              `} />
              {SUBJECT_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
