/**
 * Phase 40: 아코디언 그룹 패널
 *
 * 페이지별로 그룹을 아코디언 형태로 표시
 * - 현재 페이지: 항상 펼침
 * - 방문한 페이지: 접힘 상태 (클릭 시 해당 페이지로 이동)
 */
import { useState, useMemo } from 'react';
import { Plus, Layers } from 'lucide-react';
import type { ProblemGroup } from '../../api/client';
import { PageSection } from './PageSection';
import { Button } from '../ui/Button';

interface PageGroupsData {
  pageIndex: number;
  bookPage?: number;
  groups: ProblemGroup[];
}

interface AccordionGroupPanelProps {
  // 현재 페이지 정보
  currentPage: number;
  currentBookPage?: number;
  currentGroups: ProblemGroup[];
  selectedBlocks: number[];

  // 방문한 페이지들의 그룹 데이터
  visitedPagesData: PageGroupsData[];

  // 그룹 관련 콜백
  onCreateGroup: () => void;
  onGroupSelect: (blockIds: number[]) => void;

  // 페이지 이동
  onPageChange: (pageIndex: number) => void;
}

export function AccordionGroupPanel({
  currentPage,
  currentBookPage,
  currentGroups,
  selectedBlocks,
  visitedPagesData,
  onCreateGroup,
  onGroupSelect,
  onPageChange,
}: AccordionGroupPanelProps) {
  // 현재 페이지 섹션은 항상 펼침
  const [expandedPage, setExpandedPage] = useState<number>(currentPage);

  // 현재 페이지가 바뀌면 펼침 상태 업데이트
  useMemo(() => {
    setExpandedPage(currentPage);
  }, [currentPage]);

  // 현재 페이지 데이터 구성
  const currentPageData: PageGroupsData = {
    pageIndex: currentPage,
    bookPage: currentBookPage,
    groups: currentGroups,
  };

  // 방문한 페이지들 (현재 페이지 제외, 정렬)
  const otherVisitedPages = useMemo(() => {
    return visitedPagesData
      .filter(p => p.pageIndex !== currentPage)
      .sort((a, b) => a.pageIndex - b.pageIndex);
  }, [visitedPagesData, currentPage]);

  // 전체 통계
  const totalGroups = useMemo(() => {
    const current = currentGroups.length;
    const others = otherVisitedPages.reduce((sum, p) => sum + p.groups.length, 0);
    return current + others;
  }, [currentGroups, otherVisitedPages]);

  const confirmedGroups = useMemo(() => {
    const current = currentGroups.filter(g => g.status === 'confirmed').length;
    const others = otherVisitedPages.reduce(
      (sum, p) => sum + p.groups.filter(g => g.status === 'confirmed').length,
      0
    );
    return current + others;
  }, [currentGroups, otherVisitedPages]);

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-grey-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-grey-100">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-toss-blue" />
          <span className="font-semibold text-grey-900">문제 그룹</span>
        </div>
        <span className="text-sm text-grey-500">
          {confirmedGroups}/{totalGroups}
        </span>
      </div>

      {/* Create Group Button */}
      <div className="px-4 py-3 border-b border-grey-100">
        <Button
          onClick={onCreateGroup}
          disabled={selectedBlocks.length === 0}
          variant={selectedBlocks.length > 0 ? 'solid' : 'ghost'}
          size="sm"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {selectedBlocks.length > 0
            ? `${selectedBlocks.length}개 블록으로 그룹 생성`
            : '블록을 선택하세요'}
        </Button>
      </div>

      {/* Accordion Pages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Current Page (Always First) */}
        <PageSection
          pageIndex={currentPageData.pageIndex}
          bookPage={currentPageData.bookPage}
          groups={currentPageData.groups}
          isCurrentPage={true}
          isExpanded={expandedPage === currentPage}
          onToggle={() => setExpandedPage(
            expandedPage === currentPage ? -1 : currentPage
          )}
          onGroupClick={(group) => onGroupSelect(group.block_ids)}
          onPageClick={() => {}}
        />

        {/* Other Visited Pages */}
        {otherVisitedPages.length > 0 && (
          <>
            <div className="text-xs text-grey-400 px-1 pt-2">
              방문한 페이지
            </div>
            {otherVisitedPages.map((pageData) => (
              <PageSection
                key={pageData.pageIndex}
                pageIndex={pageData.pageIndex}
                bookPage={pageData.bookPage}
                groups={pageData.groups}
                isCurrentPage={false}
                isExpanded={false}
                onToggle={() => {}}
                onGroupClick={() => onPageChange(pageData.pageIndex)}
                onPageClick={() => onPageChange(pageData.pageIndex)}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer Stats */}
      {totalGroups > 0 && (
        <div className="px-4 py-3 border-t border-grey-100 bg-grey-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-grey-600">전체 진행률</span>
            <span className="font-medium text-grey-900">
              {Math.round((confirmedGroups / totalGroups) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-grey-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${(confirmedGroups / totalGroups) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
