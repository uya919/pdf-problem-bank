/**
 * Admin 훅 공통 타입 정의
 *
 * useAdminData.ts에서 분리된 타입들
 * - Supabase 쿼리 결과 타입
 * - Export 타입 (TodayClass, GradeStats 등)
 */

// =====================================================
// Supabase 쿼리 결과 타입 (새 스키마 기준)
// =====================================================

export interface ClassRow {
  id: string;
  name: string;
  subject: string | null;
  level: string | null;
  start_time: string | null;
  end_time: string | null;
  // Stage 34: 요일별 수업 시간
  start_times: string[] | null;
  end_times: string[] | null;
  day_of_week: number[] | null;
  is_active: boolean;
  grade_id: string | null;
  teacher_id: string | null;
  teacher: { id: string; name: string } | { id: string; name: string }[] | null;
  enrollments?: { student_id: string }[];
  grade?: { id: string; name: string; division: string } | null;
}

export interface AttendanceRow {
  class_id: string;
  status: string;
}

export interface ProgressRow {
  id: string;
  class_id: string;
  date: string;
  textbook: string | null;
  start_page: number | null;
  end_page: number | null;
  topic: string | null;
  note: string | null;
}

export interface HomeworkRow {
  id: string;
  class_id: string;
  textbook: string | null;
  page_range: string | null;
  description: string | null;
  due_date: string;
  assigned_date: string;
  submissions?: { status: string; student: { name: string } | null }[];
}

// =====================================================
// 오늘 수업 관련 타입
// =====================================================

/** 오늘 수업 정보 */
export interface TodayClass {
  id: string;
  name: string;
  subject: string;
  startTime: string;
  endTime: string;
  room: string | null;
  teacher: {
    id: string;
    name: string;
  } | null;
  studentCount: number;
  status: 'upcoming' | 'current' | 'completed';
}

// =====================================================
// 학년별 데이터 타입
// =====================================================

/** 학년별 통계 */
export interface GradeStats {
  grade: string;
  classCount: number;
  studentCount: number;
}

/** 학년별 반 정보 */
export interface GradeClass {
  id: string;
  name: string;
  level: 'high' | 'mid' | 'low';
  studentCount: number;
  teacher: string;
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

// =====================================================
// KPI 타입
// =====================================================

/** Admin 대시보드 KPI */
export interface AdminKPI {
  todayClasses: number;
  pendingAttendance: number;
  pendingProgress: number;
  pendingHomework: number;
  weeklyAttendanceRate: number;
}

// =====================================================
// 반별 기록 타입
// =====================================================

/** 진도 기록 타입 */
export interface ClassProgressRecord {
  date: string;
  weekday: string;
  progress?: {
    textbook: string;
    pageStart: number;
    pageEnd: number;
    topic?: string;
  };
  homework?: {
    textbook: string;
    pageStart: number;
    pageEnd: number;
  };
}

/** 교재별 진도 타입 */
export interface TextbookProgress {
  name: string;
  currentPage: number;
  totalPage: number;
  color: string;
}

/** 반별 요약 타입 */
export interface ClassSummary {
  classCount: number;
  classDays: string;
  weeklyProgress: number;
  progressDiff: string;
  weeklyHomework: number;
  homeworkCount: number;
  submissionRate: number;
  submissionCount: string;
}

// =====================================================
// 모바일용 타입
// =====================================================

/** 반 정보 (모바일용) */
export interface MobileClassItem {
  id: string;
  name: string;
  subject: string;
  level: 'high' | 'mid' | 'low';
  teacherName: string;
  studentCount: number;
  scheduleTime: string;
  scheduleDays: string;
  schoolLevel: 'elementary' | 'middle' | 'high';
  currentProgress: string;
}

/** 학생 정보 (모바일용) */
export interface MobileStudentItem {
  id: string;
  name: string;
  grade: string;
  school: string | null;
  parentName: string | null;
  parentPhone: string | null;
  classes: string[];
  schoolLevel: 'elementary' | 'middle' | 'high';
}
