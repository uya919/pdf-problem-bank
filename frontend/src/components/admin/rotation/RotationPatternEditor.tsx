/**
 * 순환 패턴 설정 탭
 * - 주차 x 학년 그리드
 * - 각 셀에 활동 유형 Select
 */
import { useState, useEffect } from 'react';
import {
  ACTIVITY_TYPES,
  type ActivityType,
  type RotationPattern,
  type RotationTargetGrade,
  type SavePatternInput,
} from '../../../types/rotation';

interface RotationPatternEditorProps {
  cycleWeeks: number;
  targetGrades: RotationTargetGrade[];
  patterns: RotationPattern[];
  onSave: (patterns: SavePatternInput[]) => void;
  isSaving: boolean;
}

type PatternGrid = Record<string, ActivityType>; // 'week-gradeId' -> activityType

export function RotationPatternEditor({
  cycleWeeks,
  targetGrades,
  patterns,
  onSave,
  isSaving,
}: RotationPatternEditorProps) {
  const [grid, setGrid] = useState<PatternGrid>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 초기 그리드 설정
  useEffect(() => {
    const initialGrid: PatternGrid = {};
    patterns.forEach((p) => {
      const key = `${p.week_number}-${p.grade_id}`;
      initialGrid[key] = p.activity_type;
    });
    setGrid(initialGrid);
    setHasChanges(false);
  }, [patterns]);

  const handleCellChange = (week: number, gradeId: string, value: ActivityType) => {
    const key = `${week}-${gradeId}`;
    setGrid((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const newPatterns: SavePatternInput[] = [];

    for (let week = 1; week <= cycleWeeks; week++) {
      for (const grade of targetGrades) {
        const key = `${week}-${grade.grade_id}`;
        const activityType = grid[key];

        if (activityType) {
          newPatterns.push({
            week_number: week,
            grade_id: grade.grade_id,
            activity_type: activityType,
            activity_name: ACTIVITY_TYPES[activityType].label,
          });
        }
      }
    }

    onSave(newPatterns);
    setHasChanges(false);
  };

  const getSelectBgClass = (activityType: ActivityType | undefined): string => {
    if (!activityType) return 'bg-grey-50';
    switch (activityType) {
      case 'english_class':
        return 'bg-emerald-50 text-emerald-700';
      case 'math_class':
        return 'bg-blue-50 text-blue-700';
      case 'math_test':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-grey-50';
    }
  };

  // 학년 정렬 (중1, 중2, 중3 순)
  const sortedGrades = [...targetGrades].sort((a, b) => {
    const aName = a.grades?.name || '';
    const bName = b.grades?.name || '';
    return aName.localeCompare(bName, 'ko');
  });

  return (
    <div className="bg-white rounded-xl border border-grey-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-grey-900">순환 패턴 설정</h3>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:bg-grey-300 transition-colors"
          >
            {isSaving ? '저장 중...' : '변경사항 저장'}
          </button>
        )}
      </div>
      <p className="text-sm text-grey-500 mb-6">
        각 주차별로 학년이 어떤 활동을 하는지 설정합니다.
      </p>

      {targetGrades.length === 0 ? (
        <div className="text-center py-8 text-grey-500">
          대상 학년을 먼저 설정해주세요.
          <br />
          (기본 설정 탭에서 설정 가능)
        </div>
      ) : (
        <>
          {/* 패턴 그리드 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-grey-100 border border-grey-200 text-left font-medium text-grey-700 w-24">
                    주차
                  </th>
                  {sortedGrades.map((grade) => (
                    <th
                      key={grade.grade_id}
                      className="p-3 bg-grey-100 border border-grey-200 text-center font-medium text-grey-700"
                    >
                      {grade.grades?.name || '학년'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: cycleWeeks }, (_, i) => i + 1).map((week) => (
                  <tr key={week}>
                    <td className="p-3 border border-grey-200 font-medium text-grey-900">
                      {week}주차
                    </td>
                    {sortedGrades.map((grade) => {
                      const key = `${week}-${grade.grade_id}`;
                      const value = grid[key];
                      return (
                        <td key={grade.grade_id} className="p-2 border border-grey-200">
                          <select
                            value={value || ''}
                            onChange={(e) =>
                              handleCellChange(
                                week,
                                grade.grade_id,
                                e.target.value as ActivityType
                              )
                            }
                            className={`w-full p-2 border border-grey-200 rounded-lg font-medium ${getSelectBgClass(
                              value
                            )}`}
                          >
                            <option value="">선택</option>
                            {Object.entries(ACTIVITY_TYPES).map(([type, info]) => (
                              <option key={type} value={type}>
                                {info.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 활동 유형 범례 */}
          <div className="mt-6 flex items-center gap-4 text-sm">
            <span className="text-grey-500">활동 유형:</span>
            {Object.entries(ACTIVITY_TYPES).map(([type, info]) => (
              <span key={type} className="flex items-center gap-1">
                <span
                  className={`w-3 h-3 rounded ${
                    type === 'english_class'
                      ? 'bg-emerald-400'
                      : type === 'math_class'
                      ? 'bg-blue-400'
                      : 'bg-amber-400'
                  }`}
                />
                {info.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
