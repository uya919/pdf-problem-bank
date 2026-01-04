/**
 * TextbookAutocomplete - 교재 검색 + 자동완성 컴포넌트
 *
 * Stage 40 개선:
 * - 그룹핑 UI 지원 (이 반 교재 / 최근 사용)
 * - 반 연결 교재 우선 표시
 * - 검색 시에만 전체 필터링
 *
 * 기능:
 * - 입력 시 실시간 필터링
 * - 클릭 또는 Enter로 선택
 * - 새 교재명 직접 입력 가능
 * - 포커스 아웃 시 드롭다운 닫기
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, BookOpen, Clock } from 'lucide-react';

/** 그룹핑된 교재 목록 (Stage 40) */
export interface GroupedTextbooks {
  linked: string[];  // 반 연결 교재
  recent: string[];  // 최근 사용 교재
}

interface TextbookAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  textbooks: string[];
  /** 그룹핑된 교재 목록 (Stage 40) */
  groupedTextbooks?: GroupedTextbooks;
  placeholder?: string;
  className?: string;
}

export function TextbookAutocomplete({
  value,
  onChange,
  textbooks,
  groupedTextbooks,
  placeholder = '교재 검색...',
  className = '',
}: TextbookAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // value prop 변경 시 inputValue 동기화
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // 검색 모드: 입력값이 있으면 검색, 없으면 그룹 표시
  const isSearchMode = inputValue.trim().length > 0;

  // 검색어로 필터링 (검색 모드일 때만)
  const filtered = useMemo(() => {
    if (!isSearchMode) return [];
    const lower = inputValue.toLowerCase();
    return textbooks
      .filter((t) => t.toLowerCase().includes(lower))
      .slice(0, 10);
  }, [inputValue, textbooks, isSearchMode]);

  // 전체 항목 수 계산 (키보드 네비게이션용)
  const totalItems = useMemo(() => {
    if (isSearchMode) return filtered.length;
    const linked = groupedTextbooks?.linked.length || 0;
    const recent = groupedTextbooks?.recent.length || 0;
    return linked + recent;
  }, [isSearchMode, filtered, groupedTextbooks]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // 입력값이 비어있지 않으면 그대로 적용
        if (inputValue.trim() && inputValue !== value) {
          onChange(inputValue.trim());
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isSearchMode) {
          if (filtered[highlightIndex]) {
            handleSelect(filtered[highlightIndex]);
          } else if (inputValue.trim()) {
            handleSelect(inputValue.trim());
          }
        } else {
          // 그룹 모드: 인덱스에서 해당 교재 찾기
          const allItems = [
            ...(groupedTextbooks?.linked || []),
            ...(groupedTextbooks?.recent || []),
          ];
          if (allItems[highlightIndex]) {
            handleSelect(allItems[highlightIndex]);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (textbook: string) => {
    onChange(textbook);
    setInputValue(textbook);
    setIsOpen(false);
    setHighlightIndex(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightIndex(0);
  };

  // 그룹 모드에서 현재 하이라이트 인덱스가 어느 항목인지 계산
  const getGroupHighlightIndex = (groupStartIndex: number, itemIndex: number) => {
    return groupStartIndex + itemIndex === highlightIndex;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 입력 필드 */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]"
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-10 pl-8 pr-8 border border-[#E5E8EB] rounded-lg text-sm text-[#191F28] focus:outline-none focus:border-[#3182F6] bg-[#F9FAFB]"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8B95A1] hover:text-[#333D4B]"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* 드롭다운 */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border border-[#E5E8EB] rounded-lg shadow-lg z-50 mt-1 max-h-64 overflow-y-auto">
          {isSearchMode ? (
            // 검색 모드: 필터링된 결과 표시
            <>
              {filtered.length > 0 ? (
                filtered.map((textbook, index) => (
                  <button
                    key={textbook}
                    type="button"
                    onClick={() => handleSelect(textbook)}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                      index === highlightIndex
                        ? 'bg-[#F2F4F6] text-[#191F28]'
                        : 'text-[#333D4B] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {highlightMatch(textbook, inputValue)}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelect(inputValue.trim())}
                  className="w-full px-3 py-2.5 text-left text-sm text-[#3182F6] hover:bg-[#F9FAFB]"
                >
                  "{inputValue.trim()}" 새로 추가
                </button>
              )}
            </>
          ) : groupedTextbooks ? (
            // 그룹 모드: 반 연결 교재 / 최근 사용 그룹화
            <>
              {/* 이 반 교재 섹션 */}
              {groupedTextbooks.linked.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-[#6B7684] bg-[#F9FAFB] border-b border-[#E5E8EB] flex items-center gap-1.5">
                    <BookOpen size={12} />
                    이 반 교재
                  </div>
                  {groupedTextbooks.linked.map((textbook, index) => (
                    <button
                      key={`linked-${textbook}`}
                      type="button"
                      onClick={() => handleSelect(textbook)}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        getGroupHighlightIndex(0, index)
                          ? 'bg-[#EBF4FF] text-[#191F28]'
                          : 'text-[#333D4B] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
                        {textbook}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* 최근 사용 섹션 */}
              {groupedTextbooks.recent.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-[#6B7684] bg-[#F9FAFB] border-b border-[#E5E8EB] flex items-center gap-1.5">
                    <Clock size={12} />
                    최근 사용
                  </div>
                  {groupedTextbooks.recent.map((textbook, index) => (
                    <button
                      key={`recent-${textbook}`}
                      type="button"
                      onClick={() => handleSelect(textbook)}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        getGroupHighlightIndex(groupedTextbooks.linked.length, index)
                          ? 'bg-[#F2F4F6] text-[#191F28]'
                          : 'text-[#8B95A1] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {textbook}
                    </button>
                  ))}
                </div>
              )}

              {/* 교재가 하나도 없을 때 */}
              {groupedTextbooks.linked.length === 0 && groupedTextbooks.recent.length === 0 && (
                <div className="px-3 py-4 text-sm text-[#8B95A1] text-center">
                  교재명을 입력하세요
                </div>
              )}

              {/* 다른 교재 검색 안내 */}
              {(groupedTextbooks.linked.length > 0 || groupedTextbooks.recent.length > 0) && (
                <div className="px-3 py-2 text-xs text-[#8B95A1] bg-[#F9FAFB] border-t border-[#E5E8EB]">
                  다른 교재는 검색어를 입력하세요
                </div>
              )}
            </>
          ) : (
            // 레거시 모드: 기존 방식 (그룹핑 없음)
            <>
              {textbooks.slice(0, 10).map((textbook, index) => (
                <button
                  key={textbook}
                  type="button"
                  onClick={() => handleSelect(textbook)}
                  className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                    index === highlightIndex
                      ? 'bg-[#F2F4F6] text-[#191F28]'
                      : 'text-[#333D4B] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {textbook}
                </button>
              ))}
              {textbooks.length === 0 && (
                <div className="px-3 py-2.5 text-sm text-[#8B95A1]">
                  교재를 검색하세요
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 검색어 하이라이트 헬퍼
 */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const index = lower.indexOf(queryLower);

  if (index === -1) return text;

  return (
    <>
      {text.slice(0, index)}
      <span className="text-[#3182F6] font-medium">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}
