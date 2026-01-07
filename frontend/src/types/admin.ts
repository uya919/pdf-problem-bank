/**
 * Admin PC 대시보드 관련 타입 정의
 *
 * Stage 13: PC 대시보드 캘린더 UI
 * Stage 16: 캘린더 통합 공지사항 (권한별 분리)
 * Stage 17-B: 중요 체크 + 캘린더 미리보기
 */

// =====================================================
// 공지사항 타입 (Stage 16 확장)
// =====================================================

/** 공지 유형 */
export type NoticeType =
  | 'urgent'      // 긴급 (빨강) - 휴강, 강사 변경
  | 'enrollment'  // 신규등원 (초록) - 새 학생 등원
  | 'absence'     // 결석 (빨강) - 학생 결석 알림
  | 'holiday'     // 휴원 (주황) - 공휴일, 방학
  | 'exam'        // 시험 (파랑) - 모의고사, 레벨테스트
  | 'special'     // 특강 (초록) - 특강, 보강
  | 'event'       // 행사 (보라) - 학부모 상담, 설명회
  | 'operation';  // 운영 (노랑) - 수강료, 교재 변경

/** 공지 대상 (권한) */
export type NoticeVisibility =
  | 'all'      // 전체 (관리자 + 강사)
  | 'admin'    // 관리자 전용
  | 'teacher'; // 강사 전용

/** 공지사항 */
export interface Notice {
  id: string;
  title: string;
  description?: string;
  date: string;           // 'YYYY-MM-DD'
  startTime?: string;     // 'HH:MM' (시간 지정 공지)
  endTime?: string;
  type: NoticeType;
  priority: number;       // 높을수록 상단 표시
  visibility: NoticeVisibility;
  createdBy?: string;
  createdAt: string;
  isActive: boolean;
  isImportant: boolean;   // Stage 17-B: 중요 체크 (캘린더 미리보기 표시)
  targetClassIds?: string[];  // Stage 35: 특정 반 담당 선생님만 볼 수 있도록
}

/** 중요 공지 유형 (긴급, 신규등원, 결석, 휴원) - 자동 isImportant=true */
export const IMPORTANT_NOTICE_TYPES: NoticeType[] = ['urgent', 'enrollment', 'absence', 'holiday'];

/** 캘린더 미리보기 우선순위 (낮을수록 먼저 표시) */
export const CALENDAR_PRIORITY_ORDER: NoticeType[] = [
  'urgent',      // 1. 긴급
  'enrollment',  // 2. 신규등원
  'absence',     // 3. 결석
  'holiday',     // 4. 휴원
  'exam',
  'special',
  'event',
  'operation',
];

/** 공지 유형별 스타일 */
export const NOTICE_TYPE_STYLES: Record<NoticeType, {
  label: string;
  bgColor: string;
  borderColor: string;
  iconBgColor: string;
  textColor: string;
  badgeBgColor: string;
  badgeTextColor: string;
}> = {
  urgent: {
    label: '긴급',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    iconBgColor: 'bg-red-100',
    textColor: 'text-red-600',
    badgeBgColor: 'bg-red-500',
    badgeTextColor: 'text-white',
  },
  enrollment: {
    label: '신규등원',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconBgColor: 'bg-green-100',
    textColor: 'text-green-600',
    badgeBgColor: 'bg-green-500',
    badgeTextColor: 'text-white',
  },
  absence: {
    label: '결석',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-100',
    iconBgColor: 'bg-red-100',
    textColor: 'text-red-600',
    badgeBgColor: 'bg-red-500',
    badgeTextColor: 'text-white',
  },
  holiday: {
    label: '휴원',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    iconBgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    badgeBgColor: 'bg-orange-500',
    badgeTextColor: 'text-white',
  },
  exam: {
    label: '시험',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    iconBgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    badgeBgColor: 'bg-blue-100',
    badgeTextColor: 'text-blue-700',
  },
  special: {
    label: '특강',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-100',
    iconBgColor: 'bg-green-100',
    textColor: 'text-green-600',
    badgeBgColor: 'bg-green-100',
    badgeTextColor: 'text-green-700',
  },
  event: {
    label: '행사',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    iconBgColor: 'bg-purple-100',
    textColor: 'text-purple-600',
    badgeBgColor: 'bg-purple-100',
    badgeTextColor: 'text-purple-700',
  },
  operation: {
    label: '운영',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-100',
    iconBgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    badgeBgColor: 'bg-yellow-100',
    badgeTextColor: 'text-yellow-700',
  },
};

/** 날짜별 공지 맵 */
export type NoticesByDate = Record<string, Notice[]>;

// =====================================================
// 공지 등록 타입 (Stage 17)
// =====================================================

/** 태그된 학생 정보 */
export interface TaggedStudent {
  id: string;
  name: string;
  grade?: string;
  school?: string;
  phone?: string | null;
}

/** 공지 생성 입력 */
export interface CreateNoticeInput {
  type: NoticeType;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  visibility: NoticeVisibility;
  taggedStudentId?: string;
  absenceReason?: string;
  isImportant?: boolean;  // Stage 17-B: 중요 체크
  targetClassIds?: string[];  // Stage 35: 특정 반 담당 선생님만 볼 수 있도록
}

/** 공지 폼 상태 */
export interface NoticeFormState {
  type: NoticeType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  visibility: NoticeVisibility;
  taggedStudent: TaggedStudent | null;
  absenceReason: string;
  isImportant: boolean;   // Stage 17-B: 중요 체크
  isSubmitting: boolean;
  errors: Record<string, string>;
}

// =====================================================
// 주간 캘린더 타입
// =====================================================

/** 주간 범위 */
export interface WeekRange {
  start: string; // YYYY-MM-DD (일요일)
  end: string; // YYYY-MM-DD (토요일)
  weekNumber: number;
  month: number;
  year: number;
}

/** 캘린더 날짜 셀 데이터 */
export interface CalendarDay {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayOfWeek: number; // 0=일, 1=월, ...
  dayName: string; // 월, 화, ...
  isToday: boolean;
  isWeekend: boolean;
  notices: Notice[];
}

// =====================================================
// 월간 캘린더 타입 (Stage 20)
// =====================================================

/** 월 범위 */
export interface MonthRange {
  year: number;
  month: number; // 1-12
}

/** 월간 캘린더 날짜 셀 (CalendarDay 확장) */
export interface MonthCalendarDay extends CalendarDay {
  /** 현재 월에 속하는 날짜인지 (이전/다음 달 회색 표시용) */
  isCurrentMonth: boolean;
}

// =====================================================
// 대시보드 통합 수업 타입 (Stage 14)
// =====================================================

/** 순환수업 활동 정보 */
export interface RotationActivityInfo {
  gradeId: string;
  gradeName: string;
  activityType: 'english_class' | 'math_class' | 'math_test';
  activityName: string; // '영어 수업', '수학 수업', '수학 Test'
}

/** 대시보드 통합 수업 (정규 + 순환) */
export interface DashboardClass {
  id: string;
  name: string;
  subject: string;
  startTime: string; // 'HH:MM'
  endTime: string;
  teacher?: { id: string; name: string } | null;
  studentCount?: number;
  status: 'upcoming' | 'current' | 'completed';

  // 순환수업 전용 필드
  isRotation: boolean;
  rotationScheduleId?: string;
  rotationWeek?: number; // 1, 2, 3
  rotationActivities?: RotationActivityInfo[];
  isHoliday?: boolean;
  holidayReason?: string;
}

// =====================================================
// 수업 카드 상세 타입 (Stage 15: 캘린더 스타일 대시보드)
// =====================================================

/** 진도 정보 */
export interface ClassProgress {
  bookName: string;
  pageRange: string; // 예: "p.42~45"
}

/** 숙제 정보 */
export interface ClassHomework {
  bookName: string;
  pageRange: string; // 예: "p.42"
  problems: string; // 예: "1~15번"
}

/** 수업 레벨 (정렬용) */
export type ClassLevel = 'high' | 'mid' | 'low';

/** 수업 상세 정보 (카드 표시용) */
export interface ClassScheduleDetail {
  id: string;
  name: string; // 반 이름 (예: "중3 심화")
  teacherName: string;
  studentCount: number;
  level: ClassLevel; // 심화(high), 정규(mid), 기초(low)

  // 지난 수업 정보
  lastProgress?: ClassProgress;
  lastHomework?: ClassHomework;

  // 오늘 수업 정보
  todayProgress?: ClassProgress;
  todayHomework?: ClassHomework;

  // 메모/특이사항
  memo?: string;

  // 시간 정보
  startTime: string; // 'HH:MM'
  endTime: string;

  // 상태
  isCurrent: boolean; // 현재 진행 중
}

/** 시간대별 수업 그룹 (Stage 15: Supabase 연동) */
export interface TimeSlotGroup {
  timeSlot: string; // '14:00 ~ 16:00' (표시용)
  startTime: string; // '14:00' (정렬용)
  classCount: number;
  classes: ClassScheduleDetail[]; // 레벨순 정렬됨
}

/** 레벨 정렬 순서 */
export const LEVEL_ORDER: Record<ClassLevel, number> = {
  high: 0, // 심화 먼저
  mid: 1, // 정규
  low: 2, // 기초 마지막
};

/**
 * 반 이름에서 레벨 추출
 * @param className 반 이름 (예: "고1 국어 심화", "중3 수학 정규1", "중2 영어 기초")
 * @returns 레벨 ('high' | 'mid' | 'low')
 */
export function extractLevel(className: string): ClassLevel {
  if (className.includes('심화')) return 'high';
  if (className.includes('기초')) return 'low';
  if (className.includes('정규')) return 'mid';
  return 'mid'; // 기본값
}
