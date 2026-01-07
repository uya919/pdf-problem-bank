/**
 * 캔버스용 학년 탭 (Phase 9-D)
 *
 * 목업 그대로 구현:
 * - 캔버스 상단에 독립 배치
 * - "학년" 라벨 + 버튼 그룹
 * - 텍스트: "1학년", "2학년", "3학년" (학부 프리픽스 없음)
 */
import type { Division } from '@/types/database';

interface CanvasGradeTabsProps {
  division: Division | null;
  activeGrade: number;
  onGradeChange: (grade: number) => void;
}

/** 학부별 학년 옵션 */
const GRADE_OPTIONS: Record<Division, number[]> = {
  elementary: [2, 3, 4, 5, 6],
  middle: [1, 2, 3],
  high: [1, 2],
};

export function CanvasGradeTabs({ division, activeGrade, onGradeChange }: CanvasGradeTabsProps) {
  if (!division) return null;

  const grades = GRADE_OPTIONS[division];

  return (
    <div className="flex items-center gap-4 mb-6">
      <span className="text-sm text-gray-500">학년</span>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
        {grades.map((grade) => {
          const isActive = activeGrade === grade;

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
              {grade}학년
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 학부에 따른 기본 학년 반환 */
export function getDefaultGradeForDivision(division: Division | null): number {
  if (!division) return 1;
  return GRADE_OPTIONS[division][0];
}

/** 학년을 DB 형식으로 변환 (예: middle + 2 → "중2") */
export function getGradeStringForDb(division: Division | null, grade: number): string {
  if (!division) return '';
  const prefix = division === 'elementary' ? '초' : division === 'middle' ? '중' : '고';
  return `${prefix}${grade}`;
}
