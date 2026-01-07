/**
 * 순환수업 시스템 타입 정의
 * @module types/rotation
 */

/** 활동 유형 */
export type ActivityType = 'english_class' | 'math_class' | 'math_test';

/** 예외 처리 방식 */
export type ExceptionActionType = 'carry_over' | 'skip';

/** 순환수업 정의 */
export interface RotationSchedule {
  id: string;
  name: string;
  day_of_week: number;  // 0-6 (0=일요일, 3=수요일)
  start_time: string;   // 'HH:MM:SS' or 'HH:MM'
  end_time: string;
  cycle_weeks: number;  // 순환 주기 (2-8)
  start_date: string;   // 'YYYY-MM-DD' (1주차 기준일)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 순환 패턴 (주차-학년-활동 매핑) */
export interface RotationPattern {
  id: string;
  rotation_schedule_id: string;
  week_number: number;      // 1, 2, 3 (1부터 시작)
  grade_id: string;
  activity_type: ActivityType;
  activity_name: string;    // '영어 수업', '수학 수업', '수학 Test'
  created_at: string;
  // Join 결과
  grades?: {
    id: string;
    name: string;
  };
}

/** 휴일/예외 */
export interface RotationException {
  id: string;
  rotation_schedule_id: string;
  exception_date: string;   // 'YYYY-MM-DD'
  reason: string;           // '신정', '설날 연휴'
  action_type: ExceptionActionType;
  created_at: string;
}

/** 대상 학년 */
export interface RotationTargetGrade {
  id: string;
  rotation_schedule_id: string;
  grade_id: string;
  created_at: string;
  // Join 결과
  grades?: {
    id: string;
    name: string;
  };
}

/** 순환수업 상세 (관계 포함) */
export interface RotationScheduleDetail {
  schedule: RotationSchedule;
  patterns: RotationPattern[];
  exceptions: RotationException[];
  targetGrades: RotationTargetGrade[];
}

/** 특정 날짜의 순환수업 활동 (계산 결과) */
export interface RotationActivity {
  date: string;             // 'YYYY-MM-DD'
  weekNumber: number;       // 1, 2, 3
  isHoliday: boolean;       // 휴일 여부
  isCarriedOver: boolean;   // 이월된 주차인지
  holidayReason?: string;   // 휴일 사유
  activities: {
    gradeId: string;
    gradeName: string;
    activityType: ActivityType;
    activityName: string;
  }[];
}

/** 순환수업 생성 입력 */
export interface CreateRotationScheduleInput {
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  cycle_weeks?: number;
  start_date: string;
  target_grade_ids: string[];
}

/** 순환수업 수정 입력 */
export interface UpdateRotationScheduleInput {
  name?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  cycle_weeks?: number;
  start_date?: string;
  is_active?: boolean;
}

/** 패턴 저장 입력 */
export interface SavePatternInput {
  week_number: number;
  grade_id: string;
  activity_type: ActivityType;
  activity_name: string;
}

/** 예외 생성 입력 */
export interface CreateExceptionInput {
  rotation_schedule_id: string;
  exception_date: string;
  reason: string;
  action_type: ExceptionActionType;
}

/** 활동 유형 메타데이터 */
export const ACTIVITY_TYPES: Record<ActivityType, {
  label: string;
  color: 'emerald' | 'blue' | 'amber';
  bgClass: string;
  textClass: string;
}> = {
  english_class: {
    label: '영어 수업',
    color: 'emerald',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-700',
  },
  math_class: {
    label: '수학 수업',
    color: 'blue',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
  },
  math_test: {
    label: '수학 Test',
    color: 'amber',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-700',
  },
};

/** 요일 이름 */
export const DAY_OF_WEEK_NAMES: Record<number, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};
