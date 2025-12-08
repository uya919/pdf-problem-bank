/**
 * Phase 12-4: UI 관련 상수
 *
 * 캔버스, 블록, 색상 등
 */

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// 캔버스 줌
export const CANVAS_MIN_ZOOM = 0.5;
export const CANVAS_MAX_ZOOM = 3.0;
export const CANVAS_ZOOM_STEP = 0.25;
export const CANVAS_DEFAULT_ZOOM = 1.0;

// 블록 스타일
export const BLOCK_STROKE_WIDTH = 2;
export const BLOCK_SELECTED_STROKE_WIDTH = 3;
export const GROUP_STROKE_WIDTH = 4;
export const BLOCK_OPACITY = 0.3;
export const BLOCK_SELECTED_OPACITY = 0.5;

// 색상 (Tailwind 호환)
export const COLORS = {
  primary: '#3b82f6',       // blue-500
  primaryLight: '#60a5fa',  // blue-400
  success: '#22c55e',       // green-500
  warning: '#f59e0b',       // amber-500
  error: '#ef4444',         // red-500
  selected: '#6366f1',      // indigo-500
  muted: '#9ca3af',         // gray-400
  background: '#f9fafb',    // gray-50
  border: '#e5e7eb',        // gray-200
} as const;

// 블록 상태별 색상
export const BLOCK_COLORS = {
  default: '#3b82f6',       // blue-500
  selected: '#6366f1',      // indigo-500
  grouped: '#22c55e',       // green-500
  hover: '#60a5fa',         // blue-400
} as const;

// 패딩 (이미지 크롭용)
export const IMAGE_CROP_PADDING = 10;

// Phase 61-C: 그룹 패널 상수
export const GROUP_PREVIEW_COUNT = 5;
export const LINKED_PREVIEW_COUNT = 3;

// Phase 61-C: 캔버스 상수
export const CANVAS_THROTTLE_MS = 16;  // ~60fps
export const CANVAS_MIN_DRAG_SIZE = 5;

// Phase 61-C: 매칭 상수
export const MATCHING_TARGET_COUNT = 20;
