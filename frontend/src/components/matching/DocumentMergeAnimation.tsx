/**
 * Phase 27-D: 문서 머지 애니메이션
 *
 * 두 문서가 하나로 합쳐지는 애니메이션 효과
 * Framer Motion을 사용한 고급 애니메이션
 */
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, BookOpen, Link2, Check } from 'lucide-react';

interface DocumentMergeAnimationProps {
  isVisible: boolean;
  problemDocName: string;
  solutionDocName: string;
  onComplete?: () => void;
}

export function DocumentMergeAnimation({
  isVisible,
  problemDocName,
  solutionDocName,
  onComplete
}: DocumentMergeAnimationProps) {
  // 파일명 정리
  const cleanName = (name: string) => {
    const cleaned = name.replace(/\.pdf$/i, '').replace(/\.hwp$/i, '').replace(/\.hwpx$/i, '');
    return cleaned.length > 15 ? cleaned.slice(0, 15) + '...' : cleaned;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div className="relative w-96">
            {/* 문제집 카드 - 왼쪽에서 슬라이드 */}
            <motion.div
              initial={{ x: -150, opacity: 0, scale: 0.8 }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
                transition: { duration: 0.5, ease: 'easeOut' }
              }}
              exit={{
                x: -50,
                opacity: 0,
                scale: 0.5,
                transition: { duration: 0.3 }
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-40"
            >
              <motion.div
                animate={{
                  x: [0, 60],
                  scale: [1, 0.9],
                  opacity: [1, 0]
                }}
                transition={{ delay: 1, duration: 0.5 }}
                className="bg-blue-100 rounded-xl p-4 shadow-lg border-2 border-blue-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-600">문제집</span>
                </div>
                <p className="text-sm font-semibold text-grey-900 truncate">
                  {cleanName(problemDocName)}
                </p>
              </motion.div>
            </motion.div>

            {/* 해설집 카드 - 오른쪽에서 슬라이드 */}
            <motion.div
              initial={{ x: 150, opacity: 0, scale: 0.8 }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
                transition: { duration: 0.5, ease: 'easeOut' }
              }}
              exit={{
                x: 50,
                opacity: 0,
                scale: 0.5,
                transition: { duration: 0.3 }
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-40"
            >
              <motion.div
                animate={{
                  x: [0, -60],
                  scale: [1, 0.9],
                  opacity: [1, 0]
                }}
                transition={{ delay: 1, duration: 0.5 }}
                className="bg-green-100 rounded-xl p-4 shadow-lg border-2 border-green-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-green-600">해설집</span>
                </div>
                <p className="text-sm font-semibold text-grey-900 truncate">
                  {cleanName(solutionDocName)}
                </p>
              </motion.div>
            </motion.div>

            {/* 연결 링크 아이콘 */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: 1,
                rotate: 0,
                transition: { delay: 0.3, duration: 0.5, type: 'spring' }
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-xl"
              >
                <Link2 className="w-8 h-8 text-white" />
              </motion.div>
            </motion.div>

            {/* 합쳐진 카드 - 가운데에서 확대 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                transition: { delay: 1.5, duration: 0.5, type: 'spring' }
              }}
              onAnimationComplete={onComplete}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(147, 51, 234, 0)',
                    '0 0 0 20px rgba(147, 51, 234, 0.1)',
                    '0 0 0 40px rgba(147, 51, 234, 0)'
                  ]
                }}
                transition={{ delay: 2, duration: 1 }}
                className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 shadow-2xl border-2 border-purple-200"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 2, type: 'spring' }}
                    className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                </div>
                <p className="text-center text-lg font-bold text-grey-900 mb-1">
                  연결 완료!
                </p>
                <p className="text-center text-sm text-grey-600">
                  문제-해설 페어가 생성되었습니다
                </p>

                {/* 연결된 문서들 */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-grey-700 truncate flex-1">
                      {cleanName(problemDocName)}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">문제</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-grey-700 truncate flex-1">
                      {cleanName(solutionDocName)}
                    </span>
                    <span className="text-xs text-green-600 font-medium">해설</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
