/**
 * 순환수업 기본 설정 탭
 * - 이름, 요일, 시간, 주기
 * - 대상 학년 선택
 * - 활성화/삭제
 */
import { useState, useEffect } from 'react';
import { useGrades } from '../../../hooks/useClasses';
import { DAY_OF_WEEK_NAMES } from '../../../types/rotation';
import type {
  RotationSchedule,
  RotationTargetGrade,
  UpdateRotationScheduleInput,
} from '../../../types/rotation';

interface RotationSettingsProps {
  schedule: RotationSchedule;
  targetGrades: RotationTargetGrade[];
  onSave: (input: UpdateRotationScheduleInput) => void;
  onUpdateTargetGrades: (gradeIds: string[]) => void;
  onDelete: () => void;
  isSaving: boolean;
}

export function RotationSettings({
  schedule,
  targetGrades,
  onSave,
  onUpdateTargetGrades,
  onDelete,
  isSaving,
}: RotationSettingsProps) {
  const { data: allGrades } = useGrades();

  // 폼 상태
  const [name, setName] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(3);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cycleWeeks, setCycleWeeks] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 초기값 설정
  useEffect(() => {
    setName(schedule.name);
    setDayOfWeek(schedule.day_of_week);
    setStartTime(schedule.start_time.slice(0, 5));
    setEndTime(schedule.end_time.slice(0, 5));
    setCycleWeeks(schedule.cycle_weeks);
    setStartDate(schedule.start_date);
    setIsActive(schedule.is_active);
    setSelectedGradeIds(targetGrades.map((g) => g.grade_id));
    setHasChanges(false);
  }, [schedule, targetGrades]);

  const handleFieldChange = (setter: (value: any) => void) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const toggleGrade = (gradeId: string) => {
    setSelectedGradeIds((prev) =>
      prev.includes(gradeId)
        ? prev.filter((id) => id !== gradeId)
        : [...prev, gradeId]
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    // 스케줄 업데이트
    onSave({
      name,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      cycle_weeks: cycleWeeks,
      start_date: startDate,
      is_active: isActive,
    });

    // 대상 학년 업데이트
    const currentGradeIds = targetGrades.map((g) => g.grade_id);
    const gradeIdsChanged =
      selectedGradeIds.length !== currentGradeIds.length ||
      selectedGradeIds.some((id) => !currentGradeIds.includes(id));

    if (gradeIdsChanged) {
      onUpdateTargetGrades(selectedGradeIds);
    }

    setHasChanges(false);
  };

  const handleDelete = () => {
    if (window.confirm('순환수업을 삭제하시겠습니까?\n모든 설정과 기록이 삭제됩니다.')) {
      onDelete();
    }
  };

  // 학년 그룹화 (초등부, 중등부, 고등부)
  const gradeGroups = {
    초등부: allGrades?.filter((g) => g.name.startsWith('초')) || [],
    중등부: allGrades?.filter((g) => g.name.startsWith('중')) || [],
    고등부: allGrades?.filter((g) => g.name.startsWith('고')) || [],
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-grey-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-grey-900">순환수업 기본 설정</h3>
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

        <div className="space-y-6">
          {/* 수업 이름 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              순환수업 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleFieldChange(setName)(e.target.value)}
              className="w-full p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 요일 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              수업 요일
            </label>
            <div className="flex gap-2">
              {Object.entries(DAY_OF_WEEK_NAMES).map(([day, dayName]) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleFieldChange(setDayOfWeek)(parseInt(day))}
                  className={`w-12 h-12 rounded-lg font-medium transition-colors ${
                    dayOfWeek === parseInt(day)
                      ? 'bg-blue-500 text-white'
                      : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                  }`}
                >
                  {dayName}
                </button>
              ))}
            </div>
          </div>

          {/* 수업 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-2">
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => handleFieldChange(setStartTime)(e.target.value)}
                className="w-full p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-2">
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => handleFieldChange(setEndTime)(e.target.value)}
                className="w-full p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 순환 주기 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              순환 주기
            </label>
            <div className="flex items-center gap-2">
              <select
                value={cycleWeeks}
                onChange={(e) =>
                  handleFieldChange(setCycleWeeks)(parseInt(e.target.value))
                }
                className="p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2}>2주</option>
                <option value={3}>3주</option>
                <option value={4}>4주</option>
                <option value={5}>5주</option>
                <option value={6}>6주</option>
              </select>
              <span className="text-grey-500">마다 반복</span>
            </div>
          </div>

          {/* 시작 기준일 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              시작 기준일 (1주차 기준)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleFieldChange(setStartDate)(e.target.value)}
              className="w-full p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-grey-500 mt-1">
              이 날짜를 1주차로 계산합니다.
            </p>
          </div>

          {/* 대상 학년 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              대상 학년
            </label>
            <div className="space-y-3">
              {Object.entries(gradeGroups).map(([groupName, grades]) => (
                <div key={groupName}>
                  <div className="text-xs text-grey-500 mb-1">{groupName}</div>
                  <div className="flex flex-wrap gap-2">
                    {grades.map((grade) => (
                      <label
                        key={grade.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          selectedGradeIds.includes(grade.id)
                            ? 'bg-blue-100'
                            : 'bg-grey-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGradeIds.includes(grade.id)}
                          onChange={() => toggleGrade(grade.id)}
                          className="rounded text-blue-600"
                        />
                        {grade.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 활성화 상태 */}
          <div className="pt-4 border-t border-grey-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-grey-900">순환수업 활성화</div>
                <div className="text-sm text-grey-500">
                  비활성화하면 순환수업이 진행되지 않습니다.
                </div>
              </div>
              <button
                onClick={() => handleFieldChange(setIsActive)(!isActive)}
                className={`w-14 h-8 rounded-full relative transition-colors ${
                  isActive ? 'bg-blue-500' : 'bg-grey-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
                    isActive ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 위험 영역 */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h4 className="font-bold text-red-900 mb-4">위험 영역</h4>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-grey-900">순환수업 삭제</div>
            <div className="text-sm text-grey-500">
              모든 설정과 기록이 삭제됩니다.
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
