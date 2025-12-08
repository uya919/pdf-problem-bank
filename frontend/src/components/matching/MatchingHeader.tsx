/**
 * 매칭 모드 헤더
 *
 * Phase 22-B: 듀얼 윈도우 매칭 시스템
 * Phase 22-F-6: 연결 상태 표시 개선
 * Phase 22-H-fix: 초기 연결 대기 상태 추가
 *
 * 매칭 모드에서 역할 및 상태 표시
 * 연결 끊김 시 재연결 버튼 표시
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, BookOpen, Link2, Users, X, AlertTriangle, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import type { WindowRole, PendingProblem } from '@/types/matching';
import { openMatchingWindow } from '../../hooks/useDualWindowLauncher';

/** Phase 22-H-fix: 초기 연결 대기 시간 (ms) */
const INITIAL_CONNECTION_WAIT_MS = 3000;

interface MatchingHeaderProps {
  /** 창 역할 */
  role: WindowRole;
  /** 세션 ID */
  sessionId: string;
  /** 연결된 창 수 */
  connectedWindows: number;
  /** 대기 중인 문제 수 */
  pendingCount: number;
  /** 다음 대기 중인 문제 번호 */
  nextPendingNumber: string | null;
  /** 매칭 완료 수 */
  matchedCount: number;
  /** 세션 종료 콜백 */
  onEndSession: () => void;
  /** Phase 22-F-6: 상대 창 문서 ID (재연결용) */
  otherDocumentId?: string;
}

export function MatchingHeader({
  role,
  sessionId,
  connectedWindows,
  pendingCount,
  nextPendingNumber,
  matchedCount,
  onEndSession,
  otherDocumentId
}: MatchingHeaderProps) {
  const isProblemWindow = role === 'problem';
  const isSolutionWindow = role === 'solution';

  // Phase 22-H-fix: 초기 연결 대기 상태
  const [isInitializing, setIsInitializing] = useState(true);

  // Phase 22-H-fix: 초기 대기 시간 후 연결 상태 확인
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, INITIAL_CONNECTION_WAIT_MS);

    return () => clearTimeout(timer);
  }, []);

  // Phase 22-H-fix: 연결되면 즉시 초기화 상태 해제
  useEffect(() => {
    if (connectedWindows >= 2) {
      setIsInitializing(false);
    }
  }, [connectedWindows]);

  // Phase 22-F-6: 상대 창 연결 여부 (2개 이상이면 연결됨)
  const isOtherWindowConnected = connectedWindows >= 2;
  const otherWindowRole: WindowRole = isProblemWindow ? 'solution' : 'problem';
  const otherWindowName = isProblemWindow ? '해설 창' : '문제 창';

  // Phase 22-F-6: 재연결 핸들러
  const handleReconnect = () => {
    if (otherDocumentId) {
      const newWindow = openMatchingWindow(otherDocumentId, sessionId, otherWindowRole);
      if (!newWindow) {
        alert('팝업이 차단되었습니다. 팝업을 허용해주세요.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center justify-between px-4 py-2
        ${isProblemWindow ? 'bg-blue-600' : 'bg-green-600'}
        text-white shadow-md
      `}
    >
      {/* 왼쪽: 역할 표시 */}
      <div className="flex items-center gap-3">
        {isProblemWindow ? (
          <FileText className="w-5 h-5" />
        ) : (
          <BookOpen className="w-5 h-5" />
        )}
        <span className="font-semibold">
          {isProblemWindow ? '문제 창' : '해설 창'}
        </span>
        <span className="text-white/70 text-sm">|</span>
        <code className="text-sm bg-white/20 px-2 py-0.5 rounded">
          {sessionId}
        </code>
      </div>

      {/* 중앙: 상태 표시 */}
      <div className="flex items-center gap-4">
        {/* Phase 22-H-fix: 개선된 연결 상태 표시 (초기 대기 상태 포함) */}
        {isInitializing ? (
          // 초기 연결 대기 중
          <div className="flex items-center gap-1.5 text-sm bg-white/20 px-2 py-1 rounded">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{otherWindowName} 연결 중...</span>
          </div>
        ) : isOtherWindowConnected ? (
          // 연결됨
          <div className="flex items-center gap-1.5 text-sm bg-white/20 px-2 py-1 rounded">
            <CheckCircle className="w-4 h-4 text-green-300" />
            <span>{connectedWindows}개 창 연결됨</span>
          </div>
        ) : (
          // 연결 끊김
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm bg-orange-500 px-2 py-1 rounded">
              <AlertTriangle className="w-4 h-4" />
              <span>{otherWindowName} 연결 끊김</span>
            </div>
            {otherDocumentId && (
              <button
                onClick={handleReconnect}
                className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>재연결</span>
              </button>
            )}
          </div>
        )}

        {/* 구분선 */}
        <span className="text-white/30">|</span>

        {/* 대기 중인 문제 (해설 창에서만) */}
        {isSolutionWindow && pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm bg-orange-500 px-2 py-1 rounded">
            <Link2 className="w-4 h-4" />
            <span>
              대기중: <strong>{nextPendingNumber}번</strong>
              {pendingCount > 1 && ` 외 ${pendingCount - 1}개`}
            </span>
          </div>
        )}

        {/* 대기 중인 문제 없음 (해설 창에서만) */}
        {isSolutionWindow && pendingCount === 0 && (
          <div className="text-sm text-white/70">
            대기 중인 문제 없음
          </div>
        )}

        {/* 문제 창에서는 대기 수 표시 */}
        {isProblemWindow && pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm bg-white/20 px-2 py-1 rounded">
            <span>해설 대기: {pendingCount}개</span>
          </div>
        )}

        {/* 매칭 완료 수 */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">
            {matchedCount}
          </span>
          <span>매칭 완료</span>
        </div>
      </div>

      {/* 오른쪽: 종료 버튼 */}
      <button
        onClick={onEndSession}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm
                   bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
        <span>매칭 종료</span>
      </button>
    </motion.div>
  );
}
