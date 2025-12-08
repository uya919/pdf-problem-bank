/**
 * Phase 37-D3: 동기화 상태 표시 컴포넌트
 * Phase 37-D4: 토스트 알림 통합
 * Phase 44-B-FIX-2: 무한 루프 수정
 *
 * 세션의 동기화 상태를 시각적으로 표시하고
 * 수동 동기화 기능을 제공
 *
 * 무한 루프 방지 전략:
 * 1. checkStatus를 ref로 감싸서 useEffect 의존성에서 제거
 * 2. sessionId만 의존하여 세션 변경 시에만 재확인
 * 3. pending/conflict 상태는 사용자에게 알리고 수동 동기화 유도
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, AlertCircle, Cloud } from 'lucide-react';
import { useWorkSessionStore } from '@/stores/workSessionStore';
import { useToast } from '@/components/Toast';

type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error' | 'unknown' | 'checking';

interface SyncIndicatorProps {
  /** 컴팩트 모드 (아이콘만 표시) */
  compact?: boolean;
  /** 자동 상태 확인 간격 (ms, 0이면 비활성화) */
  autoCheckInterval?: number;
}

export function SyncIndicator({
  compact = false,
  autoCheckInterval = 30000,
}: SyncIndicatorProps) {
  // Phase 44-B-FIX-2: 필요한 상태만 구독 (안정적인 셀렉터)
  const sessionId = useWorkSessionStore(state => state.currentSession?.sessionId);
  const getSyncStatus = useWorkSessionStore(state => state.getSyncStatus);
  const fullSync = useWorkSessionStore(state => state.fullSync);
  const isLoading = useWorkSessionStore(state => state.isLoading);
  const { showToast } = useToast();

  const [status, setStatus] = useState<SyncStatus>('unknown');
  const [counts, setCounts] = useState({ groups: 0, session: 0, links: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  // Phase 37-D4: 이전 상태 추적 (토스트 중복 방지)
  const prevStatusRef = useRef<SyncStatus>('unknown');
  // Phase 44-B-FIX-2: 중복 체크 방지
  const isCheckingRef = useRef(false);

  // 상태 확인 (내부용, useCallback 없음 - ref로 접근)
  const checkStatusInternal = async () => {
    if (!sessionId || isCheckingRef.current) {
      if (!sessionId) setStatus('unknown');
      return;
    }

    isCheckingRef.current = true;
    setStatus('checking');

    try {
      const result = await getSyncStatus();
      const newStatus = result.status as SyncStatus;

      // Phase 37-D4: 상태 변경 시 토스트 알림 (pending/conflict만)
      if (prevStatusRef.current !== 'unknown' &&
          prevStatusRef.current !== 'checking' &&
          prevStatusRef.current !== newStatus) {
        if (newStatus === 'pending') {
          showToast('새로운 변경사항이 있습니다', {
            type: 'info',
            description: '동기화를 실행해주세요',
          });
        } else if (newStatus === 'conflict') {
          showToast('데이터 충돌이 감지되었습니다', {
            type: 'warning',
            description: '동기화하여 해결해주세요',
          });
        }
      }

      prevStatusRef.current = newStatus;
      setStatus(newStatus);
      setCounts({
        groups: result.groupsCount,
        session: result.sessionCount,
        links: result.linksCount,
      });
    } catch (error) {
      console.error('[SyncIndicator] Failed to check status:', error);
      setStatus('error');
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Phase 44-B-FIX-2: ref를 통한 안정적인 참조
  const checkStatusRef = useRef(checkStatusInternal);
  checkStatusRef.current = checkStatusInternal;

  // 동기화 실행
  const handleSync = useCallback(async () => {
    if (!sessionId || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await fullSync();
      // Phase 37-D4: 동기화 완료 토스트 (undefined 방어)
      showToast('동기화 완료', {
        type: 'success',
        description: `${result.problems_added ?? 0}개 추가, ${result.links_synced ?? 0}개 연결됨`,
      });
      // 동기화 후 상태 재확인 (ref 통해 호출)
      await checkStatusRef.current();
    } catch (error) {
      console.error('[SyncIndicator] Sync failed:', error);
      setStatus('error');
      // Phase 37-D4: 동기화 실패 토스트
      showToast('동기화 실패', {
        type: 'error',
        description: '잠시 후 다시 시도해주세요',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [sessionId, isSyncing, fullSync, showToast]);

  // Phase 44-B-FIX-2: 초기 상태 확인 (sessionId만 의존)
  useEffect(() => {
    if (sessionId) {
      checkStatusRef.current();
    }
  }, [sessionId]);  // checkStatus 제거!

  // Phase 44-B-FIX-2: 주기적 상태 확인 (sessionId만 의존)
  useEffect(() => {
    if (!sessionId || autoCheckInterval <= 0) return;

    const interval = setInterval(() => {
      checkStatusRef.current();
    }, autoCheckInterval);
    return () => clearInterval(interval);
  }, [sessionId, autoCheckInterval]);  // checkStatus 제거!

  // 세션이 없으면 표시 안함
  if (!sessionId) return null;

  // 상태별 설정
  const statusConfig: Record<SyncStatus, {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    label: string;
    description: string;
  }> = {
    synced: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: '동기화됨',
      description: '모든 데이터가 최신 상태입니다',
    },
    pending: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      label: '동기화 필요',
      description: '새로운 변경사항이 있습니다',
    },
    conflict: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: '충돌 발생',
      description: '데이터 불일치가 감지되었습니다',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: '오류',
      description: '상태 확인 중 오류가 발생했습니다',
    },
    unknown: {
      icon: Cloud,
      color: 'text-grey-400',
      bgColor: 'bg-grey-50',
      label: '확인 중',
      description: '동기화 상태를 확인하고 있습니다',
    },
    checking: {
      icon: RefreshCw,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      label: '확인 중...',
      description: '상태를 확인하고 있습니다',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const showSyncButton = status === 'pending' || status === 'conflict';
  const spinning = status === 'checking' || isSyncing || isLoading;

  // 컴팩트 모드
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleSync}
          disabled={spinning}
          className={`p-1.5 rounded-md transition-colors ${config.bgColor} hover:opacity-80 disabled:opacity-50`}
          title={`${config.label}: ${config.description}`}
        >
          <Icon className={`w-4 h-4 ${config.color} ${spinning ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  // 전체 모드
  return (
    <div className="flex items-center gap-2">
      {/* 상태 표시 */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bgColor}`}
        title={config.description}
      >
        <Icon className={`w-4 h-4 ${config.color} ${spinning ? 'animate-spin' : ''}`} />
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* 카운트 표시 */}
      {status === 'synced' && (
        <span className="text-xs text-grey-500">
          {counts.session}개 문제 · {counts.links}개 연결
        </span>
      )}

      {/* 동기화 버튼 */}
      {showSyncButton && (
        <button
          onClick={handleSync}
          disabled={spinning}
          className="px-2.5 py-1 text-xs font-medium bg-toss-blue text-white rounded-md hover:bg-toss-blue/90 disabled:opacity-50 transition-colors"
        >
          {isSyncing ? '동기화 중...' : '동기화'}
        </button>
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={() => checkStatusRef.current()}
        disabled={spinning}
        className="p-1 hover:bg-grey-100 rounded transition-colors"
        title="상태 새로고침"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-grey-400 ${spinning ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
