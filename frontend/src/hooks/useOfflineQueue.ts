/**
 * B-6: 오프라인 큐 관리 훅
 *
 * 온라인/오프라인 상태와 보류 작업을 통합 관리합니다.
 * 온라인 복귀 시 자동으로 보류 작업을 처리합니다.
 *
 * @example
 * ```tsx
 * const { isOnline, pendingCount, addToQueue, processQueue } = useOfflineQueue();
 *
 * const handleSave = async (data) => {
 *   if (!isOnline) {
 *     addToQueue({ type: 'SAVE_GROUP', payload: data });
 *     return;
 *   }
 *   await api.saveGroup(data);
 * };
 * ```
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import {
  offlineStorage,
  type OfflineOperation,
  type OfflineOperationType,
} from '../services/offlineStorage';
import { api } from '../api/client';

interface UseOfflineQueueOptions {
  /** 온라인 복귀 시 자동 동기화 */
  autoSync?: boolean;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
  /** 동기화 완료 콜백 */
  onSyncComplete?: (results: SyncResult[]) => void;
  /** 동기화 에러 콜백 */
  onSyncError?: (error: Error, operation: OfflineOperation) => void;
}

interface SyncResult {
  operationId: string;
  success: boolean;
  error?: string;
}

interface UseOfflineQueueResult {
  /** 현재 온라인 여부 */
  isOnline: boolean;
  /** 보류 작업 개수 */
  pendingCount: number;
  /** 동기화 중 여부 */
  isSyncing: boolean;
  /** 작업 추가 */
  addToQueue: (operation: {
    type: OfflineOperationType;
    payload: OfflineOperation['payload'];
  }) => void;
  /** 큐 처리 (수동 트리거) */
  processQueue: () => Promise<SyncResult[]>;
  /** 큐 비우기 */
  clearQueue: () => void;
  /** 그룹 캐시 저장 */
  cacheGroups: (documentId: string, pageIndex: number, groups: unknown[]) => void;
  /** 캐시된 그룹 조회 */
  getCachedGroups: (documentId: string, pageIndex: number) => unknown[] | null;
}

export function useOfflineQueue(
  options: UseOfflineQueueOptions = {}
): UseOfflineQueueResult {
  const {
    autoSync = true,
    maxRetries = 3,
    onSyncComplete,
    onSyncError,
  } = options;

  const [pendingCount, setPendingCount] = useState(() => offlineStorage.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // 온라인 상태 감지
  const { isOnline } = useOnlineStatus({
    onOnline: () => {
      console.log('[useOfflineQueue] Online - checking pending operations');
      if (autoSync) {
        processQueue();
      }
    },
    onOffline: () => {
      console.log('[useOfflineQueue] Offline - operations will be queued');
    },
  });

  // 보류 카운트 동기화
  useEffect(() => {
    setPendingCount(offlineStorage.getPendingCount());
  }, []);

  // 작업 추가
  const addToQueue = useCallback(
    (operation: { type: OfflineOperationType; payload: OfflineOperation['payload'] }) => {
      offlineStorage.addOperation(operation);
      setPendingCount(offlineStorage.getPendingCount());
      console.log(`[useOfflineQueue] Added to queue: ${operation.type}`);
    },
    []
  );

  // 단일 작업 처리
  const processOperation = useCallback(
    async (operation: OfflineOperation): Promise<SyncResult> => {
      try {
        const { type, payload } = operation;

        switch (type) {
          case 'SAVE_GROUP': {
            if (payload.documentId && payload.pageIndex !== undefined && payload.data) {
              await api.savePageGroups(
                payload.documentId,
                payload.pageIndex,
                payload.data as Parameters<typeof api.savePageGroups>[2]
              );
            }
            break;
          }

          case 'DELETE_GROUP': {
            // 삭제는 다음 저장에서 자동 처리됨
            break;
          }

          case 'LINK_PROBLEM': {
            if (payload.sessionId && payload.data) {
              const linkData = payload.data as {
                problemGroupId: string;
                solutionGroupId: string;
                solutionDocumentId: string;
                solutionPageIndex: number;
              };
              await api.createSessionLink(payload.sessionId, linkData);
            }
            break;
          }

          case 'UNLINK_PROBLEM': {
            if (payload.sessionId && payload.groupId) {
              await api.removeSessionLink(payload.sessionId, payload.groupId);
            }
            break;
          }

          case 'UPDATE_SESSION': {
            if (payload.sessionId && payload.data) {
              await api.updateWorkSession(
                payload.sessionId,
                payload.data as Parameters<typeof api.updateWorkSession>[1]
              );
            }
            break;
          }

          case 'REGISTER_PROBLEM': {
            if (payload.sessionId && payload.data) {
              await api.addProblemToSession(
                payload.sessionId,
                payload.data as Parameters<typeof api.addProblemToSession>[1]
              );
            }
            break;
          }

          default:
            console.warn(`[useOfflineQueue] Unknown operation type: ${type}`);
        }

        return { operationId: operation.id, success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { operationId: operation.id, success: false, error: errorMessage };
      }
    },
    []
  );

  // 큐 전체 처리
  const processQueue = useCallback(async (): Promise<SyncResult[]> => {
    if (syncingRef.current || !isOnline) {
      console.log('[useOfflineQueue] Skip queue processing (syncing or offline)');
      return [];
    }

    const queue = offlineStorage.getQueue();
    if (queue.length === 0) {
      console.log('[useOfflineQueue] Queue is empty');
      return [];
    }

    syncingRef.current = true;
    setIsSyncing(true);
    console.log(`[useOfflineQueue] Processing ${queue.length} pending operations`);

    const results: SyncResult[] = [];

    for (const operation of queue) {
      // 재시도 횟수 초과 체크
      if (operation.retryCount >= maxRetries) {
        console.warn(`[useOfflineQueue] Max retries exceeded for ${operation.id}`);
        offlineStorage.completeOperation(operation.id); // 포기하고 제거
        continue;
      }

      const result = await processOperation(operation);
      results.push(result);

      if (result.success) {
        offlineStorage.completeOperation(operation.id);
      } else {
        offlineStorage.failOperation(operation.id, result.error || 'Unknown error');
        onSyncError?.(new Error(result.error), operation);
      }
    }

    setPendingCount(offlineStorage.getPendingCount());
    setIsSyncing(false);
    syncingRef.current = false;

    const successCount = results.filter((r) => r.success).length;
    console.log(`[useOfflineQueue] Sync complete: ${successCount}/${results.length} succeeded`);

    onSyncComplete?.(results);
    return results;
  }, [isOnline, maxRetries, processOperation, onSyncComplete, onSyncError]);

  // 큐 비우기
  const clearQueue = useCallback(() => {
    offlineStorage.clearQueue();
    setPendingCount(0);
  }, []);

  // 그룹 캐시 저장
  const cacheGroups = useCallback(
    (documentId: string, pageIndex: number, groups: unknown[]) => {
      offlineStorage.cacheGroups(documentId, pageIndex, groups);
    },
    []
  );

  // 캐시된 그룹 조회
  const getCachedGroups = useCallback(
    (documentId: string, pageIndex: number): unknown[] | null => {
      const cache = offlineStorage.getCachedGroups(documentId, pageIndex);
      return cache?.groups ?? null;
    },
    []
  );

  return {
    isOnline,
    pendingCount,
    isSyncing,
    addToQueue,
    processQueue,
    clearQueue,
    cacheGroups,
    getCachedGroups,
  };
}
