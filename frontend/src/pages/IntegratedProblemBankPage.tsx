/**
 * Phase 17: 통합 문제은행 페이지
 * Phase 18-B: 휴지통 시스템으로 전환
 *
 * 한글 파일에서 파싱된 문제들을 통합 관리하는 페이지
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Database,
  CheckCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Star,
  BookOpen,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { MathDisplay } from '../components/MathDisplay';
import { hangulApi, type ProblemDetail, type ProblemBankStats, type ProblemSearchParams, type TrashItem } from '../api/hangul';
import { cn } from '../lib/utils';

// === 컴포넌트 ===

/** 통계 카드 */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-grey-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold text-grey-900">{value}</div>
          <div className="text-sm text-grey-600">{label}</div>
        </div>
      </div>
    </div>
  );
}

/** 필터 섹션 */
function FilterSection({
  stats,
  filters,
  onFilterChange,
}: {
  stats: ProblemBankStats | undefined;
  filters: ProblemSearchParams;
  onFilterChange: (key: keyof ProblemSearchParams, value: any) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg border border-grey-200 shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-grey-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-grey-600" />
          <span className="font-medium text-grey-900">필터</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-grey-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-grey-400" />
        )}
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-grey-100">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" />
            <input
              type="text"
              placeholder="문제 번호, 내용, 태그로 검색..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange('search', e.target.value || undefined)}
              className="w-full pl-10 pr-4 py-2.5 border border-grey-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">과목</label>
              <select
                value={filters.subject || ''}
                onChange={(e) => onFilterChange('subject', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {stats?.subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">학년</label>
              <select
                value={filters.grade || ''}
                onChange={(e) => onFilterChange('grade', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {stats?.grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Chapter */}
            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">단원</label>
              <select
                value={filters.chapter || ''}
                onChange={(e) => onFilterChange('chapter', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {stats?.chapters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">난이도</label>
              <select
                value={filters.difficulty?.toString() || ''}
                onChange={(e) => onFilterChange('difficulty', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="1">1 (매우 쉬움)</option>
                <option value="2">2 (쉬움)</option>
                <option value="3">3 (보통)</option>
                <option value="4">4 (어려움)</option>
                <option value="5">5 (매우 어려움)</option>
              </select>
            </div>

            {/* Has Answer */}
            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">정답</label>
              <select
                value={filters.has_answer === undefined ? '' : filters.has_answer ? 'true' : 'false'}
                onChange={(e) => onFilterChange('has_answer', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="true">있음</option>
                <option value="false">없음</option>
              </select>
            </div>

            {/* Has Explanation */}
            <div>
              <label className="block text-xs font-medium text-grey-600 mb-1">해설</label>
              <select
                value={filters.has_explanation === undefined ? '' : filters.has_explanation ? 'true' : 'false'}
                onChange={(e) => onFilterChange('has_explanation', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-grey-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="true">있음</option>
                <option value="false">없음</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Phase 18-C: 문제 카드 (선택 기능 추가) */
function ProblemCard({
  problem,
  index,
  onClick,
  selected,
  onSelect,
  isSelectionMode,
}: {
  problem: ProblemDetail;
  index: number;
  onClick: () => void;
  selected: boolean;
  onSelect: (id: string, index: number, shiftKey: boolean) => void;
  isSelectionMode: boolean;
}) {
  const difficulty = problem.metadata?.difficulty || 3;
  const hasAnswer = !!problem.answer_id;
  const hasExplanation = !!problem.explanation_id;

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onSelect(problem.id, index, e.shiftKey);
    } else {
      onClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(problem.id, index, e.shiftKey);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white rounded-lg border p-4 shadow-sm transition-all cursor-pointer group relative",
        selected
          ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
          : "border-grey-200 hover:shadow-md hover:border-blue-300"
      )}
    >
      {/* 체크박스 (호버 또는 선택 모드에서 표시) */}
      <div
        className={cn(
          "absolute top-2 left-2 transition-opacity z-10",
          isSelectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          onClick={handleCheckboxClick}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            selected
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white border-grey-300 hover:border-blue-400"
          )}
        >
          {selected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* 기존 카드 내용 */}
      <div className={cn(
        "transition-all",
        isSelectionMode || selected ? "pl-6" : "group-hover:pl-6"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-grey-900">
                #{problem.number || '?'}
              </span>
              <Badge variant="secondary" className="text-xs">
                {problem.metadata?.subject || '미분류'}
              </Badge>
            </div>
            {problem.metadata?.grade && (
              <span className="text-xs text-grey-500">{problem.metadata.grade}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <Star
                key={level}
                className={cn(
                  'w-3 h-3',
                  level <= difficulty ? 'text-yellow-400 fill-current' : 'text-grey-300'
                )}
              />
            ))}
          </div>
        </div>

        {/* Content Preview - Phase 19-C: LaTeX 렌더링 */}
        <div className="text-sm text-grey-700 line-clamp-3 min-h-[3.75rem] mb-3">
          <MathDisplay
            latex={problem.content_latex || problem.content_text || '(내용 없음)'}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {hasAnswer && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
                정답
              </span>
            )}
            {hasExplanation && (
              <span className="flex items-center gap-1 text-blue-600">
                <BookOpen className="w-3.5 h-3.5" />
                해설
              </span>
            )}
          </div>
          {problem.metadata?.chapter && (
            <span className="text-grey-500 truncate max-w-[100px]">
              {problem.metadata.chapter}
            </span>
          )}
        </div>

        {/* Tags */}
        {problem.metadata?.tags && problem.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {problem.metadata.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-grey-100 text-grey-600 rounded text-xs">
                {tag}
              </span>
            ))}
            {problem.metadata.tags.length > 3 && (
              <span className="text-xs text-grey-400">+{problem.metadata.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** 문제 상세 모달 */
function ProblemDetailModal({
  problem,
  isOpen,
  onClose,
}: {
  problem: ProblemDetail | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Phase 17: Hook은 반드시 조기 반환 전에 호출 (React Hook 규칙)
  const { data: detailData } = useQuery({
    queryKey: ['problem-detail', problem?.id],
    queryFn: () => hangulApi.getProblem(problem!.id),
    enabled: isOpen && !!problem?.id,
  });

  // 조기 반환은 모든 Hook 호출 후에
  if (!isOpen || !problem) return null;

  const displayProblem = detailData || problem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-grey-200 bg-grey-50">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-grey-900">
                문제 #{displayProblem.number || '?'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-grey-600">
                {displayProblem.metadata?.subject && (
                  <Badge variant="primary">{displayProblem.metadata.subject}</Badge>
                )}
                {displayProblem.metadata?.grade && (
                  <span>{displayProblem.metadata.grade}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-grey-200 rounded-lg transition-colors"
          >
            <span className="sr-only">닫기</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Problem Content - Phase 19-C: LaTeX 렌더링 */}
          <div>
            <h3 className="text-sm font-semibold text-grey-700 mb-2">문제</h3>
            <div className="p-4 bg-grey-50 rounded-lg whitespace-pre-wrap text-grey-800">
              <MathDisplay
                latex={displayProblem.content_latex || displayProblem.content_text || '(문제 내용 없음)'}
              />
            </div>
          </div>

          {/* Equations - Phase 19-C: LaTeX 렌더링 */}
          {(displayProblem.content_equations_latex?.length > 0 || displayProblem.content_equations?.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2">수식</h3>
              <div className="flex flex-wrap gap-2">
                {(displayProblem.content_equations_latex || displayProblem.content_equations).map((eq, i) => (
                  <code key={i} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm">
                    <MathDisplay latex={`$${eq}$`} />
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Answer - Phase 19-C: LaTeX 렌더링 */}
          {displayProblem.answer_data && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                정답
              </h3>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-lg font-medium text-green-800">
                  <MathDisplay
                    latex={displayProblem.answer_data.answer_latex || displayProblem.answer_data.answer}
                  />
                </div>
                {displayProblem.answer_data.answer_type && (
                  <div className="text-xs text-green-600 mt-1">
                    유형: {displayProblem.answer_data.answer_type}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Explanation - Phase 19-C: LaTeX 렌더링 */}
          {displayProblem.explanation_data && (
            <div>
              <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                해설
              </h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 whitespace-pre-wrap text-blue-800">
                <MathDisplay latex={displayProblem.explanation_data.content} />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div>
            <h3 className="text-sm font-semibold text-grey-700 mb-2">메타데이터</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {displayProblem.metadata?.chapter && (
                <div className="p-2 bg-grey-50 rounded">
                  <div className="text-xs text-grey-500">단원</div>
                  <div className="text-sm font-medium">{displayProblem.metadata.chapter}</div>
                </div>
              )}
              {displayProblem.metadata?.source && (
                <div className="p-2 bg-grey-50 rounded">
                  <div className="text-xs text-grey-500">출처</div>
                  <div className="text-sm font-medium">{displayProblem.metadata.source}</div>
                </div>
              )}
              {displayProblem.metadata?.difficulty && (
                <div className="p-2 bg-grey-50 rounded">
                  <div className="text-xs text-grey-500">난이도</div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Star
                        key={level}
                        className={cn(
                          'w-4 h-4',
                          level <= (displayProblem.metadata?.difficulty || 0) ? 'text-yellow-400 fill-current' : 'text-grey-300'
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
              {displayProblem.metadata?.points && (
                <div className="p-2 bg-grey-50 rounded">
                  <div className="text-xs text-grey-500">배점</div>
                  <div className="text-sm font-medium">{displayProblem.metadata.points}점</div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {displayProblem.metadata?.tags && displayProblem.metadata.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-grey-700 mb-2">태그</h3>
              <div className="flex flex-wrap gap-2">
                {displayProblem.metadata.tags.map((tag, index) => (
                  <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Phase 18-B: 플로팅 선택 액션 바 (문제 목록용 - 휴지통으로 이동) */
function SelectionActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onMoveToTrash,
  isMoving,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onMoveToTrash: () => void;
  isMoving: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-grey-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
        {/* 선택 개수 */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium">
            {selectedCount}
          </div>
          <span className="text-sm">개 선택됨</span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-grey-600" />

        {/* 액션 버튼들 */}
        <button
          onClick={onSelectAll}
          className="text-sm text-grey-300 hover:text-white transition-colors"
        >
          {selectedCount === totalCount ? '전체 해제' : '전체 선택'}
        </button>

        <button
          onClick={onClearSelection}
          className="text-sm text-grey-300 hover:text-white transition-colors"
        >
          선택 취소
        </button>

        <div className="w-px h-6 bg-grey-600" />

        {/* 휴지통으로 이동 버튼 */}
        <button
          onClick={onMoveToTrash}
          disabled={isMoving}
          className="flex items-center gap-2 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-full text-sm font-medium transition-colors"
        >
          {isMoving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          휴지통으로 이동
        </button>
      </div>
    </div>
  );
}

/** Phase 18-B: 휴지통 탭용 선택 액션 바 (복원/영구 삭제) */
function TrashSelectionActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onRestore,
  onPermanentDelete,
  isProcessing,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  isProcessing: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-grey-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
        {/* 선택 개수 */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-sm font-medium">
            {selectedCount}
          </div>
          <span className="text-sm">개 선택됨</span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-grey-600" />

        {/* 액션 버튼들 */}
        <button
          onClick={onSelectAll}
          className="text-sm text-grey-300 hover:text-white transition-colors"
        >
          {selectedCount === totalCount ? '전체 해제' : '전체 선택'}
        </button>

        <button
          onClick={onClearSelection}
          className="text-sm text-grey-300 hover:text-white transition-colors"
        >
          선택 취소
        </button>

        <div className="w-px h-6 bg-grey-600" />

        {/* 복원 버튼 */}
        <button
          onClick={onRestore}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-full text-sm font-medium transition-colors"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          복원
        </button>

        {/* 영구 삭제 버튼 */}
        <button
          onClick={onPermanentDelete}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          영구 삭제
        </button>
      </div>
    </div>
  );
}

/** Phase 18-B: 휴지통 비우기 확인 다이얼로그 */
function EmptyTrashDialog({
  isOpen,
  onClose,
  onConfirm,
  trashCount,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  trashCount: number;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-xl font-bold text-center text-grey-900 mb-2">
          휴지통 비우기
        </h2>

        {/* 설명 */}
        <p className="text-center text-grey-600 mb-4">
          휴지통의 <strong>{trashCount}개</strong> 항목이 영구 삭제됩니다.
        </p>

        {/* 경고 */}
        <p className="text-sm text-red-500 text-center mb-6">
          이 작업은 되돌릴 수 없습니다.
        </p>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-grey-300 rounded-lg text-grey-700 hover:bg-grey-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                영구 삭제
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Phase 18-B: 휴지통 항목 카드 */
function TrashItemCard({
  item,
  index,
  selected,
  onSelect,
  onRestore,
  onPermanentDelete,
  isSelectionMode,
}: {
  item: TrashItem;
  index: number;
  selected: boolean;
  onSelect: (id: string, index: number, shiftKey: boolean) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  isSelectionMode: boolean;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onSelect(item.id, index, e.shiftKey);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.id, index, e.shiftKey);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white rounded-lg border p-4 shadow-sm transition-all cursor-pointer group relative",
        selected
          ? "border-orange-500 ring-2 ring-orange-200 bg-orange-50"
          : "border-grey-200 hover:shadow-md hover:border-orange-300"
      )}
    >
      {/* 체크박스 */}
      <div
        className={cn(
          "absolute top-2 left-2 transition-opacity z-10",
          isSelectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          onClick={handleCheckboxClick}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            selected
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-white border-grey-300 hover:border-orange-400"
          )}
        >
          {selected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* 카드 내용 */}
      <div className={cn(
        "transition-all",
        isSelectionMode || selected ? "pl-6" : "group-hover:pl-6"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-grey-900">
              #{item.number || '?'}
            </span>
            {item.subject && (
              <Badge variant="secondary" className="text-xs">
                {item.subject}
              </Badge>
            )}
          </div>
        </div>

        {/* 삭제 정보 */}
        <div className="flex items-center gap-2 text-sm text-grey-500 mb-3">
          <Clock className="w-4 h-4" />
          <span>
            {item.days_in_trash === 0
              ? '오늘 삭제됨'
              : `${item.days_in_trash}일 전 삭제됨`}
          </span>
        </div>

        {/* 메타 정보 */}
        <div className="flex items-center gap-2 text-xs mb-3">
          {item.grade && <span className="text-grey-500">{item.grade}</span>}
          {item.chapter && <span className="text-grey-500">• {item.chapter}</span>}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRestore(item.id);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            복원
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPermanentDelete(item.id);
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// === 메인 페이지 ===

type TabType = 'problems' | 'trash';

export function IntegratedProblemBankPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProblemSearchParams>({ limit: 50, offset: 0 });
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Phase 18-B: 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('problems');

  // Phase 18-B: 선택 모드 상태 (문제 목록)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Phase 18-B: 휴지통 선택 상태
  const [trashSelectedIds, setTrashSelectedIds] = useState<Set<string>>(new Set());
  const [isTrashSelectionMode, setIsTrashSelectionMode] = useState(false);
  const [lastTrashSelectedIndex, setLastTrashSelectedIndex] = useState<number | null>(null);
  const [isEmptyTrashDialogOpen, setIsEmptyTrashDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 통계 조회
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['problem-bank-stats'],
    queryFn: hangulApi.getStats,
  });

  // 문제 목록 조회
  const { data: problemsData, isLoading: problemsLoading, error } = useQuery({
    queryKey: ['problems', filters],
    queryFn: () => hangulApi.getProblems(filters),
  });

  // Phase 18-B: 휴지통 목록 조회
  const { data: trashData, isLoading: trashLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: hangulApi.getTrash,
  });

  // 필터 변경 핸들러
  const handleFilterChange = (key: keyof ProblemSearchParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      offset: 0, // 필터 변경 시 첫 페이지로
    }));
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
  };

  // 문제 클릭 핸들러
  const handleProblemClick = (problem: ProblemDetail) => {
    setSelectedProblem(problem);
    setIsModalOpen(true);
  };

  // Phase 18-C: 선택 핸들러
  const handleSelect = useCallback((problemId: string, index: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);

      if (shiftKey && lastSelectedIndex !== null) {
        // Shift+클릭: 범위 선택
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const currentProblems = problemsData?.problems || [];

        for (let i = start; i <= end; i++) {
          if (currentProblems[i]) {
            next.add(currentProblems[i].id);
          }
        }
      } else {
        // 일반 클릭: 토글
        if (next.has(problemId)) {
          next.delete(problemId);
        } else {
          next.add(problemId);
        }
      }

      return next;
    });

    setLastSelectedIndex(index);

    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
  }, [lastSelectedIndex, problemsData?.problems, isSelectionMode]);

  // 전체 선택/해제
  const handleSelectAll = useCallback(() => {
    const currentProblems = problemsData?.problems || [];
    if (selectedIds.size === currentProblems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentProblems.map(p => p.id)));
    }
  }, [problemsData?.problems, selectedIds.size]);

  // 선택 모드 종료
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setLastSelectedIndex(null);
  }, []);

  // Phase 18-B: 휴지통으로 이동 (Soft Delete)
  const handleMoveToTrash = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsMoving(true);
    try {
      const idsToMove = Array.from(selectedIds);
      await hangulApi.moveToTrash(idsToMove);

      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });

      // 선택 상태 초기화
      handleClearSelection();
    } catch (error) {
      console.error('휴지통 이동 실패:', error);
      alert('휴지통으로 이동 중 오류가 발생했습니다.');
    } finally {
      setIsMoving(false);
    }
  }, [selectedIds, queryClient, handleClearSelection]);

  // Phase 18-B: 휴지통 선택 핸들러
  const handleTrashSelect = useCallback((itemId: string, index: number, shiftKey: boolean) => {
    setTrashSelectedIds(prev => {
      const next = new Set(prev);

      if (shiftKey && lastTrashSelectedIndex !== null) {
        const start = Math.min(lastTrashSelectedIndex, index);
        const end = Math.max(lastTrashSelectedIndex, index);
        const trashItems = trashData?.items || [];

        for (let i = start; i <= end; i++) {
          if (trashItems[i]) {
            next.add(trashItems[i].id);
          }
        }
      } else {
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
      }

      return next;
    });

    setLastTrashSelectedIndex(index);

    if (!isTrashSelectionMode) {
      setIsTrashSelectionMode(true);
    }
  }, [lastTrashSelectedIndex, trashData?.items, isTrashSelectionMode]);

  // 휴지통 전체 선택/해제
  const handleTrashSelectAll = useCallback(() => {
    const trashItems = trashData?.items || [];
    if (trashSelectedIds.size === trashItems.length) {
      setTrashSelectedIds(new Set());
    } else {
      setTrashSelectedIds(new Set(trashItems.map(i => i.id)));
    }
  }, [trashData?.items, trashSelectedIds.size]);

  // 휴지통 선택 모드 종료
  const handleClearTrashSelection = useCallback(() => {
    setTrashSelectedIds(new Set());
    setIsTrashSelectionMode(false);
    setLastTrashSelectedIndex(null);
  }, []);

  // Phase 18-B: 단일 항목 복원
  const handleRestoreSingle = useCallback(async (itemId: string) => {
    setIsProcessing(true);
    try {
      await hangulApi.restoreFromTrash([itemId]);

      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    } catch (error) {
      console.error('복원 실패:', error);
      alert('복원 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  // Phase 18-B: 선택 항목 복원
  const handleRestoreSelected = useCallback(async () => {
    if (trashSelectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      await hangulApi.restoreFromTrash(Array.from(trashSelectedIds));

      queryClient.invalidateQueries({ queryKey: ['problems'] });
      queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trash'] });

      handleClearTrashSelection();
    } catch (error) {
      console.error('복원 실패:', error);
      alert('복원 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [trashSelectedIds, queryClient, handleClearTrashSelection]);

  // Phase 18-B: 단일 항목 영구 삭제
  const handlePermanentDeleteSingle = useCallback(async (itemId: string) => {
    if (!confirm('이 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

    setIsProcessing(true);
    try {
      await hangulApi.permanentDelete(itemId);

      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });
    } catch (error) {
      console.error('영구 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  // Phase 18-B: 선택 항목 영구 삭제
  const handlePermanentDeleteSelected = useCallback(async () => {
    if (trashSelectedIds.size === 0) return;
    if (!confirm(`선택한 ${trashSelectedIds.size}개 항목을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    setIsProcessing(true);
    try {
      // 하나씩 삭제 (bulk API가 없으므로)
      for (const id of trashSelectedIds) {
        await hangulApi.permanentDelete(id);
      }

      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });

      handleClearTrashSelection();
    } catch (error) {
      console.error('영구 삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [trashSelectedIds, queryClient, handleClearTrashSelection]);

  // Phase 18-B: 휴지통 비우기
  const handleEmptyTrash = useCallback(async () => {
    setIsProcessing(true);
    try {
      await hangulApi.emptyTrash();

      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });

      setIsEmptyTrashDialogOpen(false);
      handleClearTrashSelection();
    } catch (error) {
      console.error('휴지통 비우기 실패:', error);
      alert('휴지통 비우기 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient, handleClearTrashSelection]);

  // 탭 변경 시 선택 상태 초기화
  useEffect(() => {
    handleClearSelection();
    handleClearTrashSelection();
  }, [activeTab, handleClearSelection, handleClearTrashSelection]);

  // ESC 키로 선택 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeTab === 'problems' && isSelectionMode) {
          handleClearSelection();
        } else if (activeTab === 'trash' && isTrashSelectionMode) {
          handleClearTrashSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, isSelectionMode, isTrashSelectionMode, handleClearSelection, handleClearTrashSelection]);

  const isLoading = statsLoading || problemsLoading;
  const problems = problemsData?.problems || [];
  const totalProblems = problemsData?.total || 0;
  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1;
  const totalPages = Math.ceil(totalProblems / (filters.limit || 50));
  const trashItems = trashData?.items || [];
  const trashCount = trashData?.total || 0;

  if (isLoading && !problemsData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-grey-600">문제은행 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h3 className="mt-4 text-lg font-semibold text-grey-900">데이터 로딩 실패</h3>
          <p className="mt-2 text-sm text-grey-600">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8" />
              <h1 className="text-3xl font-bold">통합 문제은행</h1>
            </div>
            <p className="mt-2 text-blue-100">
              한글 파일에서 파싱된 문제들을 관리하세요
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="전체 문제"
          value={stats?.total_problems || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={CheckCircle}
          label="정답 있음"
          value={stats?.with_answer || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={BookOpen}
          label="해설 있음"
          value={stats?.with_explanation || 0}
          color="bg-purple-500"
        />
        <StatCard
          icon={Trash2}
          label="휴지통"
          value={trashCount}
          color="bg-orange-500"
        />
      </div>

      {/* Phase 18-B: 탭 */}
      <div className="flex border-b border-grey-200">
        <button
          onClick={() => setActiveTab('problems')}
          className={cn(
            "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
            activeTab === 'problems'
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-grey-600 hover:text-grey-900 hover:border-grey-300"
          )}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            문제 목록
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-grey-100 text-grey-600">
              {totalProblems}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={cn(
            "px-6 py-3 font-medium text-sm border-b-2 transition-colors",
            activeTab === 'trash'
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-grey-600 hover:text-grey-900 hover:border-grey-300"
          )}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            휴지통
            {trashCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-600">
                {trashCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Filters (문제 목록 탭에서만) */}
      {activeTab === 'problems' && (
        <FilterSection
          stats={stats}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* === 문제 목록 탭 콘텐츠 === */}
      {activeTab === 'problems' && (
        <>
          {/* Results Info */}
          <div className="flex items-center justify-between text-sm text-grey-600">
            <span>
              {totalProblems > 0
                ? `${totalProblems}개 문제 (${currentPage}/${totalPages} 페이지)`
                : '검색 결과가 없습니다'}
            </span>
            {problemsLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>

          {/* Problem Grid */}
          {problems.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-grey-300 bg-grey-50">
              <div className="text-center text-grey-600">
                <Database className="mx-auto h-16 w-16 text-grey-400" />
                <p className="mt-4 text-lg font-medium">문제가 없습니다</p>
                <p className="mt-2 text-sm">
                  한글 파일 페이지에서 HWPX/HML 파일을 업로드하여 문제를 추가하세요
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {problems.map((problem, index) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  index={index}
                  onClick={() => handleProblemClick(problem)}
                  selected={selectedIds.has(problem.id)}
                  onSelect={handleSelect}
                  isSelectionMode={isSelectionMode}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(0, (filters.offset || 0) - (filters.limit || 50)))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-grey-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grey-50 transition-colors"
              >
                이전
              </button>
              <span className="px-4 py-2 text-sm text-grey-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 50))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-grey-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grey-50 transition-colors"
              >
                다음
              </button>
            </div>
          )}

          {/* 문제 목록 선택 액션 바 */}
          <SelectionActionBar
            selectedCount={selectedIds.size}
            totalCount={problems.length}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onMoveToTrash={handleMoveToTrash}
            isMoving={isMoving}
          />
        </>
      )}

      {/* === 휴지통 탭 콘텐츠 === */}
      {activeTab === 'trash' && (
        <>
          {/* 휴지통 헤더 */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-grey-600">
              {trashCount > 0
                ? `${trashCount}개 항목`
                : '휴지통이 비어있습니다'}
              {trashLoading && (
                <Loader2 className="inline-block ml-2 w-4 h-4 animate-spin text-orange-600" />
              )}
            </div>
            {trashCount > 0 && (
              <button
                onClick={() => setIsEmptyTrashDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                휴지통 비우기
              </button>
            )}
          </div>

          {/* 휴지통 목록 */}
          {trashItems.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-grey-300 bg-grey-50">
              <div className="text-center text-grey-600">
                <Trash2 className="mx-auto h-16 w-16 text-grey-400" />
                <p className="mt-4 text-lg font-medium">휴지통이 비어있습니다</p>
                <p className="mt-2 text-sm">
                  삭제된 문제가 여기에 표시됩니다
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trashItems.map((item, index) => (
                <TrashItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  selected={trashSelectedIds.has(item.id)}
                  onSelect={handleTrashSelect}
                  onRestore={handleRestoreSingle}
                  onPermanentDelete={handlePermanentDeleteSingle}
                  isSelectionMode={isTrashSelectionMode}
                />
              ))}
            </div>
          )}

          {/* 휴지통 선택 액션 바 */}
          <TrashSelectionActionBar
            selectedCount={trashSelectedIds.size}
            totalCount={trashItems.length}
            onSelectAll={handleTrashSelectAll}
            onClearSelection={handleClearTrashSelection}
            onRestore={handleRestoreSelected}
            onPermanentDelete={handlePermanentDeleteSelected}
            isProcessing={isProcessing}
          />

          {/* 휴지통 비우기 다이얼로그 */}
          <EmptyTrashDialog
            isOpen={isEmptyTrashDialogOpen}
            onClose={() => setIsEmptyTrashDialogOpen(false)}
            onConfirm={handleEmptyTrash}
            trashCount={trashCount}
            isDeleting={isProcessing}
          />
        </>
      )}

      {/* Problem Detail Modal */}
      <ProblemDetailModal
        problem={selectedProblem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
