/**
 * 순환수업 API 함수
 * @module api/rotation
 *
 * NOTE: Supabase 클라이언트 타입에 rotation_* 테이블이 정의되어 있지 않아
 * '(supabase as any)' 캐스팅을 사용합니다.
 * Supabase CLI로 타입을 재생성하면 캐스팅을 제거할 수 있습니다.
 */

import { supabase } from '../lib/supabase';
import type {
  RotationSchedule,
  RotationPattern,
  RotationException,
  RotationScheduleDetail,
  CreateRotationScheduleInput,
  UpdateRotationScheduleInput,
  SavePatternInput,
  CreateExceptionInput,
} from '../types/rotation';

// Supabase 클라이언트를 any 타입으로 캐스팅 (rotation_* 테이블 타입 미정의)
const db = supabase as any;

// =============================================
// 순환수업 스케줄 CRUD
// =============================================

/**
 * 순환수업 목록 조회
 */
export async function getRotationSchedules(): Promise<RotationSchedule[]> {
  const { data, error } = await db
    .from('rotation_schedules')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('순환수업 목록 조회 실패:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * 순환수업 상세 조회 (패턴, 예외, 대상학년 포함)
 */
export async function getRotationScheduleDetail(
  scheduleId: string
): Promise<RotationScheduleDetail> {
  // 1. 스케줄 조회
  const { data: schedule, error: scheduleError } = await db
    .from('rotation_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (scheduleError) {
    console.error('순환수업 조회 실패:', scheduleError);
    throw new Error(scheduleError.message);
  }

  // 2. 패턴 조회 (학년 정보 포함)
  const { data: patterns, error: patternsError } = await db
    .from('rotation_patterns')
    .select(`
      *,
      grades (id, name)
    `)
    .eq('rotation_schedule_id', scheduleId)
    .order('week_number')
    .order('grade_id');

  if (patternsError) {
    console.error('패턴 조회 실패:', patternsError);
    throw new Error(patternsError.message);
  }

  // 3. 예외 조회
  const { data: exceptions, error: exceptionsError } = await db
    .from('rotation_exceptions')
    .select('*')
    .eq('rotation_schedule_id', scheduleId)
    .order('exception_date');

  if (exceptionsError) {
    console.error('예외 조회 실패:', exceptionsError);
    throw new Error(exceptionsError.message);
  }

  // 4. 대상 학년 조회
  const { data: targetGrades, error: targetGradesError } = await db
    .from('rotation_target_grades')
    .select(`
      *,
      grades (id, name)
    `)
    .eq('rotation_schedule_id', scheduleId);

  if (targetGradesError) {
    console.error('대상 학년 조회 실패:', targetGradesError);
    throw new Error(targetGradesError.message);
  }

  return {
    schedule,
    patterns: patterns || [],
    exceptions: exceptions || [],
    targetGrades: targetGrades || [],
  };
}

/**
 * 순환수업 생성
 */
export async function createRotationSchedule(
  input: CreateRotationScheduleInput
): Promise<RotationSchedule> {
  const { target_grade_ids, ...scheduleData } = input;

  // 1. 스케줄 생성
  const { data: schedule, error: scheduleError } = await db
    .from('rotation_schedules')
    .insert({
      ...scheduleData,
      cycle_weeks: input.cycle_weeks || 3,
    })
    .select()
    .single();

  if (scheduleError) {
    console.error('순환수업 생성 실패:', scheduleError);
    throw new Error(scheduleError.message);
  }

  // 2. 대상 학년 추가
  if (target_grade_ids.length > 0) {
    const targetGradesData = target_grade_ids.map((gradeId) => ({
      rotation_schedule_id: schedule.id,
      grade_id: gradeId,
    }));

    const { error: targetError } = await db
      .from('rotation_target_grades')
      .insert(targetGradesData);

    if (targetError) {
      console.error('대상 학년 추가 실패:', targetError);
      // 롤백: 스케줄 삭제
      await db.from('rotation_schedules').delete().eq('id', schedule.id);
      throw new Error(targetError.message);
    }
  }

  return schedule;
}

/**
 * 순환수업 수정
 */
export async function updateRotationSchedule(
  scheduleId: string,
  input: UpdateRotationScheduleInput
): Promise<void> {
  const { error } = await db
    .from('rotation_schedules')
    .update(input)
    .eq('id', scheduleId);

  if (error) {
    console.error('순환수업 수정 실패:', error);
    throw new Error(error.message);
  }
}

/**
 * 순환수업 삭제 (CASCADE로 관련 데이터 자동 삭제)
 */
export async function deleteRotationSchedule(scheduleId: string): Promise<void> {
  const { error } = await db
    .from('rotation_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error('순환수업 삭제 실패:', error);
    throw new Error(error.message);
  }
}

// =============================================
// 패턴 관리
// =============================================

/**
 * 패턴 일괄 저장 (기존 패턴 삭제 후 새로 추가)
 */
export async function saveRotationPatterns(
  scheduleId: string,
  patterns: SavePatternInput[]
): Promise<RotationPattern[]> {
  // 1. 기존 패턴 삭제
  const { error: deleteError } = await db
    .from('rotation_patterns')
    .delete()
    .eq('rotation_schedule_id', scheduleId);

  if (deleteError) {
    console.error('기존 패턴 삭제 실패:', deleteError);
    throw new Error(deleteError.message);
  }

  // 2. 새 패턴 추가
  if (patterns.length === 0) {
    return [];
  }

  const patternsData = patterns.map((p) => ({
    rotation_schedule_id: scheduleId,
    week_number: p.week_number,
    grade_id: p.grade_id,
    activity_type: p.activity_type,
    activity_name: p.activity_name,
  }));

  const { data, error: insertError } = await db
    .from('rotation_patterns')
    .insert(patternsData)
    .select();

  if (insertError) {
    console.error('패턴 저장 실패:', insertError);
    throw new Error(insertError.message);
  }

  return data || [];
}

// =============================================
// 예외/휴일 관리
// =============================================

/**
 * 예외 추가
 */
export async function createRotationException(
  input: CreateExceptionInput
): Promise<RotationException> {
  const { data, error } = await db
    .from('rotation_exceptions')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('예외 추가 실패:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * 예외 삭제
 */
export async function deleteRotationException(exceptionId: string): Promise<void> {
  const { error } = await db
    .from('rotation_exceptions')
    .delete()
    .eq('id', exceptionId);

  if (error) {
    console.error('예외 삭제 실패:', error);
    throw new Error(error.message);
  }
}

/**
 * 특정 기간의 예외 목록 조회
 */
export async function getRotationExceptions(
  scheduleId: string,
  startDate?: string,
  endDate?: string
): Promise<RotationException[]> {
  let query = db
    .from('rotation_exceptions')
    .select('*')
    .eq('rotation_schedule_id', scheduleId)
    .order('exception_date');

  if (startDate) {
    query = query.gte('exception_date', startDate);
  }
  if (endDate) {
    query = query.lte('exception_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('예외 목록 조회 실패:', error);
    throw new Error(error.message);
  }

  return data || [];
}

// =============================================
// 대상 학년 관리
// =============================================

/**
 * 대상 학년 업데이트
 */
export async function updateRotationTargetGrades(
  scheduleId: string,
  gradeIds: string[]
): Promise<void> {
  // 1. 기존 대상 학년 삭제
  const { error: deleteError } = await db
    .from('rotation_target_grades')
    .delete()
    .eq('rotation_schedule_id', scheduleId);

  if (deleteError) {
    console.error('기존 대상 학년 삭제 실패:', deleteError);
    throw new Error(deleteError.message);
  }

  // 2. 새 대상 학년 추가
  if (gradeIds.length === 0) {
    return;
  }

  const targetGradesData = gradeIds.map((gradeId) => ({
    rotation_schedule_id: scheduleId,
    grade_id: gradeId,
  }));

  const { error: insertError } = await db
    .from('rotation_target_grades')
    .insert(targetGradesData);

  if (insertError) {
    console.error('대상 학년 추가 실패:', insertError);
    throw new Error(insertError.message);
  }
}
