/**
 * 시험 목록 컴포넌트
 * - 필터링 + 카드 목록
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useExams } from '../../../hooks/useExams';
import type { Exam, ExamFilters as ExamFiltersType } from '../../../types/exam';
import { ExamCard } from './ExamCard';
import { ExamFilters } from './ExamFilters';

interface ExamListProps {
  onCreateClick: () => void;
  onExamClick: (exam: Exam) => void;
}

export function ExamList({ onCreateClick, onExamClick }: ExamListProps) {
  const [filters, setFilters] = useState<ExamFiltersType>({});
  const { data: exams, isLoading } = useExams(filters);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-grey-900">시험 관리</h1>
        <button
          onClick={onCreateClick}
          className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          새 시험
        </button>
      </div>

      {/* 필터 */}
      <ExamFilters filters={filters} onChange={setFilters} />

      {/* 시험 카드 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-grey-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-grey-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-grey-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-grey-100 rounded w-1/4" />
                </div>
              </div>
              <div className="h-3 bg-grey-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : exams && exams.length > 0 ? (
        <div className="space-y-4">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onClick={() => onExamClick(exam)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-grey-900 mb-2">
            등록된 시험이 없습니다
          </h3>
          <p className="text-grey-500 mb-6">
            새 시험을 생성하여 성적을 관리해보세요
          </p>
          <button
            onClick={onCreateClick}
            className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
          >
            첫 시험 만들기
          </button>
        </div>
      )}
    </div>
  );
}
