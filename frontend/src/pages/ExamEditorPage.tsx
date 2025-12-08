/**
 * 시험지 편집 페이지
 *
 * Phase 21+ D-2: 시험지 편집 UI
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Settings,
  Save,
  Eye,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle,
  Archive,
  Clock,
  Search,
  X,
  Edit2,
  Check,
} from 'lucide-react';
import {
  useExamPaper,
  useUpdateExamPaper,
  useAddProblemToExam,
  useRemoveProblemFromExam,
  useUpdateProblemPoints,
  useAddSection,
  useRemoveSection,
  useUpdateSection,
  useUpdateExamStatus,
  useReorderProblems,
} from '../api/examPapers';
import { useProblems, useProblem } from '../api/problems';
import type { ExamPaper, ExamSection, ExamProblemItem, ExamPaperStatus, ExamPaperSettings } from '../types/examPaper';
import type { Problem } from '../types/problem';
import { ExamSettingsModal, ExamPreviewModal } from '../components/exam';

const API_BASE = 'http://localhost:8000';

// 상태 설정
const statusConfig: Record<ExamPaperStatus, { icon: typeof Clock; color: string; label: string }> = {
  draft: { icon: Clock, color: 'text-yellow-500 bg-yellow-50 border-yellow-200', label: '작성 중' },
  ready: { icon: CheckCircle, color: 'text-green-500 bg-green-50 border-green-200', label: '완료' },
  archived: { icon: Archive, color: 'text-grey-500 bg-grey-50 border-grey-200', label: '보관' },
};

// 문제 미리보기 컴포넌트
interface ProblemPreviewProps {
  problemId: string;
}

function ProblemPreview({ problemId }: ProblemPreviewProps) {
  const { data: problem, isLoading } = useProblem(problemId);

  if (isLoading) {
    return (
      <div className="w-16 h-16 bg-grey-100 rounded-lg flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-grey-400" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center">
        <AlertCircle className="w-4 h-4 text-red-400" />
      </div>
    );
  }

  const imageUrl = problem.content.thumbnailUrl || problem.content.imageUrl;
  const fullUrl = imageUrl?.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;

  return (
    <div className="w-16 h-16 bg-grey-50 rounded-lg overflow-hidden border border-grey-200">
      <img
        src={fullUrl}
        alt="문제 미리보기"
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="%23f3f4f6" width="64" height="64"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="10">No img</text></svg>';
        }}
      />
    </div>
  );
}

// 문제 항목 컴포넌트
interface ProblemItemCardProps {
  item: ExamProblemItem;
  sectionId: string;
  examId: string;
  onRemove: () => void;
  onPointsChange: (points: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function ProblemItemCard({
  item,
  onRemove,
  onPointsChange,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: ProblemItemCardProps) {
  const [editingPoints, setEditingPoints] = useState(false);
  const [pointsValue, setPointsValue] = useState(String(item.points));
  const { data: problem } = useProblem(item.problemId);

  const handlePointsSave = () => {
    const newPoints = parseInt(pointsValue, 10);
    if (!isNaN(newPoints) && newPoints > 0) {
      onPointsChange(newPoints);
    } else {
      setPointsValue(String(item.points));
    }
    setEditingPoints(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-grey-100
        hover:border-grey-200 transition-colors group"
    >
      {/* 순서 조절 */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 rounded hover:bg-grey-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-4 h-4 text-grey-500" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 rounded hover:bg-grey-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-4 h-4 text-grey-500" />
        </button>
      </div>

      {/* 문제 번호 */}
      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center
        font-bold text-blue-600">
        {item.order}
      </div>

      {/* 미리보기 */}
      <ProblemPreview problemId={item.problemId} />

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-grey-900 truncate">
            {problem?.source.name || '문제'}
          </span>
          {problem?.source.problemNumber && (
            <span className="text-xs text-grey-500">
              #{problem.source.problemNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-grey-500">
          {problem?.classification && (
            // Phase 62-A: fullPath 또는 gradeName 사용
            <span>{problem.classification.fullPath || problem.classification.gradeName}</span>
          )}
          <span>난이도 {problem?.difficulty || '-'}</span>
        </div>
      </div>

      {/* 배점 */}
      <div className="flex items-center gap-2">
        {editingPoints ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={pointsValue}
              onChange={(e) => setPointsValue(e.target.value)}
              className="w-12 px-2 py-1 text-sm border rounded-lg text-center"
              min="1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePointsSave();
                if (e.key === 'Escape') {
                  setPointsValue(String(item.points));
                  setEditingPoints(false);
                }
              }}
            />
            <button
              onClick={handlePointsSave}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingPoints(true)}
            className="flex items-center gap-1 px-2 py-1 text-sm font-medium text-blue-600
              bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {item.points}점
            <Edit2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* 삭제 */}
      <button
        onClick={onRemove}
        className="p-2 text-grey-400 hover:text-red-500 hover:bg-red-50 rounded-lg
          opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// 섹션 컴포넌트
interface SectionPanelProps {
  section: ExamSection;
  exam: ExamPaper;
  onAddProblem: () => void;
  onRemove: () => void;
  onUpdateTitle: (title: string) => void;
  canRemove: boolean;
}

function SectionPanel({
  section,
  exam,
  onAddProblem,
  onRemove,
  onUpdateTitle,
  canRemove,
}: SectionPanelProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const removeProblem = useRemoveProblemFromExam();
  const updatePoints = useUpdateProblemPoints();
  const reorderProblems = useReorderProblems();

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      onUpdateTitle(titleValue.trim());
    } else {
      setTitleValue(section.title);
    }
    setEditingTitle(false);
  };

  const handleRemoveProblem = useCallback((problemItemId: string) => {
    removeProblem.mutate({ examId: exam.id, problemItemId });
  }, [exam.id, removeProblem]);

  const handlePointsChange = useCallback((problemItemId: string, points: number) => {
    updatePoints.mutate({ examId: exam.id, problemItemId, points });
  }, [exam.id, updatePoints]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newOrder = [...section.problems];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderProblems.mutate({
      examId: exam.id,
      sectionId: section.id,
      problemItemIds: newOrder.map(p => p.id),
    });
  }, [exam.id, section.id, section.problems, reorderProblems]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === section.problems.length - 1) return;
    const newOrder = [...section.problems];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderProblems.mutate({
      examId: exam.id,
      sectionId: section.id,
      problemItemIds: newOrder.map(p => p.id),
    });
  }, [exam.id, section.id, section.problems, reorderProblems]);

  const sectionPoints = section.problems.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className="bg-white rounded-2xl border border-grey-100 shadow-sm overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="px-5 py-4 bg-grey-50 border-b border-grey-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-grey-200 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-grey-500" />
            ) : (
              <ChevronUp className="w-5 h-5 text-grey-500" />
            )}
          </button>

          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                className="px-3 py-1 border rounded-lg font-medium"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') {
                    setTitleValue(section.title);
                    setEditingTitle(false);
                  }
                }}
              />
              <button
                onClick={handleTitleSave}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="font-semibold text-grey-900 hover:text-blue-600 flex items-center gap-1"
            >
              {section.title}
              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
            </button>
          )}

          <div className="flex items-center gap-2 text-sm text-grey-500">
            <span>{section.problems.length}문제</span>
            <span>·</span>
            <span>{sectionPoints}점</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddProblem}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600
              bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            문제 추가
          </button>
          {canRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 text-grey-400 hover:text-red-500 hover:bg-red-50 rounded-lg
                transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 문제 목록 */}
      <AnimatePresence mode="popLayout">
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-4 space-y-3"
          >
            {section.problems.length === 0 ? (
              <div className="py-8 text-center text-grey-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-grey-300" />
                <p>문제가 없습니다</p>
                <button
                  onClick={onAddProblem}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  문제 추가하기
                </button>
              </div>
            ) : (
              section.problems.map((item, index) => (
                <ProblemItemCard
                  key={item.id}
                  item={item}
                  sectionId={section.id}
                  examId={exam.id}
                  onRemove={() => handleRemoveProblem(item.id)}
                  onPointsChange={(points) => handlePointsChange(item.id, points)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  isFirst={index === 0}
                  isLast={index === section.problems.length - 1}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 문제 추가 모달
interface AddProblemModalProps {
  open: boolean;
  onClose: () => void;
  examId: string;
  sectionId: string;
  existingProblemIds: string[];
}

function AddProblemModal({ open, onClose, examId, sectionId, existingProblemIds }: AddProblemModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState(5);

  const { data: problemsData, isLoading } = useProblems({
    pageSize: 50,
    filter: searchQuery ? { searchQuery } : undefined,
  });

  const addProblem = useAddProblemToExam();

  const availableProblems = useMemo(() => {
    const existingSet = new Set(existingProblemIds);
    return (problemsData?.items || []).filter(p => !existingSet.has(p.id));
  }, [problemsData?.items, existingProblemIds]);

  const handleToggle = (problemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    for (const problemId of selectedIds) {
      await addProblem.mutateAsync({
        examId,
        data: { problemId, sectionId, points },
      });
    }
    onClose();
    setSelectedIds(new Set());
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl shadow-xl mx-4
          flex flex-col overflow-hidden"
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-grey-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-grey-900">문제 추가</h2>
          <button onClick={onClose} className="p-2 hover:bg-grey-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색 */}
        <div className="px-6 py-4 border-b border-grey-100">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문제 검색..."
                className="w-full pl-10 pr-4 py-2 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-grey-600">배점:</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value, 10) || 5)}
                className="w-16 px-2 py-2 border rounded-lg text-center"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* 문제 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : availableProblems.length === 0 ? (
            <div className="text-center py-12 text-grey-500">
              추가할 수 있는 문제가 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {availableProblems.map((problem) => {
                const isSelected = selectedIds.has(problem.id);
                const imageUrl = problem.content.thumbnailUrl || problem.content.imageUrl;
                const fullUrl = imageUrl?.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;

                return (
                  <button
                    key={problem.id}
                    onClick={() => handleToggle(problem.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-grey-100 hover:border-grey-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-grey-300'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>

                    <div className="w-12 h-12 bg-grey-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={fullUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-grey-900 truncate">
                        {problem.source.name}
                      </div>
                      <div className="text-xs text-grey-500">
                        {/* Phase 62-A: fullPath 또는 gradeName 사용 */}
                        {problem.classification?.fullPath || problem.classification?.gradeName || '미분류'}
                        {' · '}
                        난이도 {problem.difficulty}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-grey-100 flex items-center justify-between bg-grey-50">
          <div className="text-sm text-grey-600">
            {selectedIds.size}개 선택됨
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-grey-600 bg-grey-100 rounded-xl font-medium
                hover:bg-grey-200 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || addProblem.isPending}
              className="px-4 py-2 text-white bg-blue-500 rounded-xl font-medium
                hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {addProblem.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              추가하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// 메인 페이지
export function ExamEditorPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [addProblemSection, setAddProblemSection] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const { data: exam, isLoading, error } = useExamPaper(examId);
  const updateExam = useUpdateExamPaper();
  const updateStatus = useUpdateExamStatus();
  const addSection = useAddSection();
  const removeSection = useRemoveSection();
  const updateSection = useUpdateSection();

  // 기존 문제 ID 목록
  const existingProblemIds = useMemo(() => {
    if (!exam) return [];
    return exam.sections.flatMap(s => s.problems.map(p => p.problemId));
  }, [exam]);

  // 섹션 추가
  const handleAddSection = useCallback(() => {
    if (!examId) return;
    addSection.mutate({
      examId,
      title: `섹션 ${(exam?.sections.length || 0) + 1}`,
    });
  }, [examId, exam?.sections.length, addSection]);

  // 섹션 삭제
  const handleRemoveSection = useCallback((sectionId: string) => {
    if (!examId) return;
    if (!confirm('섹션을 삭제하시겠습니까? 포함된 문제도 모두 제거됩니다.')) return;
    removeSection.mutate({ examId, sectionId });
  }, [examId, removeSection]);

  // 섹션 제목 수정
  const handleUpdateSectionTitle = useCallback((sectionId: string, title: string) => {
    if (!examId) return;
    updateSection.mutate({ examId, sectionId, data: { title } });
  }, [examId, updateSection]);

  // 상태 변경
  const handleStatusChange = useCallback((status: ExamPaperStatus) => {
    if (!examId) return;
    updateStatus.mutate({ examId, status });
  }, [examId, updateStatus]);

  // 설정 저장
  const handleSaveSettings = useCallback((settings: ExamPaperSettings) => {
    if (!examId) return;
    updateExam.mutate(
      { id: examId, data: { settings } },
      {
        onSuccess: () => {
          setShowSettingsModal(false);
        },
      }
    );
  }, [examId, updateExam]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-grey-900 mb-2">시험지를 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/exam-builder')}
            className="text-blue-600 hover:underline"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = statusConfig[exam.status].icon;

  return (
    <div className="min-h-screen bg-grey-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-grey-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/exam-builder')}
                className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-xl font-bold text-grey-900">{exam.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-grey-500">
                  <span>{exam.totalProblems}문제</span>
                  <span>·</span>
                  <span>{exam.totalPoints}점</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 상태 변경 */}
              <div className="relative group">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    border ${statusConfig[exam.status].color}`}
                >
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig[exam.status].label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg
                  border border-grey-100 py-1 opacity-0 invisible group-hover:opacity-100
                  group-hover:visible transition-all">
                  {(['draft', 'ready', 'archived'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2
                        hover:bg-grey-50 ${exam.status === status ? 'text-blue-600' : 'text-grey-700'}`}
                    >
                      {React.createElement(statusConfig[status].icon, { className: 'w-4 h-4' })}
                      {statusConfig[status].label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-grey-600 bg-grey-100
                  rounded-xl font-medium hover:bg-grey-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
                미리보기
              </button>

              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-500
                  rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                설정
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* 섹션 목록 */}
        {exam.sections.map((section) => (
          <SectionPanel
            key={section.id}
            section={section}
            exam={exam}
            onAddProblem={() => setAddProblemSection(section.id)}
            onRemove={() => handleRemoveSection(section.id)}
            onUpdateTitle={(title) => handleUpdateSectionTitle(section.id, title)}
            canRemove={exam.sections.length > 1}
          />
        ))}

        {/* 섹션 추가 버튼 */}
        <button
          onClick={handleAddSection}
          className="w-full py-4 border-2 border-dashed border-grey-200 rounded-2xl
            text-grey-500 hover:border-blue-300 hover:text-blue-500 transition-colors
            flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          새 섹션 추가
        </button>
      </div>

      {/* 문제 추가 모달 */}
      <AnimatePresence>
        {addProblemSection && (
          <AddProblemModal
            open={!!addProblemSection}
            onClose={() => setAddProblemSection(null)}
            examId={exam.id}
            sectionId={addProblemSection}
            existingProblemIds={existingProblemIds}
          />
        )}
      </AnimatePresence>

      {/* 설정 모달 */}
      <AnimatePresence>
        {showSettingsModal && (
          <ExamSettingsModal
            open={showSettingsModal}
            settings={exam.settings}
            onClose={() => setShowSettingsModal(false)}
            onSave={handleSaveSettings}
            isSaving={updateExam.isPending}
          />
        )}
      </AnimatePresence>

      {/* 미리보기 모달 */}
      <AnimatePresence>
        {showPreviewModal && (
          <ExamPreviewModal
            open={showPreviewModal}
            exam={exam}
            onClose={() => setShowPreviewModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExamEditorPage;
