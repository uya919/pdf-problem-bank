/**
 * Phase 12-3: 필터링 및 정렬 훅
 *
 * DocumentsPage, ProblemBankPage 등에서 공통으로 사용
 */
import { useState, useMemo } from 'react';

export type SortField = 'name' | 'date' | 'pages' | 'progress';
export type SortOrder = 'asc' | 'desc';

interface UseFiltersAndSortOptions<T> {
  items: T[] | undefined;
  searchFields: (keyof T)[];
  defaultSortField?: SortField;
  defaultSortOrder?: SortOrder;
}

interface UseFiltersAndSortReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  filteredAndSortedItems: T[];
  toggleSortOrder: () => void;
}

export function useFiltersAndSort<T extends Record<string, any>>({
  items,
  searchFields,
  defaultSortField = 'date',
  defaultSortOrder = 'desc',
}: UseFiltersAndSortOptions<T>): UseFiltersAndSortReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    let result = [...items];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          String(item[field]).toLowerCase().includes(query)
        )
      );
    }

    // 정렬
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = String(a.document_id || a.id || '').localeCompare(
            String(b.document_id || b.id || '')
          );
          break;
        case 'date':
          comparison = (a.created_at || 0) - (b.created_at || 0);
          break;
        case 'pages':
          comparison = (a.total_pages || 0) - (b.total_pages || 0);
          break;
        case 'progress':
          const progA = a.total_pages ? (a.analyzed_pages || 0) / a.total_pages : 0;
          const progB = b.total_pages ? (b.analyzed_pages || 0) / b.total_pages : 0;
          comparison = progA - progB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, searchFields, sortField, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return {
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    filteredAndSortedItems,
    toggleSortOrder,
  };
}
