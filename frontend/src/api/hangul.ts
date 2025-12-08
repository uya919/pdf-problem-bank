/**
 * Phase 16: 한글 파일 (HWPX/HML) 파싱 API 클라이언트
 */
import { apiClient } from './client';

// === 타입 정의 ===

/** 파싱된 문제 */
export interface ParsedProblem {
  id: string;
  number: string;
  content_text: string;
  content_latex: string;                    // Phase 19-C: LaTeX 포함 텍스트
  content_images: string[];
  content_equations: string[];
  content_equations_latex: string[];        // Phase 19-C: LaTeX 변환 수식
  answer: string | null;
  answer_latex: string | null;              // Phase 19-C: LaTeX 형식 정답
  answer_type: 'choice' | 'value' | 'expression' | 'unknown' | null;
  explanation: string | null;
  points: number | null;
}

/** 파싱 결과 */
export interface ParseResult {
  success: boolean;
  problems: ParsedProblem[];
  total_problems: number;
  metadata: {
    filename: string;
    grade: string | null;
    subject: string | null;
    semester: string | null;
    exam_type: string | null;
    extracted_at: string;
  };
  // Phase 21: 이미지 지원
  detected_metadata?: {
    image_urls?: Record<string, string>;  // 이미지 ID -> URL 매핑
    image_count?: number;
    session_id?: string;
  };
  raw_text: string;
}

/** 문제 메타데이터 */
export interface ProblemMetadata {
  subject: string;
  grade: string;
  chapter: string;
  source: string;
  difficulty: number;
  tags: string[];
}

/** 저장 요청 */
export interface SaveRequest {
  problems: ParsedProblem[];
  metadata: ProblemMetadata;
}

/** 저장 응답 */
export interface SaveResponse {
  success: boolean;
  saved_count: number;
  problem_ids: string[];
  message: string;
}

/** 문제 목록 항목 */
export interface ProblemListItem {
  id: string;
  number: string;
  subject: string;
  grade: string;
  chapter: string;
  has_answer: boolean;
  has_explanation: boolean;
}

/** 문제 상세 */
export interface ProblemDetail {
  id: string;
  number: string;
  content_text: string;
  content_latex: string;                    // Phase 19-C: LaTeX 포함 텍스트
  content_images: string[];
  content_equations: string[];
  content_equations_latex: string[];        // Phase 19-C: LaTeX 변환 수식
  metadata: {
    subject: string;
    grade: string;
    chapter: string;
    source: string;
    difficulty: number;
    tags: string[];
    points: number | null;
  };
  created_at: string;
  answer_id?: string;
  explanation_id?: string;
  answer_data?: {
    id: string;
    problem_id: string;
    answer: string;
    answer_latex: string | null;            // Phase 19-C: LaTeX 형식 정답
    answer_type: string;
    created_at: string;
  };
  explanation_data?: {
    id: string;
    problem_id: string;
    content: string;
    created_at: string;
  };
}

/** 문제 목록 응답 */
export interface ProblemsListResponse {
  problems: ProblemDetail[];
  total: number;
  limit: number;
  offset: number;
}

/** Phase 17: 문제은행 통계 */
export interface ProblemBankStats {
  total_problems: number;
  with_answer: number;
  with_explanation: number;
  subjects: string[];
  grades: string[];
  chapters: string[];
  sources: string[];
  difficulties: Record<number, number>;
}

/** Phase 17: 문제 검색 파라미터 */
export interface ProblemSearchParams {
  subject?: string;
  grade?: string;
  chapter?: string;
  source?: string;
  difficulty?: number;
  has_answer?: boolean;
  has_explanation?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/** Phase 18-B: 휴지통 항목 */
export interface TrashItem {
  id: string;
  number: string;
  subject: string;
  grade: string;
  chapter: string;
  has_answer: boolean;
  has_explanation: boolean;
  deleted_at: string;
  days_in_trash: number;
}

/** Phase 18-B: 휴지통 목록 응답 */
export interface TrashListResponse {
  items: TrashItem[];
  total: number;
}

/** Phase 18-B: 휴지통 이동 응답 */
export interface MoveToTrashResponse {
  success: boolean;
  moved_count: number;
  moved_ids: string[];
  failed_ids: string[];
  message: string;
}

/** Phase 18-B: 복원 응답 */
export interface RestoreResponse {
  success: boolean;
  restored_count: number;
  restored_ids: string[];
  failed_ids: string[];
  message: string;
}

/** Phase 18-B: 휴지통 비우기 응답 */
export interface EmptyTrashResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

/** Phase 18-B: 단일 영구 삭제 응답 */
export interface PermanentDeleteResponse {
  success: boolean;
  deleted_id: string;
  message: string;
}

// === API 함수 ===

export const hangulApi = {
  /**
   * 한글 파일 파싱 (HWPX/HML)
   */
  parseFile: async (file: File): Promise<ParseResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ParseResult>('/api/hangul/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * 파싱된 문제 저장
   */
  saveProblems: async (request: SaveRequest): Promise<SaveResponse> => {
    const response = await apiClient.post<SaveResponse>('/api/hangul/save', request);
    return response.data;
  },

  /**
   * Phase 17: 문제 목록 조회 (확장된 필터링)
   */
  getProblems: async (params?: ProblemSearchParams): Promise<ProblemsListResponse> => {
    const response = await apiClient.get<ProblemsListResponse>('/api/hangul/problems', {
      params,
    });
    return response.data;
  },

  /**
   * Phase 17: 문제은행 통계 조회
   */
  getStats: async (): Promise<ProblemBankStats> => {
    const response = await apiClient.get<ProblemBankStats>('/api/hangul/stats');
    return response.data;
  },

  /**
   * 문제 상세 조회
   */
  getProblem: async (problemId: string): Promise<ProblemDetail> => {
    const response = await apiClient.get<ProblemDetail>(`/api/hangul/problems/${problemId}`);
    return response.data;
  },

  // === Phase 18-B: 휴지통 시스템 ===

  /**
   * 휴지통 목록 조회
   */
  getTrash: async (): Promise<TrashListResponse> => {
    const response = await apiClient.get<TrashListResponse>('/api/hangul/trash');
    return response.data;
  },

  /**
   * 문제를 휴지통으로 이동 (Soft Delete)
   */
  moveToTrash: async (problemIds: string[]): Promise<MoveToTrashResponse> => {
    const response = await apiClient.post<MoveToTrashResponse>(
      '/api/hangul/problems/move-to-trash',
      { problem_ids: problemIds }
    );
    return response.data;
  },

  /**
   * 휴지통에서 복원
   */
  restoreFromTrash: async (problemIds: string[]): Promise<RestoreResponse> => {
    const response = await apiClient.post<RestoreResponse>(
      '/api/hangul/trash/restore',
      { problem_ids: problemIds }
    );
    return response.data;
  },

  /**
   * 휴지통 비우기 (전체 영구 삭제)
   */
  emptyTrash: async (): Promise<EmptyTrashResponse> => {
    const response = await apiClient.delete<EmptyTrashResponse>(
      '/api/hangul/trash/empty',
      { params: { confirm: 'EMPTY_TRASH' } }
    );
    return response.data;
  },

  /**
   * 휴지통에서 단일 항목 영구 삭제
   */
  permanentDelete: async (problemId: string): Promise<PermanentDeleteResponse> => {
    const response = await apiClient.delete<PermanentDeleteResponse>(
      `/api/hangul/trash/${problemId}`
    );
    return response.data;
  },
};
