/**
 * AdminStudentsPage Mock 데이터
 */
import type { MockStudent, StudentStatsData } from './types';

// Mock 학생 데이터
export const MOCK_STUDENTS: MockStudent[] = [
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
export const MOCK_STUDENT_STATS: Record<string, StudentStatsData> = {
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
