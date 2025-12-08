/**
 * RegistrationPage Component
 * Phase 21.5: 통합 등록 & 라벨링 페이지
 * Phase 21.7: 문서 삭제 기능 추가
 *
 * 토스 스타일 - 파일 드롭 → 진행 상태 → 라벨링 시작
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  AlertCircle,
  Loader2,
  File,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useDocuments, useUploadPDF, useDeleteDocument } from '@/hooks/useDocuments';
import { DocumentMenu } from '@/components/DocumentMenu';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { useToast } from '@/components/Toast';
// Phase 33-A: 듀얼 문서 선택기 (리스트 스타일)
import { DualDocumentSelector } from '@/components/matching/DualDocumentSelector';
import { PopupBlockedModal } from '@/components/matching/PopupBlockedModal';

type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'labeling' | 'completed' | 'error';

interface DocumentItem {
  id: string;
  name: string;
  status: DocumentStatus;
  progress?: number;
  totalPages?: number;
  labeledPages?: number;
  createdAt: string;
}

function getStatusIcon(status: DocumentStatus) {
  switch (status) {
    case 'uploading':
    case 'processing':
      return <Loader2 className="w-5 h-5 text-toss-blue animate-spin" />;
    case 'ready':
    case 'labeling':
      return <Clock className="w-5 h-5 text-warning" />;
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-success" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-error" />;
    default:
      return <FileText className="w-5 h-5 text-grey-400" />;
  }
}

function getStatusText(status: DocumentStatus, progress?: number) {
  switch (status) {
    case 'uploading':
      return '업로드 중...';
    case 'processing':
      return `처리 중... ${progress ? `${progress}%` : ''}`;
    case 'ready':
      return '라벨링 대기';
    case 'labeling':
      return '라벨링 진행 중';
    case 'completed':
      return '완료';
    case 'error':
      return '오류 발생';
    default:
      return '';
  }
}

interface DocumentCardProps {
  document: DocumentItem;
  onContinue: (id: string) => void;
  onDelete: (document: DocumentItem) => void;
}

function DocumentCard({
  document,
  onContinue,
  onDelete,
}: DocumentCardProps) {
  const isActionable = document.status === 'ready' || document.status === 'labeling';
  const labelProgress = document.labeledPages && document.totalPages
    ? (document.labeledPages / document.totalPages) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card
        variant={isActionable ? 'interactive' : 'default'}
        className={cn(
          'p-4',
          isActionable && 'cursor-pointer hover:border-toss-blue'
        )}
        onClick={() => isActionable && onContinue(document.id)}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 bg-grey-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <File className="w-5 h-5 text-grey-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-grey-900 truncate">{document.name}</h3>

            {/* Progress bar for labeling */}
            {document.status === 'labeling' && document.totalPages && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-grey-500 mb-1">
                  <span>라벨링 진행률</span>
                  <span>{document.labeledPages}/{document.totalPages} 페이지</span>
                </div>
                <div className="h-1.5 bg-grey-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-toss-blue rounded-full transition-all duration-300"
                    style={{ width: `${labelProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 mt-2">
              {getStatusIcon(document.status)}
              <span className="text-sm text-grey-600">
                {getStatusText(document.status, document.progress)}
              </span>
            </div>
          </div>

          {/* More Menu */}
          <DocumentMenu
            documentId={document.id}
            documentName={document.name}
            onDelete={() => onDelete(document)}
          />

          {/* Action */}
          {isActionable && (
            <Button
              variant="solid"
              size="sm"
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onContinue(document.id);
              }}
            >
              {document.status === 'labeling' ? '계속하기' : '시작하기'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function RegistrationPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadPDF();
  const deleteMutation = useDeleteDocument();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  // Phase 22-F-3: 팝업 차단 모달 상태
  const [showPopupBlockedModal, setShowPopupBlockedModal] = useState(false);

  const isUploading = uploadMutation.isPending;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadError(null);

    for (const file of acceptedFiles) {
      try {
        await uploadMutation.mutateAsync(file);
      } catch (error) {
        setUploadError(`${file.name} 업로드 실패`);
      }
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/haansofthwp': ['.hwp'],
      'application/hwpx': ['.hwpx'],
      'application/x-hwpml': ['.hml'],
    },
    multiple: true,
  });

  const handleContinueLabeling = (documentId: string) => {
    navigate(`/labeling/${documentId}`);
  };

  // Phase 21.7: 삭제 핸들러
  const handleDeleteClick = (document: DocumentItem) => {
    // 모든 문서에 대해 확인 모달 표시
    setDeleteTarget(document);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      showToast('문서가 삭제되었습니다', { type: 'success' });
      setDeleteTarget(null);
    } catch (error) {
      showToast('삭제에 실패했습니다. 다시 시도해주세요', { type: 'error' });
    }
  };

  const handleCloseDeleteModal = () => {
    setDeleteTarget(null);
  };

  // API 응답을 DocumentItem으로 매핑
  const mappedDocs: DocumentItem[] = documents?.map(doc => {
    // 상태 결정: analyzed_pages와 total_pages 비교
    let status: DocumentStatus;
    if (doc.analyzed_pages < doc.total_pages) {
      status = 'processing';
    } else {
      status = 'ready';  // 분석 완료 → 라벨링 대기
    }

    return {
      id: doc.document_id,
      name: doc.document_id,  // document_id를 이름으로 사용
      status,
      totalPages: doc.total_pages,
      labeledPages: 0,  // TODO: API에서 라벨링 페이지 수 가져오기
      createdAt: new Date(doc.created_at * 1000).toISOString(),
    };
  }) || [];

  // 문서를 상태별로 분류
  const inProgressDocs = mappedDocs.filter(d =>
    d.status === 'labeling' || d.status === 'ready'
  );
  const completedDocs = mappedDocs.filter(d => d.status === 'completed');
  const processingDocs = mappedDocs.filter(d =>
    d.status === 'uploading' || d.status === 'processing'
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-grey-900">등록 & 라벨링</h1>
        <p className="text-grey-600 mt-1">
          PDF, HWP, HWPX 파일을 업로드하고 문제를 라벨링하세요
        </p>
      </div>

      {/* Phase 33-A: 듀얼 문서 선택기 */}
      <div className="mb-8">
        <DualDocumentSelector />
      </div>

      {/* 구분선 */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-grey-200"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="bg-grey-50 px-4 py-1 rounded text-center">
            <span className="text-sm text-grey-600 font-medium">
              또는 파일을 하나씩 등록하세요
            </span>
            <p className="text-xs text-grey-400 mt-0.5">
              해설은 나중에 연결할 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <Card
        {...getRootProps()}
        className={cn(
          'p-12 border-2 border-dashed cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-toss-blue bg-toss-blue-light'
            : 'border-grey-200 hover:border-toss-blue hover:bg-grey-50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center">
          <motion.div
            animate={{
              scale: isDragActive ? 1.1 : 1,
              y: isDragActive ? -5 : 0
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors',
              isDragActive ? 'bg-toss-blue' : 'bg-grey-100'
            )}>
              <Upload className={cn(
                'w-8 h-8',
                isDragActive ? 'text-white' : 'text-grey-400'
              )} />
            </div>
          </motion.div>

          <h3 className={cn(
            'text-lg font-semibold mb-2',
            isDragActive ? 'text-toss-blue' : 'text-grey-900'
          )}>
            {isDragActive ? '여기에 놓으세요!' : '파일을 드래그하거나 클릭하세요'}
          </h3>
          <p className="text-grey-500 text-sm">
            PDF, HWP, HWPX, HML 파일 지원
          </p>

          {isUploading && (
            <div className="flex items-center gap-2 mt-4 text-toss-blue">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">업로드 중...</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 mt-4 text-error">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Processing Documents */}
      <AnimatePresence>
        {processingDocs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8"
          >
            <h2 className="text-lg font-semibold text-grey-900 mb-4">
              처리 중
            </h2>
            <div className="space-y-3">
              {processingDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onContinue={handleContinueLabeling}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* In Progress Documents */}
      {inProgressDocs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-grey-900 mb-4">
            진행 중인 라벨링
          </h2>
          <div className="space-y-3">
            {inProgressDocs.map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onContinue={handleContinueLabeling}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed Documents */}
      {completedDocs.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey-900">
              완료된 문서 ({completedDocs.length}개)
            </h2>
            <Button variant="ghost" size="sm">
              전체 보기
            </Button>
          </div>
          <div className="space-y-3">
            {completedDocs.slice(0, 3).map(doc => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onContinue={handleContinueLabeling}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!mappedDocs.length && !isUploading && (
        <div className="mt-12 text-center">
          <div className="w-16 h-16 bg-grey-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-grey-400" />
          </div>
          <h3 className="text-grey-900 font-medium mb-1">아직 문서가 없습니다</h3>
          <p className="text-grey-500 text-sm">
            위 영역에 파일을 드롭하여 시작하세요
          </p>
        </div>
      )}

      {/* Phase 21.7: 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
        documentName={deleteTarget?.name || ''}
        totalPages={deleteTarget?.totalPages}
        hasLabelingData={deleteTarget?.status === 'labeling' || deleteTarget?.status === 'completed'}
      />

      {/* Phase 22-F-5: 팝업 차단 안내 모달 */}
      <PopupBlockedModal
        isOpen={showPopupBlockedModal}
        onClose={() => setShowPopupBlockedModal(false)}
        onRetry={() => {
          setShowPopupBlockedModal(false);
          // 사용자가 다시 매칭 시작 버튼을 클릭하도록 안내
        }}
        onSingleWindow={() => {
          setShowPopupBlockedModal(false);
          showToast('단일 창 모드로 진행합니다. 문서를 업로드 후 개별 라벨링을 시작하세요.', { type: 'info' });
        }}
      />
    </div>
  );
}
