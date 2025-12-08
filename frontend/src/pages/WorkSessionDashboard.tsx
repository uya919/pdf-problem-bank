/**
 * 작업 세션 대시보드 (Phase 32 → Phase 33)
 *
 * Phase 33: 통합 워크플로우 진입점
 * - 세션 목록 표시
 * - 새 세션 생성 (문제+해설 동시 선택)
 * - 기존 세션 재개
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle,
  Trash2,
  Play,
  BookOpen,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useWorkSessionStore } from '@/stores/workSessionStore';
import { useDocuments } from '@/hooks/useDocuments';
import type { WorkSession } from '@/api/client';

// 단계별 색상/아이콘
const STEP_CONFIG = {
  labeling: {
    label: '문제 라벨링',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: BookOpen,
  },
  setup: {
    label: '해설 설정',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    icon: FileText,
  },
  matching: {
    label: '매칭 작업',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    icon: LinkIcon,
  },
  completed: {
    label: '완료',
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: CheckCircle,
  },
};

export function WorkSessionDashboard() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProblemDocId, setSelectedProblemDocId] = useState<string | null>(null);
  const [selectedSolutionDocId, setSelectedSolutionDocId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { sessions, sessionsLoading, fetchSessions, createSession, deleteSession, loadSession } =
    useWorkSessionStore();
  const { data: documents } = useDocuments();

  // 세션 목록 로드
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 새 세션 생성 (Phase 33: 양쪽 문서 필수)
  const handleCreateSession = async () => {
    if (!selectedProblemDocId || !selectedSolutionDocId) return;

    const problemDoc = documents?.find((d) => d.document_id === selectedProblemDocId);
    const solutionDoc = documents?.find((d) => d.document_id === selectedSolutionDocId);
    try {
      const session = await createSession({
        problemDocumentId: selectedProblemDocId,
        problemDocumentName: problemDoc?.document_id || selectedProblemDocId,
        solutionDocumentId: selectedSolutionDocId,
        solutionDocumentName: solutionDoc?.document_id || selectedSolutionDocId,
        name: sessionName || undefined,
      });
      setShowCreateModal(false);
      setSelectedProblemDocId(null);
      setSelectedSolutionDocId(null);
      setSessionName('');
      // Phase 33: 통합 캔버스로 이동
      navigate(`/work/${session.sessionId}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  // 세션 재개 (Phase 33: 모든 단계에서 통합 캔버스로 이동)
  const handleResumeSession = async (session: WorkSession) => {
    await loadSession(session.sessionId);
    // Phase 33: 통합 캔버스로 이동
    navigate(`/work/${session.sessionId}`);
  };

  // 세션 삭제
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  // 진행률 계산
  const getProgress = (session: WorkSession) => {
    const total = session.problems.length;
    const linked = session.links.length;
    return total > 0 ? Math.round((linked / total) * 100) : 0;
  };

  // 시간 포맷
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="min-h-full bg-grey-50">
      {/* Header */}
      <header className="bg-white border-b border-grey-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-grey-900">작업 세션</h1>
            <p className="text-sm text-grey-500">문제 라벨링부터 해설 매칭까지</p>
          </div>
          <Button variant="solid" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />새 세션 시작
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 bg-grey-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-grey-400" />
            </div>
            <h2 className="text-lg font-semibold text-grey-900 mb-2">아직 세션이 없어요</h2>
            <p className="text-grey-600 mb-6">
              새 세션을 시작하여 문제 라벨링을 시작하세요
            </p>
            <Button variant="solid" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />새 세션 시작
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Active Sessions */}
            {sessions.filter((s) => s.status === 'active').length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-grey-500 mb-3">진행 중</h2>
                <div className="space-y-3">
                  {sessions
                    .filter((s) => s.status === 'active')
                    .map((session) => {
                      const stepConfig = STEP_CONFIG[session.step];
                      const StepIcon = stepConfig.icon;
                      const progress = getProgress(session);

                      return (
                        <motion.div
                          key={session.sessionId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white rounded-xl border border-grey-200 p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${stepConfig.bg}`}>
                                  <StepIcon className={`w-4 h-4 ${stepConfig.color}`} />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-medium text-grey-900 truncate">
                                    {session.name || session.problemDocumentId}
                                  </h3>
                                  <p className="text-sm text-grey-500 truncate">
                                    {session.problemDocumentId}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <span className={`${stepConfig.color}`}>{stepConfig.label}</span>
                                <span className="text-grey-400">·</span>
                                <span className="text-grey-500">
                                  {session.problems.length}개 문제
                                </span>
                                {session.step !== 'labeling' && (
                                  <>
                                    <span className="text-grey-400">·</span>
                                    <span className="text-grey-500">{progress}% 연결</span>
                                  </>
                                )}
                                <span className="text-grey-400">·</span>
                                <span className="text-grey-400 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatTime(session.updatedAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              {deleteConfirm === session.sessionId ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    취소
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteSession(session.sessionId)}
                                  >
                                    삭제
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-grey-400 hover:text-red-600"
                                    onClick={() => setDeleteConfirm(session.sessionId)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="solid"
                                    size="sm"
                                    onClick={() => handleResumeSession(session)}
                                  >
                                    <Play className="w-4 h-4 mr-1.5" />
                                    재개
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {session.problems.length > 0 && session.step !== 'labeling' && (
                            <div className="mt-3 pt-3 border-t border-grey-100">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-grey-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-toss-blue rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-grey-500 whitespace-nowrap">
                                  {session.links.length}/{session.problems.length}
                                </span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                </div>
              </section>
            )}

            {/* Completed Sessions */}
            {sessions.filter((s) => s.status === 'completed').length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-medium text-grey-500 mb-3">완료됨</h2>
                <div className="space-y-2">
                  {sessions
                    .filter((s) => s.status === 'completed')
                    .map((session) => (
                      <div
                        key={session.sessionId}
                        className="bg-white rounded-lg border border-grey-200 p-3 flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-grey-700">
                            {session.name || session.problemDocumentId}
                          </span>
                          <span className="text-grey-400">
                            {session.problems.length}개 문제, {session.links.length}개 연결
                          </span>
                        </div>
                        <span className="text-grey-400">{formatTime(session.updatedAt)}</span>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
          >
            <h2 className="text-lg font-semibold text-grey-900 mb-4">새 세션 시작</h2>

            <div className="space-y-4">
              {/* Session Name */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  세션 이름 (선택)
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="예: 수학의 바이블 1단원"
                  className="w-full px-3 py-2 border border-grey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue"
                />
              </div>

              {/* Phase 33: 양쪽 문서 선택 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 문제 문서 선택 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    📄 문제 문서
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-grey-200 rounded-lg p-2">
                    {documents?.length === 0 ? (
                      <p className="text-xs text-grey-500 py-2 text-center">
                        문서 없음
                      </p>
                    ) : (
                      documents?.map((doc) => {
                        const isSelected = selectedProblemDocId === doc.document_id;
                        const isDisabled = selectedSolutionDocId === doc.document_id;
                        return (
                          <button
                            key={doc.document_id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedProblemDocId(isSelected ? null : doc.document_id)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-toss-blue/10 border border-toss-blue'
                                : isDisabled
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-grey-50'
                            }`}
                          >
                            <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-toss-blue' : 'text-grey-400'}`} />
                            <span className={`text-sm truncate ${isSelected ? 'text-toss-blue font-medium' : 'text-grey-700'}`}>
                              {doc.document_id}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 해설 문서 선택 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    📖 해설 문서
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-grey-200 rounded-lg p-2">
                    {documents?.length === 0 ? (
                      <p className="text-xs text-grey-500 py-2 text-center">
                        문서 없음
                      </p>
                    ) : (
                      documents?.map((doc) => {
                        const isSelected = selectedSolutionDocId === doc.document_id;
                        const isDisabled = selectedProblemDocId === doc.document_id;
                        return (
                          <button
                            key={doc.document_id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedSolutionDocId(isSelected ? null : doc.document_id)}
                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-purple-100 border border-purple-500'
                                : isDisabled
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-grey-50'
                            }`}
                          >
                            <BookOpen className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-purple-600' : 'text-grey-400'}`} />
                            <span className={`text-sm truncate ${isSelected ? 'text-purple-600 font-medium' : 'text-grey-700'}`}>
                              {doc.document_id}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedProblemDocId(null);
                  setSelectedSolutionDocId(null);
                  setSessionName('');
                }}
              >
                취소
              </Button>
              <Button
                variant="solid"
                className="flex-1"
                disabled={!selectedProblemDocId || !selectedSolutionDocId}
                onClick={handleCreateSession}
              >
                시작하기
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
