/**
 * 학생 카드 컴포넌트 (Phase 7-E)
 *
 * 드래그 가능한 학생 카드
 * 배정 상태에 따라 스타일 변경
 */
import type { StudentBySubject, SubjectCode, ClassLevel } from '@/types/database';
import { SUBJECT_CONFIG, LEVEL_NAMES } from '@/types/database';

interface StudentCardProps {
  /** 학생 정보 */
  student: StudentBySubject;
  /** 현재 과목 */
  subject: SubjectCode;
  /** 선택 여부 */
  isSelected?: boolean;
  /** 클릭 핸들러 */
  onClick?: () => void;
  /** 드래그 중 여부 */
  isDragging?: boolean;
  /** 드래그 속성 (dnd-kit) */
  dragAttributes?: Record<string, unknown>;
  /** 드래그 리스너 (dnd-kit) */
  dragListeners?: Record<string, unknown>;
}

export function StudentCard({
  student,
  subject,
  isSelected = false,
  onClick,
  isDragging = false,
  dragAttributes,
  dragListeners,
}: StudentCardProps) {
  const isAssigned = !!student.class_id;
  const subjectConfig = SUBJECT_CONFIG[subject];

  return (
    <div
      onClick={onClick}
      {...dragAttributes}
      {...dragListeners}
      className={`
        p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${isDragging ? 'opacity-50 scale-105 shadow-lg' : ''}
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
            : isAssigned
              ? 'border-gray-200 bg-white hover:border-gray-300'
              : 'border-orange-300 bg-orange-50 hover:border-orange-400'
        }
      `}
    >
      {/* 상단: 이름 + 배정 상태 */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-gray-900">{student.student_name}</span>
        {isAssigned ? (
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: `${subjectConfig.color}20`,
              color: subjectConfig.color,
            }}
          >
            {LEVEL_NAMES[student.class_level as ClassLevel] || '배정됨'}
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
            미배정
          </span>
        )}
      </div>

      {/* 하단: 학년/학교 + 현재 반 */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {student.student_grade}
          {student.school && ` · ${student.school}`}
        </span>
        {isAssigned && (
          <span className="text-xs text-gray-400 truncate max-w-[100px]">
            {student.class_name}
          </span>
        )}
      </div>

      {/* 선택 체크 표시 */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/**
 * 학생 카드 스켈레톤
 */
export function StudentCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border-2 border-gray-100 bg-gray-50 animate-pulse">
      <div className="flex items-center justify-between mb-1">
        <div className="h-5 w-16 bg-gray-200 rounded" />
        <div className="h-5 w-12 bg-gray-200 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
