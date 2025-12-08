/**
 * Phase 16-5: 한글 파일 업로드 페이지
 *
 * HWPX/HML 파일 업로드 및 파싱 결과 미리보기
 */
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Edit3,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { MathDisplay } from '../components/MathDisplay';
import { DebugPanel } from '../components/DebugPanel';
import { ImportFromHangulModal } from '../components/problemBank';
import { hangulApi, type ParseResult, type ParsedProblem, type ProblemMetadata } from '../api/hangul';
import { useImportFromHangul, type ImportFromHangulParams } from '../api/problems';
import { cn } from '../lib/utils';

// === 상태 타입 ===
type UploadState = 'idle' | 'uploading' | 'success' | 'error';

// === 메타데이터 설정 컴포넌트 ===
interface MetadataFormProps {
  metadata: ProblemMetadata;
  onChange: (metadata: ProblemMetadata) => void;
  parsedMetadata?: ParseResult['metadata'];
}

function MetadataForm({ metadata, onChange, parsedMetadata }: MetadataFormProps) {
  const handleChange = (field: keyof ProblemMetadata, value: any) => {
    onChange({ ...metadata, [field]: value });
  };

  return (
    <div className="space-y-4 rounded-lg border border-grey-200 bg-grey-50 p-4">
      <h3 className="font-semibold text-grey-900">문제 메타데이터</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-grey-700">과목</label>
          <input
            type="text"
            value={metadata.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            placeholder={parsedMetadata?.subject || '예: 수학'}
            className="mt-1 block w-full rounded-md border border-grey-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-grey-700">학년</label>
          <input
            type="text"
            value={metadata.grade}
            onChange={(e) => handleChange('grade', e.target.value)}
            placeholder={parsedMetadata?.grade || '예: 고1'}
            className="mt-1 block w-full rounded-md border border-grey-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-grey-700">단원</label>
          <input
            type="text"
            value={metadata.chapter}
            onChange={(e) => handleChange('chapter', e.target.value)}
            placeholder="예: 수열"
            className="mt-1 block w-full rounded-md border border-grey-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-grey-700">출처</label>
          <input
            type="text"
            value={metadata.source}
            onChange={(e) => handleChange('source', e.target.value)}
            placeholder={parsedMetadata?.filename || '예: 2024 수능'}
            className="mt-1 block w-full rounded-md border border-grey-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-grey-700">난이도</label>
          <select
            value={metadata.difficulty}
            onChange={(e) => handleChange('difficulty', parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border border-grey-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={1}>1 (쉬움)</option>
            <option value={2}>2</option>
            <option value={3}>3 (보통)</option>
            <option value={4}>4</option>
            <option value={5}>5 (어려움)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-grey-700">태그</label>
          <input
            type="text"
            value={metadata.tags.join(', ')}
            onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="쉼표로 구분"
            className="mt-1 block w-full rounded-md border border-grey-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

// === 문제 미리보기 카드 ===
interface ProblemPreviewCardProps {
  problem: ParsedProblem;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  imageUrls?: Record<string, string>;  // Phase 21: 이미지 URL 매핑
}

function ProblemPreviewCard({ problem, index, selected, onToggleSelect, onEdit, imageUrls }: ProblemPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Phase 21: 이미지 URL 변환
  const problemImageUrls = (problem.content_images || [])
    .map(imageId => imageUrls?.[imageId])
    .filter((url): url is string => Boolean(url));

  const hasImages = problemImageUrls.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        selected
          ? 'border-blue-300 bg-blue-50'
          : 'border-grey-200 bg-white hover:border-grey-300'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-grey-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-grey-900">
            문제 {problem.number || index + 1}
          </span>
          {problem.answer && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              정답 있음
            </span>
          )}
          {problem.explanation && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
              해설 있음
            </span>
          )}
          {/* Phase 21: 이미지 뱃지 */}
          {hasImages && (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              <ImageIcon className="h-3 w-3" />
              이미지 {problemImageUrls.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="rounded p-1 text-grey-400 hover:bg-grey-100 hover:text-grey-600"
            title="편집"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded p-1 text-grey-400 hover:bg-grey-100 hover:text-grey-600"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Preview - Phase 19-C: LaTeX 렌더링 */}
      <div className="mt-2 text-sm text-grey-600 line-clamp-2">
        <MathDisplay
          latex={problem.content_latex || problem.content_text || '(내용 없음)'}
        />
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div>
            <h4 className="text-xs font-medium uppercase text-grey-500">전체 내용</h4>
            <div className="mt-1 whitespace-pre-wrap text-sm text-grey-700">
              <MathDisplay
                latex={problem.content_latex || problem.content_text || '(내용 없음)'}
              />
            </div>
          </div>

          {problem.answer && (
            <div>
              <h4 className="text-xs font-medium uppercase text-grey-500">정답</h4>
              <div className="mt-1 text-sm font-medium text-green-700">
                <MathDisplay latex={problem.answer_latex || problem.answer} />
                {problem.answer_type && (
                  <span className="ml-2 text-xs text-grey-500">
                    ({problem.answer_type})
                  </span>
                )}
              </div>
            </div>
          )}

          {problem.explanation && (
            <div>
              <h4 className="text-xs font-medium uppercase text-grey-500">해설</h4>
              <div className="mt-1 whitespace-pre-wrap text-sm text-grey-700">
                <MathDisplay latex={problem.explanation} />
              </div>
            </div>
          )}

          {(problem.content_equations_latex?.length > 0 || problem.content_equations.length > 0) && (
            <div>
              <h4 className="text-xs font-medium uppercase text-grey-500">수식</h4>
              <div className="mt-1 flex flex-wrap gap-2">
                {(problem.content_equations_latex || problem.content_equations).map((eq, i) => (
                  <code key={i} className="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm">
                    <MathDisplay latex={`$${eq}$`} />
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Phase 21: 이미지 표시 */}
          {hasImages && (
            <div>
              <h4 className="text-xs font-medium uppercase text-grey-500">첨부 이미지</h4>
              <div className="mt-2 flex flex-wrap gap-3">
                {problemImageUrls.map((url, i) => (
                  <a
                    key={i}
                    href={`http://localhost:8000${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative overflow-hidden rounded-lg border border-grey-200 hover:border-blue-400 transition-colors"
                  >
                    <img
                      src={`http://localhost:8000${url}`}
                      alt={`문제 ${problem.number} 이미지 ${i + 1}`}
                      className="max-h-48 max-w-xs object-contain bg-white"
                      onError={(e) => {
                        // 이미지 로드 실패 시 플레이스홀더 표시
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white">클릭하여 원본 보기</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === 메인 컴포넌트 ===
export function HangulUploadPage() {
  const { showToast } = useToast();

  // State
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<ProblemMetadata>({
    subject: '',
    grade: '',
    chapter: '',
    source: '',
    difficulty: 3,
    tags: [],
  });

  // Phase 21+ C-2: 문제은행 가져오기 모달
  const [showImportModal, setShowImportModal] = useState(false);
  const importFromHangul = useImportFromHangul();

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: (file: File) => hangulApi.parseFile(file),
    onSuccess: (result) => {
      setUploadState('success');
      setParseResult(result);

      // 모든 문제 선택
      const allIds = new Set(result.problems.map(p => p.id));
      setSelectedProblems(allIds);

      // 파싱된 메타데이터로 초기값 설정
      if (result.metadata) {
        setMetadata(prev => ({
          ...prev,
          subject: result.metadata.subject || prev.subject,
          grade: result.metadata.grade || prev.grade,
          source: result.metadata.filename || prev.source,
        }));
      }

      showToast(`${result.total_problems}개 문제가 파싱되었습니다`, 'success');
    },
    onError: (error: any) => {
      setUploadState('error');
      showToast(
        `파싱 실패: ${error.response?.data?.detail || error.message}`,
        'error'
      );
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!parseResult) throw new Error('파싱 결과가 없습니다');

      const selectedProblemsList = parseResult.problems.filter(p => selectedProblems.has(p.id));
      return hangulApi.saveProblems({
        problems: selectedProblemsList,
        metadata,
      });
    },
    onSuccess: (response) => {
      showToast(response.message, 'success');

      // 초기화
      setParseResult(null);
      setSelectedFile(null);
      setUploadState('idle');
      setSelectedProblems(new Set());
    },
    onError: (error: any) => {
      showToast(
        `저장 실패: ${error.response?.data?.detail || error.message}`,
        'error'
      );
    },
  });

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setUploadState('uploading');
      parseMutation.mutate(file);
    }
  }, [parseMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-hwpx': ['.hwpx'],
      'text/xml': ['.hml'],
    },
    multiple: false,
  });

  // Handlers
  const handleReset = () => {
    setSelectedFile(null);
    setParseResult(null);
    setUploadState('idle');
    setSelectedProblems(new Set());
  };

  const handleToggleAll = () => {
    if (!parseResult) return;

    if (selectedProblems.size === parseResult.problems.length) {
      setSelectedProblems(new Set());
    } else {
      setSelectedProblems(new Set(parseResult.problems.map(p => p.id)));
    }
  };

  const handleToggleProblem = (problemId: string) => {
    setSelectedProblems(prev => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (selectedProblems.size === 0) {
      showToast('저장할 문제를 선택해주세요', 'warning');
      return;
    }
    saveMutation.mutate();
  };

  // Phase 19-G: 다시 파싱 (캐시 우회)
  const handleReparse = () => {
    if (selectedFile) {
      setUploadState('uploading');
      parseMutation.mutate(selectedFile);
      showToast('파일을 다시 파싱합니다...', 'info');
    }
  };

  // Phase 21+ C-2: 문제은행에 가져오기
  const handleImportToProblemBank = useCallback((params: {
    selectedProblems: ParsedProblem[];
    classification?: any;
    difficulty: number;
    questionType: 'multiple_choice' | 'short_answer' | 'essay';
    sourceName: string;
    sourceType: 'book' | 'exam' | 'custom';
  }) => {
    const importParams: ImportFromHangulParams = {
      problems: params.selectedProblems,
      defaultSource: {
        type: params.sourceType,
        name: params.sourceName,
      },
      classification: params.classification,
      difficulty: params.difficulty,
      questionType: params.questionType,
    };

    importFromHangul.mutate(importParams, {
      onSuccess: (imported) => {
        showToast(`${imported.length}개 문제가 문제은행에 등록되었습니다!`, 'success');
        setShowImportModal(false);
      },
      onError: (error) => {
        showToast(`가져오기 실패: ${error.message}`, 'error');
      },
    });
  }, [importFromHangul, showToast]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-grey-900">한글 파일 업로드</h1>
          <p className="mt-2 text-grey-600">
            HWPX 또는 HML 파일에서 문제를 추출하여 문제은행에 저장합니다
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {uploadState === 'idle' && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-grey-300 bg-grey-50 hover:border-grey-400 hover:bg-grey-100'
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn('h-16 w-16', isDragActive ? 'text-blue-500' : 'text-grey-400')} />
          <h3 className="mt-4 text-lg font-semibold text-grey-900">
            {isDragActive ? '파일을 놓으세요' : '한글 파일 업로드'}
          </h3>
          <p className="mt-2 text-sm text-grey-600">
            HWPX 또는 HML 파일을 드래그하거나 클릭하여 선택하세요
          </p>
          <p className="mt-1 text-xs text-grey-500">
            지원 형식: .hwpx, .hml
          </p>
        </div>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-grey-200 bg-white p-12">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
          <h3 className="mt-4 text-lg font-semibold text-grey-900">파일 분석 중...</h3>
          <p className="mt-2 text-sm text-grey-600">
            {selectedFile?.name}을(를) 파싱하고 있습니다
          </p>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-12">
          <AlertCircle className="h-16 w-16 text-red-600" />
          <h3 className="mt-4 text-lg font-semibold text-grey-900">파싱 실패</h3>
          <p className="mt-2 text-sm text-red-600">
            파일을 분석하는 중 오류가 발생했습니다
          </p>
          <button
            onClick={handleReset}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Success State - Results */}
      {uploadState === 'success' && parseResult && (
        <div className="space-y-6">
          {/* File Info */}
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-grey-900">{selectedFile?.name}</p>
                <p className="text-sm text-grey-600">
                  {parseResult.total_problems}개 문제 발견
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Phase 19-G: 다시 파싱 버튼 */}
              <button
                onClick={handleReparse}
                disabled={parseMutation.isPending}
                className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                title="백엔드에서 최신 변환 결과를 다시 가져옵니다"
              >
                <RefreshCw className={cn("h-4 w-4", parseMutation.isPending && "animate-spin")} />
                다시 파싱
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg border border-grey-300 bg-white px-4 py-2 text-sm font-medium text-grey-700 hover:bg-grey-50"
              >
                <X className="mr-1 inline-block h-4 w-4" />
                취소
              </button>
            </div>
          </div>

          {/* Metadata Form */}
          <MetadataForm
            metadata={metadata}
            onChange={setMetadata}
            parsedMetadata={parseResult.metadata}
          />

          {/* Problems List */}
          <div className="rounded-lg border border-grey-200 bg-white">
            {/* List Header */}
            <div className="flex items-center justify-between border-b border-grey-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedProblems.size === parseResult.problems.length}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-grey-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-grey-900">
                  {selectedProblems.size}개 선택됨 / 전체 {parseResult.total_problems}개
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-grey-400" />
                <span className="text-sm text-grey-600">미리보기</span>
              </div>
            </div>

            {/* Problems */}
            <div className="max-h-[500px] space-y-3 overflow-y-auto p-4">
              {parseResult.problems.map((problem, index) => (
                <ProblemPreviewCard
                  key={problem.id}
                  problem={problem}
                  index={index}
                  selected={selectedProblems.has(problem.id)}
                  onToggleSelect={() => handleToggleProblem(problem.id)}
                  onEdit={() => {
                    // TODO: 편집 모달 구현
                    showToast('편집 기능은 준비 중입니다', 'info');
                  }}
                  imageUrls={parseResult.detected_metadata?.image_urls}
                />
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleReset}
              className="rounded-lg border border-grey-300 bg-white px-6 py-3 text-sm font-medium text-grey-700 hover:bg-grey-50"
            >
              취소
            </button>
            {/* Phase 21+ C-2: 문제은행에 등록 버튼 */}
            <button
              onClick={() => setShowImportModal(true)}
              disabled={selectedProblems.size === 0}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
            >
              📚 문제은행에 등록
            </button>
            <button
              onClick={handleSave}
              disabled={selectedProblems.size === 0 || saveMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {selectedProblems.size}개 문제 저장
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Phase 20-B: Debug Panel (개발 환경 전용) */}
      <DebugPanel />

      {/* Phase 21+ C-2: 문제은행 가져오기 모달 */}
      {parseResult && (
        <ImportFromHangulModal
          open={showImportModal}
          parseResult={parseResult}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportToProblemBank}
          isImporting={importFromHangul.isPending}
        />
      )}
    </div>
  );
}
