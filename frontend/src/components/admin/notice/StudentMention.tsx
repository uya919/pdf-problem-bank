/**
 * StudentMention - @학생 멘션 입력 컴포넌트
 *
 * Stage 17: 공지 등록 모달
 * - @ 입력 시 학생 검색 드롭다운 표시
 * - 키보드 네비게이션 (↑↓ Enter Escape)
 * - 선택 시 StudentTag로 변환
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useStudentSearch } from '../../../hooks/useStudentSearch';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { StudentTag } from './StudentTag';
import type { TaggedStudent } from '../../../types/admin';

interface StudentMentionProps {
  /** 선택된 학생 */
  value: TaggedStudent | null;
  /** 학생 선택/해제 핸들러 */
  onChange: (student: TaggedStudent | null) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 비활성화 */
  disabled?: boolean;
  /** 에러 메시지 */
  error?: string;
}

/**
 * @학생 멘션 입력
 *
 * @example
 * ```tsx
 * const [student, setStudent] = useState<TaggedStudent | null>(null);
 *
 * <StudentMention
 *   value={student}
 *   onChange={setStudent}
 *   placeholder="@학생이름으로 검색"
 * />
 * ```
 */
export function StudentMention({
  value,
  onChange,
  placeholder = '@학생이름으로 검색',
  disabled = false,
  error,
}: StudentMentionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, setQuery, results, isSearching, clear } = useStudentSearch({
    debounceDelay: 300,
    maxResults: 8,
  });

  // 외부 클릭 시 드롭다운 닫기
  useClickOutside(containerRef, () => {
    setIsOpen(false);
    clear();
  });

  // 결과가 있으면 드롭다운 열기
  useEffect(() => {
    if (results.length > 0 && query.length > 0) {
      setIsOpen(true);
      setHighlightedIndex(0);
    } else if (query.length === 0) {
      setIsOpen(false);
    }
  }, [results, query]);

  // 학생 선택
  const handleSelect = useCallback(
    (student: TaggedStudent) => {
      onChange(student);
      setIsOpen(false);
      clear();
    },
    [onChange, clear]
  );

  // 학생 태그 제거
  const handleRemove = useCallback(() => {
    onChange(null);
    inputRef.current?.focus();
  }, [onChange]);

  // 키보드 네비게이션
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) {
        // Escape로 입력 초기화
        if (e.key === 'Escape') {
          clear();
          setIsOpen(false);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (results[highlightedIndex]) {
            handleSelect(results[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          clear();
          break;
        case 'Tab':
          // Tab 시 드롭다운 닫기
          setIsOpen(false);
          clear();
          break;
      }
    },
    [isOpen, results, highlightedIndex, handleSelect, clear]
  );

  // 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // @ 시작 처리
    if (inputValue.startsWith('@')) {
      setQuery(inputValue.slice(1)); // @ 제거하고 검색
    } else if (inputValue.length > 0) {
      setQuery(inputValue);
    } else {
      setQuery('');
      setIsOpen(false);
    }
  };

  // 이미 학생이 선택된 경우 태그만 표시
  if (value) {
    return (
      <div className="relative" ref={containerRef}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2
            bg-white border rounded-lg
            ${error ? 'border-red-300' : 'border-gray-200'}
          `}
        >
          <StudentTag student={value} onRemove={handleRemove} />
        </div>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* 입력 필드 */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          @
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-8 pr-4 py-2.5
            border rounded-lg
            text-sm text-gray-900
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error ? 'border-red-300' : 'border-gray-200'}
          `}
          autoComplete="off"
        />

        {/* 로딩 인디케이터 */}
        {isSearching && query.length > 0 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && results.length > 0 && (
        <div
          className="
            absolute z-50 w-full mt-1
            bg-white border border-gray-200 rounded-lg shadow-lg
            max-h-64 overflow-y-auto
          "
        >
          {results.map((student, index) => (
            <button
              key={student.id}
              type="button"
              onClick={() => handleSelect(student)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5
                text-left transition-colors
                ${
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-900'
                }
              `}
            >
              {/* 아바타 */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-sm font-medium
                  ${
                    index === highlightedIndex
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }
                `}
              >
                {student.name.charAt(0)}
              </div>

              {/* 학생 정보 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{student.name}</div>
                {(student.grade || student.school) && (
                  <div className="text-xs text-gray-500 truncate">
                    {student.grade}
                    {student.grade && student.school && ' · '}
                    {student.school}
                  </div>
                )}
              </div>

              {/* 선택 힌트 */}
              {index === highlightedIndex && (
                <span className="text-xs text-blue-500">Enter</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {isOpen && query.length > 0 && results.length === 0 && !isSearching && (
        <div
          className="
            absolute z-50 w-full mt-1
            bg-white border border-gray-200 rounded-lg shadow-lg
            px-4 py-6 text-center
          "
        >
          <p className="text-sm text-gray-500">
            &apos;{query}&apos;에 해당하는 학생이 없습니다
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default StudentMention;
