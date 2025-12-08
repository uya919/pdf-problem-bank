/**
 * Labeling Page
 * Phase 21.6: 토스 스타일 + 라우팅 개선
 *
 * 문서별 라벨링 작업 페이지
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Keyboard } from 'lucide-react';
import { PageViewer } from './PageViewer';
import { Button } from '@/components/ui';
import { useDocument } from '@/hooks/useDocuments';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';

export function LabelingPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 문서 정보 조회
  const { data: document, isLoading, error } = useDocument(documentId || '');

  // 키보드 단축키: ? 로 도움말 토글
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-toss-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-grey-600">문서 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 또는 문서 없음
  if (error || !document) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-grey-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-grey-400" />
          </div>
          <h2 className="text-xl font-semibold text-grey-900 mb-2">
            문서를 찾을 수 없습니다
          </h2>
          <p className="text-grey-600 mb-6">
            요청한 문서가 존재하지 않거나 삭제되었을 수 있습니다.
          </p>
          <Button variant="solid" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            등록 페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 bg-white border-b border-grey-100 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-grey-600" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-grey-900">
                {document.document_id}
              </h1>
              <p className="text-sm text-grey-500">
                {document.total_pages}페이지 · 라벨링 작업
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowShortcuts(true)}
              className="text-grey-500"
            >
              <Keyboard className="w-4 h-4 mr-1.5" />
              단축키
              <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-grey-100 rounded">?</kbd>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <PageViewer
          documentId={document.document_id}
          totalPages={document.total_pages}
        />
      </main>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
