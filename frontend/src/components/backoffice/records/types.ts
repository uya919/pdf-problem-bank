/**
 * RecordsPage 공통 타입 정의
 */

export type TabId = 'attendance' | 'progress' | 'homework' | 'grade' | 'report';

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface ClassInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  studentCount: number;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentColor: string;
  status: AttendanceStatus;
  note?: string;
}

export interface ClassAttendance {
  classId: string;
  className: string;
  time: string;
  records: AttendanceRecord[];
}

export interface TabProps {
  selectedClassId: string | null;
  teacherId: string | null;
}

export const TABS: { id: TabId; label: string }[] = [
  { id: 'attendance', label: '출결' },
  { id: 'progress', label: '진도' },
  { id: 'homework', label: '숙제' },
  { id: 'grade', label: '성적' },
  { id: 'report', label: '기록' },
];

/** 반 색상 배열 (순환 사용) */
export const CLASS_COLORS = ['#3182F6', '#00C896', '#FF9800', '#9C27B0', '#607D8B', '#795548'];
