/**
 * SessionCard Component (Phase 34-B → Phase 34-E)
 *
 * 진행 중인 세션 카드
 * - 세션 정보 표시
 * - 진행률 바
 * - 재개 버튼
 * - Phase 34-E: 삭제 버튼 추가
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, Clock, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { WorkSession } from '../../stores/workSessionStore';

interface SessionCardProps {
  session: WorkSession;
  onResume: () => void;
  onDelete?: () => void;  // Phase 34-E: 삭제 핸들러
}

export function SessionCard({ session, onResume, onDelete }: SessionCardProps) {
  // Phase 34-E: 삭제 확인 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 진행률 계산: 연결된 문제 / 전체 문제
  const totalProblems = session.problems.length;
  const linkedProblems = session.links.length;
  const progress = totalProblems > 0 ? Math.round((linkedProblems / totalProblems) * 100) : 0;

  // 세션 이름 결정
  const displayName = session.name || session.problemDocumentId.replace('.pdf', '');

  // 마지막 수정 시간
  const lastModified = new Date(session.updatedAt);
  const timeAgo = getTimeAgo(lastModified);

  // Phase 34-E: 삭제 처리
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete?.();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // 3초 후 자동으로 취소
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="bg-white rounded-xl border border-grey-200 p-4 hover:shadow-md hover:border-grey-300 transition-all cursor-pointer"
      onClick={onResume}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div className="p-2.5 bg-gradient-to-br from-toss-blue/10 to-purple-500/10 rounded-lg flex-shrink-0">
            <FileText className="w-5 h-5 text-toss-blue" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-grey-900 truncate">{displayName}</h4>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-grey-500">
                {totalProblems}개 문제 · {linkedProblems}개 연결됨
              </span>
              <span className="flex items-center gap-1 text-xs text-grey-400">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Phase 34-E: Delete Button */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`p-2 rounded-lg transition-colors ${
                showDeleteConfirm
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'text-grey-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={showDeleteConfirm ? '다시 클릭하여 삭제' : '세션 삭제'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Resume Button */}
          <Button
            variant="solid"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onResume();
            }}
          >
            재개
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalProblems > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-grey-500 mb-1">
            <span>진행률</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-grey-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-toss-blue to-purple-500 rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * 상대 시간 계산
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
