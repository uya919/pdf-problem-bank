/**
 * Phase 37-D3: 자동 동기화 훅
 *
 * 세션의 동기화 상태를 자동으로 확인하고
 * 필요 시 동기화를 트리거
 *
 * B-2: 동기화 최적화 (2025-12-07)
 * - 기본 체크 간격 30초 → 15초로 단축
 * - 페이지 포커스 복귀 시 즉시 체크
 * - debounce된 수동 동기화 지원
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { useWorkSessionStore } from '@/stores/workSessionStore';

type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error' | 'unknown';

interface AutoSyncOptions {
  /** 자동 상태 확인 간격 (ms) - 기본값 15초 (B-2) */
  checkInterval?: number;
  /** pending 상태일 때 자동 동기화 여부 */
  autoSyncOnPending?: boolean;
  /** 동기화 상태 변경 시 콜백 */
  onStatusChange?: (status: SyncStatus) => void;
  /** 페이지 포커스 복귀 시 즉시 체크 (B-2) */
  syncOnFocus?: boolean;
}

interface AutoSyncResult {
  status: SyncStatus;
  counts: {
    groups: number;
    session: number;
    links: number;
  };
  isChecking: boolean;
  isSyncing: boolean;
  checkStatus: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

export function useAutoSync(options: AutoSyncOptions = {}): AutoSyncResult {
  const {
    checkInterval = 15000,  // B-2: 30초 → 15초로 단축
    autoSyncOnPending = false,
    onStatusChange,
    syncOnFocus = true,  // B-2: 기본 활성화
  } = options;

  const { currentSession, getSyncStatus, fullSync } = useWorkSessionStore();

  const [status, setStatus] = useState<SyncStatus>('unknown');
  const [counts, setCounts] = useState({ groups: 0, session: 0, links: 0 });
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const prevStatusRef = useRef<SyncStatus>('unknown');

  // 상태 확인
  const checkStatus = useCallback(async () => {
    if (!currentSession || isChecking) return;

    setIsChecking(true);
    try {
      const result = await getSyncStatus();
      const newStatus = result.status as SyncStatus;

      setStatus(newStatus);
      setCounts({
        groups: result.groupsCount,
        session: result.sessionCount,
        links: result.linksCount,
      });

      // 상태 변경 콜백
      if (prevStatusRef.current !== newStatus) {
        onStatusChange?.(newStatus);
        prevStatusRef.current = newStatus;

        // 상태별 로그
        if (newStatus === 'pending') {
          console.log('[useAutoSync] 동기화 필요 - 새로운 변경사항 감지');
        } else if (newStatus === 'conflict') {
          console.warn('[useAutoSync] 충돌 발생 - 데이터 불일치 감지');
        }
      }

      // 자동 동기화
      if (autoSyncOnPending && newStatus === 'pending') {
        console.log('[useAutoSync] 자동 동기화 시작');
        await triggerSync();
      }
    } catch (error) {
      console.error('[useAutoSync] 상태 확인 실패:', error);
      setStatus('error');
    } finally {
      setIsChecking(false);
    }
  }, [currentSession, getSyncStatus, isChecking, onStatusChange, autoSyncOnPending]);

  // 동기화 실행
  const triggerSync = useCallback(async () => {
    if (!currentSession || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await fullSync();
      console.log('[useAutoSync] 동기화 완료:', result);

      // 동기화 후 상태 재확인
      setStatus('synced');
    } catch (error) {
      console.error('[useAutoSync] 동기화 실패:', error);
      setStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [currentSession, fullSync, isSyncing]);

  // 세션 변경 시 초기 상태 확인
  useEffect(() => {
    if (currentSession) {
      checkStatus();
    } else {
      setStatus('unknown');
      setCounts({ groups: 0, session: 0, links: 0 });
    }
  }, [currentSession?.sessionId]);

  // 주기적 상태 확인
  useEffect(() => {
    if (!currentSession || checkInterval <= 0) return;

    const interval = setInterval(() => {
      checkStatus();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [currentSession?.sessionId, checkInterval, checkStatus]);

  // B-2: 페이지 포커스 복귀 시 즉시 체크
  useEffect(() => {
    if (!currentSession || !syncOnFocus) return;

    const handleFocus = () => {
      console.log('[useAutoSync] Page focused - checking sync status');
      checkStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentSession?.sessionId, syncOnFocus, checkStatus]);

  return {
    status,
    counts,
    isChecking,
    isSyncing,
    checkStatus,
    triggerSync,
  };
}
