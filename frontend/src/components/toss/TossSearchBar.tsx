/**
 * Phase 65-A: 토스 스타일 검색 바
 *
 * 깔끔한 라운드 검색 인풋
 */
import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

interface TossSearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  hint?: string;
  onSearch: (query: string) => void;
  onChange?: (query: string) => void;
}

export function TossSearchBar({
  placeholder = '검색어를 입력하세요',
  defaultValue = '',
  hint,
  onSearch,
  onChange,
}: TossSearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSearch(value.trim());
    }
  }, [value, onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    onChange?.('');
  }, [onChange]);

  return (
    <div>
      <div className="flex items-center bg-grey-100 rounded-2xl px-4 py-3 transition-all focus-within:ring-2 focus-within:ring-toss-blue/30">
        <Search className="w-5 h-5 text-grey-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-grey-900 placeholder-grey-400 outline-none text-base"
        />
        {value && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-grey-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-grey-400" />
          </button>
        )}
      </div>
      {hint && (
        <p className="text-xs text-grey-400 mt-2 px-1">{hint}</p>
      )}
    </div>
  );
}
