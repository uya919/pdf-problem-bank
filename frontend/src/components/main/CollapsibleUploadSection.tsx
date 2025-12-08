/**
 * CollapsibleUploadSection Component (Phase 34-C, Phase 35, Phase 34-B)
 *
 * 접이식 파일 업로드 영역
 * - 기본적으로 접힌 상태
 * - 클릭 시 펼침
 * - 드래그 앤 드롭 지원
 * - Phase 35: 네이밍 모달 연동
 * - Phase 34-B: 메타데이터 전달
 */
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronDown, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUploadPDF } from '../../hooks/useDocuments';
import { UploadNamingModal } from './UploadNamingModal';
import type { UploadNamingResult } from './UploadNamingModal';

export function CollapsibleUploadSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Phase 35: 네이밍 모달 상태
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showNamingModal, setShowNamingModal] = useState(false);

  const uploadMutation = useUploadPDF();

  // Phase 35: 파일 드롭 시 모달 열기 (즉시 업로드 X)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // PDF 파일만 모달로 처리 (HWP 등은 기존 방식 유지)
      if (file.name.toLowerCase().endsWith('.pdf')) {
        setPendingFile(file);
        setShowNamingModal(true);
      } else {
        // 기존 방식: 즉시 업로드
        handleDirectUpload(file);
      }
    }
  }, []);

  // 기존 방식 업로드 (HWP 등)
  const handleDirectUpload = async (file: File) => {
    try {
      setUploadStatus('uploading');
      setUploadedFileName(file.name);
      await uploadMutation.mutateAsync(file);
      setUploadStatus('success');

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadedFileName(null);
      }, 3000);
    } catch (error) {
      setUploadStatus('error');
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);
    }
  };

  // Phase 34-B: 모달에서 확인 시 업로드 (메타데이터 포함)
  const handleModalConfirm = async (result: UploadNamingResult) => {
    console.log('[CollapsibleUploadSection] handleModalConfirm called', { result, pendingFile: pendingFile?.name });
    if (!pendingFile) {
      console.warn('[CollapsibleUploadSection] No pending file!');
      return;
    }

    try {
      setUploadStatus('uploading');
      setUploadedFileName(`${result.documentId}.pdf`);
      setShowNamingModal(false);

      console.log('[CollapsibleUploadSection] Calling uploadMutation.mutateAsync...');
      // Phase 34-B: 메타데이터 포함하여 업로드
      await uploadMutation.mutateAsync({
        file: pendingFile,
        documentId: result.documentId,
        grade: result.grade,
        course: result.course,
        series: result.series,
        docType: result.docType,
      });
      console.log('[CollapsibleUploadSection] Upload successful!');

      setUploadStatus('success');
      setPendingFile(null);

      setTimeout(() => {
        setUploadStatus('idle');
        setUploadedFileName(null);
      }, 3000);
    } catch (error) {
      setUploadStatus('error');
      setPendingFile(null);
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);
    }
  };

  // Phase 35: 모달 닫기
  const handleModalClose = () => {
    setShowNamingModal(false);
    setPendingFile(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/haansofthwp': ['.hwp'],
      'application/hwpx': ['.hwpx'],
      'application/x-hwpml': ['.hml'],
    },
    multiple: false, // Phase 35: 단일 파일만 (모달 때문에)
  });

  return (
    <>
      <section className="border-t border-grey-200 pt-6">
        {/* Toggle Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-2 text-grey-600 hover:text-grey-900 transition-colors group"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4" />
            파일 추가하기
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Collapsible Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <div
                {...getRootProps()}
                className={`
                  mt-4 p-8 border-2 border-dashed rounded-xl text-center cursor-pointer
                  transition-all duration-200
                  ${isDragActive
                    ? 'border-toss-blue bg-toss-blue/5'
                    : uploadStatus === 'success'
                      ? 'border-green-500 bg-green-50'
                      : uploadStatus === 'error'
                        ? 'border-red-500 bg-red-50'
                        : 'border-grey-200 hover:border-toss-blue hover:bg-grey-50'}
                `}
              >
                <input {...getInputProps()} />

                {uploadStatus === 'uploading' ? (
                  <>
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-toss-blue animate-spin" />
                    <p className="text-sm text-toss-blue font-medium">업로드 중...</p>
                    <p className="text-xs text-grey-500 mt-1">{uploadedFileName}</p>
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-green-600 font-medium">업로드 완료!</p>
                    <p className="text-xs text-grey-500 mt-1">{uploadedFileName}</p>
                  </>
                ) : uploadStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    <p className="text-sm text-red-600 font-medium">업로드 실패</p>
                    <p className="text-xs text-grey-500 mt-1">다시 시도해주세요</p>
                  </>
                ) : (
                  <>
                    <Upload
                      className={`w-8 h-8 mx-auto mb-2 transition-colors ${
                        isDragActive ? 'text-toss-blue' : 'text-grey-400'
                      }`}
                    />
                    <p className="text-sm text-grey-600">
                      {isDragActive ? '여기에 놓으세요!' : '파일을 드래그하거나 클릭하세요'}
                    </p>
                    <p className="text-xs text-grey-400 mt-1">PDF, HWP, HWPX, HML 지원</p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Phase 35: 네이밍 모달 */}
      <UploadNamingModal
        file={pendingFile}
        isOpen={showNamingModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        isUploading={uploadStatus === 'uploading'}
      />
    </>
  );
}
