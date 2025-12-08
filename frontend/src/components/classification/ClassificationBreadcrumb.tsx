/**
 * 분류 브레드크럼 컴포넌트
 *
 * Phase 21+ A-3: 분류 선택 컴포넌트
 *
 * 선택된 분류 경로를 표시하는 컴포넌트
 */

import React from 'react';
import { ChevronRight, Edit2, X } from 'lucide-react';
import type { ClassificationPath } from '../../types/classification';

interface ClassificationBreadcrumbProps {
  /** 분류 경로 */
  value: ClassificationPath | null | undefined;

  /** 편집 버튼 클릭 콜백 */
  onEdit?: () => void;

  /** 삭제 버튼 클릭 콜백 */
  onClear?: () => void;

  /** placeholder 텍스트 */
  placeholder?: string;

  /** 읽기 전용 모드 */
  readOnly?: boolean;

  /** 컴팩트 모드 */
  compact?: boolean;

  /** 클래스명 */
  className?: string;
}

export function ClassificationBreadcrumb({
  value,
  onEdit,
  onClear,
  placeholder = '분류를 선택하세요',
  readOnly = false,
  compact = false,
  className = '',
}: ClassificationBreadcrumbProps) {
  // 경로 파싱
  const pathParts = value?.fullPath?.split(' > ') || [];
  const hasValue = pathParts.length > 0;

  if (compact) {
    // 컴팩트 모드: 단일 줄
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {hasValue ? (
          <>
            <span className="text-sm text-grey-600 truncate">
              {value?.fullPath}
            </span>
            {!readOnly && onEdit && (
              <button
                onClick={onEdit}
                className="p-1 hover:bg-grey-100 rounded transition-colors"
              >
                <Edit2 className="w-3 h-3 text-grey-400" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onEdit}
            className="text-sm text-grey-400 hover:text-blue-500 transition-colors"
          >
            {placeholder}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        flex items-center gap-2 p-3 rounded-xl border
        ${hasValue ? 'bg-white border-grey-200' : 'bg-grey-50 border-dashed border-grey-300'}
        ${!readOnly && onEdit ? 'cursor-pointer hover:border-blue-400' : ''}
        transition-colors duration-150
        ${className}
      `}
      onClick={!readOnly ? onEdit : undefined}
    >
      {hasValue ? (
        <>
          {/* 경로 표시 */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {pathParts.map((part, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-grey-300 flex-shrink-0" />
                )}
                <span
                  className={`
                    whitespace-nowrap text-sm
                    ${index === pathParts.length - 1
                      ? 'text-blue-600 font-medium'
                      : 'text-grey-600'
                    }
                  `}
                >
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* 액션 버튼들 */}
          {!readOnly && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 hover:bg-grey-100 rounded-lg transition-colors"
                  title="수정"
                >
                  <Edit2 className="w-4 h-4 text-grey-400" />
                </button>
              )}
              {onClear && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  title="삭제"
                >
                  <X className="w-4 h-4 text-grey-400 hover:text-red-500" />
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* 빈 상태 */}
          <div className="flex-1 flex items-center gap-2">
            <div className="w-8 h-8 bg-grey-200 rounded-lg flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-grey-400" />
            </div>
            <span className="text-sm text-grey-400">{placeholder}</span>
          </div>
          {!readOnly && onEdit && (
            <span className="text-xs text-blue-500">선택</span>
          )}
        </>
      )}
    </div>
  );
}

export default ClassificationBreadcrumb;
