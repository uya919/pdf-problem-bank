/**
 * Timetable Studio 타입 정의
 *
 * Stage 5: Timetable Studio 재설계
 * - 시나리오 (시간표 버전) 관리
 * - 시간표 슬롯 (시간대별 반 배정)
 */

// =====================================================
// 시나리오 타입
// =====================================================

/** 시나리오 유형 */
export type ScenarioType = 'regular' | 'vacation' | 'exam' | 'draft';

/** 시나리오 유형 라벨 */
export const SCENARIO_TYPE_LABELS: Record<ScenarioType, string> = {
  regular: '정규',
  vacation: '방학',
  exam: '시험',
  draft: '초안',
};

/** 시나리오 유형 색상 */
export const SCENARIO_TYPE_COLORS: Record<ScenarioType, { bg: string; text: string }> = {
  regular: { bg: 'bg-blue-100', text: 'text-blue-700' },
  vacation: { bg: 'bg-green-100', text: 'text-green-700' },
  exam: { bg: 'bg-orange-100', text: 'text-orange-700' },
  draft: { bg: 'bg-grey-100', text: 'text-grey-600' },
};

/** 시나리오 (시간표 버전) */
export interface TimetableScenario {
  id: string;
  name: string;
  type: ScenarioType;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 시나리오 생성 입력 */
export interface CreateScenarioInput {
  name: string;
  type: ScenarioType;
  startDate?: string;
  endDate?: string;
}

/** 시나리오 수정 입력 */
export interface UpdateScenarioInput {
  name?: string;
  type?: ScenarioType;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

// =====================================================
// 슬롯 타입
// =====================================================

/** 요일 (0=월 ~ 5=토) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5;

/** 요일 라벨 */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  0: '월',
  1: '화',
  2: '수',
  3: '목',
  4: '금',
  5: '토',
};

/** 시간표 슬롯 */
export interface TimetableSlot {
  id: string;
  scenarioId: string;
  classId: string | null;
  teacherId: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  room: string | null;
  note: string | null;
  createdAt: string;

  // JOIN 데이터 (조회 시)
  className?: string;
  classColor?: string;
  teacherName?: string;
  grade?: string;
  subject?: string;
}

/** 슬롯 생성 입력 */
export interface CreateSlotInput {
  scenarioId: string;
  classId: string;
  teacherId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  note?: string;
}

/** 슬롯 수정 입력 */
export interface UpdateSlotInput {
  classId?: string;
  teacherId?: string | null;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  room?: string | null;
  note?: string | null;
}

// =====================================================
// 그리드 관련 타입
// =====================================================

/** 시간 슬롯 위치 */
export interface TimeSlotPosition {
  dayOfWeek: DayOfWeek;
  startTime: string;
}

/** 드래그 아이템 */
export interface DragItem {
  type: 'class' | 'slot';
  classId?: string;
  slotId?: string;
  className?: string;
  classColor?: string;
}

/** 시간대 설정 */
export interface TimeGridConfig {
  startHour: number;  // 시작 시간 (기본 10)
  endHour: number;    // 종료 시간 (기본 22)
  intervalMinutes: number;  // 간격 (기본 60분)
}

/** 기본 시간대 설정 */
export const DEFAULT_TIME_GRID_CONFIG: TimeGridConfig = {
  startHour: 10,
  endHour: 22,
  intervalMinutes: 60,
};

/** 시간대 목록 생성 */
export function generateTimeSlots(config: TimeGridConfig = DEFAULT_TIME_GRID_CONFIG): string[] {
  const slots: string[] = [];
  for (let hour = config.startHour; hour < config.endHour; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    slots.push(`${hourStr}:00`);
  }
  return slots;
}

// =====================================================
// Supabase Row 타입
// =====================================================

/** Supabase scenarios 테이블 행 */
export interface ScenarioRow {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Supabase slots 테이블 행 */
export interface SlotRow {
  id: string;
  scenario_id: string;
  class_id: string | null;
  teacher_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  note: string | null;
  created_at: string;
}

/** Row → TimetableScenario 변환 */
export function rowToScenario(row: ScenarioRow): TimetableScenario {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ScenarioType,
    isActive: row.is_active,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Row → TimetableSlot 변환 */
export function rowToSlot(row: SlotRow): TimetableSlot {
  return {
    id: row.id,
    scenarioId: row.scenario_id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room,
    note: row.note,
    createdAt: row.created_at,
  };
}
