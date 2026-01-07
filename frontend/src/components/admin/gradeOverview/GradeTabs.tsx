/**
 * Phase 9-A: GradeTabs
 *
 * 학년별 탭 네비게이션
 * - 중1, 중2, 중3, 고1, 고2 탭
 * - 각 학년별 반 개수 뱃지
 */
import { ReactNode } from 'react';

interface GradeInfo {
  grade: string;
  classCount: number;
  studentCount: number;
}

interface GradeTabsProps {
  grades: GradeInfo[];
  activeGrade: string;
  onGradeChange: (grade: string) => void;
}

export function GradeTabs({ grades, activeGrade, onGradeChange }: GradeTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-grey-100 p-1 rounded-xl">
      {grades.map((grade) => {
        const isActive = grade.grade === activeGrade;
        return (
          <button
            key={grade.grade}
            onClick={() => onGradeChange(grade.grade)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isActive
                ? 'bg-white text-grey-900 shadow-sm'
                : 'text-grey-500 hover:text-grey-700 hover:bg-white/50'
              }
            `}
          >
            <span>{grade.grade}</span>
            <span className={`
              px-1.5 py-0.5 text-xs rounded-full
              ${isActive
                ? 'bg-blue-100 text-blue-600'
                : 'bg-grey-200 text-grey-500'
              }
            `}>
              {grade.classCount}반
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 대안: 드롭다운 형태의 학년 선택기 (모바일/태블릿용)
 */
interface GradeDropdownProps {
  grades: GradeInfo[];
  activeGrade: string;
  onGradeChange: (grade: string) => void;
}

export function GradeDropdown({ grades, activeGrade, onGradeChange }: GradeDropdownProps) {
  const activeInfo = grades.find(g => g.grade === activeGrade);

  return (
    <select
      value={activeGrade}
      onChange={(e) => onGradeChange(e.target.value)}
      className="px-4 py-2.5 bg-white border border-grey-200 rounded-lg text-sm font-medium text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {grades.map((grade) => (
        <option key={grade.grade} value={grade.grade}>
          {grade.grade} ({grade.classCount}반)
        </option>
      ))}
    </select>
  );
}
