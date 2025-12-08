/**
 * PageViewer 사이드바 컴포넌트
 * Phase 61-A: PageViewer에서 분리
 *
 * - 현재 페이지 그룹 패널
 * - 저장된/방문한 페이지 목록
 */
import { ChevronRight, Circle } from 'lucide-react';
import { GroupPanel, type GroupPanelProps } from './GroupPanel';
import type { ProblemGroup, WorkSession } from '../api/client';

interface PageViewerSidebarProps {
  // 현재 페이지 정보
  bookPage?: number;
  currentPage: number;
  localGroups: ProblemGroup[];
  isPageChanging: boolean;

  // GroupPanel props
  groupPanelProps: Omit<GroupPanelProps, 'groups'>;

  // 페이지 목록
  displayPages: number[];
  sectionTitle: string;
  currentSession: WorkSession | null;

  // 핸들러
  onPageChange: (page: number) => void;
}

export function PageViewerSidebar({
  bookPage,
  currentPage,
  localGroups,
  isPageChanging,
  groupPanelProps,
  displayPages,
  sectionTitle,
  currentSession,
  onPageChange,
}: PageViewerSidebarProps) {
  const confirmedCount = localGroups.filter(g => g.status === 'confirmed').length;

  return (
    <div className="lg:col-span-1 space-y-2">
      {/* 현재 페이지 섹션 (항상 펼침) */}
      <div className="bg-white rounded-xl border border-toss-blue overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-toss-blue">
              {bookPage !== undefined ? `${bookPage}p` : `페이지 ${currentPage + 1}`}
            </span>
            <span className="text-xs text-toss-blue bg-blue-100 px-1.5 py-0.5 rounded">
              현재
            </span>
          </div>
          <span className="text-sm text-toss-blue">
            {confirmedCount}/{localGroups.length}
          </span>
        </div>
        <div className="p-2">
          <GroupPanel
            groups={localGroups}
            {...groupPanelProps}
          />
        </div>
      </div>

      {/* 저장된 페이지 또는 방문한 페이지 */}
      {displayPages.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-grey-500 px-2">{sectionTitle}</div>
          {displayPages.map(pageIdx => {
            // 세션 모드일 때 해당 페이지의 문제 수 계산
            const problemCount = currentSession
              ? currentSession.problems.filter(p => p.pageIndex === pageIdx).length
              : 0;

            return (
              <button
                key={pageIdx}
                onClick={() => onPageChange(pageIdx)}
                disabled={isPageChanging}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-grey-200 rounded-lg hover:border-grey-300 hover:bg-grey-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-grey-400" />
                  <span className="text-sm font-medium text-grey-700">
                    페이지 {pageIdx + 1}
                  </span>
                </div>
                {currentSession ? (
                  <span className="text-xs text-grey-500">{problemCount}문제</span>
                ) : (
                  <Circle className="w-4 h-4 text-grey-300" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
