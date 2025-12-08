/**
 * PDF 업로드 버튼 컴포넌트 (Phase 2)
 */
import { useRef, useState } from 'react';
import { useUploadPDF, useTaskStatus } from '../hooks/useDocuments';

export function UploadButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>();
  const uploadMutation = useUploadPDF();
  const taskStatus = useTaskStatus(currentTaskId);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf')) {
      alert('PDF 파일만 업로드 가능합니다');
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync(file);

      if (result.task_id) {
        setCurrentTaskId(result.task_id);
      }

      alert(result.message);
    } catch (error: any) {
      console.error('업로드 실패:', error);
      alert(`업로드 실패: ${error.response?.data?.detail || error.message}`);
    }

    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleButtonClick}
        disabled={uploadMutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-grey-400 disabled:cursor-not-allowed transition-colors"
      >
        {uploadMutation.isPending ? '업로드 중...' : 'PDF 업로드'}
      </button>

      {uploadMutation.isPending && (
        <div className="text-sm text-grey-600">
          파일 업로드 중...
        </div>
      )}

      {taskStatus.data && taskStatus.data.status !== 'completed' && (
        <div className="text-sm text-grey-600">
          백그라운드 분석 중: {taskStatus.data.progress}/{taskStatus.data.total_pages} 페이지
          {taskStatus.data.status === 'failed' && (
            <span className="text-red-600 ml-2">실패: {taskStatus.data.error}</span>
          )}
        </div>
      )}

      {taskStatus.data?.status === 'completed' && (
        <div className="text-sm text-green-600">
          ✓ 모든 페이지 분석 완료
        </div>
      )}
    </div>
  );
}
