/**
 * Problem Modal Component (Phase 6-5)
 *
 * Full-screen modal for viewing problem images and details
 * Phase 57-D: 해설 이미지 통합 표시
 */
import { useState, useEffect } from 'react';
import { X, Download, Trash2, Tag, FileText, Calendar, BookOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './Badge';
import { Button } from './Button';
import { LazyImage } from './LazyImage';
import { api } from '../../api/client';

// Phase 57-D: 해설 연결 정보 타입
interface SolutionLink {
  document_id: string;
  page_index: number;
  group_id: string;
  image_path: string | null;
}

interface ProblemModalProps {
  problem: {
    problem_id: string;
    document_id: string;
    page_index: number;
    group_id: string;
    image_path: string;
    created_at?: number;
  } | null;
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (problemId: string) => void;
}

export function ProblemModal({
  problem,
  imageUrl,
  isOpen,
  onClose,
  onDelete,
}: ProblemModalProps) {
  // Phase 57-D: 해설 연결 상태
  const [solutionLink, setSolutionLink] = useState<SolutionLink | null>(null);
  const [isLoadingSolution, setIsLoadingSolution] = useState(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'solution'>('problem');

  // Phase 57-D: 문제가 변경되면 해설 정보 조회
  useEffect(() => {
    if (isOpen && problem) {
      setIsLoadingSolution(true);
      setSolutionLink(null);
      setActiveTab('problem');

      api.getProblemSolutionLink(
        problem.document_id,
        problem.page_index,
        problem.group_id
      )
        .then((result) => {
          if (result.has_solution && result.solution) {
            setSolutionLink(result.solution);
          }
        })
        .catch((error) => {
          console.error('해설 연결 조회 실패:', error);
        })
        .finally(() => {
          setIsLoadingSolution(false);
        });
    }
  }, [isOpen, problem?.document_id, problem?.page_index, problem?.group_id]);

  if (!problem) return null;

  const handleDownload = () => {
    window.open(imageUrl, '_blank');
  };

  const handleDelete = () => {
    if (onDelete && confirm(`문제 '${problem.problem_id}'를 삭제하시겠습니까?`)) {
      onDelete(problem.problem_id);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '알 수 없음';
    return new Date(timestamp * 1000).toLocaleString('ko-KR');
  };

  // Phase 57-D: 해설 이미지 URL 생성
  const solutionImageUrl = solutionLink?.image_path
    ? api.getProblemImageUrl(solutionLink.document_id, solutionLink.image_path)
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{problem.problem_id}</h2>
                  <div className="flex items-center gap-2 text-sm text-emerald-100">
                    <span>그룹: {problem.group_id}</span>
                    {/* Phase 57-D: 해설 연결 뱃지 */}
                    {isLoadingSolution ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : solutionLink ? (
                      <span className="bg-purple-500/30 px-2 py-0.5 rounded text-xs">
                        해설 연결됨
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  className="bg-red-500/20 border-red-400/30 text-white hover:bg-red-500/30 backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </Button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Phase 57-D: 탭 (해설이 있을 때만) */}
            {solutionLink && (
              <div className="flex border-b border-grey-200">
                <button
                  onClick={() => setActiveTab('problem')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'problem'
                      ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                      : 'text-grey-600 hover:text-grey-900 hover:bg-grey-50'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  문제
                </button>
                <button
                  onClick={() => setActiveTab('solution')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'solution'
                      ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      : 'text-grey-600 hover:text-grey-900 hover:bg-grey-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4 inline mr-2" />
                  해설
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Image */}
                <div className="lg:col-span-2 flex items-center justify-center bg-grey-100 rounded-xl p-6">
                  {activeTab === 'problem' ? (
                    <LazyImage
                      src={imageUrl}
                      alt={problem.problem_id}
                      className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                      rootMargin="0px"
                      threshold={0.1}
                    />
                  ) : solutionImageUrl ? (
                    <LazyImage
                      src={solutionImageUrl}
                      alt="해설"
                      className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                      rootMargin="0px"
                      threshold={0.1}
                    />
                  ) : (
                    <div className="text-grey-500 text-center">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 text-grey-300" />
                      <p>해설 이미지를 불러올 수 없습니다</p>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="bg-gradient-to-br from-grey-50 to-grey-100 rounded-xl p-6 border border-grey-200">
                    <h3 className="text-sm font-semibold text-grey-700 uppercase mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      {activeTab === 'problem' ? '문제 정보' : '해설 정보'}
                    </h3>
                    <div className="space-y-4">
                      {activeTab === 'problem' ? (
                        <>
                          {/* Problem ID */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              문제 ID
                            </label>
                            <p className="mt-1 text-sm font-medium text-grey-900 break-all">
                              {problem.problem_id}
                            </p>
                          </div>

                          {/* Document ID */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              문서 ID
                            </label>
                            <p className="mt-1 text-sm font-medium text-grey-900 break-all">
                              {problem.document_id}
                            </p>
                          </div>

                          {/* Page */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              페이지
                            </label>
                            <div className="mt-1">
                              <Badge variant="primary">P{problem.page_index + 1}</Badge>
                            </div>
                          </div>

                          {/* Group */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              그룹 ID
                            </label>
                            <p className="mt-1 text-sm font-medium text-grey-900">
                              {problem.group_id}
                            </p>
                          </div>

                          {/* Created At */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              생성 시간
                            </label>
                            <p className="mt-1 text-sm text-grey-700">
                              {formatDate(problem.created_at)}
                            </p>
                          </div>

                          {/* Image Path */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              이미지 경로
                            </label>
                            <p className="mt-1 text-xs text-grey-600 break-all font-mono bg-grey-200 p-2 rounded">
                              {problem.image_path}
                            </p>
                          </div>
                        </>
                      ) : solutionLink ? (
                        <>
                          {/* Solution Document ID */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              해설 문서 ID
                            </label>
                            <p className="mt-1 text-sm font-medium text-grey-900 break-all">
                              {solutionLink.document_id}
                            </p>
                          </div>

                          {/* Solution Page */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              해설 페이지
                            </label>
                            <div className="mt-1">
                              <Badge variant="primary">P{solutionLink.page_index + 1}</Badge>
                            </div>
                          </div>

                          {/* Solution Group */}
                          <div>
                            <label className="text-xs font-medium text-grey-500 uppercase">
                              해설 그룹 ID
                            </label>
                            <p className="mt-1 text-sm font-medium text-grey-900">
                              {solutionLink.group_id}
                            </p>
                          </div>

                          {/* Solution Image Path */}
                          {solutionLink.image_path && (
                            <div>
                              <label className="text-xs font-medium text-grey-500 uppercase">
                                해설 이미지 경로
                              </label>
                              <p className="mt-1 text-xs text-grey-600 break-all font-mono bg-grey-200 p-2 rounded">
                                {solutionLink.image_path}
                              </p>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-sm font-semibold text-grey-700 uppercase mb-4">
                      빠른 작업
                    </h3>
                    <div className="space-y-3">
                      <Button
                        onClick={handleDownload}
                        variant="outline"
                        className="w-full justify-start"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        이미지 다운로드
                      </Button>
                      <Button
                        onClick={handleDelete}
                        variant="outline"
                        className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        문제 삭제
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-grey-200 bg-grey-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-grey-600">
                  ESC 키를 눌러 닫기
                </p>
                <Button onClick={onClose} variant="outline" size="sm">
                  닫기
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
