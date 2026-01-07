/**
 * 선택 액션바 (Phase 8-D)
 *
 * 선택된 학생 수와 빠른 배정 버튼 표시
 */
import type { ClassBySubject, ClassLevel } from '@/types/database';

interface SelectionActionBarProps {
  selectedCount: number;
  classes: ClassBySubject[];
  onAssignToClass: (classId: string) => void;
  onUnassign: () => void;
}

/** 레벨별 버튼 스타일 */
const LEVEL_BUTTON_STYLES: Record<ClassLevel, string> = {
  advanced: 'bg-blue-500 hover:bg-blue-600 text-white',
  regular: 'bg-gray-500 hover:bg-gray-600 text-white',
  regular2: 'bg-gray-400 hover:bg-gray-500 text-white',
  basic: 'bg-orange-500 hover:bg-orange-600 text-white',
};

/** 레벨별 라벨 */
const LEVEL_LABELS: Record<ClassLevel, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
};

export function SelectionActionBar({
  selectedCount,
  classes,
  onAssignToClass,
  onUnassign,
}: SelectionActionBarProps) {
  if (selectedCount === 0) return null;

  // 레벨별로 첫 번째 반만 표시 (중복 방지)
  const uniqueClasses = classes.reduce((acc, cls) => {
    const level = (cls.level || 'regular') as ClassLevel;
    if (!acc.has(level)) {
      acc.set(level, cls);
    }
    return acc;
  }, new Map<ClassLevel, ClassBySubject>());

  return (
    <div className="p-3 border-t border-gray-100 bg-gray-50">
      <div className="text-sm text-gray-700 mb-2 font-medium">
        {selectedCount}명 선택됨
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['advanced', 'regular', 'regular2', 'basic'] as ClassLevel[]).map((level) => {
          const cls = uniqueClasses.get(level);
          if (!cls) return null;

          return (
            <button
              key={level}
              onClick={() => onAssignToClass(cls.id)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${LEVEL_BUTTON_STYLES[level]}
              `}
            >
              {LEVEL_LABELS[level]}
            </button>
          );
        })}
        <button
          onClick={onUnassign}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          배정 해제
        </button>
      </div>
    </div>
  );
}
