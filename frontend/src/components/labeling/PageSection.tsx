/**
 * Phase 40: 페이지 섹션 (아코디언 아이템)
 *
 * 페이지별 그룹을 펼침/접힘으로 표시
 */
import { ChevronDown, ChevronRight, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProblemGroup } from '../../api/client';

interface PageSectionProps {
  pageIndex: number;
  bookPage?: number;
  groups: ProblemGroup[];
  isCurrentPage: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onGroupClick: (group: ProblemGroup) => void;
  onPageClick: () => void;
}

export function PageSection({
  pageIndex,
  bookPage,
  groups,
  isCurrentPage,
  isExpanded,
  onToggle,
  onGroupClick,
  onPageClick,
}: PageSectionProps) {
  const confirmedCount = groups.filter(g => g.status === 'confirmed').length;
  const isAllConfirmed = groups.length > 0 && confirmedCount === groups.length;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${
      isCurrentPage
        ? 'border-toss-blue bg-blue-50/50'
        : 'border-grey-200 hover:border-grey-300'
    }`}>
      {/* Header */}
      <button
        onClick={isCurrentPage ? onToggle : onPageClick}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
          isCurrentPage
            ? 'bg-blue-50 hover:bg-blue-100'
            : 'bg-white hover:bg-grey-50'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Icon */}
          {isCurrentPage && (
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-4 h-4 text-grey-500" />
            </motion.div>
          )}
          {!isCurrentPage && (
            <ChevronRight className="w-4 h-4 text-grey-400" />
          )}

          {/* Page Info */}
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isCurrentPage ? 'text-toss-blue' : 'text-grey-700'}`}>
              {bookPage !== undefined ? `${bookPage}p` : `페이지 ${pageIndex + 1}`}
            </span>
            {isCurrentPage && (
              <span className="text-xs text-toss-blue bg-blue-100 px-1.5 py-0.5 rounded">
                현재
              </span>
            )}
          </div>
        </div>

        {/* Right: Group Status */}
        <div className="flex items-center gap-2">
          {groups.length > 0 ? (
            <>
              {isAllConfirmed ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-grey-300" />
              )}
              <span className={`text-sm ${isAllConfirmed ? 'text-green-600' : 'text-grey-500'}`}>
                {confirmedCount}/{groups.length}
              </span>
            </>
          ) : (
            <span className="text-sm text-grey-400">-</span>
          )}
        </div>
      </button>

      {/* Content (Groups) */}
      <AnimatePresence>
        {isExpanded && groups.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 space-y-1.5 bg-white border-t border-grey-100">
              {groups.map((group, idx) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  index={idx}
                  onClick={() => onGroupClick(group)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 그룹 아이템 (간소화)
interface GroupItemProps {
  group: ProblemGroup;
  index: number;
  onClick: () => void;
}

function GroupItem({ group, index, onClick }: GroupItemProps) {
  const isConfirmed = group.status === 'confirmed';
  const displayName = group.problemInfo?.problemNumber
    ? `${group.problemInfo.problemNumber}번`
    : `그룹 ${index + 1}`;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
        isConfirmed
          ? 'bg-green-50 hover:bg-green-100'
          : 'bg-grey-50 hover:bg-grey-100'
      }`}
    >
      <div className="flex items-center gap-2">
        {isConfirmed ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Circle className="w-3.5 h-3.5 text-grey-300" />
        )}
        <span className={`text-sm ${isConfirmed ? 'text-green-700' : 'text-grey-700'}`}>
          {displayName}
        </span>
      </div>
      <span className="text-xs text-grey-400">
        {group.block_ids.length}블록
      </span>
    </button>
  );
}
