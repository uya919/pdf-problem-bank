/**
 * 문제 등록/수정 폼 컴포넌트
 *
 * Phase 21+ B-3: 문제 등록/수정 폼
 *
 * ClassificationPicker 연동 + 토스 스타일 폼
 */

import React, { useState, useCallback } from 'react';
import {
  BookOpen,
  GraduationCap,
  Tag,
  Image as ImageIcon,
  FileText,
  X,
  Plus,
  Upload,
  Trash2,
} from 'lucide-react';
import { ClassificationPicker } from '../classification';
import type { Problem, ProblemCreate, ProblemUpdate } from '../../types/problem';
import type { ClassificationPath } from '../../types/classification';

interface ProblemFormProps {
  /** 수정 모드일 때 기존 문제 데이터 */
  problem?: Problem;
  /** 폼 제출 핸들러 */
  onSubmit: (data: ProblemCreate | ProblemUpdate) => void;
  /** 취소 핸들러 */
  onCancel: () => void;
  /** 제출 중 상태 */
  isSubmitting?: boolean;
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
  { value: 'exam', label: '기출문제' },
  { value: 'custom', label: '직접 입력' },
] as const;

// 섹션 컴포넌트
function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-grey-700">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export function ProblemForm({
  problem,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProblemFormProps) {
  const isEditMode = !!problem;

  // 폼 상태
  const [classification, setClassification] = useState<ClassificationPath | null>(
    problem?.classification || null
  );
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'short_answer' | 'essay'>(
    problem?.questionType || 'short_answer'
  );
  const [difficulty, setDifficulty] = useState(problem?.difficulty || 5);
  const [points, setPoints] = useState<string>(problem?.points?.toString() || '');

  // 출처 정보
  const [sourceType, setSourceType] = useState<'book' | 'exam' | 'custom'>(
    problem?.source.type || 'book'
  );
  const [sourceName, setSourceName] = useState(problem?.source.name || '');
  const [sourcePage, setSourcePage] = useState<string>(problem?.source.page?.toString() || '');
  const [sourceProblemNumber, setSourceProblemNumber] = useState<string>(
    problem?.source.problemNumber?.toString() || ''
  );
  const [sourceYear, setSourceYear] = useState<string>(problem?.source.year?.toString() || '');
  const [sourceMonth, setSourceMonth] = useState<string>(problem?.source.month?.toString() || '');
  const [sourceOrganization, setSourceOrganization] = useState(
    problem?.source.organization || ''
  );

  // 콘텐츠
  const [imageUrl, setImageUrl] = useState(problem?.content.imageUrl || '');
  const [answer, setAnswer] = useState(problem?.content.answer || '');
  const [solution, setSolution] = useState(problem?.content.solution || '');
  const [solutionImageUrl, setSolutionImageUrl] = useState(
    problem?.content.solutionImageUrl || ''
  );

  // 태그
  const [tags, setTags] = useState<string[]>(problem?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // 태그 추가
  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  // 태그 삭제
  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // 태그 입력 키 핸들러
  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  // 폼 제출
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const formData: ProblemCreate | ProblemUpdate = {
        classification: classification || undefined,
        questionType,
        difficulty,
        points: points ? parseFloat(points) : undefined,
        source: {
          type: sourceType,
          name: sourceName,
          page: sourcePage ? parseInt(sourcePage, 10) : undefined,
          // Phase 62-A: problemNumber는 string 타입으로 유지
          problemNumber: sourceProblemNumber || undefined,
          year: sourceYear ? parseInt(sourceYear, 10) : undefined,
          month: sourceMonth ? parseInt(sourceMonth, 10) : undefined,
          organization: sourceOrganization || undefined,
        },
        content: {
          imageUrl,
          thumbnailUrl: imageUrl, // 일단 동일하게 설정
          answer: answer || undefined,
          solution: solution || undefined,
          solutionImageUrl: solutionImageUrl || undefined,
        },
        tags,
      };

      onSubmit(formData);
    },
    [
      classification,
      questionType,
      difficulty,
      points,
      sourceType,
      sourceName,
      sourcePage,
      sourceProblemNumber,
      sourceYear,
      sourceMonth,
      sourceOrganization,
      imageUrl,
      answer,
      solution,
      solutionImageUrl,
      tags,
      onSubmit,
    ]
  );

  // 난이도 색상
  const getDifficultyColor = (level: number) => {
    if (level <= 2) return 'bg-green-500';
    if (level <= 4) return 'bg-lime-500';
    if (level <= 6) return 'bg-yellow-500';
    if (level <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 분류 선택 */}
      <FormSection
        icon={<GraduationCap className="w-4 h-4 text-blue-500" />}
        title="분류"
      >
        <ClassificationPicker
          value={classification}
          onChange={setClassification}
          placeholder="분류를 선택하세요"
        />
      </FormSection>

      {/* 문제 유형 & 난이도 */}
      <div className="grid grid-cols-2 gap-4">
        <FormSection
          icon={<FileText className="w-4 h-4 text-purple-500" />}
          title="문제 유형"
        >
          <div className="flex gap-2">
            {questionTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuestionType(option.value)}
                className={`
                  flex-1 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${questionType === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection
          icon={<div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-red-500" />}
          title={`난이도 ${difficulty}`}
        >
          <div className="space-y-2">
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
        </FormSection>
      </div>

      {/* 배점 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-1.5">
            배점 (선택)
          </label>
          <input
            type="number"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="예: 4"
            className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 출처 정보 */}
      <FormSection
        icon={<BookOpen className="w-4 h-4 text-green-500" />}
        title="출처 정보"
      >
        <div className="space-y-3">
          {/* 출처 유형 */}
          <div className="flex gap-2">
            {sourceTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSourceType(option.value)}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${sourceType === option.value
                    ? 'bg-green-500 text-white'
                    : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 출처명 */}
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="출처명 (예: 수학의 정석, 2024 수능)"
            required
            className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* 교재인 경우 */}
          {sourceType === 'book' && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={sourcePage}
                onChange={(e) => setSourcePage(e.target.value)}
                placeholder="페이지"
                className="px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={sourceProblemNumber}
                onChange={(e) => setSourceProblemNumber(e.target.value)}
                placeholder="문제 번호"
                className="px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          {/* 기출인 경우 */}
          {sourceType === 'exam' && (
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                value={sourceYear}
                onChange={(e) => setSourceYear(e.target.value)}
                placeholder="년도"
                className="px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                value={sourceMonth}
                onChange={(e) => setSourceMonth(e.target.value)}
                placeholder="월"
                className="px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                value={sourceOrganization}
                onChange={(e) => setSourceOrganization(e.target.value)}
                placeholder="출제기관"
                className="px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </FormSection>

      {/* 문제 이미지 */}
      <FormSection
        icon={<ImageIcon className="w-4 h-4 text-orange-500" />}
        title="문제 이미지"
      >
        <div className="space-y-3">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="이미지 URL 입력"
            required
            className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {imageUrl && (
            <div className="relative bg-grey-100 rounded-xl overflow-hidden">
              <img
                src={imageUrl}
                alt="문제 미리보기"
                className="w-full max-h-64 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </FormSection>

      {/* 정답 & 해설 */}
      <FormSection
        icon={<FileText className="w-4 h-4 text-cyan-500" />}
        title="정답 & 해설 (선택)"
      >
        <div className="space-y-3">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="정답 (예: ②, 24, ...)"
            className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <textarea
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="해설 (선택)"
            rows={3}
            className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <input
            type="url"
            value={solutionImageUrl}
            onChange={(e) => setSolutionImageUrl(e.target.value)}
            placeholder="해설 이미지 URL (선택)"
            className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </FormSection>

      {/* 태그 */}
      <FormSection
        icon={<Tag className="w-4 h-4 text-pink-500" />}
        title="태그"
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="태그 입력 후 Enter"
              className="flex-1 px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2.5 bg-grey-100 text-grey-600 rounded-xl hover:bg-grey-200 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1.5 bg-grey-100 text-grey-700 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="p-0.5 hover:bg-grey-200 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-3 pt-4 border-t border-grey-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 text-grey-600 bg-grey-100 rounded-xl font-medium
            hover:bg-grey-200 transition-colors disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !sourceName || !imageUrl}
          className="flex-1 py-3 text-white bg-blue-500 rounded-xl font-medium
            hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '저장 중...' : isEditMode ? '수정하기' : '등록하기'}
        </button>
      </div>
    </form>
  );
}

export default ProblemForm;
