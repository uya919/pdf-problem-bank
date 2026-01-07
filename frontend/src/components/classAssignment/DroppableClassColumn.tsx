/**
 * 드롭 가능한 반 컬럼 (Phase 7-F)
 *
 * @dnd-kit을 사용한 드롭 영역
 */
import { useDroppable } from '@dnd-kit/core';
import type { ClassBySubject, SubjectCode, ClassLevel } from '@/types/database';
import { SUBJECT_CONFIG, LEVEL_NAMES } from '@/types/database';

interface DroppableClassColumnProps {
  /** 반 정보 */
  classInfo: ClassBySubject;
  /** 현재 과목 */
  subject: SubjectCode;
  /** 배정된 학생 이름 목록 */
  assignedStudentNames?: string[];
  /** 단축키 (Q, W, E, R) */
  shortcutKey?: string;
  /** 클릭으로 배정 */
  onAssign?: () => void;
}

// 레벨별 색상
const LEVEL_COLORS: Record<ClassLevel, { bg: string; border: string; text: string; ring: string }> = {
  advanced: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', ring: 'ring-purple-300' },
  regular: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', ring: 'ring-blue-300' },
  regular2: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', ring: 'ring-cyan-300' },
  basic: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', ring: 'ring-green-300' },
};

export function DroppableClassColumn({
  classInfo,
  subject,
  assignedStudentNames = [],
  shortcutKey,
  onAssign,
}: DroppableClassColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `class-${classInfo.id}`,
    data: {
      type: 'class',
      classId: classInfo.id,
      classInfo,
    },
  });

  const subjectConfig = SUBJECT_CONFIG[subject];
  const level = (classInfo.level || 'regular') as ClassLevel;
  const levelColors = LEVEL_COLORS[level];

  return (
    <div
      ref={setNodeRef}
      onClick={onAssign}
      className={`
        flex-1 min-w-[180px] max-w-[250px] rounded-xl border-2 transition-all duration-200
        ${levelColors.bg} ${levelColors.border}
        ${isOver ? `ring-4 ${levelColors.ring} scale-[1.02] shadow-lg` : ''}
        hover:shadow-md cursor-pointer
      `}
    >
      {/* 헤더 */}
      <div className="p-3 border-b border-gray-200/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-bold ${levelColors.text}`}>
            {LEVEL_NAMES[level]}
          </h3>
          {shortcutKey && (
            <kbd className={`
              px-2 py-0.5 text-xs font-mono rounded border
              ${isOver ? 'bg-white border-gray-400 text-gray-800' : 'bg-white/80 border-gray-300 text-gray-600'}
            `}>
              {shortcutKey}
            </kbd>
          )}
        </div>
        <p className="text-sm text-gray-600 truncate">{classInfo.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="px-2 py-0.5 text-xs rounded-full"
            style={{
              backgroundColor: `${subjectConfig.color}20`,
              color: subjectConfig.color,
            }}
          >
            {classInfo.student_count}명
          </span>
        </div>
      </div>

      {/* 드롭 인디케이터 */}
      {isOver && (
        <div className="px-3 py-2 bg-white/50 border-b border-dashed border-gray-300">
          <p className="text-sm text-center text-gray-600 font-medium">
            여기에 놓으세요
          </p>
        </div>
      )}

      {/* 학생 목록 */}
      <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
        {assignedStudentNames.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">
            학생을 드래그하거나
            <br />
            <kbd className="font-mono bg-gray-100 px-1 rounded">{shortcutKey}</kbd>{' '}
            키를 누르세요
          </p>
        ) : (
          assignedStudentNames.map((name, idx) => (
            <div
              key={idx}
              className="px-2 py-1.5 bg-white/70 rounded text-sm text-gray-700 flex items-center gap-2"
            >
              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                {idx + 1}
              </span>
              <span>{name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
