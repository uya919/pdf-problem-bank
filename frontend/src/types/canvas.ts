/**
 * Canvas Types - FigJam 스타일 캔버스 타입 정의
 *
 * Stage 5 재설계: 화이트보드 기반 시간표 계획 도구
 */

// ============================================
// Element Types
// ============================================

export type CanvasElementType =
  | 'sticky'
  | 'timetable'
  | 'calculator'
  | 'meeting'
  | 'text';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// ============================================
// Widget Data Types (CanvasElement 전에 정의)
// ============================================

export type StickyColor = 'yellow' | 'blue' | 'pink' | 'green' | 'orange';

export interface StickyNoteData {
  color: StickyColor;
  header: string;
  content: string;
}

export type DayPattern = 'mon-fri' | 'mon-sat' | 'custom';
export type TimeInterval = 30 | 45 | 60;

export interface TimetableSettings {
  dayPattern: DayPattern;
  customDays?: string[];  // ['월', '목'] 등 커스텀 요일
  timeInterval: TimeInterval;
  startTime: string;  // 'HH:MM' 형식
  endTime: string;
}

export interface TimetableWidgetData {
  title: string;
  settings: TimetableSettings;
  cells: Record<string, string>;  // 'row-col' 형식의 키 (예: '0-1' = 첫번째 시간, 월요일)
}

export interface CalculatorWidgetData {
  title: string;
  rows: { label: string; value: string; highlight?: boolean }[];
}

export interface MeetingWidgetData {
  title: string;
  date: string;
  items: string[];
}

export interface TextWidgetData {
  content: string;
  fontSize?: 'sm' | 'md' | 'lg';
}

// ============================================
// Canvas Element
// ============================================

/**
 * 캔버스 요소 데이터 타입 (Union)
 */
export type CanvasElementData =
  | StickyNoteData
  | TimetableWidgetData
  | CalculatorWidgetData
  | MeetingWidgetData
  | TextWidgetData
  | Record<string, unknown>;

/**
 * 캔버스 요소 기본 인터페이스
 */
export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  position: Position;
  size: Size;
  zIndex: number;
  data: CanvasElementData;
}

// ============================================
// Canvas State
// ============================================

export interface CanvasState {
  zoom: number;
  pan: Position;
  elements: CanvasElement[];
  selectedIds: string[];
  tool: CanvasTool;
  isDragging: boolean;
  isPanning: boolean;
}

export type CanvasTool =
  | 'select'
  | 'sticky'
  | 'timetable'
  | 'calculator'
  | 'meeting'
  | 'text';

// ============================================
// Colors
// ============================================

export const STICKY_COLORS: Record<StickyColor, { bg: string; border: string }> = {
  yellow: { bg: '#FFF9C4', border: '#FFF176' },
  blue: { bg: '#BBDEFB', border: '#64B5F6' },
  pink: { bg: '#F8BBD0', border: '#F48FB1' },
  green: { bg: '#C8E6C9', border: '#81C784' },
  orange: { bg: '#FFE0B2', border: '#FFB74D' },
};

export const WIDGET_HEADER_COLORS = {
  timetable: 'bg-blue-500',
  calculator: 'bg-purple-500',
  meeting: 'bg-orange-500',
};

// ============================================
// Timetable Helpers
// ============================================

/**
 * 요일 패턴에 따른 요일 배열 반환
 */
export function getDaysFromPattern(pattern: DayPattern, customDays?: string[]): string[] {
  switch (pattern) {
    case 'mon-fri':
      return ['월', '화', '수', '목', '금'];
    case 'mon-sat':
      return ['월', '화', '수', '목', '금', '토'];
    case 'custom':
      return customDays || ['월', '화', '수', '목', '금'];
    default:
      return ['월', '화', '수', '목', '금'];
  }
}

/**
 * 시작/종료 시간과 간격에 따른 시간 슬롯 배열 반환
 */
export function getTimeSlots(startTime: string, endTime: string, interval: TimeInterval): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    currentMinutes += interval;
  }

  return slots;
}

/**
 * 텍스트를 해시 기반 파스텔 색상으로 변환
 */
export function textToColor(text: string): string {
  if (!text.trim()) return 'transparent';

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

/**
 * 기본 시간표 설정
 */
export const DEFAULT_TIMETABLE_SETTINGS: TimetableSettings = {
  dayPattern: 'mon-fri',
  timeInterval: 60,
  startTime: '10:00',
  endTime: '18:00',
};

// ============================================
// Constants
// ============================================

export const CANVAS_DEFAULTS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 4,
  DEFAULT_ZOOM: 1,
  ZOOM_STEP: 0.1,
  GRID_SIZE: 20,
};

// ============================================
// Supabase Storage
// ============================================

export interface TimetableBoard {
  id: string;
  name: string;
  data: CanvasState;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardInput {
  name: string;
  data: CanvasState;
}

export interface UpdateBoardInput {
  name?: string;
  data?: CanvasState;
}
