/**
 * 과목별 반 배정 훅 (Phase 7-C)
 *
 * 수학/국어/영어 과목별로 학생을 반에 배정하는 기능
 * - 같은 학생이 여러 과목 수강 가능
 * - 과목별로 다른 반에 배정 가능
 *
 * Supabase 테이블:
 * - subjects: 과목 (수학, 국어, 영어)
 * - student_subjects: 학생 수강 과목
 * - classes: 반 (subject_id, level, division 추가)
 * - class_enrollments: 반 등록
 *
 * RPC 함수:
 * - assign_students_to_class
 * - unassign_students_from_class
 * - get_classes_by_subject
 * - get_students_by_subject
 *
 * NOTE: 새로운 테이블/RPC가 Supabase에 생성되기 전까지는 타입 에러를 피하기 위해
 * eslint-disable을 사용합니다. 마이그레이션 적용 후 타입이 자동 생성됩니다.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Subject,
  SubjectCode,
  Division,
  ClassBySubject,
  StudentBySubject,
  AssignmentResult,
  ClassLevel,
} from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// =====================================================
// Query Keys
// =====================================================
export const classAssignmentKeys = {
  all: ['classAssignment'] as const,
  subjects: () => [...classAssignmentKeys.all, 'subjects'] as const,
  classesBySubject: (code: SubjectCode, division?: Division, grade?: string) =>
    [...classAssignmentKeys.all, 'classes', code, division, grade] as const,
  studentsBySubject: (code: SubjectCode, division?: Division, grade?: string) =>
    [...classAssignmentKeys.all, 'students', code, division, grade] as const,
};

// =====================================================
// 과목 목록 조회
// =====================================================

/**
 * 전체 과목 목록 조회
 */
export function useSubjects() {
  return useQuery({
    queryKey: classAssignmentKeys.subjects(),
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as Subject[];
    },
    enabled: isSupabaseConfigured,
    staleTime: 10 * 60 * 1000, // 10분 캐시 (과목은 자주 안 바뀜)
  });
}

// =====================================================
// 과목별 반 목록 조회
// =====================================================

/**
 * 과목별 반 목록 조회 (학생 수 포함)
 *
 * @param subjectCode - 과목 코드 (math, korean, english)
 * @param division - 학부 필터 (elementary, middle, high)
 * @param grade - 학년 필터 (중1, 중2, 고1 등)
 */
export function useClassesBySubject(
  subjectCode: SubjectCode,
  division?: Division,
  grade?: string
) {
  return useQuery({
    queryKey: classAssignmentKeys.classesBySubject(subjectCode, division, grade),
    queryFn: async (): Promise<ClassBySubject[]> => {
      // RPC 함수 호출 (타입이 아직 생성되지 않아 any 사용)
      const { data, error } = await (supabase as AnySupabase).rpc('get_classes_by_subject', {
        p_subject_code: subjectCode,
        p_division: division || null,
        p_grade: grade || null,
      });

      if (error) throw error;
      return (data || []) as ClassBySubject[];
    },
    enabled: isSupabaseConfigured && !!subjectCode,
    staleTime: 30 * 1000, // 30초 캐시
  });
}

// =====================================================
// 과목별 학생 목록 조회
// =====================================================

/**
 * 과목별 학생 목록 조회 (배정 상태 포함)
 *
 * @param subjectCode - 과목 코드 (math, korean, english)
 * @param division - 학부 필터 (elementary, middle, high)
 * @param grade - 학년 필터 (중1, 중2, 고1 등)
 */
export function useStudentsBySubject(
  subjectCode: SubjectCode,
  division?: Division,
  grade?: string
) {
  return useQuery({
    queryKey: classAssignmentKeys.studentsBySubject(subjectCode, division, grade),
    queryFn: async (): Promise<StudentBySubject[]> => {
      // RPC 함수 호출 (타입이 아직 생성되지 않아 any 사용)
      const { data, error } = await (supabase as AnySupabase).rpc('get_students_by_subject', {
        p_subject_code: subjectCode,
        p_division: division || null,
        p_grade: grade || null,
      });

      if (error) throw error;
      return (data || []) as StudentBySubject[];
    },
    enabled: isSupabaseConfigured && !!subjectCode,
    staleTime: 30 * 1000, // 30초 캐시
  });
}

// =====================================================
// 반 배정 뮤테이션
// =====================================================

interface AssignStudentsParams {
  studentIds: string[];
  classId: string;
  enrolledBy?: string;
}

/**
 * 학생들을 반에 배정
 * - 같은 과목의 기존 배정은 자동으로 해제됨
 */
export function useAssignStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentIds,
      classId,
      enrolledBy,
    }: AssignStudentsParams): Promise<AssignmentResult> => {
      const { data, error } = await (supabase as AnySupabase).rpc('assign_students_to_class', {
        p_student_ids: studentIds,
        p_class_id: classId,
        p_enrolled_by: enrolledBy || null,
      });

      if (error) throw error;
      return data as AssignmentResult;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: classAssignmentKeys.all });
    },
  });
}

interface UnassignStudentsParams {
  studentIds: string[];
  classId: string;
}

/**
 * 학생들의 반 배정 해제
 */
export function useUnassignStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentIds,
      classId,
    }: UnassignStudentsParams): Promise<AssignmentResult> => {
      const { data, error } = await (supabase as AnySupabase).rpc('unassign_students_from_class', {
        p_student_ids: studentIds,
        p_class_id: classId,
      });

      if (error) throw error;
      return data as AssignmentResult;
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: classAssignmentKeys.all });
    },
  });
}

// =====================================================
// 학생 수강 과목 관리
// =====================================================

interface EnrollStudentSubjectParams {
  studentId: string;
  subjectCode: SubjectCode;
}

/**
 * 학생 수강 과목 등록
 */
export function useEnrollStudentSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      subjectCode,
    }: EnrollStudentSubjectParams): Promise<void> => {
      // 1. 과목 ID 조회 (타입이 아직 생성되지 않아 any 사용)
      const { data: subject, error: subjectError } = await (supabase as AnySupabase)
        .from('subjects')
        .select('id')
        .eq('code', subjectCode)
        .single();

      if (subjectError) throw subjectError;

      // 2. student_subjects에 등록
      const { error } = await (supabase as AnySupabase).from('student_subjects').upsert(
        {
          student_id: studentId,
          subject_id: subject.id,
          is_active: true,
        },
        { onConflict: 'student_id,subject_id' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classAssignmentKeys.all });
    },
  });
}

/**
 * 학생 수강 과목 해제
 */
export function useUnenrollStudentSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      subjectCode,
    }: EnrollStudentSubjectParams): Promise<void> => {
      // 1. 과목 ID 조회 (타입이 아직 생성되지 않아 any 사용)
      const { data: subject, error: subjectError } = await (supabase as AnySupabase)
        .from('subjects')
        .select('id')
        .eq('code', subjectCode)
        .single();

      if (subjectError) throw subjectError;

      // 2. student_subjects에서 비활성화
      const { error } = await (supabase as AnySupabase)
        .from('student_subjects')
        .update({ is_active: false })
        .eq('student_id', studentId)
        .eq('subject_id', subject.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classAssignmentKeys.all });
    },
  });
}

// =====================================================
// 반 생성/수정 뮤테이션
// =====================================================

interface CreateClassParams {
  name: string;
  subjectCode: SubjectCode;
  level: ClassLevel;
  division: Division;
  grade: string;
  teacherId?: string;
}

/**
 * 과목별 반 생성
 */
export function useCreateClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateClassParams): Promise<string> => {
      // 1. 과목 ID 조회 (타입이 아직 생성되지 않아 any 사용)
      const { data: subject, error: subjectError } = await (supabase as AnySupabase)
        .from('subjects')
        .select('id')
        .eq('code', params.subjectCode)
        .single();

      if (subjectError) throw subjectError;

      // 2. 반 생성
      const { data, error } = await (supabase as AnySupabase)
        .from('classes')
        .insert({
          name: params.name,
          subject: params.subjectCode,
          subject_id: subject.id,
          level: params.level,
          division: params.division,
          grade: params.grade,
          teacher_id: params.teacherId || null,
          is_active: true,
          day_of_week: [],
          start_time: '00:00',
          end_time: '00:00',
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classAssignmentKeys.all });
    },
  });
}

// =====================================================
// 유틸리티 훅
// =====================================================

/**
 * 과목별 미배정 학생 수 조회
 */
export function useUnassignedCounts(subjectCode: SubjectCode, division?: Division) {
  const { data: students } = useStudentsBySubject(subjectCode, division);

  if (!students) return { total: 0, unassigned: 0 };

  const unassigned = students.filter((s) => !s.class_id).length;
  return { total: students.length, unassigned };
}

/**
 * 학년별 그룹화된 학생 목록
 */
export function useStudentsGroupedByGrade(
  subjectCode: SubjectCode,
  division?: Division
) {
  const { data: students, ...rest } = useStudentsBySubject(subjectCode, division);

  const grouped = (students || []).reduce(
    (acc, student) => {
      const grade = student.student_grade || '미지정';
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);
      return acc;
    },
    {} as Record<string, StudentBySubject[]>
  );

  return { data: grouped, ...rest };
}

/**
 * 레벨별 그룹화된 반 목록
 */
export function useClassesGroupedByLevel(
  subjectCode: SubjectCode,
  division?: Division,
  grade?: string
) {
  const { data: classes, ...rest } = useClassesBySubject(
    subjectCode,
    division,
    grade
  );

  const grouped = (classes || []).reduce(
    (acc, cls) => {
      const level = cls.level || 'regular';
      if (!acc[level]) acc[level] = [];
      acc[level].push(cls);
      return acc;
    },
    {} as Record<ClassLevel, ClassBySubject[]>
  );

  return { data: grouped, ...rest };
}
