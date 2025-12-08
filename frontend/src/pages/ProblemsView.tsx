/**
 * 내보낸 문제 목록 뷰 (Phase 4)
 *
 * Phase 21+ C-1: 문제은행 가져오기 기능 추가
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { api, type ExportedProblem } from '../api/client';
import { useToast } from '../components/Toast';
import { ImportFromLabelingModal } from '../components/problemBank';
import { useImportFromLabeling, type ImportFromLabelingParams } from '../api/problems';

interface ProblemsViewProps {
  documentId: string;
  documentName?: string;
}

export function ProblemsView({ documentId, documentName }: ProblemsViewProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Phase 21+ C-1: 문제은행 가져오기 모달
  const [showImportModal, setShowImportModal] = useState(false);
  const importFromLabeling = useImportFromLabeling();

  // Phase 62-A: 타입 어노테이션 추가
  const { data: problems, isLoading, error } = useQuery<ExportedProblem[]>({
    queryKey: ['exported-problems', documentId],
    queryFn: () => api.getExportedProblems(documentId) as Promise<ExportedProblem[]>,
  });

  const handleDeleteProblem = async (
    pageIndex: number,
    groupId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!confirm(`문제 ${groupId}를 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(groupId);
    try {
      await api.deleteProblem(documentId, pageIndex, groupId);
      showToast('문제가 삭제되었습니다', 'success');

      // 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['exported-problems', documentId] });
    } catch (error) {
      console.error('문제 삭제 실패:', error);
      showToast('문제 삭제에 실패했습니다', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Phase 21+ C-1: 문제은행에 가져오기
  const handleImportToProblemBank = useCallback((params: {
    selectedProblems: Array<{
      group_id: string;
      page_index: number;
      image_path: string;
      column?: string;
    }>;
    classification?: any;
    difficulty: number;
    questionType: 'multiple_choice' | 'short_answer' | 'essay';
    sourceName: string;
    sourceType: 'book' | 'exam' | 'custom';
  }) => {
    const importParams: ImportFromLabelingParams = {
      documentId,
      documentName: params.sourceName || documentName || documentId,
      problems: params.selectedProblems,
      defaultSource: {
        type: params.sourceType,
        name: params.sourceName,
      },
      classification: params.classification,
      difficulty: params.difficulty,
      questionType: params.questionType,
    };

    importFromLabeling.mutate(importParams, {
      onSuccess: (imported) => {
        showToast(`${imported.length}개 문제가 문제은행에 등록되었습니다!`, 'success');
        setShowImportModal(false);
      },
      onError: (error) => {
        showToast(`가져오기 실패: ${error.message}`, 'error');
      },
    });
  }, [documentId, documentName, importFromLabeling, showToast]);

  const handleExportAll = async () => {
    if (!confirm('모든 페이지의 그룹을 이미지로 내보내시겠습니까?')) {
      return;
    }

    setIsExporting(true);
    try {
      const result = await api.exportAllProblems(documentId);
      showToast(
        `${result.exported_pages}개 페이지, 총 ${result.total_problems}개의 문제가 내보내졌습니다!`,
        'success'
      );

      // 목록 새로고침
      queryClient.invalidateQueries({ queryKey: ['exported-problems', documentId] });
    } catch (error) {
      console.error('일괄 내보내기 실패:', error);
      showToast('일괄 내보내기에 실패했습니다', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-grey-500">문제 목록 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">
          문제 목록 로딩 실패: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (!problems || problems.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <div className="text-grey-500 mb-4">
            아직 내보낸 문제가 없습니다
          </div>
          <div className="text-sm text-grey-400">
            라벨링 모드에서 그룹을 생성하고 "현재 페이지 내보내기"를 클릭하세요
          </div>
        </div>
      </div>
    );
  }

  // 페이지별로 그룹화
  // Phase 62-A: 타입 어노테이션 수정
  const problemsByPage = problems.reduce<Record<number, ExportedProblem[]>>((acc, problem) => {
    const pageIndex = problem.page_index;
    if (!acc[pageIndex]) {
      acc[pageIndex] = [];
    }
    acc[pageIndex].push(problem);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* 액션 버튼들 */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleExportAll}
          disabled={isExporting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? '내보내는 중...' : '📦 모든 페이지 일괄 내보내기'}
        </button>
        {/* Phase 21+ C-1: 문제은행에 가져오기 버튼 */}
        <button
          onClick={() => setShowImportModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          📚 문제은행에 등록
        </button>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">내보낸 문제 목록</h2>
          <span className="text-sm text-grey-600">
            총 {problems.length}개 문제
          </span>
        </div>

        <div className="space-y-6">
          {Object.entries(problemsByPage)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([pageIndex, pageProblems]) => (
              <div key={pageIndex} className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">
                  페이지 {parseInt(pageIndex) + 1}
                  <span className="ml-2 text-sm text-grey-500">
                    ({pageProblems.length}개 문제)
                  </span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pageProblems.map((problem) => (
                    <div
                      key={problem.group_id}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {/* 문제 이미지 */}
                      <div className="bg-grey-100 p-4">
                        <img
                          src={api.getProblemImageUrl(documentId, problem.image_path)}
                          alt={`문제 ${problem.group_id}`}
                          className="w-full h-auto"
                        />
                      </div>

                      {/* 문제 정보 */}
                      <div className="p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-green-700">
                            {problem.group_id}
                          </span>
                          <button
                            onClick={(e) =>
                              handleDeleteProblem(
                                problem.page_index,
                                problem.group_id,
                                e
                              )
                            }
                            disabled={deletingId === problem.group_id}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          >
                            {deletingId === problem.group_id ? '삭제 중...' : '✕ 삭제'}
                          </button>
                        </div>

                        {problem.column && (
                          <div className="text-xs text-grey-600 mb-1">
                            <span className="text-grey-500">컬럼: {problem.column}</span>
                          </div>
                        )}

                        {problem.block_ids && problem.block_ids.length > 0 && (
                          <div className="text-xs text-grey-600">
                            <div>블록: {problem.block_ids.length}개</div>
                            <div className="text-grey-400">
                              {problem.block_ids.join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 통계 */}
      <div className="bg-white border rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-grey-600">전체 문제:</span>
            <span className="ml-2 font-medium">{problems.length}개</span>
          </div>
          <div>
            <span className="text-grey-600">페이지:</span>
            <span className="ml-2 font-medium">
              {Object.keys(problemsByPage).length}개
            </span>
          </div>
          <div>
            <span className="text-grey-600">평균/페이지:</span>
            <span className="ml-2 font-medium">
              {(problems.length / Object.keys(problemsByPage).length).toFixed(1)}개
            </span>
          </div>
          <div>
            <span className="text-grey-600">저장 위치:</span>
            <span className="ml-2 font-medium text-xs">
              dataset_root/documents/{documentId}/problems/
            </span>
          </div>
        </div>
      </div>

      {/* Phase 21+ C-1: 문제은행 가져오기 모달 */}
      <ImportFromLabelingModal
        open={showImportModal}
        documentId={documentId}
        documentName={documentName || documentId}
        problems={problems}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportToProblemBank}
        isImporting={importFromLabeling.isPending}
      />
    </div>
  );
}
