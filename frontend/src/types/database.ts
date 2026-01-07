/**
 * Supabase Database Types
 * hyeyum 스키마와 100% 호환
 *
 * 생성일: 2025-12-12
 * MCP로 hyeyum 스키마 조회 후 생성
 */

// =====================================================
// ENUM Types
// =====================================================

export type StudentStatus = 'active' | 'inactive' | 'graduated';
export type ClassStatus = 'active' | 'inactive';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type HomeworkSubmissionStatus = 'pending' | 'submitted' | 'graded';
export type RegistrationStatus = 'inquiry' | 'scheduled' | 'completed' | 'enrolled' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high';
export type TodoCategory = 'attendance' | 'homework' | 'call' | 'etc' | 'meeting';
export type AnnouncementCategory = 'news' | 'absent' | 'late' | 'withdrawal';
export type AnnouncementVisibility = 'all' | 'specific_teachers' | 'student_teachers';
export type ExamType = 'school_midterm_1' | 'school_final_1' | 'school_midterm_2' | 'school_final_2' | 'daily' | 'weekly' | 'monthly' | 'other';

// Phase 7: 과목별 반 배정 관련 타입
export type SubjectCode = 'math' | 'korean' | 'english';
export type ClassLevel = 'advanced' | 'regular' | 'regular2' | 'basic';
export type Division = 'elementary' | 'middle' | 'high';

// =====================================================
// Table Types
// =====================================================

/** 사용자 프로필 */
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: 'director' | 'teacher' | 'assistant' | 'admin' | 'owner';
  phone: string | null;
  avatar_url: string | null;
  subjects: string[] | null;
  departments: string[] | null;
  grade_permissions: string[] | null;
  consultation_access: boolean;
  sync_permission: boolean | null;
  timetable_access: boolean;
  meeting_access: boolean;
  subject_lead_for: string[] | null;
  // Stage 9 확장: 강사 관리용 필드
  subject: string | null;
  note: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

/** 학생 */
export interface Student {
  id: string;
  name: string;
  phone: string | null;
  parent_phone: string;
  parent_name: string | null;
  grade_id: string | null;  // FK to grades table (pdf 스키마)
  school: string | null;
  is_active: boolean;  // pdf 스키마: boolean (not status enum)
  notes: string | null;
  created_by: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 과목 */
export interface Subject {
  id: string;
  name: string;                    // '수학', '국어', '영어'
  code: SubjectCode;               // 'math', 'korean', 'english'
  color: string;                   // UI 색상 '#3182F6'
  sort_order: number;
  is_active: boolean;
  manager_ids: string[] | null;    // Stage 33: 과목별 관리자 IDs
  created_at: string;
  updated_at: string;
}

/** 학생 수강 과목 */
export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  is_active: boolean;
  enrolled_at: string;
  created_at: string;
}

/** 반 */
export interface Class {
  id: string;
  name: string;
  subject: string;
  subject_id: string | null;       // FK to subjects (Phase 7 추가)
  level: ClassLevel | null;        // 심화/정규/기초 (Phase 7 추가)
  grade: string | null;            // 학년 (Phase 7 추가)
  division: Division | null;       // 초등/중등/고등 (Phase 7 추가)
  is_active: boolean;              // 활성 상태 (Phase 7 추가)
  teacher_id: string | null;
  assistant_teacher_id: string | null;  // Stage 35: 부담임 선생님
  homeroom_teacher_id: string | null;   // Stage 35: 담임 선생님
  day_of_week: number[];
  assistant_days: number[] | null;      // Stage 35: 부담임 수업 요일
  homeroom_days: number[] | null;       // Stage 35: 담임 수업 요일
  start_time: string;
  end_time: string;
  room: string | null;
  capacity: number | null;
  status: ClassStatus;
  textbooks: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 반 등록 */
export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  enrolled_by: string | null;      // 배정한 관리자 (Phase 7 추가)
  status: EnrollmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** 출결 */
export interface Attendance {
  id: string;
  class_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  created_by: string | null;
  announcement_id: string | null;
  created_at: string;
}

/** 진도 */
export interface Progress {
  id: string;
  class_id: string;
  date: string;
  textbook: string | null;
  pages: string | null;
  topic: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 숙제 */
export interface Homework {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string;
  assigned_date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 숙제 제출 */
export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  status: HomeworkSubmissionStatus;
  submitted_at: string | null;
  grade: string | null;
  feedback: string | null;
  checked_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 시험 성적 */
export interface ExamScore {
  id: string;
  class_id: string;
  student_id: string;
  exam_type: ExamType;
  exam_date: string;
  exam_name: string;
  correct_answers: number | null;
  total_questions: number | null;
  manual_score: number | null;
  score: number | null; // generated
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 할 일 */
export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  priority: Priority;
  category: TodoCategory | null;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 공지사항 */
export interface Announcement {
  id: string;
  content: string;
  category: AnnouncementCategory;
  announcement_date: string;
  created_by: string;
  tagged_student_id: string | null;
  visibility: AnnouncementVisibility;
  visible_teacher_ids: string[] | null;
  visible_group_ids: string[] | null;
  show_in_calendar: boolean;
  created_at: string;
  updated_at: string;
}

/** 회의 */
export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  attendee_ids: string[] | null;
  attendee_scopes: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  minutes: string | null;
  decisions: string | null;
  action_items: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 교사 그룹 */
export interface TeacherGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 교사 그룹 멤버 */
export interface TeacherGroupMember {
  id: string;
  group_id: string;
  teacher_id: string;
  created_at: string;
}

/** 등록/상담 */
export interface Registration {
  id: string;
  student_name: string;
  parent_name: string;
  phone: string;
  grade: string | null;
  subject: string | null;
  consultation_date: string | null;
  status: RegistrationStatus;
  notes: string | null;
  assigned_to: string | null;
  consultation_id: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Join Types (with relations)
// =====================================================

/** 학년 정보 (grades 테이블) */
export interface Grade {
  id: string;
  name: string;  // '중1', '중2', '고1' 등
}

/** 학생 + 등록된 반 + 학년 정보 */
export interface StudentWithEnrollments extends Student {
  enrollments?: (ClassEnrollment & { class: Class })[];
  grade?: Grade | null;  // JOIN된 학년 객체 (grades 테이블)
}

/** 반 + 담당 교사 + 학생 수 */
export interface ClassWithDetails extends Class {
  teacher?: Profile | null;
  student_count?: number;
  enrollments?: ClassEnrollment[];
}

/** 출결 + 학생 정보 */
export interface AttendanceWithStudent extends Attendance {
  student?: Student;
}

/** 숙제 + 제출 현황 */
export interface HomeworkWithSubmissions extends Homework {
  submissions?: (HomeworkSubmission & { student?: Student })[];
}

/** 성적 + 학생 정보 */
export interface ExamScoreWithStudent extends ExamScore {
  student?: Student;
}

// =====================================================
// Phase 7: 과목별 반 배정 Join Types
// =====================================================

/** 학생 + 수강 과목 정보 */
export interface StudentWithSubjects extends Student {
  student_subjects?: (StudentSubject & { subject: Subject })[];
  enrolled_subjects?: SubjectCode[];  // 간편 접근용
}

/** 과목별 반 배정 상태 (학생별) */
export interface StudentSubjectAssignment {
  student_id: string;
  student_name: string;
  student_grade: string | null;
  school: string | null;
  subject_id: string;
  subject_code: SubjectCode;
  subject_name: string;
  class_id: string | null;
  class_name: string | null;
  class_level: ClassLevel | null;
  enrollment_status: EnrollmentStatus | null;
}

/** 반 + 과목 + 학생 수 (RPC 반환 타입) */
export interface ClassBySubject {
  id: string;
  name: string;
  level: ClassLevel | null;
  division: Division | null;
  grade: string | null;
  subject_id: string;
  subject_code: SubjectCode;
  subject_name: string;
  student_count: number;
}

/** 학생별 과목 배정 현황 (RPC 반환 타입) */
export interface StudentBySubject {
  student_id: string;
  student_name: string;
  student_grade: string | null;
  school: string | null;
  is_enrolled: boolean;
  class_id: string | null;
  class_name: string | null;
  class_level: ClassLevel | null;
}

/** 반 배정 RPC 응답 */
export interface AssignmentResult {
  success: boolean;
  affected_count?: number;
  class_id?: string;
  error?: string;
}

/** UI용 과목 정보 상수 */
export const SUBJECT_CONFIG: Record<SubjectCode, { name: string; color: string; bgClass: string }> = {
  math: { name: '수학', color: '#3182F6', bgClass: 'bg-blue-100 text-blue-700' },
  korean: { name: '국어', color: '#10B981', bgClass: 'bg-green-100 text-green-700' },
  english: { name: '영어', color: '#8B5CF6', bgClass: 'bg-purple-100 text-purple-700' },
};

/** 레벨 표시명 */
export const LEVEL_NAMES: Record<ClassLevel, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
};

/** 학부 표시명 */
export const DIVISION_NAMES: Record<Division, string> = {
  elementary: '초등',
  middle: '중등',
  high: '고등',
};

// =====================================================
// Database Schema Type
// =====================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; name: string; email: string; role: string };
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      students: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>;
      };
      classes: {
        Row: Class;
        Insert: Omit<Class, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Class, 'id' | 'created_at' | 'updated_at'>>;
      };
      class_enrollments: {
        Row: ClassEnrollment;
        Insert: Omit<ClassEnrollment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ClassEnrollment, 'id' | 'created_at' | 'updated_at'>>;
      };
      attendance: {
        Row: Attendance;
        Insert: Omit<Attendance, 'id' | 'created_at'>;
        Update: Partial<Omit<Attendance, 'id' | 'created_at'>>;
      };
      progress: {
        Row: Progress;
        Insert: Omit<Progress, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Progress, 'id' | 'created_at' | 'updated_at'>>;
      };
      homework: {
        Row: Homework;
        Insert: Omit<Homework, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Homework, 'id' | 'created_at' | 'updated_at'>>;
      };
      homework_submissions: {
        Row: HomeworkSubmission;
        Insert: Omit<HomeworkSubmission, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<HomeworkSubmission, 'id' | 'created_at' | 'updated_at'>>;
      };
      exam_scores: {
        Row: ExamScore;
        Insert: Omit<ExamScore, 'id' | 'score' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ExamScore, 'id' | 'score' | 'created_at' | 'updated_at'>>;
      };
      todos: {
        Row: Todo;
        Insert: Omit<Todo, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Todo, 'id' | 'created_at' | 'updated_at'>>;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Announcement, 'id' | 'created_at' | 'updated_at'>>;
      };
      meetings: {
        Row: Meeting;
        Insert: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Meeting, 'id' | 'created_at' | 'updated_at'>>;
      };
      teacher_groups: {
        Row: TeacherGroup;
        Insert: Omit<TeacherGroup, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TeacherGroup, 'id' | 'created_at' | 'updated_at'>>;
      };
      teacher_group_members: {
        Row: TeacherGroupMember;
        Insert: Omit<TeacherGroupMember, 'id' | 'created_at'>;
        Update: Partial<Omit<TeacherGroupMember, 'id' | 'created_at'>>;
      };
      registrations: {
        Row: Registration;
        Insert: Omit<Registration, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Registration, 'id' | 'created_at' | 'updated_at'>>;
      };
      // Phase 7: 과목별 반 배정
      subjects: {
        Row: Subject;
        Insert: Omit<Subject, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at'>>;
      };
      student_subjects: {
        Row: StudentSubject;
        Insert: Omit<StudentSubject, 'id' | 'created_at'>;
        Update: Partial<Omit<StudentSubject, 'id' | 'created_at'>>;
      };
      // Stage 30: 공휴일 관리
      holidays: {
        Row: {
          id: string;
          date: string;
          name: string;
          year: number;
          is_substitute: boolean;
          created_at: string;
        };
        Insert: {
          date: string;
          name: string;
          year: number;
          is_substitute?: boolean;
        };
        Update: Partial<{
          date: string;
          name: string;
          year: number;
          is_substitute: boolean;
        }>;
      };
      holiday_exceptions: {
        Row: {
          id: string;
          date: string;
          is_open: boolean;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          date: string;
          is_open: boolean;
          reason?: string | null;
          created_by?: string | null;
        };
        Update: Partial<{
          date: string;
          is_open: boolean;
          reason: string | null;
        }>;
      };
      // Stage 33: 상담 관리
      consultations: {
        Row: {
          id: string;
          student_id: string | null;
          student_name: string;
          grade_id: string | null;
          school_name: string | null;
          student_phone: string | null;
          parent_phone: string | null;
          consultation_date: string;
          preferred_schedule: string | null;
          notes: string | null;
          enrollment_status: 'pending' | 'confirmed' | 'enrolled' | 'cancelled';
          enrollment_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          student_id?: string | null;
          student_name: string;
          grade_id?: string | null;
          school_name?: string | null;
          student_phone?: string | null;
          parent_phone?: string | null;
          consultation_date: string;
          preferred_schedule?: string | null;
          notes?: string | null;
          enrollment_status?: 'pending' | 'confirmed' | 'enrolled' | 'cancelled';
          enrollment_date?: string | null;
          created_by?: string | null;
        };
        Update: Partial<{
          student_name: string;
          grade_id: string | null;
          school_name: string | null;
          student_phone: string | null;
          parent_phone: string | null;
          consultation_date: string;
          preferred_schedule: string | null;
          notes: string | null;
          enrollment_status: 'pending' | 'confirmed' | 'enrolled' | 'cancelled';
          enrollment_date: string | null;
        }>;
      };
      consultation_subjects: {
        Row: {
          id: string;
          consultation_id: string;
          subject_id: string;
          class_id: string | null;
          created_at: string;
        };
        Insert: {
          consultation_id: string;
          subject_id: string;
          class_id?: string | null;
        };
        Update: Partial<{
          subject_id: string;
          class_id: string | null;
        }>;
      };
      // Stage 16: 공지사항
      notices: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          type: 'important' | 'info' | 'warning' | 'event' | 'enrollment';
          date: string;
          is_important: boolean;
          target_class_ids: string[] | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          content?: string | null;
          type: 'important' | 'info' | 'warning' | 'event' | 'enrollment';
          date: string;
          is_important?: boolean;
          target_class_ids?: string[] | null;
          created_by?: string | null;
        };
        Update: Partial<{
          title: string;
          content: string | null;
          type: 'important' | 'info' | 'warning' | 'event' | 'enrollment';
          date: string;
          is_important: boolean;
          target_class_ids: string[] | null;
        }>;
      };
      // Stage 12: 순환수업
      rotation_schedules: {
        Row: {
          id: string;
          class_id: string;
          rotation_type: 'weekly' | 'biweekly';
          start_date: string;
          end_date: string | null;
          week_config: Record<string, unknown>;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          rotation_type: 'weekly' | 'biweekly';
          start_date: string;
          end_date?: string | null;
          week_config: Record<string, unknown>;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: Partial<{
          rotation_type: 'weekly' | 'biweekly';
          start_date: string;
          end_date: string | null;
          week_config: Record<string, unknown>;
          is_active: boolean;
        }>;
      };
      // 학년 테이블
      grades: {
        Row: {
          id: string;
          name: string;
          division: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          name: string;
          division?: string | null;
          sort_order?: number;
        };
        Update: Partial<{
          name: string;
          division: string | null;
          sort_order: number;
        }>;
      };
      // Stage 33: 과목별 관리자
      subject_managers: {
        Row: {
          id: string;
          subject_id: string;
          manager_id: string;
          created_at: string;
        };
        Insert: {
          subject_id: string;
          manager_id: string;
        };
        Update: Partial<{
          subject_id: string;
          manager_id: string;
        }>;
      };
    };
    Functions: {
      confirm_enrollment: {
        Args: { p_consultation_id: string; p_enrollment_date: string };
        Returns: { success: boolean; message: string };
      };
      get_enrollment_calendar: {
        Args: { p_start_date: string; p_end_date: string };
        Returns: Array<{
          enrollment_date: string;
          student_name: string;
          enrollment_status: string;
        }>;
      };
      create_enrollment_notification: {
        Args: { p_consultation_id: string };
        Returns: { success: boolean };
      };
    };
  };
}
