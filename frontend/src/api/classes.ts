/**
 * 반 관리 API 클라이언트
 * Classes CRUD + 담당 강사 배정
 */
import { supabase } from '../lib/supabase';

// 타입 정의
export interface ClassData {
  id: string;
  name: string;
  subject: string;
  subject_id: string | null;
  grade_id: string | null;
  teacher_id: string | null;
  day_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  // Stage 34: 요일별 수업 시간 (배열)
  start_times: string[] | null;
  end_times: string[] | null;
  max_students: number;
  is_active: boolean;
  created_at: string;
  // Stage 31: 담임/부담임 (초등부용)
  homeroom_teacher_id: string | null;
  assistant_teacher_id: string | null;
  homeroom_days: number[] | null;
  assistant_days: number[] | null;
  // 조인 데이터
  grades?: { id: string; name: string } | null;
  teachers?: { id: string; name: string } | null;
  subjects?: { id: string; name: string; code: string; color: string } | null;
  homeroom_teacher?: { id: string; name: string } | null;
  assistant_teacher?: { id: string; name: string } | null;
  // 계산 필드
  student_count?: number;
}

// 유효한 level 값 타입
export type ClassLevel = 'advanced' | 'regular' | 'regular2' | 'basic';

export interface CreateClassInput {
  name: string;
  subject: string;
  subject_id?: string | null;
  grade_id?: string | null;
  teacher_id?: string | null;
  day_of_week?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  // Stage 34: 요일별 수업 시간 (배열)
  start_times?: string[] | null;
  end_times?: string[] | null;
  max_students?: number;
  level?: ClassLevel;
  // Stage 31: 담임/부담임 (초등부용)
  homeroom_teacher_id?: string | null;
  assistant_teacher_id?: string | null;
  homeroom_days?: number[] | null;
  assistant_days?: number[] | null;
}

export interface UpdateClassInput {
  name?: string;
  subject?: string;
  subject_id?: string | null;
  grade_id?: string | null;
  teacher_id?: string | null;
  day_of_week?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  // Stage 34: 요일별 수업 시간 (배열)
  start_times?: string[] | null;
  end_times?: string[] | null;
  max_students?: number;
  is_active?: boolean;
  level?: ClassLevel;
  // Stage 31: 담임/부담임 (초등부용)
  homeroom_teacher_id?: string | null;
  assistant_teacher_id?: string | null;
  homeroom_days?: number[] | null;
  assistant_days?: number[] | null;
}

export interface ClassFilters {
  subject?: string;
  grade_id?: string;
  teacher_id?: string;
  teacherId?: string;  // alias for teacher_id
  is_active?: boolean;
  status?: 'active' | 'inactive';  // alias for is_active
}

export interface Teacher {
  id: string;
  name: string;
  subject: string | null;
  is_active: boolean;
}

export interface Grade {
  id: string;
  name: string;
  division: string;
  sort_order: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

/**
 * 반 목록 조회 (조인 포함)
 */
export async function getClasses(filters?: ClassFilters): Promise<ClassData[]> {
  let query = supabase
    .from('classes')
    .select(`
      *,
      grades(id, name),
      teachers:profiles!classes_teacher_id_fkey(id, name),
      subjects(id, name, code, color),
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, name),
      assistant_teacher:profiles!classes_assistant_teacher_id_fkey(id, name)
    `)
    .order('name');

  // 필터 적용
  if (filters?.subject) {
    query = query.eq('subject', filters.subject);
  }
  if (filters?.grade_id) {
    query = query.eq('grade_id', filters.grade_id);
  }
  // Stage 35: 강사 필터 - 주담임, 부담임, 담임 모두 포함
  if (filters?.teacher_id) {
    query = query.or(
      `teacher_id.eq.${filters.teacher_id},assistant_teacher_id.eq.${filters.teacher_id},homeroom_teacher_id.eq.${filters.teacher_id}`
    );
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * 반별 학생 수 조회
 */
export async function getClassStudentCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('is_active', true);

  if (error) throw error;

  const counts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data as any[])?.forEach((enrollment: { class_id?: string }) => {
    if (enrollment.class_id) {
      counts[enrollment.class_id] = (counts[enrollment.class_id] || 0) + 1;
    }
  });

  return counts;
}

/**
 * 반 상세 조회
 */
export async function getClass(id: string): Promise<ClassData | null> {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      grades(id, name),
      teachers:profiles!classes_teacher_id_fkey(id, name),
      subjects(id, name, code, color),
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, name),
      assistant_teacher:profiles!classes_assistant_teacher_id_fkey(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * grade_id로부터 division, grade 값 계산
 * grades 테이블의 division(한글) → classes 테이블의 division(영문) 변환
 */
async function getDivisionAndGradeFromGradeId(gradeId: string | null | undefined): Promise<{
  division: string | null;
  grade: string | null;
}> {
  if (!gradeId) return { division: null, grade: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gradeData, error } = await (supabase as any)
    .from('grades')
    .select('name, division')
    .eq('id', gradeId)
    .single();

  if (error || !gradeData) return { division: null, grade: null };

  // 한글 division → 영문 변환
  const divisionMap: Record<string, string> = {
    '초등부': 'elementary',
    '중등부': 'middle',
    '고등부': 'high',
  };

  return {
    division: divisionMap[(gradeData as { division: string; name: string }).division] || null,
    grade: (gradeData as { division: string; name: string }).name,
  };
}

/**
 * 반 생성
 */
export async function createClass(input: CreateClassInput): Promise<ClassData> {
  // grade_id로부터 division, grade 자동 계산
  const { division, grade } = await getDivisionAndGradeFromGradeId(input.grade_id);

  const insertData = {
    ...input,
    division,
    grade,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('classes')
    .insert([insertData])
    .select(`
      *,
      grades(id, name),
      teachers:profiles!classes_teacher_id_fkey(id, name),
      subjects(id, name, code, color),
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, name),
      assistant_teacher:profiles!classes_assistant_teacher_id_fkey(id, name)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 반 수정
 */
export async function updateClass(id: string, input: UpdateClassInput): Promise<ClassData> {
  // grade_id가 변경되면 division, grade도 자동 업데이트
  let updateData = { ...input };

  if (input.grade_id !== undefined) {
    const { division, grade } = await getDivisionAndGradeFromGradeId(input.grade_id);
    updateData = {
      ...updateData,
      division,
      grade,
    } as UpdateClassInput & { division: string | null; grade: string | null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('classes')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      grades(id, name),
      teachers:profiles!classes_teacher_id_fkey(id, name),
      subjects(id, name, code, color),
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, name),
      assistant_teacher:profiles!classes_assistant_teacher_id_fkey(id, name)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 반 삭제
 */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * 반 비활성화
 */
export async function deactivateClass(id: string): Promise<ClassData> {
  return updateClass(id, { is_active: false });
}

/**
 * 반 활성화
 */
export async function activateClass(id: string): Promise<ClassData> {
  return updateClass(id, { is_active: true });
}

/**
 * 강사 목록 조회 (profiles 테이블)
 * - classes.teacher_id FK가 profiles(id)를 참조
 * - role이 teacher, admin, owner인 사용자 조회
 */
export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, subject, is_active')
    .in('role', ['teacher', 'admin', 'owner'])
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * 학년 목록 조회
 */
export async function getGrades(): Promise<Grade[]> {
  const { data, error } = await supabase
    .from('grades')
    .select('id, name, division, sort_order')
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

/**
 * 과목 목록 조회
 */
export async function getSubjects(): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, code, color')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

// =====================================================
// 반별 학생 목록 (Stage 11-13)
// =====================================================

/**
 * 반에 등록된 학생 정보
 */
export interface ClassStudent {
  id: string;
  name: string;
  phone: string | null;
  grade_name: string | null;
  enrolled_at: string;
}

/**
 * 반에 등록된 학생 목록 조회
 */
export async function getStudentsByClass(classId: string): Promise<ClassStudent[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      students (
        id,
        name,
        phone,
        grades (name)
      )
    `)
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;

  // 데이터 변환
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((enrollment: any) => ({
    id: enrollment.students?.id || enrollment.id,
    name: enrollment.students?.name || '이름 없음',
    phone: enrollment.students?.phone || null,
    grade_name: enrollment.students?.grades?.name || null,
    enrolled_at: enrollment.enrolled_at,
  }));
}

// =====================================================
// 과목별 관리자 설정 (Stage 33)
// =====================================================

/**
 * 과목 + 관리자 정보 타입
 */
export interface SubjectWithManagers {
  id: string;
  name: string;
  code: string;
  color: string;
  manager_ids: string[];
}

/**
 * 과목 목록 조회 (관리자 정보 포함)
 */
export async function getSubjectsWithManagers(): Promise<SubjectWithManagers[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('subjects')
    .select('id, name, code, color, manager_ids')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching subjects with managers:', error);
    throw error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((s: any) => ({
    ...s,
    manager_ids: s.manager_ids || [],
  }));
}

/**
 * 과목별 관리자 업데이트
 */
export async function updateSubjectManagers(
  subjectId: string,
  managerIds: string[]
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('subjects')
    .update({ manager_ids: managerIds })
    .eq('id', subjectId);

  if (error) {
    console.error('Error updating subject managers:', error);
    throw error;
  }
}

/**
 * 관리자/원장 목록 조회 (과목 관리자 설정용)
 */
export async function getAdminUsers(): Promise<Array<{ id: string; name: string; role: string }>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role')
    .in('role', ['admin', 'owner'])
    .order('name');

  if (error) {
    console.error('Error fetching admin users:', error);
    throw error;
  }

  return data || [];
}
