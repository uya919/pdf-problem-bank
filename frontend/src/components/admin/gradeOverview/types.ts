/**
 * GradeOverview 공통 타입 정의
 */
import type { Subject } from '../../../stores/subjectStore';

// 레벨 필터 타입
export type LevelFilter = 'all' | 'high' | 'mid' | 'low';

// 레벨 라벨
export const LEVEL_LABELS: Record<LevelFilter, string> = {
  all: '전체',
  high: '상',
  mid: '중',
  low: '기초',
};

// 학년 통계 타입
export interface GradeStatItem {
  grade: string;
  classCount: number;
  studentCount: number;
}

// 반 정보 타입 (Mock 데이터용)
export interface MockClassData {
  id: string;
  name: string;
  level: 'high' | 'mid' | 'low';
  studentCount: number;
  subject: Subject;
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
}

// KPI 데이터 타입
export interface GradeKPIData {
  studentCount: number;
  averageProgressRate: number;
  homeworkSubmissionRate: number;
  attendanceRate: number;
  progressTrend: number;
  homeworkTrend: number;
  attendanceTrend: number;
}
