/**
 * Badge - 상태 뱃지 컴포넌트
 *
 * 디자인 스펙:
 * - success: 초록색 배경
 * - warning: 주황색 배경
 * - error: 빨간색 배경
 * - info: 파란색 배경
 * - neutral: 회색 배경
 */
import { COLORS } from './tokens';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: `bg-[${COLORS.green}]/10 text-[${COLORS.green}]`,
  warning: `bg-[${COLORS.orange}]/10 text-[${COLORS.orange}]`,
  error: `bg-[${COLORS.red}]/10 text-[${COLORS.red}]`,
  info: `bg-[${COLORS.primary}]/10 text-[${COLORS.primary}]`,
  neutral: `bg-[${COLORS.gray100}] text-[${COLORS.gray600}]`,
};

// Tailwind JIT용 정적 클래스
const staticStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-orange-100 text-orange-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
};

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md ${staticStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * AttendanceBadge - 출결 상태 전용 뱃지
 */
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface AttendanceBadgeProps {
  status: AttendanceStatus;
}

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: '출석',
  absent: '결석',
  late: '지각',
  excused: '사유결석',
};

const attendanceVariants: Record<AttendanceStatus, BadgeVariant> = {
  present: 'success',
  absent: 'error',
  late: 'warning',
  excused: 'info',
};

export function AttendanceBadge({ status }: AttendanceBadgeProps) {
  return (
    <Badge variant={attendanceVariants[status]}>
      {attendanceLabels[status]}
    </Badge>
  );
}
