/**
 * CreateScenarioModal - 시나리오 생성 모달
 *
 * Stage 5-B: 시나리오 관리 UI
 * - 이름, 유형, 기간 입력
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import type { ScenarioType, CreateScenarioInput } from '@/types/timetable';
import { SCENARIO_TYPE_LABELS, SCENARIO_TYPE_COLORS } from '@/types/timetable';

interface CreateScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateScenarioInput) => void;
  isLoading?: boolean;
}

const SCENARIO_TYPES: ScenarioType[] = ['regular', 'vacation', 'exam', 'draft'];

/**
 * 시나리오 생성 모달
 */
export function CreateScenarioModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateScenarioModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ScenarioType>('regular');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      type,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // 폼 초기화
    setName('');
    setType('regular');
    setStartDate('');
    setEndDate('');
  };

  const handleClose = () => {
    setName('');
    setType('regular');
    setStartDate('');
    setEndDate('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
          <h2 className="text-lg font-semibold text-grey-900">
            새 시나리오 만들기
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1.5">
              시나리오 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2025 1학기 정규 시간표"
              className="
                w-full px-4 py-2.5 border border-grey-200 rounded-lg
                text-sm placeholder-grey-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              "
              autoFocus
            />
          </div>

          {/* 유형 */}
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1.5">
              유형
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SCENARIO_TYPES.map((t) => {
                const isSelected = t === type;
                const color = SCENARIO_TYPE_COLORS[t];

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`
                      py-2 rounded-lg text-sm font-medium transition-all
                      ${isSelected
                        ? 'bg-blue-500 text-white'
                        : `${color.bg} ${color.text} hover:opacity-80`
                      }
                    `}
                  >
                    {SCENARIO_TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-1.5">
                시작일 (선택)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="
                  w-full px-4 py-2.5 border border-grey-200 rounded-lg
                  text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grey-700 mb-1.5">
                종료일 (선택)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="
                  w-full px-4 py-2.5 border border-grey-200 rounded-lg
                  text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                "
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="
                flex-1 py-3 rounded-xl text-sm font-medium
                bg-grey-100 text-grey-700 hover:bg-grey-200 transition-colors
              "
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="
                flex-1 py-3 rounded-xl text-sm font-medium
                bg-blue-500 text-white hover:bg-blue-600 transition-colors
                disabled:bg-grey-300 disabled:cursor-not-allowed
              "
            >
              {isLoading ? '생성 중...' : '생성하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
