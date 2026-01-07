/**
 * 사용자 액션 메뉴 (Phase 8-5)
 * 권한 변경, 비밀번호 리셋, 비활성화 등
 *
 * Stage 11-5: 드롭다운 방향 자동 감지 추가
 * - 화면 하단에서는 메뉴가 위로 열림
 */
import { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../../api/adminUsers';
import { useUpdateUserRole, useDeactivateUser, useActivateUser, useDeleteUser } from '../../../hooks/useAdminUsers';
import { useAuth } from '../../../contexts/AuthContext';

interface UserActionsMenuProps {
  user: UserProfile;
  onResetPassword: () => void;
}

export function UserActionsMenu({ user, onResetPassword }: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('down');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { profile } = useAuth();
  const updateRoleMutation = useUpdateUserRole();
  const deactivateMutation = useDeactivateUser();
  const activateMutation = useActivateUser();
  const deleteMutation = useDeleteUser();

  // owner만 액션 가능
  const isOwner = profile?.role === 'owner';

  // owner 계정은 수정 불가
  const isTargetOwner = user.role === 'owner';

  // 본인 계정은 일부 액션 불가
  const isSelf = profile?.id === user.id;

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stage 11-5: 드롭다운 방향 감지
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 320; // 예상 메뉴 높이 (권한변경 + 비밀번호리셋 + 비활성화 + 삭제)
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // 아래 공간이 부족하고 위에 공간이 충분하면 위로 열기
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

  // owner가 아니면 메뉴 표시 안함
  if (!isOwner) {
    return null;
  }

  // owner 계정은 수정 불가
  if (isTargetOwner) {
    return (
      <span className="text-xs text-grey-400">수정 불가</span>
    );
  }

  const handleRoleChange = async (newRole: 'teacher' | 'admin') => {
    try {
      await updateRoleMutation.mutateAsync({ userId: user.id, role: newRole });
      setIsOpen(false);
    } catch (error) {
      console.error('권한 변경 실패:', error);
    }
  };

  const handleToggleActive = async () => {
    try {
      if (user.is_active) {
        await deactivateMutation.mutateAsync(user.id);
      } else {
        await activateMutation.mutateAsync(user.id);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
      >
        ⋯
      </button>

      {isOpen && (
        <div className={`absolute right-0 w-48 bg-white rounded-xl shadow-lg border border-grey-200 py-1 z-10 ${
          openDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {/* 권한 변경 */}
          {!isSelf && (
            <>
              <div className="px-3 py-2 text-xs text-grey-500 font-medium border-b border-grey-100">
                권한 변경
              </div>
              <button
                onClick={() => handleRoleChange('teacher')}
                disabled={user.role === 'teacher' || updateRoleMutation.isPending}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-grey-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                  user.role === 'teacher' ? 'text-blue-600 font-medium' : 'text-grey-700'
                }`}
              >
                {user.role === 'teacher' && '✓ '}강사 (teacher)
              </button>
              <button
                onClick={() => handleRoleChange('admin')}
                disabled={user.role === 'admin' || updateRoleMutation.isPending}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-grey-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                  user.role === 'admin' ? 'text-blue-600 font-medium' : 'text-grey-700'
                }`}
              >
                {user.role === 'admin' && '✓ '}관리자 (admin)
              </button>
            </>
          )}

          {/* 구분선 */}
          {!isSelf && <div className="border-t border-grey-100 my-1" />}

          {/* 비밀번호 리셋 */}
          {!isSelf && (
            <button
              onClick={() => {
                onResetPassword();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-grey-700 hover:bg-grey-50"
            >
              🔑 비밀번호 리셋
            </button>
          )}

          {/* 비활성화/활성화 */}
          {!isSelf && (
            <button
              onClick={handleToggleActive}
              disabled={deactivateMutation.isPending || activateMutation.isPending}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-grey-50 disabled:opacity-50 ${
                user.is_active ? 'text-orange-600' : 'text-green-600'
              }`}
            >
              {user.is_active ? '🚫 비활성화' : '✅ 재활성화'}
            </button>
          )}

          {/* 삭제 */}
          {!isSelf && (
            <button
              onClick={async () => {
                if (window.confirm(`정말 "${user.name}" 계정을 삭제하시겠습니까?\n\n⚠️ 이 작업은 복구할 수 없습니다.`)) {
                  try {
                    await deleteMutation.mutateAsync(user.id);
                    setIsOpen(false);
                  } catch (error) {
                    console.error('삭제 실패:', error);
                  }
                }
              }}
              disabled={deleteMutation.isPending}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              🗑️ 삭제
            </button>
          )}

          {/* 본인인 경우 */}
          {isSelf && (
            <div className="px-3 py-2 text-sm text-grey-500">
              본인 계정은 설정에서 관리하세요
            </div>
          )}
        </div>
      )}
    </div>
  );
}
