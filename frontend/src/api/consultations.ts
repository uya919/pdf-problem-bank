/**
 * 상담 관리 API
 * Stage 33: 상담 관리 시스템
 * Stage 33-확장: 등원 확정 시 신규등원 공지 자동 생성
 */
import { supabase } from '../lib/supabase';
import type {
  Consultation,
  ConsultationFilters,
  CreateConsultationInput,
  UpdateConsultationInput,
  EnrollmentCalendarItem,
} from '../types/consultation';
import { createNotice } from './notices';

/**
 * 상담 목록 조회
 */
export async function getConsultations(
  filters?: ConsultationFilters
): Promise<Consultation[]> {
  let query = supabase
    .from('consultations')
    .select(`
      *,
      grades (id, name),
      students (id, name),
      profiles:created_by (id, name),
      consultation_subjects (
        id,
        subject_id,
        class_id,
        subjects (id, name, code, color),
        classes (id, name, teacher_id)
      )
    `)
    .order('consultation_date', { ascending: false });

  // 필터 적용
  if (filters?.status) {
    query = query.eq('enrollment_status', filters.status);
  }
  if (filters?.enrollment_date_from) {
    query = query.gte('enrollment_date', filters.enrollment_date_from);
  }
  if (filters?.enrollment_date_to) {
    query = query.lte('enrollment_date', filters.enrollment_date_to);
  }
  if (filters?.search) {
    query = query.ilike('student_name', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching consultations:', error);
    throw error;
  }

  return data || [];
}

/**
 * 상담 상세 조회
 */
export async function getConsultation(id: string): Promise<Consultation | null> {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      grades (id, name),
      students (id, name),
      profiles:created_by (id, name),
      consultation_subjects (
        id,
        subject_id,
        class_id,
        subjects (id, name, code, color),
        classes (id, name, teacher_id)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching consultation:', error);
    throw error;
  }

  return data;
}

/**
 * 상담 생성
 */
export async function createConsultation(
  input: CreateConsultationInput
): Promise<Consultation> {
  const { subjects, notify_on_confirm, ...consultationData } = input;

  // 1. 상담 레코드 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: consultation, error: consultationError } = await (supabase as any)
    .from('consultations')
    .insert({
      ...consultationData,
      enrollment_status: input.enrollment_status || 'pending',
    })
    .select()
    .single();

  if (consultationError) {
    console.error('Error creating consultation:', consultationError);
    throw consultationError;
  }

  // 2. 과목별 반배정 생성
  if (subjects && subjects.length > 0) {
    const subjectRecords = subjects.map((s) => ({
      consultation_id: consultation.id,
      subject_id: s.subject_id,
      class_id: s.class_id || null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: subjectsError } = await (supabase as any)
      .from('consultation_subjects')
      .insert(subjectRecords);

    if (subjectsError) {
      console.error('Error creating consultation subjects:', subjectsError);
      // 롤백: 상담 삭제
      await supabase.from('consultations').delete().eq('id', consultation.id);
      throw subjectsError;
    }
  }

  // 3. 등원 확정 상태이고 알림 활성화면 알림 생성
  if (
    input.enrollment_status === 'confirmed' &&
    input.enrollment_date &&
    notify_on_confirm
  ) {
    await confirmEnrollment(consultation.id, input.enrollment_date);
  }

  // 4. 전체 데이터 반환
  const result = await getConsultation(consultation.id);
  if (!result) {
    throw new Error('Failed to fetch created consultation');
  }

  return result;
}

/**
 * 상담 수정
 */
export async function updateConsultation(
  id: string,
  input: UpdateConsultationInput
): Promise<void> {
  const { subjects, ...consultationData } = input;

  // 1. 상담 레코드 수정
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: consultationError } = await (supabase as any)
    .from('consultations')
    .update({
      ...consultationData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (consultationError) {
    console.error('Error updating consultation:', consultationError);
    throw consultationError;
  }

  // 2. 과목별 반배정 업데이트 (있는 경우)
  if (subjects !== undefined) {
    // 기존 과목 삭제
    const { error: deleteError } = await supabase
      .from('consultation_subjects')
      .delete()
      .eq('consultation_id', id);

    if (deleteError) {
      console.error('Error deleting consultation subjects:', deleteError);
      throw deleteError;
    }

    // 새 과목 추가
    if (subjects.length > 0) {
      const subjectRecords = subjects.map((s) => ({
        consultation_id: id,
        subject_id: s.subject_id,
        class_id: s.class_id || null,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('consultation_subjects')
        .insert(subjectRecords);

      if (insertError) {
        console.error('Error inserting consultation subjects:', insertError);
        throw insertError;
      }
    }
  }
}

/**
 * 상담 삭제
 */
export async function deleteConsultation(id: string): Promise<void> {
  const { error } = await supabase
    .from('consultations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting consultation:', error);
    throw error;
  }
}

/**
 * 등원 확정 (알림 생성 포함)
 */
export async function confirmEnrollment(
  consultationId: string,
  enrollmentDate: string
): Promise<{ success: boolean; notification_count?: number; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('confirm_enrollment', {
    p_consultation_id: consultationId,
    p_enrollment_date: enrollmentDate,
  });

  if (error) {
    console.error('Error confirming enrollment:', error);
    return { success: false, error: error.message };
  }

  return data as { success: boolean; notification_count?: number };
}

/**
 * 캘린더용 등원 예정 조회
 */
export async function getEnrollmentCalendar(
  startDate: string,
  endDate: string
): Promise<EnrollmentCalendarItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_enrollment_calendar', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error('Error fetching enrollment calendar:', error);
    throw error;
  }

  return data || [];
}

/**
 * 기존 학생의 상담 이력 조회
 */
export async function getStudentConsultations(
  studentId: string
): Promise<Consultation[]> {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      *,
      grades (id, name),
      consultation_subjects (
        id,
        subject_id,
        class_id,
        subjects (id, name, code, color),
        classes (id, name)
      )
    `)
    .eq('student_id', studentId)
    .order('consultation_date', { ascending: false });

  if (error) {
    console.error('Error fetching student consultations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Stage 34-C: 등원 확정 + 학생 자동 생성
 * 신규상담에서 등원 확정 시 학생을 자동으로 생성하고 반 배치
 */
export interface ConfirmEnrollmentWithStudentResult {
  success: boolean;
  student_id?: string;
  student_name?: string;
  enrolled_count?: number;
  unassigned_count?: number;
  error?: string;
}

export async function confirmEnrollmentWithStudent(
  consultationId: string
): Promise<ConfirmEnrollmentWithStudentResult> {
  // 1. 먼저 상담 정보 조회 (등원일, 학생명 확인용)
  const consultation = await getConsultation(consultationId);
  if (!consultation) {
    return { success: false, error: '상담 정보를 찾을 수 없습니다' };
  }

  // 2. RPC로 학생 생성 및 등원 확정
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_student_from_consultation', {
    p_consultation_id: consultationId,
  });

  if (error) {
    console.error('confirmEnrollmentWithStudent error:', error);
    return { success: false, error: error.message };
  }

  const result = data as ConfirmEnrollmentWithStudentResult;

  // 3. 등원 확정 성공 시 신규등원 공지 자동 생성
  // Stage 35: 해당 반 담당 선생님과 관리자에게만 공지 표시
  if (result.success && consultation.enrollment_date) {
    try {
      // 반_이름 형식으로 제목 생성 (반이름에 학년 포함됨: "고2_정규2반")
      const className = consultation.consultation_subjects?.[0]?.classes?.name || '';
      const studentName = consultation.student_name;

      // "고2_정규2반_박정빈" 형식
      const titleParts = [className, studentName].filter(Boolean);
      const title = titleParts.join('_');

      // Stage 35: 배정된 반들의 ID 수집 (담당 선생님 필터링용)
      const targetClassIds = consultation.consultation_subjects
        ?.filter((cs) => cs.class_id)
        .map((cs) => cs.class_id as string) || [];

      await createNotice({
        type: 'enrollment',
        title: title,
        description: '신규등원예정',
        date: consultation.enrollment_date,
        visibility: 'all',  // 기본적으로 전체 공개, targetClassIds로 필터링
        isImportant: true,
        targetClassIds: targetClassIds.length > 0 ? targetClassIds : undefined,
      });
      console.log('[confirmEnrollmentWithStudent] 신규등원 공지 생성 완료:', title, 'targetClassIds:', targetClassIds);
    } catch (noticeError) {
      // 공지 생성 실패해도 등원 확정은 유지
      console.error('[confirmEnrollmentWithStudent] 공지 생성 실패:', noticeError);
    }
  }

  return result;
}
