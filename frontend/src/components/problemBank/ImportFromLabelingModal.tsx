/**
 * 라벨링에서 문제은행으로 가져오기 모달
 *
 * Phase 21+ C-1: 라벨링 → 문제은행 연동
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  Check,
  BookOpen,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { ClassificationPicker } from '../classification';
import type { ClassificationPath } from '../../types/classification';

// Phase 62-A: client.ts의 ExportedProblem과 호환되는 최소 인터페이스
interface ModalProblem {
  group_id: string;
  page_index: number;
  image_path: string;
  column?: string;
  block_ids?: number[];
}

interface ImportFromLabelingModalProps {
  open: boolean;
  documentId: string;
  documentName: string;
  problems: ModalProblem[];
  onClose: () => void;
  onImport: (params: {
    selectedProblems: ModalProblem[];
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

export function ImportFromLabelingModal({
  open,
  documentId,
  documentName,
  problems,
  onClose,
  onImport,
  isImporting = false,
}: ImportFromLabelingModalProps) {
  // 선택된 문제들
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(problems.map((p) => p.group_id))
  );

  // 설정
  const [classification, setClassification] = useState<ClassificationPath | null>(null);
  const [difficulty, setDifficulty] = useState(5);
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'short_answer' | 'essay'>('short_answer');
  const [sourceName, setSourceName] = useState(documentName);
  const [sourceType, setSourceType] = useState<'book' | 'exam' | 'custom'>('book');

  // 문제 선택 토글
  const toggleProblem = useCallback((groupId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // 전체 선택/해제
  const toggleAll = useCallback(() => {
    if (selectedIds.size === problems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(problems.map((p) => p.group_id)));
    }
  }, [selectedIds.size, problems]);

  // 가져오기 실행
  const handleImport = useCallback(() => {
    const selectedProblems = problems.filter((p) => selectedIds.has(p.group_id));
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
                  <p className="text-sm text-grey-500">{documentName}</p>
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
                      <ImageIcon className="w-4 h-4 text-grey-500" />
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

                  {/* 문제 그리드 */}
                  <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-2">
                    {problems.map((problem) => (
                      <div
                        key={problem.group_id}
                        onClick={() => toggleProblem(problem.group_id)}
                        className={`
                          relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                          ${selectedIds.has(problem.group_id)
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-grey-200 hover:border-grey-300'
                          }
                        `}
                      >
                        <img
                          src={`http://localhost:8000/api/documents/${documentId}/problems/image?image_path=${problem.image_path}`}
                          alt={problem.group_id}
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                          <span className="text-xs text-white font-medium">
                            {problem.group_id}
                          </span>
                        </div>
                        {selectedIds.has(problem.group_id) && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
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

export default ImportFromLabelingModal;
