/**
 * 필터 사이드바 컴포넌트
 *
 * Phase 21+ B-1: 문제은행 메인 UI
 *
 * 문제 필터링 옵션 제공
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X, Filter, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClassificationBreadcrumb, ClassificationPicker } from '../classification';
import type { ProblemFilter } from '../../types/problem';
import type { ClassificationPath } from '../../types/classification';

interface FilterSidebarProps {
  filter: Partial<ProblemFilter>;
  onChange: (filter: Partial<ProblemFilter>) => void;
  onClear: () => void;
  availableTags?: string[];
  className?: string;
}

// 필터 섹션 컴포넌트
function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-grey-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-sm font-medium text-grey-700"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-grey-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-grey-400" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 체크박스 옵션
function CheckboxOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-grey-300 text-blue-500 focus:ring-blue-500"
      />
      <span className="text-sm text-grey-600 group-hover:text-grey-900">{label}</span>
    </label>
  );
}

export function FilterSidebar({
  filter,
  onChange,
  onClear,
  availableTags = [],
  className = '',
}: FilterSidebarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // 분류 선택
  const handleClassificationChange = (path: ClassificationPath | null) => {
    if (!path) {
      // 분류 초기화
      onChange({
        ...filter,
        gradeIds: undefined,
        majorUnitIds: undefined,
        middleUnitIds: undefined,
      });
      return;
    }
    onChange({
      ...filter,
      gradeIds: path.gradeId ? [path.gradeId] : undefined,
      majorUnitIds: path.majorUnitId ? [path.majorUnitId] : undefined,
      middleUnitIds: path.middleUnitId ? [path.middleUnitId] : undefined,
      minorUnitIds: path.minorUnitId ? [path.minorUnitId] : undefined,
      typeIds: path.typeId ? [path.typeId] : undefined,
    });
    setPickerOpen(false);
  };

  // 난이도 변경
  const handleDifficultyChange = (min: number, max: number) => {
    onChange({
      ...filter,
      difficultyMin: min,
      difficultyMax: max,
    });
  };

  // 문제 유형 토글
  const toggleQuestionType = (type: string) => {
    const current = filter.questionTypes || [];
    const updated = current.includes(type as any)
      ? current.filter((t) => t !== type)
      : [...current, type as any];
    onChange({
      ...filter,
      questionTypes: updated.length > 0 ? updated : undefined,
    });
  };

  // 출처 유형 토글
  const toggleSourceType = (type: 'book' | 'exam' | 'custom') => {
    const current = filter.sourceTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({
      ...filter,
      sourceTypes: updated.length > 0 ? updated : undefined,
    });
  };

  // 태그 토글
  const toggleTag = (tag: string) => {
    const current = filter.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    onChange({
      ...filter,
      tags: updated.length > 0 ? updated : undefined,
    });
  };

  // 현재 분류 경로 생성
  const currentClassification: ClassificationPath | null =
    filter.gradeIds || filter.majorUnitIds || filter.middleUnitIds
      ? {
          gradeId: filter.gradeIds?.[0] || 0,
          majorUnitId: filter.majorUnitIds?.[0],
          middleUnitId: filter.middleUnitIds?.[0],
          minorUnitId: filter.minorUnitIds?.[0],
          typeId: filter.typeIds?.[0],
          gradeName: '',
          fullPath: '선택된 분류',
        }
      : null;

  // 활성 필터 개수
  const activeFilterCount = [
    filter.gradeIds?.length,
    filter.majorUnitIds?.length,
    filter.middleUnitIds?.length,
    filter.questionTypes?.length,
    filter.sourceTypes?.length,
    filter.tags?.length,
    filter.difficultyMin !== undefined || filter.difficultyMax !== undefined,
    filter.hasAnswer,
    filter.hasSolution,
    filter.isFavorite,
  ].filter(Boolean).length;

  return (
    <div className={`bg-white rounded-2xl p-4 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-grey-500" />
          <span className="font-medium text-grey-900">필터</span>
          {activeFilterCount > 0 && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-grey-500 hover:text-grey-700"
          >
            <RotateCcw className="w-3 h-3" />
            초기화
          </button>
        )}
      </div>

      {/* 분류 */}
      <FilterSection title="분류">
        <ClassificationBreadcrumb
          value={currentClassification}
          onEdit={() => setPickerOpen(true)}
          onClear={() => onChange({
            ...filter,
            gradeIds: undefined,
            majorUnitIds: undefined,
            middleUnitIds: undefined,
            minorUnitIds: undefined,
            typeIds: undefined,
          })}
          placeholder="분류 선택"
        />
      </FilterSection>

      {/* 난이도 */}
      <FilterSection title="난이도">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-grey-500">
              Lv.{filter.difficultyMin || 1} ~ Lv.{filter.difficultyMax || 10}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="range"
              min="1"
              max="10"
              value={filter.difficultyMin || 1}
              onChange={(e) =>
                handleDifficultyChange(
                  Number(e.target.value),
                  Math.max(Number(e.target.value), filter.difficultyMax || 10)
                )
              }
              className="flex-1"
            />
            <input
              type="range"
              min="1"
              max="10"
              value={filter.difficultyMax || 10}
              onChange={(e) =>
                handleDifficultyChange(
                  Math.min(filter.difficultyMin || 1, Number(e.target.value)),
                  Number(e.target.value)
                )
              }
              className="flex-1"
            />
          </div>
          <div className="flex justify-between text-xs text-grey-400">
            <span>쉬움</span>
            <span>어려움</span>
          </div>
        </div>
      </FilterSection>

      {/* 문제 유형 */}
      <FilterSection title="문제 유형">
        <div className="space-y-1">
          <CheckboxOption
            label="객관식"
            checked={filter.questionTypes?.includes('multiple_choice') || false}
            onChange={() => toggleQuestionType('multiple_choice')}
          />
          <CheckboxOption
            label="단답형"
            checked={filter.questionTypes?.includes('short_answer') || false}
            onChange={() => toggleQuestionType('short_answer')}
          />
          <CheckboxOption
            label="서술형"
            checked={filter.questionTypes?.includes('essay') || false}
            onChange={() => toggleQuestionType('essay')}
          />
        </div>
      </FilterSection>

      {/* 출처 유형 */}
      <FilterSection title="출처">
        <div className="space-y-1">
          <CheckboxOption
            label="교재"
            checked={filter.sourceTypes?.includes('book') || false}
            onChange={() => toggleSourceType('book')}
          />
          <CheckboxOption
            label="기출문제"
            checked={filter.sourceTypes?.includes('exam') || false}
            onChange={() => toggleSourceType('exam')}
          />
          <CheckboxOption
            label="직접 입력"
            checked={filter.sourceTypes?.includes('custom') || false}
            onChange={() => toggleSourceType('custom')}
          />
        </div>
      </FilterSection>

      {/* 기타 옵션 */}
      <FilterSection title="기타">
        <div className="space-y-1">
          <CheckboxOption
            label="정답 있는 문제만"
            checked={filter.hasAnswer || false}
            onChange={(checked) => onChange({ ...filter, hasAnswer: checked || undefined })}
          />
          <CheckboxOption
            label="해설 있는 문제만"
            checked={filter.hasSolution || false}
            onChange={(checked) => onChange({ ...filter, hasSolution: checked || undefined })}
          />
          <CheckboxOption
            label="즐겨찾기만"
            checked={filter.isFavorite || false}
            onChange={(checked) => onChange({ ...filter, isFavorite: checked || undefined })}
          />
        </div>
      </FilterSection>

      {/* 태그 */}
      {availableTags.length > 0 && (
        <FilterSection title="태그" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.slice(0, 20).map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`
                  text-xs px-2.5 py-1 rounded-full transition-colors
                  ${filter.tags?.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                  }
                `}
              >
                {tag}
              </button>
            ))}
            {availableTags.length > 20 && (
              <span className="text-xs text-grey-400 self-center">
                +{availableTags.length - 20}개 더
              </span>
            )}
          </div>
        </FilterSection>
      )}

      {/* 분류 선택 피커 */}
      <ClassificationPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={currentClassification}
        onChange={handleClassificationChange}
        minSelectLevel={1}
        title="분류 선택"
      />
    </div>
  );
}

export default FilterSidebar;
