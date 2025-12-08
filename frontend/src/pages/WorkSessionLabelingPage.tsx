/**
 * 작업 세션 라벨링 페이지 (Phase 32-E)
 *
 * Step 1: 문제 라벨링
 * - 문제 문서에서 그룹 생성 시 세션에 자동 등록
 * - 세션 상태는 백엔드에 영속화
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  CheckCircle,
  AlertCircle,
  List,
} from 'lucide-react';
import { PageViewer } from './PageViewer';
import { Button } from '@/components/ui';
import { useDocument } from '@/hooks/useDocuments';
import { useWorkSessionStore } from '@/stores/workSessionStore';

export function WorkSessionLabelingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [showProblemList, setShowProblemList] = useState(true);

  const {
    currentSession,
    isLoading,
    error,
    loadSession,
    updateSession,
    syncProblems,
    removeProblem,
  } = useWorkSessionStore();

  // 세션 로드
  useEffect(() => {
    if (sessionId && !currentSession) {
      loadSession(sessionId);
    }
  }, [sessionId, currentSession, loadSession]);

  // 문서 정보 조회
  const { data: document, isLoading: docLoading } = useDocument(
    currentSession?.problemDocumentId || ''
  );

  // 다음 단계로 이동
  const handleNextStep = async () => {
    if (!currentSession) return;

    // groups.json에서 문제 동기화
    await syncProblems();

    // 세션 단계 업데이트
    await updateSession({ step: 'setup' });

    // 해설 설정 페이지로 이동
    navigate(`/work/${sessionId}/setup`);
  };

  // 로딩 상태
  if (isLoading || docLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-grey-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !currentSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-grey-900 mb-2">
            세션을 찾을 수 없습니다
          </h2>
          <p className="text-grey-600 mb-6">{error || '세션이 존재하지 않습니다'}</p>
          <Button variant="solid" onClick={() => navigate('/work')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 bg-white border-b border-grey-100 px-6 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/work"
              className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-grey-600" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-grey-900">
                  {currentSession.name || currentSession.problemDocumentId}
                </h1>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                  Step 1: 문제 라벨링
                </span>
              </div>
              <p className="text-sm text-grey-500">
                {document?.total_pages || 0}페이지 · {currentSession.problems.length}개
                문제 등록됨
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProblemList(!showProblemList)}
              className={showProblemList ? 'text-toss-blue' : 'text-grey-500'}
            >
              <List className="w-4 h-4 mr-1.5" />
              문제 목록
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={handleNextStep}
              disabled={currentSession.problems.length === 0}
            >
              다음: 해설 설정
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-toss-blue">
            <div className="w-5 h-5 bg-toss-blue text-white rounded-full flex items-center justify-center text-xs font-medium">
              1
            </div>
            <span className="font-medium">문제 라벨링</span>
          </div>
          <div className="w-8 h-px bg-grey-200" />
          <div className="flex items-center gap-1.5 text-grey-400">
            <div className="w-5 h-5 bg-grey-200 rounded-full flex items-center justify-center text-xs font-medium">
              2
            </div>
            <span>해설 설정</span>
          </div>
          <div className="w-8 h-px bg-grey-200" />
          <div className="flex items-center gap-1.5 text-grey-400">
            <div className="w-5 h-5 bg-grey-200 rounded-full flex items-center justify-center text-xs font-medium">
              3
            </div>
            <span>매칭</span>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 overflow-hidden p-4">
          {document && (
            <PageViewer
              documentId={document.document_id}
              totalPages={document.total_pages}
            />
          )}
        </main>

        {/* Problem List Sidebar */}
        {showProblemList && (
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-72 bg-white border-l border-grey-100 overflow-y-auto"
          >
            <div className="p-4 border-b border-grey-100">
              <h2 className="font-medium text-grey-900">
                등록된 문제 ({currentSession.problems.length})
              </h2>
              <p className="text-xs text-grey-500 mt-1">
                캔버스에서 블록을 선택하고 G키로 그룹을 만드세요
              </p>
            </div>

            {currentSession.problems.length === 0 ? (
              <div className="p-6 text-center">
                <FileText className="w-10 h-10 text-grey-300 mx-auto mb-3" />
                <p className="text-sm text-grey-500">아직 등록된 문제가 없어요</p>
              </div>
            ) : (
              <div className="divide-y divide-grey-100">
                {currentSession.problems.map((problem) => (
                  <div
                    key={problem.groupId}
                    className="p-3 hover:bg-grey-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-grey-900 truncate">
                            {problem.problemNumber}번
                          </p>
                          <p className="text-xs text-grey-500">
                            p{problem.pageIndex + 1}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeProblem(problem.groupId)}
                        className="text-grey-400 hover:text-red-500 text-xs"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sync Button */}
            <div className="p-4 border-t border-grey-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => syncProblems()}
              >
                groups.json에서 동기화
              </Button>
            </div>
          </motion.aside>
        )}
      </div>
    </div>
  );
}
