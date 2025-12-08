/**
 * 크로스 페이지 선택 훅
 *
 * Phase 62-C: PageViewer에서 분리
 * Phase 50-C: 크로스 페이지 그룹 생성 로직
 *
 * 페이지를 넘나드는 문제 그룹 생성 기능
 */
import { useState, useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { ProblemGroup, CrossPageSegment } from '../api/client';
import { api } from '../api/client';

// 크로스 페이지 선택 상태 타입
export interface CrossPageSelectionState {
  isActive: boolean;
  sourcePageIndex: number;
  sourceColumn: 'L' | 'R';
  sourceBlockIds: number[];
}

// 블록 데이터 타입
interface BlockData {
  block_id: number;
  column: 'L' | 'R';
  [key: string]: unknown;
}

interface BlocksData {
  blocks: BlockData[];
}

// 훅 파라미터
export interface UsePageViewerCrossPageParams {
  documentId: string;
  currentPage: number;
  totalPages: number;
  selectedBlocks: number[];
  localGroups: ProblemGroup[];
  blocksData: BlocksData | undefined;
  queryClient: QueryClient;
  saveGroupsMutation: {
    mutateAsync: (params: {
      documentId: string;
      pageIndex: number;
      groups: {
        document_id: string;
        page_index: number;
        groups: ProblemGroup[];
      };
    }) => Promise<unknown>;
  };

  // 상태 업데이트 함수
  setSelectedBlocks: React.Dispatch<React.SetStateAction<number[]>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;

  // 콜백
  onGroupCreated?: (group: ProblemGroup, pageIndex: number) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

// 훅 반환 타입
export interface UsePageViewerCrossPageReturn {
  crossPageSelection: CrossPageSelectionState;
  setCrossPageSelection: React.Dispatch<React.SetStateAction<CrossPageSelectionState>>;
  handleStartCrossPage: () => void;
  handleCreateCrossPageGroup: () => Promise<void>;
  handleCancelCrossPage: () => void;
}

// 초기 상태
const initialCrossPageSelection: CrossPageSelectionState = {
  isActive: false,
  sourcePageIndex: -1,
  sourceColumn: 'L',
  sourceBlockIds: [],
};

/**
 * 크로스 페이지 선택 및 그룹 생성 훅
 */
export function usePageViewerCrossPage({
  documentId,
  currentPage,
  totalPages,
  selectedBlocks,
  localGroups,
  blocksData,
  queryClient,
  saveGroupsMutation,
  setSelectedBlocks,
  setCurrentPage,
  onGroupCreated,
  showToast,
}: UsePageViewerCrossPageParams): UsePageViewerCrossPageReturn {
  const [crossPageSelection, setCrossPageSelection] = useState<CrossPageSelectionState>(
    initialCrossPageSelection
  );

  // Phase 50-C: 크로스 페이지 모드 시작
  const handleStartCrossPage = useCallback(() => {
    if (selectedBlocks.length === 0) {
      showToast('먼저 블록을 선택하세요', 'warning');
      return;
    }

    // 선택된 블록들의 컬럼 확인
    const currentBlocks = blocksData?.blocks || [];
    const selectedBlocksInfo = currentBlocks.filter((b) => selectedBlocks.includes(b.block_id));
    const columns = [...new Set(selectedBlocksInfo.map((b) => b.column))];

    // 크로스 페이지는 단일 컬럼에서만 시작 가능 (보통 R컬럼)
    if (columns.length > 1) {
      showToast('크로스 페이지는 한 컬럼에서만 시작할 수 있습니다', 'warning');
      return;
    }

    const sourceColumn = (columns[0] || 'R') as 'L' | 'R';

    // R컬럼에서만 크로스 페이지 시작 권장
    if (sourceColumn !== 'R') {
      showToast('크로스 페이지는 보통 오른쪽 컬럼(R)에서 시작합니다', 'info');
    }

    // 마지막 페이지인지 확인
    if (currentPage >= totalPages - 1) {
      showToast('마지막 페이지입니다. 다음 페이지가 없습니다.', 'warning');
      return;
    }

    // 크로스 페이지 선택 상태 저장
    setCrossPageSelection({
      isActive: true,
      sourcePageIndex: currentPage,
      sourceColumn: sourceColumn,
      sourceBlockIds: [...selectedBlocks],
    });

    // 다음 페이지로 이동
    setCurrentPage(currentPage + 1);
    showToast('다음 페이지에서 이어지는 블록을 선택하고 Enter를 누르세요', 'info');
  }, [selectedBlocks, blocksData, currentPage, totalPages, setCurrentPage, showToast]);

  // Phase 50-C: 크로스 페이지 그룹 생성
  const handleCreateCrossPageGroup = useCallback(async () => {
    if (!crossPageSelection.isActive) return;
    if (selectedBlocks.length === 0) {
      showToast('다음 페이지에서 이어지는 블록을 선택하세요', 'warning');
      return;
    }

    // 현재 페이지 블록 데이터
    const currentBlocks = blocksData?.blocks || [];
    const currentPageBlocks = currentBlocks.filter((b) => selectedBlocks.includes(b.block_id));
    const currentColumns = [...new Set(currentPageBlocks.map((b) => b.column))];

    // 다음 페이지는 L컬럼에서만 선택 가능
    if (currentColumns.length > 1 || currentColumns[0] !== 'L') {
      showToast('다음 페이지에서는 왼쪽 컬럼(L)만 선택 가능합니다', 'warning');
      return;
    }

    // 그룹 ID 생성 - XP 그룹용
    const sourcePageIndex = crossPageSelection.sourcePageIndex;
    const existingXPGroups = localGroups.filter((g) => g.column === 'XP');
    const maxXPNumber = existingXPGroups.reduce((max, g) => {
      const match = g.id.match(/(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[0], 10));
      }
      return max;
    }, 0);
    const newGroupId = `p${sourcePageIndex}_XP${maxXPNumber + 1}`;

    // crossPageSegments 구성
    const crossPageSegments: CrossPageSegment[] = [
      {
        page: crossPageSelection.sourcePageIndex,
        column: crossPageSelection.sourceColumn,
        block_ids: crossPageSelection.sourceBlockIds,
        order: 0,
      },
      {
        page: currentPage,
        column: 'L',
        block_ids: [...selectedBlocks],
        order: 1,
      },
    ];

    // 전체 블록 ID (첫 페이지 기준)
    const allBlockIds = crossPageSelection.sourceBlockIds;

    // 크로스 페이지 그룹 생성
    const newGroup: ProblemGroup = {
      id: newGroupId,
      block_ids: allBlockIds,
      column: 'XP', // 크로스 페이지 표시
      crossPageSegments,
      status: 'confirmed',
      exportedAt: new Date().toISOString(),
    };

    // 첫 페이지의 그룹 목록에 추가 (sourcePageIndex의 groups.json에 저장)
    try {
      const sourcePageGroups = await queryClient.fetchQuery({
        queryKey: ['groups', documentId, crossPageSelection.sourcePageIndex],
        queryFn: () => api.getPageGroups(documentId, crossPageSelection.sourcePageIndex),
      });

      const updatedSourceGroups = [...(sourcePageGroups?.groups || []), newGroup];

      // 첫 페이지에 저장
      await saveGroupsMutation.mutateAsync({
        documentId,
        pageIndex: crossPageSelection.sourcePageIndex,
        groups: {
          document_id: documentId,
          page_index: crossPageSelection.sourcePageIndex,
          groups: updatedSourceGroups,
        },
      });

      // 자동 내보내기
      await api.exportGroupWithData(
        documentId,
        crossPageSelection.sourcePageIndex,
        newGroupId,
        newGroup
      );

      // Phase 50-C Fix: workSessionStore에 그룹 등록 (문제은행 연결용)
      onGroupCreated?.(newGroup, crossPageSelection.sourcePageIndex);

      // 상태 초기화
      setCrossPageSelection(initialCrossPageSelection);
      setSelectedBlocks([]);

      // 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['groups', documentId, crossPageSelection.sourcePageIndex],
      });
      queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });

      showToast('크로스 페이지 문제가 생성되었습니다!', 'success');
      console.log(`[Phase 50-C] Cross-page group created: ${newGroupId}`);

      // 첫 페이지로 돌아가기
      setCurrentPage(crossPageSelection.sourcePageIndex);
    } catch (error) {
      console.error('[Phase 50-C] Cross-page group creation failed:', error);
      showToast('크로스 페이지 그룹 생성에 실패했습니다', 'error');
    }
  }, [
    crossPageSelection,
    selectedBlocks,
    blocksData,
    localGroups,
    currentPage,
    documentId,
    queryClient,
    saveGroupsMutation,
    setSelectedBlocks,
    setCurrentPage,
    onGroupCreated,
    showToast,
  ]);

  // Phase 50-C: 크로스 페이지 모드 취소
  const handleCancelCrossPage = useCallback(() => {
    if (!crossPageSelection.isActive) return;

    const sourcePageIndex = crossPageSelection.sourcePageIndex;

    setCrossPageSelection(initialCrossPageSelection);
    setSelectedBlocks([]);

    // 원래 페이지로 돌아가기
    setCurrentPage(sourcePageIndex);
    showToast('크로스 페이지 선택이 취소되었습니다', 'info');
  }, [crossPageSelection, setSelectedBlocks, setCurrentPage, showToast]);

  return {
    crossPageSelection,
    setCrossPageSelection,
    handleStartCrossPage,
    handleCreateCrossPageGroup,
    handleCancelCrossPage,
  };
}
