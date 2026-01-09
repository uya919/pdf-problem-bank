/**
 * AdminStudentsPage 공통 타입 정의
 */

// 필터 상태 타입
export type FilterStatus = 'all' | 'active' | 'inactive' | 'graduated';

// 학부 타입
export type Division = 'all' | 'elementary' | 'middle' | 'high';

// 과목 코드 타입
export type SubjectCode = 'math' | 'korean' | 'english' | 'science';

// 과목별 배정 정보
export interface SubjectEnrollment {
  classId: string;
  className: string;
  level: 'advanced' | 'regular' | 'regular2' | 'basic';
}

// Mock용 학생 타입
export interface MockStudent {
  id: string;
  name: string;
  grade: string;
  school: string;
  phone: string;
  parent_phone: string;
  status: 'active' | 'inactive' | 'graduated';
  notes?: string;
  created_at: string;
  enrollments: {
    id: string;
    status: 'active' | 'inactive';
    class: { name: string };
  }[];
  // 과목별 배정 정보 (신규)
  subjectEnrollments?: Partial<Record<SubjectCode, SubjectEnrollment>>;
}

// 학생 통계 타입
export interface StudentStatsData {
  attendanceRate: number;
  homeworkRate: number;
  averageScore: number;
  recentScore: number;
  scoreTrend: number;
  absenceCount: number;
}
