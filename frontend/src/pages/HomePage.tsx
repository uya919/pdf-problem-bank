/**
 * HomePage - 역할 기반 리다이렉트
 *
 * 동작:
 * - teacher → /backoffice
 * - admin/owner → /admin (모든 디바이스에서 반응형 처리)
 *
 * Stage 12-1: profile 로딩 대기 추가
 * Stage 29-C: 관리자 모바일 분기 제거 (강사용 UI로 통합)
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { role, isLoading, isAuthenticated, profile, profileError } = useAuth();

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 → 로그인
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Stage 12-1: profile 로딩 대기 (인증됐지만 profile 아직 없음)
  if (!profile && !profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-gray-500">프로필 로딩 중...</p>
        </div>
      </div>
    );
  }

  // Stage 12-1: profile 로딩 실패 시 기본값으로 backoffice 이동
  if (profileError) {
    console.warn('프로필 로딩 실패, 기본 페이지로 이동:', profileError);
    return <Navigate to="/backoffice" replace />;
  }

  // 강사 → 강사용 대시보드
  if (role === 'teacher') {
    return <Navigate to="/backoffice" replace />;
  }

  // Stage 29-C: 관리자/원장 → 모든 디바이스에서 /admin (반응형 처리)
  return <Navigate to="/admin" replace />;
}
