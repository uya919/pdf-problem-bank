/**
 * Phase 23-C: 크롭 문제은행 컴포넌트
 *
 * 모든 문서에서 내보내기(확정)된 문제 이미지 표시
 * - 전체 문제 그리드 표시
 * - 문서별 그룹화 토글
 * - 검색/필터 기능
 * - Phase 24-B: 일괄 삭제 기능
 * - Phase 24-C: 해설 연결 표시
 * - Phase 57-E: ProblemModal 통합 - 문제 클릭 시 해설 탭으로 연결된 해설 확인 가능
 */
import { useState, useMemo, useCallback } from 'react';
import { Search, Grid, List, Trash2, Image as ImageIcon, Loader2, CheckSquare, Square, X, BookOpen } from 'lucide-react';
import { useAllExportedProblems, useDeleteProblem, useBulkDeleteProblems, useLinkedSolutions } from '../../hooks/useDocuments';
import { api, type ExportedProblem } from '../../api/client';
import { useToast } from '../Toast';
import { ProblemModal } from '../ui/ProblemModal';

type ViewMode = 'grid' | 'list';
type GroupByMode = 'none' | 'document';

// Phase 24-B: 문제 고유 키 생성
function getProblemKey(problem: ExportedProblem): string {
  return `${problem.document_id}|${problem.page_index}|${problem.group_id}`;
}

/**
 * Phase 24-A: 문제 표시 이름 포맷팅
 * "베이직쎈_공통수학2_p18_1번" 형식으로 표시
 */
function formatProblemName(problem: ExportedProblem): string {
  const info = problem.problem_info;

  if (info?.bookName && info?.course && info?.page && info?.problemNumber) {
    // 완전한 정보가 있을 때: "베이직쎈_공통수학2_p18_1번"
    return `${info.bookName}_${info.course}_p${info.page}_${info.problemNumber}번`;
  }

  // 정보가 불완전할 때: 파일명 기반 폴백
  // document_id에서 날짜 부분 제거 (예: "_250527_194013 (1)")
  const bookName = problem.document_id.replace(/_\d{6}_\d{6}.*$/, '');
  return `${bookName}_p${problem.page_index + 1}_${problem.group_id}`;
}

export function CropProblemBank() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupByMode>('document');
  const [selectedProblem, setSelectedProblem] = useState<ExportedProblem | null>(null);

  // Phase 24-B: 다중 선택 상태
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // 전체 문제 조회
  const { data, isLoading, error } = useAllExportedProblems({
    search: search || undefined,
  });

  const deleteProblemMutation = useDeleteProblem();
  const bulkDeleteMutation = useBulkDeleteProblems();

  // Phase 24-C: 해설 연결 정보 조회
  const { data: linkedSolutionsData } = useLinkedSolutions();

  // 문서별 그룹화
  const groupedProblems = useMemo(() => {
    if (!data?.problems) return new Map<string, ExportedProblem[]>();

    if (groupBy === 'none') {
      return new Map([['all', data.problems]]);
    }

    const grouped = new Map<string, ExportedProblem[]>();
    for (const problem of data.problems) {
      const key = problem.document_id;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(problem);
    }
    return grouped;
  }, [data?.problems, groupBy]);

  // 문제 삭제
  const handleDelete = async (problem: ExportedProblem) => {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return;

    try {
      await deleteProblemMutation.mutateAsync({
        documentId: problem.document_id,
        pageIndex: problem.page_index,
        groupId: problem.group_id,
      });
      showToast('문제가 삭제되었습니다', 'success');
      if (selectedProblem?.group_id === problem.group_id) {
        setSelectedProblem(null);
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      showToast('삭제에 실패했습니다', 'error');
    }
  };

  // Phase 24-B: 다중 선택 토글
  const handleToggleSelect = useCallback((problem: ExportedProblem) => {
    const key = getProblemKey(problem);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Phase 24-B: 전체 선택/해제
  const handleSelectAll = useCallback(() => {
    if (!data?.problems) return;

    if (selectedKeys.size === data.problems.length) {
      // 전체 해제
      setSelectedKeys(new Set());
    } else {
      // 전체 선택
      setSelectedKeys(new Set(data.problems.map(getProblemKey)));
    }
  }, [data?.problems, selectedKeys.size]);

  // Phase 24-B: 일괄 삭제
  const handleBulkDelete = useCallback(async () => {
    if (selectedKeys.size === 0) return;

    if (!confirm(`선택한 ${selectedKeys.size}개의 문제를 삭제하시겠습니까?`)) return;

    // selectedKeys에서 문제 정보 추출
    const problemsToDelete = Array.from(selectedKeys).map(key => {
      const [document_id, page_index, group_id] = key.split('|');
      return {
        document_id,
        page_index: parseInt(page_index, 10),
        group_id,
      };
    });

    try {
      const result = await bulkDeleteMutation.mutateAsync({
        problems: problemsToDelete,
      });

      if (result.success) {
        showToast(`${result.deleted_count}개 문제가 삭제되었습니다`, 'success');
      } else {
        showToast(`${result.deleted_count}개 삭제 완료, ${result.failed_count}개 실패`, 'warning');
      }

      // 선택 초기화 및 다중선택 모드 종료
      setSelectedKeys(new Set());
      setIsMultiSelectMode(false);
      setSelectedProblem(null);
    } catch (error) {
      console.error('일괄 삭제 실패:', error);
      showToast('일괄 삭제에 실패했습니다', 'error');
    }
  }, [selectedKeys, bulkDeleteMutation, showToast]);

  // Phase 24-B: 다중 선택 모드 종료
  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedKeys(new Set());
  }, []);

  // 문제 이미지 URL 생성
  const getImageUrl = (problem: ExportedProblem) => {
    return api.getProblemImageUrl(problem.document_id, problem.image_path);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-grey-600">문제 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        문제 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 검색 및 필터 바 */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-grey-200">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
          <input
            type="text"
            placeholder="문제번호, 교재명으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 그룹화 토글 */}
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupByMode)}
          className="px-3 py-2 border border-grey-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="document">문서별 그룹화</option>
          <option value="none">전체 보기</option>
        </select>

        {/* 보기 모드 */}
        <div className="flex border border-grey-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-grey-600 hover:bg-grey-50'}`}
            title="그리드 보기"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-grey-600 hover:bg-grey-50'}`}
            title="리스트 보기"
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        {/* Phase 24-B: 다중 선택 토글 */}
        <button
          onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
          className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
            isMultiSelectMode
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-grey-600 border-grey-300 hover:bg-grey-50'
          }`}
          title={isMultiSelectMode ? '선택 모드 종료' : '다중 선택 모드'}
        >
          <CheckSquare className="w-5 h-5" />
          <span className="hidden sm:inline">{isMultiSelectMode ? '선택 취소' : '선택'}</span>
        </button>

        {/* 통계 */}
        <div className="text-sm text-grey-600">
          총 <span className="font-semibold text-blue-600">{data?.total || 0}</span>개 문제
        </div>
      </div>

      {/* Phase 24-B: 다중 선택 모드 툴바 */}
      {isMultiSelectMode && (
        <div className="flex items-center gap-4 bg-orange-50 p-3 rounded-lg border border-orange-200">
          <span className="text-orange-700 font-medium">
            {selectedKeys.size}개 선택됨
          </span>

          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-sm bg-white border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors"
          >
            {selectedKeys.size === (data?.problems?.length || 0) ? '전체 해제' : '전체 선택'}
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={selectedKeys.size === 0 || bulkDeleteMutation.isPending}
            className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {bulkDeleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            선택 삭제
          </button>

          <button
            onClick={exitMultiSelectMode}
            className="ml-auto p-1.5 text-orange-600 hover:text-orange-800 transition-colors"
            title="선택 모드 종료"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 문제 목록 */}
      {data?.problems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-grey-200">
          <ImageIcon className="w-16 h-16 mx-auto text-grey-300 mb-4" />
          <p className="text-grey-500">확정된 문제가 없습니다</p>
          <p className="text-sm text-grey-400 mt-1">
            라벨링 작업에서 그룹을 "확정"하면 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedProblems.entries()).map(([groupKey, problems]) => (
            <div key={groupKey} className="bg-white rounded-lg border border-grey-200 overflow-hidden">
              {/* 그룹 헤더 (문서별 그룹화 시) */}
              {groupBy === 'document' && (
                <div className="bg-grey-50 px-4 py-3 border-b border-grey-200">
                  <h3 className="font-semibold text-grey-800">
                    {groupKey}
                    <span className="ml-2 text-sm font-normal text-grey-500">
                      ({problems.length}개)
                    </span>
                  </h3>
                </div>
              )}

              {/* 문제 그리드/리스트 */}
              <div className={`p-4 ${
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                  : 'space-y-2'
              }`}>
                {problems.map((problem) => (
                  <ProblemCard
                    key={`${problem.document_id}-${problem.page_index}-${problem.group_id}`}
                    problem={problem}
                    viewMode={viewMode}
                    imageUrl={getImageUrl(problem)}
                    isSelected={selectedProblem?.group_id === problem.group_id}
                    onSelect={() => setSelectedProblem(problem)}
                    onDelete={() => handleDelete(problem)}
                    // Phase 24-B: 다중 선택
                    isMultiSelectMode={isMultiSelectMode}
                    isChecked={selectedKeys.has(getProblemKey(problem))}
                    onToggleCheck={() => handleToggleSelect(problem)}
                    // Phase 24-C: 해설 연결 여부
                    hasLinkedSolution={linkedSolutionsData?.links[getProblemKey(problem)] !== undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phase 57-E: ProblemModal로 교체 - 해설 탭 기능 포함 */}
      <ProblemModal
        problem={selectedProblem ? {
          problem_id: formatProblemName(selectedProblem),
          document_id: selectedProblem.document_id,
          page_index: selectedProblem.page_index,
          group_id: selectedProblem.group_id,
          image_path: selectedProblem.image_path,
          created_at: selectedProblem.exported_at
            ? Math.floor(new Date(selectedProblem.exported_at).getTime() / 1000)
            : undefined,
        } : null}
        imageUrl={selectedProblem ? getImageUrl(selectedProblem) : ''}
        isOpen={!!selectedProblem}
        onClose={() => setSelectedProblem(null)}
        onDelete={(problemId) => {
          if (selectedProblem) {
            handleDelete(selectedProblem);
          }
        }}
      />
    </div>
  );
}

// 문제 카드 컴포넌트
interface ProblemCardProps {
  problem: ExportedProblem;
  viewMode: ViewMode;
  imageUrl: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  // Phase 24-B: 다중 선택
  isMultiSelectMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
  // Phase 24-C: 해설 연결 여부
  hasLinkedSolution?: boolean;
}

function ProblemCard({
  problem,
  viewMode,
  imageUrl,
  isSelected,
  onSelect,
  onDelete,
  // Phase 24-B: 다중 선택
  isMultiSelectMode = false,
  isChecked = false,
  onToggleCheck,
  // Phase 24-C: 해설 연결 여부
  hasLinkedSolution = false,
}: ProblemCardProps) {
  // Phase 24-A: 새로운 표시 이름 포맷 사용
  const displayName = formatProblemName(problem);

  // Phase 24-B: 클릭 핸들러 (다중 선택 모드 분기)
  const handleClick = () => {
    if (isMultiSelectMode && onToggleCheck) {
      onToggleCheck();
    } else {
      onSelect();
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
          isMultiSelectMode && isChecked
            ? 'border-orange-500 bg-orange-50'
            : isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-grey-200 hover:bg-grey-50'
        }`}
        onClick={handleClick}
      >
        {/* Phase 24-B: 체크박스 (다중 선택 모드) */}
        {isMultiSelectMode && (
          <div className="flex-shrink-0">
            {isChecked ? (
              <CheckSquare className="w-6 h-6 text-orange-500" />
            ) : (
              <Square className="w-6 h-6 text-grey-400" />
            )}
          </div>
        )}

        {/* 썸네일 */}
        <div className="w-16 h-16 flex-shrink-0 bg-grey-100 rounded overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-grey-300" />
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-grey-900 truncate">{displayName}</p>
            {/* Phase 24-C: 해설 연결 뱃지 */}
            {hasLinkedSolution && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium flex-shrink-0">
                <BookOpen className="w-3 h-3" />
                해설
              </span>
            )}
          </div>
          <p className="text-sm text-grey-500 truncate">
            {problem.problem_info?.bookName || problem.document_id}
          </p>
        </div>

        {/* 액션 (다중 선택 모드가 아닐 때만 표시) */}
        {!isMultiSelectMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-grey-400 hover:text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Grid mode
  return (
    <div
      className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
        isMultiSelectMode && isChecked
          ? 'border-orange-500 ring-2 ring-orange-200'
          : isSelected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-grey-200 hover:border-grey-300'
      }`}
      onClick={handleClick}
    >
      {/* Phase 24-B: 체크박스 (다중 선택 모드) */}
      {isMultiSelectMode && (
        <div className="absolute top-2 left-2 z-10">
          {isChecked ? (
            <CheckSquare className="w-6 h-6 text-orange-500 bg-white rounded" />
          ) : (
            <Square className="w-6 h-6 text-grey-400 bg-white rounded" />
          )}
        </div>
      )}

      {/* 이미지 */}
      <div className="aspect-[4/3] bg-grey-100 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayName}
            className="w-full h-full object-contain"
          />
        ) : (
          <ImageIcon className="w-12 h-12 text-grey-300" />
        )}
      </div>

      {/* 오버레이 (삭제 버튼 - 다중 선택 모드가 아닐 때만) */}
      {!isMultiSelectMode && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 라벨 */}
      <div className="p-2 bg-white border-t border-grey-100">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-grey-900 truncate flex-1">{displayName}</p>
          {/* Phase 24-C: 해설 연결 뱃지 (그리드) */}
          {hasLinkedSolution && (
            <span className="inline-flex items-center p-1 rounded bg-green-100 text-green-700 flex-shrink-0" title="해설 연결됨">
              <BookOpen className="w-3 h-3" />
            </span>
          )}
        </div>
        <p className="text-xs text-grey-500 truncate">
          {problem.problem_info?.bookName || problem.document_id}
        </p>
      </div>
    </div>
  );
}
