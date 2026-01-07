/**
 * Phase 3: GradeTabsV2
 *
 * 2단계 학년 탭 네비게이션
 * - Level 1: 초등부/중등부/고등부
 * - Level 2: 학년 선택 (초3-6, 중1-3, 고1-3)
 */

// 학부별 학년 매핑
export type Division = 'elementary' | 'middle' | 'high';

export const DIVISION_LABELS: Record<Division, string> = {
  elementary: '초등부',
  middle: '중등부',
  high: '고등부',
};

export const GRADES_BY_DIVISION: Record<Division, string[]> = {
  elementary: ['초3', '초4', '초5', '초6'],
  middle: ['중1', '중2', '중3'],
  high: ['고1', '고2', '고3'],
};

// 학년에서 학부 추출
export function getDivisionFromGrade(grade: string): Division {
  if (grade.startsWith('초')) return 'elementary';
  if (grade.startsWith('중')) return 'middle';
  return 'high';
}

interface GradeInfo {
  grade: string;
  classCount: number;
  studentCount: number;
}

interface GradeTabsV2Props {
  grades: GradeInfo[];
  activeGrade: string;
  onGradeChange: (grade: string) => void;
}

export function GradeTabsV2({ grades, activeGrade, onGradeChange }: GradeTabsV2Props) {
  // 현재 선택된 학년의 학부 계산
  const activeDivision = getDivisionFromGrade(activeGrade);

  // 현재 학부의 학년들
  const currentGrades = grades.filter(
    (g) => getDivisionFromGrade(g.grade) === activeDivision
  );

  // 학부 변경 시 해당 학부 첫 학년 선택
  const handleDivisionChange = (division: Division) => {
    const firstGrade = GRADES_BY_DIVISION[division][0];
    const gradeInfo = grades.find((g) => g.grade === firstGrade);
    if (gradeInfo) {
      onGradeChange(firstGrade);
    } else {
      // 해당 학부에 데이터가 있는 첫 학년 선택
      const availableGrade = grades.find(
        (g) => getDivisionFromGrade(g.grade) === division
      );
      if (availableGrade) {
        onGradeChange(availableGrade.grade);
      }
    }
  };

  // 학부별 반 수 합계
  const divisionCounts = {
    elementary: grades
      .filter((g) => getDivisionFromGrade(g.grade) === 'elementary')
      .reduce((sum, g) => sum + g.classCount, 0),
    middle: grades
      .filter((g) => getDivisionFromGrade(g.grade) === 'middle')
      .reduce((sum, g) => sum + g.classCount, 0),
    high: grades
      .filter((g) => getDivisionFromGrade(g.grade) === 'high')
      .reduce((sum, g) => sum + g.classCount, 0),
  };

  const divisions: Division[] = ['elementary', 'middle', 'high'];

  return (
    <div className="flex items-center gap-6">
      {/* Level 1: 학부 선택 */}
      <div className="flex items-center gap-1 bg-grey-100 p-1 rounded-xl">
        {divisions.map((div) => {
          const isActive = div === activeDivision;
          const count = divisionCounts[div];

          // 해당 학부에 반이 없으면 비활성화
          if (count === 0) return null;

          return (
            <button
              key={div}
              onClick={() => handleDivisionChange(div)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-white text-grey-900 shadow-sm'
                  : 'text-grey-500 hover:text-grey-700 hover:bg-white/50'
                }
              `}
            >
              <span>{DIVISION_LABELS[div]}</span>
              <span
                className={`
                  px-1.5 py-0.5 text-xs rounded-full
                  ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-grey-200 text-grey-500'}
                `}
              >
                {count}반
              </span>
            </button>
          );
        })}
      </div>

      {/* 구분선 */}
      <div className="w-px h-8 bg-grey-200" />

      {/* Level 2: 학년 선택 */}
      <div className="flex items-center gap-1 bg-grey-100 p-1 rounded-xl">
        {currentGrades.map((grade) => {
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
              <span
                className={`
                  px-1.5 py-0.5 text-xs rounded-full
                  ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-grey-200 text-grey-500'}
                `}
              >
                {grade.classCount}반
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 컴팩트 버전 (모바일/태블릿용)
 */
interface GradeTabsV2CompactProps extends GradeTabsV2Props {}

export function GradeTabsV2Compact({
  grades,
  activeGrade,
  onGradeChange,
}: GradeTabsV2CompactProps) {
  const activeDivision = getDivisionFromGrade(activeGrade);
  const currentGrades = grades.filter(
    (g) => getDivisionFromGrade(g.grade) === activeDivision
  );

  const handleDivisionChange = (division: Division) => {
    const availableGrade = grades.find(
      (g) => getDivisionFromGrade(g.grade) === division
    );
    if (availableGrade) {
      onGradeChange(availableGrade.grade);
    }
  };

  const divisions: Division[] = ['elementary', 'middle', 'high'];
  const availableDivisions = divisions.filter((div) =>
    grades.some((g) => getDivisionFromGrade(g.grade) === div)
  );

  return (
    <div className="flex items-center gap-2">
      {/* 학부 드롭다운 */}
      <select
        value={activeDivision}
        onChange={(e) => handleDivisionChange(e.target.value as Division)}
        className="px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm font-medium text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableDivisions.map((div) => (
          <option key={div} value={div}>
            {DIVISION_LABELS[div]}
          </option>
        ))}
      </select>

      {/* 학년 드롭다운 */}
      <select
        value={activeGrade}
        onChange={(e) => onGradeChange(e.target.value)}
        className="px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm font-medium text-grey-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {currentGrades.map((grade) => (
          <option key={grade.grade} value={grade.grade}>
            {grade.grade} ({grade.classCount}반)
          </option>
        ))}
      </select>
    </div>
  );
}
