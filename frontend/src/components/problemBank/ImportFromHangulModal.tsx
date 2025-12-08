/**
 * 한글 파일에서 문제은행으로 가져오기 모달
 *
 * Phase 21+ C-2: 한글 파일 → 문제은행 연동
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  Check,
  BookOpen,
  GraduationCap,
  FileText,
  Loader2,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { ClassificationPicker } from '../classification';
import { MathDisplay } from '../MathDisplay';
import type { ClassificationPath } from '../../types/classification';
import type { ParsedProblem, ParseResult } from '../../api/hangul';

interface ImportFromHangulModalProps {
  open: boolean;
  parseResult: ParseResult;
  onClose: () => void;
  onImport: (params: {
    selectedProblems: ParsedProblem[];
    classification?: ClassificationPath | null;
    difficulty: number;
    questionType: 'multiple_choice' | 'short_answer' | 'essay';
    sourceName: string;
    sourceType: 'book' | 'exam' | 'custom';
  }) => void;
  isImporting?: boolean;
}

// 문제 유형 옵션
const questionTypeOptions = [
  { value: 'multiple_choice', label: '객관식' },
  { value: 'short_answer', label: '단답형' },
  { value: 'essay', label: '서술형' },
] as const;

// 출처 유형 옵션
const sourceTypeOptions = [
  { value: 'book', label: '교재' },
  { value: 'exam', label: '기출' },
  { value: 'custom', label: '기타' },
] as const;

export function ImportFromHangulModal({
  open,
  parseResult,
  onClose,
  onImport,
  isImporting = false,
}: ImportFromHangulModalProps) {
  const problems = parseResult.problems;

  // 선택된 문제들
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(problems.map((p) => p.id))
  );

  // 설정
  const [classification, setClassification] = useState<ClassificationPath | null>(null);
  const [difficulty, setDifficulty] = useState(5);
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'short_answer' | 'essay'>('short_answer');
  const [sourceName, setSourceName] = useState(parseResult.metadata?.filename || '');
  const [sourceType, setSourceType] = useState<'book' | 'exam' | 'custom'>('book');

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(problems.map((p) => p.id)));
      setSourceName(parseResult.metadata?.filename || '');
    }
  }, [open, problems, parseResult.metadata?.filename]);

  // 문제 선택 토글
  const toggleProblem = useCallback((problemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  }, []);

  // 전체 선택/해제
  const toggleAll = useCallback(() => {
    if (selectedIds.size === problems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(problems.map((p) => p.id)));
    }
  }, [selectedIds.size, problems]);

  // 가져오기 실행
  const handleImport = useCallback(() => {
    const selectedProblems = problems.filter((p) => selectedIds.has(p.id));
    onImport({
      selectedProblems,
      classification,
      difficulty,
      questionType,
      sourceName,
      sourceType,
    });
  }, [problems, selectedIds, classification, difficulty, questionType, sourceName, sourceType, onImport]);

  // 난이도 색상
  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-500';
    if (level <= 4) return 'bg-lime-500';
    if (level <= 6) return 'bg-yellow-500';
    if (level <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isImporting && onClose()}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl
              shadow-2xl overflow-hidden flex flex-col mx-4"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={isImporting}
                  className="p-2 -ml-2 rounded-xl hover:bg-grey-100 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 text-grey-500" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-grey-900">문제은행에 가져오기</h2>
                  <p className="text-sm text-grey-500">
                    {parseResult.metadata?.filename || '한글 파일'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isImporting}
                className="p-2 rounded-xl hover:bg-grey-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-grey-500" />
              </button>
            </div>

            {/* 컨텐츠 */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                {/* 왼쪽: 문제 선택 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-grey-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-grey-500" />
                      문제 선택
                    </h3>
                    <button
                      onClick={toggleAll}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {selectedIds.size === problems.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>

                  <div className="text-sm text-grey-500">
                    {selectedIds.size}개 / {problems.length}개 선택됨
                  </div>

                  {/* 문제 목록 */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {problems.map((problem) => (
                      <div
                        key={problem.id}
                        onClick={() => toggleProblem(problem.id)}
                        className={`
                          relative cursor-pointer rounded-lg p-3 border-2 transition-all
                          ${selectedIds.has(problem.id)
                            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                            : 'border-grey-200 hover:border-grey-300 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* 체크박스 */}
                          <div
                            className={`
                              w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                              ${selectedIds.has(problem.id)
                                ? 'bg-blue-500'
                                : 'bg-grey-200'
                              }
                            `}
                          >
                            {selectedIds.has(problem.id) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>

                          {/* 문제 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-grey-900 text-sm">
                                문제 {problem.number || problem.id}
                              </span>
                              {problem.answer && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  <CheckCircle className="w-3 h-3" />
                                  정답
                                </span>
                              )}
                              {problem.explanation && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  <MessageSquare className="w-3 h-3" />
                                  해설
                                </span>
                              )}
                            </div>

                            {/* 문제 미리보기 */}
                            <div className="text-xs text-grey-600 line-clamp-2">
                              <MathDisplay
                                latex={problem.content_latex || problem.content_text || '(내용 없음)'}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 오른쪽: 설정 */}
                <div className="space-y-5">
                  {/* 분류 */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-grey-700">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      분류 (선택)
                    </label>
                    <ClassificationPicker
                      value={classification}
                      onChange={setClassification}
                      placeholder="분류를 선택하세요"
                    />
                  </div>

                  {/* 출처 */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-grey-700">
                      <BookOpen className="w-4 h-4 text-green-500" />
                      출처
                    </label>
                    <div className="flex gap-2 mb-2">
                      {sourceTypeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSourceType(opt.value)}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${sourceType === opt.value
                              ? 'bg-green-500 text-white'
                              : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="출처명"
                      className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 문제 유형 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-grey-700">문제 유형</label>
                    <div className="flex gap-2">
                      {questionTypeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setQuestionType(opt.value)}
                          className={`
                            flex-1 py-2 rounded-xl text-sm font-medium transition-colors
                            ${questionType === opt.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 난이도 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-grey-700">
                      난이도: {difficulty}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={difficulty}
                      onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-grey-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${getDifficultyColor(difficulty)} ${difficulty * 10}%, #e5e7eb ${difficulty * 10}%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-grey-400">
                      <span>쉬움</span>
                      <span>보통</span>
                      <span>어려움</span>
                    </div>
                  </div>

                  {/* 파싱 정보 */}
                  <div className="p-4 bg-grey-50 rounded-xl space-y-2">
                    <h4 className="text-sm font-medium text-grey-700">파싱 정보</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {parseResult.metadata?.grade && (
                        <div>
                          <span className="text-grey-500">학년:</span>{' '}
                          <span className="text-grey-700">{parseResult.metadata.grade}</span>
                        </div>
                      )}
                      {parseResult.metadata?.subject && (
                        <div>
                          <span className="text-grey-500">과목:</span>{' '}
                          <span className="text-grey-700">{parseResult.metadata.subject}</span>
                        </div>
                      )}
                      {parseResult.metadata?.exam_type && (
                        <div>
                          <span className="text-grey-500">유형:</span>{' '}
                          <span className="text-grey-700">{parseResult.metadata.exam_type}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-grey-500">전체 문제:</span>{' '}
                        <span className="text-grey-700">{parseResult.total_problems}개</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-grey-100 bg-grey-50">
              <div className="text-sm text-grey-500">
                {selectedIds.size}개 문제가 문제은행에 등록됩니다
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isImporting}
                  className="px-6 py-2.5 text-grey-600 bg-white border border-grey-200
                    rounded-xl font-medium hover:bg-grey-50 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting || selectedIds.size === 0 || !sourceName}
                  className="flex items-center gap-2 px-6 py-2.5 text-white bg-blue-500
                    rounded-xl font-medium hover:bg-blue-600 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      가져오는 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {selectedIds.size}개 가져오기
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ImportFromHangulModal;
