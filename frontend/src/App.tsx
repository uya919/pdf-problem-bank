/**
 * Main Application
 * Phase 21.5: 새로운 미니멀 UI with 3-메뉴 사이드바
 * Phase 22-H: 듀얼 윈도우 뷰어 라우트 추가
 * Phase 34: 메인 페이지 UX 리디자인
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { MinimalLayout } from './components/layout/MinimalLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages - 새로운 구조
import { MainPage } from './pages/MainPage';  // Phase 34: 새 메인 페이지
import { RegistrationPage } from './pages/RegistrationPage';  // Legacy (백업용)
import { LabelingPage } from './pages/LabelingPage';
import { ViewerPage } from './pages/ViewerPage';  // Phase 22-H
import { UnifiedMatchingPage } from './pages/UnifiedMatchingPage';  // Phase 31
import { IntegratedProblemBankPage } from './pages/IntegratedProblemBankPage';
import { ProblemBankHub } from './pages/ProblemBankHub';  // Phase 23-D
import { ExamBuilderPage } from './pages/ExamBuilderPage';
import { ExamEditorPage } from './pages/ExamEditorPage';
import { SettingsPage } from './pages/SettingsPage';

// Phase 32: 작업 세션 워크플로우
import { WorkSessionDashboard } from './pages/WorkSessionDashboard';
import { WorkSessionLabelingPage } from './pages/WorkSessionLabelingPage';
import { WorkSessionSetupPage } from './pages/WorkSessionSetupPage';
import { WorkSessionMatchingPage } from './pages/WorkSessionMatchingPage';
// Phase 33: 통합 작업 페이지
import { UnifiedWorkPage } from './pages/UnifiedWorkPage';

// React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Phase 22-H: 듀얼 윈도우 뷰어 (사이드바 없음) */}
              <Route path="viewer/:documentId" element={<ViewerPage />} />

              {/* Phase 31: 싱글 탭 매칭 (사이드바 없음) */}
              <Route path="matching/:problemDocId/:solutionDocId" element={<UnifiedMatchingPage />} />

              {/* Phase 33: 통합 작업 페이지 (사이드바 없음) */}
              <Route path="work/:sessionId" element={<UnifiedWorkPage />} />

              {/* Phase 32: 기존 작업 세션 워크플로우 (하위 호환) */}
              <Route path="work/:sessionId/labeling" element={<WorkSessionLabelingPage />} />
              <Route path="work/:sessionId/setup" element={<WorkSessionSetupPage />} />
              <Route path="work/:sessionId/matching" element={<WorkSessionMatchingPage />} />

              {/* Phase 21.5: 미니멀 레이아웃 (사이드바 있는 페이지들) */}
              <Route element={<MinimalLayout />}>
                {/* Phase 34-D: 메인 페이지 (사이드바 포함) */}
                <Route path="/" element={<MainPage />} />
                <Route index element={<MainPage />} />

                {/* Legacy: 기존 등록 페이지 (백업용) */}
                <Route path="registration" element={<RegistrationPage />} />
                <Route path="labeling/:documentId" element={<LabelingPage />} />

                {/* Phase 34: /work를 메인으로 리다이렉트 */}
                <Route path="work" element={<Navigate to="/" replace />} />

                {/* 문제은행 - Phase 23-D: 허브 UI */}
                <Route path="bank" element={<ProblemBankHub />} />
                <Route path="integrated-problem-bank" element={<IntegratedProblemBankPage />} />

                {/* 시험지 */}
                <Route path="exam" element={<ExamBuilderPage />} />
                <Route path="exam/:examId" element={<ExamEditorPage />} />

                {/* 설정 */}
                <Route path="settings" element={<SettingsPage />} />

                {/* Redirect unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
