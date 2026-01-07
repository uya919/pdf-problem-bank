/**
 * 반 컬럼 컴포넌트 (Phase 7-E)
 *
 * 드롭 영역이 되는 반 컬럼
 * 단축키(Q/W/E/R)로 빠른 배정
 */
import type { ClassBySubject, SubjectCode, ClassLevel } from '@/types/database';
import { SUBJECT_CONFIG, LEVEL_NAMES } from '@/types/database';

interface ClassColumnProps {
  /** 반 정보 */
  classInfo: ClassBySubject;
  /** 현재 과목 */
  subject: SubjectCode;
  /** 배정된 학생 이름 목록 */
  assignedStudentNames?: string[];
  /** 단축키 (Q, W, E, R) */
  shortcutKey?: string;
  /** 드롭 오버 상태 */
  isDropOver?: boolean;
  /** 드롭 핸들러 */
  onDrop?: () => void;
  /** 드롭 속성 (dnd-kit) */
  dropAttributes?: Record<string, unknown>;
}

// 레벨별 색상
const LEVEL_COLORS: Record<ClassLevel, { bg: string; border: string; text: string }> = {
  advanced: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  regular: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  regular2: { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700' },
  basic: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
};

export function ClassColumn({
  classInfo,
  subject,
  assignedStudentNames = [],
  shortcutKey,
  isDropOver = false,
  onDrop,
  dropAttributes,
}: ClassColumnProps) {
  const subjectConfig = SUBJECT_CONFIG[subject];
  const level = (classInfo.level || 'regular') as ClassLevel;
  const levelColors = LEVEL_COLORS[level];

  return (
    <div
      {...dropAttributes}
      onClick={onDrop}
      className={`
        flex-1 min-w-[180px] max-w-[250px] rounded-xl border-2 transition-all duration-200
        ${levelColors.bg} ${levelColors.border}
        ${isDropOver ? 'ring-4 ring-blue-300 scale-[1.02]' : ''}
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
            <kbd className="px-2 py-0.5 text-xs font-mono bg-white/80 rounded border border-gray-300 text-gray-600">
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
              className="px-2 py-1 bg-white/70 rounded text-sm text-gray-700"
            >
              {name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 반 컬럼 스켈레톤
 */
export function ClassColumnSkeleton() {
  return (
    <div className="flex-1 min-w-[180px] max-w-[250px] rounded-xl border-2 border-gray-200 bg-gray-50 animate-pulse">
      <div className="p-3 border-b border-gray-200/50">
        <div className="h-5 w-16 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
        <div className="h-5 w-12 bg-gray-200 rounded-full" />
      </div>
      <div className="p-2 space-y-1">
        <div className="h-8 bg-gray-200 rounded" />
        <div className="h-8 bg-gray-200 rounded" />
        <div className="h-8 bg-gray-200 rounded" />
      </div>
    </div>
  );
}
