/**
 * 강사 관리 API
 * - Supabase profiles 테이블에서 role='teacher' 조회/생성/수정/삭제
 *
 * Stage 9 확장: Mock 데이터 → Supabase 연결
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// =====================================================
// Types
// =====================================================

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTeacherInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  note?: string;
}

export interface UpdateTeacherInput {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  note?: string;
  is_active?: boolean;
}

// =====================================================
// API Functions
// =====================================================

/**
 * 모든 강사 조회 (role='teacher')
 */
export async function getTeachers(): Promise<Teacher[]> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured, returning empty array');
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, subject, note, is_active, created_at, updated_at')
    .eq('role', 'teacher')
    .order('name', { ascending: true });

  if (error) {
    console.error('강사 조회 실패:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * 강사 생성
 * - Supabase Auth에 사용자 생성 (admin API 필요)
 * - 또는 profiles 테이블에 직접 insert (Auth 없이)
 *
 * 참고: 실제 Auth 계정 생성은 백엔드 admin API 사용
 * 여기서는 profiles 테이블 직접 insert (임시 방식)
 */
export async function createTeacher(input: CreateTeacherInput): Promise<Teacher> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured');
  }

  // 임시 UUID 생성 (실제로는 Auth 계정 생성 후 해당 ID 사용)
  const tempId = crypto.randomUUID();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles') as any)
    .insert({
      id: tempId,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject || null,
      note: input.note || null,
      role: 'teacher',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('강사 생성 실패:', error);
    throw new Error(error.message);
  }

  return data as Teacher;
}

/**
 * 강사 정보 수정
 */
export async function updateTeacher(id: string, input: UpdateTeacherInput): Promise<Teacher> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles') as any)
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('role', 'teacher')
    .select()
    .single();

  if (error) {
    console.error('강사 수정 실패:', error);
    throw new Error(error.message);
  }

  return data as Teacher;
}

/**
 * 강사 삭제 (soft delete: is_active=false)
 */
export async function deleteTeacher(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('role', 'teacher');

  if (error) {
    console.error('강사 삭제 실패:', error);
    throw new Error(error.message);
  }
}

/**
 * 강사 복원 (is_active=true)
 */
export async function restoreTeacher(id: string): Promise<Teacher> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('profiles') as any)
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('role', 'teacher')
    .select()
    .single();

  if (error) {
    console.error('강사 복원 실패:', error);
    throw new Error(error.message);
  }

  return data as Teacher;
}
