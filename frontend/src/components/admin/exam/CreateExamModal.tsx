/**
 * 시험 생성 모달
 * - 단일 화면 폼
 * - 시험명, 일자, 과목, 학년, 유형, 문항수
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateExam } from '../../../hooks/useExams';
import type {
  Exam,
  Subject,
  ExamType,
  CreateExamInput,
} from '../../../types/exam';
import {
  SUBJECT_LABELS,
  EXAM_TYPE_LABELS,
  GRADE_OPTIONS,
} from '../../../types/exam';

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (exam: Exam) => void;
}

const INITIAL_FORM: CreateExamInput = {
  name: '',
  exam_date: new Date().toISOString().split('T')[0],
  subject: 'math',
  grade: '중1',
  exam_type: 'level_test',
  total_questions: 20,
};

export function CreateExamModal({ isOpen, onClose, onSuccess }: CreateExamModalProps) {
  const [form, setForm] = useState<CreateExamInput>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createExam = useCreateExam();

  if (!isOpen) return null;

  const handleChange = (field: keyof CreateExamInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = '시험명을 입력해주세요';
    }
    if (!form.exam_date) {
      newErrors.exam_date = '시험 일자를 선택해주세요';
    }
    if (form.total_questions < 5 || form.total_questions > 30) {
      newErrors.total_questions = '문항 수는 5~30개 사이여야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const exam = await createExam.mutateAsync(form);
      setForm(INITIAL_FORM);
      onSuccess(exam);
    } catch (error) {
      console.error('시험 생성 실패:', error);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b border-grey-100">
          <h2 className="text-lg font-bold text-grey-900">새 시험 만들기</h2>
          <button
            onClick={handleClose}
            className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <div className="p-5 space-y-5">
          {/* 시험명 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1.5">
              시험명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="예: 중1 12월 레벨테스트"
              className={`
                w-full px-4 py-3 border rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.name ? 'border-red-300' : 'border-grey-200'}
              `}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* 시험 일자 + 과목 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-1.5">
                시험 일자 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.exam_date}
                onChange={(e) => handleChange('exam_date', e.target.value)}
                className={`
                  w-full px-4 py-3 border rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.exam_date ? 'border-red-300' : 'border-grey-200'}
                `}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-1.5">
                과목 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.subject}
                onChange={(e) => handleChange('subject', e.target.value as Subject)}
                className="w-full px-4 py-3 border border-grey-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(SUBJECT_LABELS) as Subject[]).map((subject) => (
                  <option key={subject} value={subject}>
                    {SUBJECT_LABELS[subject]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 학년 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1.5">
              학년 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.grade}
              onChange={(e) => handleChange('grade', e.target.value)}
              className="w-full px-4 py-3 border border-grey-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* 시험 유형 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              시험 유형 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(EXAM_TYPE_LABELS) as ExamType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange('exam_type', type)}
                  className={`
                    px-3 py-2.5 text-sm font-medium rounded-lg border transition-all
                    ${form.exam_type === type
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-grey-200 text-grey-600 hover:border-grey-300'
                    }
                  `}
                >
                  {EXAM_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* 문항 수 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1.5">
              문항 수 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={30}
                value={form.total_questions}
                onChange={(e) => handleChange('total_questions', parseInt(e.target.value) || 20)}
                className={`
                  w-24 px-4 py-3 border rounded-xl text-sm text-center
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errors.total_questions ? 'border-red-300' : 'border-grey-200'}
                `}
              />
              <span className="text-sm text-grey-500">문항 (5~30)</span>
              <span className="ml-auto text-sm text-grey-700">
                총점: <span className="font-semibold text-blue-600">100점</span>
              </span>
            </div>
            {errors.total_questions && (
              <p className="text-xs text-red-500 mt-1">{errors.total_questions}</p>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-grey-100">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={createExam.isPending}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {createExam.isPending ? '생성 중...' : '시험 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
