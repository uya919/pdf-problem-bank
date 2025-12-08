/**
 * B-6: 오프라인 스토리지 서비스
 *
 * 네트워크 끊김 시 변경사항을 로컬에 저장하고
 * 온라인 복귀 시 동기화할 수 있도록 큐 관리
 *
 * IndexedDB + LocalStorage 하이브리드 사용
 * - 작은 데이터: LocalStorage (빠른 접근)
 * - 큰 데이터/이미지: IndexedDB (용량 큰 데이터)
 */

const STORAGE_PREFIX = 'pdf_offline_';
const QUEUE_KEY = `${STORAGE_PREFIX}queue`;
const GROUPS_KEY = `${STORAGE_PREFIX}groups`;
const SESSION_KEY = `${STORAGE_PREFIX}session`;

/** 오프라인 작업 타입 */
export type OfflineOperationType =
  | 'SAVE_GROUP'
  | 'DELETE_GROUP'
  | 'LINK_PROBLEM'
  | 'UNLINK_PROBLEM'
  | 'UPDATE_SESSION'
  | 'REGISTER_PROBLEM';

/** 오프라인 작업 항목 */
export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  timestamp: number;
  /** 작업 대상 정보 */
  payload: {
    documentId?: string;
    pageIndex?: number;
    groupId?: string;
    sessionId?: string;
    data?: unknown;
  };
  /** 재시도 횟수 */
  retryCount: number;
  /** 마지막 에러 메시지 */
  lastError?: string;
}

/** 오프라인 그룹 캐시 */
export interface OfflineGroupsCache {
  documentId: string;
  pageIndex: number;
  groups: unknown[];
  cachedAt: number;
}

class OfflineStorageService {
  private dbName = 'pdf_offline_db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * IndexedDB 초기화
   */
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[OfflineStorage] IndexedDB init failed:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 오프라인 작업 큐 저장소
        if (!db.objectStoreNames.contains('operations')) {
          db.createObjectStore('operations', { keyPath: 'id' });
        }

        // 그룹 캐시 저장소
        if (!db.objectStoreNames.contains('groups')) {
          const store = db.createObjectStore('groups', { keyPath: ['documentId', 'pageIndex'] });
          store.createIndex('documentId', 'documentId', { unique: false });
        }

        console.log('[OfflineStorage] IndexedDB schema created');
      };
    });
  }

  // ============ 작업 큐 관리 ============

  /**
   * 오프라인 작업 추가
   */
  addOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): OfflineOperation {
    const fullOperation: OfflineOperation = {
      ...operation,
      id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const queue = this.getQueue();
    queue.push(fullOperation);
    this.saveQueue(queue);

    console.log(`[OfflineStorage] Operation added: ${fullOperation.type}`, fullOperation.id);
    return fullOperation;
  }

  /**
   * 작업 큐 조회
   */
  getQueue(): OfflineOperation[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[OfflineStorage] Failed to read queue:', error);
      return [];
    }
  }

  /**
   * 작업 큐 저장
   */
  private saveQueue(queue: OfflineOperation[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[OfflineStorage] Failed to save queue:', error);
    }
  }

  /**
   * 작업 완료 처리 (큐에서 제거)
   */
  completeOperation(operationId: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter((op) => op.id !== operationId);
    this.saveQueue(filtered);
    console.log(`[OfflineStorage] Operation completed: ${operationId}`);
  }

  /**
   * 작업 실패 처리 (재시도 카운터 증가)
   */
  failOperation(operationId: string, error: string): void {
    const queue = this.getQueue();
    const index = queue.findIndex((op) => op.id === operationId);
    if (index !== -1) {
      queue[index].retryCount++;
      queue[index].lastError = error;
      this.saveQueue(queue);
    }
  }

  /**
   * 큐 비우기 (모든 작업 완료 시)
   */
  clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
    console.log('[OfflineStorage] Queue cleared');
  }

  /**
   * 보류 중인 작업 개수
   */
  getPendingCount(): number {
    return this.getQueue().length;
  }

  // ============ 그룹 캐시 관리 ============

  /**
   * 그룹 데이터 캐시
   */
  async cacheGroups(documentId: string, pageIndex: number, groups: unknown[]): Promise<void> {
    // LocalStorage 버전 (빠른 접근용)
    const key = `${GROUPS_KEY}_${documentId}_${pageIndex}`;
    const cache: OfflineGroupsCache = {
      documentId,
      pageIndex,
      groups,
      cachedAt: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(cache));
    } catch (error) {
      // LocalStorage 용량 초과 시 IndexedDB 사용
      console.warn('[OfflineStorage] LocalStorage full, using IndexedDB');
      await this.cacheGroupsToIDB(cache);
    }
  }

  private async cacheGroupsToIDB(cache: OfflineGroupsCache): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['groups'], 'readwrite');
      const store = transaction.objectStore('groups');
      const request = store.put(cache);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 캐시된 그룹 데이터 조회
   */
  getCachedGroups(documentId: string, pageIndex: number): OfflineGroupsCache | null {
    const key = `${GROUPS_KEY}_${documentId}_${pageIndex}`;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * 그룹 캐시 삭제
   */
  clearGroupsCache(documentId?: string): void {
    const prefix = documentId ? `${GROUPS_KEY}_${documentId}` : GROUPS_KEY;

    // LocalStorage에서 삭제
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log(`[OfflineStorage] Groups cache cleared (${keysToRemove.length} entries)`);
  }

  // ============ 세션 캐시 관리 ============

  /**
   * 현재 세션 캐시
   */
  cacheSession(session: unknown): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        session,
        cachedAt: Date.now(),
      }));
    } catch (error) {
      console.error('[OfflineStorage] Failed to cache session:', error);
    }
  }

  /**
   * 캐시된 세션 조회
   */
  getCachedSession(): { session: unknown; cachedAt: number } | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * 세션 캐시 삭제
   */
  clearSessionCache(): void {
    localStorage.removeItem(SESSION_KEY);
  }

  // ============ 유틸리티 ============

  /**
   * 전체 오프라인 데이터 용량 확인 (KB)
   */
  getStorageUsage(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += (key.length + value.length) * 2; // UTF-16
        }
      }
    }
    return Math.round(totalSize / 1024);
  }

  /**
   * 오래된 캐시 정리 (24시간 이상)
   */
  cleanupOldCache(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(GROUPS_KEY)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const cache = JSON.parse(data);
            if (now - cache.cachedAt > maxAgeMs) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // 파싱 실패한 항목도 삭제
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log(`[OfflineStorage] Cleaned up ${keysToRemove.length} old cache entries`);
  }
}

// 싱글톤 인스턴스
export const offlineStorage = new OfflineStorageService();
