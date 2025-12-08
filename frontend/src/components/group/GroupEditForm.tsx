/**
 * GroupEditForm Component (Phase 62-D-2)
 *
 * 그룹 문항 정보 편집 폼 컴포넌트
 * GroupPanel에서 분리
 */
import { forwardRef } from 'react';
import { Check, X } from 'lucide-react';
import type { ProblemInfo } from '../../api/client';

export interface GroupEditFormProps {
  /** 편집 중인 그룹 ID */
  groupId: string;
  /** 편집 폼 데이터 */
  editForm: Partial<ProblemInfo>;
  /** 폼 데이터 변경 핸들러 */
  onFormChange: (field: keyof ProblemInfo, value: string | number) => void;
  /** 저장 핸들러 */
  onSave: () => void;
  /** 취소 핸들러 */
  onCancel: () => void;
  /** 문항번호 입력 필드 ref */
  problemNumberInputRef?: React.RefObject<HTMLInputElement>;
}

export const GroupEditForm = forwardRef<HTMLDivElement, GroupEditFormProps>(
  function GroupEditForm(
    {
      groupId,
      editForm,
      onFormChange,
      onSave,
      onCancel,
      problemNumberInputRef,
    },
    ref
  ) {
    // 키보드 핸들러
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    return (
      <div ref={ref} className="space-y-3" onKeyDown={handleKeyDown}>
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-green-700">문항 정보 편집</span>
            <span className="text-xs text-green-600">Enter: 저장 | Esc: 취소</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="p-1.5 bg-green-100 hover:bg-green-200 rounded transition-colors"
              title="저장"
              aria-label="문항 정보 저장"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="p-1.5 hover:bg-grey-100 rounded transition-colors"
              title="취소"
              aria-label="편집 취소"
            >
              <X className="w-4 h-4 text-grey-600" />
            </button>
          </div>
        </div>

        {/* 책이름 */}
        <div>
          <label className="block text-xs font-medium text-grey-600 mb-1">책이름</label>
          <input
            type="text"
            value={editForm.bookName || ''}
            onChange={(e) => onFormChange('bookName', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="수학의 바이블"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* 과정 */}
        <div>
          <label className="block text-xs font-medium text-grey-600 mb-1">과정</label>
          <input
            type="text"
            value={editForm.course || ''}
            onChange={(e) => onFormChange('course', e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="공통수학2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* 페이지 & 문항번호 */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-grey-600 mb-1">페이지</label>
            <input
              type="number"
              value={editForm.page || ''}
              onChange={(e) => onFormChange('page', parseInt(e.target.value, 10) || 1)}
              className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-grey-600 mb-1">문항번호</label>
            <input
              ref={problemNumberInputRef}
              type="text"
              value={editForm.problemNumber || ''}
              onChange={(e) => onFormChange('problemNumber', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="3"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default GroupEditForm;
