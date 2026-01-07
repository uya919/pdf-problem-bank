/**
 * 반 카드 컴포넌트 (Phase 8-B, Phase 12 드래그 기능 추가)
 *
 * 목업 스타일의 반 카드 - 레벨별 좌측 색상 테두리
 * 반 카드 내 학생도 드래그 가능
 */
import { useDroppable } from '@dnd-kit/core';
import type { ClassBySubject, ClassLevel, StudentBySubject, SubjectCode } from '@/types/database';
import { DraggableStudentCard } from './DraggableStudentCard';

interface ClassCardProps {
  classInfo: ClassBySubject;
  /** 배정된 학생들 (드래그 가능) */
  assignedStudents: StudentBySubject[];
  /** 현재 과목 */
  activeSubject: SubjectCode;
  /** 선택된 학생 ID Set */
  selectedStudentIds: Set<string>;
  /** 학생 클릭 핸들러 */
  onStudentClick: (studentId: string, e: React.MouseEvent) => void;
  shortcutKey?: string;
}

/** 레벨별 스타일 설정 (목업: 좌측 띠 없음, 배지로만 구분) */
const LEVEL_STYLES: Record<ClassLevel, { badge: string; label: string }> = {
  advanced: {
    badge: 'bg-blue-50 text-blue-600',
    label: '심화',
  },
  regular: {
    badge: 'bg-gray-100 text-gray-600',
    label: '정규',
  },
  regular2: {
    badge: 'bg-gray-100 text-gray-500',
    label: '정규2',
  },
  basic: {
    badge: 'bg-orange-50 text-orange-600',
    label: '기초',
  },
};

export function ClassCard({
  classInfo,
  assignedStudents,
  activeSubject,
  selectedStudentIds,
  onStudentClick,
  shortcutKey,
}: ClassCardProps) {
  const level = (classInfo.level || 'regular') as ClassLevel;
  const styles = LEVEL_STYLES[level];

  const { isOver, setNodeRef } = useDroppable({
    id: `class-${classInfo.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        bg-white border border-gray-200 rounded-xl overflow-hidden transition-all
        ${isOver ? 'ring-2 ring-blue-500 bg-blue-50/50 scale-[1.02]' : ''}
      `}
    >
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">{classInfo.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${styles.badge}`}>
                {styles.label}
              </span>
              <span className="text-xs text-gray-400">
                {assignedStudents.length}명
              </span>
            </div>
          </div>
          {shortcutKey && (
            <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 border border-gray-200 rounded text-gray-600">
              {shortcutKey}
            </kbd>
          )}
        </div>
      </div>

      {/* 학생 목록 (드래그 가능) */}
      <div className="p-3 min-h-[120px] max-h-[200px] overflow-y-auto">
        {assignedStudents.length > 0 ? (
          <div className="space-y-2">
            {assignedStudents.map((student) => (
              <DraggableStudentCard
                key={student.student_id}
                student={student}
                subject={activeSubject}
                isSelected={selectedStudentIds.has(student.student_id)}
                onClick={(e) => onStudentClick(student.student_id, e)}
                compact
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-300 py-6 text-sm">
            {isOver ? (
              <span className="text-blue-500">여기에 드롭하세요</span>
            ) : (
              <span>학생을 드래그하세요</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 로딩 스켈레톤 */
export function ClassCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-100">
        <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-20" />
      </div>
      <div className="p-3 min-h-[120px]">
        <div className="space-y-2">
          <div className="h-8 bg-gray-100 rounded" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
