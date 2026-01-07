/**
 * 관리자 반응형 통합 페이지 (Stage 11-2, 29-E)
 *
 * Stage 29-E: 역할 토글 기반 조건부 렌더링
 *
 * viewMode === 'teacher':
 * - 모바일: BackofficeDemo (강사용 4탭)
 * - 태블릿/PC: AdminDashboard + 헤더에 RoleToggle
 *
 * viewMode === 'admin':
 * - 모바일: BackofficeDemo (관리자 기능 포함)
 * - 태블릿/PC: AdminDashboard + 헤더에 RoleToggle
 */
import { useIsMobile } from '@/hooks/useIsMobile';
import { useViewModeStore } from '@/stores/viewModeStore';
import { RoleToggle } from '@/components/admin/RoleToggle';
import AdminDashboard from './AdminDashboard';
import { BackofficeDemo } from '../BackofficeDemo';

export default function AdminResponsivePage() {
  const isMobile = useIsMobile();
  const { viewMode } = useViewModeStore();

  // 모바일: 모든 모드에서 BackofficeDemo 사용 (강사용 UI)
  if (isMobile) {
    return <BackofficeDemo />;
  }

  // 태블릿/PC: AdminDashboard + 헤더에 RoleToggle
  // Note: AdminDashboard 내부에서 RoleToggle을 표시해야 함
  return <AdminDashboard />;
}
