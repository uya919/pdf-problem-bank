/**
 * 문제 그리드 컴포넌트
 *
 * Phase 21+ B-1: 문제은행 메인 UI
 *
 * 문제 목록을 그리드/리스트 형태로 표시
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Grid, List, BookOpen, Search } from 'lucide-react';
import { ProblemCard } from './ProblemCard';
import type { Problem } from '../../types/problem';

interface ProblemGridProps {
  problems: Problem[];
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  selectedIds?: Set<string>;
  onSelect?: (problem: Problem) => void;
  onFavorite?: (problem: Problem) => void;
  onMenu?: (problem: Problem, event: React.MouseEvent) => void;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  emptyMessage?: string;
}

export function ProblemGrid({
  problems,
  loading = false,
  viewMode = 'grid',
  selectedIds = new Set(),
  onSelect,
  onFavorite,
  onMenu,
  onViewModeChange,
  emptyMessage = '등록된 문제가 없습니다',
}: ProblemGridProps) {
  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className={`
        ${viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'flex flex-col gap-2'
        }
      `}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`
              bg-white rounded-2xl overflow-hidden animate-pulse
              ${viewMode === 'grid' ? 'aspect-[4/3]' : 'h-20'}
            `}
          >
            <div className="w-full h-full bg-grey-100" />
          </div>
        ))}
      </div>
    );
  }

  // 빈 상태
  if (problems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="w-20 h-20 bg-grey-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-10 h-10 text-grey-300" />
        </div>
        <h3 className="text-lg font-medium text-grey-600 mb-2">
          {emptyMessage}
        </h3>
        <p className="text-sm text-grey-400 text-center max-w-sm">
          한글 파일이나 PDF에서 문제를 추출하여
          <br />
          문제은행에 등록해보세요
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* 뷰 모드 토글 */}
      {onViewModeChange && (
        <div className="flex items-center justify-end gap-1 mb-4">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-100 text-blue-600'
                : 'text-grey-400 hover:bg-grey-100'
            }`}
            title="그리드 보기"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-600'
                : 'text-grey-400 hover:bg-grey-100'
            }`}
            title="리스트 보기"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 문제 목록 */}
      <AnimatePresence mode="popLayout">
        <motion.div
          layout
          className={`
            ${viewMode === 'grid'
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'flex flex-col gap-2'
            }
          `}
        >
          {problems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              selected={selectedIds.has(problem.id)}
              compact={viewMode === 'list'}
              onSelect={onSelect}
              onFavorite={onFavorite}
              onMenu={onMenu}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * 검색 결과 없음 상태
 */
export function NoSearchResults({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 bg-grey-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-10 h-10 text-grey-300" />
      </div>
      <h3 className="text-lg font-medium text-grey-600 mb-2">
        검색 결과가 없습니다
      </h3>
      <p className="text-sm text-grey-400 text-center">
        "{query}"에 대한 검색 결과가 없습니다.
        <br />
        다른 검색어로 시도해보세요.
      </p>
    </motion.div>
  );
}

export default ProblemGrid;
