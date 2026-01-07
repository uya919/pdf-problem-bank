/**
 * 사용자 관리 API 클라이언트 (Phase 8-5)
 * 관리자가 강사/직원 계정을 관리
 */

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7000';

// =====================================================
// Types
// =====================================================

export type UserRole = 'teacher' | 'admin' | 'owner';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: 'teacher' | 'admin';
  phone?: string;
}

export interface CreateUserResponse {
  user_id: string;
  email: string;
  name: string;
  role: string;
  temp_password: string;
}

export interface UsersListResponse {
  users: UserProfile[];
  total: number;
}

export interface ResetPasswordResponse {
  temp_password: string;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * 인증 헤더 생성 (비동기)
 * supabase.auth.getSession()에서 직접 토큰을 가져옴
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || '';

  return {
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  };
}

/**
 * API 에러 처리
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// =====================================================
// API Functions
// =====================================================

/**
 * 사용자 목록 조회
 */
export async function getUsers(filters?: {
  role?: UserRole;
  is_active?: boolean;
}): Promise<UsersListResponse> {
  const params = new URLSearchParams();
  if (filters?.role) params.append('role', filters.role);
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));

  const url = `${API_BASE}/api/admin/users${params.toString() ? '?' + params : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await getAuthHeaders()
  });

  return handleResponse<UsersListResponse>(response);
}

/**
 * 새 사용자 생성
 */
export async function createUser(data: CreateUserData): Promise<CreateUserResponse> {
  const response = await fetch(`${API_BASE}/api/admin/users`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data)
  });

  return handleResponse<CreateUserResponse>(response);
}

/**
 * 사용자 권한 변경
 */
export async function updateUserRole(userId: string, role: 'teacher' | 'admin'): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ role })
  });

  await handleResponse(response);
}

/**
 * 비밀번호 리셋
 */
export async function resetPassword(userId: string): Promise<ResetPasswordResponse> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: await getAuthHeaders()
  });

  return handleResponse<ResetPasswordResponse>(response);
}

/**
 * 사용자 비활성화
 */
export async function deactivateUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
    headers: await getAuthHeaders()
  });

  await handleResponse(response);
}

/**
 * 사용자 재활성화
 */
export async function activateUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}/activate`, {
    method: 'PATCH',
    headers: await getAuthHeaders()
  });

  await handleResponse(response);
}

/**
 * 사용자 삭제 (완전 삭제, 복구 불가)
 */
export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders()
  });

  await handleResponse(response);
}

/**
 * 헬스 체크
 */
export async function checkAdminHealth(): Promise<{ status: string; supabase_configured: boolean }> {
  const response = await fetch(`${API_BASE}/api/admin/users/health`);
  return handleResponse(response);
}
