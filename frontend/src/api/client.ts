/**
 * API Client (Minimal for Backoffice)
 *
 * Backoffice는 Supabase를 직접 사용합니다.
 * 이 파일은 Railway Worker 등 외부 API 호출을 위한 최소 설정만 유지합니다.
 */
import axios from 'axios';

// API Base URL (Backend)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

/**
 * API 에러 핸들러
 */
export function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail || error.response?.data?.message || error.message;
    return new Error(message);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('알 수 없는 오류가 발생했습니다');
}

/**
 * Axios 인스턴스 (Backend API 호출용)
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 타임아웃 에러 처리 인터셉터
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error('[API Timeout]', error.config?.url);
      return Promise.reject(new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.'));
    }
    return Promise.reject(error);
  }
);
