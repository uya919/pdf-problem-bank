/**
 * 시험 관리 시스템 타입 정의
 * @module types/exam
 */

// ===== 기본 Enum =====
export type Subject = 'math' | 'english' | 'korean';
export type ExamType = 'level_test' | 'weekly' | 'monthly' | 'mock' | 'other';
export type ExamStatus = 'draft' | 'scoring' | 'completed';
export type CriteriaType = 'score_cut' | 'percentage' | 'count';
export type AnswerStatus = 'correct' | 'wrong' | 'none';

// ===== 시험 기본 정보 =====
export interface Exam {
  id: string;
  name: string;
  exam_date: string;           // 'YYYY-MM-DD'
  subject: Subject;
  grade: string;               // '중1', '중2', '고1' 등
  exam_type: ExamType;
  total_questions: number;     // 문항 수
  total_score: number;         // 총점 (균등배점: 100점)
  status: ExamStatus;
  created_at: string;
  // 집계 필드 (목록용)
  attended_count?: number;     // 응시 인원
  total_students?: number;     // 전체 인원
  average_score?: number;      // 평균 점수
  input_progress?: number;     // 입력 진행률 (0-100)
  // 반배정 결과
  class_assignments?: {
    className: string;
    count: number;
  }[];
}

// ===== 학생 답안 (O/X만) =====
export interface StudentAnswer {
  student_id: string;
  student_name: string;
  answers: AnswerStatus[];     // 문항별 정오 (index = 문항번호-1)
  total_score: number;         // 총점
  wrong_questions: number[];   // 오답 문항 번호 목록
  is_completed: boolean;       // 입력 완료 여부
}

// ===== 시험 결과 (순위 포함) =====
export interface ExamResult {
  student_id: string;
  student_name: string;
  total_score: number;
  rank: number;
  wrong_questions: number[];
  assigned_class?: string;     // 'A', 'B', 'C', 'D'
}

// ===== 반배정 기준 =====
export interface ClassCriteria {
  class_count: 3 | 4;
  criteria_type: CriteriaType;
  classes: ClassCriteriaItem[];
}

export interface ClassCriteriaItem {
  class_name: string;          // 'A', 'B', 'C', 'D'
  class_label: string;         // '심화', '정규', '기초', '보충'
  color: string;               // 'blue', 'mint', 'yellow', 'grey'
  min_score?: number;          // score_cut용
  max_score?: number;
  top_percent?: number;        // percentage용
  bottom_percent?: number;
  count?: number;              // count용
}

// ===== 시험 상세 (관계 포함) =====
export interface ExamDetail {
  exam: Exam;
  answers: StudentAnswer[];
  results: ExamResult[];
  criteria?: ClassCriteria;
}

// ===== 생성 입력 =====
export interface CreateExamInput {
  name: string;
  exam_date: string;
  subject: Subject;
  grade: string;
  exam_type: ExamType;
  total_questions: number;
}

// ===== 필터 =====
export interface ExamFilters {
  subject?: Subject;
  grade?: string;
  month?: string;              // 'YYYY-MM'
  search?: string;
}

// ===== 상수 =====
export const SUBJECT_LABELS: Record<Subject, string> = {
  math: '수학',
  english: '영어',
  korean: '국어',
};

export const SUBJECT_COLORS: Record<Subject, { bg: string; text: string; dot: string }> = {
  math: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  english: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  korean: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  level_test: '레벨테스트',
  weekly: '주간 테스트',
  monthly: '월말 평가',
  mock: '모의고사',
  other: '기타',
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, { label: string; bgColor: string; textColor: string }> = {
  draft: { label: '준비 중', bgColor: 'bg-grey-100', textColor: 'text-grey-600' },
  scoring: { label: '입력 중', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
  completed: { label: '채점 완료', bgColor: 'bg-green-100', textColor: 'text-green-700' },
};

export const GRADE_OPTIONS = [
  '초4', '초5', '초6',
  '중1', '중2', '중3',
  '고1', '고2', '고3',
];

export const DEFAULT_CLASS_CRITERIA: ClassCriteria = {
  class_count: 4,
  criteria_type: 'percentage',
  classes: [
    { class_name: 'A', class_label: '심화', color: 'blue', top_percent: 25 },
    { class_name: 'B', class_label: '정규', color: 'mint', top_percent: 50, bottom_percent: 25 },
    { class_name: 'C', class_label: '기초', color: 'yellow', top_percent: 75, bottom_percent: 50 },
    { class_name: 'D', class_label: '보충', color: 'grey', bottom_percent: 75 },
  ],
};

export const CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  B: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200' },
  C: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  D: { bg: 'bg-grey-50', text: 'text-grey-600', border: 'border-grey-200' },
};
