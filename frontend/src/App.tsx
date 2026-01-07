/**
 * Main Application
 * Backoffice Only - PDF 라벨링은 별도 프로젝트로 이동
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';

// Home Page (역할별 분기)
import HomePage from './pages/HomePage';

// Backoffice Pages (강사용 모바일)
import { BackofficeDemo } from './pages/BackofficeDemo';
import ClassesPage from './pages/backoffice/ClassesPage';
import StudentsPage from './pages/backoffice/StudentsPage';
import StudentDetailPage from './pages/backoffice/StudentDetailPage';
import RecordsPage from './pages/backoffice/RecordsPage';
import MorePage from './pages/backoffice/MorePage';

// Admin Pages (관리자용 PC)
import {
  AdminDashboard,
  GradeOverview,
  OperationsPage,
  AttendancePage,
  AdminStudentsPage,
  SettlementPage,
  ReportsPage,
  UsersPage,
  ClassManagementPage,
} from './pages/admin';
import ClassAssignmentPage from './pages/admin/ClassAssignmentPage';

// Phase 7-9: 과목별 반 배정 (드래그&드롭)
import { ClassAssignmentPageDnd, ClassAssignmentPageV2, ClassAssignmentPageV3 } from './components/classAssignment';

// Admin Responsive Page (Stage 11-2: 반응형 통합 - 모바일/PC 자동전환)
import AdminResponsivePage from './pages/admin/AdminResponsivePage';

// Stage 12: 순환수업 관리
import RotationManagement from './pages/admin/RotationManagement';

// Stage 18: 교재 관리
import TextbookManagement from './pages/admin/TextbookManagement';

// Stage 19: 시험 관리
import ExamManagement from './pages/admin/ExamManagement';

// Stage 33: 상담 관리
import {
  NewConsultationPage,
  StudentConsultationPage,
  ConsultationListPage,
  EditConsultationPage,
} from './pages/admin/consultation';

// Stage 33: 설정 (과목별 관리자)
import { SubjectManagerSettingsPage } from './pages/admin/settings';

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
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* ===== 공개 페이지 ===== */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* ===== 홈 (역할별 자동 분기) ===== */}
                <Route path="/" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <HomePage />
                  </ProtectedRoute>
                } />

                {/* ===== 강사용 모바일 (/backoffice) - 강사/관리자/원장 ===== */}
                <Route path="/backoffice" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <BackofficeDemo />
                  </ProtectedRoute>
                } />
                <Route path="classes" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <ClassesPage />
                  </ProtectedRoute>
                } />
                <Route path="students" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <StudentsPage />
                  </ProtectedRoute>
                } />
                <Route path="students/:studentId" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <StudentDetailPage />
                  </ProtectedRoute>
                } />
                <Route path="records" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <RecordsPage />
                  </ProtectedRoute>
                } />
                <Route path="more" element={
                  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
                    <MorePage />
                  </ProtectedRoute>
                } />

                {/* ===== 관리자용 (반응형: 모바일/PC 자동전환) - 관리자/원장만 ===== */}
                <Route path="admin" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <AdminResponsivePage />
                  </ProtectedRoute>
                } />
                <Route path="admin/grade-overview" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <GradeOverview />
                  </ProtectedRoute>
                } />
                <Route path="admin/grades" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <GradeOverview />
                  </ProtectedRoute>
                } />
                <Route path="admin/students" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <AdminStudentsPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/class-assignment" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ClassAssignmentPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/subject-assignment" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ClassAssignmentPageV3 />
                  </ProtectedRoute>
                } />
                <Route path="admin/subject-assignment-v1" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ClassAssignmentPageDnd />
                  </ProtectedRoute>
                } />
                <Route path="admin/attendance" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <AttendancePage />
                  </ProtectedRoute>
                } />
                <Route path="admin/operations" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <OperationsPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/classes" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ClassManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/settlement" element={
                  <ProtectedRoute roles={['owner']}>
                    <SettlementPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/reports" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ReportsPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/users" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <UsersPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/rotation" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <RotationManagement />
                  </ProtectedRoute>
                } />
                <Route path="admin/textbooks" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <TextbookManagement />
                  </ProtectedRoute>
                } />
                <Route path="admin/exams" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ExamManagement />
                  </ProtectedRoute>
                } />

                {/* ===== Stage 33: 상담 관리 ===== */}
                <Route path="admin/consultations" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ConsultationListPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/consultation/new" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <NewConsultationPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/consultation/student" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <StudentConsultationPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/consultation/list" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <ConsultationListPage />
                  </ProtectedRoute>
                } />
                <Route path="admin/consultation/edit/:id" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <EditConsultationPage />
                  </ProtectedRoute>
                } />

                {/* ===== Stage 33: 설정 ===== */}
                <Route path="admin/settings/subject-managers" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <SubjectManagerSettingsPage />
                  </ProtectedRoute>
                } />

                <Route path="admin/*" element={
                  <ProtectedRoute roles={['admin', 'owner']}>
                    <AdminResponsivePage />
                  </ProtectedRoute>
                } />

                {/* ===== /admin-mobile → /admin 리다이렉트 (Stage 11-3, 29-D) ===== */}
                <Route path="admin-mobile" element={<Navigate to="/admin" replace />} />
                <Route path="admin-mobile/*" element={<Navigate to="/admin" replace />} />

                {/* 모든 알 수 없는 경로 → 로그인으로 */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
