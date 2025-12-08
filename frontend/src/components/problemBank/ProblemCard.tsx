/**
 * 문제 카드 컴포넌트
 *
 * Phase 21+ B-1: 문제은행 메인 UI
 *
 * 개별 문제를 카드 형태로 표시
 */

import React from 'react';
import { Star, MoreVertical, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Problem } from '../../types/problem';

interface ProblemCardProps {
  problem: Problem;
  onSelect?: (problem: Problem) => void;
  onFavorite?: (problem: Problem) => void;
  onMenu?: (problem: Problem, event: React.MouseEvent) => void;
  selected?: boolean;
  compact?: boolean;
}

// 난이도 색상
const difficultyColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-lime-100 text-lime-700',
  4: 'bg-yellow-100 text-yellow-700',
  5: 'bg-yellow-100 text-yellow-700',
  6: 'bg-orange-100 text-orange-700',
  7: 'bg-orange-100 text-orange-700',
  8: 'bg-red-100 text-red-700',
  9: 'bg-red-100 text-red-700',
  10: 'bg-purple-100 text-purple-700',
};

// 문제 유형 라벨
const questionTypeLabels: Record<string, string> = {
  multiple_choice: '객관식',
  short_answer: '단답형',
  essay: '서술형',
};

export function ProblemCard({
  problem,
  onSelect,
  onFavorite,
  onMenu,
  selected = false,
  compact = false,
}: ProblemCardProps) {
  const handleClick = () => {
    onSelect?.(problem);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite?.(problem);
  };

  const handleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenu?.(problem, e);
  };

  // 분류 경로에서 마지막 항목 추출
  const classificationLabel = problem.classification?.fullPath
    ? problem.classification.fullPath.split(' > ').slice(-1)[0]
    : '미분류';

  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        onClick={handleClick}
        className={`
          flex items-center gap-3 p-3 rounded-xl cursor-pointer
          transition-all duration-150
          ${selected
            ? 'bg-blue-50 border-2 border-blue-400'
            : 'bg-white border border-grey-100 hover:border-grey-200 hover:shadow-sm'
          }
        `}
      >
        {/* 썸네일 */}
        <div className="w-12 h-12 bg-grey-100 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={problem.content.thumbnailUrl || problem.content.imageUrl}
            alt="문제 썸네일"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder-problem.png';
            }}
          />
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-grey-900 truncate">
              {problem.source.name}
            </span>
            {problem.source.page && (
              <span className="text-xs text-grey-400">p.{problem.source.page}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-grey-500">{classificationLabel}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColors[problem.difficulty]}`}>
              Lv.{problem.difficulty}
            </span>
          </div>
        </div>

        {/* 즐겨찾기 */}
        <button
          onClick={handleFavorite}
          className="p-1.5 rounded-lg hover:bg-grey-100 transition-colors"
        >
          <Star
            className={`w-4 h-4 ${
              problem.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-grey-300'
            }`}
          />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={handleClick}
      className={`
        group relative bg-white rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-200
        ${selected
          ? 'ring-2 ring-blue-500 shadow-lg'
          : 'border border-grey-100 hover:border-grey-200 hover:shadow-md'
        }
      `}
    >
      {/* 썸네일 영역 */}
      <div className="relative aspect-[4/3] bg-grey-50 overflow-hidden">
        <img
          src={problem.content.thumbnailUrl || problem.content.imageUrl}
          alt="문제 이미지"
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-problem.png';
          }}
        />

        {/* 오버레이 버튼들 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 좌상단: 난이도 */}
          <div className="absolute top-2 left-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColors[problem.difficulty]}`}>
              난이도 {problem.difficulty}
            </span>
          </div>

          {/* 우상단: 메뉴 */}
          <button
            onClick={handleMenu}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-grey-600" />
          </button>

          {/* 좌하단: 유형 */}
          <div className="absolute bottom-2 left-2">
            <span className="text-xs text-white/90 bg-black/40 px-2 py-1 rounded-full">
              {questionTypeLabels[problem.questionType] || problem.questionType}
            </span>
          </div>

          {/* 우하단: 즐겨찾기 */}
          <button
            onClick={handleFavorite}
            className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                problem.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-grey-400'
              }`}
            />
          </button>
        </div>

        {/* 선택 체크 */}
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="p-3">
        {/* 출처 */}
        <div className="flex items-center gap-1.5 text-sm text-grey-900 font-medium mb-1">
          <BookOpen className="w-3.5 h-3.5 text-grey-400" />
          <span className="truncate">{problem.source.name}</span>
          {problem.source.page && (
            <span className="text-grey-400 text-xs">p.{problem.source.page}</span>
          )}
        </div>

        {/* 분류 */}
        <div className="flex items-center gap-1.5 text-xs text-grey-500 mb-2">
          <GraduationCap className="w-3.5 h-3.5" />
          <span className="truncate">{classificationLabel}</span>
        </div>

        {/* 태그 */}
        {problem.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {problem.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 bg-grey-100 text-grey-600 rounded-full"
              >
                {tag}
              </span>
            ))}
            {problem.tags.length > 3 && (
              <span className="text-xs text-grey-400">+{problem.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 사용 통계 */}
        {problem.usageCount > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-grey-400">
            <Clock className="w-3 h-3" />
            <span>{problem.usageCount}회 사용</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ProblemCard;
