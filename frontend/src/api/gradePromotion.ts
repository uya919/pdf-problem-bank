/**
 * 학년 일괄 승급 API 클라이언트
 *
 * 매년 3월에 모든 학생의 학년을 한 단계 올리는 기능
 * 이력 저장 및 롤백 지원
 */

import { apiClient, handleApiError } from './client';

// =====================================================
// Types
// =====================================================

export interface PromotionPreviewStudent {
  id: string;
  name: string;
  current_grade: string;
  next_grade: string | null; // null이면 졸업
  school: string | null;
}

export interface PromotionPreviewResponse {
  total_students: number;
  to_promote: number;      // 승급 대상
  to_graduate: number;     // 졸업 대상 (고3)
  inactive_count: number;  // 이미 비활성 (스킵)
  students: PromotionPreviewStudent[];
}

export interface PromotionExecuteResponse {
  success: boolean;
  batch_id: string;         // 롤백용 배치 ID
  promoted_count: number;   // 승급된 학생 수
  graduated_count: number;  // 졸업 처리된 학생 수
  message: string;
}

export interface GradeStats {
  total_active: number;
  by_grade: { grade: string; count: number }[];
}

export interface PromotionHistoryItem {
  batch_id: string;
  promoted_at: string;
  total_affected: number;
  promoted_count: number;
  graduated_count: number;
  is_rolled_back: boolean;
  rolled_back_at: string | null;
}

export interface PromotionHistoryResponse {
  history: PromotionHistoryItem[];
}

export interface RollbackResponse {
  success: boolean;
  restored_count: number;
  reactivated_count: number;
  message: string;
}

// =====================================================
// V2 Types (반 승급 정보 포함)
// =====================================================

/**
 * 반 승급 정보
 */
export interface ClassPromotionInfo {
  enrollment_id: string;
  current_class_id: string;
  current_class_name: string;
  new_class_id: string | null;      // null이면 반 해제
  new_class_name: string | null;
  status: 'auto' | 'unassigned' | 'graduated';
  reason?: string;
}

/**
 * V2 학생 정보 (반 정보 포함)
 */
export interface PromotionPreviewStudentV2 {
  id: string;
  name: string;
  current_grade: string;
  next_grade: string | null;
  school: string | null;
  class_promotions: ClassPromotionInfo[];
}

/**
 * V2 미리보기 응답 (반 정보 포함)
 */
export interface PromotionPreviewResponseV2 {
  total_students: number;
  to_promote: number;
  to_graduate: number;
  inactive_count: number;
  students: PromotionPreviewStudentV2[];
  class_auto_count: number;       // 자동 이동 가능
  class_unassigned_count: number; // 수동 배정 필요
}

/**
 * V2 실행 응답 (반 승급 포함)
 */
export interface PromotionExecuteResponseV2 {
  success: boolean;
  batch_id: string;
  promoted_count: number;
  graduated_count: number;
  class_auto_moved: number;       // 자동 반 이동
  class_unassigned: number;       // 반 해제 (수동 배정 필요)
  message: string;
}

// =====================================================
// API Functions
// =====================================================

/**
 * 학년 승급 미리보기
 *
 * 현재 활성 학생들의 승급 예정 정보를 반환합니다.
 */
export async function getPromotionPreview(): Promise<PromotionPreviewResponse> {
  try {
    const response = await apiClient.get<PromotionPreviewResponse>(
      '/api/grade-promotion/preview'
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * 학년 일괄 승급 실행
 *
 * 이력이 저장되어 롤백 가능합니다.
 */
export async function executePromotion(): Promise<PromotionExecuteResponse> {
  try {
    const response = await apiClient.post<PromotionExecuteResponse>(
      '/api/grade-promotion/execute',
      { confirm: true }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * 현재 학년별 학생 수 통계
 */
export async function getGradeStats(): Promise<GradeStats> {
  try {
    const response = await apiClient.get<GradeStats>(
      '/api/grade-promotion/status'
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * 승급 이력 조회
 */
export async function getPromotionHistory(): Promise<PromotionHistoryResponse> {
  try {
    const response = await apiClient.get<PromotionHistoryResponse>(
      '/api/grade-promotion/history'
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * 승급 롤백
 *
 * 특정 배치의 승급을 되돌립니다.
 */
export async function rollbackPromotion(batchId: string): Promise<RollbackResponse> {
  try {
    const response = await apiClient.post<RollbackResponse>(
      '/api/grade-promotion/rollback',
      { batch_id: batchId, confirm: true }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// =====================================================
// V2 API Functions (반 승급 포함)
// =====================================================

/**
 * 학년 승급 미리보기 V2 (반 정보 포함)
 *
 * 현재 활성 학생들의 승급 예정 정보와 반 승급 정보를 반환합니다.
 */
export async function getPromotionPreviewV2(): Promise<PromotionPreviewResponseV2> {
  try {
    const response = await apiClient.get<PromotionPreviewResponseV2>(
      '/api/grade-promotion/preview/v2'
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

/**
 * 학년 일괄 승급 실행 V2 (반 승급 포함)
 *
 * 학년과 반을 함께 승급합니다. 이력이 저장되어 롤백 가능합니다.
 */
export async function executePromotionV2(): Promise<PromotionExecuteResponseV2> {
  try {
    const response = await apiClient.post<PromotionExecuteResponseV2>(
      '/api/grade-promotion/execute/v2',
      { confirm: true }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

// =====================================================
// Batch Assign (승급 후 빠른 배정)
// =====================================================

/**
 * 일괄 배정 요청
 */
export interface BatchAssignRequest {
  enrollment_ids: string[];
  new_class_id: string;
}

/**
 * 일괄 배정 응답
 */
export interface BatchAssignResponse {
  success: boolean;
  assigned_count: number;
  message: string;
}

/**
 * 미배정 enrollment 일괄 배정
 *
 * 승급 후 반 해제된 학생들을 빠르게 새 반에 배정
 */
export async function batchAssignEnrollments(
  request: BatchAssignRequest
): Promise<BatchAssignResponse> {
  try {
    const response = await apiClient.post<BatchAssignResponse>(
      '/api/grade-promotion/batch-assign',
      request
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
}
