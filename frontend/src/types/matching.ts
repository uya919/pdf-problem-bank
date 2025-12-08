/**
 * 문제-해설 매칭 타입 정의
 *
 * Phase 22-A: 듀얼 윈도우 매칭 시스템
 */

/** 창 역할 */
export type WindowRole = 'problem' | 'solution' | null;

/** 매칭 세션 상태 */
export type SessionStatus = 'connecting' | 'connected' | 'disconnected';

/** 대기 중인 문제 */
export interface PendingProblem {
  problemNumber: string;
  groupId: string;
  documentId: string;
  pageIndex: number;
  createdAt: number;
  windowId: string;
}

/** 해설 정보 */
export interface SolutionInfo {
  groupId: string;
  documentId: string;
  pageIndex: number;
}

/** 문제-해설 매칭 */
export interface ProblemSolutionMatch {
  matchId: string;
  sessionId: string;
  problem: PendingProblem;
  solution: SolutionInfo;
  matchedAt: number;
}

/** 매칭 세션 */
export interface MatchingSession {
  sessionId: string;
  problemDocumentId: string;
  solutionDocumentId: string;
  createdAt: number;
  status: 'in_progress' | 'completed';
}

/** 동기화 메시지 타입 */
export type SyncMessageType =
  | 'WINDOW_JOINED'
  | 'WINDOW_LEFT'
  | 'ROLE_SET'
  | 'PROBLEM_LABELED'
  | 'SOLUTION_LABELED'
  | 'MATCH_CREATED'
  | 'MATCH_CANCELLED'
  | 'SYNC_STATE';

/** 동기화 메시지 */
export interface SyncMessage<T = unknown> {
  type: SyncMessageType;
  payload: T;
  timestamp: number;
  windowId: string;
}

/** WINDOW_JOINED 페이로드 */
export interface WindowJoinedPayload {
  windowId: string;
  role: WindowRole;
  documentId: string;
}

/** ROLE_SET 페이로드 */
export interface RoleSetPayload {
  windowId: string;
  role: WindowRole;
}

/** PROBLEM_LABELED 페이로드 */
export interface ProblemLabeledPayload extends PendingProblem {}

/** MATCH_CREATED 페이로드 */
export interface MatchCreatedPayload extends ProblemSolutionMatch {}

/** MATCH_CANCELLED 페이로드 */
export interface MatchCancelledPayload {
  matchId: string;
  problemGroupId: string;
}

/** SYNC_STATE 페이로드 (상태 동기화용) */
export interface SyncStatePayload {
  pendingProblems: PendingProblem[];
  matchedPairs: ProblemSolutionMatch[];
}

/** 매칭 상태 */
export interface MatchingState {
  sessionId: string | null;
  role: WindowRole;
  isConnected: boolean;
  connectedWindows: number;
  pendingProblems: PendingProblem[];
  matchedPairs: ProblemSolutionMatch[];
}

// ===============================================
// Phase 22-G: 문서 역할 지정 타입
// ===============================================

/** 선택된 문서 정보 */
export interface SelectedDocument {
  id: string;           // document_id
  name: string;         // 표시용 이름
  source: 'upload' | 'existing';  // 업로드 vs 기존 문서
}

/** 역할 타입 */
export type DocumentRole = 'problem' | 'solution';

/** DualUploadCard에서 사용하는 문서 상태 */
export interface DocumentSelection {
  problem: SelectedDocument | null;
  solution: SelectedDocument | null;
}

// ===============================================
// Phase 22-K: 그룹 연결 정보 (관계 시각화)
// ===============================================

/** 그룹 연결 정보 */
export interface GroupLink {
  linkedGroupId: string;      // 연결된 그룹 ID
  linkedDocumentId: string;   // 연결된 문서 ID
  linkedPageIndex: number;    // 연결된 페이지
  linkedName: string;         // 연결된 그룹 표시 이름
  linkType: 'problem' | 'solution';  // 이 그룹이 문제인지 해설인지
  linkedAt: number;           // 연결 시간
}

/** 확장된 SolutionInfo (Phase 22-K) */
export interface ExtendedSolutionInfo extends SolutionInfo {
  solutionName?: string;  // Phase 22-J-2: 해설 이름
}
