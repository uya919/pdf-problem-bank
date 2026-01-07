/**
 * Icons - 통합 아이콘 컴포넌트
 *
 * 이모지 대신 SVG 아이콘 사용으로 플랫폼별 일관된 UI 제공
 * 라이브러리: lucide-react
 */
import {
  Calendar,
  CalendarDays,
  Circle,
  User,
  Bell,
  FileText,
  BookOpen,
  Check,
  CheckCircle,
  ClipboardList,
  MoreHorizontal,
  Home,
  Users,
  Edit,
  Book,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Ban,
  Megaphone,
  HelpCircle,
  Lock,
  Lightbulb,
  Building2,
} from 'lucide-react';

// =====================================================
// 상태 표시 아이콘
// =====================================================

interface StatusDotProps {
  status: 'online' | 'offline';
  className?: string;
}

/** 연결 상태 표시 (초록/빨간 점) */
export function StatusDot({ status, className = '' }: StatusDotProps) {
  return (
    <Circle
      className={`w-2 h-2 ${
        status === 'online'
          ? 'fill-green-500 text-green-500'
          : 'fill-red-500 text-red-500'
      } ${className}`}
    />
  );
}

// =====================================================
// 아이콘 래퍼 (크기/색상 일관성)
// =====================================================

interface IconProps {
  className?: string;
  size?: number;
}

/** 캘린더 아이콘 (📅 대체) */
export function CalendarIcon({ className = '', size = 20 }: IconProps) {
  return <Calendar className={className} size={size} />;
}

/** 월간 캘린더 아이콘 (📆 대체) */
export function CalendarMonthIcon({ className = '', size = 20 }: IconProps) {
  return <CalendarDays className={className} size={size} />;
}

/** 사용자 아이콘 (👤 대체) */
export function UserIcon({ className = '', size = 20 }: IconProps) {
  return <User className={className} size={size} />;
}

/** 알림/벨 아이콘 (🔔 대체) */
export function BellIcon({ className = '', size = 20 }: IconProps) {
  return <Bell className={className} size={size} />;
}

/** 노트/진도 아이콘 (📝 대체) */
export function NoteIcon({ className = '', size = 20 }: IconProps) {
  return <FileText className={className} size={size} />;
}

/** 체크리스트 아이콘 */
export function ChecklistIcon({ className = '', size = 20 }: IconProps) {
  return <ClipboardList className={className} size={size} />;
}

/** 책/문제은행 아이콘 (📚 대체) */
export function BookIcon({ className = '', size = 20 }: IconProps) {
  return <BookOpen className={className} size={size} />;
}

/** 체크 아이콘 (✅ 대체) */
export function CheckIcon({ className = '', size = 20 }: IconProps) {
  return <Check className={className} size={size} />;
}

/** 체크 원형 아이콘 */
export function CheckCircleIcon({ className = '', size = 20 }: IconProps) {
  return <CheckCircle className={className} size={size} />;
}

/** 경고 아이콘 (⚠ 대체) */
export function AlertIcon({ className = '', size = 20 }: IconProps) {
  return <AlertTriangle className={className} size={size} />;
}

/** 시계 아이콘 (⏳ 대체) */
export function ClockIcon({ className = '', size = 20 }: IconProps) {
  return <Clock className={className} size={size} />;
}

/** 눈 아이콘 (👁 대체) */
export function EyeIcon({ className = '', size = 20 }: IconProps) {
  return <Eye className={className} size={size} />;
}

/** 금지 아이콘 (🚫 대체) */
export function BanIcon({ className = '', size = 20 }: IconProps) {
  return <Ban className={className} size={size} />;
}

/** 확성기 아이콘 (📢 대체) */
export function MegaphoneIcon({ className = '', size = 20 }: IconProps) {
  return <Megaphone className={className} size={size} />;
}

/** 원형 아이콘 (○ 대체) */
export function CircleIcon({ className = '', size = 20 }: IconProps) {
  return <Circle className={className} size={size} />;
}

/** 물음표 아이콘 (? 대체) */
export function HelpCircleIcon({ className = '', size = 20 }: IconProps) {
  return <HelpCircle className={className} size={size} />;
}

/** 자물쇠 아이콘 (🔒 대체) */
export function LockIcon({ className = '', size = 20 }: IconProps) {
  return <Lock className={className} size={size} />;
}

/** 전구 아이콘 (💡 대체) */
export function LightbulbIcon({ className = '', size = 20 }: IconProps) {
  return <Lightbulb className={className} size={size} />;
}

/** 건물/학교 아이콘 (🏫 대체) */
export function SchoolIcon({ className = '', size = 20 }: IconProps) {
  return <Building2 className={className} size={size} />;
}

/** 눈 감음 아이콘 (🙈 대체) */
export function EyeOffIcon({ className = '', size = 20 }: IconProps) {
  return <EyeOff className={className} size={size} />;
}

// =====================================================
// 네비게이션 아이콘 (이미 SVG 사용 중이지만 통합)
// =====================================================

/** 홈 아이콘 */
export function HomeIcon({ className = '', size = 20 }: IconProps) {
  return <Home className={className} size={size} />;
}

/** 사용자들/학생 아이콘 */
export function UsersIcon({ className = '', size = 20 }: IconProps) {
  return <Users className={className} size={size} />;
}

/** 편집/기록 아이콘 */
export function EditIcon({ className = '', size = 20 }: IconProps) {
  return <Edit className={className} size={size} />;
}

/** 책/수업 아이콘 */
export function BookClosedIcon({ className = '', size = 20 }: IconProps) {
  return <Book className={className} size={size} />;
}

/** 더보기 아이콘 */
export function MoreIcon({ className = '', size = 20 }: IconProps) {
  return <MoreHorizontal className={className} size={size} />;
}

// =====================================================
// 화살표/UI 아이콘
// =====================================================

/** 아래 화살표 */
export function ChevronDownIcon({ className = '', size = 20 }: IconProps) {
  return <ChevronDown className={className} size={size} />;
}

/** 왼쪽 화살표 */
export function ChevronLeftIcon({ className = '', size = 20 }: IconProps) {
  return <ChevronLeft className={className} size={size} />;
}

/** 오른쪽 화살표 */
export function ChevronRightIcon({ className = '', size = 20 }: IconProps) {
  return <ChevronRight className={className} size={size} />;
}

/** 닫기/X 아이콘 */
export function CloseIcon({ className = '', size = 20 }: IconProps) {
  return <X className={className} size={size} />;
}

// =====================================================
// 원본 lucide 아이콘도 export (필요시 직접 사용)
// =====================================================
export {
  Calendar,
  CalendarDays,
  Circle,
  User,
  Bell,
  FileText,
  BookOpen,
  Check,
  CheckCircle,
  ClipboardList,
  MoreHorizontal,
  Home,
  Users,
  Edit,
  Book,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Ban,
  Megaphone,
  HelpCircle,
  Lock,
  Lightbulb,
  Building2,
};
