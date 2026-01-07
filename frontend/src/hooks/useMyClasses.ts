/**
 * 로그인한 강사의 수업 관련 훅
 * Stage 8-6-D: 강사-수업 연결
 *
 * - useMyTeacherId: 로그인한 강사의 teacher_id 조회
 * - useMyClasses: 로그인한 강사의 수업 목록 조회
 * - useTeacherMappingStatus: 매핑 상태 조회 (admin용)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// =====================================================
// Types
// =====================================================

interface Class {
  id: string;
  name: string;
  subject: string;
  teacher_id: string;
  grade_id: string | null;
  day_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeacherMappingStatus {
  profile_id: string;
  profile_name: string;
  profile_email: string;
  teacher_id: string | null;
  teacher_name: string | null;
  is_mapped: boolean;
}

// =====================================================
// Hooks
// =====================================================

/**
 * 로그인한 강사의 teacher_id 조회
 * - profile_teacher_mapping 테이블에서 조회
 * - 매핑이 없으면 null 반환
 */
export function useMyTeacherId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myTeacherId', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_teacher_id');

      if (error) {
        console.error('get_my_teacher_id 오류:', error);
        throw error;
      }

      return data as string | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

/**
 * 로그인한 강사의 수업 목록 조회
 * - teacher: 자기 수업만
 * - admin/owner: 전체 수업
 */
export function useMyClasses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myClasses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_classes');

      if (error) {
        console.error('get_my_classes 오류:', error);
        throw error;
      }

      return data as Class[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2분 캐시
  });
}

/**
 * 강사 매핑 상태 조회 (admin/owner용)
 * - v_teacher_mapping_status 뷰에서 조회
 * - 매핑된 강사와 미매핑 강사 모두 표시
 */
export function useTeacherMappingStatus() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['teacherMappingStatus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_teacher_mapping_status')
        .select('*')
        .order('profile_name');

      if (error) {
        console.error('매핑 상태 조회 오류:', error);
        throw error;
      }

      return data as TeacherMappingStatus[];
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 1, // 1분 캐시
  });
}

/**
 * 프로필-강사 연결 (admin/owner용)
 */
export function useLinkTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, teacherId }: { profileId: string; teacherId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('link_profile_to_teacher', {
        p_profile_id: profileId,
        p_teacher_id: teacherId,
      });

      if (error) {
        console.error('강사 연결 오류:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['teacherMappingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['myTeacherId'] });
      queryClient.invalidateQueries({ queryKey: ['myClasses'] });
    },
  });
}

/**
 * 프로필-강사 연결 해제 (admin/owner용)
 */
export function useUnlinkTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('unlink_profile_from_teacher', {
        p_profile_id: profileId,
      });

      if (error) {
        console.error('강사 연결 해제 오류:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['teacherMappingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['myTeacherId'] });
      queryClient.invalidateQueries({ queryKey: ['myClasses'] });
    },
  });
}

interface UnmappedTeacher {
  id: string;
  name: string;
  email: string;
  subject: string;
}

/**
 * 미연결 강사 목록 조회 (연결 선택용)
 * - teachers 테이블에서 아직 매핑되지 않은 강사
 */
export function useUnmappedTeachers() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['unmappedTeachers'],
    queryFn: async (): Promise<UnmappedTeacher[]> => {
      // 이미 매핑된 teacher_id 목록
      const { data: mappings } = await supabase
        .from('profile_teacher_mapping')
        .select('teacher_id');

      const mappedIds = ((mappings || []) as { teacher_id: string }[]).map(m => m.teacher_id);

      // 매핑되지 않은 강사 조회
      let query = supabase
        .from('teachers')
        .select('id, name, email, subject')
        .eq('is_active', true)
        .order('name');

      if (mappedIds.length > 0) {
        query = query.not('id', 'in', `(${mappedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('미연결 강사 조회 오류:', error);
        throw error;
      }

      return (data || []) as UnmappedTeacher[];
    },
    enabled: isAdmin,
    staleTime: 1000 * 60 * 1, // 1분 캐시
  });
}
