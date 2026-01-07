/**
 * Phase 65-A + 67-D: 토스 스타일 문제 카드
 *
 * 미니멀한 문제 썸네일 카드
 * compact 모드: PC용 정사각형 카드 (하단 오버레이 텍스트)
 * - 67-D: object-contain으로 변경 (세로 긴 문제 이미지 전체 표시)
 */
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2 } from 'lucide-react';

interface TossProblemCardProps {
  problem: {
    id: string;
    thumbnail?: string;
    displayName?: string;
    problemNumber?: string;
    page?: number;
    hasLinkedSolution?: boolean;
    isConfirmed?: boolean;
  };
  onTap?: () => void;
  selected?: boolean;
  /** PC용 컴팩트 모드 - 정사각형 + 하단 오버레이 텍스트 */
  compact?: boolean;
}

export function TossProblemCard({ problem, onTap, selected, compact }: TossProblemCardProps) {
  const displayNumber = problem.problemNumber || problem.displayName || '문제';

  // compact 모드: 정사각형 카드 + 하단 오버레이
  // Phase 67-D: object-contain으로 변경 (세로 긴 이미지 전체 표시)
  if (compact) {
    return (
      <motion.button
        onClick={onTap}
        className={`relative w-full aspect-square rounded-xl overflow-hidden bg-white ${
          selected ? 'ring-2 ring-toss-blue ring-offset-1' : ''
        }`}
        whileTap={{ scale: 0.98 }}
      >
        {/* 썸네일 컨테이너 - object-contain으로 전체 이미지 표시 */}
        <div className="absolute inset-0 bg-grey-50 flex items-center justify-center p-1">
          {problem.thumbnail ? (
            <img
              src={problem.thumbnail}
              alt={displayNumber}
              className="max-w-full max-h-full object-contain rounded"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl text-grey-300">#</span>
          )}
        </div>

        {/* 상태 뱃지들 - 우상단 */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
          {problem.hasLinkedSolution && (
            <span className="w-5 h-5 bg-purple-500 rounded-full shadow-sm flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </span>
          )}
          {problem.isConfirmed && (
            <span className="w-5 h-5 bg-green-500 rounded-full shadow-sm flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </span>
          )}
        </div>

        {/* 정보 - 하단 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5
                        bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10">
          <p className="text-white text-xs font-semibold truncate">
            {displayNumber}번
          </p>
          {problem.page && (
            <p className="text-white/70 text-[10px] truncate">
              {problem.page}p
            </p>
          )}
        </div>
      </motion.button>
    );
  }

  // 기본 모드: 기존 스타일 (썸네일 + 아래 텍스트)
  return (
    <motion.button
      onClick={onTap}
      className={`bg-white rounded-2xl shadow-sm text-left w-full transition-all p-3 ${
        selected ? 'ring-2 ring-toss-blue shadow-md' : 'hover:shadow-md'
      }`}
      whileTap={{ scale: 0.98 }}
    >
      {/* 썸네일 */}
      <div className="aspect-[4/3] bg-grey-100 rounded-xl overflow-hidden mb-2 relative">
        {problem.thumbnail ? (
          <img
            src={problem.thumbnail}
            alt={displayNumber}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-grey-300">
            <span className="text-2xl">#</span>
          </div>
        )}

        {/* 상태 뱃지들 */}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {problem.hasLinkedSolution && (
            <span className="w-6 h-6 bg-purple-500 rounded-full shadow-sm flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </span>
          )}
          {problem.isConfirmed && (
            <span className="w-6 h-6 bg-green-500 rounded-full shadow-sm flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </span>
          )}
        </div>
      </div>

      {/* 정보 */}
      <p className="font-semibold text-grey-900 truncate text-sm">
        {displayNumber}번
      </p>
      {problem.page && (
        <p className="text-grey-500 truncate text-xs">
          {problem.page}p
        </p>
      )}
    </motion.button>
  );
}

/**
 * 미니 버전 - 최근 문제 등에 사용
 */
export function MiniProblemCard({ problem, onTap }: TossProblemCardProps) {
  return (
    <motion.button
      onClick={onTap}
      className="flex-shrink-0 w-28"
      whileTap={{ scale: 0.98 }}
    >
      <div className="aspect-[4/3] bg-grey-100 rounded-xl overflow-hidden mb-1.5">
        {problem.thumbnail ? (
          <img
            src={problem.thumbnail}
            alt={problem.displayName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-grey-300">
            <span className="text-lg">#</span>
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-grey-700 truncate">
        {problem.problemNumber || problem.displayName}번
      </p>
    </motion.button>
  );
}
