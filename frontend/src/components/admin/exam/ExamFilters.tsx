/**
 * 시험 필터 컴포넌트
 * - 과목 탭 (전체/국어/영어/수학)
 * - 월 선택 드롭다운
 * - 검색 입력
 */
import { Search } from 'lucide-react';
import type { ExamFilters as ExamFiltersType, Subject } from '../../../types/exam';
import { SUBJECT_LABELS } from '../../../types/exam';

interface ExamFiltersProps {
  filters: ExamFiltersType;
  onChange: (filters: ExamFiltersType) => void;
}

const SUBJECT_OPTIONS: (Subject | undefined)[] = [undefined, 'korean', 'english', 'math'];

export function ExamFilters({ filters, onChange }: ExamFiltersProps) {
  // 최근 6개월 옵션 생성
  const monthOptions = getRecentMonths(6);

  return (
    <div className="flex items-center gap-4 mb-6">
      {/* 과목 탭 */}
      <div className="flex bg-grey-100 p-1 rounded-xl">
        {SUBJECT_OPTIONS.map((subject) => (
          <button
            key={subject || 'all'}
            onClick={() => onChange({ ...filters, subject })}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${filters.subject === subject
                ? 'bg-white shadow-sm text-grey-900'
                : 'text-grey-600 hover:text-grey-900'
              }
            `}
          >
            {subject ? SUBJECT_LABELS[subject] : '전체'}
          </button>
        ))}
      </div>

      {/* 월 선택 */}
      <select
        value={filters.month || ''}
        onChange={(e) => onChange({ ...filters, month: e.target.value || undefined })}
        className="px-4 py-2.5 border border-grey-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">전체 기간</option>
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 검색 */}
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="시험명 검색..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
          className="w-full pl-10 pr-4 py-2.5 border border-grey-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
      </div>
    </div>
  );
}

/**
 * 최근 N개월 옵션 생성
 */
function getRecentMonths(count: number): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, '0')}`;
    const label = `${year}년 ${month}월`;
    months.push({ value, label });
  }

  return months;
}
