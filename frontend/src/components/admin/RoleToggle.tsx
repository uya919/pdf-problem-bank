/**
 * RoleToggle - 강사/관리자 뷰 모드 전환 토글
 *
 * Stage 29-B: 역할 토글 + UI 통합
 * Stage 31-fix: 모드 전환 시 페이지 리다이렉트 추가
 *
 * 위치: PC/태블릿 헤더 우측
 * 동작: 클릭 시 viewMode 전환 + 해당 모드 페이지로 이동
 */
import { useNavigate } from 'react-router-dom';
import { useViewModeStore } from '../../stores/viewModeStore';
import { User, Settings } from 'lucide-react';

interface RoleToggleProps {
  className?: string;
}

export function RoleToggle({ className = '' }: RoleToggleProps) {
  const navigate = useNavigate();
  const { viewMode, setViewMode } = useViewModeStore();

  /**
   * 모드 전환 핸들러
   * - viewMode 변경
   * - 해당 모드의 메인 페이지로 리다이렉트
   */
  const handleModeChange = (mode: 'teacher' | 'admin') => {
    if (viewMode === mode) return; // 이미 해당 모드면 무시

    setViewMode(mode);

    // 모드에 따른 리다이렉트
    if (mode === 'teacher') {
      navigate('/backoffice');
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => handleModeChange('teacher')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'teacher'
            ? 'bg-white text-[#3182F6] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <User size={16} />
        <span>강사</span>
      </button>
      <button
        onClick={() => handleModeChange('admin')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'admin'
            ? 'bg-white text-[#3182F6] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Settings size={16} />
        <span>관리자</span>
      </button>
    </div>
  );
}

export default RoleToggle;
