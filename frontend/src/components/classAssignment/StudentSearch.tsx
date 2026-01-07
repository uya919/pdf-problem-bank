/**
 * 학생 검색 컴포넌트 (Phase 8-E)
 *
 * 학생 이름으로 검색하여 필터링
 */
import { useState, useEffect, useRef } from 'react';

interface StudentSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function StudentSearch({
  value,
  onChange,
  placeholder = '학생 검색...',
}: StudentSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+F 단축키로 검색창 포커스
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`
      relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
      ${isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
    `}>
      {/* 검색 아이콘 */}
      <svg
        className={`w-4 h-4 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* 검색 입력 */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 outline-none text-sm bg-transparent"
      />

      {/* 검색어 있을 때 클리어 버튼 */}
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-0.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* 단축키 힌트 */}
      {!isFocused && !value && (
        <span className="text-xs text-gray-400">Ctrl+F</span>
      )}
    </div>
  );
}
