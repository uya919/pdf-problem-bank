/**
 * 작업 세션 설정 페이지 (Phase 32-E)
 *
 * Step 2: 해설 문서 설정
 * - 해설 문서 선택
 * - 매칭 시작
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
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useDocuments } from '@/hooks/useDocuments';
import { useWorkSessionStore } from '@/stores/workSessionStore';

export function WorkSessionSetupPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [selectedSolutionDocId, setSelectedSolutionDocId] = useState<string | null>(null);

  const { currentSession, isLoading, error, loadSession, updateSession } =
    useWorkSessionStore();
  const { data: documents } = useDocuments();

  // 세션 로드
  useEffect(() => {
    if (sessionId && !currentSession) {
      loadSession(sessionId);
    }
  }, [sessionId, currentSession, loadSession]);

  // 기존 해설 문서 설정 복원
  useEffect(() => {
    if (currentSession?.solutionDocumentId) {
      setSelectedSolutionDocId(currentSession.solutionDocumentId);
    }
  }, [currentSession?.solutionDocumentId]);

  // 이전 단계로 돌아가기
  const handlePrevStep = async () => {
    if (!currentSession) return;
    await updateSession({ step: 'labeling' });
    navigate(`/work/${sessionId}/labeling`);
  };

  // 매칭 시작
  const handleStartMatching = async () => {
    if (!currentSession || !selectedSolutionDocId) return;

    const solutionDoc = documents?.find((d) => d.document_id === selectedSolutionDocId);

    await updateSession({
      solutionDocumentId: selectedSolutionDocId,
      solutionDocumentName: solutionDoc?.document_id || selectedSolutionDocId,
      step: 'matching',
    });

    navigate(`/work/${sessionId}/matching`);
  };

  // 로딩 상태
  if (isLoading) {
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

  // 문제 문서를 제외한 문서 목록
  const availableDocuments = documents?.filter(
    (d) => d.document_id !== currentSession.problemDocumentId
  );

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
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full">
                  Step 2: 해설 설정
                </span>
              </div>
              <p className="text-sm text-grey-500">
                {currentSession.problems.length}개 문제 등록됨
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handlePrevStep}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              이전: 문제 라벨링
            </Button>
            <Button
              variant="solid"
              size="sm"
              onClick={handleStartMatching}
              disabled={!selectedSolutionDocId}
            >
              매칭 시작
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-green-600">
            <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
            </div>
            <span>문제 라벨링</span>
          </div>
          <div className="w-8 h-px bg-green-300" />
          <div className="flex items-center gap-1.5 text-amber-600">
            <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
              2
            </div>
            <span className="font-medium">해설 설정</span>
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
      <main className="flex-1 overflow-auto bg-grey-50">
        <div className="max-w-2xl mx-auto py-12 px-6">
          {/* Problem Document Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-grey-200 p-6 mb-8"
          >
            <h2 className="text-sm font-medium text-grey-500 mb-3">문제 문서</h2>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-grey-900">
                  {currentSession.problemDocumentId}
                </p>
                <p className="text-sm text-grey-500">
                  {currentSession.problems.length}개 문제 등록됨
                </p>
              </div>
            </div>
          </motion.div>

          {/* Solution Document Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-grey-900 mb-4">
              해설 문서를 선택하세요
            </h2>

            {availableDocuments?.length === 0 ? (
              <div className="bg-white rounded-xl border border-grey-200 p-8 text-center">
                <FileText className="w-12 h-12 text-grey-300 mx-auto mb-4" />
                <p className="text-grey-600 mb-2">사용 가능한 해설 문서가 없습니다</p>
                <p className="text-sm text-grey-400">
                  먼저 해설 PDF를 업로드해주세요
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableDocuments?.map((doc) => (
                  <label
                    key={doc.document_id}
                    className={`flex items-center gap-4 p-4 bg-white rounded-xl border cursor-pointer transition-all ${
                      selectedSolutionDocId === doc.document_id
                        ? 'border-toss-blue ring-2 ring-toss-blue/20'
                        : 'border-grey-200 hover:border-grey-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="solutionDoc"
                      checked={selectedSolutionDocId === doc.document_id}
                      onChange={() => setSelectedSolutionDocId(doc.document_id)}
                      className="sr-only"
                    />
                    <div
                      className={`p-2.5 rounded-lg ${
                        selectedSolutionDocId === doc.document_id
                          ? 'bg-toss-blue/10'
                          : 'bg-grey-100'
                      }`}
                    >
                      <FileText
                        className={`w-5 h-5 ${
                          selectedSolutionDocId === doc.document_id
                            ? 'text-toss-blue'
                            : 'text-grey-400'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-grey-900">{doc.document_id}</p>
                      <p className="text-sm text-grey-500">{doc.total_pages}페이지</p>
                    </div>
                    {selectedSolutionDocId === doc.document_id && (
                      <CheckCircle className="w-5 h-5 text-toss-blue" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </motion.div>

          {/* Action */}
          {selectedSolutionDocId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <Button variant="solid" size="lg" onClick={handleStartMatching}>
                매칭 시작하기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-grey-500 mt-3">
                문제와 해설을 하나씩 연결합니다
              </p>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
