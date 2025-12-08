/**
 * 문제 정보 편집 폼 (Phase 31-H)
 *
 * 인라인 편집 폼: 문제번호, 책이름, 과정, 페이지 수정
 */
import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { ProblemItem } from '../../stores/matchingStore';

interface ProblemEditFormProps {
  problem: ProblemItem;
  onSave: (updates: Partial<ProblemItem>) => void;
  onCancel: () => void;
}

export function ProblemEditForm({ problem, onSave, onCancel }: ProblemEditFormProps) {
  const [form, setForm] = useState({
    problemNumber: problem.problemNumber || '',
    bookName: problem.bookName || '',
    course: problem.course || '',
    page: problem.page || problem.pageIndex + 1,
  });

  const problemNumberRef = useRef<HTMLInputElement>(null);

  // 자동 포커스
  // Phase 56-K: preventScroll 옵션으로 강제 스크롤 방지
  useEffect(() => {
    setTimeout(() => {
      problemNumberRef.current?.focus({ preventScroll: true });
      problemNumberRef.current?.select();
    }, 50);
  }, []);

  // 저장
  const handleSave = () => {
    if (!form.problemNumber.trim()) {
      problemNumberRef.current?.focus({ preventScroll: true });
      return;
    }

    onSave({
      problemNumber: form.problemNumber.trim(),
      bookName: form.bookName.trim(),
      course: form.course.trim(),
      page: form.page,
    });
  };

  // 키보드 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  return (
    <div
      className="p-3 bg-blue-50 rounded-xl border-2 border-blue-300 space-y-3"
      onKeyDown={handleKeyDown}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-blue-700">문제 정보 편집</span>
          <span className="text-xs text-blue-500">Enter: 저장 | Esc: 취소</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
            title="저장"
          >
            <Check className="w-4 h-4 text-blue-600" />
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-grey-100 rounded transition-colors"
            title="취소"
          >
            <X className="w-4 h-4 text-grey-600" />
          </button>
        </div>
      </div>

      {/* 문항번호 */}
      <div>
        <label className="block text-xs font-medium text-grey-600 mb-1">
          문항번호 <span className="text-red-500">*</span>
        </label>
        <input
          ref={problemNumberRef}
          type="text"
          value={form.problemNumber}
          onChange={(e) => setForm(prev => ({ ...prev, problemNumber: e.target.value }))}
          className="w-full px-2.5 py-1.5 text-sm border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="1"
        />
      </div>

      {/* 책이름 */}
      <div>
        <label className="block text-xs font-medium text-grey-600 mb-1">책이름</label>
        <input
          type="text"
          value={form.bookName}
          onChange={(e) => setForm(prev => ({ ...prev, bookName: e.target.value }))}
          className="w-full px-2.5 py-1.5 text-sm border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="베이직쎈"
        />
      </div>

      {/* 과정 & 페이지 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-grey-600 mb-1">과정</label>
          <input
            type="text"
            value={form.course}
            onChange={(e) => setForm(prev => ({ ...prev, course: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="공통수학1"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-grey-600 mb-1">페이지</label>
          <input
            type="number"
            value={form.page}
            onChange={(e) => setForm(prev => ({ ...prev, page: parseInt(e.target.value, 10) || 1 }))}
            className="w-full px-2.5 py-1.5 text-sm border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={1}
          />
        </div>
      </div>
    </div>
  );
}
