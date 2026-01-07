/**
 * Protected Route 컴포넌트
 * - 인증 필요 페이지 보호
 * - 권한 체크
 *
 * Stage 11-7: 프로필 로딩 중에도 접근 허용
 * - user 있으면 인증 완료, profile은 백그라운드 로딩
 *
 * Stage 11-8: 프로필 로딩 실패 처리
 * - profileError 상태 체크
 * - 재시도 버튼 제공
 *
 * Stage 12-1: teacher의 admin 접근 시 친절한 리다이렉트
 * - teacher가 admin 전용 페이지 접근 시 /backoffice로 리다이렉트
 * - /unauthorized는 정말 권한이 없는 경우에만 표시
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** 접근 가능한 역할 목록 (없으면 로그인만 체크) */
  roles?: UserRole[];
}

/**
 * 로딩 스피너 컴포넌트
 */
function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
        <p className="text-grey-500 text-sm">{message}</p>
      </div>
    </div>
  );
}

/**
 * 프로필 로딩 실패 에러 컴포넌트
 * Stage 11-8: 재시도 버튼 + 로그인 페이지 이동 버튼
 */
function ProfileLoadError({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50">
      <div className="text-center max-w-sm px-4">
        <div className="text-red-500 text-4xl mb-4">!</div>
        <h2 className="text-lg font-semibold text-grey-900 mb-2">
          프로필을 불러올 수 없습니다
        </h2>
        <p className="text-grey-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            다시 시도
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-grey-200 text-grey-700 rounded-lg hover:bg-grey-300 transition-colors text-sm font-medium"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, profile, profileError, refetchProfile } = useAuth();
  const location = useLocation();

  // 로딩 중
  if (isLoading) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  // 미인증 → 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Stage 11-8: 권한 체크가 필요한 경우
  if (roles && roles.length > 0) {
    // Case 1: 프로필 로딩 실패 (에러 발생)
    if (profileError) {
      return (
        <ProfileLoadError
          message={profileError}
          onRetry={refetchProfile}
        />
      );
    }

    // Case 2: 프로필 아직 로딩 중 (isLoading=false지만 profile=null, error=null)
    if (!profile && !profileError) {
      return <LoadingSpinner message="프로필 로딩 중..." />;
    }

    // Case 3: 프로필 있음 → 권한 체크
    if (profile && !hasPermission(roles)) {
      // Stage 12-1: teacher가 admin 전용 페이지 접근 시 backoffice로 친절히 리다이렉트
      if (profile.role === 'teacher') {
        return <Navigate to="/backoffice" replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
