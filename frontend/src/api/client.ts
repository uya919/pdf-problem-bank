/**
 * API 클라이언트 (Phase 2)
 */
import axios from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Phase 59-C: API 타임아웃 설정
const API_TIMEOUTS = {
  DEFAULT: 30000,    // 기본: 30초
  UPLOAD: 120000,    // PDF 업로드: 2분
  EXPORT: 60000,     // 이미지 내보내기: 1분
  QUICK: 10000,      // 간단한 조회: 10초
};

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUTS.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Phase 59-C: 타임아웃 에러 처리 인터셉터
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

// 타입 정의
export interface Document {
  document_id: string;
  total_pages: number;
  analyzed_pages: number;
  created_at: number;
}

export interface UploadResponse {
  document_id: string;
  total_pages: number;
  analyzed_pages: number;
  status: 'processing' | 'completed';
  task_id?: string;
  message: string;
}

export interface PageBlocks {
  document_id: string;
  page_index: number;
  width: number;
  height: number;
  columns: Column[];
  blocks: Block[];
}

export interface Column {
  id: string;
  x_min: number;
  x_max: number;
}

export interface Block {
  block_id: number;
  column: string;
  bbox: [number, number, number, number];
  pixel_density: number;
}

export interface PageGroups {
  document_id: string;
  page_index: number;
  groups: ProblemGroup[];
}

// Phase 53-C: 크로스 컬럼 세그먼트 타입
export interface GroupSegment {
  column: "L" | "R";
  block_ids: number[];
  order: number;  // 0 = 먼저, 1 = 나중 (한국어: L→R)
}

// Phase 50: 크로스 페이지 세그먼트 타입
export interface CrossPageSegment {
  page: number;           // 페이지 인덱스
  column: "L" | "R";
  block_ids: number[];
  order: number;          // 0 = 첫 페이지, 1 = 다음 페이지
}

export interface ProblemGroup {
  id: string;
  column: "L" | "R" | "X" | "XP";  // Phase 53: X = 크로스 컬럼, Phase 50: XP = 크로스 페이지
  block_ids: number[];

  // 문항 정보 (Phase 8: 선택적 필드)
  problemInfo?: ProblemInfo;
  order?: number;
  createdAt?: string;
  updatedAt?: string;

  // Phase 22-K: 그룹 연결 정보 (문제-해설 관계)
  link?: GroupLink;

  // Phase 23: 확정 상태 (자동 문제은행 등록)
  status?: 'draft' | 'confirmed';
  exportedAt?: string;

  // Phase 53-C: 크로스 컬럼 그룹용 세그먼트
  segments?: GroupSegment[];

  // Phase 50: 크로스 페이지 그룹용 세그먼트
  crossPageSegments?: CrossPageSegment[];

  // Phase 56: 모문제-하위문제 연결
  parentGroupId?: string;   // 모문제 그룹 ID (하위문제인 경우)
  isParent?: boolean;       // true면 이 그룹은 모문제 (컨텍스트 제공자)
}

// Phase 22-K: 그룹 연결 정보
export interface GroupLink {
  linkedGroupId: string;      // 연결된 그룹 ID
  linkedDocumentId: string;   // 연결된 문서 ID
  linkedPageIndex: number;    // 연결된 페이지
  linkedName: string;         // 연결된 그룹 표시 이름
  linkType: 'problem' | 'solution';  // 이 그룹이 문제인지 해설인지
  linkedAt: number;           // 연결 시간
}

// 문항 정보 타입 (Phase 8, Phase 48: 필수 필드 선택적으로 변경)
export interface ProblemInfo {
  bookName?: string;       // "수학의 바이블 개념on"
  course?: string;         // "공통수학2"
  page?: number;           // 464
  problemNumber: string;   // "3", "예제2", "유형01"
  displayName?: string;    // 자동 생성: "책이름 - 과정, 페이지p, 번호"

  // 선택 필드
  difficulty?: 'easy' | 'medium' | 'hard';
  problemType?: string;
  tags?: string[];
}

// Phase 23-C: 내보내기된 문제 타입
export interface ExportedProblem {
  document_id: string;
  page_index: number;
  group_id: string;
  column: string;
  block_ids: number[];
  bbox: [number, number, number, number];
  image_path: string;
  problem_info?: {
    bookName?: string;
    course?: string;
    page?: number;
    problemNumber?: string;
  };
  exported_at?: string;
}

// Phase 24-B: 일괄 삭제 타입
export interface BulkDeleteRequest {
  problems: Array<{
    document_id: string;
    page_index: number;
    group_id: string;
  }>;
}

export interface BulkDeleteResponse {
  success: boolean;
  deleted_count: number;
  failed_count: number;
  errors: string[];
}

// Phase 24-C: 해설 연결 정보 타입
export interface SolutionLink {
  solutionDocumentId: string;
  solutionPageIndex: number;
  solutionGroupId: string;
  sessionId: string;
  matchedAt: number;
  problemNumber: string;
}

export interface LinkedSolutionsResponse {
  links: Record<string, SolutionLink>;  // key: "documentId|pageIndex|groupId"
  total: number;
}

// 문서 설정 타입 (Phase 8)
export interface DocumentSettings {
  document_id: string;

  // 페이지 오프셋 설정
  pageOffset: {
    startPage: number;     // 첫 번째 PDF 페이지의 실제 책 페이지
    increment: number;     // 페이지당 증가량 (기본: 1)
  };

  // 기본 문항 정보 (자동완성용)
  defaultBookName?: string;
  defaultCourse?: string;

  // 마지막 사용 정보
  lastUsedPage?: number;
  lastUsedProblemNumber?: string;
}

// Phase 22: 매칭 타입
export interface MatchingSession {
  sessionId: string;
  name?: string;
  problemDocumentId?: string;
  solutionDocumentId?: string;
  pendingProblems: PendingProblemApi[];
  matchedPairs: ProblemSolutionMatchApi[];
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface PendingProblemApi {
  problemNumber: string;
  groupId: string;
  documentId: string;
  pageIndex: number;
  createdAt: number;
  windowId: string;
}

export interface SolutionInfoApi {
  groupId: string;
  documentId: string;
  pageIndex: number;
}

export interface ProblemSolutionMatchApi {
  matchId: string;
  sessionId: string;
  problem: PendingProblemApi;
  solution: SolutionInfoApi;
  matchedAt: number;
}

export interface MatchingSessionStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalMatches: number;
}

export interface MatchingSessionState {
  sessionId: string;
  pendingProblems: PendingProblemApi[];
  matchedPairs: ProblemSolutionMatchApi[];
  exists: boolean;
}

// Phase 32: 작업 세션 타입 (순서 중요: ProblemReference, ProblemSolutionLink를 먼저 정의)
export interface ProblemReference {
  groupId: string;
  documentId: string;
  pageIndex: number;
  problemNumber: string;
  displayName: string;
  createdAt: number;
  // Phase 56-I: 메타데이터 추가
  bookName?: string;
  course?: string;
  page?: number;
  isParent?: boolean;
}

export interface ProblemSolutionLink {
  problemGroupId: string;
  solutionGroupId: string;
  solutionDocumentId: string;
  solutionPageIndex: number;
  linkedAt: number;
}

export interface WorkSession {
  sessionId: string;
  name: string;
  problemDocumentId: string;
  problemDocumentName: string;
  solutionDocumentId: string | null;
  solutionDocumentName: string;
  step: 'labeling' | 'setup' | 'matching' | 'completed';
  problems: ProblemReference[];
  links: ProblemSolutionLink[];
  // Phase 48: 마지막 작업 페이지
  lastProblemPage?: number;
  lastSolutionPage?: number;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface WorkSessionStats {
  totalProblems: number;
  linkedProblems: number;
  progress: number;
}

export interface WorkSessionDetailResponse {
  session: WorkSession;
  stats: WorkSessionStats;
}

export interface WorkSessionListResponse {
  items: WorkSession[];
  total: number;
}

export interface AllGroupsResponse {
  document_id: string;
  total_groups: number;
  pages: Array<{
    page_index: number;
    groups: ProblemGroup[];
  }>;
}

// Phase 22-L: 문서 페어링 타입
export interface DocumentPair {
  id: string;
  problem_document_id: string;
  solution_document_id: string;
  created_at: string;
  status: 'active' | 'archived';
  last_session_id?: string;
  matched_count: number;
}

export interface DocumentPairList {
  items: DocumentPair[];
  total: number;
}

export interface CreateDocumentPairRequest {
  problem_document_id: string;
  solution_document_id: string;
}

export interface DocumentPairStats {
  total_pairs: number;
  active_pairs: number;
  archived_pairs: number;
  total_matched_count: number;
}

// Phase 10-2: 그룹 요약 타입 (문항번호 연속성용)
export interface PageSummary {
  page_index: number;
  last_problem_number: string | null;
  group_count: number;
}

export interface GroupsSummary {
  document_id: string;
  pages: PageSummary[];
}

export interface PageStatus {
  page_index: number;
  has_blocks: boolean;
  has_groups: boolean;
  status: 'not_analyzed' | 'analyzed' | 'labeled';
}

export interface TaskStatus {
  task_id: string;
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_pages: number;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface RecentActivity {
  document_id: string;
  name: string;
  time: string;
  status: 'completed' | 'in_progress';
}

export interface DocumentProgress {
  document_id: string;
  name: string;
  progress: number;
}

export interface DashboardStats {
  total_documents: number;
  total_problems: number;
  in_progress_documents: number;
  completion_rate: number;
  recent_activities: RecentActivity[];
  document_progress: DocumentProgress[];
  pending_pages: number;
}

export interface DocumentStats {
  document_id: string;
  total_pages: number;
  analyzed_pages: number;
  labeled_pages: number;
  total_problems: number;
  blocks_count: number;
}

// Phase 34-B: 업로드 메타데이터 인터페이스
export interface UploadMetadata {
  documentId?: string;
  grade?: string;
  course?: string;
  series?: string;
  docType?: string;
}

// Phase 34-C: 과정 설정 인터페이스
export interface CoursesConfig {
  defaultCourses: Record<string, string[]>;
  customCourses: Record<string, string[]>;
}

// API 함수들
export const api = {
  /**
   * PDF 업로드 (Phase 35: customDocumentId, Phase 34-B: metadata 추가)
   */
  uploadPDF: async (file: File, metadata?: UploadMetadata): Promise<UploadResponse> => {
    console.log('[api.uploadPDF] Starting upload', { fileName: file.name, metadata });

    const formData = new FormData();
    formData.append('file', file);

    // Phase 35: 커스텀 document_id 지원
    if (metadata?.documentId) {
      formData.append('document_id', metadata.documentId);
    }

    // Phase 34-B: 메타데이터 추가
    if (metadata?.grade) {
      formData.append('grade', metadata.grade);
    }
    if (metadata?.course) {
      formData.append('course', metadata.course);
    }
    if (metadata?.series) {
      formData.append('series', metadata.series);
    }
    if (metadata?.docType) {
      formData.append('doc_type', metadata.docType);
    }

    // FormData 내용 확인
    console.log('[api.uploadPDF] FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, typeof value === 'string' ? value : (value as File).name);
    }

    try {
      // Phase 59-C: PDF 업로드는 더 긴 타임아웃 사용 (2분)
      const response = await apiClient.post<UploadResponse>('/api/pdf/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: API_TIMEOUTS.UPLOAD,
      });
      console.log('[api.uploadPDF] Upload successful', response.data);
      return response.data;
    } catch (error) {
      console.error('[api.uploadPDF] Upload failed', error);
      throw error;
    }
  },

  // 문서 목록 조회
  getDocuments: async (): Promise<Document[]> => {
    const response = await apiClient.get<Document[]>('/api/pdf/documents');
    return response.data;
  },

  // 특정 문서 정보 조회
  getDocument: async (documentId: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/api/pdf/documents/${documentId}`);
    return response.data;
  },

  // 문서 삭제
  deleteDocument: async (documentId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/pdf/documents/${documentId}`);
    return response.data;
  },

  // 페이지 블록 조회
  getPageBlocks: async (documentId: string, pageIndex: number): Promise<PageBlocks> => {
    const response = await apiClient.get<PageBlocks>(
      `/api/blocks/documents/${documentId}/pages/${pageIndex}`
    );
    return response.data;
  },

  // 페이지 이미지 URL (Phase 14-3: quality 파라미터 추가)
  getPageImageUrl: (
    documentId: string,
    pageIndex: number,
    quality: 'full' | 'thumb' = 'full'
  ): string => {
    return `${API_BASE_URL}/api/blocks/documents/${encodeURIComponent(documentId)}/pages/${pageIndex}/image?quality=${quality}`;
  },

  // 페이지 그룹 조회
  getPageGroups: async (documentId: string, pageIndex: number): Promise<PageGroups> => {
    const response = await apiClient.get<PageGroups>(
      `/api/blocks/documents/${documentId}/groups/${pageIndex}`
    );
    return response.data;
  },

  // 페이지 그룹 저장
  savePageGroups: async (
    documentId: string,
    pageIndex: number,
    groups: PageGroups
  ): Promise<{ message: string }> => {
    const response = await apiClient.post(
      `/api/blocks/documents/${documentId}/groups/${pageIndex}`,
      groups
    );
    return response.data;
  },

  /**
   * B-5: 그룹 저장 + 내보내기 통합 API
   *
   * Race Condition 방지를 위해 그룹 저장과 내보내기를 단일 트랜잭션으로 수행
   */
  saveGroupAndExport: async (
    documentId: string,
    pageIndex: number,
    group: ProblemGroup,
    options?: {
      allGroups?: ProblemGroup[];
      export?: boolean;
    }
  ): Promise<{
    saved: boolean;
    exported: {
      success: boolean;
      image_path?: string;
      error?: string;
    };
  }> => {
    const response = await apiClient.post(
      `/api/blocks/documents/${documentId}/groups/${pageIndex}/save-and-export`,
      {
        group,
        all_groups: options?.allGroups,
        export: options?.export ?? true,
      }
    );
    return response.data;
  },

  // Phase 31-H-4: 특정 그룹 정보 업데이트
  updateGroupInfo: async (
    documentId: string,
    pageIndex: number,
    groupId: string,
    updates: {
      problemNumber?: string;
      bookName?: string;
      course?: string;
      page?: number;
    }
  ): Promise<{ message: string; group: ProblemGroup }> => {
    const response = await apiClient.patch(
      `/api/blocks/documents/${documentId}/groups/${pageIndex}/${groupId}`,
      updates
    );
    return response.data;
  },

  // 페이지 상태 조회
  getPageStatus: async (documentId: string, pageIndex: number): Promise<PageStatus> => {
    const response = await apiClient.get<PageStatus>(
      `/api/blocks/documents/${documentId}/pages/${pageIndex}/status`
    );
    return response.data;
  },

  // 작업 상태 조회
  getTaskStatus: async (taskId: string): Promise<TaskStatus> => {
    const response = await apiClient.get<TaskStatus>(`/api/pdf/tasks/${taskId}`);
    return response.data;
  },

  // 작업 목록 조회
  getTasks: async (documentId?: string): Promise<TaskStatus[]> => {
    const params = documentId ? { document_id: documentId } : {};
    const response = await apiClient.get<TaskStatus[]>('/api/pdf/tasks', { params });
    return response.data;
  },

  // 페이지 문제 내보내기 (Phase 4)
  // Phase 59-C: 내보내기는 더 긴 타임아웃 사용 (1분)
  exportPageProblems: async (
    documentId: string,
    pageIndex: number,
    metadata?: any
  ): Promise<{ exported_count: number; problems: any[] }> => {
    const response = await apiClient.post(
      `/api/export/documents/${documentId}/pages/${pageIndex}/export`,
      metadata || {},
      { timeout: API_TIMEOUTS.EXPORT }
    );
    return response.data;
  },

  // Phase 23: 개별 그룹 내보내기 (확정 시 호출)
  // Phase 59-C: 내보내기는 더 긴 타임아웃 사용 (1분)
  exportGroup: async (
    documentId: string,
    pageIndex: number,
    groupId: string
  ): Promise<{ success: boolean; image_path: string; exported_at: string }> => {
    const response = await apiClient.post(
      `/api/export/documents/${documentId}/pages/${pageIndex}/groups/${groupId}/export`,
      {},
      { timeout: API_TIMEOUTS.EXPORT }
    );
    return response.data;
  },

  // Phase 53-Fix-B: 그룹 데이터를 직접 전달하여 내보내기
  // segments 필드가 포함된 X 그룹을 위한 API
  // Phase 59-C: 내보내기는 더 긴 타임아웃 사용 (1분)
  exportGroupWithData: async (
    documentId: string,
    pageIndex: number,
    groupId: string,
    groupData: ProblemGroup
  ): Promise<{ success: boolean; image_path: string; exported_at: string }> => {
    const response = await apiClient.post(
      `/api/export/documents/${documentId}/pages/${pageIndex}/groups/${groupId}/export-with-data`,
      groupData,
      { timeout: API_TIMEOUTS.EXPORT }
    );
    return response.data;
  },

  // 내보낸 문제 목록 조회
  getExportedProblems: async (documentId: string): Promise<any[]> => {
    const response = await apiClient.get(`/api/export/documents/${documentId}/problems`);
    return response.data;
  },

  // Phase 23-C: 모든 문서의 내보내기된 문제 조회
  getAllExportedProblems: async (options?: {
    search?: string;
    documentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ problems: ExportedProblem[]; total: number; has_more: boolean }> => {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.documentId) params.append('document_id', options.documentId);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await apiClient.get(`/api/export/all-problems?${params.toString()}`);
    return response.data;
  },

  // 문제 이미지 URL
  getProblemImageUrl: (documentId: string, imagePath: string): string => {
    // Phase 23: undefined 값 방어
    if (!documentId || !imagePath) {
      console.warn('getProblemImageUrl: missing documentId or imagePath', { documentId, imagePath });
      return '';
    }
    return `${API_BASE_URL}/api/export/documents/${documentId}/problems/image?image_path=${encodeURIComponent(imagePath)}`;
  },

  // Phase 57-C: 문제-해설 연결 정보 조회
  getProblemSolutionLink: async (
    documentId: string,
    pageIndex: number,
    groupId: string
  ): Promise<{
    has_solution: boolean;
    solution: {
      document_id: string;
      page_index: number;
      group_id: string;
      image_path: string | null;
    } | null;
  }> => {
    const response = await apiClient.get(
      `/api/export/problems/${documentId}/${pageIndex}/${groupId}/solution`
    );
    return response.data;
  },

  // 문제 삭제 (Phase 5)
  deleteProblem: async (
    documentId: string,
    pageIndex: number,
    groupId: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete(
      `/api/export/documents/${documentId}/problems/${pageIndex}/${groupId}`
    );
    return response.data;
  },

  // Phase 24-B: 일괄 삭제
  bulkDeleteProblems: async (request: BulkDeleteRequest): Promise<BulkDeleteResponse> => {
    const response = await apiClient.post<BulkDeleteResponse>(
      '/api/export/problems/bulk-delete',
      request
    );
    return response.data;
  },

  // 모든 페이지 일괄 내보내기 (Phase 5)
  exportAllProblems: async (
    documentId: string,
    metadata?: any
  ): Promise<{ total_pages: number; exported_pages: number; total_problems: number }> => {
    const response = await apiClient.post(
      `/api/export/documents/${documentId}/export-all`,
      metadata || {}
    );
    return response.data;
  },

  // 대시보드 통계 조회 (Phase 6-2)
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/api/stats/dashboard');
    return response.data;
  },

  // 문서 통계 조회 (Phase 6-2)
  getDocumentStats: async (documentId: string): Promise<DocumentStats> => {
    const response = await apiClient.get<DocumentStats>(`/api/stats/documents/${documentId}/stats`);
    return response.data;
  },

  // === Phase 8: 문항 이름 시스템 ===

  // 문서 설정 조회
  getDocumentSettings: async (documentId: string): Promise<DocumentSettings> => {
    const response = await apiClient.get<DocumentSettings>(
      `/api/documents/${encodeURIComponent(documentId)}/settings`
    );
    return response.data;
  },

  // 문서 설정 저장
  saveDocumentSettings: async (
    documentId: string,
    settings: Partial<DocumentSettings>
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(
      `/api/documents/${encodeURIComponent(documentId)}/settings`,
      settings
    );
    return response.data;
  },

  // === Phase 10-2: 문항번호 연속성 ===

  // 문서 전체 그룹 요약 조회 (페이지간 문항번호 연속성용)
  getGroupsSummary: async (documentId: string): Promise<GroupsSummary> => {
    const response = await apiClient.get<GroupsSummary>(
      `/api/blocks/documents/${encodeURIComponent(documentId)}/groups-summary`
    );
    return response.data;
  },

  // === Phase 22: 매칭 API ===

  // 매칭 세션 목록 조회
  getMatchingSessions: async (status?: string): Promise<{ items: MatchingSession[]; total: number }> => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/api/matching/sessions', { params });
    return response.data;
  },

  // 매칭 세션 통계
  getMatchingStats: async (): Promise<MatchingSessionStats> => {
    const response = await apiClient.get<MatchingSessionStats>('/api/matching/sessions/stats');
    return response.data;
  },

  // 매칭 세션 생성
  createMatchingSession: async (data: {
    name?: string;
    problemDocumentId?: string;
    solutionDocumentId?: string;
  }): Promise<MatchingSession> => {
    const response = await apiClient.post<MatchingSession>('/api/matching/sessions', data);
    return response.data;
  },

  // 매칭 세션 조회
  getMatchingSession: async (sessionId: string): Promise<MatchingSession> => {
    const response = await apiClient.get<MatchingSession>(`/api/matching/sessions/${sessionId}`);
    return response.data;
  },

  // 매칭 세션 업데이트
  updateMatchingSession: async (
    sessionId: string,
    data: { name?: string; status?: 'active' | 'completed' | 'cancelled' }
  ): Promise<MatchingSession> => {
    const response = await apiClient.patch<MatchingSession>(`/api/matching/sessions/${sessionId}`, data);
    return response.data;
  },

  // 매칭 세션 삭제
  deleteMatchingSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/matching/sessions/${sessionId}`);
    return response.data;
  },

  // 매칭 추가
  addMatch: async (
    sessionId: string,
    problem: PendingProblemApi,
    solution: SolutionInfoApi
  ): Promise<ProblemSolutionMatchApi> => {
    const response = await apiClient.post<ProblemSolutionMatchApi>(
      `/api/matching/sessions/${sessionId}/matches`,
      { sessionId, problem, solution }
    );
    return response.data;
  },

  // 매칭 취소
  removeMatch: async (
    sessionId: string,
    matchId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/matching/sessions/${sessionId}/matches/${matchId}`);
    return response.data;
  },

  // 세션의 모든 매칭 조회
  getMatches: async (sessionId: string): Promise<ProblemSolutionMatchApi[]> => {
    const response = await apiClient.get<ProblemSolutionMatchApi[]>(
      `/api/matching/sessions/${sessionId}/matches`
    );
    return response.data;
  },

  // 대기 문제 추가
  addPending: async (sessionId: string, problem: PendingProblemApi): Promise<PendingProblemApi> => {
    const response = await apiClient.post<PendingProblemApi>(
      `/api/matching/sessions/${sessionId}/pending`,
      problem
    );
    return response.data;
  },

  // 대기 문제 제거
  removePending: async (
    sessionId: string,
    groupId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/matching/sessions/${sessionId}/pending/${groupId}`);
    return response.data;
  },

  // 세션 상태 동기화
  syncMatchingState: async (
    sessionId: string,
    data: { pendingProblems?: PendingProblemApi[]; matchedPairs?: ProblemSolutionMatchApi[] }
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/api/matching/sessions/${sessionId}/sync`, data);
    return response.data;
  },

  // 세션 상태 조회
  getMatchingState: async (sessionId: string): Promise<MatchingSessionState> => {
    const response = await apiClient.get<MatchingSessionState>(
      `/api/matching/sessions/${sessionId}/state`
    );
    return response.data;
  },

  // Phase 24-C: 해설 연결 정보 조회
  getLinkedSolutions: async (): Promise<LinkedSolutionsResponse> => {
    const response = await apiClient.get<LinkedSolutionsResponse>('/api/matching/linked-solutions');
    return response.data;
  },

  // === Phase 22-L: 문서 페어링 API ===

  // 페어 목록 조회
  getDocumentPairs: async (status?: string): Promise<DocumentPairList> => {
    const params = status ? { status } : {};
    const response = await apiClient.get<DocumentPairList>('/api/document-pairs', { params });
    return response.data;
  },

  // 페어 생성
  createDocumentPair: async (data: CreateDocumentPairRequest): Promise<DocumentPair> => {
    const response = await apiClient.post<DocumentPair>('/api/document-pairs', data);
    return response.data;
  },

  // 페어 조회
  getDocumentPair: async (pairId: string): Promise<DocumentPair> => {
    const response = await apiClient.get<DocumentPair>(`/api/document-pairs/${pairId}`);
    return response.data;
  },

  // 특정 문서의 페어 조회
  getPairsForDocument: async (documentId: string): Promise<DocumentPair[]> => {
    const response = await apiClient.get<DocumentPair[]>(`/api/document-pairs/by-document/${documentId}`);
    return response.data;
  },

  // 페어 삭제
  deleteDocumentPair: async (pairId: string, hardDelete = false): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/api/document-pairs/${pairId}`, {
      params: { hard_delete: hardDelete }
    });
    return response.data;
  },

  // 페어 통계
  getDocumentPairStats: async (): Promise<DocumentPairStats> => {
    const response = await apiClient.get<DocumentPairStats>('/api/document-pairs/stats');
    return response.data;
  },

  // === Phase 32: 작업 세션 API ===

  // 문서의 모든 그룹 조회
  getAllGroups: async (documentId: string): Promise<AllGroupsResponse> => {
    const response = await apiClient.get<AllGroupsResponse>(
      `/api/blocks/documents/${encodeURIComponent(documentId)}/all-groups`
    );
    return response.data;
  },

  // 작업 세션 목록 조회
  getWorkSessions: async (options?: {
    status?: string;
    problemDocId?: string;
  }): Promise<WorkSessionListResponse> => {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.problemDocId) params.problem_doc_id = options.problemDocId;
    const response = await apiClient.get<WorkSessionListResponse>('/api/work-sessions/', { params });
    return response.data;
  },

  // 작업 세션 생성 (Phase 33: 양쪽 문서 필수)
  createWorkSession: async (data: {
    problemDocumentId: string;
    problemDocumentName?: string;
    solutionDocumentId: string;
    solutionDocumentName?: string;
    name?: string;
  }): Promise<WorkSession> => {
    const response = await apiClient.post<WorkSession>('/api/work-sessions/', data);
    return response.data;
  },

  // 작업 세션 조회
  getWorkSession: async (sessionId: string): Promise<WorkSessionDetailResponse> => {
    const response = await apiClient.get<WorkSessionDetailResponse>(`/api/work-sessions/${sessionId}`);
    return response.data;
  },

  // 작업 세션 업데이트
  updateWorkSession: async (
    sessionId: string,
    data: {
      name?: string;
      solutionDocumentId?: string;
      solutionDocumentName?: string;
      step?: 'labeling' | 'setup' | 'matching' | 'completed';
      status?: 'active' | 'completed' | 'cancelled';
      // Phase 48: 마지막 작업 페이지
      lastProblemPage?: number;
      lastSolutionPage?: number;
    }
  ): Promise<WorkSession> => {
    const response = await apiClient.patch<WorkSession>(`/api/work-sessions/${sessionId}`, data);
    return response.data;
  },

  // 작업 세션 삭제
  deleteWorkSession: async (sessionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/work-sessions/${sessionId}`);
    return response.data;
  },

  // 세션에 문제 추가
  addProblemToSession: async (
    sessionId: string,
    data: {
      groupId: string;
      pageIndex: number;
      problemNumber: string;
      displayName?: string;
    }
  ): Promise<WorkSession> => {
    const response = await apiClient.post<WorkSession>(`/api/work-sessions/${sessionId}/problems`, data);
    return response.data;
  },

  // 세션에서 문제 삭제
  removeProblemFromSession: async (sessionId: string, groupId: string): Promise<WorkSession> => {
    const response = await apiClient.delete<WorkSession>(`/api/work-sessions/${sessionId}/problems/${groupId}`);
    return response.data;
  },

  // 문제-해설 연결 생성
  createSessionLink: async (
    sessionId: string,
    data: {
      problemGroupId: string;
      solutionGroupId: string;
      solutionDocumentId: string;
      solutionPageIndex: number;
    }
  ): Promise<WorkSession> => {
    const response = await apiClient.post<WorkSession>(`/api/work-sessions/${sessionId}/links`, data);
    return response.data;
  },

  // 문제-해설 연결 삭제
  removeSessionLink: async (sessionId: string, problemGroupId: string): Promise<WorkSession> => {
    const response = await apiClient.delete<WorkSession>(`/api/work-sessions/${sessionId}/links/${problemGroupId}`);
    return response.data;
  },

  // groups.json에서 문제 동기화
  syncProblemsFromGroups: async (sessionId: string): Promise<WorkSession> => {
    const response = await apiClient.post<WorkSession>(`/api/work-sessions/${sessionId}/sync-problems`);
    return response.data;
  },

  // Phase 37-D: 완전 양방향 동기화 (groups.json ↔ session)
  fullSync: async (sessionId: string): Promise<{
    success: boolean;
    problems_added: number;
    problems_removed: number;
    problems_updated: number;
    links_synced: number;
    session: WorkSession;
  }> => {
    const response = await apiClient.post(`/api/work-sessions/${sessionId}/full-sync`);
    return response.data;
  },

  // Phase 37-D: 동기화 상태 확인
  getSyncStatus: async (sessionId: string): Promise<{
    status: 'synced' | 'pending' | 'conflict' | 'error';
    groupsCount: number;
    sessionCount: number;
    linksCount: number;
    error?: string;
  }> => {
    const response = await apiClient.get(`/api/work-sessions/${sessionId}/sync-status`);
    return response.data;
  },

  // Phase 56-O: isParent 필드 동기화 (기존 데이터 호환)
  syncParentFlags: async (sessionId: string): Promise<{
    success: boolean;
    updated: number;
    session: WorkSession;
  }> => {
    const response = await apiClient.post(`/api/work-sessions/${sessionId}/sync-parent-flags`);
    return response.data;
  },

  // Phase 59-B: 동기화 검증 (orphan 문제 정리)
  validateSync: async (sessionId: string): Promise<{
    status: 'ok' | 'fixed';
    issues_found: number;
    issues_fixed: number;
    details: Array<{
      type: string;
      problem: string;
      page: number;
      documentId: string;
      action: string;
    }>;
  }> => {
    const response = await apiClient.post(`/api/work-sessions/${sessionId}/validate-sync`);
    return response.data;
  },

  // Phase 46-A: displayName 새로고침 (레거시 데이터 업그레이드)
  refreshDisplayNames: async (sessionId: string): Promise<{
    success: boolean;
    updated: number;
    session: WorkSession;
  }> => {
    const response = await apiClient.post(`/api/work-sessions/${sessionId}/refresh-display-names`);
    return response.data;
  },

  // 문서로 세션 찾기
  findSessionsByDocument: async (documentId: string): Promise<WorkSessionListResponse> => {
    const response = await apiClient.get<WorkSessionListResponse>(
      `/api/work-sessions/by-document/${encodeURIComponent(documentId)}`
    );
    return response.data;
  },

  // === Phase 34-C: 과정 설정 API ===

  // 과정 목록 조회
  getCourses: async (): Promise<CoursesConfig> => {
    const response = await apiClient.get<CoursesConfig>('/api/config/courses');
    return response.data;
  },

  // 과정 추가
  addCourse: async (grade: string, course: string): Promise<{ message: string; grade: string; course: string }> => {
    const response = await apiClient.post('/api/config/courses', { grade, course });
    return response.data;
  },

  // 과정 삭제
  deleteCourse: async (grade: string, course: string): Promise<{ message: string; grade: string; course: string }> => {
    const response = await apiClient.delete(`/api/config/courses/${encodeURIComponent(grade)}/${encodeURIComponent(course)}`);
    return response.data;
  },
};
