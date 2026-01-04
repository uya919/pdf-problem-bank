/**
 * Phase 5: AdminStudentsPage (Mock 데이터 지원)
 *
 * 관리자용 학생 관리 페이지
 * - 전체 학생 목록 (검색/필터)
 * - 학생 상세 정보 모달
 * - 학생 통계 (출석률, 숙제 제출률, 성적)
 *
 * Mock 모드: Supabase 미연결 시 Mock 데이터 사용
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  useStudents,
  useStudentStats,
} from '../../hooks/useBackofficeData';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { StudentWithEnrollments } from '../../types/database';

// ============================================
// Types
// ============================================

type FilterStatus = 'all' | 'active' | 'inactive' | 'graduated';

// 학부 타입
type Division = 'all' | 'elementary' | 'middle' | 'high';

// 과목 코드 타입
type SubjectCode = 'math' | 'korean' | 'english' | 'science';

// 학부별 학년 목록
const DIVISION_GRADES: Record<Exclude<Division, 'all'>, string[]> = {
  elementary: ['초3', '초4', '초5', '초6'],
  middle: ['중1', '중2', '중3'],
  high: ['고1', '고2', '고3'],
};

// 학부별 한글 이름
const DIVISION_LABELS: Record<Division, string> = {
  all: '전체',
  elementary: '초등부',
  middle: '중등부',
  high: '고등부',
};

// 과목별 배정 정보
interface SubjectEnrollment {
  classId: string;
  className: string;
  level: 'advanced' | 'regular' | 'regular2' | 'basic';
}

// Mock용 학생 타입
interface MockStudent {
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

// ============================================
// Helpers
// ============================================

/** 학생의 학년 문자열 추출 (Mock/Supabase 모두 지원) */
function getGradeString(student: MockStudent | StudentWithEnrollments): string {
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
function isStudentActive(student: MockStudent | StudentWithEnrollments): boolean {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _isStudentActive = isStudentActive; // 추후 상태 필터 추가 시 사용

/**
 * Supabase enrollments를 SubjectEnrollments 형식으로 변환
 *
 * enrollments: [{ class: { subject: 'math', name: '중2 수학A', level: 'advanced', id: 'xxx' } }]
 * → { math: { classId: 'xxx', className: '중2 수학A', level: 'advanced' } }
 */
function convertEnrollmentsToSubjectEnrollments(
  enrollments?: Array<{ status?: string; class?: { id?: string; name?: string; subject?: string; level?: string | null; created_at?: string } }>
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
function getSubjectEnrollments(
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

// ============================================
// Mock Data
// ============================================

const MOCK_STUDENTS: MockStudent[] = [
  // 초등부 학생
  { id: 's1', name: '김민준', grade: '초3', school: '혜윰초등학교', phone: '010-1111-0001', parent_phone: '010-2222-0001', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e1', status: 'active', class: { name: '초3 수학A' } }],
    subjectEnrollments: { math: { classId: 'c1', className: '초3 수학A', level: 'regular' } }
  },
  { id: 's2', name: '이서윤', grade: '초3', school: '혜윰초등학교', phone: '010-1111-0002', parent_phone: '010-2222-0002', status: 'active', created_at: '2024-03-05',
    enrollments: [{ id: 'e2', status: 'active', class: { name: '초3 수학A' } }],
    subjectEnrollments: { math: { classId: 'c1', className: '초3 수학A', level: 'regular' }, korean: { classId: 'c2', className: '초3 국어A', level: 'regular' } }
  },
  { id: 's3', name: '박지훈', grade: '초4', school: '혜윰초등학교', phone: '010-1111-0003', parent_phone: '010-2222-0003', status: 'active', created_at: '2024-03-10',
    enrollments: [{ id: 'e3', status: 'active', class: { name: '초4 수학A' } }],
    subjectEnrollments: { math: { classId: 'c3', className: '초4 수학A', level: 'advanced' }, english: { classId: 'c4', className: '초4 영어A', level: 'regular' } }
  },
  { id: 's4', name: '최수아', grade: '초5', school: '혜윰초등학교', phone: '010-1111-0004', parent_phone: '010-2222-0004', status: 'active', created_at: '2024-02-15',
    enrollments: [{ id: 'e4', status: 'active', class: { name: '초5 수학A' } }],
    subjectEnrollments: { math: { classId: 'c5', className: '초5 수학A', level: 'regular' } }
  },
  { id: 's5', name: '정하은', grade: '초6', school: '혜윰초등학교', phone: '010-1111-0005', parent_phone: '010-2222-0005', status: 'active', created_at: '2024-01-20',
    enrollments: [{ id: 'e5', status: 'active', class: { name: '초6 수학A' } }, { id: 'e5b', status: 'active', class: { name: '초6 영어A' } }],
    subjectEnrollments: { math: { classId: 'c6', className: '초6 수학A', level: 'advanced' }, english: { classId: 'c7', className: '초6 영어A', level: 'regular' }, korean: { classId: 'c8', className: '초6 국어A', level: 'regular' } }
  },

  // 중등부 학생
  { id: 's6', name: '강현우', grade: '중1', school: '혜윰중학교', phone: '010-1111-0006', parent_phone: '010-2222-0006', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e6', status: 'active', class: { name: '중1 수학A' } }],
    subjectEnrollments: { math: { classId: 'c9', className: '중1 수학A', level: 'regular' } }
  },
  { id: 's7', name: '윤지민', grade: '중1', school: '혜윰중학교', phone: '010-1111-0007', parent_phone: '010-2222-0007', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e7', status: 'active', class: { name: '중1 수학B' } }, { id: 'e7b', status: 'active', class: { name: '중1 영어A' } }],
    subjectEnrollments: { math: { classId: 'c10', className: '중1 수학B', level: 'basic' }, english: { classId: 'c11', className: '중1 영어A', level: 'regular' } }
  },
  { id: 's8', name: '임서준', grade: '중2', school: '혜윰중학교', phone: '010-1111-0008', parent_phone: '010-2222-0008', status: 'active', created_at: '2024-02-01',
    enrollments: [{ id: 'e8', status: 'active', class: { name: '중2 수학A' } }],
    subjectEnrollments: { math: { classId: 'c12', className: '중2 수학A', level: 'advanced' }, korean: { classId: 'c13', className: '중2 국어A', level: 'regular' }, english: { classId: 'c14', className: '중2 영어A', level: 'regular' }, science: { classId: 'c15', className: '중2 과학A', level: 'regular' } }
  },
  { id: 's9', name: '한예은', grade: '중2', school: '혜윰중학교', phone: '010-1111-0009', parent_phone: '010-2222-0009', status: 'active', created_at: '2024-02-01',
    enrollments: [{ id: 'e9', status: 'active', class: { name: '중2 수학A' } }, { id: 'e9b', status: 'active', class: { name: '중2 영어A' } }],
    subjectEnrollments: { math: { classId: 'c12', className: '중2 수학A', level: 'advanced' }, english: { classId: 'c14', className: '중2 영어A', level: 'regular' } }
  },
  { id: 's10', name: '송민서', grade: '중2', school: '다른중학교', phone: '010-1111-0010', parent_phone: '010-2222-0010', status: 'active', created_at: '2024-01-15',
    enrollments: [{ id: 'e10', status: 'active', class: { name: '중2 수학B' } }],
    subjectEnrollments: { math: { classId: 'c16', className: '중2 수학B', level: 'basic' } }
  },
  { id: 's11', name: '장도윤', grade: '중3', school: '혜윰중학교', phone: '010-1111-0011', parent_phone: '010-2222-0011', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e11', status: 'active', class: { name: '중3 수학A' } }],
    subjectEnrollments: { math: { classId: 'c17', className: '중3 수학A', level: 'advanced' }, korean: { classId: 'c18', className: '중3 국어A', level: 'advanced' } }
  },
  { id: 's12', name: '오채원', grade: '중3', school: '혜윰중학교', phone: '010-1111-0012', parent_phone: '010-2222-0012', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e12', status: 'active', class: { name: '중3 수학A' } }, { id: 'e12b', status: 'active', class: { name: '중3 영어A' } }],
    subjectEnrollments: { math: { classId: 'c17', className: '중3 수학A', level: 'advanced' }, english: { classId: 'c19', className: '중3 영어A', level: 'regular' }, science: { classId: 'c20', className: '중3 과학A', level: 'advanced' } }
  },
  { id: 's13', name: '신지우', grade: '중3', school: '다른중학교', phone: '010-1111-0013', parent_phone: '010-2222-0013', status: 'active', created_at: '2024-02-20',
    enrollments: [{ id: 'e13', status: 'active', class: { name: '중3 수학B' } }],
    subjectEnrollments: { math: { classId: 'c21', className: '중3 수학B', level: 'regular' } }
  },
  { id: 's14', name: '권시우', grade: '중3', school: '혜윰중학교', phone: '010-1111-0014', parent_phone: '010-2222-0014', status: 'active', created_at: '2024-01-10',
    enrollments: [{ id: 'e14', status: 'active', class: { name: '중3 수학C' } }], notes: '기초 보충 필요',
    subjectEnrollments: { math: { classId: 'c22', className: '중3 수학C', level: 'basic' } }
  },

  // 고등부 학생
  { id: 's15', name: '유하윤', grade: '고1', school: '혜윰고등학교', phone: '010-1111-0015', parent_phone: '010-2222-0015', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e15', status: 'active', class: { name: '고1 수학A' } }],
    subjectEnrollments: { math: { classId: 'c23', className: '고1 수학A', level: 'advanced' }, korean: { classId: 'c24', className: '고1 국어A', level: 'regular' } }
  },
  { id: 's16', name: '황준호', grade: '고1', school: '혜윰고등학교', phone: '010-1111-0016', parent_phone: '010-2222-0016', status: 'active', created_at: '2024-03-01',
    enrollments: [{ id: 'e16', status: 'active', class: { name: '고1 수학A' } }, { id: 'e16b', status: 'active', class: { name: '고1 영어A' } }],
    subjectEnrollments: { math: { classId: 'c23', className: '고1 수학A', level: 'advanced' }, english: { classId: 'c25', className: '고1 영어A', level: 'regular' }, korean: { classId: 'c24', className: '고1 국어A', level: 'regular' }, science: { classId: 'c26', className: '고1 과학A', level: 'advanced' } }
  },
  { id: 's17', name: '안소율', grade: '고2', school: '혜윰고등학교', phone: '010-1111-0017', parent_phone: '010-2222-0017', status: 'active', created_at: '2024-02-01',
    enrollments: [{ id: 'e17', status: 'active', class: { name: '고2 수학A' } }],
    subjectEnrollments: { math: { classId: 'c27', className: '고2 수학A', level: 'advanced' } }
  },
  { id: 's18', name: '백서연', grade: '고2', school: '혜윰고등학교', phone: '010-1111-0018', parent_phone: '010-2222-0018', status: 'active', created_at: '2024-02-01',
    enrollments: [{ id: 'e18', status: 'active', class: { name: '고2 수학B' } }],
    subjectEnrollments: { math: { classId: 'c28', className: '고2 수학B', level: 'regular' }, english: { classId: 'c29', className: '고2 영어A', level: 'advanced' } }
  },
  { id: 's19', name: '조민재', grade: '고3', school: '혜윰고등학교', phone: '010-1111-0019', parent_phone: '010-2222-0019', status: 'active', created_at: '2024-01-01',
    enrollments: [{ id: 'e19', status: 'active', class: { name: '고3 수학A' } }], notes: '수능 집중반',
    subjectEnrollments: { math: { classId: 'c30', className: '고3 수학A', level: 'advanced' }, korean: { classId: 'c31', className: '고3 국어A', level: 'advanced' }, english: { classId: 'c32', className: '고3 영어A', level: 'advanced' } }
  },
  { id: 's20', name: '남지안', grade: '고3', school: '다른고등학교', phone: '010-1111-0020', parent_phone: '010-2222-0020', status: 'active', created_at: '2024-01-01',
    enrollments: [{ id: 'e20', status: 'active', class: { name: '고3 수학A' } }, { id: 'e20b', status: 'active', class: { name: '고3 수학B' } }],
    subjectEnrollments: { math: { classId: 'c30', className: '고3 수학A', level: 'advanced' }, english: { classId: 'c32', className: '고3 영어A', level: 'advanced' } }
  },

  // 휴원생
  { id: 's21', name: '문예린', grade: '중2', school: '혜윰중학교', phone: '010-1111-0021', parent_phone: '010-2222-0021', status: 'inactive', created_at: '2024-01-01',
    enrollments: [{ id: 'e21', status: 'inactive', class: { name: '중2 수학A' } }], notes: '개인 사정으로 휴원',
    subjectEnrollments: { math: { classId: 'c12', className: '중2 수학A', level: 'advanced' } }
  },
  { id: 's22', name: '배승민', grade: '고1', school: '혜윰고등학교', phone: '010-1111-0022', parent_phone: '010-2222-0022', status: 'inactive', created_at: '2023-09-01',
    enrollments: [{ id: 'e22', status: 'inactive', class: { name: '고1 수학B' } }],
    subjectEnrollments: { math: { classId: 'c33', className: '고1 수학B', level: 'regular' } }
  },

  // 졸업생
  { id: 's23', name: '류하람', grade: '고3', school: '혜윰고등학교', phone: '010-1111-0023', parent_phone: '010-2222-0023', status: 'graduated', created_at: '2022-03-01', enrollments: [] },
  { id: 's24', name: '노은우', grade: '고3', school: '혜윰고등학교', phone: '010-1111-0024', parent_phone: '010-2222-0024', status: 'graduated', created_at: '2022-03-01', enrollments: [] },
];

// Mock 학생 통계
const MOCK_STUDENT_STATS: Record<string, {
  attendanceRate: number;
  homeworkRate: number;
  averageScore: number;
  recentScore: number;
  scoreTrend: number;
  absenceCount: number;
}> = {
  's1': { attendanceRate: 100, homeworkRate: 100, averageScore: 95, recentScore: 98, scoreTrend: 3, absenceCount: 0 },
  's2': { attendanceRate: 95, homeworkRate: 90, averageScore: 88, recentScore: 85, scoreTrend: -2, absenceCount: 1 },
  's3': { attendanceRate: 100, homeworkRate: 95, averageScore: 92, recentScore: 94, scoreTrend: 5, absenceCount: 0 },
  's4': { attendanceRate: 90, homeworkRate: 85, averageScore: 78, recentScore: 80, scoreTrend: 2, absenceCount: 2 },
  's5': { attendanceRate: 100, homeworkRate: 100, averageScore: 96, recentScore: 98, scoreTrend: 1, absenceCount: 0 },
  's6': { attendanceRate: 95, homeworkRate: 88, averageScore: 84, recentScore: 86, scoreTrend: 4, absenceCount: 1 },
  's7': { attendanceRate: 100, homeworkRate: 92, averageScore: 90, recentScore: 92, scoreTrend: 2, absenceCount: 0 },
  's8': { attendanceRate: 85, homeworkRate: 75, averageScore: 72, recentScore: 70, scoreTrend: -5, absenceCount: 3 },
  's9': { attendanceRate: 100, homeworkRate: 100, averageScore: 94, recentScore: 96, scoreTrend: 3, absenceCount: 0 },
  's10': { attendanceRate: 90, homeworkRate: 80, averageScore: 76, recentScore: 78, scoreTrend: 1, absenceCount: 2 },
  's11': { attendanceRate: 100, homeworkRate: 95, averageScore: 91, recentScore: 93, scoreTrend: 4, absenceCount: 0 },
  's12': { attendanceRate: 95, homeworkRate: 90, averageScore: 87, recentScore: 88, scoreTrend: 0, absenceCount: 1 },
  's13': { attendanceRate: 85, homeworkRate: 70, averageScore: 68, recentScore: 65, scoreTrend: -8, absenceCount: 3 },
  's14': { attendanceRate: 80, homeworkRate: 60, averageScore: 58, recentScore: 55, scoreTrend: -3, absenceCount: 4 },
  's15': { attendanceRate: 100, homeworkRate: 98, averageScore: 93, recentScore: 95, scoreTrend: 2, absenceCount: 0 },
  's16': { attendanceRate: 95, homeworkRate: 92, averageScore: 88, recentScore: 90, scoreTrend: 3, absenceCount: 1 },
  's17': { attendanceRate: 100, homeworkRate: 100, averageScore: 97, recentScore: 99, scoreTrend: 2, absenceCount: 0 },
  's18': { attendanceRate: 90, homeworkRate: 85, averageScore: 82, recentScore: 84, scoreTrend: 1, absenceCount: 2 },
  's19': { attendanceRate: 100, homeworkRate: 100, averageScore: 95, recentScore: 97, scoreTrend: 2, absenceCount: 0 },
  's20': { attendanceRate: 95, homeworkRate: 95, averageScore: 91, recentScore: 93, scoreTrend: 4, absenceCount: 1 },
  's21': { attendanceRate: 70, homeworkRate: 50, averageScore: 65, recentScore: 60, scoreTrend: -10, absenceCount: 6 },
  's22': { attendanceRate: 60, homeworkRate: 40, averageScore: 55, recentScore: 50, scoreTrend: -15, absenceCount: 8 },
};

// ============================================
// Main Component
// ============================================

// 연결 상태 표시 컴포넌트
const DataSourceBadge = () => (
  <span className={`text-xs px-2 py-1 rounded ${
    isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  }`}>
    {isSupabaseConfigured ? '🟢 Supabase' : '🟡 Mock 데이터'}
  </span>
);

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus] = useState<FilterStatus>('active');  // 기본값: 재원생만
  const [filterDivision, setFilterDivision] = useState<Division>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<SubjectCode | 'all'>('all');
  // 정렬은 이름순(ㄱ→ㅎ) 고정
  const [selectedStudent, setSelectedStudent] = useState<MockStudent | StudentWithEnrollments | null>(null);

  // 학부 변경 시 학년 필터 리셋
  const handleDivisionChange = (division: Division) => {
    setFilterDivision(division);
    setFilterGrade('all');
  };

  // Supabase 데이터 조회 (Mock 모드에서는 비활성화)
  // 참고: 학부/학년/과목 필터는 클라이언트에서 처리 (Supabase 스키마와 불일치)
  const { data: supabaseStudents, isLoading: supabaseLoading } = useStudents({
    status: filterStatus === 'all' ? undefined : filterStatus as 'active' | 'inactive' | 'graduated',
    // grade 필터는 클라이언트에서 처리 (grade_id는 UUID, filterGrade는 문자열)
    search: search || undefined,
  });

  // 학생 ID 목록 추출 (통계 조회용)
  const studentIds = useMemo(() => {
    if (!isSupabaseConfigured) return [];
    return supabaseStudents?.map((s) => s.id) || [];
  }, [supabaseStudents]);

  // Supabase 학생 통계 조회 (첫 번째 학생만 - 배열 지원 안함)
  const firstStudentId = studentIds.length > 0 ? studentIds[0] : null;
  const { data: supabaseStats } = useStudentStats(firstStudentId);

  // Mock 데이터 필터링
  const mockFilteredStudents = useMemo(() => {
    let result = [...MOCK_STUDENTS];

    // 상태 필터
    if (filterStatus !== 'all') {
      result = result.filter((s) => s.status === filterStatus);
    }

    // 학부 필터
    if (filterDivision !== 'all') {
      const divisionGrades = DIVISION_GRADES[filterDivision];
      result = result.filter((s) => divisionGrades.includes(s.grade));
    }

    // 학년 필터
    if (filterGrade && filterGrade !== 'all') {
      result = result.filter((s) => s.grade === filterGrade);
    }

    // 과목 필터
    if (filterSubject !== 'all') {
      result = result.filter((s) => {
        const enrollments = s.subjectEnrollments;
        return enrollments?.[filterSubject] !== undefined;
      });
    }

    // 검색
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(searchLower) ||
        s.school.toLowerCase().includes(searchLower) ||
        s.grade.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [filterStatus, filterDivision, filterGrade, filterSubject, search]);

  // 실제 사용할 학생 목록 (Supabase 우선, Mock fallback)
  const students = useMemo(() => {
    if (isSupabaseConfigured && supabaseStudents && supabaseStudents.length > 0) {
      return supabaseStudents;
    }
    return mockFilteredStudents;
  }, [supabaseStudents, mockFilteredStudents]);

  // 학생 통계 (Supabase 우선, Mock fallback)
  // supabaseStats는 단일 StudentStats 객체이므로 Record로 변환
  const statsData: Record<string, typeof MOCK_STUDENT_STATS[string]> = isSupabaseConfigured && firstStudentId && supabaseStats
    ? { [firstStudentId]: supabaseStats }
    : MOCK_STUDENT_STATS;

  // 로딩 상태
  const isLoading = isSupabaseConfigured ? supabaseLoading : false;

  // 필터링 & 정렬된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!students) return [];

    let result = [...students];

    // 학부 필터 (Supabase 데이터에도 적용)
    if (filterDivision !== 'all') {
      const divisionGrades = DIVISION_GRADES[filterDivision];
      result = result.filter((s) => {
        const gradeStr = getGradeString(s);
        return divisionGrades.includes(gradeStr);
      });
    }

    // 학년 필터
    if (filterGrade && filterGrade !== 'all') {
      result = result.filter((s) => getGradeString(s) === filterGrade);
    }

    // 과목 필터 (enrollments 기반)
    if (filterSubject !== 'all') {
      result = result.filter((s) => {
        // Mock 데이터: subjectEnrollments
        if ('subjectEnrollments' in s && s.subjectEnrollments) {
          return s.subjectEnrollments[filterSubject as SubjectCode] !== undefined;
        }
        // Supabase 데이터: enrollments
        if ('enrollments' in s && Array.isArray(s.enrollments)) {
          return s.enrollments.some((e: { class?: { subject?: string } }) =>
            e.class?.subject === filterSubject
          );
        }
        return false;
      });
    }

    // 정렬 (이름순 ㄱ→ㅎ 기본)
    result.sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

    return result;
  }, [students, filterDivision, filterGrade, filterSubject]);

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="학생 관리"
          description="전체 학생의 정보와 통계를 관리합니다"
          actions={
            <div className="flex items-center gap-3">
              <DataSourceBadge />
              <button
                onClick={() => navigate('/admin/subject-assignment')}
                className="px-4 py-2 bg-grey-100 text-grey-700 font-medium rounded-lg hover:bg-grey-200 transition-colors"
              >
                반 배정
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
                + 학생 등록
              </button>
            </div>
          }
        />

        {/* 필터 섹션 - 컴팩트 반응형 레이아웃 */}
        <div className="bg-white border border-grey-200 rounded-xl p-4 space-y-3">
          {/* 1줄: 학부 + 학년 (가로 배치, 모바일에서는 세로) */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            {/* 학부 필터 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-grey-500 w-10">학부</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                {(['all', 'elementary', 'middle', 'high'] as Division[]).map((division) => (
                  <button
                    key={division}
                    onClick={() => handleDivisionChange(division)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterDivision === division
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {DIVISION_LABELS[division]}
                  </button>
                ))}
              </div>
            </div>

            {/* 학년 필터 (학부 선택 시만 표시) - PC에서는 같은 줄 */}
            {filterDivision !== 'all' && (
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="hidden lg:block h-6 w-px bg-grey-200" />
                <span className="text-sm font-medium text-grey-500 w-10 lg:w-auto">학년</span>
                <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                  <button
                    onClick={() => setFilterGrade('all')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterGrade === 'all'
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    전체
                  </button>
                  {DIVISION_GRADES[filterDivision].map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setFilterGrade(grade)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        filterGrade === grade
                          ? 'bg-white text-grey-900 shadow-sm'
                          : 'text-grey-500 hover:text-grey-700'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2줄: 검색 + 과목 (가로 배치, 모바일에서는 세로) */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            {/* 검색창 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-grey-500 w-10">검색</span>
              <div className="relative w-44">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">🔍</span>
                <input
                  type="text"
                  placeholder="이름..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 과목 필터 - PC에서는 같은 줄 */}
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="hidden lg:block h-6 w-px bg-grey-200" />
              <span className="text-sm font-medium text-grey-500 w-10 lg:w-auto">과목</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                <button
                  onClick={() => setFilterSubject('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterSubject === 'all'
                      ? 'bg-white text-grey-900 shadow-sm'
                      : 'text-grey-500 hover:text-grey-700'
                  }`}
                >
                  전체
                </button>
                {(['math', 'korean', 'english', 'science'] as SubjectCode[]).map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setFilterSubject(subject)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterSubject === subject
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {SUBJECT_CONFIG[subject].name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 학생 목록 테이블 */}
        <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
            <h3 className="font-semibold text-grey-900 flex items-center gap-2">
              <span>📋</span>
              학생 목록
            </h3>
            <span className="text-sm text-grey-500">
              {filteredStudents.length}명
            </span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-grey-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              로딩 중...
            </div>
          ) : filteredStudents.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
                  <th className="px-5 py-3 text-left">학생</th>
                  <th className="px-5 py-3 text-left">학년/학교</th>
                  <th className="px-5 py-3 text-left">수강 과목</th>
                  <th className="px-5 py-3 text-left">상태</th>
                  <th className="px-5 py-3 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {filteredStudents.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onClick={() => setSelectedStudent(student)}
                    onConsultation={() => navigate('/admin/consultation/student', {
                      state: { selectedStudentId: student.id }
                    })}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-grey-500">
              <div className="text-4xl mb-3">📭</div>
              {search ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
            </div>
          )}
        </section>
      </div>

      {/* 학생 상세 모달 */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          stats={statsData?.[selectedStudent.id]}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </AdminLayoutV5>
  );
}

// ============================================
// Sub Components
// ============================================

// ============================================
// Subject Badges Component (Phase 1)
// ============================================

/** 과목별 설정 */
const SUBJECT_CONFIG: Record<SubjectCode, {
  name: string;
  short: string;
  bgActive: string;
  bgInactive: string;
  textActive: string;
  textInactive: string;
  borderActive: string;
  borderInactive: string;
}> = {
  math: {
    name: '수학',
    short: '수',
    bgActive: 'bg-blue-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-blue-300',
    borderActive: 'border-blue-500',
    borderInactive: 'border-blue-200',
  },
  korean: {
    name: '국어',
    short: '국',
    bgActive: 'bg-green-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-green-300',
    borderActive: 'border-green-500',
    borderInactive: 'border-green-200',
  },
  english: {
    name: '영어',
    short: '영',
    bgActive: 'bg-purple-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-purple-300',
    borderActive: 'border-purple-500',
    borderInactive: 'border-purple-200',
  },
  science: {
    name: '과학',
    short: '과',
    bgActive: 'bg-orange-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-orange-300',
    borderActive: 'border-orange-500',
    borderInactive: 'border-orange-200',
  },
};

/** 레벨별 라벨 */
const LEVEL_LABELS: Record<string, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
  mid: '정규',  // Supabase에서 mid로 저장된 경우
};

/** 레벨 표시 (가독성 개선: 심→심화, 정→정규, 기→기초) */
const LEVEL_DISPLAY: Record<string, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
  mid: '정규',  // Supabase에서 mid로 저장된 경우
};

/**
 * SubjectBadges - 하이브리드 1줄 뱃지 컴포넌트 (Phase 1 개선)
 *
 * 배정된 과목만 표시 (미배정은 표시 안함)
 * 포맷: "수심화 국정규 영정규" (컬러 뱃지)
 * 장점: 테이블 행 높이 일관성, 공간 효율적, 정보 밀도 높음
 */
function SubjectBadges({
  subjectEnrollments,
}: {
  subjectEnrollments?: Partial<Record<SubjectCode, SubjectEnrollment>>;
}) {
  // 배정된 과목만 필터링 (수학 → 국어 → 영어 → 과학 순서 유지)
  const subjects: SubjectCode[] = ['math', 'korean', 'english', 'science'];
  const enrolledSubjects = subjects.filter(
    (subject) => !!subjectEnrollments?.[subject]
  );

  // 배정된 과목이 없으면 "-" 표시
  if (enrolledSubjects.length === 0) {
    return <span className="text-grey-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {enrolledSubjects.map((subject) => {
        const enrollment = subjectEnrollments![subject]!;
        const config = SUBJECT_CONFIG[subject];
        const levelDisplay = LEVEL_DISPLAY[enrollment.level] || enrollment.level;

        return (
          <span
            key={subject}
            className={`
              inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
              ${config.bgActive} ${config.textActive}
            `}
            title={`${config.name}: ${enrollment.className} (${LEVEL_LABELS[enrollment.level] || enrollment.level})`}
          >
            {config.short} {levelDisplay}
          </span>
        );
      })}
    </div>
  );
}

/**
 * SubjectEnrollmentGrid - 모달용 과목별 배정 현황 그리드
 *
 * 각 과목별 배정 정보를 카드 형태로 표시
 */
function SubjectEnrollmentGrid({
  student,
}: {
  student: MockStudent | StudentWithEnrollments;
}) {
  const subjects: SubjectCode[] = ['math', 'korean', 'english', 'science'];
  // Mock/Supabase 모두 지원
  const subjectEnrollments = getSubjectEnrollments(student);

  return (
    <div className="grid grid-cols-2 gap-3">
      {subjects.map((subject) => {
        const enrollment = subjectEnrollments?.[subject];
        const config = SUBJECT_CONFIG[subject];
        const isEnrolled = !!enrollment;

        return (
          <div
            key={subject}
            className={`
              rounded-xl p-4 border-2 transition-all
              ${isEnrolled
                ? `${config.bgActive} ${config.borderActive}`
                : 'bg-grey-50 border-grey-200'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isEnrolled
                  ? 'bg-white/20 text-white'
                  : `${config.borderInactive} border-2 ${config.textInactive}`
                }
              `}>
                {config.short}
              </div>
              <span className={`font-semibold ${isEnrolled ? 'text-white' : 'text-grey-400'}`}>
                {config.name}
              </span>
            </div>
            {isEnrolled ? (
              <div className="text-white/90">
                <div className="text-sm font-medium">{enrollment.className}</div>
                <div className="text-xs text-white/70 mt-0.5">
                  {LEVEL_LABELS[enrollment.level] || enrollment.level}
                </div>
              </div>
            ) : (
              <div className="text-grey-400 text-sm">미배정</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Student Row Component
// ============================================

/**
 * StudentRow - 학생 테이블 행 컴포넌트
 *
 * 테이블에서는 핵심 정보만 표시 (출석률/숙제/평균은 모달에서만)
 */
function StudentRow({
  student,
  onClick,
  onConsultation,
}: {
  student: MockStudent | StudentWithEnrollments;
  onClick: () => void;
  onConsultation: () => void;
}) {
  const statusConfig = {
    active: { label: '재원', color: 'bg-green-100 text-green-700' },
    inactive: { label: '휴원', color: 'bg-orange-100 text-orange-700' },
    graduated: { label: '졸업', color: 'bg-blue-100 text-blue-700' },
  };

  // Supabase: is_active boolean, Mock: status string
  const studentStatus = 'is_active' in student
    ? (student.is_active ? 'active' : 'inactive')
    : (student.status || 'active');
  const config = statusConfig[studentStatus as keyof typeof statusConfig] || statusConfig.active;

  // 과목별 배정 정보 (Mock/Supabase 모두 지원)
  const subjectEnrollments = getSubjectEnrollments(student);

  return (
    <tr className="hover:bg-grey-50 cursor-pointer" onClick={onClick}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-grey-200 flex items-center justify-center text-grey-600 font-medium">
            {student.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-grey-900">{student.name}</div>
            <div className="text-sm text-grey-500">{student.phone || '-'}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="text-grey-900">{getGradeString(student) || '-'}</div>
        <div className="text-sm text-grey-500">{student.school || '-'}</div>
      </td>
      <td className="px-5 py-4">
        <SubjectBadges subjectEnrollments={subjectEnrollments} />
      </td>
      <td className="px-5 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded ${config.color}`}>
          {config.label}
        </span>
      </td>
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConsultation();
            }}
            className="p-1.5 text-grey-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="상담 기록"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            상세
          </button>
        </div>
      </td>
    </tr>
  );
}

function StudentDetailModal({
  student,
  stats,
  onClose,
}: {
  student: MockStudent | StudentWithEnrollments;
  stats?: {
    attendanceRate: number;
    homeworkRate: number;
    averageScore: number;
    recentScore: number;
    scoreTrend: number;
    absenceCount: number;
  };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-[600px] max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-grey-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {student.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-grey-900">{student.name}</h2>
              <p className="text-sm text-grey-500">
                {getGradeString(student)} · {student.school || '학교 미등록'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* 연락처 정보 */}
          <section>
            <h3 className="font-semibold text-grey-900 mb-3">연락처</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-grey-50 rounded-lg p-3">
                <div className="text-xs text-grey-500 mb-1">학생 연락처</div>
                <div className="font-medium text-grey-900">{student.phone || '-'}</div>
              </div>
              <div className="bg-grey-50 rounded-lg p-3">
                <div className="text-xs text-grey-500 mb-1">학부모 연락처</div>
                <div className="font-medium text-grey-900">{student.parent_phone || '-'}</div>
              </div>
            </div>
          </section>

          {/* 과목별 배정 현황 (Phase 4) */}
          <section>
            <h3 className="font-semibold text-grey-900 mb-3">과목별 배정 현황</h3>
            <SubjectEnrollmentGrid student={student} />
          </section>

          {/* 학습 통계 */}
          <section>
            <h3 className="font-semibold text-grey-900 mb-3">이번 달 통계</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-grey-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {stats?.attendanceRate ?? '-'}%
                </div>
                <div className="text-sm text-grey-500 mt-1">출석률</div>
              </div>
              <div className="bg-grey-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {stats?.homeworkRate ?? '-'}%
                </div>
                <div className="text-sm text-grey-500 mt-1">숙제 제출률</div>
              </div>
              <div className="bg-grey-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-grey-900">
                  {stats?.averageScore ?? '-'}점
                </div>
                <div className="text-sm text-grey-500 mt-1">평균 점수</div>
              </div>
            </div>
          </section>

          {/* 최근 시험 */}
          {stats && (
            <section>
              <h3 className="font-semibold text-grey-900 mb-3">최근 시험</h3>
              <div className="bg-grey-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-grey-900">
                    {stats.recentScore}점
                  </div>
                  <div className="text-sm text-grey-500">최근 시험 점수</div>
                </div>
                {stats.scoreTrend !== 0 && (
                  <div
                    className={`text-lg font-bold ${
                      stats.scoreTrend > 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {stats.scoreTrend > 0 ? '+' : ''}
                    {stats.scoreTrend}점
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 메모 */}
          {student.notes && (
            <section>
              <h3 className="font-semibold text-grey-900 mb-3">메모</h3>
              <div className="bg-grey-50 rounded-lg p-4 text-grey-700 text-sm">
                {student.notes}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
