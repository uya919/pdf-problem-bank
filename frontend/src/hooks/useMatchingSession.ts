/**
 * 매칭 세션 관리 훅
 *
 * Phase 22-A: 듀얼 윈도우 매칭 시스템
 * Phase 22-F-4: URL role 자동 감지 개선
 *
 * URL 파라미터에서 세션 정보를 읽고 세션 상태를 관리
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { WindowRole, MatchingSession } from '@/types/matching';

interface UseMatchingSessionReturn {
  /** 세션 ID (null이면 일반 라벨링 모드) */
  sessionId: string | null;
  /** 창 역할 */
  role: WindowRole;
  /** 매칭 모드 활성화 여부 */
  isMatchingMode: boolean;
  /** URL에서 role이 미리 지정되어 있는지 (듀얼 윈도우 모드) */
  isRolePreset: boolean;
  /** 역할 설정 */
  setRole: (role: WindowRole) => void;
  /** 새 세션 시작 */
  startSession: (problemDocId: string, solutionDocId: string) => string;
  /** 세션 참여 (URL에서 세션 ID 있을 때) */
  joinSession: (sessionId: string, role: WindowRole) => void;
  /** 세션 종료 */
  endSession: () => void;
  /** 현재 문서가 문제인지 해설인지 */
  documentType: 'problem' | 'solution' | null;
}

/**
 * 매칭 세션 관리 훅
 *
 * URL 형식: /labeling/{documentId}?session={sessionId}&role={problem|solution}
 *
 * Phase 22-F-4: URL에 role이 미리 지정되어 있으면 (듀얼 윈도우 모드)
 * 역할 선택 모달을 건너뛰고 바로 매칭 모드로 진입
 */
export function useMatchingSession(): UseMatchingSessionReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL에서 세션 정보 읽기
  const sessionId = searchParams.get('session');
  const urlRole = searchParams.get('role') as WindowRole;

  // Phase 22-F-4: URL에서 role이 미리 지정되어 있는지 여부
  // 이 값이 true이면 듀얼 윈도우로 열린 것이므로 역할 선택 모달 스킵
  const isRolePreset = Boolean(sessionId && urlRole);

  // 로컬 상태 (URL과 동기화)
  const [role, setRoleState] = useState<WindowRole>(urlRole);

  // Phase 22-F-4: URL role 변경 시 상태 동기화
  useEffect(() => {
    if (urlRole && urlRole !== role) {
      setRoleState(urlRole);
      console.log(`[Phase 22-F-4] Auto-detected role from URL: ${urlRole}`);
    }
  }, [urlRole]);

  const isMatchingMode = sessionId !== null;

  // 역할 설정 (URL 업데이트)
  const setRole = useCallback((newRole: WindowRole) => {
    setRoleState(newRole);

    if (sessionId && newRole) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('role', newRole);
      setSearchParams(newParams, { replace: true });
    }
  }, [sessionId, searchParams, setSearchParams]);

  // 새 세션 시작
  const startSession = useCallback((problemDocId: string, solutionDocId: string): string => {
    const newSessionId = generateSessionId();

    // 세션 정보 localStorage에 저장
    const session: MatchingSession = {
      sessionId: newSessionId,
      problemDocumentId: problemDocId,
      solutionDocumentId: solutionDocId,
      createdAt: Date.now(),
      status: 'in_progress'
    };
    localStorage.setItem(`matching-session-${newSessionId}`, JSON.stringify(session));

    console.log(`[Phase 22-A] Started session: ${newSessionId}`);

    return newSessionId;
  }, []);

  // 세션 참여
  const joinSession = useCallback((sid: string, r: WindowRole) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('session', sid);
    if (r) {
      newParams.set('role', r);
      setRoleState(r);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // 세션 종료
  const endSession = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('session');
    newParams.delete('role');
    setSearchParams(newParams, { replace: true });
    setRoleState(null);
  }, [searchParams, setSearchParams]);

  // 현재 문서가 문제인지 해설인지
  const documentType = useMemo(() => {
    if (!sessionId) return null;
    return role;
  }, [sessionId, role]);

  return {
    sessionId,
    role: role || urlRole,
    isMatchingMode,
    isRolePreset,
    setRole,
    startSession,
    joinSession,
    endSession,
    documentType
  };
}

/**
 * 세션 ID 생성 (8자리)
 */
function generateSessionId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * 세션 정보 조회
 */
export function getSessionInfo(sessionId: string): MatchingSession | null {
  const stored = localStorage.getItem(`matching-session-${sessionId}`);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as MatchingSession;
  } catch {
    return null;
  }
}

/**
 * 세션 정보 저장
 */
export function saveSessionInfo(session: MatchingSession): void {
  localStorage.setItem(
    `matching-session-${session.sessionId}`,
    JSON.stringify(session)
  );
}
