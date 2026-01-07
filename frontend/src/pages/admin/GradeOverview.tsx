/**
 * Phase 9-E/F: GradeOverview (v2)
 *
 * 학년별 현황 페이지
 * - 2단계 학년 탭: 초등부/중등부/고등부 + 학년
 * - 전역 과목 필터 적용
 * - KPI 요약
 * - 진도 비교 테이블
 * - 숙제 현황 테이블
 *
 * 반응형:
 * - < 768px: 컴팩트 드롭다운 탭
 * - >= 768px: 전체 탭
 *
 * Supabase 연동: 2024-12-14
 */
import { useState, useEffect } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  GradeTabsV2,
  GradeTabsV2Compact,
  getDivisionFromGrade,
  GradeSummaryKPI,
  ProgressCompareTable,
  HomeworkStatusTable,
  ClassDetailModal,
} from '../../components/admin/gradeOverview';
import { useGradeStats, useGradeClasses, useGradeKPI } from '../../hooks/useAdminData';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useSubjectStore, Subject, SUBJECT_LABELS } from '../../stores/subjectStore';

// ============================================
// Supabase 연동 상태 표시
// ============================================
const SupabaseStatus = () => (
  <div className={`text-xs px-2 py-1 rounded ${
    isSupabaseConfigured
      ? 'bg-green-100 text-green-700'
      : 'bg-yellow-100 text-yellow-700'
  }`}>
    {isSupabaseConfigured ? '🟢 Supabase 연결됨' : '🟡 Mock 데이터'}
  </div>
);

// ============================================
// Mock Data (Fallback)
// ============================================

// 학년별 전체 반 수 (과목 필터링 전)
const MOCK_GRADES = [
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

const MOCK_CLASSES_BY_GRADE: Record<string, {
  id: string;
  name: string;
  level: 'high' | 'mid' | 'low';
  studentCount: number;
  subject: Subject; // 과목 추가
  progress: {
    textbook: string;
    currentPage: number;
    targetPage: number;
    lastDate: string;
  };
  homework: {
    range: string;
    dueDate: string;
    submitted: number;
    total: number;
    pending: string[];
  };
}[]> = {
  // ============================================
  // 초등부
  // ============================================
  '초3': [
    {
      id: 'e3-math-a',
      name: '초3 수학A',
      level: 'high',
      studentCount: 6,
      subject: 'math',
      progress: { textbook: '기탄수학 G단계', currentPage: 45, targetPage: 80, lastDate: '12/12' },
      homework: { range: 'p.46-48', dueDate: '12/14', submitted: 6, total: 6, pending: [] },
    },
    {
      id: 'e3-math-b',
      name: '초3 수학B',
      level: 'mid',
      studentCount: 6,
      subject: 'math',
      progress: { textbook: '기탄수학 F단계', currentPage: 52, targetPage: 80, lastDate: '12/11' },
      homework: { range: 'p.53-55', dueDate: '12/14', submitted: 5, total: 6, pending: ['김민재'] },
    },
  ],
  '초4': [
    {
      id: 'e4-math-a',
      name: '초4 수학A',
      level: 'high',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '기탄수학 H단계', currentPage: 38, targetPage: 80, lastDate: '12/12' },
      homework: { range: 'p.39-42', dueDate: '12/15', submitted: 7, total: 7, pending: [] },
    },
    {
      id: 'e4-math-b',
      name: '초4 수학B',
      level: 'mid',
      studentCount: 6,
      subject: 'math',
      progress: { textbook: '기탄수학 G단계', currentPage: 62, targetPage: 80, lastDate: '12/11' },
      homework: { range: 'p.63-66', dueDate: '12/15', submitted: 5, total: 6, pending: ['이서준'] },
    },
    {
      id: 'e4-eng-a',
      name: '초4 영어',
      level: 'mid',
      studentCount: 5,
      subject: 'english',
      progress: { textbook: 'English Bus 4', currentPage: 28, targetPage: 60, lastDate: '12/12' },
      homework: { range: 'Unit 5', dueDate: '12/15', submitted: 4, total: 5, pending: ['박하윤'] },
    },
  ],
  '초5': [
    {
      id: 'e5-math-a',
      name: '초5 수학A',
      level: 'high',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '쎈 초등수학 5-2', currentPage: 95, targetPage: 150, lastDate: '12/12' },
      homework: { range: 'p.96-100', dueDate: '12/14', submitted: 7, total: 8, pending: ['최예은'] },
    },
    {
      id: 'e5-math-b',
      name: '초5 수학B',
      level: 'mid',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '쎈 초등수학 5-2', currentPage: 78, targetPage: 150, lastDate: '12/11' },
      homework: { range: 'p.79-82', dueDate: '12/14', submitted: 6, total: 7, pending: ['정우진'] },
    },
    {
      id: 'e5-eng-a',
      name: '초5 영어',
      level: 'mid',
      studentCount: 5,
      subject: 'english',
      progress: { textbook: 'English Bus 5', currentPage: 32, targetPage: 60, lastDate: '12/12' },
      homework: { range: 'Unit 6', dueDate: '12/14', submitted: 5, total: 5, pending: [] },
    },
  ],
  '초6': [
    {
      id: 'e6-math-a',
      name: '초6 수학A',
      level: 'high',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '쎈 초등수학 6-2', currentPage: 112, targetPage: 160, lastDate: '12/12' },
      homework: { range: 'p.113-118', dueDate: '12/15', submitted: 8, total: 8, pending: [] },
    },
    {
      id: 'e6-math-b',
      name: '초6 수학B',
      level: 'mid',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '쎈 초등수학 6-2', currentPage: 88, targetPage: 160, lastDate: '12/11' },
      homework: { range: 'p.89-94', dueDate: '12/15', submitted: 5, total: 7, pending: ['강지훈', '윤서아'] },
    },
    {
      id: 'e6-math-c',
      name: '초6 수학C',
      level: 'low',
      studentCount: 6,
      subject: 'math',
      progress: { textbook: '개념클릭 6-2', currentPage: 45, targetPage: 100, lastDate: '12/10' },
      homework: { range: 'p.46-50', dueDate: '12/15', submitted: 4, total: 6, pending: ['임태현', '송유나'] },
    },
    {
      id: 'e6-eng-a',
      name: '초6 영어',
      level: 'high',
      studentCount: 7,
      subject: 'english',
      progress: { textbook: 'English Bus 6', currentPage: 42, targetPage: 60, lastDate: '12/12' },
      homework: { range: 'Unit 8', dueDate: '12/15', submitted: 7, total: 7, pending: [] },
    },
  ],
  // ============================================
  // 중등부
  // ============================================
  '중1': [
    {
      id: 'm1-math-a',
      name: '중1 수학A',
      level: 'high',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '개념원리 수학 1-1', currentPage: 72, targetPage: 150, lastDate: '12/12' },
      homework: { range: 'p.73-76', dueDate: '12/14', submitted: 8, total: 8, pending: [] },
    },
    {
      id: 'm1-math-b',
      name: '중1 수학B',
      level: 'mid',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '개념원리 수학 1-1', currentPage: 58, targetPage: 150, lastDate: '12/11' },
      homework: { range: 'p.59-62', dueDate: '12/14', submitted: 5, total: 7, pending: ['김민수', '이영희'] },
    },
    {
      id: 'm1-eng-a',
      name: '중1 영어A',
      level: 'high',
      studentCount: 8,
      subject: 'english',
      progress: { textbook: '영어 내신 1-2', currentPage: 65, targetPage: 120, lastDate: '12/12' },
      homework: { range: 'Unit 10', dueDate: '12/14', submitted: 7, total: 8, pending: ['박서진'] },
    },
    {
      id: 'm1-eng-b',
      name: '중1 영어B',
      level: 'mid',
      studentCount: 7,
      subject: 'english',
      progress: { textbook: '영어 내신 1-2', currentPage: 52, targetPage: 120, lastDate: '12/11' },
      homework: { range: 'Unit 9', dueDate: '12/14', submitted: 6, total: 7, pending: ['최유진'] },
    },
  ],
  '중2': [
    {
      id: 'm2-math-a',
      name: '중2 수학A',
      level: 'high',
      studentCount: 9,
      subject: 'math',
      progress: { textbook: '개념원리 수학 2-2', currentPage: 95, targetPage: 180, lastDate: '12/12' },
      homework: { range: 'p.96-100', dueDate: '12/15', submitted: 9, total: 9, pending: [] },
    },
    {
      id: 'm2-math-b',
      name: '중2 수학B',
      level: 'mid',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '개념원리 수학 2-2', currentPage: 78, targetPage: 180, lastDate: '12/12' },
      homework: { range: 'p.79-82', dueDate: '12/15', submitted: 6, total: 8, pending: ['박철수', '최유나'] },
    },
    {
      id: 'm2-math-c',
      name: '중2 수학C',
      level: 'low',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '베이직쎈 2-2', currentPage: 45, targetPage: 120, lastDate: '12/11' },
      homework: { range: 'p.46-48', dueDate: '12/15', submitted: 4, total: 7, pending: ['정수민', '한지원', '오세훈'] },
    },
    {
      id: 'm2-eng-a',
      name: '중2 영어A',
      level: 'high',
      studentCount: 8,
      subject: 'english',
      progress: { textbook: '영어 내신 2-2', currentPage: 78, targetPage: 130, lastDate: '12/12' },
      homework: { range: 'Unit 11', dueDate: '12/15', submitted: 8, total: 8, pending: [] },
    },
    {
      id: 'm2-eng-b',
      name: '중2 영어B',
      level: 'mid',
      studentCount: 8,
      subject: 'english',
      progress: { textbook: '영어 내신 2-2', currentPage: 62, targetPage: 130, lastDate: '12/11' },
      homework: { range: 'Unit 10', dueDate: '12/15', submitted: 6, total: 8, pending: ['강민호', '이수진'] },
    },
    {
      id: 'm2-kor-a',
      name: '중2 국어',
      level: 'mid',
      studentCount: 8,
      subject: 'korean',
      progress: { textbook: '국어 내신 2-2', currentPage: 88, targetPage: 150, lastDate: '12/12' },
      homework: { range: '7단원', dueDate: '12/15', submitted: 7, total: 8, pending: ['윤서연'] },
    },
  ],
  '중3': [
    {
      id: 'm3-math-a',
      name: '중3 수학A',
      level: 'high',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '개념원리 수학 3-2', currentPage: 110, targetPage: 200, lastDate: '12/12' },
      homework: { range: 'p.111-116', dueDate: '12/14', submitted: 7, total: 8, pending: ['박지호'] },
    },
    {
      id: 'm3-math-b',
      name: '중3 수학B',
      level: 'mid',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '개념원리 수학 3-2', currentPage: 88, targetPage: 200, lastDate: '12/12' },
      homework: { range: 'p.89-92', dueDate: '12/14', submitted: 5, total: 7, pending: ['이민지', '강현우'] },
    },
    {
      id: 'm3-math-c',
      name: '중3 수학C',
      level: 'low',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '베이직쎈 3-2', currentPage: 52, targetPage: 150, lastDate: '12/11' },
      homework: { range: 'p.53-56', dueDate: '12/14', submitted: 3, total: 7, pending: ['김태우', '송유진', '황준영', '임서연'] },
    },
    {
      id: 'm3-eng-a',
      name: '중3 영어A',
      level: 'high',
      studentCount: 7,
      subject: 'english',
      progress: { textbook: '영어 내신 3-2', currentPage: 92, targetPage: 140, lastDate: '12/12' },
      homework: { range: 'Unit 12', dueDate: '12/14', submitted: 7, total: 7, pending: [] },
    },
    {
      id: 'm3-eng-b',
      name: '중3 영어B',
      level: 'mid',
      studentCount: 8,
      subject: 'english',
      progress: { textbook: '영어 내신 3-2', currentPage: 75, targetPage: 140, lastDate: '12/11' },
      homework: { range: 'Unit 11', dueDate: '12/14', submitted: 6, total: 8, pending: ['조민수', '김하은'] },
    },
    {
      id: 'm3-kor-a',
      name: '중3 국어',
      level: 'mid',
      studentCount: 7,
      subject: 'korean',
      progress: { textbook: '국어 내신 3-2', currentPage: 95, targetPage: 160, lastDate: '12/12' },
      homework: { range: '8단원', dueDate: '12/14', submitted: 6, total: 7, pending: ['백승현'] },
    },
  ],
  // ============================================
  // 고등부
  // ============================================
  '고1': [
    {
      id: 'h1-math-a',
      name: '고1 수학A',
      level: 'high',
      studentCount: 9,
      subject: 'math',
      progress: { textbook: '개념원리 수학(상)', currentPage: 145, targetPage: 280, lastDate: '12/12' },
      homework: { range: 'p.146-152', dueDate: '12/16', submitted: 8, total: 9, pending: ['윤서준'] },
    },
    {
      id: 'h1-math-b',
      name: '고1 수학B',
      level: 'mid',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '개념원리 수학(상)', currentPage: 112, targetPage: 280, lastDate: '12/11' },
      homework: { range: 'p.113-118', dueDate: '12/16', submitted: 5, total: 7, pending: ['배수현', '조민기'] },
    },
    {
      id: 'h1-eng-a',
      name: '고1 영어A',
      level: 'high',
      studentCount: 8,
      subject: 'english',
      progress: { textbook: '수능영어 입문', currentPage: 88, targetPage: 160, lastDate: '12/12' },
      homework: { range: 'Unit 15', dueDate: '12/16', submitted: 8, total: 8, pending: [] },
    },
    {
      id: 'h1-eng-b',
      name: '고1 영어B',
      level: 'mid',
      studentCount: 8,
      subject: 'english',
      progress: { textbook: '수능영어 입문', currentPage: 65, targetPage: 160, lastDate: '12/11' },
      homework: { range: 'Unit 13', dueDate: '12/16', submitted: 6, total: 8, pending: ['정다은', '한소율'] },
    },
  ],
  '고2': [
    {
      id: 'h2-math-a',
      name: '고2 수학A',
      level: 'high',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '개념원리 수학 II', currentPage: 98, targetPage: 220, lastDate: '12/12' },
      homework: { range: 'p.99-106', dueDate: '12/15', submitted: 8, total: 8, pending: [] },
    },
    {
      id: 'h2-math-b',
      name: '고2 수학B',
      level: 'mid',
      studentCount: 6,
      subject: 'math',
      progress: { textbook: '개념원리 수학 II', currentPage: 75, targetPage: 220, lastDate: '12/11' },
      homework: { range: 'p.76-80', dueDate: '12/15', submitted: 4, total: 6, pending: ['김하늘', '박서윤'] },
    },
    {
      id: 'h2-eng-a',
      name: '고2 영어A',
      level: 'high',
      studentCount: 7,
      subject: 'english',
      progress: { textbook: '수능영어 완성', currentPage: 112, targetPage: 200, lastDate: '12/12' },
      homework: { range: 'Unit 18', dueDate: '12/15', submitted: 7, total: 7, pending: [] },
    },
    {
      id: 'h2-eng-b',
      name: '고2 영어B',
      level: 'mid',
      studentCount: 7,
      subject: 'english',
      progress: { textbook: '수능영어 완성', currentPage: 85, targetPage: 200, lastDate: '12/11' },
      homework: { range: 'Unit 16', dueDate: '12/15', submitted: 5, total: 7, pending: ['이준호', '송민서'] },
    },
  ],
  '고3': [
    {
      id: 'h3-math-a',
      name: '고3 수학A',
      level: 'high',
      studentCount: 8,
      subject: 'math',
      progress: { textbook: '수능완성 수학', currentPage: 156, targetPage: 240, lastDate: '12/12' },
      homework: { range: '실전모의 5회', dueDate: '12/15', submitted: 8, total: 8, pending: [] },
    },
    {
      id: 'h3-math-b',
      name: '고3 수학B',
      level: 'mid',
      studentCount: 7,
      subject: 'math',
      progress: { textbook: '수능완성 수학', currentPage: 128, targetPage: 240, lastDate: '12/11' },
      homework: { range: '실전모의 4회', dueDate: '12/15', submitted: 6, total: 7, pending: ['장서현'] },
    },
    {
      id: 'h3-eng-a',
      name: '고3 영어',
      level: 'high',
      studentCount: 6,
      subject: 'english',
      progress: { textbook: '수능완성 영어', currentPage: 142, targetPage: 220, lastDate: '12/12' },
      homework: { range: '실전모의 6회', dueDate: '12/15', submitted: 6, total: 6, pending: [] },
    },
  ],
};

// KPI 계산 함수
function calculateGradeKPI(grade: string) {
  const classes = MOCK_CLASSES_BY_GRADE[grade] || [];

  const studentCount = classes.reduce((sum, c) => sum + c.studentCount, 0);

  const avgProgress = classes.length > 0
    ? Math.round(
        classes.reduce((sum, c) =>
          sum + (c.progress.currentPage / c.progress.targetPage) * 100, 0
        ) / classes.length
      )
    : 0;

  const totalHomework = classes.reduce((sum, c) => sum + c.homework.total, 0);
  const submittedHomework = classes.reduce((sum, c) => sum + c.homework.submitted, 0);
  const homeworkRate = totalHomework > 0
    ? Math.round((submittedHomework / totalHomework) * 100)
    : 0;

  return {
    studentCount,
    averageProgressRate: avgProgress,
    homeworkSubmissionRate: homeworkRate,
    attendanceRate: 96, // Mock
    progressTrend: 3,   // Mock: +3%
    homeworkTrend: -2,  // Mock: -2%
    attendanceTrend: 1, // Mock: +1%
  };
}

// 선생님 이름 매핑 (Mock)
const TEACHER_MAP: Record<string, string> = {
  // 초등부 수학
  'e3-math-a': '최초등', 'e3-math-b': '최초등',
  'e4-math-a': '최초등', 'e4-math-b': '최초등',
  'e5-math-a': '정기초', 'e5-math-b': '정기초',
  'e6-math-a': '정기초', 'e6-math-b': '정기초', 'e6-math-c': '정기초',
  // 초등부 영어
  'e4-eng-a': '이영어',
  'e5-eng-a': '이영어',
  'e6-eng-a': '이영어',
  // 중등부 수학
  'm1-math-a': '김수학', 'm1-math-b': '이대수',
  'm2-math-a': '김수학', 'm2-math-b': '이대수', 'm2-math-c': '박미분',
  'm3-math-a': '김수학', 'm3-math-b': '이대수', 'm3-math-c': '박미분',
  // 중등부 영어
  'm1-eng-a': '박영어', 'm1-eng-b': '박영어',
  'm2-eng-a': '박영어', 'm2-eng-b': '박영어',
  'm3-eng-a': '박영어', 'm3-eng-b': '박영어',
  // 중등부 국어
  'm2-kor-a': '최국어',
  'm3-kor-a': '최국어',
  // 고등부 수학
  'h1-math-a': '김수학', 'h1-math-b': '이대수',
  'h2-math-a': '김수학', 'h2-math-b': '이대수',
  'h3-math-a': '김수학', 'h3-math-b': '김수학',
  // 고등부 영어
  'h1-eng-a': '한영어', 'h1-eng-b': '한영어',
  'h2-eng-a': '한영어', 'h2-eng-b': '한영어',
  'h3-eng-a': '한영어',
};

// 레벨 필터 타입
type LevelFilter = 'all' | 'high' | 'mid' | 'low';

const LEVEL_LABELS: Record<LevelFilter, string> = {
  all: '전체',
  high: '상',
  mid: '중',
  low: '기초',
};

export default function GradeOverview() {
  const [activeGrade, setActiveGrade] = useState('중3');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const [selectedClass, setSelectedClass] = useState<{
    id: string;
    name: string;
    teacher: string;
    studentCount: number;
    grade: string;
    // 추가 데이터
    textbook?: string;
    currentPage?: number;
    targetPage?: number;
    lastDate?: string;
    homework?: {
      range: string;
      dueDate: string;
      submitted: number;
      total: number;
      pending: string[];
    };
  } | null>(null);

  // 전역 과목 필터
  const { subject: globalSubject } = useSubjectStore();

  // ============================================
  // Supabase 데이터 조회
  // ============================================
  const { data: gradeStats, isLoading: statsLoading } = useGradeStats();
  const { data: gradeClasses, isLoading: classesLoading } = useGradeClasses(activeGrade);
  const kpiData = useGradeKPI(activeGrade);

  // ============================================
  // Mock Fallback 패턴 + 과목 필터링
  // ============================================
  // 빈 배열도 falsy로 처리하여 Mock 데이터로 대체
  const rawClasses = (gradeClasses && gradeClasses.length > 0)
    ? gradeClasses
    : MOCK_CLASSES_BY_GRADE[activeGrade] || [];

  // 과목 필터 적용 (Supabase 타입에는 subject가 없을 수 있음)
  const subjectFilteredClasses = globalSubject === 'all'
    ? rawClasses
    : rawClasses.filter((c) => {
        const classWithSubject = c as typeof c & { subject?: Subject };
        return classWithSubject.subject === globalSubject;
      });

  // 레벨 필터 적용
  const classes = levelFilter === 'all'
    ? subjectFilteredClasses
    : subjectFilteredClasses.filter((c) => c.level === levelFilter);

  // 학년별 통계 (과목 필터 적용) - 항상 Mock 데이터 사용 (초등부 포함)
  const filteredGrades = MOCK_GRADES.map((g) => {
    const gradeClasses = MOCK_CLASSES_BY_GRADE[g.grade] || [];
    const filtered = globalSubject === 'all'
      ? gradeClasses
      : gradeClasses.filter((c) => c.subject === globalSubject);

    return {
      grade: g.grade,
      classCount: filtered.length,
      studentCount: filtered.reduce((sum, c) => sum + c.studentCount, 0),
    };
  }).filter((g) => g.classCount > 0); // 반이 있는 학년만

  // Supabase 데이터 우선, Mock 데이터 fallback
  // - 과목 필터가 'all'이고 Supabase 데이터가 있으면 Supabase 사용
  // - 과목 필터가 적용되면 Mock 데이터 사용 (Supabase에는 subject 필드 없음)
  const grades = (globalSubject === 'all' && gradeStats && gradeStats.length > 0)
    ? gradeStats
    : filteredGrades;
  const kpi = kpiData || calculateGradeKPI(activeGrade);

  const isLoading = statsLoading || classesLoading;

  // 과목 필터 변경 시 유효한 학년으로 자동 이동
  useEffect(() => {
    const currentGradeValid = grades.some((g) => g.grade === activeGrade);
    if (!currentGradeValid && grades.length > 0) {
      setActiveGrade(grades[0].grade);
    }
  }, [globalSubject, grades, activeGrade]);

  // 진도 테이블 데이터
  const progressData = classes.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    studentCount: c.studentCount,
    textbook: c.progress.textbook,
    currentPage: c.progress.currentPage,
    targetPage: c.progress.targetPage,
    lastDate: c.progress.lastDate,
  }));

  // 숙제 테이블 데이터
  const homeworkData = classes.map((c) => ({
    id: c.id,
    className: c.name,
    level: c.level,
    homework: c.homework,
  }));

  const handleClassClick = (classId: string) => {
    const classInfo = classes.find((c) => c.id === classId);
    if (classInfo) {
      // Supabase 데이터에는 teacher가 있고, Mock 데이터는 TEACHER_MAP 사용
      const teacherName: string = 'teacher' in classInfo && typeof classInfo.teacher === 'string'
        ? classInfo.teacher
        : TEACHER_MAP[classId] || '담당 선생님';

      setSelectedClass({
        id: classId,
        name: classInfo.name,
        teacher: teacherName,
        studentCount: classInfo.studentCount,
        grade: activeGrade,
        // 진도 데이터 추가
        textbook: classInfo.progress.textbook,
        currentPage: classInfo.progress.currentPage,
        targetPage: classInfo.progress.targetPage,
        lastDate: classInfo.progress.lastDate,
        // 숙제 데이터 추가
        homework: classInfo.homework,
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedClass(null);
  };

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        {/* 페이지 헤더 + 학년 탭 (오른쪽 상단) */}
        <PageHeader
          title="학년별 현황"
          description={`${SUBJECT_LABELS[globalSubject]} 반의 진도와 숙제 현황을 비교합니다`}
          actions={
            <div className="flex items-center gap-2 md:gap-4">
              <SupabaseStatus />
              {/* 반응형 탭: 모바일=드롭다운, PC=전체 탭 */}
              {isMobile ? (
                <GradeTabsV2Compact
                  grades={grades}
                  activeGrade={activeGrade}
                  onGradeChange={setActiveGrade}
                />
              ) : (
                <GradeTabsV2
                  grades={grades}
                  activeGrade={activeGrade}
                  onGradeChange={setActiveGrade}
                />
              )}
            </div>
          }
        />

        {/* KPI 요약 */}
        <GradeSummaryKPI
          grade={activeGrade}
          studentCount={kpi.studentCount}
          averageProgressRate={kpi.averageProgressRate}
          homeworkSubmissionRate={kpi.homeworkSubmissionRate}
          attendanceRate={kpi.attendanceRate}
          progressTrend={kpi.progressTrend}
          homeworkTrend={kpi.homeworkTrend}
          attendanceTrend={kpi.attendanceTrend}
        />

        {/* 레벨 필터 + 반 수 표시 - 반응형 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs sm:text-sm text-grey-600 mr-1 sm:mr-2 whitespace-nowrap">반 레벨:</span>
            {(['all', 'high', 'mid', 'low'] as LevelFilter[]).map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`
                  px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0
                  ${levelFilter === level
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                  }
                `}
              >
                {LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
          <div className="text-xs sm:text-sm text-grey-500 whitespace-nowrap">
            {classes.length}개 반 {levelFilter !== 'all' && `(${LEVEL_LABELS[levelFilter]} 레벨)`}
          </div>
        </div>

        {/* 진도 비교 테이블 */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            데이터 로딩 중...
          </div>
        ) : (
          <ProgressCompareTable
            classes={progressData}
            onClassClick={handleClassClick}
          />
        )}

        {/* 숙제 현황 테이블 */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            데이터 로딩 중...
          </div>
        ) : (
          <HomeworkStatusTable
            classes={homeworkData}
            onClassClick={handleClassClick}
          />
        )}
      </div>

      {/* 반별 상세 모달 */}
      {selectedClass && (
        <ClassDetailModal
          isOpen={!!selectedClass}
          onClose={handleCloseModal}
          classInfo={selectedClass}
        />
      )}
    </AdminLayoutV5>
  );
}
