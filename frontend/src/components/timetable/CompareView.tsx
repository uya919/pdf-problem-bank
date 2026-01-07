/**
 * CompareView - 시나리오 비교 뷰
 *
 * Stage 5-G: 비교 뷰
 * - 2개 시나리오 나란히 표시
 * - 차이점 하이라이트
 */

import { useState } from 'react';
import { X, ArrowLeftRight, Check } from 'lucide-react';
import type { TimetableScenario, TimetableSlot } from '@/types/timetable';
import { DAY_OF_WEEK_LABELS, generateTimeSlots, DEFAULT_TIME_GRID_CONFIG } from '@/types/timetable';

interface CompareViewProps {
  scenarios: TimetableScenario[];
  slotsMap: Record<string, TimetableSlot[]>;
  onClose: () => void;
}

/**
 * 비교 뷰
 */
export function CompareView({ scenarios, slotsMap, onClose }: CompareViewProps) {
  const [leftId, setLeftId] = useState<string>(scenarios[0]?.id || '');
  const [rightId, setRightId] = useState<string>(scenarios[1]?.id || scenarios[0]?.id || '');

  const leftScenario = scenarios.find((s) => s.id === leftId);
  const rightScenario = scenarios.find((s) => s.id === rightId);
  const leftSlots = slotsMap[leftId] || [];
  const rightSlots = slotsMap[rightId] || [];

  const timeSlots = generateTimeSlots(DEFAULT_TIME_GRID_CONFIG);

  // 슬롯 맵 생성 (day-time → slot)
  const createSlotMap = (slots: TimetableSlot[]) => {
    const map = new Map<string, TimetableSlot>();
    slots.forEach((slot) => {
      const key = `${slot.dayOfWeek}-${slot.startTime}`;
      map.set(key, slot);
    });
    return map;
  };

  const leftMap = createSlotMap(leftSlots);
  const rightMap = createSlotMap(rightSlots);

  // 차이점 찾기
  const findDifferences = () => {
    const diffs: string[] = [];

    // 모든 키 수집
    const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);

    allKeys.forEach((key) => {
      const left = leftMap.get(key);
      const right = rightMap.get(key);

      if (!left && right) {
        diffs.push(key); // 오른쪽에만 있음
      } else if (left && !right) {
        diffs.push(key); // 왼쪽에만 있음
      } else if (left && right && left.classId !== right.classId) {
        diffs.push(key); // 다른 반이 배정됨
      }
    });

    return new Set(diffs);
  };

  const differences = findDifferences();

  if (scenarios.length < 2) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <p className="text-grey-600 mb-4">비교하려면 2개 이상의 시나리오가 필요합니다.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-grey-50 overflow-auto animate-fade-in">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white border-b border-grey-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-grey-900">시나리오 비교</h2>
          <span className="text-sm text-grey-500">
            {differences.size}개 차이점
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 시나리오 선택 */}
      <div className="px-6 py-4 grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">왼쪽 시나리오</label>
          <select
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            className="w-full px-4 py-2.5 border border-grey-200 rounded-lg bg-white"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">오른쪽 시나리오</label>
          <select
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            className="w-full px-4 py-2.5 border border-grey-200 rounded-lg bg-white"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 비교 그리드 */}
      <div className="px-6 pb-6 grid grid-cols-2 gap-6">
        {/* 왼쪽 그리드 */}
        <CompareGrid
          scenario={leftScenario}
          slotMap={leftMap}
          differences={differences}
          side="left"
        />

        {/* 오른쪽 그리드 */}
        <CompareGrid
          scenario={rightScenario}
          slotMap={rightMap}
          differences={differences}
          side="right"
        />
      </div>

      {/* 범례 */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-6 text-sm text-grey-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
            <span>차이점</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <span>동일</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 비교용 그리드 (축소형)
 */
function CompareGrid({
  scenario,
  slotMap,
  differences,
  side,
}: {
  scenario?: TimetableScenario;
  slotMap: Map<string, TimetableSlot>;
  differences: Set<string>;
  side: 'left' | 'right';
}) {
  const timeSlots = generateTimeSlots(DEFAULT_TIME_GRID_CONFIG);
  const days = [0, 1, 2, 3, 4, 5] as const;

  if (!scenario) return null;

  return (
    <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
      {/* 시나리오 이름 */}
      <div className={`px-4 py-3 font-medium ${side === 'left' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
        {scenario.name}
      </div>

      {/* 그리드 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-grey-50">
              <th className="w-12 px-2 py-2 text-grey-500 font-medium" />
              {days.map((day) => (
                <th key={day} className="px-2 py-2 text-grey-500 font-medium text-center">
                  {DAY_OF_WEEK_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time} className="border-t border-grey-100">
                <td className="px-2 py-1.5 text-grey-400 text-right">{time}</td>
                {days.map((day) => {
                  const key = `${day}-${time}`;
                  const slot = slotMap.get(key);
                  const isDiff = differences.has(key);

                  return (
                    <td
                      key={key}
                      className={`
                        px-1 py-1 text-center border-l border-grey-100
                        ${isDiff ? 'bg-yellow-50' : ''}
                      `}
                    >
                      {slot ? (
                        <div
                          className={`
                            px-1 py-0.5 rounded text-[10px] truncate
                            ${isDiff
                              ? 'bg-yellow-200 text-yellow-800 font-medium'
                              : 'bg-blue-100 text-blue-700'
                            }
                          `}
                          title={slot.className}
                        >
                          {slot.className || '?'}
                        </div>
                      ) : (
                        <span className="text-grey-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
