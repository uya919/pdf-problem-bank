/**
 * useSyncPermission - 동기화 권한 체크 훅 (Phase 6-F)
 *
 * profiles 테이블의 sync_permission 필드를 확인하여
 * 현재 사용자가 동기화 권한이 있는지 체크합니다.
 *
 * 권한 조건:
 * - role = 'director' (원장) → 자동 부여
 * - sync_permission = true → 명시적 부여
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Profile } from '../types/database';

interface SyncPermissionState {
  canSync: boolean;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useSyncPermission() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<SyncPermissionState>({
    canSync: false,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setState({
        canSync: false,
        profile: null,
        loading: false,
        error: null,
      });
      return;
    }

    // 프로필 조회
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // 프로필이 없는 경우 - 권한 없음으로 처리
          setState({
            canSync: false,
            profile: null,
            loading: false,
            error: error.message,
          });
          return;
        }

        const profile = data as Profile;

        // 권한 체크: director 또는 sync_permission = true
        const hasPermission =
          profile.role === 'director' || profile.sync_permission === true;

        setState({
          canSync: hasPermission,
          profile,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState({
          canSync: false,
          profile: null,
          loading: false,
          error: err instanceof Error ? err.message : '프로필 조회 실패',
        });
      }
    };

    fetchProfile();
  }, [user, authLoading]);

  return state;
}

export default useSyncPermission;
