/**
 * 메이크에듀 동기화 API (Phase 6-E)
 *
 * Stage 35-D: Vercel 배포 시 Railway Worker 직접 호출
 * - 로컬: 백엔드 프록시 통해 호출 (CORS 문제 없음)
 * - Vercel: Railway Worker 직접 호출
 */

import axios from 'axios';

// Railway Worker URL
const RAILWAY_WORKER_URL = import.meta.env.VITE_RAILWAY_WORKER_URL || 'https://makeedu-worker-production.up.railway.app';

// Railway Worker용 axios 클라이언트
const workerClient = axios.create({
  baseURL: RAILWAY_WORKER_URL,
  timeout: 120000, // 2분
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================================================
// Types
// =====================================================

/** 동기화 시작 요청 */
export interface SyncTriggerRequest {
  preview: boolean;
}

/** 동기화 시작 응답 */
export interface SyncTriggerResponse {
  jobId: string;
}

/** 작업 상태 */
export type SyncJobStatus = 'started' | 'scraping' | 'syncing' | 'completed' | 'failed';

/** 동기화 통계 */
export interface SyncStats {
  total: number;
  new: number;
  existing: number;
  updated: number;
  deleted: number;
  errors: number;
  dry_run: boolean;
  new_students: Array<{
    name: string;
    grade: string | null;
    phone: string | null;
    parent_phone: string | null;
  }>;
  updated_students: Array<{
    name: string;
    old_phone: string | null;
    new_phone: string | null;
    old_parent_phone: string | null;
    new_parent_phone: string | null;
  }>;
  deleted_students: Array<{
    name: string;
    grade: string | null;
  }>;
}

/** 동기화 결과 */
export interface SyncResult {
  success: boolean;
  mode: 'preview' | 'execute';
  stats: SyncStats;
  timestamp: string;
}

/** 작업 상태 응답 */
export interface SyncStatusResponse {
  status: SyncJobStatus;
  progress: number;
  message: string;
  preview?: boolean;
  result?: SyncResult;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

/** Worker 헬스체크 응답 */
export interface WorkerHealthResponse {
  status: string;
  timestamp: string;
  jobs_count: number;
  env_check: {
    supabase_url: boolean;
    supabase_key: boolean;
    makeedu_username: string;
  };
}

// =====================================================
// API Functions (Railway Worker 직접 호출)
// =====================================================

export const syncApi = {
  /**
   * 동기화 서비스 헬스체크
   */
  health: async (): Promise<WorkerHealthResponse> => {
    const response = await workerClient.get<WorkerHealthResponse>('/health');
    return response.data;
  },

  /**
   * 동기화 작업 시작
   *
   * @param preview - true: 미리보기 (DB 변경 없음), false: 실제 동기화
   * @returns jobId - 작업 ID (상태 조회용)
   */
  trigger: async (preview: boolean = true): Promise<SyncTriggerResponse> => {
    const endpoint = preview ? '/sync/preview' : '/sync/execute';
    const response = await workerClient.post<SyncTriggerResponse>(endpoint);
    return response.data;
  },

  /**
   * 작업 상태 조회
   *
   * @param jobId - 작업 ID
   * @returns 작업 상태 (status, progress, message, result 등)
   */
  getStatus: async (jobId: string): Promise<SyncStatusResponse> => {
    const response = await workerClient.get<SyncStatusResponse>(`/sync/status/${jobId}`);
    return response.data;
  },

  /**
   * 동기화 설정 조회
   */
  getConfig: async (): Promise<{
    railway_worker_url: string;
    timeout_seconds: number;
    endpoints: Record<string, string>;
  }> => {
    return {
      railway_worker_url: RAILWAY_WORKER_URL,
      timeout_seconds: 120,
      endpoints: {
        health: `${RAILWAY_WORKER_URL}/health`,
        preview: `${RAILWAY_WORKER_URL}/sync/preview`,
        execute: `${RAILWAY_WORKER_URL}/sync/execute`,
        status: `${RAILWAY_WORKER_URL}/sync/status/<job_id>`,
      },
    };
  },
};
