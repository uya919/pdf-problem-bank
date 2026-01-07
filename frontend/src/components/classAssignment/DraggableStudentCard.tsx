/**
 * 드래그 가능한 학생 카드 (Phase 7-F)
 *
 * @dnd-kit을 사용한 드래그 기능
 */
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { StudentBySubject, SubjectCode, ClassLevel } from '@/types/database';
import { SUBJECT_CONFIG, LEVEL_NAMES } from '@/types/database';

interface DraggableStudentCardProps {
  /** 학생 정보 */
  student: StudentBySubject;
  /** 현재 과목 */
  subject: SubjectCode;
  /** 선택 여부 */
  isSelected?: boolean;
  /** 클릭 핸들러 */
  onClick?: (e: React.MouseEvent) => void;
  /** 컴팩트 모드 (반 카드 내에서 사용) */
  compact?: boolean;
}

export function DraggableStudentCard({
  student,
  subject,
  isSelected = false,
  onClick,
  compact = false,
}: DraggableStudentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.student_id,
    data: {
      type: 'student',
      student,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const isAssigned = !!student.class_id;
  const subjectConfig = SUBJECT_CONFIG[subject];

  // 컴팩트 모드: 반 카드 내에서 작게 표시
  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={`
          relative flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 select-none
          ${isDragging ? 'z-50 shadow-xl scale-105' : ''}
          ${
            isSelected
              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
              : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
          }
        `}
      >
        {/* 이니셜 아바타 */}
        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
          {student.student_name.charAt(0)}
        </div>
        {/* 이름 */}
        <span className="text-sm text-gray-700 truncate flex-1">{student.student_name}</span>
        {/* 선택 체크 */}
        {isSelected && (
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  // 기본 모드: 좌측 패널에서 크게 표시
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        relative p-3 rounded-lg border-2 transition-all duration-200 select-none
        ${isDragging ? 'z-50 shadow-xl scale-105' : ''}
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
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
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

      {/* 드래그 핸들 힌트 */}
      <div className="absolute top-1/2 left-1 -translate-y-1/2 opacity-30">
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="2" />
          <circle cx="15" cy="6" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="9" cy="18" r="2" />
          <circle cx="15" cy="18" r="2" />
        </svg>
      </div>
    </div>
  );
}
