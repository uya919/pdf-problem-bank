/**
 * TextbookUploader - 교재 PDF 업로드 (관리자용)
 * Stage 18: PDF 교재 뷰어
 * Stage 46: Railway Worker PDF 압축 통합
 *
 * - 반별 PDF 교재 업로드
 * - Railway에서 PDF 압축 (JPEG 90)
 * - 교재 목록 표시
 * - 교재 삭제
 */

import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, AlertCircle } from 'lucide-react';
import {
  useTextbooksByClass,
  useUploadTextbook,
  useDeleteTextbook,
  formatFileSize,
} from '../../hooks/useTextbooks';
import type { ClassBoundTextbook } from '../../types/textbook';

interface TextbookUploaderProps {
  /** 반 ID */
  classId: string;
  /** 반 이름 (표시용) */
  className: string;
}

export function TextbookUploader({ classId, className }: TextbookUploaderProps) {
  const { data: textbooks = [], isLoading } = useTextbooksByClass(classId);
  const uploadMutation = useUploadTextbook();
  const deleteMutation = useDeleteTextbook();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  // 파일 선택 및 업로드
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // PDF 파일 검증
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 제한 (200MB)
    const MAX_SIZE = 200 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('파일 크기는 200MB 이하여야 합니다.');
      return;
    }

    const name = displayName.trim() || file.name.replace('.pdf', '');
    setUploadMessage('');

    try {
      await uploadMutation.mutateAsync({
        classId,
        displayName: name,
        file,
        onProgress: (progress, message) => {
          setUploadProgress(progress);
          setUploadMessage(message);
        },
      });

      // 초기화
      setDisplayName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => {
        setUploadProgress(0);
        setUploadMessage('');
      }, 2000);
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
      setUploadProgress(0);
      setUploadMessage('');
    }
  };

  // 교재 삭제
  const handleDelete = async (textbook: ClassBoundTextbook) => {
    if (!confirm(`"${textbook.displayName}" 교재를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(textbook);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">{className}</h3>
          <p className="text-sm text-gray-500">PDF 교재 관리</p>
        </div>
        <span className="text-sm text-gray-400">
          {textbooks.length}개 교재
        </span>
      </div>

      {/* 교재 목록 */}
      <div className="space-y-2 mb-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : textbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">등록된 교재가 없습니다</p>
          </div>
        ) : (
          textbooks.map((textbook) => (
            <div
              key={textbook.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {textbook.displayName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(textbook.fileSize)}
                    {textbook.pageCount && ` · ${textbook.pageCount}페이지`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(textbook)}
                disabled={deleteMutation.isPending}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 업로드 폼 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="교재명 (예: 베이직쎈)"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-sm font-medium">업로드 중</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">PDF 추가</span>
              </>
            )}
          </button>
        </div>

        {/* 업로드 진행률 */}
        {uploadProgress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{uploadMessage || '처리 중...'}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="flex items-start gap-2 mt-3 text-xs text-gray-500">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <p>
            PDF 파일만 업로드 가능 (최대 200MB). 업로드 시 자동으로 압축됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TextbookUploader;
