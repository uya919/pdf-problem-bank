/**
 * 문서 목록 컴포넌트 (Phase 2)
 */
import { useDocuments, useDeleteDocument } from '../hooks/useDocuments';
import type { Document } from '../api/client';

interface DocumentListProps {
  onSelectDocument?: (document: Document) => void;
}

export function DocumentList({ onSelectDocument }: DocumentListProps) {
  const { data: documents, isLoading, error } = useDocuments();
  const deleteMutation = useDeleteDocument();

  const handleDelete = async (documentId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm(`문서 '${documentId}'를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(documentId);
      alert('문서가 삭제되었습니다');
    } catch (error: any) {
      console.error('삭제 실패:', error);
      alert(`삭제 실패: ${error.response?.data?.detail || error.message}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ko-KR');
  };

  const getStatusBadge = (doc: Document) => {
    const progress = (doc.analyzed_pages / doc.total_pages) * 100;

    if (progress === 100) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
          완료
        </span>
      );
    } else if (progress > 0) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
          분석 중 ({Math.round(progress)}%)
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-grey-100 text-grey-800">
          대기
        </span>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-grey-500">문서 목록 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">
          문서 목록 로딩 실패: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-grey-500">
          PDF를 업로드하여 시작하세요
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">문서 목록 ({documents.length})</h2>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.document_id}
            onClick={() => onSelectDocument?.(doc)}
            className="p-4 border rounded-lg hover:bg-grey-50 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate" title={doc.document_id}>
                  {doc.document_id}
                </h3>

                <div className="mt-2 flex items-center gap-4 text-sm text-grey-600">
                  <span>
                    {doc.total_pages}페이지
                  </span>
                  <span>
                    분석: {doc.analyzed_pages}/{doc.total_pages}
                  </span>
                  <span className="text-xs">
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getStatusBadge(doc)}

                <button
                  onClick={(e) => handleDelete(doc.document_id, e)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* 진행 바 */}
            {doc.analyzed_pages < doc.total_pages && (
              <div className="mt-3">
                <div className="w-full bg-grey-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(doc.analyzed_pages / doc.total_pages) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
