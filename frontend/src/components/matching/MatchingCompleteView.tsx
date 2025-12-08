/**
 * Phase 38-8: 매칭 완료 화면
 *
 * 모든 문제 매칭 완료 시 축하 화면
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, CheckCircle2, ArrowLeft, Eye, AlertTriangle } from 'lucide-react';
import { useSessionProgress, useUnlinkedProblems } from '@/stores/workSessionStore';

interface MatchingCompleteViewProps {
  /** 검토 버튼 클릭 */
  onReview?: () => void;
  /** 완료 버튼 클릭 */
  onComplete?: () => void;
  /** 계속 작업 버튼 클릭 */
  onContinue?: () => void;
  /** 세션 이름 */
  sessionName?: string;
}

export const MatchingCompleteView = memo(function MatchingCompleteView({
  onReview,
  onComplete,
  onContinue,
  sessionName,
}: MatchingCompleteViewProps) {
  const progress = useSessionProgress();
  const unlinkedProblems = useUnlinkedProblems();

  const isComplete = unlinkedProblems.length === 0 && progress.total > 0;

  if (!isComplete && unlinkedProblems.length > 0) {
    // 미완료 경고 화면
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-8 max-w-md mx-auto"
      >
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
          <AlertTriangle className="w-10 h-10 text-yellow-500" />
        </div>

        <h2 className="text-2xl font-bold text-grey-900 mb-2 text-center">
          아직 연결되지 않은 문제가 있어요
        </h2>

        <p className="text-grey-500 text-center mb-6">
          {unlinkedProblems.length}개의 문제가 아직 해설과 연결되지 않았습니다
        </p>

        {/* 미연결 문제 목록 */}
        <div className="w-full bg-yellow-50 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-yellow-700 mb-2">미연결 문제:</p>
          <div className="flex flex-wrap gap-2">
            {unlinkedProblems.slice(0, 10).map((problem) => (
              <span
                key={problem.groupId}
                className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-lg"
              >
                {problem.problemNumber}번
              </span>
            ))}
            {unlinkedProblems.length > 10 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-sm rounded-lg">
                +{unlinkedProblems.length - 10}개
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onContinue}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-toss-blue text-white rounded-xl font-medium hover:bg-toss-blue/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            계속 작업
          </button>
          <button
            onClick={onComplete}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-grey-100 text-grey-700 rounded-xl font-medium hover:bg-grey-200 transition-colors"
          >
            미연결로 완료
          </button>
        </div>
      </motion.div>
    );
  }

  // 완료 축하 화면
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-8 max-w-md mx-auto"
    >
      {/* 축하 아이콘 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-toss-blue flex items-center justify-center mb-6 shadow-lg"
      >
        <PartyPopper className="w-12 h-12 text-white" />
      </motion.div>

      {/* 메시지 */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-grey-900 mb-2 text-center"
      >
        매칭 작업이 완료되었어요!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-grey-500 text-center mb-8"
      >
        {sessionName && <span className="font-medium">{sessionName}</span>}
        {sessionName ? '의 ' : ''}
        모든 문제가 해설과 연결되었습니다
      </motion.p>

      {/* 통계 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full bg-grey-50 rounded-2xl p-6 mb-8"
      >
        <div className="flex justify-around">
          <div className="text-center">
            <p className="text-3xl font-bold text-toss-blue">{progress.total}</p>
            <p className="text-sm text-grey-500 mt-1">문제</p>
          </div>
          <div className="w-px bg-grey-200" />
          <div className="text-center">
            <p className="text-3xl font-bold text-green-500">{progress.linked}</p>
            <p className="text-sm text-grey-500 mt-1">연결됨</p>
          </div>
          <div className="w-px bg-grey-200" />
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-500">100%</p>
            <p className="text-sm text-grey-500 mt-1">완료율</p>
          </div>
        </div>
      </motion.div>

      {/* 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 w-full"
      >
        {onReview && (
          <button
            onClick={onReview}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-grey-100 text-grey-700 rounded-xl font-medium hover:bg-grey-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            검토하기
          </button>
        )}
        <button
          onClick={onComplete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-toss-blue text-white rounded-xl font-medium hover:bg-toss-blue/90 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          완료
        </button>
      </motion.div>
    </motion.div>
  );
});

export default MatchingCompleteView;
