/**
 * 학년 탭 컴포넌트 (Phase 8-A)
 *
 * 학부별로 적절한 학년 옵션을 표시
 * - 초등: 4, 5, 6학년
 * - 중등: 1, 2, 3학년
 * - 고등: 1, 2, 3학년
 */
import type { Division } from '@/types/database';

interface GradeTabsProps {
  division: Division | null;
  activeGrade: number;
  onGradeChange: (grade: number) => void;
}

/** 학부별 학년 옵션 */
const GRADE_OPTIONS: Record<Division, number[]> = {
  elementary: [4, 5, 6],
  middle: [1, 2, 3],
  high: [1, 2, 3],
};

/** 학부별 학년 라벨 프리픽스 */
const GRADE_PREFIX: Record<Division, string> = {
  elementary: '초',
  middle: '중',
  high: '고',
};

export function GradeTabs({ division, activeGrade, onGradeChange }: GradeTabsProps) {
  if (!division) return null;

  const grades = GRADE_OPTIONS[division];
  const prefix = GRADE_PREFIX[division];

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">학년</span>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {grades.map((grade) => {
          const isActive = activeGrade === grade;
          const label = `${prefix}${grade}`;

          return (
            <button
              key={grade}
              onClick={() => onGradeChange(grade)}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all
                ${isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 학부에 따른 기본 학년 반환 */
export function getDefaultGrade(division: Division | null): number {
  if (!division) return 1;
  return GRADE_OPTIONS[division][0];
}

/** 학년을 DB 형식으로 변환 (예: middle + 2 → "중2") */
export function getGradeString(division: Division | null, grade: number): string {
  if (!division) return '';
  return `${GRADE_PREFIX[division]}${grade}`;
}
