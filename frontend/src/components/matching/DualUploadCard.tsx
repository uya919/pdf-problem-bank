/**
 * 듀얼 업로드 카드 컴포넌트
 *
 * Phase 22-F-1: 문제 PDF와 해설 PDF를 동시에 업로드
 * Phase 31-D: 싱글 탭 매칭(기본) + 듀얼 윈도우(서브) UI
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BookOpen, Link2, X, Loader2, AlertCircle, Monitor } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDualWindowLauncher } from '../../hooks/useDualWindowLauncher';
import { api } from '../../api/client';

interface UploadedFile {
  file: File;
  documentId: string | null;
  uploading: boolean;
  error: string | null;
}

interface DualUploadCardProps {
  onPopupBlocked?: () => void;
  // Phase 22-G: 기존 문서 선택 지원
  selectedProblemDoc?: { id: string; name: string } | null;
  selectedSolutionDoc?: { id: string; name: string } | null;
  onClearProblem?: () => void;
  onClearSolution?: () => void;
}

export function DualUploadCard({
  onPopupBlocked,
  selectedProblemDoc,
  selectedSolutionDoc,
  onClearProblem,
  onClearSolution,
}: DualUploadCardProps) {
  const navigate = useNavigate();
  const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
  const [solutionFile, setSolutionFile] = useState<UploadedFile | null>(null);

  // Phase 22-G: 최종 문서 ID 결정 (업로드 > 기존 선택)
  const effectiveProblemDocId = problemFile?.documentId || selectedProblemDoc?.id || '';
  const effectiveSolutionDocId = solutionFile?.documentId || selectedSolutionDoc?.id || '';

  const { launchDualWindows, isLaunching, error: launchError } = useDualWindowLauncher({
    problemDocId: effectiveProblemDocId,
    solutionDocId: effectiveSolutionDocId,
    onPopupBlocked,
  });

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(async (
    file: File,
    type: 'problem' | 'solution'
  ) => {
    const setFile = type === 'problem' ? setProblemFile : setSolutionFile;

    // 업로드 시작
    setFile({
      file,
      documentId: null,
      uploading: true,
      error: null,
    });

    try {
      const response = await api.uploadPDF(file);
      setFile({
        file,
        documentId: response.document_id,
        uploading: false,
        error: null,
      });
    } catch (err) {
      setFile({
        file,
        documentId: null,
        uploading: false,
        error: err instanceof Error ? err.message : '업로드 실패',
      });
    }
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDrop = useCallback((
    e: React.DragEvent,
    type: 'problem' | 'solution'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'problem' | 'solution'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, type);
    }
  }, [handleFileUpload]);

  // 파일 제거 (Phase 22-G: 기존 선택도 해제)
  const removeFile = useCallback((type: 'problem' | 'solution') => {
    if (type === 'problem') {
      if (problemFile) {
        setProblemFile(null);
      } else if (selectedProblemDoc) {
        onClearProblem?.();
      }
    } else {
      if (solutionFile) {
        setSolutionFile(null);
      } else if (selectedSolutionDoc) {
        onClearSolution?.();
      }
    }
  }, [problemFile, solutionFile, selectedProblemDoc, selectedSolutionDoc, onClearProblem, onClearSolution]);

  // 매칭 시작 가능 여부 (업로드 또는 기존 선택 둘 중 하나)
  const canStartMatching = effectiveProblemDocId && effectiveSolutionDocId && !isLaunching;

  // Phase 31-D: 싱글 탭 매칭 시작 (기본 모드)
  const handleStartSingleTabMatching = useCallback(() => {
    if (!effectiveProblemDocId || !effectiveSolutionDocId) return;
    navigate(`/matching/${encodeURIComponent(effectiveProblemDocId)}/${encodeURIComponent(effectiveSolutionDocId)}`);
  }, [effectiveProblemDocId, effectiveSolutionDocId, navigate]);

  // 드롭존 렌더링
  const renderDropzone = (
    type: 'problem' | 'solution',
    uploadedFile: UploadedFile | null
  ) => {
    const isProblem = type === 'problem';
    const Icon = isProblem ? FileText : BookOpen;
    const label = isProblem ? '문제 PDF' : '해설 PDF';
    const inputId = `${type}-file-input`;

    // Phase 22-G: 기존 문서 선택 상태
    const existingDoc = isProblem ? selectedProblemDoc : selectedSolutionDoc;
    const hasExistingSelection = !uploadedFile && existingDoc;

    if (uploadedFile?.uploading) {
      return (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-toss-blue/30 bg-toss-blue-light">
          <Loader2 className="h-8 w-8 animate-spin text-toss-blue" />
          <p className="mt-2 text-sm text-toss-blue">업로드 중...</p>
        </div>
      );
    }

    if (uploadedFile?.documentId) {
      return (
        <div className="relative flex h-40 flex-col items-center justify-center rounded-lg border-2 border-success/30 bg-success/5">
          <button
            onClick={() => removeFile(type)}
            className="absolute right-2 top-2 rounded-full p-1 text-grey-400 hover:bg-grey-200 hover:text-grey-600"
          >
            <X className="h-4 w-4" />
          </button>
          <Icon className="h-8 w-8 text-success" />
          <p className="mt-2 max-w-[150px] truncate text-sm font-medium text-success">
            {uploadedFile.file.name}
          </p>
          <p className="text-xs text-success/80">업로드 완료</p>
        </div>
      );
    }

    // Phase 22-G: 기존 문서 선택됨 상태 (NEW)
    if (hasExistingSelection) {
      return (
        <div className="relative flex h-40 flex-col items-center justify-center rounded-lg border-2 border-toss-blue/30 bg-toss-blue-light">
          <button
            onClick={() => removeFile(type)}
            className="absolute right-2 top-2 rounded-full p-1 text-grey-400 hover:bg-grey-200 hover:text-grey-600"
          >
            <X className="h-4 w-4" />
          </button>
          <Icon className="h-8 w-8 text-toss-blue" />
          <p className="mt-2 max-w-[150px] truncate text-sm font-medium text-toss-blue">
            {existingDoc!.name}
          </p>
          <p className="text-xs text-toss-blue/80">기존 문서 선택됨</p>
        </div>
      );
    }

    if (uploadedFile?.error) {
      return (
        <div className="relative flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-error/30 bg-error/5">
          <button
            onClick={() => removeFile(type)}
            className="absolute right-2 top-2 rounded-full p-1 text-grey-400 hover:bg-grey-200 hover:text-grey-600"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">{uploadedFile.error}</p>
          <label
            htmlFor={inputId}
            className="mt-2 cursor-pointer text-xs text-error underline hover:text-error/80"
          >
            다시 시도
          </label>
        </div>
      );
    }

    return (
      <label
        htmlFor={inputId}
        className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-grey-300 bg-grey-50 transition-colors hover:border-toss-blue hover:bg-toss-blue-light"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, type)}
      >
        <Icon className="h-8 w-8 text-grey-400" />
        <p className="mt-2 text-sm font-medium text-grey-700">{label}</p>
        <p className="mt-1 text-xs text-grey-500">드래그 앤 드롭 또는 클릭</p>
        <input
          id={inputId}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(e, type)}
        />
      </label>
    );
  };

  return (
    <Card padding="lg">
      {/* 타이틀 영역 */}
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="h-5 w-5 text-toss-blue" />
        <h3 className="text-headline-sm text-grey-900">문제-해설 매칭</h3>
      </div>
      <p className="text-body-sm text-grey-500 mb-6">
        PDF를 업로드하거나, 아래 문서 목록에서 선택하세요
      </p>

      {/* 드롭존 영역 */}
      <div className="grid grid-cols-2 gap-4">
        {renderDropzone('problem', problemFile)}
        {renderDropzone('solution', solutionFile)}
      </div>

      {/* 파일명 표시 (Phase 22-G: 업로드 또는 기존 선택) */}
      <div className="mt-4 space-y-1">
        {/* 문제 파일 */}
        {(problemFile?.documentId || selectedProblemDoc) && (
          <div className="flex items-center gap-2 text-sm text-grey-600">
            <FileText className="h-4 w-4" />
            <span className="truncate">
              문제: {problemFile?.file.name || selectedProblemDoc?.name}
            </span>
            {problemFile?.documentId ? (
              <span className="text-success">업로드됨</span>
            ) : (
              <span className="text-toss-blue">선택됨</span>
            )}
          </div>
        )}

        {/* 해설 파일 */}
        {(solutionFile?.documentId || selectedSolutionDoc) && (
          <div className="flex items-center gap-2 text-sm text-grey-600">
            <BookOpen className="h-4 w-4" />
            <span className="truncate">
              해설: {solutionFile?.file.name || selectedSolutionDoc?.name}
            </span>
            {solutionFile?.documentId ? (
              <span className="text-success">업로드됨</span>
            ) : (
              <span className="text-toss-blue">선택됨</span>
            )}
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {launchError && (
        <div className="mt-4 rounded-lg bg-error/5 p-3 text-sm text-error">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {launchError}
          </div>
        </div>
      )}

      {/* Phase 31-D: 매칭 시작 버튼 (싱글 탭 = 기본) */}
      <Button
        onClick={handleStartSingleTabMatching}
        disabled={!canStartMatching}
        variant="solid"
        size="lg"
        fullWidth
        className="mt-6"
      >
        <Link2 className="h-5 w-5" />
        매칭 시작하기
      </Button>

      {/* Phase 31-D: 듀얼 윈도우 옵션 (서브) */}
      <div className="mt-4 pt-4 border-t border-grey-200">
        <button
          onClick={launchDualWindows}
          disabled={!canStartMatching || isLaunching}
          className="w-full flex items-center justify-center gap-2 text-sm text-grey-500 hover:text-grey-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLaunching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              듀얼 윈도우 세션 생성 중...
            </>
          ) : (
            <>
              <Monitor className="h-4 w-4" />
              <span>듀얼 모니터로 작업하기</span>
              <span className="text-xs text-grey-400">(새 창 2개)</span>
            </>
          )}
        </button>
      </div>

      {/* 안내 문구 */}
      <p className="mt-3 text-center text-xs text-grey-400">
        기본 모드는 탭 전환으로 간편하게, 듀얼 모니터는 두 화면에서 동시에
      </p>
    </Card>
  );
}
