/**
 * 시험지 빌더 페이지
 *
 * Phase 21+ D-2: 시험지 생성 UI
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FileText,
  Trash2,
  Copy,
  Settings,
  ChevronRight,
  Clock,
  CheckCircle,
  Archive,
  MoreVertical,
  Search,
  Loader2,
} from 'lucide-react';
import {
  useExamPapers,
  useCreateExamPaper,
  useDeleteExamPaper,
  useDuplicateExamPaper,
} from '../api/examPapers';
import type { ExamPaper, ExamPaperStatus } from '../types/examPaper';
import { useNavigate } from 'react-router-dom';

// 상태별 아이콘 및 색상
const statusConfig: Record<ExamPaperStatus, { icon: typeof Clock; color: string; label: string }> = {
  draft: { icon: Clock, color: 'text-yellow-500 bg-yellow-50', label: '작성 중' },
  ready: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: '완료' },
  archived: { icon: Archive, color: 'text-grey-500 bg-grey-50', label: '보관' },
};

// 시험지 카드 컴포넌트
interface ExamPaperCardProps {
  exam: ExamPaper;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ExamPaperCard({ exam, onOpen, onDuplicate, onDelete }: ExamPaperCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const StatusIcon = statusConfig[exam.status].icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl border border-grey-100 shadow-sm hover:shadow-md
        transition-shadow overflow-hidden group"
    >
      {/* 카드 헤더 */}
      <div
        onClick={onOpen}
        className="p-5 cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-grey-900 group-hover:text-blue-600 transition-colors">
                {exam.name}
              </h3>
              <p className="text-xs text-grey-500 mt-0.5">
                {new Date(exam.updatedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>

          {/* 더보기 메뉴 */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1.5 rounded-lg text-grey-400 hover:text-grey-600 hover:bg-grey-100
                opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg
                  border border-grey-100 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-grey-700 hover:bg-grey-50
                      flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    복제
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('시험지를 삭제하시겠습니까?')) {
                        onDelete();
                      }
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50
                      flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 설명 */}
        {exam.description && (
          <p className="text-sm text-grey-600 mb-3 line-clamp-2">
            {exam.description}
          </p>
        )}

        {/* 통계 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-grey-500">문제</span>
            <span className="font-medium text-grey-900">{exam.totalProblems}개</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-grey-500">배점</span>
            <span className="font-medium text-grey-900">{exam.totalPoints}점</span>
          </div>
        </div>
      </div>

      {/* 카드 푸터 */}
      <div className="px-5 py-3 bg-grey-50 border-t border-grey-100 flex items-center justify-between">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[exam.status].color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig[exam.status].label}
        </div>

        <button
          onClick={onOpen}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          편집
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// 새 시험지 생성 모달
interface CreateExamModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  isCreating: boolean;
}

function CreateExamModal({ open, onClose, onCreate, isCreating }: CreateExamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim() || undefined);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-6 mx-4"
      >
        <h2 className="text-xl font-bold text-grey-900 mb-4">새 시험지 만들기</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1">
              시험지 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2024학년도 1학기 중간고사"
              className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-grey-700 mb-1">
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="시험지에 대한 메모..."
              rows={3}
              className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1 px-4 py-2.5 text-grey-600 bg-grey-100 rounded-xl
                font-medium hover:bg-grey-200 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex-1 px-4 py-2.5 text-white bg-blue-500 rounded-xl
                font-medium hover:bg-blue-600 transition-colors disabled:opacity-50
                flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                '생성하기'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// 메인 페이지
export function ExamBuilderPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamPaperStatus | 'all'>('all');

  // API 쿼리
  const { data: examsData, isLoading } = useExamPapers({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const createExam = useCreateExamPaper();
  const deleteExam = useDeleteExamPaper();
  const duplicateExam = useDuplicateExamPaper();

  // 새 시험지 생성
  const handleCreate = useCallback((name: string, description?: string) => {
    createExam.mutate(
      { name, description },
      {
        onSuccess: (exam) => {
          setShowCreateModal(false);
          navigate(`/exam-builder/${exam.id}`);
        },
      }
    );
  }, [createExam, navigate]);

  // 시험지 열기
  const handleOpen = useCallback((exam: ExamPaper) => {
    navigate(`/exam-builder/${exam.id}`);
  }, [navigate]);

  // 시험지 복제
  const handleDuplicate = useCallback((exam: ExamPaper) => {
    duplicateExam.mutate({ examId: exam.id });
  }, [duplicateExam]);

  // 시험지 삭제
  const handleDelete = useCallback((exam: ExamPaper) => {
    deleteExam.mutate(exam.id);
  }, [deleteExam]);

  // 필터링
  const filteredExams = (examsData?.items || []).filter((exam) => {
    if (!searchQuery) return true;
    return exam.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-grey-50/50">
      {/* 헤더 */}
      <div className="bg-white border-b border-grey-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-grey-900">시험지 빌더</h1>
              <p className="text-sm text-grey-500 mt-1">
                문제은행에서 문제를 선택하여 시험지를 만드세요
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-xl
                font-medium hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              새 시험지
            </button>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex items-center gap-4 mt-6">
            {/* 검색 */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="시험지 검색..."
                className="w-full pl-10 pr-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 상태 필터 */}
            <div className="flex items-center gap-2">
              {(['all', 'draft', 'ready', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-500 text-white'
                      : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                  }`}
                >
                  {status === 'all' ? '전체' : statusConfig[status].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-grey-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-grey-400" />
            </div>
            <h3 className="text-lg font-medium text-grey-900 mb-2">
              {searchQuery ? '검색 결과가 없습니다' : '시험지가 없습니다'}
            </h3>
            <p className="text-grey-500 mb-6">
              {searchQuery
                ? '다른 검색어로 시도해보세요'
                : '첫 번째 시험지를 만들어보세요'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-blue-500 text-white rounded-xl font-medium
                  hover:bg-blue-600 transition-colors"
              >
                시험지 만들기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredExams.map((exam) => (
                <ExamPaperCard
                  key={exam.id}
                  exam={exam}
                  onOpen={() => handleOpen(exam)}
                  onDuplicate={() => handleDuplicate(exam)}
                  onDelete={() => handleDelete(exam)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 새 시험지 모달 */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateExamModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate}
            isCreating={createExam.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExamBuilderPage;
