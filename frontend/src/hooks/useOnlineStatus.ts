/**
 * B-6: 온라인/오프라인 상태 감지 훅
 *
 * 네트워크 연결 상태를 실시간으로 감지하고
 * 상태 변경 시 콜백을 트리거합니다.
 *
 * @example
 * ```tsx
 * const { isOnline, wasOffline } = useOnlineStatus({
 *   onOnline: () => console.log('Back online!'),
 *   onOffline: () => console.log('Gone offline'),
 * });
 * ```
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseOnlineStatusOptions {
  /** 온라인 복귀 시 콜백 */
  onOnline?: () => void;
  /** 오프라인 전환 시 콜백 */
  onOffline?: () => void;
  /** 상태 변경 시 콜백 */
  onStatusChange?: (isOnline: boolean) => void;
  /** 서버 연결 확인 (ping) 간격 (ms) - 0이면 비활성화 */
  pingInterval?: number;
  /** 서버 ping URL */
  pingUrl?: string;
}

interface UseOnlineStatusResult {
  /** 현재 온라인 여부 */
  isOnline: boolean;
  /** 이전에 오프라인이었는지 (동기화 필요 여부 판단용) */
  wasOffline: boolean;
  /** 마지막 오프라인 시간 */
  lastOfflineAt: number | null;
  /** 수동 상태 확인 */
  checkStatus: () => Promise<boolean>;
}

export function useOnlineStatus(
  options: UseOnlineStatusOptions = {}
): UseOnlineStatusResult {
  const {
    onOnline,
    onOffline,
    onStatusChange,
    pingInterval = 30000, // 30초마다 서버 ping
    pingUrl = '/api/health',
  } = options;

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);

  const prevOnlineRef = useRef(navigator.onLine);

  // 서버 연결 확인 (실제 API 서버 ping)
  const checkServerConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, [pingUrl]);

  // 통합 상태 확인
  const checkStatus = useCallback(async (): Promise<boolean> => {
    // 브라우저 온라인 상태 먼저 확인
    if (!navigator.onLine) {
      return false;
    }

    // 실제 서버 연결 확인
    const serverOnline = await checkServerConnection();
    return serverOnline;
  }, [checkServerConnection]);

  // 상태 변경 핸들러
  const handleStatusChange = useCallback(
    (online: boolean) => {
      setIsOnline(online);

      if (prevOnlineRef.current !== online) {
        console.log(`[useOnlineStatus] Status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);

        if (online) {
          // 오프라인 → 온라인 복귀
          onOnline?.();
        } else {
          // 온라인 → 오프라인 전환
          setWasOffline(true);
          setLastOfflineAt(Date.now());
          onOffline?.();
        }

        onStatusChange?.(online);
        prevOnlineRef.current = online;
      }
    },
    [onOnline, onOffline, onStatusChange]
  );

  // 브라우저 온라인/오프라인 이벤트 리스너
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOnlineStatus] Browser online event');
      // 서버 연결도 확인
      checkServerConnection().then((serverOnline) => {
        handleStatusChange(serverOnline);
      });
    };

    const handleOffline = () => {
      console.log('[useOnlineStatus] Browser offline event');
      handleStatusChange(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkServerConnection, handleStatusChange]);

  // 주기적 서버 ping (선택적)
  useEffect(() => {
    if (pingInterval <= 0) return;

    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const serverOnline = await checkServerConnection();
        handleStatusChange(serverOnline);
      }
    }, pingInterval);

    return () => clearInterval(interval);
  }, [pingInterval, checkServerConnection, handleStatusChange]);

  // 초기 서버 연결 확인
  useEffect(() => {
    checkServerConnection().then((serverOnline) => {
      handleStatusChange(serverOnline);
    });
  }, []);

  return {
    isOnline,
    wasOffline,
    lastOfflineAt,
    checkStatus,
  };
}
