/**
 * Document Filters Component (Phase 6-3)
 *
 * Filtering and sorting controls for document list
 */
import { Search, Filter, SortAsc } from 'lucide-react';
import { Badge } from './ui/Badge';

export type FilterStatus = 'all' | 'completed' | 'processing' | 'pending';
export type SortBy = 'newest' | 'oldest' | 'name' | 'progress';

interface DocumentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  sortBy: SortBy;
  onSortByChange: (sortBy: SortBy) => void;
  totalCount: number;
  filteredCount: number;
}

export function DocumentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  totalCount,
  filteredCount,
}: DocumentFiltersProps) {
  const statusOptions: { value: FilterStatus; label: string; color: string }[] = [
    { value: 'all', label: '전체', color: 'text-grey-600' },
    { value: 'completed', label: '완료', color: 'text-emerald-600' },
    { value: 'processing', label: '분석 중', color: 'text-amber-600' },
    { value: 'pending', label: '대기', color: 'text-grey-500' },
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'newest', label: '최신순' },
    { value: 'oldest', label: '오래된 순' },
    { value: 'name', label: '이름순' },
    { value: 'progress', label: '진행률순' },
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" />
        <input
          type="text"
          placeholder="문서 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-grey-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-grey-600" />
          <span className="text-sm font-medium text-grey-700">상태:</span>
          <div className="flex gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onStatusFilterChange(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === option.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-grey-100 text-grey-700 hover:bg-grey-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SortAsc className="w-5 h-5 text-grey-600" />
          <span className="text-sm font-medium text-grey-700">정렬:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="px-3 py-1.5 border border-grey-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Result Count */}
      <div className="flex items-center justify-between text-sm text-grey-600">
        <span>
          {filteredCount === totalCount
            ? `전체 ${totalCount}개 문서`
            : `${filteredCount}개 문서 (전체 ${totalCount}개 중)`}
        </span>
        {searchQuery && (
          <Badge variant="secondary">검색: {searchQuery}</Badge>
        )}
      </div>
    </div>
  );
}
