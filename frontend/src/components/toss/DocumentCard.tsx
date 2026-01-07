/**
 * Phase 65-A: 문서(교재) 카드
 *
 * 교재별 목록에서 사용하는 카드
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Book, LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    problemCount?: number;
    linkedCount?: number;
    pageRange?: string;
  };
  basePath?: string;
}

export function DocumentCard({ document, basePath = '/problems/book' }: DocumentCardProps) {
  const navigate = useNavigate();

  const linkedPercent = document.problemCount && document.linkedCount
    ? Math.round((document.linkedCount / document.problemCount) * 100)
    : 0;

  return (
    <motion.button
      onClick={() => navigate(`${basePath}/${document.id}`)}
      className="w-full bg-white rounded-2xl p-4 text-left hover:bg-grey-50 transition-colors shadow-sm"
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-toss-blue/10 rounded-xl">
            <Book className="w-5 h-5 text-toss-blue" />
          </div>
          <div>
            <p className="font-semibold text-grey-900">{document.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-grey-500">
                {document.problemCount?.toLocaleString() || 0}개 문제
              </span>
              {linkedPercent > 0 && (
                <>
                  <span className="text-grey-300">·</span>
                  <span className="flex items-center gap-1 text-sm text-toss-blue">
                    <LinkIcon className="w-3 h-3" />
                    {linkedPercent}% 해설
                  </span>
                </>
              )}
            </div>
            {document.pageRange && (
              <p className="text-xs text-grey-400 mt-0.5">{document.pageRange}</p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-grey-400" />
      </div>
    </motion.button>
  );
}
