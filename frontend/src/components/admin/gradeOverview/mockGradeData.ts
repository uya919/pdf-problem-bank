/**
 * GradeOverview Mock 데이터
 *
 * Stage 54-D-2에서 분리됨 (2025-01-07)
 */
import type { Subject } from '../../../stores/subjectStore';
import type { MockClassData, GradeStatItem, GradeKPIData } from './types';

// 학년별 전체 반 수 (과목 필터링 전)
export const MOCK_GRADES: GradeStatItem[] = [
  // 초등부
  { grade: '초3', classCount: 2, studentCount: 12 },
  { grade: '초4', classCount: 3, studentCount: 18 },
  { grade: '초5', classCount: 3, studentCount: 20 },
  { grade: '초6', classCount: 4, studentCount: 28 },
  // 중등부
  { grade: '중1', classCount: 4, studentCount: 30 },
  { grade: '중2', classCount: 6, studentCount: 48 },
  { grade: '중3', classCount: 6, studentCount: 44 },
  // 고등부
  { grade: '고1', classCount: 4, studentCount: 32 },
  { grade: '고2', classCount: 4, studentCount: 28 },
  { grade: '고3', classCount: 3, studentCount: 21 },
];

// 선생님 이름 매핑
export const TEACHER_MAP: Record<string, string> = {
  // 초등부 수학
  'e3-math-a': '최초등', 'e3-math-b': '최초등',
  'e4-math-a': '최초등', 'e4-math-b': '최초등',
  'e5-math-a': '정기초', 'e5-math-b': '정기초',
  'e6-math-a': '정기초', 'e6-math-b': '정기초', 'e6-math-c': '정기초',
  // 초등부 영어
  'e4-eng-a': '이영어', 'e5-eng-a': '이영어', 'e6-eng-a': '이영어',
  // 중등부 수학
  'm1-math-a': '김수학', 'm1-math-b': '이대수',
  'm2-math-a': '김수학', 'm2-math-b': '이대수', 'm2-math-c': '박미분',
  'm3-math-a': '김수학', 'm3-math-b': '이대수', 'm3-math-c': '박미분',
  // 중등부 영어
  'm1-eng-a': '박영어', 'm1-eng-b': '박영어',
  'm2-eng-a': '박영어', 'm2-eng-b': '박영어',
  'm3-eng-a': '박영어', 'm3-eng-b': '박영어',
  // 중등부 국어
  'm2-kor-a': '최국어', 'm3-kor-a': '최국어',
  // 고등부 수학
  'h1-math-a': '김수학', 'h1-math-b': '이대수',
  'h2-math-a': '김수학', 'h2-math-b': '이대수',
  'h3-math-a': '김수학', 'h3-math-b': '김수학',
  // 고등부 영어
  'h1-eng-a': '한영어', 'h1-eng-b': '한영어',
  'h2-eng-a': '한영어', 'h2-eng-b': '한영어',
  'h3-eng-a': '한영어',
};

// 학년별 반 목록
export const MOCK_CLASSES_BY_GRADE: Record<string, MockClassData[]> = {
  // 초등부
  '초3': [
    { id: 'e3-math-a', name: '초3 수학A', level: 'high', studentCount: 6, subject: 'math',
      progress: { textbook: '기탄수학 G단계', currentPage: 45, targetPage: 80, lastDate: '12/12' },
      homework: { range: 'p.46-48', dueDate: '12/14', submitted: 6, total: 6, pending: [] } },
    { id: 'e3-math-b', name: '초3 수학B', level: 'mid', studentCount: 6, subject: 'math',
      progress: { textbook: '기탄수학 F단계', currentPage: 52, targetPage: 80, lastDate: '12/11' },
      homework: { range: 'p.53-55', dueDate: '12/14', submitted: 5, total: 6, pending: ['김민재'] } },
  ],
  '초4': [
    { id: 'e4-math-a', name: '초4 수학A', level: 'high', studentCount: 7, subject: 'math',
      progress: { textbook: '기탄수학 H단계', currentPage: 38, targetPage: 80, lastDate: '12/12' },
      homework: { range: 'p.39-42', dueDate: '12/15', submitted: 7, total: 7, pending: [] } },
    { id: 'e4-math-b', name: '초4 수학B', level: 'mid', studentCount: 6, subject: 'math',
      progress: { textbook: '기탄수학 G단계', currentPage: 62, targetPage: 80, lastDate: '12/11' },
      homework: { range: 'p.63-66', dueDate: '12/15', submitted: 5, total: 6, pending: ['이서준'] } },
    { id: 'e4-eng-a', name: '초4 영어', level: 'mid', studentCount: 5, subject: 'english',
      progress: { textbook: 'English Bus 4', currentPage: 28, targetPage: 60, lastDate: '12/12' },
      homework: { range: 'Unit 5', dueDate: '12/15', submitted: 4, total: 5, pending: ['박하윤'] } },
  ],
  '초5': [
    { id: 'e5-math-a', name: '초5 수학A', level: 'high', studentCount: 8, subject: 'math',
      progress: { textbook: '쎈 초등수학 5-2', currentPage: 95, targetPage: 150, lastDate: '12/12' },
      homework: { range: 'p.96-100', dueDate: '12/14', submitted: 7, total: 8, pending: ['최예은'] } },
    { id: 'e5-math-b', name: '초5 수학B', level: 'mid', studentCount: 7, subject: 'math',
      progress: { textbook: '쎈 초등수학 5-2', currentPage: 78, targetPage: 150, lastDate: '12/11' },
      homework: { range: 'p.79-82', dueDate: '12/14', submitted: 6, total: 7, pending: ['정우진'] } },
    { id: 'e5-eng-a', name: '초5 영어', level: 'mid', studentCount: 5, subject: 'english',
      progress: { textbook: 'English Bus 5', currentPage: 32, targetPage: 60, lastDate: '12/12' },
      homework: { range: 'Unit 6', dueDate: '12/14', submitted: 5, total: 5, pending: [] } },
  ],
  '초6': [
    { id: 'e6-math-a', name: '초6 수학A', level: 'high', studentCount: 8, subject: 'math',
      progress: { textbook: '쎈 초등수학 6-2', currentPage: 112, targetPage: 160, lastDate: '12/12' },
      homework: { range: 'p.113-118', dueDate: '12/15', submitted: 8, total: 8, pending: [] } },
    { id: 'e6-math-b', name: '초6 수학B', level: 'mid', studentCount: 7, subject: 'math',
      progress: { textbook: '쎈 초등수학 6-2', currentPage: 88, targetPage: 160, lastDate: '12/11' },
      homework: { range: 'p.89-94', dueDate: '12/15', submitted: 5, total: 7, pending: ['강지훈', '윤서아'] } },
    { id: 'e6-math-c', name: '초6 수학C', level: 'low', studentCount: 6, subject: 'math',
      progress: { textbook: '개념클릭 6-2', currentPage: 45, targetPage: 100, lastDate: '12/10' },
      homework: { range: 'p.46-50', dueDate: '12/15', submitted: 4, total: 6, pending: ['임태현', '송유나'] } },
    { id: 'e6-eng-a', name: '초6 영어', level: 'high', studentCount: 7, subject: 'english',
      progress: { textbook: 'English Bus 6', currentPage: 42, targetPage: 60, lastDate: '12/12' },
      homework: { range: 'Unit 8', dueDate: '12/15', submitted: 7, total: 7, pending: [] } },
  ],
  // 중등부
  '중1': [
    { id: 'm1-math-a', name: '중1 수학A', level: 'high', studentCount: 8, subject: 'math',
      progress: { textbook: '개념원리 수학 1-1', currentPage: 72, targetPage: 150, lastDate: '12/12' },
      homework: { range: 'p.73-76', dueDate: '12/14', submitted: 8, total: 8, pending: [] } },
    { id: 'm1-math-b', name: '중1 수학B', level: 'mid', studentCount: 7, subject: 'math',
      progress: { textbook: '개념원리 수학 1-1', currentPage: 58, targetPage: 150, lastDate: '12/11' },
      homework: { range: 'p.59-62', dueDate: '12/14', submitted: 5, total: 7, pending: ['김민수', '이영희'] } },
    { id: 'm1-eng-a', name: '중1 영어A', level: 'high', studentCount: 8, subject: 'english',
      progress: { textbook: '영어 내신 1-2', currentPage: 65, targetPage: 120, lastDate: '12/12' },
      homework: { range: 'Unit 10', dueDate: '12/14', submitted: 7, total: 8, pending: ['박서진'] } },
    { id: 'm1-eng-b', name: '중1 영어B', level: 'mid', studentCount: 7, subject: 'english',
      progress: { textbook: '영어 내신 1-2', currentPage: 52, targetPage: 120, lastDate: '12/11' },
      homework: { range: 'Unit 9', dueDate: '12/14', submitted: 6, total: 7, pending: ['최유진'] } },
  ],
  '중2': [
    { id: 'm2-math-a', name: '중2 수학A', level: 'high', studentCount: 9, subject: 'math',
      progress: { textbook: '개념원리 수학 2-2', currentPage: 95, targetPage: 180, lastDate: '12/12' },
      homework: { range: 'p.96-100', dueDate: '12/15', submitted: 9, total: 9, pending: [] } },
    { id: 'm2-math-b', name: '중2 수학B', level: 'mid', studentCount: 8, subject: 'math',
      progress: { textbook: '개념원리 수학 2-2', currentPage: 78, targetPage: 180, lastDate: '12/12' },
      homework: { range: 'p.79-82', dueDate: '12/15', submitted: 6, total: 8, pending: ['박철수', '최유나'] } },
    { id: 'm2-math-c', name: '중2 수학C', level: 'low', studentCount: 7, subject: 'math',
      progress: { textbook: '베이직쎈 2-2', currentPage: 45, targetPage: 120, lastDate: '12/11' },
      homework: { range: 'p.46-48', dueDate: '12/15', submitted: 4, total: 7, pending: ['정수민', '한지원', '오세훈'] } },
    { id: 'm2-eng-a', name: '중2 영어A', level: 'high', studentCount: 8, subject: 'english',
      progress: { textbook: '영어 내신 2-2', currentPage: 78, targetPage: 130, lastDate: '12/12' },
      homework: { range: 'Unit 11', dueDate: '12/15', submitted: 8, total: 8, pending: [] } },
    { id: 'm2-eng-b', name: '중2 영어B', level: 'mid', studentCount: 8, subject: 'english',
      progress: { textbook: '영어 내신 2-2', currentPage: 62, targetPage: 130, lastDate: '12/11' },
      homework: { range: 'Unit 10', dueDate: '12/15', submitted: 6, total: 8, pending: ['강민호', '이수진'] } },
    { id: 'm2-kor-a', name: '중2 국어', level: 'mid', studentCount: 8, subject: 'korean',
      progress: { textbook: '국어 내신 2-2', currentPage: 88, targetPage: 150, lastDate: '12/12' },
      homework: { range: '7단원', dueDate: '12/15', submitted: 7, total: 8, pending: ['윤서연'] } },
  ],
  '중3': [
    { id: 'm3-math-a', name: '중3 수학A', level: 'high', studentCount: 8, subject: 'math',
      progress: { textbook: '개념원리 수학 3-2', currentPage: 110, targetPage: 200, lastDate: '12/12' },
      homework: { range: 'p.111-116', dueDate: '12/14', submitted: 7, total: 8, pending: ['박지호'] } },
    { id: 'm3-math-b', name: '중3 수학B', level: 'mid', studentCount: 7, subject: 'math',
      progress: { textbook: '개념원리 수학 3-2', currentPage: 88, targetPage: 200, lastDate: '12/12' },
      homework: { range: 'p.89-92', dueDate: '12/14', submitted: 5, total: 7, pending: ['이민지', '강현우'] } },
    { id: 'm3-math-c', name: '중3 수학C', level: 'low', studentCount: 7, subject: 'math',
      progress: { textbook: '베이직쎈 3-2', currentPage: 52, targetPage: 150, lastDate: '12/11' },
      homework: { range: 'p.53-56', dueDate: '12/14', submitted: 3, total: 7, pending: ['김태우', '송유진', '황준영', '임서연'] } },
    { id: 'm3-eng-a', name: '중3 영어A', level: 'high', studentCount: 7, subject: 'english',
      progress: { textbook: '영어 내신 3-2', currentPage: 92, targetPage: 140, lastDate: '12/12' },
      homework: { range: 'Unit 12', dueDate: '12/14', submitted: 7, total: 7, pending: [] } },
    { id: 'm3-eng-b', name: '중3 영어B', level: 'mid', studentCount: 8, subject: 'english',
      progress: { textbook: '영어 내신 3-2', currentPage: 75, targetPage: 140, lastDate: '12/11' },
      homework: { range: 'Unit 11', dueDate: '12/14', submitted: 6, total: 8, pending: ['조민수', '김하은'] } },
    { id: 'm3-kor-a', name: '중3 국어', level: 'mid', studentCount: 7, subject: 'korean',
      progress: { textbook: '국어 내신 3-2', currentPage: 95, targetPage: 160, lastDate: '12/12' },
      homework: { range: '8단원', dueDate: '12/14', submitted: 6, total: 7, pending: ['백승현'] } },
  ],
  // 고등부
  '고1': [
    { id: 'h1-math-a', name: '고1 수학A', level: 'high', studentCount: 9, subject: 'math',
      progress: { textbook: '개념원리 수학(상)', currentPage: 145, targetPage: 280, lastDate: '12/12' },
      homework: { range: 'p.146-152', dueDate: '12/16', submitted: 8, total: 9, pending: ['윤서준'] } },
    { id: 'h1-math-b', name: '고1 수학B', level: 'mid', studentCount: 7, subject: 'math',
      progress: { textbook: '개념원리 수학(상)', currentPage: 112, targetPage: 280, lastDate: '12/11' },
      homework: { range: 'p.113-118', dueDate: '12/16', submitted: 5, total: 7, pending: ['배수현', '조민기'] } },
    { id: 'h1-eng-a', name: '고1 영어A', level: 'high', studentCount: 8, subject: 'english',
      progress: { textbook: '수능영어 입문', currentPage: 88, targetPage: 160, lastDate: '12/12' },
      homework: { range: 'Unit 15', dueDate: '12/16', submitted: 8, total: 8, pending: [] } },
    { id: 'h1-eng-b', name: '고1 영어B', level: 'mid', studentCount: 8, subject: 'english',
      progress: { textbook: '수능영어 입문', currentPage: 65, targetPage: 160, lastDate: '12/11' },
      homework: { range: 'Unit 13', dueDate: '12/16', submitted: 6, total: 8, pending: ['정다은', '한소율'] } },
  ],
  '고2': [
    { id: 'h2-math-a', name: '고2 수학A', level: 'high', studentCount: 8, subject: 'math',
      progress: { textbook: '개념원리 수학 II', currentPage: 98, targetPage: 220, lastDate: '12/12' },
      homework: { range: 'p.99-106', dueDate: '12/15', submitted: 8, total: 8, pending: [] } },
    { id: 'h2-math-b', name: '고2 수학B', level: 'mid', studentCount: 6, subject: 'math',
      progress: { textbook: '개념원리 수학 II', currentPage: 75, targetPage: 220, lastDate: '12/11' },
      homework: { range: 'p.76-80', dueDate: '12/15', submitted: 4, total: 6, pending: ['김하늘', '박서윤'] } },
    { id: 'h2-eng-a', name: '고2 영어A', level: 'high', studentCount: 7, subject: 'english',
      progress: { textbook: '수능영어 완성', currentPage: 112, targetPage: 200, lastDate: '12/12' },
      homework: { range: 'Unit 18', dueDate: '12/15', submitted: 7, total: 7, pending: [] } },
    { id: 'h2-eng-b', name: '고2 영어B', level: 'mid', studentCount: 7, subject: 'english',
      progress: { textbook: '수능영어 완성', currentPage: 85, targetPage: 200, lastDate: '12/11' },
      homework: { range: 'Unit 16', dueDate: '12/15', submitted: 5, total: 7, pending: ['이준호', '송민서'] } },
  ],
  '고3': [
    { id: 'h3-math-a', name: '고3 수학A', level: 'high', studentCount: 8, subject: 'math',
      progress: { textbook: '수능완성 수학', currentPage: 156, targetPage: 240, lastDate: '12/12' },
      homework: { range: '실전모의 5회', dueDate: '12/15', submitted: 8, total: 8, pending: [] } },
    { id: 'h3-math-b', name: '고3 수학B', level: 'mid', studentCount: 7, subject: 'math',
      progress: { textbook: '수능완성 수학', currentPage: 128, targetPage: 240, lastDate: '12/11' },
      homework: { range: '실전모의 4회', dueDate: '12/15', submitted: 6, total: 7, pending: ['장서현'] } },
    { id: 'h3-eng-a', name: '고3 영어', level: 'high', studentCount: 6, subject: 'english',
      progress: { textbook: '수능완성 영어', currentPage: 142, targetPage: 220, lastDate: '12/12' },
      homework: { range: '실전모의 6회', dueDate: '12/15', submitted: 6, total: 6, pending: [] } },
  ],
};

/** KPI 계산 함수 */
export function calculateGradeKPI(grade: string): GradeKPIData {
  const classes = MOCK_CLASSES_BY_GRADE[grade] || [];
  const studentCount = classes.reduce((sum, c) => sum + c.studentCount, 0);
  const avgProgress = classes.length > 0
    ? Math.round(classes.reduce((sum, c) => sum + (c.progress.currentPage / c.progress.targetPage) * 100, 0) / classes.length)
    : 0;
  const totalHomework = classes.reduce((sum, c) => sum + c.homework.total, 0);
  const submittedHomework = classes.reduce((sum, c) => sum + c.homework.submitted, 0);
  const homeworkRate = totalHomework > 0 ? Math.round((submittedHomework / totalHomework) * 100) : 0;

  return {
    studentCount,
    averageProgressRate: avgProgress,
    homeworkSubmissionRate: homeworkRate,
    attendanceRate: 96,
    progressTrend: 3,
    homeworkTrend: -2,
    attendanceTrend: 1,
  };
}

/** 과목 필터링 적용된 학년 통계 반환 */
export function getFilteredGrades(globalSubject: Subject): GradeStatItem[] {
  return MOCK_GRADES.map((g) => {
    const gradeClasses = MOCK_CLASSES_BY_GRADE[g.grade] || [];
    const filtered = globalSubject === 'all'
      ? gradeClasses
      : gradeClasses.filter((c) => c.subject === globalSubject);

    return {
      grade: g.grade,
      classCount: filtered.length,
      studentCount: filtered.reduce((sum, c) => sum + c.studentCount, 0),
    };
  }).filter((g) => g.classCount > 0);
}
