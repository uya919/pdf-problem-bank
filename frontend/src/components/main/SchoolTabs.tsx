/**
 * SchoolTabs Component (Phase 34.5-H)
 *
 * 초/중/고 학교급 탭
 */
import type { SchoolLevel } from '../../lib/documentParser';

interface SchoolTabsProps {
  value: SchoolLevel;
  onChange: (school: SchoolLevel) => void;
  counts?: { elementary: number; middle: number; high: number };
}

const SCHOOLS: { id: SchoolLevel; label: string; shortLabel: string }[] = [
  { id: 'elementary', label: '초등학교', shortLabel: '초등' },
  { id: 'middle', label: '중학교', shortLabel: '중등' },
  { id: 'high', label: '고등학교', shortLabel: '고등' },
];

export function SchoolTabs({ value, onChange, counts }: SchoolTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-grey-100 rounded-xl">
      {SCHOOLS.map((school) => {
        const count = counts?.[school.id] || 0;
        const isSelected = value === school.id;

        return (
          <button
            key={school.id}
            onClick={() => onChange(school.id)}
            className={`
              flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all
              ${isSelected
                ? 'bg-white text-grey-900 shadow-sm'
                : 'text-grey-500 hover:text-grey-700'}
            `}
          >
            <span>{school.label}</span>
            {count > 0 && (
              <span className={`ml-1.5 text-xs ${isSelected ? 'text-grey-400' : 'text-grey-400'}`}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
