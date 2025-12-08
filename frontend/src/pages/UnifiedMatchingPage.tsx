/**
 * 통합 매칭 페이지 (Phase 31-A, 31-I: 패널 리사이즈)
 *
 * 싱글 탭 기반 문제-해설 매칭 메인 페이지
 * - 문제 탭: 문제 PDF 보기 + 그룹 생성
 * - 해설 탭: 해설 PDF 보기 + 문제와 연결
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { useMatchingStore } from '../stores/matchingStore';
import { useDocument } from '../hooks/useDocuments';
import { MatchingHeader, ProblemListPanel, MatchingCanvas, ResizeHandle } from '../components/unified';
import { Button } from '../components/ui/Button';

// Phase 31-I: 패널 너비 상수
const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 480;
const DEFAULT_PANEL_WIDTH = 320;

export function UnifiedMatchingPage() {
  const { problemDocId, solutionDocId } = useParams<{
    problemDocId: string;
    solutionDocId: string;
  }>();
  const navigate = useNavigate();

  // 스토어
  const {
    activeTab,
    setActiveTab,
    initSession,
  } = useMatchingStore();

  // Phase 31-I: 패널 너비 상태 (localStorage 저장)
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('matching-panel-width');
    return saved ? parseInt(saved, 10) : DEFAULT_PANEL_WIDTH;
  });

  // 패널 너비 변경 시 저장
  useEffect(() => {
    localStorage.setItem('matching-panel-width', String(panelWidth));
  }, [panelWidth]);

  // 리사이즈 핸들러
  const handleResize = useCallback((delta: number) => {
    setPanelWidth(prev => {
      const newWidth = prev + delta;
      return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
    });
  }, []);

  // 더블클릭으로 기본 너비 복원
  const handleResetWidth = useCallback(() => {
    setPanelWidth(DEFAULT_PANEL_WIDTH);
  }, []);

  // Phase 31: 탭 전환 키보드 단축키 (1, 2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '1') {
        setActiveTab('problem');
      } else if (e.key === '2') {
        setActiveTab('solution');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  // 문서 정보 조회
  const {
    data: problemDoc,
    isLoading: loadingProblem,
    error: errorProblem
  } = useDocument(problemDocId || '');

  const {
    data: solutionDoc,
    isLoading: loadingSolution,
    error: errorSolution
  } = useDocument(solutionDocId || '');

  // 세션 초기화
  useEffect(() => {
    if (problemDocId && solutionDocId && problemDoc && solutionDoc) {
      initSession(
        problemDocId,
        solutionDocId,
        // Phase 62-A: Document에 name 없으므로 document_id 사용
        problemDoc.document_id || '문제 PDF',
        solutionDoc.document_id || '해설 PDF'
      );
    }
  }, [problemDocId, solutionDocId, problemDoc, solutionDoc, initSession]);

  // 유효성 검사
  if (!problemDocId || !solutionDocId) {
    return (
      <div className="h-screen flex items-center justify-center bg-grey-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-grey-900 mb-2">문서 ID가 없습니다</h2>
          <p className="text-grey-500 mb-6">
            문제 PDF와 해설 PDF를 먼저 선택해주세요.
          </p>
          <Button onClick={() => navigate('/')} variant="primary">
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 로딩
  if (loadingProblem || loadingSolution) {
    return (
      <div className="h-screen flex items-center justify-center bg-grey-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-grey-600 font-medium">문서 로딩 중...</p>
          <p className="text-sm text-grey-400 mt-1">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 에러
  if (errorProblem || errorSolution) {
    return (
      <div className="h-screen flex items-center justify-center bg-grey-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-grey-900 mb-2">문서를 불러올 수 없습니다</h2>
          <p className="text-grey-500 mb-6">
            {errorProblem?.message || errorSolution?.message || '알 수 없는 오류가 발생했습니다.'}
          </p>
          <Button onClick={() => navigate('/')} variant="primary">
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 현재 활성 문서 ID
  const currentDocId = activeTab === 'problem' ? problemDocId : solutionDocId;

  return (
    <div className="h-screen flex flex-col bg-grey-50">
      {/* 헤더 */}
      <MatchingHeader />

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 캔버스 영역 (왼쪽) - Phase 31-F: MatchingCanvas 연동 */}
        <div className="flex-1 overflow-hidden bg-white">
          <MatchingCanvas
            documentId={currentDocId}
            totalPages={activeTab === 'problem' ? (problemDoc?.total_pages || 1) : (solutionDoc?.total_pages || 1)}
          />
        </div>

        {/* Phase 31-I: 리사이즈 핸들 */}
        <ResizeHandle onResize={handleResize} onDoubleClick={handleResetWidth} />

        {/* 문제 목록 패널 (오른쪽) - Phase 31-I: 동적 너비 */}
        <div
          className="flex-shrink-0 bg-white overflow-hidden"
          style={{ width: panelWidth }}
        >
          <ProblemListPanel />
        </div>
      </div>

      {/* 하단 단축키 힌트 */}
      <div className="bg-white border-t px-4 py-2">
        <div className="flex items-center justify-center gap-6 text-xs text-grey-500">
          <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">←→</kbd> 페이지</span>
          <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">1</kbd> 문제</span>
          <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">2</kbd> 해설</span>
          <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">G</kbd> 그룹</span>
          <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">↑↓</kbd> 선택</span>
          <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">E</kbd> 편집</span>
        </div>
      </div>
    </div>
  );
}
