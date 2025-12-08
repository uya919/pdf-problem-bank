/**
 * useDocumentSearch Hook (Phase 34.5-C)
 *
 * 문서 조합 검색
 */
import { useState, useMemo } from 'react';
import { generateSearchKeywords } from '../lib/documentParser';
import type { DocumentCombo } from '../lib/documentParser';

interface UseDocumentSearchProps {
  combos: DocumentCombo[];
}

export function useDocumentSearch({ combos }: UseDocumentSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];

    const terms = trimmedQuery.split(/\s+/);

    return combos
      .map((combo) => {
        // 검색 대상 텍스트 생성
        const searchTexts = [
          combo.grade,
          combo.course,
          combo.series,
        ];

        // 축약어 추가
        const fakeDoc = {
          schoolLevel: combo.schoolLevel,
          grade: combo.grade,
          course: combo.course,
          series: combo.series,
          type: null,
          original: '',
        };
        const keywords = generateSearchKeywords(fakeDoc);
        searchTexts.push(...keywords);

        const fullText = searchTexts.join(' ').toLowerCase();

        // 모든 검색어가 포함되어야 함
        const matchCount = terms.filter((term) => fullText.includes(term)).length;
        const isMatch = matchCount === terms.length;

        return { combo, matchCount, isMatch };
      })
      .filter((item) => item.isMatch)
      .sort((a, b) => {
        // 완비(문제+해설) 우선
        if (b.combo.isComplete !== a.combo.isComplete) {
          return b.combo.isComplete ? 1 : -1;
        }
        // 매치 수 높은 순
        return b.matchCount - a.matchCount;
      })
      .slice(0, 10)
      .map((item) => item.combo);
  }, [combos, query]);

  return {
    query,
    setQuery,
    results,
    hasResults: results.length > 0,
    isSearching: query.trim().length > 0,
  };
}
