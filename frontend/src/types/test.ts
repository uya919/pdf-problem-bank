/**
 * 시험(Test) 관련 타입 정의
 *
 * 대시보드 ProgressModal에서 시험 점수 입력
 * 수업 페이지(ClassesPage)에서 시험 결과 조회
 */

/** 시험 유형 */
export type TestType = 'daily' | 'weekly' | 'monthly';

/** 시험 유형 라벨 */
export const TEST_TYPE_LABELS: Record<TestType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

/** 학생 점수 */
export interface StudentScore {
  studentId: string;
  studentName: string;
  score: number | null; // null = 미입력
}

/** 시험 기록 */
export interface TestRecord {
  id: string;
  classId: string;
  className: string;
  testType: TestType;
  date: string; // "2024-12-11"
  range: string; // "이차방정식 p.40-50"
  totalScore: number; // 기본 100
  scores: StudentScore[];
  createdAt: string;
}

/** 시험 통계 */
export interface TestStats {
  count: number; // 입력된 점수 수
  total: number; // 전체 학생 수
  average: number | null;
  highest: number | null;
  lowest: number | null;
}

/**
 * 점수 배열에서 통계 계산
 */
export function calculateTestStats(scores: StudentScore[]): TestStats {
  const validScores = scores
    .filter((s) => s.score !== null)
    .map((s) => s.score as number);

  return {
    count: validScores.length,
    total: scores.length,
    average:
      validScores.length > 0
        ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
        : null,
    highest: validScores.length > 0 ? Math.max(...validScores) : null,
    lowest: validScores.length > 0 ? Math.min(...validScores) : null,
  };
}

/**
 * 점수에 따른 등급 반환
 */
export function getScoreGrade(
  score: number,
  totalScore: number = 100
): 'high' | 'mid' | 'low' {
  const percentage = (score / totalScore) * 100;
  if (percentage >= 80) return 'high';
  if (percentage >= 60) return 'mid';
  return 'low';
}
