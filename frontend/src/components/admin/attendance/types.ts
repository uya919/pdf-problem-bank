/**
 * AttendancePage 공통 타입 정의
 */
import type { AttendanceStatus } from '../../../types/database';

/** 출결 기록 */
export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string;
}

/** Mock 반 데이터 */
export interface MockClass {
  id: string;
  name: string;
  subject: string;
  teacher: { name: string };
  student_count: number;
  start_time: string;
  end_time: string;
}

/** Mock 반별 출결 데이터 */
export interface MockClassAttendance {
  classId: string;
  records: AttendanceRecord[];
}

/** 오늘 출결 통계 */
export interface TodayStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}
