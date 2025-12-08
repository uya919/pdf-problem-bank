/**
 * Phase 20-B: Debug API Client
 *
 * 개발 환경에서 컨버터 상태 확인 및 디버깅을 위한 API
 */
import { apiClient } from './client';

// 타입 정의
export interface ConverterInfo {
  instance_exists: boolean;
  instance_id: number | null;
  file_mtime: number;
  current_file_mtime: number | null;
  app_env: string;
  note?: string;
}

export interface EnvironmentInfo {
  environment: string;
  is_development: boolean;
  is_production: boolean;
  is_testing: boolean;
  APP_ENV: string;
  PYTHONDONTWRITEBYTECODE: string;
}

export interface FeatureFlags {
  singleton_with_mtime_check: boolean;
  auto_reload_on_change: boolean;
  debug_endpoints_enabled: boolean;
  force_reload_available: boolean;
}

export interface DebugStatus {
  converter: ConverterInfo;
  environment: EnvironmentInfo;
  features: FeatureFlags;
}

export interface TestConvertRequest {
  hwp_equation: string;
}

export interface TestConvertResponse {
  input: string;
  output: string;
  conversion_time_ms: number;
  converter_info: ConverterInfo;
  environment: EnvironmentInfo;
}

export interface ReloadResponse {
  success: boolean;
  message: string;
  old_instance_id: number | null;
  new_instance_id: number | null;
}

export interface PatternInfo {
  total_patterns: number;
  converter_class: string;
  instance_id: number;
  pattern_preview?: string[];
}

// Debug API 함수들
export const debugApi = {
  /**
   * 디버그 상태 조회
   */
  getStatus: async (): Promise<DebugStatus> => {
    const response = await apiClient.get<DebugStatus>('/api/debug/status');
    return response.data;
  },

  /**
   * 테스트 변환
   */
  testConvert: async (hwpEquation: string): Promise<TestConvertResponse> => {
    const response = await apiClient.post<TestConvertResponse>('/api/debug/test-convert', {
      hwp_equation: hwpEquation,
    });
    return response.data;
  },

  /**
   * 컨버터 강제 리로드 (개발 환경 전용)
   */
  reloadConverter: async (): Promise<ReloadResponse> => {
    const response = await apiClient.post<ReloadResponse>('/api/debug/reload-converter');
    return response.data;
  },

  /**
   * 등록된 패턴 정보 조회
   */
  getPatterns: async (): Promise<PatternInfo> => {
    const response = await apiClient.get<PatternInfo>('/api/debug/patterns');
    return response.data;
  },
};
