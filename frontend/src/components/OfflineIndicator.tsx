/**
 * B-6: 오프라인 상태 표시기
 *
 * 네트워크 연결 상태와 보류 작업을 표시합니다.
 * 화면 상단에 배너 형태로 표시됩니다.
 */
import { useOfflineQueue } from '../hooks/useOfflineQueue';

interface OfflineIndicatorProps {
  /** 표시 위치 */
  position?: 'top' | 'bottom';
  /** 온라인 시 숨기기 */
  hideWhenOnline?: boolean;
}

export function OfflineIndicator({
  position = 'top',
  hideWhenOnline = true,
}: OfflineIndicatorProps) {
  const { isOnline, pendingCount, isSyncing, processQueue } = useOfflineQueue();

  // 온라인이고 보류 작업 없으면 숨기기
  if (hideWhenOnline && isOnline && pendingCount === 0) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  return (
    <div
      className={`fixed left-0 right-0 ${positionClasses} z-50 px-4 py-2 flex items-center justify-between text-sm ${
        isOnline
          ? 'bg-blue-50 text-blue-700 border-b border-blue-200'
          : 'bg-amber-50 text-amber-700 border-b border-amber-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* 상태 아이콘 */}
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse'
          }`}
        />

        {/* 상태 텍스트 */}
        {isOnline ? (
          <span>
            {isSyncing
              ? '동기화 중...'
              : pendingCount > 0
              ? `${pendingCount}개 작업 대기 중`
              : '연결됨'}
          </span>
        ) : (
          <span>오프라인 - 변경사항이 로컬에 저장됩니다</span>
        )}
      </div>

      {/* 수동 동기화 버튼 */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={() => processQueue()}
          className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        >
          지금 동기화
        </button>
      )}

      {/* 동기화 로딩 */}
      {isSyncing && (
        <div className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-xs">동기화 중...</span>
        </div>
      )}
    </div>
  );
}

/**
 * 컴팩트한 오프라인 상태 배지
 * 헤더나 사이드바에 넣을 수 있는 작은 버전
 */
export function OfflineBadge() {
  const { isOnline, pendingCount, isSyncing } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
        isOnline
          ? 'bg-blue-100 text-blue-700'
          : 'bg-amber-100 text-amber-700'
      }`}
      title={
        isOnline
          ? `${pendingCount}개 작업 대기 중`
          : '오프라인 - 변경사항이 로컬에 저장됩니다'
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOnline
            ? isSyncing
              ? 'bg-blue-500 animate-pulse'
              : 'bg-blue-500'
            : 'bg-amber-500 animate-pulse'
        }`}
      />
      {isOnline ? (
        isSyncing ? (
          '동기화 중'
        ) : (
          `${pendingCount}개 대기`
        )
      ) : (
        '오프라인'
      )}
    </div>
  );
}
