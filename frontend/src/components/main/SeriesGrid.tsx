/**
 * SeriesGrid Component (Phase 34.5-H)
 *
 * 시리즈 선택 그리드
 */
import { motion } from 'framer-motion';
import { BookOpen, Check, AlertCircle } from 'lucide-react';
import type { SeriesInfo } from '../../lib/documentParser';

interface SeriesGridProps {
  grade: string;
  course: string;
  series: SeriesInfo[];
  onSelect: (series: SeriesInfo) => void;
}

export function SeriesGrid({ grade, course, series, onSelect }: SeriesGridProps) {
  if (series.length === 0) {
    return (
      <div className="text-center py-6 text-grey-400">
        <p>등록된 시리즈가 없습니다</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-xs font-medium text-grey-500 mb-2">
        시리즈 선택 ({series.length}개)
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {series.map((item, index) => {
          const isComplete = item.problemDocId && item.solutionDocId;

          return (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(item)}
              disabled={!isComplete}
              className={`
                p-3 rounded-lg text-left transition-all border
                ${isComplete
                  ? 'bg-white border-grey-200 hover:border-toss-blue hover:shadow-md cursor-pointer'
                  : 'bg-grey-50 border-grey-100 opacity-60 cursor-not-allowed'}
              `}
            >
              {/* 아이콘 + 이름 */}
              <div className="flex items-center gap-2">
                <BookOpen className={`w-4 h-4 ${isComplete ? 'text-toss-blue' : 'text-grey-300'}`} />
                <span className={`font-medium text-sm truncate ${isComplete ? 'text-grey-900' : 'text-grey-400'}`}>
                  {item.name}
                </span>
              </div>

              {/* 상태 */}
              <div className={`flex items-center gap-1 mt-2 text-xs ${isComplete ? 'text-green-600' : 'text-amber-500'}`}>
                {isComplete ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>문제+해설</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>
                      {item.problemDocId ? '해설 없음' : item.solutionDocId ? '문제 없음' : '파일 없음'}
                    </span>
                  </>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
