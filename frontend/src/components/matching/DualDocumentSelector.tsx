/**
 * 듀얼 문서 선택기 컴포넌트 (Phase 33-A)
 *
 * 문제와 해설 문서를 리스트에서 동시 선택하여 세션 생성
 * - WorkSessionDashboard 스타일의 리스트 UI
 * - 양쪽 문서 필수 선택
 * - 세션 생성 후 통합 캔버스로 이동
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  BookOpen,
  Link2,
  Play,
  Upload,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDocuments } from '../../hooks/useDocuments';
import { useWorkSessionStore } from '../../stores/workSessionStore';

interface DualDocumentSelectorProps {
  onSessionCreated?: (sessionId: string) => void;
}

export function DualDocumentSelector({ onSessionCreated }: DualDocumentSelectorProps) {
  const navigate = useNavigate();
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { createSession, isLoading: sessionLoading } = useWorkSessionStore();

  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedSolutionId, setSelectedSolutionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');

  // 문서 목록 (PDF만 필터링)
  const pdfDocuments = useMemo(() => {
    return documents?.filter((doc) => doc.document_id.endsWith('.pdf')) || [];
  }, [documents]);

  // 세션 생성 및 이동
  const handleStartWork = useCallback(async () => {
    if (!selectedProblemId || !selectedSolutionId) return;

    try {
      const problemDoc = documents?.find((d) => d.document_id === selectedProblemId);
      const solutionDoc = documents?.find((d) => d.document_id === selectedSolutionId);

      const session = await createSession({
        problemDocumentId: selectedProblemId,
        problemDocumentName: problemDoc?.document_id || selectedProblemId,
        solutionDocumentId: selectedSolutionId,
        solutionDocumentName: solutionDoc?.document_id || selectedSolutionId,
        name: sessionName || undefined,
      });

      onSessionCreated?.(session.sessionId);

      // Phase 33: 통합 캔버스로 이동
      navigate(`/work/${session.sessionId}`);
    } catch (error) {
      console.error('[Phase 33] 세션 생성 실패:', error);
    }
  }, [
    selectedProblemId,
    selectedSolutionId,
    sessionName,
    documents,
    createSession,
    onSessionCreated,
    navigate,
  ]);

  // 문서 선택 핸들러
  const handleSelectProblem = useCallback((docId: string) => {
    setSelectedProblemId((prev) => (prev === docId ? null : docId));
  }, []);

  const handleSelectSolution = useCallback((docId: string) => {
    setSelectedSolutionId((prev) => (prev === docId ? null : docId));
  }, []);

  // 선택 가능 여부 체크 (같은 문서 양쪽 선택 방지)
  const isProblemDisabled = useCallback(
    (docId: string) => docId === selectedSolutionId,
    [selectedSolutionId]
  );

  const isSolutionDisabled = useCallback(
    (docId: string) => docId === selectedProblemId,
    [selectedProblemId]
  );

  // 시작 가능 여부
  const canStart = selectedProblemId && selectedSolutionId && !sessionLoading;

  // 문서 리스트 렌더링
  const renderDocumentList = (
    type: 'problem' | 'solution',
    selectedId: string | null,
    onSelect: (id: string) => void,
    isDisabled: (id: string) => boolean
  ) => {
    const isProblem = type === 'problem';
    const Icon = isProblem ? FileText : BookOpen;
    const label = isProblem ? '문제 문서' : '해설 문서';
    const color = isProblem ? 'toss-blue' : 'purple-600';

    if (documentsLoading) {
      return (
        <div className="h-48 flex items-center justify-center text-grey-400">
          <div className="animate-pulse">문서 목록 로딩 중...</div>
        </div>
      );
    }

    if (pdfDocuments.length === 0) {
      return (
        <div className="h-48 flex flex-col items-center justify-center text-grey-400 gap-2">
          <Upload className="w-8 h-8" />
          <p className="text-sm">등록된 PDF가 없습니다</p>
          <p className="text-xs">아래에서 파일을 업로드하세요</p>
        </div>
      );
    }

    return (
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {pdfDocuments.map((doc) => {
          const isSelected = selectedId === doc.document_id;
          const disabled = isDisabled(doc.document_id);

          return (
            <button
              key={doc.document_id}
              onClick={() => !disabled && onSelect(doc.document_id)}
              disabled={disabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all
                ${
                  isSelected
                    ? `bg-${color}/10 border-2 border-${color}`
                    : disabled
                      ? 'bg-grey-50 opacity-50 cursor-not-allowed'
                      : 'hover:bg-grey-50 border-2 border-transparent'
                }
              `}
            >
              <div
                className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${
                  isSelected
                    ? `border-${color} bg-${color}`
                    : disabled
                      ? 'border-grey-300'
                      : 'border-grey-300'
                }
              `}
              >
                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>

              <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? `text-${color}` : 'text-grey-400'}`} />

              <span
                className={`truncate text-sm ${isSelected ? `text-${color} font-medium` : 'text-grey-700'}`}
              >
                {doc.document_id}
              </span>

              {disabled && (
                <span className="text-xs text-grey-400 ml-auto">다른 쪽에서 선택됨</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Card padding="lg">
      {/* 타이틀 영역 */}
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-5 w-5 text-toss-blue" />
        <h3 className="text-headline-sm text-grey-900">작업 세션 시작</h3>
      </div>
      <p className="text-body-sm text-grey-500 mb-6">
        문제와 해설 문서를 선택하여 새 작업을 시작하세요
      </p>

      {/* 세션 이름 입력 (선택) */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="세션 이름 (선택사항)"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-grey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
        />
      </div>

      {/* 문서 선택 영역 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 문제 문서 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-toss-blue" />
            <span className="text-sm font-medium text-grey-700">문제 문서</span>
            {selectedProblemId && (
              <CheckCircle2 className="w-4 h-4 text-toss-blue ml-auto" />
            )}
          </div>
          <div className="border border-grey-200 rounded-lg p-2">
            {renderDocumentList('problem', selectedProblemId, handleSelectProblem, isProblemDisabled)}
          </div>
        </div>

        {/* 해설 문서 */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-grey-700">해설 문서</span>
            {selectedSolutionId && (
              <CheckCircle2 className="w-4 h-4 text-purple-600 ml-auto" />
            )}
          </div>
          <div className="border border-grey-200 rounded-lg p-2">
            {renderDocumentList(
              'solution',
              selectedSolutionId,
              handleSelectSolution,
              isSolutionDisabled
            )}
          </div>
        </div>
      </div>

      {/* 선택된 문서 표시 */}
      {(selectedProblemId || selectedSolutionId) && (
        <div className="mt-4 p-3 bg-grey-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-grey-600">
            <Info className="w-4 h-4" />
            <span>선택됨:</span>
          </div>
          <div className="mt-2 space-y-1">
            {selectedProblemId && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-toss-blue" />
                <span className="truncate text-grey-700">{selectedProblemId}</span>
              </div>
            )}
            {selectedSolutionId && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span className="truncate text-grey-700">{selectedSolutionId}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 작업 시작 버튼 */}
      <Button
        onClick={handleStartWork}
        disabled={!canStart}
        variant="solid"
        size="lg"
        fullWidth
        className="mt-6"
      >
        {sessionLoading ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            세션 생성 중...
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            작업 시작하기
          </>
        )}
      </Button>

      {/* 안내 문구 */}
      <p className="mt-3 text-center text-xs text-grey-400">
        세션은 언제든 저장되며, 나중에 이어서 작업할 수 있습니다
      </p>
    </Card>
  );
}
