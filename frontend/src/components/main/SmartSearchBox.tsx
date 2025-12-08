/**
 * SmartSearchBox Component (Phase 34.5-E)
 *
 * 스마트 검색창 + 검색 결과 드롭다운
 */
import { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchResultItem } from './SearchResultItem';
import type { DocumentCombo } from '../../lib/documentParser';
import { useDocumentSearch } from '../../hooks/useDocumentSearch';

interface SmartSearchBoxProps {
  combos: DocumentCombo[];
  onSelect: (combo: DocumentCombo) => void;
}

export function SmartSearchBox({ combos, onSelect }: SmartSearchBoxProps) {
  const { query, setQuery, results, isSearching } = useDocumentSearch({ combos });
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showResults = isFocused && isSearching;

  const handleSelect = (combo: DocumentCombo) => {
    onSelect(combo);
    setQuery('');
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative">
      {/* 검색 입력창 */}
      <div
        className={`
        flex items-center gap-3 px-4 py-3.5 bg-grey-50 rounded-xl border-2 transition-all
        ${isFocused ? 'border-toss-blue bg-white shadow-lg shadow-toss-blue/10' : 'border-transparent hover:bg-grey-100'}
      `}
      >
        <Search className={`w-5 h-5 ${isFocused ? 'text-toss-blue' : 'text-grey-400'}`} />
        <input
          ref={inputRef}
          type="text"
          placeholder='검색... (예: "고1 공통 수바", "중2 쎈")'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="flex-1 bg-transparent outline-none text-grey-900 placeholder:text-grey-400"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 hover:bg-grey-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-grey-400" />
          </button>
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-grey-200 overflow-hidden z-50"
          >
            {results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {results.map((combo) => (
                  <SearchResultItem
                    key={combo.id}
                    combo={combo}
                    query={query}
                    onClick={() => handleSelect(combo)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-grey-500">
                <p>검색 결과가 없습니다</p>
                <p className="text-sm mt-1">다른 검색어를 시도해보세요</p>
              </div>
            )}

            {/* 검색 팁 */}
            <div className="px-4 py-2.5 bg-grey-50 border-t border-grey-100">
              <p className="text-xs text-grey-500">
                💡 학년, 과정, 시리즈 일부만 입력해도 검색됩니다 (예: 수바 = 수학의바이블)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
