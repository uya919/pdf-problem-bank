/**
 * ViewerPage - 듀얼 윈도우 뷰어 페이지
 * Phase 22-H-1: 문제/해설 PDF 뷰어
 *
 * URL: /viewer/:documentId?session=SESSION_ID&role=problem|solution
 *
 * 듀얼 윈도우 매칭 모드에서 사용되는 전용 뷰어
 * - 세션 ID와 역할(문제/해설) 파라미터 처리
 * - 사이드바 없는 전체 화면 레이아웃
 * - PageViewer 컴포넌트 재사용
 */
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { ViewerHeader } from '@/components/viewer';
import { PageViewer } from './PageViewer';
import { Button } from '@/components/ui';
import { useDocument } from '@/hooks/useDocuments';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';

export function ViewerPage() {
  // URL 파라미터
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();

  // 쿼리 파라미터 파싱
  const sessionId = searchParams.get('session');
  const role = searchParams.get('role') as 'problem' | 'solution' | null;

  // 듀얼 모드 판별: session과 role이 모두 있으면 듀얼 모드
  const isDualMode = !!(sessionId && role);

  // 문서 정보 조회
  const { data: document, isLoading, error } = useDocument(documentId || '');

  // 단축키 모달 상태
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  // 페이지 타이틀 업데이트 (듀얼 모드에서 역할 표시)
  useEffect(() => {
    if (document && isDualMode && role) {
      const roleLabel = role === 'problem' ? '문제' : '해설';
      window.document.title = `${roleLabel} - ${document.document_id}`;
    } else if (document) {
      window.document.title = document.document_id;
    }

    return () => {
      window.document.title = 'PDF 라벨링';
    };
  }, [document, isDualMode, role]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-grey-50">
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
      <div className="flex h-screen items-center justify-center bg-grey-50">
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
          <Button
            variant="solid"
            onClick={() => window.close()}
          >
            창 닫기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-grey-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ViewerHeader
          documentName={document.document_id}
          totalPages={document.total_pages}
          role={role}
          sessionId={sessionId}
          isDualMode={isDualMode}
          onShowShortcuts={() => setShowShortcuts(true)}
        />
      </motion.div>

      {/* Main Content - PageViewer 재사용 */}
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
