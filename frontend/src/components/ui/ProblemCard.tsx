/**
 * Problem Card Component (Phase 6-5)
 *
 * Card for displaying extracted problem images with metadata
 */
import { Eye, Download, Trash2, Tag, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from './Badge';
import { LazyImage } from './LazyImage';
import { cn } from '../../lib/utils';

interface ProblemCardProps {
  problem: {
    problem_id: string;
    document_id: string;
    page_index: number;
    group_id: string;
    image_path: string;
    created_at?: number;
  };
  imageUrl: string;
  onView?: (problem: any) => void;
  onDelete?: (problemId: string) => void;
}

export function ProblemCard({ problem, imageUrl, onView, onDelete }: ProblemCardProps) {
  const handleView = () => {
    if (onView) {
      onView(problem);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`문제 '${problem.problem_id}'를 삭제하시겠습니까?`)) {
      onDelete(problem.problem_id);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open image in new tab for download
    window.open(imageUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={handleView}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300',
        'hover:shadow-lg hover:border-blue-300 cursor-pointer'
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] bg-grey-100 overflow-hidden">
        <LazyImage
          src={imageUrl}
          alt={problem.problem_id}
          className="w-full h-full object-contain"
          rootMargin="100px"
          threshold={0.01}
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
            <button
              onClick={handleView}
              className="flex-1 px-3 py-2 bg-white/90 backdrop-blur-sm text-grey-900 rounded-lg text-sm font-medium hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              보기
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-white/90 backdrop-blur-sm text-grey-900 rounded-lg hover:bg-white transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 bg-red-500/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4">
        {/* Problem ID & Group */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-grey-900 truncate" title={problem.problem_id}>
              {problem.problem_id}
            </h3>
            <p className="text-xs text-grey-500 mt-1">그룹: {problem.group_id}</p>
          </div>
          <Badge variant="primary" className="flex-shrink-0">
            P{problem.page_index + 1}
          </Badge>
        </div>

        {/* Document Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-grey-600">
            <Tag className="w-3 h-3" />
            <span className="truncate" title={problem.document_id}>
              {problem.document_id}
            </span>
          </div>
        </div>
      </div>

      {/* Gradient Border on Hover */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ padding: '2px', clipPath: 'inset(0 round 0.75rem)' }}>
        <div className="w-full h-full bg-white rounded-xl" />
      </div>
    </motion.div>
  );
}
