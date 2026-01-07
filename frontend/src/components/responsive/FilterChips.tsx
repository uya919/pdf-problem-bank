/**
 * FilterChips - 모바일용 필터 칩 컴포넌트
 *
 * 가로 스크롤 가능한 필터 칩 목록
 * - 단일 선택 또는 다중 선택 지원
 * - 토스 스타일 디자인
 */
import React from 'react';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface FilterChipsProps {
  /** 필터 옵션 목록 */
  options: FilterOption[];
  /** 선택된 필터 ID (단일 선택) */
  selected?: string;
  /** 선택된 필터 ID 목록 (다중 선택) */
  selectedMultiple?: string[];
  /** 필터 변경 핸들러 (단일 선택) */
  onChange?: (id: string) => void;
  /** 필터 변경 핸들러 (다중 선택) */
  onChangeMultiple?: (ids: string[]) => void;
  /** 다중 선택 모드 */
  multiple?: boolean;
  /** 추가 클래스 */
  className?: string;
}

export function FilterChips({
  options,
  selected,
  selectedMultiple = [],
  onChange,
  onChangeMultiple,
  multiple = false,
  className = '',
}: FilterChipsProps) {
  const handleClick = (id: string) => {
    if (multiple && onChangeMultiple) {
      const newSelected = selectedMultiple.includes(id)
        ? selectedMultiple.filter(s => s !== id)
        : [...selectedMultiple, id];
      onChangeMultiple(newSelected);
    } else if (onChange) {
      onChange(id);
    }
  };

  const isSelected = (id: string) => {
    return multiple ? selectedMultiple.includes(id) : selected === id;
  };

  return (
    <div className={`overflow-x-auto no-scrollbar ${className}`}>
      <div className="flex gap-2 px-4 py-2" style={{ width: 'max-content' }}>
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleClick(option.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors whitespace-nowrap
              ${isSelected(option.id)
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
              }
            `}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isSelected(option.id)
                  ? 'bg-blue-400 text-white'
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {option.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FilterChips;
