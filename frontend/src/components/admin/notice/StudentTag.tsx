/**
 * StudentTag - 태그된 학생 표시 컴포넌트
 *
 * Stage 17: 공지 등록 모달
 * - @mention으로 선택된 학생 표시
 * - 학생 정보 + 삭제 버튼
 */

import type { TaggedStudent } from '../../../types/admin';

interface StudentTagProps {
  /** 태그된 학생 정보 */
  student: TaggedStudent;
  /** 삭제 버튼 클릭 핸들러 */
  onRemove?: () => void;
  /** 읽기 전용 모드 (삭제 버튼 숨김) */
  readonly?: boolean;
  /** 크기 */
  size?: 'sm' | 'md';
}

/**
 * 태그된 학생 표시
 *
 * @example
 * ```tsx
 * <StudentTag
 *   student={{ id: '1', name: '홍길동', grade: '중3', school: '서울중' }}
 *   onRemove={() => setTaggedStudent(null)}
 * />
 * ```
 */
export function StudentTag({
  student,
  onRemove,
  readonly = false,
  size = 'md',
}: StudentTagProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        bg-blue-50 text-blue-700 rounded-full
        border border-blue-200
        ${sizeClasses[size]}
      `}
    >
      {/* @ 아이콘 */}
      <span className="text-blue-400 font-medium">@</span>

      {/* 학생 이름 */}
      <span className="font-medium">{student.name}</span>

      {/* 학년/학교 (선택적) */}
      {(student.grade || student.school) && (
        <span className="text-blue-500 text-xs">
          {student.grade}
          {student.grade && student.school && ' · '}
          {student.school}
        </span>
      )}

      {/* 삭제 버튼 */}
      {!readonly && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="
            ml-0.5 p-0.5 rounded-full
            text-blue-400 hover:text-blue-600 hover:bg-blue-100
            transition-colors
          "
          aria-label={`${student.name} 태그 삭제`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

export default StudentTag;
