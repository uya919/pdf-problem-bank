/**
 * 공지사항 API
 *
 * Stage 16: 캘린더 통합 공지사항 DB 연동
 * - notices 테이블 CRUD
 * - Supabase 직접 호출
 */

import { supabase } from '@/lib/supabase';
import type { Notice, CreateNoticeInput, NoticeVisibility } from '@/types/admin';

// =====================================================
// 타입 정의
// =====================================================

/** Supabase notices 테이블 행 타입 */
interface NoticeRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  priority: number;
  visibility: string;
  is_important: boolean;
  tagged_student_id: string | null;
  absence_reason: string | null;
  target_grade_ids: string[] | null;
  target_class_ids: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// 타입 변환 함수
// =====================================================

/**
 * DB 행 → Notice 타입 변환
 */
function rowToNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    type: row.type as Notice['type'],
    priority: row.priority,
    visibility: row.visibility as Notice['visibility'],
    isImportant: row.is_important,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    isActive: row.is_active,
    targetClassIds: row.target_class_ids ?? undefined,  // Stage 35: 특정 반 담당자만 볼 수 있도록
  };
}

// =====================================================
// API 함수
// =====================================================

/**
 * 날짜 범위로 공지 조회
 *
 * @param params.startDate - 시작 날짜 (YYYY-MM-DD)
 * @param params.endDate - 종료 날짜 (YYYY-MM-DD)
 * @param params.visibility - 조회할 visibility 목록
 */
export async function fetchNotices(params: {
  startDate: string;
  endDate: string;
  visibility?: NoticeVisibility[];
}): Promise<Notice[]> {
  const { startDate, endDate, visibility = ['all', 'admin', 'teacher'] } = params;

  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_active', true)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('visibility', visibility)
    .order('priority', { ascending: false })
    .order('date', { ascending: true });

  if (error) {
    console.error('[notices] fetchNotices error:', error);
    throw error;
  }

  return (data as NoticeRow[]).map(rowToNotice);
}

/**
 * 단일 공지 조회
 */
export async function fetchNoticeById(id: string): Promise<Notice | null> {
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('[notices] fetchNoticeById error:', error);
    throw error;
  }

  return rowToNotice(data as NoticeRow);
}

/**
 * 공지 생성
 */
export async function createNotice(input: CreateNoticeInput): Promise<Notice> {
  const { data: userData } = await supabase.auth.getUser();

  // priority 계산: urgent=100, enrollment=95, holiday=90, absence=80, 나머지=50
  const priorityMap: Record<string, number> = {
    urgent: 100,
    enrollment: 95,
    holiday: 90,
    absence: 80,
    exam: 50,
    special: 50,
    event: 50,
    operation: 50,
  };

  const insertData = {
    title: input.title,
    description: input.description || null,
    date: input.date,
    start_time: input.startTime || null,
    end_time: input.endTime || null,
    type: input.type,
    priority: priorityMap[input.type] || 50,
    visibility: input.visibility,
    is_important: input.isImportant ?? false,
    tagged_student_id: input.taggedStudentId || null,
    absence_reason: input.absenceReason || null,
    created_by: userData?.user?.id || null,
    // Stage 35: 특정 반 담당자만 볼 수 있도록 (신규등원 공지 등)
    target_class_ids: input.targetClassIds && input.targetClassIds.length > 0
      ? input.targetClassIds
      : null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('notices')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[notices] createNotice error:', error);
    throw error;
  }

  return rowToNotice(data as NoticeRow);
}

/**
 * 공지 수정
 */
export async function updateNotice(
  id: string,
  input: Partial<CreateNoticeInput>
): Promise<Notice> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // 변경된 필드만 업데이트
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.startTime !== undefined) updateData.start_time = input.startTime || null;
  if (input.endTime !== undefined) updateData.end_time = input.endTime || null;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.visibility !== undefined) updateData.visibility = input.visibility;
  if (input.isImportant !== undefined) updateData.is_important = input.isImportant;
  if (input.taggedStudentId !== undefined) updateData.tagged_student_id = input.taggedStudentId || null;
  if (input.absenceReason !== undefined) updateData.absence_reason = input.absenceReason || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('notices')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[notices] updateNotice error:', error);
    throw error;
  }

  return rowToNotice(data as NoticeRow);
}

/**
 * 공지 삭제 (soft delete)
 */
export async function deleteNotice(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notices')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[notices] deleteNotice error:', error);
    throw error;
  }
}

/**
 * 공지 영구 삭제 (hard delete - owner만)
 */
export async function hardDeleteNotice(id: string): Promise<void> {
  const { error } = await supabase
    .from('notices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[notices] hardDeleteNotice error:', error);
    throw error;
  }
}
