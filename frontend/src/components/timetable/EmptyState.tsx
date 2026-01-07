/**
 * EmptyState - 빈 상태 컴포넌트
 *
 * Stage 5-B: 시나리오 관리 UI
 * - 시나리오 없을 때
 * - 슬롯 없을 때
 */

import { Plus, Calendar, Grid3X3 } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-scenario' | 'no-slots';
  onAction?: () => void;
}

/**
 * 빈 상태 표시
 */
export function EmptyState({ type, onAction }: EmptyStateProps) {
  if (type === 'no-scenario') {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-grey-200">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-grey-900 mb-2">
          시나리오가 없습니다
        </h3>
        <p className="text-grey-500 text-center mb-6 max-w-sm">
          새 시나리오를 만들어 시간표 계획을 시작하세요.<br />
          정규, 방학, 시험 등 상황별로 관리할 수 있습니다.
        </p>
        {onAction && (
          <button
            onClick={onAction}
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-blue-500 text-white font-medium
              hover:bg-blue-600 transition-colors
            "
          >
            <Plus className="w-4 h-4" />
            첫 시나리오 만들기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 bg-grey-50 rounded-xl border-2 border-dashed border-grey-200">
      <div className="w-14 h-14 bg-grey-100 rounded-xl flex items-center justify-center mb-4">
        <Grid3X3 className="w-7 h-7 text-grey-400" />
      </div>
      <h3 className="text-base font-semibold text-grey-700 mb-1">
        아직 배정된 수업이 없습니다
      </h3>
      <p className="text-sm text-grey-500 text-center max-w-sm">
        오른쪽 패널에서 반을 드래그하여<br />
        원하는 시간대에 배정하세요.
      </p>
    </div>
  );
}
