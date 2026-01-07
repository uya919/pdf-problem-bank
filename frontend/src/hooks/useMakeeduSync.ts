/**
 * 메이크에듀 동기화 훅 (Phase 6-E, 6-F)
 *
 * 동기화 모달 상태 관리 + 권한 체크 통합 훅
 */

import { useState, useCallback } from 'react';
import { useSyncPermission } from './useSyncPermission';

export function useMakeeduSync() {
  const [isOpen, setIsOpen] = useState(false);
  const { canSync, profile, loading: permissionLoading } = useSyncPermission();

  const openSyncModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSyncModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    // 모달 상태
    isOpen,
    openSyncModal,
    closeSyncModal,

    // 권한 정보 (Phase 6-F)
    canSync,
    profile,
    permissionLoading,
  };
}

export default useMakeeduSync;
