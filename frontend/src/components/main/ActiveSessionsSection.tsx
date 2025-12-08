/**
 * ActiveSessionsSection Component (Phase 34-B → Phase 34-E)
 *
 * 진행 중인 작업 세션 목록
 * - 세션이 있을 때만 표시
 * - SessionCard 사용
 * - Phase 34-E: 세션 삭제 기능 추가
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWorkSessionStore } from '../../stores/workSessionStore';
import { SessionCard } from './SessionCard';

export function ActiveSessionsSection() {
  const navigate = useNavigate();
  // Phase 34-E: deleteSession 추가
  const { sessions, sessionsLoading, fetchSessions, deleteSession } = useWorkSessionStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 활성 세션만 필터링
  const activeSessions = sessions.filter((s) => s.status === 'active');

  // 로딩 중
  if (sessionsLoading) {
    return (
      <section className="mb-8">
        <div className="h-24 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-grey-200 border-t-toss-blue rounded-full" />
        </div>
      </section>
    );
  }

  // 세션 없으면 숨김
  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-grey-500">
          진행 중인 작업
          <span className="ml-1.5 px-2 py-0.5 bg-toss-blue/10 text-toss-blue text-xs rounded-full">
            {activeSessions.length}
          </span>
        </h3>
      </div>

      {/* Session Cards */}
      <div className="space-y-2">
        {activeSessions.map((session, index) => (
          <motion.div
            key={session.sessionId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <SessionCard
              session={session}
              onResume={() => navigate(`/work/${session.sessionId}`)}
              onDelete={() => deleteSession(session.sessionId)}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
