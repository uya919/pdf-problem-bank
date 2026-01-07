/**
 * ScenarioHeader - 시나리오 헤더 (선택된 시나리오 정보 + 액션)
 *
 * Stage 5-B: 시나리오 관리 UI
 * - 시나리오 이름, 유형, 기간 표시
 * - 수정/삭제 버튼
 */

import { useState } from 'react';
import { Calendar, MoreVertical, Pencil, Trash2, Copy } from 'lucide-react';
import type { TimetableScenario } from '@/types/timetable';
import { SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS } from '@/types/timetable';

interface ScenarioHeaderProps {
  scenario: TimetableScenario;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

/**
 * 시나리오 헤더
 */
export function ScenarioHeader({
  scenario,
  onEdit,
  onDelete,
  onDuplicate,
}: ScenarioHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const typeColor = SCENARIO_TYPE_COLORS[scenario.type];

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {/* 유형 뱃지 */}
        <span
          className={`px-2 py-1 text-xs font-medium rounded ${typeColor.bg} ${typeColor.text}`}
        >
          {SCENARIO_TYPE_LABELS[scenario.type]}
        </span>

        {/* 이름 */}
        <h2 className="text-lg font-semibold text-grey-900">
          {scenario.name}
        </h2>

        {/* 기간 */}
        {(scenario.startDate || scenario.endDate) && (
          <div className="flex items-center gap-1.5 text-sm text-grey-500">
            <Calendar className="w-4 h-4" />
            <span>
              {formatDate(scenario.startDate) || '시작일 미정'}
              {' ~ '}
              {formatDate(scenario.endDate) || '종료일 미정'}
            </span>
          </div>
        )}
      </div>

      {/* 액션 메뉴 */}
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-grey-100 py-1 min-w-[140px]">
              {onEdit && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-grey-700 hover:bg-grey-50"
                >
                  <Pencil className="w-4 h-4" />
                  수정
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDuplicate();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-grey-700 hover:bg-grey-50"
                >
                  <Copy className="w-4 h-4" />
                  복제
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
