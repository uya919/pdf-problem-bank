/**
 * Supabase 클라이언트 설정
 *
 * 사용법:
 * import { supabase, isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase';
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Mock 모드 강제 활성화
 * - true: Supabase 비활성화, Mock 데이터만 사용
 * - false: Supabase 사용 (환경변수 설정 필요)
 *
 * 2025-12-15: Phase 4-E에서 새 Supabase 연결 활성화
 */
const FORCE_MOCK_MODE = false;

/**
 * Supabase 환경 변수가 설정되어 있는지 확인
 */
export const isSupabaseConfigured = FORCE_MOCK_MODE
  ? false  // Mock 모드 강제
  : Boolean(
      supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== 'https://your-project-id.supabase.co'
    );

/**
 * Supabase 클라이언트 (타입 적용됨)
 * - hyeyum 스키마와 100% 호환
 * - 환경 변수가 없으면 더미 URL로 생성 (기능 비활성화됨)
 * - sessionStorage 사용: 새로고침 시 로그인 유지, 브라우저 종료 시 로그아웃
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,  // 세션 저장 활성화
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
      storageKey: 'hyeyum-auth-session',
    },
  }
);

/**
 * Supabase 연결 테스트
 * @returns 연결 성공 여부와 에러 메시지
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: {
    url: string;
    hasKey: boolean;
  };
}> {
  // 환경 변수 확인
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.',
      details: {
        url: supabaseUrl || '(없음)',
        hasKey: Boolean(supabaseAnonKey),
      },
    };
  }

  try {
    // 간단한 쿼리로 연결 테스트
    const { error } = await supabase.from('profiles').select('count').limit(1);

    if (error) {
      // RLS 정책으로 인한 에러는 연결은 성공한 것
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        return {
          success: true,
          message: 'Supabase 연결 성공 (인증 필요)',
          details: {
            url: supabaseUrl,
            hasKey: true,
          },
        };
      }

      // 테이블이 없는 경우
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Supabase 연결 성공 (테이블 미생성)',
          details: {
            url: supabaseUrl,
            hasKey: true,
          },
        };
      }

      return {
        success: false,
        message: `Supabase 에러: ${error.message}`,
        details: {
          url: supabaseUrl,
          hasKey: true,
        },
      };
    }

    return {
      success: true,
      message: 'Supabase 연결 성공!',
      details: {
        url: supabaseUrl,
        hasKey: true,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: `연결 실패: ${err instanceof Error ? err.message : '알 수 없는 에러'}`,
      details: {
        url: supabaseUrl,
        hasKey: Boolean(supabaseAnonKey),
      },
    };
  }
}

/**
 * 개발자 콘솔에서 연결 테스트 실행
 * 브라우저 콘솔에서: window.testSupabase()
 */
if (typeof window !== 'undefined') {
  (window as unknown as { testSupabase: typeof testSupabaseConnection }).testSupabase = testSupabaseConnection;
}
