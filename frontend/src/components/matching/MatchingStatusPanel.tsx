/**
 * 매칭 상태 패널
 *
 * Phase 22-D: 문제-해설 매칭 시스템
 *
 * 대기 중인 문제와 매칭 완료 목록을 표시하는 플로팅 패널
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check, X, Link2, AlertCircle } from 'lucide-react';
import type { WindowRole, PendingProblem, ProblemSolutionMatch } from '@/types/matching';

interface MatchingStatusPanelProps {
  /** 창 역할 */
  role: WindowRole;
  /** 대기 중인 문제 목록 */
  pendingProblems: PendingProblem[];
  /** 매칭된 쌍 목록 */
  matchedPairs: ProblemSolutionMatch[];
  /** 매칭 취소 콜백 */
  onCancelMatch: (matchId: string) => void;
}

export function MatchingStatusPanel({
  role,
  pendingProblems,
  matchedPairs,
  onCancelMatch
}: MatchingStatusPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isProblemWindow = role === 'problem';
  const isSolutionWindow = role === 'solution';

  // 전체 진행률 계산 (예: 목표 20개 기준)
  const targetCount = 20;
  const progressPercent = Math.min(100, (matchedPairs.length / targetCount) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 w-80 bg-white rounded-xl shadow-xl
                 border border-grey-200 overflow-hidden z-40"
    >
      {/* 헤더 (접기/펼치기) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between
                   ${isProblemWindow ? 'bg-blue-600' : 'bg-green-600'} text-white`}
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          <span className="font-semibold">매칭 현황</span>
          <span className="bg-white/20 px-2 py-0.5 rounded text-sm">
            {matchedPairs.length}개
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronUp className="w-5 h-5" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* 대기 중인 문제 (해설 창에서만) */}
            {isSolutionWindow && pendingProblems.length > 0 && (
              <div className="p-3 bg-orange-50 border-b border-orange-100">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>대기 중인 문제</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {pendingProblems.map((p, idx) => (
                    <span
                      key={p.groupId}
                      className={`px-2 py-1 rounded text-sm font-mono
                        ${idx === 0
                          ? 'bg-orange-500 text-white font-bold'
                          : 'bg-orange-200 text-orange-800'
                        }`}
                    >
                      {p.problemNumber}번
                      {idx === 0 && ' (다음)'}
                    </span>
                  ))}
                </div>
                {pendingProblems.length > 0 && (
                  <p className="text-xs text-orange-600 mt-2">
                    해설을 라벨링하면 <strong>{pendingProblems[0].problemNumber}번</strong>과 매칭됩니다
                  </p>
                )}
              </div>
            )}

            {/* 대기 중인 문제 없음 안내 (해설 창에서만) */}
            {isSolutionWindow && pendingProblems.length === 0 && (
              <div className="p-3 bg-grey-50 border-b text-center">
                <p className="text-sm text-grey-500">
                  대기 중인 문제가 없습니다
                </p>
                <p className="text-xs text-grey-400 mt-1">
                  문제 창에서 먼저 라벨링하세요
                </p>
              </div>
            )}

            {/* 문제 창에서 대기 수 표시 */}
            {isProblemWindow && pendingProblems.length > 0 && (
              <div className="p-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <span>해설 대기 중: {pendingProblems.length}개</span>
                </div>
                <div className="flex gap-1 flex-wrap mt-2">
                  {pendingProblems.slice(0, 10).map(p => (
                    <span
                      key={p.groupId}
                      className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-mono"
                    >
                      {p.problemNumber}
                    </span>
                  ))}
                  {pendingProblems.length > 10 && (
                    <span className="text-xs text-blue-600">
                      +{pendingProblems.length - 10}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 매칭 완료 목록 */}
            <div className="p-3 max-h-48 overflow-y-auto">
              <div className="text-sm font-medium text-grey-600 mb-2">
                매칭 완료
              </div>
              {matchedPairs.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-grey-300 text-3xl mb-2">
                    <Link2 className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-sm text-grey-400">
                    아직 매칭된 항목이 없습니다
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {matchedPairs.slice().reverse().map(pair => (
                    <div
                      key={pair.matchId}
                      className="flex items-center justify-between p-2
                                 bg-green-50 hover:bg-green-100 rounded-lg
                                 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 font-medium">
                          {pair.problem.problemNumber}번
                        </span>
                        <span className="text-xs text-green-500">
                          문제-해설
                        </span>
                      </div>
                      <button
                        onClick={() => onCancelMatch(pair.matchId)}
                        className="opacity-0 group-hover:opacity-100
                                   p-1 text-grey-400 hover:text-red-500
                                   hover:bg-red-50 rounded transition-all"
                        title="매칭 취소"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 진행률 바 */}
            <div className="px-3 py-2 bg-grey-50 border-t">
              <div className="flex justify-between text-xs text-grey-500 mb-1">
                <span>진행률</span>
                <span>{matchedPairs.length} / {targetCount}</span>
              </div>
              <div className="h-2 bg-grey-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-green-400 to-green-600"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
