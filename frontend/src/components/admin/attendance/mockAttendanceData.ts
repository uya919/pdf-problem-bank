/**
 * AttendancePage Mock 데이터
 */
import type { MockClass, MockClassAttendance } from './types';

/** Mock 반 목록 */
export const MOCK_CLASSES: MockClass[] = [
  { id: 'c1', name: '초3 수학A', subject: '수학', teacher: { name: '박산술' }, student_count: 6, start_time: '15:00', end_time: '16:30' },
  { id: 'c2', name: '초4 수학A', subject: '수학', teacher: { name: '박산술' }, student_count: 7, start_time: '16:30', end_time: '18:00' },
  { id: 'c3', name: '중1 수학A', subject: '수학', teacher: { name: '김수학' }, student_count: 8, start_time: '18:00', end_time: '19:30' },
  { id: 'c4', name: '중2 수학A', subject: '수학', teacher: { name: '김수학' }, student_count: 8, start_time: '19:30', end_time: '21:00' },
  { id: 'c5', name: '중3 수학A', subject: '수학', teacher: { name: '김수학' }, student_count: 8, start_time: '18:00', end_time: '19:30' },
  { id: 'c6', name: '고1 수학A', subject: '수학', teacher: { name: '이대수' }, student_count: 7, start_time: '19:30', end_time: '21:00' },
  { id: 'c7', name: '중1 영어A', subject: '영어', teacher: { name: '한영어' }, student_count: 6, start_time: '15:00', end_time: '16:30' },
  { id: 'c8', name: '중2 영어A', subject: '영어', teacher: { name: '한영어' }, student_count: 7, start_time: '16:30', end_time: '18:00' },
];

/** Mock 출결 데이터 */
export const MOCK_ATTENDANCE_DATA: MockClassAttendance[] = [
  {
    classId: 'c1',
    records: [
      { studentId: 's1', studentName: '김민준', status: 'present' },
      { studentId: 's2', studentName: '이서윤', status: 'present' },
      { studentId: 's3', studentName: '박지훈', status: 'present' },
      { studentId: 's4', studentName: '최수아', status: 'late' },
      { studentId: 's5', studentName: '정하은', status: 'present' },
      { studentId: 's6', studentName: '강현우', status: 'present' },
    ],
  },
  {
    classId: 'c2',
    records: [
      { studentId: 's7', studentName: '윤지민', status: 'present' },
      { studentId: 's8', studentName: '임서준', status: 'present' },
      { studentId: 's9', studentName: '한예은', status: 'absent' },
      { studentId: 's10', studentName: '송민서', status: 'present' },
      { studentId: 's11', studentName: '장도윤', status: 'present' },
      { studentId: 's12', studentName: '오채원', status: 'present' },
      { studentId: 's13', studentName: '신지우', status: 'late' },
    ],
  },
  {
    classId: 'c3',
    records: [
      { studentId: 's14', studentName: '권시우', status: 'present' },
      { studentId: 's15', studentName: '유하윤', status: 'present' },
      { studentId: 's16', studentName: '황준호', status: 'present' },
      { studentId: 's17', studentName: '안소율', status: 'present' },
      { studentId: 's18', studentName: '백서연', status: 'absent' },
      { studentId: 's19', studentName: '조민재', status: 'present' },
      { studentId: 's20', studentName: '남지안', status: 'present' },
      { studentId: 's21', studentName: '문예린', status: 'present' },
    ],
  },
  {
    classId: 'c4',
    records: [
      { studentId: 's22', studentName: '배승민', status: 'present' },
      { studentId: 's23', studentName: '류하람', status: 'present' },
      { studentId: 's24', studentName: '노은우', status: 'present' },
      { studentId: 's25', studentName: '김태희', status: 'present' },
      { studentId: 's26', studentName: '이준혁', status: 'late' },
      { studentId: 's27', studentName: '박소연', status: 'present' },
      { studentId: 's28', studentName: '정민우', status: 'present' },
      { studentId: 's29', studentName: '최유진', status: 'present' },
    ],
  },
  {
    classId: 'c5',
    records: [
      { studentId: 's30', studentName: '강서윤', status: 'present' },
      { studentId: 's31', studentName: '윤도현', status: 'present' },
      { studentId: 's32', studentName: '임하린', status: 'present' },
      { studentId: 's33', studentName: '한지호', status: 'present' },
      { studentId: 's34', studentName: '송예진', status: 'present' },
      { studentId: 's35', studentName: '장민서', status: 'present' },
      { studentId: 's36', studentName: '오준영', status: 'present' },
      { studentId: 's37', studentName: '신하윤', status: 'present' },
    ],
  },
];
