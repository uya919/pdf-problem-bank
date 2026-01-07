/**
 * ScenarioTabs - 시나리오 탭 네비게이션
 *
 * Stage 5-B: 시나리오 관리 UI
 * Stage 5-F: 다중 시간표 (탭/카드 전환)
 * - 시나리오 탭 전환
 * - 새 시나리오 추가 버튼
 * - 슬롯 개수 표시
 */

import { Plus, Calendar } from 'lucide-react';
import type { TimetableScenario } from '@/types/timetable';
import { SCENARIO_TYPE_COLORS } from '@/types/timetable';

interface ScenarioTabsProps {
  scenarios: TimetableScenario[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
  isLoading?: boolean;
  /** 시나리오별 슬롯 개수 (선택적) */
  slotCounts?: Record<string, number>;
}

/**
 * 시나리오 탭 네비게이션
 */
export function ScenarioTabs({
  scenarios,
  selectedId,
  onSelect,
  onCreateClick,
  isLoading = false,
  slotCounts = {},
}: ScenarioTabsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-24 bg-grey-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {scenarios.map((scenario) => {
        const isSelected = scenario.id === selectedId;
        const typeColor = SCENARIO_TYPE_COLORS[scenario.type];

        const slotCount = slotCounts[scenario.id] || 0;

        return (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              whitespace-nowrap transition-all duration-200
              ${isSelected
                ? 'bg-blue-500 text-white shadow-md scale-[1.02]'
                : 'bg-white text-grey-700 border border-grey-200 hover:bg-grey-50 hover:border-grey-300'
              }
            `}
          >
            <span
              className={`
                px-1.5 py-0.5 text-[10px] rounded font-medium
                ${isSelected
                  ? 'bg-white/20 text-white'
                  : `${typeColor.bg} ${typeColor.text}`
                }
              `}
            >
              {scenario.type === 'regular' ? '정규' :
               scenario.type === 'vacation' ? '방학' :
               scenario.type === 'exam' ? '시험' : '초안'}
            </span>
            <span>{scenario.name}</span>
            {slotCount > 0 && (
              <span
                className={`
                  flex items-center gap-0.5 text-[10px]
                  ${isSelected ? 'text-white/70' : 'text-grey-400'}
                `}
              >
                <Calendar className="w-3 h-3" />
                {slotCount}
              </span>
            )}
          </button>
        );
      })}

      {/* 새 시나리오 버튼 */}
      <button
        onClick={onCreateClick}
        className="
          flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium
          bg-grey-100 text-grey-600 hover:bg-grey-200 transition-colors
          whitespace-nowrap
        "
      >
        <Plus className="w-4 h-4" />
        새 시나리오
      </button>
    </div>
  );
}
