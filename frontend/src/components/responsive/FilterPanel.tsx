/**
 * FilterPanel - 태블릿용 필터 패널 컴포넌트
 *
 * 사이드바에 표시되는 필터 폼
 * - 체크박스 그룹
 * - 검색 입력
 * - 날짜 범위 선택
 */
import React, { ReactNode } from 'react';

interface FilterPanelProps {
  /** 패널 제목 */
  title?: string;
  /** 패널 설명 */
  description?: string;
  /** 필터 내용 */
  children: ReactNode;
  /** 하단 요약 정보 */
  summary?: ReactNode;
  /** 적용 버튼 클릭 */
  onApply?: () => void;
  /** 초기화 버튼 클릭 */
  onReset?: () => void;
  /** 적용 버튼 텍스트 */
  applyText?: string;
  /** 추가 클래스 */
  className?: string;
}

export function FilterPanel({
  title,
  description,
  children,
  summary,
  onApply,
  onReset,
  applyText = '필터 적용',
  className = '',
}: FilterPanelProps) {
  return (
    <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
      {/* 헤더 */}
      {(title || description) && (
        <div className="flex-shrink-0 p-4 border-b bg-white">
          {title && <h2 className="text-xl font-bold text-gray-900">{title}</h2>}
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      )}

      {/* 필터 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>

      {/* 하단 영역 */}
      <div className="flex-shrink-0 border-t bg-white">
        {/* 요약 정보 */}
        {summary && (
          <div className="p-4 border-b">
            {summary}
          </div>
        )}

        {/* 버튼 영역 */}
        {(onApply || onReset) && (
          <div className="p-4 flex gap-2">
            {onReset && (
              <button
                onClick={onReset}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-600 font-medium
                  hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                초기화
              </button>
            )}
            {onApply && (
              <button
                onClick={onApply}
                className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium
                  hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                {applyText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FilterSection - 필터 패널 내 섹션
 */
interface FilterSectionProps {
  label: string;
  children: ReactNode;
}

export function FilterSection({ label, children }: FilterSectionProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * FilterCheckboxGroup - 체크박스 그룹
 */
interface FilterCheckboxGroupProps {
  options: { id: string; label: string; count?: number }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterCheckboxGroup({
  options,
  selected,
  onChange,
}: FilterCheckboxGroupProps) {
  const handleToggle = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id];
    onChange(newSelected);
  };

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-3 p-2 bg-white rounded-lg cursor-pointer
            hover:bg-gray-50 transition-colors"
        >
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => handleToggle(option.id)}
            className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="flex-1 text-sm text-gray-700">{option.label}</span>
          {option.count !== undefined && (
            <span className="text-xs text-gray-400">{option.count}</span>
          )}
        </label>
      ))}
    </div>
  );
}

/**
 * FilterSearchInput - 검색 입력
 */
interface FilterSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FilterSearchInput({
  value,
  onChange,
  placeholder = '검색...',
}: FilterSearchInputProps) {
  return (
    <div className="relative">
      <svg
        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200
          text-sm placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * FilterSelect - 드롭다운 선택
 */
interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder = '선택...',
}: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2.5 bg-white rounded-xl border border-gray-200 text-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default FilterPanel;
