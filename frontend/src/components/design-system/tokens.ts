/**
 * Hyeyum 백오피스 디자인 토큰
 *
 * 출처: docs/mockups/dashboard-modal-final.html
 * 모든 스타일은 이 토큰을 통해서만 사용합니다.
 */

// ===== 색상 토큰 =====
export const COLORS = {
  // Primary
  primary: '#3182F6',
  primaryDark: '#1B64DA',
  primaryLight: '#F2F6FC',

  // Neutral
  white: '#FFFFFF',
  black: '#191F28',
  gray50: '#F9FAFB',
  gray100: '#F2F4F6',
  gray200: '#E5E8EB',
  gray300: '#B0B8C1',
  gray400: '#8B95A1',
  gray500: '#6B7684',
  gray600: '#4E5968',
  gray700: '#333D4B',
  gray900: '#191F28',

  // Semantic
  green: '#00C896',
  red: '#F04452',
  orange: '#FF9800',
} as const;

// ===== 아이콘 배경색 =====
export const ICON_BG = {
  attendance: '#E8F5E9',  // 출결 - 연두
  progress: '#E3F2FD',    // 진도 - 연파랑
  homework: '#FFF3E0',    // 숙제 - 연주황
  schedule: '#F3E5F5',    // 일정 - 연보라
} as const;

// ===== Tailwind 클래스 =====
export const TW = {
  // 그라디언트
  heroGradient: 'bg-gradient-to-br from-[#3182F6] to-[#2563eb]',

  // 버튼
  btnPrimary: 'h-10 px-4 bg-white text-[#3182F6] font-semibold rounded-xl',
  btnSecondary: 'h-10 px-4 bg-white/20 text-white font-semibold rounded-xl',
  btnCta: 'h-12 w-full bg-[#3182F6] text-white font-semibold rounded-xl',
  btnGhost: 'h-10 px-4 text-[#6B7684] hover:bg-[#F2F4F6] rounded-lg',

  // 입력
  input: 'h-10 px-3 border border-[#E5E8EB] rounded-lg text-sm focus:border-[#3182F6] focus:outline-none',

  // 카드
  card: 'bg-white rounded-2xl shadow-sm',

  // 아이콘 박스
  iconBox: 'w-9 h-9 rounded-[10px] flex items-center justify-center',
  iconAttendance: 'w-9 h-9 rounded-[10px] bg-[#E8F5E9] flex items-center justify-center',
  iconProgress: 'w-9 h-9 rounded-[10px] bg-[#E3F2FD] flex items-center justify-center',
  iconHomework: 'w-9 h-9 rounded-[10px] bg-[#FFF3E0] flex items-center justify-center',
  iconSchedule: 'w-9 h-9 rounded-[10px] bg-[#F3E5F5] flex items-center justify-center',

  // 텍스트
  textPrimary: 'text-[#191F28]',
  textSecondary: 'text-[#6B7684]',
  textTertiary: 'text-[#8B95A1]',
} as const;

// ===== 크기 토큰 =====
export const SIZES = {
  inputHeight: '40px',     // h-10
  buttonHeightLg: '48px',  // h-12
  iconBox: '36px',         // w-9 h-9
  borderRadius: '12px',    // rounded-xl
  borderRadiusLg: '16px',  // rounded-2xl
} as const;

// 타입 export
export type ColorKey = keyof typeof COLORS;
export type IconBgKey = keyof typeof ICON_BG;
