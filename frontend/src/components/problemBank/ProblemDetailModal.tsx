/**
 * 문제 상세 모달 컴포넌트
 *
 * Phase 21+ B-2: 문제 상세 보기
 *
 * 토스/애플 스타일 바텀시트 형태의 문제 상세 모달
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  BookOpen,
  GraduationCap,
  Tag,
  Calendar,
  BarChart3,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ClassificationBreadcrumb } from '../classification';
import type { Problem } from '../../types/problem';

interface ProblemDetailModalProps {
  problem: Problem | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (problem: Problem) => void;
  onDelete?: (problem: Problem) => void;
  onFavorite?: (problem: Problem) => void;
}

// 난이도 색상
const difficultyColors: Record<number, { bg: string; text: string; bar: string }> = {
  1: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  2: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  3: { bg: 'bg-lime-50', text: 'text-lime-700', bar: 'bg-lime-500' },
  4: { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  5: { bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  6: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  7: { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  8: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  9: { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  10: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
};

// 문제 유형 라벨
const questionTypeLabels: Record<string, string> = {
  multiple_choice: '객관식',
  short_answer: '단답형',
  essay: '서술형',
};

// 출처 유형 라벨
const sourceTypeLabels: Record<string, string> = {
  book: '교재',
  exam: '기출',
  custom: '직접 입력',
};

export function ProblemDetailModal({
  problem,
  open,
  onClose,
  onEdit,
  onDelete,
  onFavorite,
}: ProblemDetailModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 스크롤 방지
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!problem) return null;

  const difficultyStyle = difficultyColors[problem.difficulty] || difficultyColors[5];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-t-3xl sm:rounded-2xl
              shadow-2xl overflow-hidden flex flex-col"
          >
            {/* 드래그 핸들 (모바일) */}
            <div className="flex justify-center py-2 sm:hidden">
              <div className="w-10 h-1 bg-grey-300 rounded-full" />
            </div>

            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-grey-900">문제 상세</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${difficultyStyle.bg} ${difficultyStyle.text}`}>
                  난이도 {problem.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onFavorite && (
                  <button
                    onClick={() => onFavorite(problem)}
                    className="p-2 rounded-xl hover:bg-grey-100 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        problem.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-grey-400'
                      }`}
                    />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-grey-100 transition-colors"
                >
                  <X className="w-5 h-5 text-grey-500" />
                </button>
              </div>
            </div>

            {/* 컨텐츠 */}
            <div className="flex-1 overflow-y-auto">
              {/* 문제 이미지 */}
              <div className="bg-grey-50 p-6">
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <img
                    src={problem.content.imageUrl}
                    alt="문제 이미지"
                    className="w-full object-contain max-h-96"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-problem.png';
                    }}
                  />
                </div>
              </div>

              {/* 정보 섹션들 */}
              <div className="p-6 space-y-6">
                {/* 분류 */}
                {problem.classification && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-grey-500 mb-2">
                      <GraduationCap className="w-4 h-4" />
                      분류
                    </div>
                    <ClassificationBreadcrumb
                      value={problem.classification}
                      readOnly
                    />
                  </div>
                )}

                {/* 출처 */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-grey-500 mb-2">
                    <BookOpen className="w-4 h-4" />
                    출처
                  </div>
                  <div className="bg-grey-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-grey-900">
                          {problem.source.name}
                        </div>
                        <div className="text-sm text-grey-500 mt-0.5">
                          {sourceTypeLabels[problem.source.type] || problem.source.type}
                          {problem.source.page && ` · ${problem.source.page}페이지`}
                          {problem.source.problemNumber && ` · ${problem.source.problemNumber}번`}
                        </div>
                        {problem.source.year && (
                          <div className="text-sm text-grey-500">
                            {problem.source.year}년
                            {problem.source.month && ` ${problem.source.month}월`}
                            {problem.source.organization && ` · ${problem.source.organization}`}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-grey-300" />
                    </div>
                  </div>
                </div>

                {/* 정답 & 해설 */}
                {(problem.content.answer || problem.content.solution) && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-grey-500 mb-2">
                      <BarChart3 className="w-4 h-4" />
                      정답 & 해설
                    </div>
                    <div className="space-y-3">
                      {problem.content.answer && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                          <div className="text-xs text-green-600 font-medium mb-1">정답</div>
                          <div className="text-green-800 font-medium">
                            {problem.content.answer}
                          </div>
                        </div>
                      )}
                      {problem.content.solution && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <div className="text-xs text-blue-600 font-medium mb-1">해설</div>
                          <div className="text-blue-800 text-sm whitespace-pre-wrap">
                            {problem.content.solution}
                          </div>
                        </div>
                      )}
                      {problem.content.solutionImageUrl && (
                        <div className="bg-white border border-grey-200 rounded-xl overflow-hidden">
                          <img
                            src={problem.content.solutionImageUrl}
                            alt="해설 이미지"
                            className="w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 태그 */}
                {problem.tags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-grey-500 mb-2">
                      <Tag className="w-4 h-4" />
                      태그
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {problem.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-grey-100 text-grey-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 메타 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-grey-50 rounded-xl p-3">
                    <div className="text-xs text-grey-500">문제 유형</div>
                    <div className="font-medium text-grey-900 mt-0.5">
                      {questionTypeLabels[problem.questionType] || problem.questionType}
                    </div>
                  </div>
                  <div className="bg-grey-50 rounded-xl p-3">
                    <div className="text-xs text-grey-500">난이도</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-2 bg-grey-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${difficultyStyle.bar}`}
                          style={{ width: `${problem.difficulty * 10}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-grey-700">
                        {problem.difficulty}/10
                      </span>
                    </div>
                  </div>
                  {problem.points && (
                    <div className="bg-grey-50 rounded-xl p-3">
                      <div className="text-xs text-grey-500">배점</div>
                      <div className="font-medium text-grey-900 mt-0.5">
                        {problem.points}점
                      </div>
                    </div>
                  )}
                  <div className="bg-grey-50 rounded-xl p-3">
                    <div className="text-xs text-grey-500">사용 횟수</div>
                    <div className="font-medium text-grey-900 mt-0.5">
                      {problem.usageCount}회
                    </div>
                  </div>
                </div>

                {/* 생성 정보 */}
                <div className="flex items-center gap-2 text-xs text-grey-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    생성: {new Date(problem.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                  <span>·</span>
                  <span>
                    수정: {new Date(problem.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

            {/* 푸터 액션 */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-grey-100 bg-grey-50">
              <button
                onClick={() => navigator.clipboard.writeText(problem.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-grey-600
                  hover:bg-grey-200 rounded-xl transition-colors"
              >
                <Copy className="w-4 h-4" />
                ID 복사
              </button>

              <div className="flex-1" />

              {onDelete && (
                <button
                  onClick={() => onDelete(problem)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600
                    hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              )}

              {onEdit && (
                <button
                  onClick={() => onEdit(problem)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-white
                    bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  수정
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ProblemDetailModal;
