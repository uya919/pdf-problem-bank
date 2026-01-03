/**
 * TextbookUploadModal - 교재 업로드 모달
 * Stage 18-E/G: 교재 관리 페이지 + PDF 압축
 * Stage 46-B: Railway Worker 서버사이드 압축으로 변경
 *
 * - 교재명 입력 (자동완성 지원)
 * - 과목 선택
 * - 과정 선택 (공통수학1, 수학Ⅰ 등)
 * - PDF 파일 드래그 앤 드롭
 * - 50MB 초과 시 Railway Worker에서 자동 압축
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, FileDown, ChevronDown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import {
  useCreateTextbook,
  CURRICULUM_OPTIONS,
  SUBJECT_OPTIONS,
  POPULAR_TEXTBOOK_SERIES,
  formatFileSize,
} from '@/hooks/useAllTextbooks';

/** 50MB 압축 알림 임계값 (Railway에서 자동 압축) */
const COMPRESSION_THRESHOLD = 50 * 1024 * 1024;

/** 50MB 이상 파일 여부 확인 */
const needsServerCompression = (fileSize: number) => fileSize > COMPRESSION_THRESHOLD;

interface TextbookUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export function TextbookUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: TextbookUploadModalProps) {
  const createMutation = useCreateTextbook();

  const [displayName, setDisplayName] = useState('');
  const [subject, setSubject] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // 자동완성 관련 상태
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 업로드 진행률 상태 (Railway 압축 포함)
  const [uploadProgress, setUploadProgress] = useState<{
    progress: number;
    message: string;
  } | null>(null);

  // 자동완성 필터링
  useEffect(() => {
    if (displayName.length > 0) {
      const filtered = POPULAR_TEXTBOOK_SERIES.filter((series) =>
        series.toLowerCase().includes(displayName.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([...POPULAR_TEXTBOOK_SERIES]);
      setShowSuggestions(false);
    }
  }, [displayName]);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 자동완성 선택
  const handleSelectSuggestion = (suggestion: string) => {
    setDisplayName(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // 파일 드롭 핸들러
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: unknown[]) => {
    setFileError(null);
    setUploadProgress(null);

    if (rejectedFiles.length > 0) {
      setFileError('PDF 파일만 업로드 가능합니다.');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError('파일 크기는 200MB 이하여야 합니다.');
      return;
    }

    setSelectedFile(file);
    // 파일명에서 교재명 자동 추출
    if (!displayName) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
      setDisplayName(nameWithoutExt);
    }
  }, [displayName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  // 폼 제출 (Stage 46-B: Railway Worker에서 압축)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setFileError('PDF 파일을 선택해주세요.');
      return;
    }

    if (!displayName.trim()) {
      return;
    }

    try {
      // 교재명 자동 생성: 교재명_과정_과목 (예: 베이직쎈_공통수학1_수학)
      const finalDisplayName = [
        displayName.trim(),
        curriculum,
        subject,
      ].filter(Boolean).join('_');

      // useCreateTextbook에서 Railway 압축 수행
      await createMutation.mutateAsync({
        displayName: finalDisplayName,
        file: selectedFile, // 원본 파일, 훅에서 Railway 압축
        subject: subject || undefined,
        curriculum: curriculum || undefined,
        onProgress: (progress, message) => {
          setUploadProgress({ progress, message });
        },
      });

      // 성공 시 초기화 및 닫기
      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('업로드 실패:', error);
      setFileError(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setDisplayName('');
    setSubject('');
    setCurriculum('');
    setSelectedFile(null);
    setFileError(null);
    setUploadProgress(null);
    setShowSuggestions(false);
  };

  // 모달 닫기
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">교재 추가</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 교재명 (자동완성) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              교재명 <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onFocus={() => {
                if (filteredSuggestions.length > 0 || displayName.length === 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="예: 베이직쎈 공통수학1"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
              autoComplete="off"
            />

            {/* 자동완성 드롭다운 */}
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto"
              >
                <div className="px-3 py-2 text-xs text-gray-500 border-b">
                  자주 쓰는 교재
                </div>
                {(displayName.length === 0 ? POPULAR_TEXTBOOK_SERIES : filteredSuggestions).map((series) => (
                  <button
                    key={series}
                    type="button"
                    onClick={() => handleSelectSuggestion(series)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {series}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 과목/과정 (2열) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                과목
              </label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white appearance-none cursor-pointer"
                >
                  <option value="">선택 안함</option>
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                과정
              </label>
              <div className="relative">
                <select
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white appearance-none cursor-pointer"
                >
                  <option value="">선택 안함</option>
                  <optgroup label="중등">
                    {CURRICULUM_OPTIONS.filter(c => c.startsWith('중')).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="고등 공통">
                    {CURRICULUM_OPTIONS.filter(c => c.startsWith('공통')).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="고등 선택">
                    {CURRICULUM_OPTIONS.filter(c =>
                      !c.startsWith('중') && !c.startsWith('공통') && c !== '기타'
                    ).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <option value="기타">기타</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 파일 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              PDF 파일 <span className="text-red-500">*</span>
            </label>

            {selectedFile ? (
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 50MB 초과 시 압축 안내 */}
                {needsServerCompression(selectedFile.size) && !uploadProgress && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <FileDown className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700">
                      <p className="font-medium">파일 크기가 50MB를 초과합니다</p>
                      <p className="mt-0.5 text-amber-600">
                        업로드 시 서버에서 자동으로 압축됩니다.
                      </p>
                    </div>
                  </div>
                )}

                {/* 업로드 진행률 (Railway 압축 포함) */}
                {uploadProgress && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      {uploadProgress.message}
                    </div>
                    <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-blue-500 text-right">
                      {uploadProgress.progress.toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">
                  {isDragActive
                    ? '여기에 파일을 놓으세요'
                    : '파일을 드래그하거나 클릭하여 선택'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  PDF 파일만 가능 (최대 200MB)
                </p>
              </div>
            )}

            {/* 에러 메시지 */}
            {fileError && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fileError}
              </p>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!selectedFile || !displayName.trim() || createMutation.isPending}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {uploadProgress?.message || '처리 중...'}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  업로드
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TextbookUploadModal;
