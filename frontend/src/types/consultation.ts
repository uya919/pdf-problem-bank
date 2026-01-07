/**
 * 상담 관리 시스템 타입 정의
 * Stage 33: 상담 관리 시스템
 */

// 상담 상태
export type ConsultationStatus = 'pending' | 'confirmed' | 'enrolled' | 'cancelled';

// 알림 타입
export type NotificationType = 'immediate' | 'd-1' | 'd-day';

// 알림 수신자 타입
export type RecipientType = 'teacher' | 'subject_manager';

// 상담 과목 정보
export interface ConsultationSubject {
  id: string;
  consultation_id: string;
  subject_id: string;
  class_id: string | null;
  // 조인 데이터
  subjects?: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
  classes?: {
    id: string;
    name: string;
    teacher_id: string | null;
  };
}

// 상담 데이터
export interface Consultation {
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
  enrollment_date: string | null;
  enrollment_status: ConsultationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // 조인 데이터
  grades?: { id: string; name: string };
  consultation_subjects?: ConsultationSubject[];
  students?: { id: string; name: string };
  profiles?: { id: string; name: string };
}

// 상담 필터
export interface ConsultationFilters {
  status?: ConsultationStatus;
  enrollment_date_from?: string;
  enrollment_date_to?: string;
  search?: string;
}

// 상담 과목 입력
export interface ConsultationSubjectInput {
  subject_id: string;
  class_id?: string | null;
}

// 상담 생성 입력
export interface CreateConsultationInput {
  student_id?: string | null;
  student_name: string;
  grade_id?: string | null;
  school_name?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  consultation_date: string;
  preferred_schedule?: string | null;
  notes?: string | null;
  enrollment_date?: string | null;
  enrollment_status?: ConsultationStatus;
  // 과목별 반배정
  subjects: ConsultationSubjectInput[];
  // 알림 설정
  notify_on_confirm?: boolean;
}

// 상담 수정 입력
export interface UpdateConsultationInput {
  student_name?: string;
  grade_id?: string | null;
  school_name?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  consultation_date?: string;
  preferred_schedule?: string | null;
  notes?: string | null;
  enrollment_date?: string | null;
  enrollment_status?: ConsultationStatus;
  // 과목별 반배정 업데이트
  subjects?: ConsultationSubjectInput[];
}

// 등원 알림
export interface EnrollmentNotification {
  id: string;
  consultation_id: string;
  recipient_id: string;
  recipient_type: RecipientType;
  student_name: string;
  enrollment_date: string;
  class_name: string | null;
  subject_name: string | null;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at: string | null;
  is_sent: boolean;
  created_at: string;
}

// 과목 관리자 설정
export interface SubjectWithManagers {
  id: string;
  name: string;
  code: string;
  color: string;
  manager_ids: string[];
  // 조인된 관리자 프로필
  managers?: Array<{ id: string; name: string }>;
}

// 캘린더 등원 표시 데이터
export interface EnrollmentCalendarItem {
  id: string;
  consultation_id: string;
  student_name: string;
  enrollment_date: string;
  class_names: string[];
  subject_names: string[];
}
