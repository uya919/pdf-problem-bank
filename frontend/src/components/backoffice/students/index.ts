/**
 * 학생 관련 타입 및 컴포넌트
 */

// ============ 타입 정의 ============

export interface Student {
  id: string;
  name: string;
  grade: string;      // "중1", "중2", "중3"
  classId: string;
  className: string;  // "중3A반"
  schedule?: string;  // "월/수/금 17:00"
  phone?: string;
  parentPhone?: string;
}

export interface StudentStats {
  attendanceRate: number;    // 출석률 (0-100)
  homeworkRate: number;      // 숙제 제출률 (0-100)
  averageScore: number;      // 평균 점수
  recentScore: number;       // 최근 시험 점수
  scoreTrend: number;        // 점수 변화 (+5, -15 등)
  absenceCount: number;      // 이번 달 결석 횟수
}

export interface StudentAlert {
  type: 'absence' | 'score_drop' | 'homework' | 'behavior';
  severity: 'warning' | 'critical';
  message: string;
}

export interface ScoreRecord {
  date: string;
  score: number;
  testType?: 'daily' | 'weekly' | 'monthly';
  range?: string;
}

export interface ActivityRecord {
  id: string;
  date: string;
  type: 'attendance' | 'absence' | 'homework' | 'test' | 'note';
  status?: 'present' | 'absent' | 'late' | 'excused' | 'submitted' | 'not_submitted' | 'missing';
  detail?: string;
  score?: number;
  scoreDiff?: number;
}

export interface StudentNote {
  id: string;
  date: string;
  content: string;
}

// ============ 유틸리티 함수 ============

/**
 * 학생의 알림 목록을 계산
 */
export function getStudentAlerts(stats: StudentStats): StudentAlert[] {
  const alerts: StudentAlert[] = [];

  // 결석 2회 이상 → critical
  if (stats.absenceCount >= 2) {
    alerts.push({
      type: 'absence',
      severity: 'critical',
      message: `결석 ${stats.absenceCount}회`
    });
  }

  // 성적 10점 이상 하락 → critical
  if (stats.scoreTrend <= -10) {
    alerts.push({
      type: 'score_drop',
      severity: 'critical',
      message: `성적 ↓${Math.abs(stats.scoreTrend)}점`
    });
  }

  // 숙제 미제출률 50% 이상 → warning
  if (stats.homeworkRate < 50) {
    alerts.push({
      type: 'homework',
      severity: 'warning',
      message: '숙제 미제출'
    });
  }

  // 결석 1회 → warning (2회 이상이 아닐 때만)
  if (stats.absenceCount === 1) {
    alerts.push({
      type: 'absence',
      severity: 'warning',
      message: '결석 1회'
    });
  }

  return alerts;
}

/**
 * 아바타 색상 계산
 */
export function getAvatarColors(alerts: StudentAlert[]): { bg: string; text: string } {
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasWarning = alerts.some(a => a.severity === 'warning');

  if (hasCritical) return { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]' };
  if (hasWarning) return { bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]' };
  return { bg: 'bg-[#E8F4FF]', text: 'text-[#3182F6]' };
}

/**
 * 카드 경계선 색상 계산
 */
export function getBorderStyle(alerts: StudentAlert[]): string {
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasWarning = alerts.some(a => a.severity === 'warning');

  if (hasCritical) return 'border-l-4 border-[#EF4444]';
  if (hasWarning) return 'border-l-4 border-[#F59E0B]';
  return '';
}

/**
 * 점수에 따른 텍스트 색상
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-[#3182F6]';
  if (score >= 70) return 'text-[#F59E0B]';
  return 'text-[#EF4444]';
}

// ============ 컴포넌트 export ============

export { StudentCard } from './StudentCard';
export { StudentProfileCard } from './StudentProfileCard';
export { StudentStatsCard } from './StudentStatsCard';
export { ScoreChart } from './ScoreChart';
export { ActivityTimeline } from './ActivityTimeline';
export { StudentNotes } from './StudentNotes';
