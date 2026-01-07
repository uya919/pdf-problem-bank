/**
 * Timetable Studio API 함수
 *
 * Stage 5: Timetable Studio 재설계
 * - 시나리오 CRUD
 * - 슬롯 CRUD
 */

import { supabase } from '@/lib/supabase';
import type {
  TimetableScenario,
  TimetableSlot,
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateSlotInput,
  UpdateSlotInput,
  ScenarioRow,
  SlotRow,
  rowToScenario,
  rowToSlot,
} from '@/types/timetable';

// =====================================================
// 시나리오 API
// =====================================================

/**
 * 시나리오 목록 조회
 */
export async function fetchScenarios(): Promise<TimetableScenario[]> {
  const { data, error } = await supabase
    .from('timetable_scenarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchScenarios] 조회 실패:', error);
    throw new Error(error.message);
  }

  const { rowToScenario } = await import('@/types/timetable');
  return (data as ScenarioRow[]).map(rowToScenario);
}

/**
 * 활성 시나리오 목록 조회
 */
export async function fetchActiveScenarios(): Promise<TimetableScenario[]> {
  const { data, error } = await supabase
    .from('timetable_scenarios')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchActiveScenarios] 조회 실패:', error);
    throw new Error(error.message);
  }

  const { rowToScenario } = await import('@/types/timetable');
  return (data as ScenarioRow[]).map(rowToScenario);
}

/**
 * 시나리오 단건 조회
 */
export async function fetchScenarioById(id: string): Promise<TimetableScenario> {
  const { data, error } = await supabase
    .from('timetable_scenarios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[fetchScenarioById] 조회 실패:', error);
    throw new Error(error.message);
  }

  const { rowToScenario } = await import('@/types/timetable');
  return rowToScenario(data as ScenarioRow);
}

/**
 * 시나리오 생성
 */
export async function createScenario(input: CreateScenarioInput): Promise<TimetableScenario> {
  const { data: userData } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('timetable_scenarios')
    .insert({
      name: input.name,
      type: input.type,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      created_by: userData?.user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createScenario] 생성 실패:', error);
    throw new Error(error.message);
  }

  const { rowToScenario } = await import('@/types/timetable');
  return rowToScenario(data as ScenarioRow);
}

/**
 * 시나리오 수정
 */
export async function updateScenario(
  id: string,
  input: UpdateScenarioInput
): Promise<TimetableScenario> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;
  if (input.startDate !== undefined) updateData.start_date = input.startDate;
  if (input.endDate !== undefined) updateData.end_date = input.endDate;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('timetable_scenarios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateScenario] 수정 실패:', error);
    throw new Error(error.message);
  }

  const { rowToScenario } = await import('@/types/timetable');
  return rowToScenario(data as ScenarioRow);
}

/**
 * 시나리오 삭제 (연결된 슬롯도 CASCADE 삭제)
 */
export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase
    .from('timetable_scenarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteScenario] 삭제 실패:', error);
    throw new Error(error.message);
  }
}

// =====================================================
// 슬롯 API
// =====================================================

/**
 * 시나리오별 슬롯 목록 조회 (반/강사 정보 JOIN)
 */
export async function fetchSlotsByScenario(scenarioId: string): Promise<TimetableSlot[]> {
  const { data, error } = await supabase
    .from('timetable_slots')
    .select(`
      *,
      classes:class_id (name, color, grade, subject),
      teachers:teacher_id (name)
    `)
    .eq('scenario_id', scenarioId)
    .order('day_of_week')
    .order('start_time');

  if (error) {
    console.error('[fetchSlotsByScenario] 조회 실패:', error);
    throw new Error(error.message);
  }

  const { rowToSlot } = await import('@/types/timetable');

  return (data || []).map((row: SlotRow & {
    classes?: { name: string; color: string; grade: string; subject: string } | null;
    teachers?: { name: string } | null;
  }) => {
    const slot = rowToSlot(row);
    if (row.classes) {
      slot.className = row.classes.name;
      slot.classColor = row.classes.color;
      slot.grade = row.classes.grade;
      slot.subject = row.classes.subject;
    }
    if (row.teachers) {
      slot.teacherName = row.teachers.name;
    }
    return slot;
  });
}

/**
 * 슬롯 생성
 */
export async function createSlot(input: CreateSlotInput): Promise<TimetableSlot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('timetable_slots')
    .insert({
      scenario_id: input.scenarioId,
      class_id: input.classId,
      teacher_id: input.teacherId || null,
      day_of_week: input.dayOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
      room: input.room || null,
      note: input.note || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createSlot] 생성 실패:', error);
    throw new Error(error.message);
  }

  const { rowToSlot } = await import('@/types/timetable');
  return rowToSlot(data as SlotRow);
}

/**
 * 슬롯 수정
 */
export async function updateSlot(
  id: string,
  input: UpdateSlotInput
): Promise<TimetableSlot> {
  const updateData: Record<string, unknown> = {};

  if (input.classId !== undefined) updateData.class_id = input.classId;
  if (input.teacherId !== undefined) updateData.teacher_id = input.teacherId;
  if (input.dayOfWeek !== undefined) updateData.day_of_week = input.dayOfWeek;
  if (input.startTime !== undefined) updateData.start_time = input.startTime;
  if (input.endTime !== undefined) updateData.end_time = input.endTime;
  if (input.room !== undefined) updateData.room = input.room;
  if (input.note !== undefined) updateData.note = input.note;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('timetable_slots')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateSlot] 수정 실패:', error);
    throw new Error(error.message);
  }

  const { rowToSlot } = await import('@/types/timetable');
  return rowToSlot(data as SlotRow);
}

/**
 * 슬롯 삭제
 */
export async function deleteSlot(id: string): Promise<void> {
  const { error } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteSlot] 삭제 실패:', error);
    throw new Error(error.message);
  }
}

/**
 * 여러 슬롯 일괄 삭제
 */
export async function deleteSlots(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('timetable_slots')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('[deleteSlots] 삭제 실패:', error);
    throw new Error(error.message);
  }
}

/**
 * 시나리오의 모든 슬롯 삭제
 */
export async function clearScenarioSlots(scenarioId: string): Promise<void> {
  const { error } = await supabase
    .from('timetable_slots')
    .delete()
    .eq('scenario_id', scenarioId);

  if (error) {
    console.error('[clearScenarioSlots] 삭제 실패:', error);
    throw new Error(error.message);
  }
}
