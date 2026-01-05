/**
 * useMyStudents - 담당 학생 조회 훅
 *
 * 강사가 담당하는 반에 등록된 학생들만 조회합니다.
 * 쿼리 체인: teacher_id → classes → class_enrollments → students
 *
 * @returns 담당 학생 목록 (phone 정보 포함)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Student, Class, ClassEnrollment, Grade } from '../types/database';

/** 학생 + 반 + 학년 정보 */
export interface MyStudent extends Student {
  grade_info?: Grade | null;
  enrolled_classes?: Array<{
    class_id: string;
    class_name: string;
    subject: string;
  }>;
}

/** Mock 데이터 (Supabase 미연결 시 사용) */
const MOCK_STUDENTS: MyStudent[] = [
  {
    id: 'mock-1',
    name: '김민준',
    phone: '010-1234-5678',
    parent_phone: '010-8765-4321',
    parent_name: '김부모',
    grade_id: 'grade-1',
    school: '서울중학교',
    is_active: true,
    notes: null,
    created_by: null,
    synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    grade_info: { id: 'grade-1', name: '중2' },
    enrolled_classes: [
      { class_id: 'class-1', class_name: '중2A반', subject: '수학' }
    ]
  },
  {
    id: 'mock-2',
    name: '이서윤',
    phone: '010-2222-3333',
    parent_phone: '010-3333-4444',
    parent_name: '이부모',
    grade_id: 'grade-2',
    school: '강남중학교',
    is_active: true,
    notes: null,
    created_by: null,
    synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    grade_info: { id: 'grade-2', name: '중3' },
    enrolled_classes: [
      { class_id: 'class-2', class_name: '중3A반', subject: '수학' }
    ]
  },
  {
    id: 'mock-3',
    name: '박지훈',
    phone: null,
    parent_phone: '010-5555-6666',
    parent_name: '박부모',
    grade_id: 'grade-1',
    school: '서초중학교',
    is_active: true,
    notes: '학생 연락처 없음',
    created_by: null,
    synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    grade_info: { id: 'grade-1', name: '중2' },
    enrolled_classes: [
      { class_id: 'class-1', class_name: '중2A반', subject: '수학' },
      { class_id: 'class-3', class_name: '중2B반', subject: '영어' }
    ]
  },
  {
    id: 'mock-4',
    name: '최수아',
    phone: '010-7777-8888',
    parent_phone: '010-9999-0000',
    parent_name: '최부모',
    grade_id: 'grade-3',
    school: '역삼고등학교',
    is_active: true,
    notes: null,
    created_by: null,
    synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    grade_info: { id: 'grade-3', name: '고1' },
    enrolled_classes: [
      { class_id: 'class-4', class_name: '고1수학심화', subject: '수학' }
    ]
  },
  {
    id: 'mock-5',
    name: '정유진',
    phone: '010-1111-2222',
    parent_phone: '010-3344-5566',
    parent_name: '정부모',
    grade_id: 'grade-2',
    school: '강남중학교',
    is_active: true,
    notes: null,
    created_by: null,
    synced_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    grade_info: { id: 'grade-2', name: '중3' },
    enrolled_classes: [
      { class_id: 'class-2', class_name: '중3A반', subject: '수학' }
    ]
  }
];

/**
 * 담당 학생 목록 조회 훅
 *
 * @param options.enabled - 쿼리 활성화 여부 (기본: true)
 * @returns 학생 목록, 로딩 상태, 에러
 */
export function useMyStudents(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const teacherId = user?.id;

  return useQuery({
    queryKey: ['my-students', teacherId],
    queryFn: async (): Promise<MyStudent[]> => {
      // Supabase 미설정 시 Mock 데이터 반환
      if (!isSupabaseConfigured || !teacherId) {
        console.log('[useMyStudents] Mock 모드 또는 인증 안됨, Mock 데이터 반환');
        return MOCK_STUDENTS;
      }

      try {
        // Step 1: 내가 담당하는 반 목록 조회
        // teacher_id, assistant_teacher_id, homeroom_teacher_id 중 하나라도 일치하면 담당
        const { data: myClasses, error: classError } = await supabase
          .from('classes')
          .select('id, name, subject')
          .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
          .eq('status', 'active');

        if (classError) {
          console.error('[useMyStudents] 반 조회 에러:', classError);
          throw classError;
        }

        if (!myClasses || myClasses.length === 0) {
          console.log('[useMyStudents] 담당 반이 없습니다');
          return [];
        }

        // 타입 assertion 추가
        const classesData = myClasses as Array<{ id: string; name: string; subject: string | null }>;
        const classIds = classesData.map(c => c.id);
        console.log('[useMyStudents] 담당 반:', classesData.length, '개');

        // Step 2: 해당 반에 등록된 학생 ID 조회
        const { data: enrollments, error: enrollError } = await supabase
          .from('class_enrollments')
          .select('student_id, class_id')
          .in('class_id', classIds)
          .eq('status', 'active');

        if (enrollError) {
          console.error('[useMyStudents] 등록 조회 에러:', enrollError);
          throw enrollError;
        }

        if (!enrollments || enrollments.length === 0) {
          console.log('[useMyStudents] 등록된 학생이 없습니다');
          return [];
        }

        // 타입 assertion 추가
        const enrollmentsData = enrollments as Array<{ student_id: string; class_id: string }>;
        // 중복 제거된 학생 ID 목록
        const studentIds = [...new Set(enrollmentsData.map(e => e.student_id))];
        console.log('[useMyStudents] 학생 수:', studentIds.length, '명');

        // Step 3: 학생 정보 조회 (학년 정보 포함)
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select(`
            *,
            grade_info:grades(id, name)
          `)
          .in('id', studentIds)
          .eq('is_active', true)
          .order('name');

        if (studentError) {
          console.error('[useMyStudents] 학생 조회 에러:', studentError);
          throw studentError;
        }

        // Step 4: 학생별 등록된 반 정보 매핑
        const studentClassMap = new Map<string, Array<{ class_id: string; class_name: string; subject: string }>>();

        for (const enrollment of enrollmentsData) {
          const classInfo = classesData.find(c => c.id === enrollment.class_id);
          if (classInfo) {
            const existing = studentClassMap.get(enrollment.student_id) || [];
            existing.push({
              class_id: classInfo.id,
              class_name: classInfo.name,
              subject: classInfo.subject || ''
            });
            studentClassMap.set(enrollment.student_id, existing);
          }
        }

        // 타입 assertion 추가 (Student with grade_info)
        type StudentWithGrade = Student & { grade_info: Grade | null };
        const studentsData = (students || []) as StudentWithGrade[];

        // Step 5: 최종 결과 조합
        const result: MyStudent[] = studentsData.map(student => ({
          ...student,
          grade_info: student.grade_info,
          enrolled_classes: studentClassMap.get(student.id) || []
        }));

        console.log('[useMyStudents] 최종 결과:', result.length, '명');
        return result;

      } catch (error) {
        console.error('[useMyStudents] 쿼리 실패:', error);
        // 에러 시 Mock 데이터로 폴백
        return MOCK_STUDENTS;
      }
    },
    enabled: options?.enabled !== false && !!teacherId,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
  });
}

/**
 * 학생 검색 필터링 유틸리티
 *
 * @param students - 학생 목록
 * @param searchTerm - 검색어 (이름, 학교)
 * @param gradeFilter - 학년 필터 (예: '중2', '고1')
 * @returns 필터링된 학생 목록
 */
export function filterStudents(
  students: MyStudent[],
  searchTerm: string,
  gradeFilter?: string
): MyStudent[] {
  let result = students;

  // 검색어 필터
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.school?.toLowerCase().includes(term)
    );
  }

  // 학년 필터
  if (gradeFilter) {
    result = result.filter(s =>
      s.grade_info?.name === gradeFilter
    );
  }

  return result;
}

/**
 * 학년별 그룹핑 유틸리티
 *
 * @param students - 학생 목록
 * @returns 학년별 그룹핑된 학생 Map
 */
export function groupStudentsByGrade(
  students: MyStudent[]
): Map<string, MyStudent[]> {
  const grouped = new Map<string, MyStudent[]>();

  for (const student of students) {
    const gradeName = student.grade_info?.name || '미지정';
    const existing = grouped.get(gradeName) || [];
    existing.push(student);
    grouped.set(gradeName, existing);
  }

  return grouped;
}
