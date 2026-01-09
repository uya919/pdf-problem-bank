/**
 * AdminStudentsPage 헬퍼 함수
 */
import type { StudentWithEnrollments } from '../../../types/database';
import type { MockStudent, SubjectCode, SubjectEnrollment } from './types';

/** 학생의 학년 문자열 추출 (Mock/Supabase 모두 지원) */
export function getGradeString(student: MockStudent | StudentWithEnrollments): string {
  const grade = student.grade;
  if (!grade) return '';
  // Supabase에서 JOIN된 Grade 객체인 경우
  if (typeof grade === 'object' && grade !== null && 'name' in grade) {
    return grade.name || '';
  }
  // Mock 데이터의 string인 경우
  return String(grade);
}

/** 학생의 활성 상태 확인 (Mock/Supabase 모두 지원) */
export function isStudentActive(student: MockStudent | StudentWithEnrollments): boolean {
  // Supabase: is_active boolean
  if ('is_active' in student) {
    return student.is_active === true;
  }
  // Mock: status string
  if ('status' in student) {
    return student.status === 'active';
  }
  return false;
}

/**
 * Supabase enrollments를 SubjectEnrollments 형식으로 변환
 *
 * enrollments: [{ class: { subject: 'math', name: '중2 수학A', level: 'advanced', id: 'xxx' } }]
 * → { math: { classId: 'xxx', className: '중2 수학A', level: 'advanced' } }
 */
export function convertEnrollmentsToSubjectEnrollments(
  enrollments?: Array<{
    status?: string;
    class?: { id?: string; name?: string; subject?: string; level?: string | null; created_at?: string };
  }>
): Partial<Record<SubjectCode, SubjectEnrollment>> | undefined {
  if (!enrollments || enrollments.length === 0) return undefined;

  const result: Partial<Record<SubjectCode, SubjectEnrollment & { isOurClass: boolean }>> = {};

  for (const enrollment of enrollments) {
    // active 상태인 enrollment만 처리
    if (enrollment.status && enrollment.status !== 'active') continue;

    const cls = enrollment.class;
    if (!cls?.subject || !cls.id || !cls.name) continue;

    // subject 문자열을 SubjectCode로 매핑
    // 우리가 만든 반: 'math', 'korean', 'english', 'science' (영문)
    // 메이크에듀 반: '수학', '국어', '영어', '과학' (한글)
    let subjectCode: SubjectCode | undefined;
    const subjectStr = cls.subject.toLowerCase();
    const isOurClass = ['math', 'korean', 'english', 'science'].includes(subjectStr);

    if (subjectStr === 'math' || subjectStr === '수학') {
      subjectCode = 'math';
    } else if (subjectStr === 'korean' || subjectStr === '국어') {
      subjectCode = 'korean';
    } else if (subjectStr === 'english' || subjectStr === '영어') {
      subjectCode = 'english';
    } else if (subjectStr === 'science' || subjectStr === '과학') {
      subjectCode = 'science';
    }

    if (!subjectCode) continue;

    // level 매핑 (null이면 'regular'로 기본값)
    const level = (cls.level as SubjectEnrollment['level']) || 'regular';

    // 이미 해당 과목에 배정되어 있으면 우리가 만든 반 우선
    const existing = result[subjectCode];
    if (existing) {
      // 기존이 우리 반이면 유지, 기존이 메이크에듀 반이고 새 것이 우리 반이면 덮어쓰기
      if (existing.isOurClass) {
        // 이미 우리 반이 있으면 유지
        continue;
      } else if (isOurClass) {
        // 기존이 메이크에듀 반이고, 새 것이 우리 반이면 덮어쓰기
        result[subjectCode] = { classId: cls.id, className: cls.name, level, isOurClass };
      }
      // 둘 다 메이크에듀 반이면 첫 번째 것 유지
      continue;
    }

    result[subjectCode] = {
      classId: cls.id,
      className: cls.name,
      level,
      isOurClass,
    };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * 학생 데이터에서 subjectEnrollments 추출
 * Mock 데이터: 직접 subjectEnrollments 필드 사용
 * Supabase 데이터: enrollments에서 변환
 */
export function getSubjectEnrollments(
  student: MockStudent | StudentWithEnrollments
): Partial<Record<SubjectCode, SubjectEnrollment>> | undefined {
  // Mock 데이터: subjectEnrollments 직접 사용
  if ('subjectEnrollments' in student && student.subjectEnrollments) {
    return student.subjectEnrollments;
  }

  // Supabase 데이터: enrollments에서 변환
  if ('enrollments' in student && Array.isArray(student.enrollments)) {
    return convertEnrollmentsToSubjectEnrollments(student.enrollments);
  }

  return undefined;
}
