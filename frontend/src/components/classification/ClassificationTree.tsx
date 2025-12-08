/**
 * 분류 트리 컴포넌트
 *
 * Phase 21+ A-3: 분류 선택 컴포넌트
 *
 * 5단계 분류 체계를 트리 형태로 표시하고 선택할 수 있는 컴포넌트
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Folder, FileText } from 'lucide-react';
import type { ClassificationNode } from '../../types/classification';

interface ClassificationTreeProps {
  /** 트리 데이터 */
  data: ClassificationNode[];

  /** 선택된 노드 ID */
  selectedId?: number | null;

  /** 초기 확장된 노드 ID 목록 */
  defaultExpandedIds?: number[];

  /** 노드 선택 콜백 */
  onSelect?: (node: ClassificationNode) => void;

  /** 선택 가능한 최소 레벨 (기본: 1, 모든 레벨 선택 가능) */
  minSelectableLevel?: number;

  /** 문제 수 표시 여부 */
  showCounts?: boolean;

  /** 검색 하이라이트 텍스트 */
  highlightText?: string;

  /** 컴팩트 모드 (사이드바용) */
  compact?: boolean;

  /** 클래스명 */
  className?: string;
}

export function ClassificationTree({
  data,
  selectedId,
  defaultExpandedIds = [],
  onSelect,
  minSelectableLevel = 1,
  showCounts = true,
  highlightText,
  compact = false,
  className = '',
}: ClassificationTreeProps) {
  // 확장된 노드 ID Set
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(defaultExpandedIds)
  );

  // 노드 확장/축소 토글
  const toggleExpand = useCallback((nodeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // 노드 선택
  const handleSelect = useCallback(
    (node: ClassificationNode) => {
      if (node.level >= minSelectableLevel) {
        onSelect?.(node);
      }
    },
    [onSelect, minSelectableLevel]
  );

  // 노드 렌더링
  const renderNode = (node: ClassificationNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const isSelectable = node.level >= minSelectableLevel;

    return (
      <div key={node.id} className="select-none">
        {/* 노드 행 */}
        <div
          className={`
            flex items-center gap-2 rounded-lg cursor-pointer
            transition-all duration-150 ease-out
            ${compact ? 'py-1.5 px-2' : 'py-2 px-3'}
            ${isSelected
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:bg-grey-50 text-grey-700'
            }
            ${!isSelectable ? 'opacity-60' : ''}
          `}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (hasChildren) {
              setExpandedIds((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) {
                  next.delete(node.id);
                } else {
                  next.add(node.id);
                }
                return next;
              });
            }
            if (isSelectable) {
              handleSelect(node);
            }
          }}
        >
          {/* 확장 아이콘 */}
          <button
            onClick={(e) => hasChildren && toggleExpand(node.id, e)}
            className={`
              w-5 h-5 flex items-center justify-center rounded
              transition-colors duration-150
              ${hasChildren ? 'hover:bg-grey-200' : ''}
            `}
          >
            {hasChildren ? (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronRight className="w-4 h-4 text-grey-400" />
              </motion.div>
            ) : (
              <span className="w-4 h-4" />
            )}
          </button>

          {/* 아이콘 */}
          {hasChildren ? (
            <Folder
              className={`w-4 h-4 flex-shrink-0 ${
                isSelected ? 'text-blue-500' : 'text-amber-500'
              }`}
            />
          ) : (
            <FileText
              className={`w-4 h-4 flex-shrink-0 ${
                isSelected ? 'text-blue-500' : 'text-grey-400'
              }`}
            />
          )}

          {/* 코드 */}
          <span className="text-xs text-grey-400 w-6 flex-shrink-0">
            {node.code}
          </span>

          {/* 이름 */}
          <span className={`flex-1 truncate ${compact ? 'text-sm' : ''}`}>
            {highlightText ? (
              <HighlightedText text={node.name} highlight={highlightText} />
            ) : (
              node.name
            )}
          </span>

          {/* 문제 수 */}
          {showCounts && node.problemCount > 0 && (
            <span className="text-xs text-grey-400 bg-grey-100 px-1.5 py-0.5 rounded-full">
              {node.problemCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* 자식 노드 */}
        <AnimatePresence initial={false}>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {node.children.map((child) => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`overflow-y-auto ${className}`}>
      {data.map((node) => renderNode(node, 0))}
    </div>
  );
}

/**
 * 검색 하이라이트 헬퍼 컴포넌트
 */
function HighlightedText({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) {
  if (!highlight) return <>{text}</>;

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.toLowerCase() === highlight.toLowerCase()
              ? 'bg-yellow-200 font-medium'
              : ''
          }
        >
          {part}
        </span>
      ))}
    </>
  );
}

export default ClassificationTree;
