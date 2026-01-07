/**
 * Backoffice 훅 공통 타입
 *
 * 모든 backoffice 훅에서 공유하는 타입, 상수, 유틸리티
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  Student,
  Class,
  ClassEnrollment,
  Attendance,
  Progress,
  Homework,
  HomeworkSubmission,
  ExamScore,
  Todo,
  Announcement,
  Profile,
  StudentWithEnrollments,
  ClassWithDetails,
  AttendanceWithStudent,
  HomeworkWithSubmissions,
  ExamScoreWithStudent,
  AttendanceStatus,
} from '@/types/database';

// Re-export for convenience
export { supabase, isSupabaseConfigured };
export type {
  Student,
  Class,
  ClassEnrollment,
  Attendance,
  Progress,
  Homework,
  HomeworkSubmission,
  ExamScore,
  Todo,
  Announcement,
  Profile,
  StudentWithEnrollments,
  ClassWithDetails,
  AttendanceWithStudent,
  HomeworkWithSubmissions,
  ExamScoreWithStudent,
  AttendanceStatus,
};

// =====================================================
// 내부 공통 타입
// =====================================================

/** 진도 현황용 반 정보 */
export interface ProgressClassInfo {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
}

/** 태블릿용 수업 스케줄 */
export interface TabletClassSchedule {
  id: string;
  name: string;
  subject: string;
  studentCount: number;
  startTime: string;
  endTime: string;
  status: 'completed' | 'current' | 'upcoming';
}

/** 태블릿용 공지사항 */
export interface TabletNotice {
  id: string;
  title: string;
  description: string;
  time?: string;
  target_class_ids?: string[] | null;
}

/** 태블릿용 출결 이슈 */
export interface TabletAttendanceIssue {
  id: string;
  className: string;
  studentName: string;
  issue: string;
}

/** 공지사항 타입 (notices 테이블) */
export interface Notice {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: string;
  priority?: number;
  is_important?: boolean;
  is_active?: boolean;
  created_at?: string;
  target_class_ids?: string[] | null;
}

/** 출결 상태 타입 (RecordsPage용) */
export type RecordAttendanceStatus = 'present' | 'late' | 'absent';

/** 학생별 출결 기록 */
export interface AttendanceRecordData {
  studentId: string;
  studentName: string;
  studentColor: string;
  status: RecordAttendanceStatus;
  note?: string;
}

/** 반별 출결 현황 (RecordsPage 호환) */
export interface ClassAttendanceData {
  classId: string;
  className: string;
  time: string;
  records: AttendanceRecordData[];
}

/** 마지막 진도 + 숙제 정보 */
export interface LastProgressWithHomework extends Progress {
  homework: string | null;
  homeworkDescription: string | null;
  start_page?: number;
  end_page?: number;
}

// =====================================================
// 공통 상수
// =====================================================

/** 학생 색상 팔레트 */
export const STUDENT_COLORS = [
  '#3182F6', '#00C896', '#FF9800', '#9C27B0',
  '#607D8B', '#795548', '#00BCD4', '#E91E63',
  '#4CAF50', '#FF5722', '#673AB7', '#009688',
];

/** 요일 한글명 */
export const DAY_NAMES_KO: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토'
};

// =====================================================
// 공통 유틸리티
// =====================================================

/**
 * 날짜 라벨 포맷팅
 * @param dateStr - YYYY-MM-DD 형식
 * @returns "M/D (요일)" 형식
 */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_NAMES_KO[d.getDay()] || '';
  return `${month}/${day} (${dow})`;
}
