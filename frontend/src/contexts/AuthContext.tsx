/**
 * 인증 컨텍스트
 * - Supabase Auth 상태 관리
 * - 사용자 프로필 및 권한 관리
 *
 * Stage 11-6: 타임아웃 + 에러 핸들링 추가
 * - Ctrl+Shift+R 무한 로딩 버그 수정
 *
 * Stage 11-7: isAuthenticated 조건 완화
 * - user만 있으면 인증 완료 처리
 * - profile은 백그라운드 로딩 (새로고침 시 로그인 유지)
 *
 * Stage 11-8: 프로필 로딩 실패 처리
 * - profileError 상태 추가
 * - refetchProfile 함수로 재시도 지원
 *
 * Stage 11-9: 프로필 조회 최적화
 * - 중복 호출 방지 (isFetchingProfile ref)
 * - 타임아웃 5초 → 3초로 단축
 * - TOKEN_REFRESHED 이벤트 필터링
 */
import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// 인증 초기화 타임아웃 (3초)
const AUTH_INIT_TIMEOUT = 3000;

// =====================================================
// Types
// =====================================================

export type UserRole = 'teacher' | 'admin' | 'owner';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  // 상태
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  profileError: string | null;  // Stage 11-8: 프로필 로딩 에러

  // 권한
  role: UserRole | null;
  isTeacher: boolean;
  isAdmin: boolean;
  isOwner: boolean;

  // 액션
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refetchProfile: () => void;  // Stage 11-8: 프로필 재조회

  // 권한 체크
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

// =====================================================
// Context
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// Provider
// =====================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);  // Stage 11-8

  // Stage 11-6: 초기화 완료 여부 추적
  const isInitialized = useRef(false);

  // Stage 11-9: 중복 호출 방지
  const isFetchingProfile = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const cachedProfile = useRef<Profile | null>(null);  // Stage 11-10: 캐시된 프로필

  // 프로필 조회 (타임아웃 적용 + 중복 방지)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Stage 11-9: 중복 호출 방지
    if (isFetchingProfile.current && lastFetchedUserId.current === userId) {
      console.log('프로필 조회 중 - 스킵:', userId);
      return cachedProfile.current;
    }

    // Stage 11-10: 이미 같은 유저의 프로필이 캐시되어 있으면 스킵
    if (cachedProfile.current && cachedProfile.current.id === userId) {
      console.log('프로필 이미 로드됨 - 스킵:', userId);
      return cachedProfile.current;
    }

    isFetchingProfile.current = true;
    lastFetchedUserId.current = userId;

    try {
      console.log('프로필 조회 시작:', userId);
      setProfileError(null);  // Stage 11-8: 에러 초기화

      // 타임아웃이 적용된 프로필 조회
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('프로필 조회 타임아웃')), AUTH_INIT_TIMEOUT);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.error('프로필 조회 실패:', error);
        setProfileError(error.message || '프로필 조회 실패');  // Stage 11-8
        return null;
      }

      console.log('프로필 조회 성공:', data);
      cachedProfile.current = data as Profile;  // Stage 11-10: 캐시 저장
      return data as Profile;
    } catch (err) {
      console.error('프로필 조회 에러:', err);
      const errorMsg = err instanceof Error ? err.message : '프로필 조회 중 오류 발생';
      setProfileError(errorMsg);  // Stage 11-8
      return null;
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  // 초기화 및 세션 변경 감지
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Stage 11-6: 타임아웃 설정 - 최악의 경우에도 로딩 해제
    const timeoutId = setTimeout(() => {
      if (!isInitialized.current) {
        console.warn('인증 초기화 타임아웃 - 로딩 강제 해제');
        setIsLoading(false);
        isInitialized.current = true;
      }
    }, AUTH_INIT_TIMEOUT);

    // 현재 세션 가져오기
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 조회 에러:', error);
          clearTimeout(timeoutId);
          setIsLoading(false);
          isInitialized.current = true;
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }

        clearTimeout(timeoutId);
        setIsLoading(false);
        isInitialized.current = true;
      } catch (err) {
        console.error('인증 초기화 에러:', err);
        clearTimeout(timeoutId);
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    initAuth();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        // Stage 11-9: TOKEN_REFRESHED는 프로필 재조회 불필요
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // 중복 방지는 fetchProfile 내부에서 처리
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // 로그인
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // 로그아웃
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    cachedProfile.current = null;  // Stage 11-10: 캐시 초기화
    lastFetchedUserId.current = null;
  };

  // 권한 체크
  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!profile) return false;
    return requiredRoles.includes(profile.role);
  };

  // Stage 11-8: 프로필 재조회 함수
  const refetchProfile = useCallback(() => {
    if (user) {
      fetchProfile(user.id).then(setProfile);
    }
  }, [user, fetchProfile]);

  // 계산된 값
  const role = profile?.role ?? null;
  // Stage 11-7: user만 있으면 인증 완료 (profile은 백그라운드 로딩)
  const isAuthenticated = !!user;
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin' || role === 'owner';
  const isOwner = role === 'owner';

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated,
    profileError,  // Stage 11-8
    role,
    isTeacher,
    isAdmin,
    isOwner,
    signIn,
    signOut,
    refetchProfile,  // Stage 11-8
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// Hook
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
