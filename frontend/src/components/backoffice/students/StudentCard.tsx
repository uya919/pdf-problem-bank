/**
 * 학생 카드 컴포넌트 (모바일용, 전화번호 중심)
 *
 * 디자인 원칙:
 * - 1탭 전화 걸기: 학생/학부모 전화번호 버튼이 바로 보임
 * - 정보 계층: 이름 > 학년/학교 > 전화번호 버튼
 * - 모달로 상세 정보 (출결, 성적, 숙제)
 */
import { Phone, ChevronRight } from 'lucide-react';
import type { MyStudent } from '../../../hooks/useMyStudents';

interface StudentCardProps {
  student: MyStudent;
  onClickDetail: () => void;
}

/**
 * 전화번호 포맷팅
 * @param phone - 전화번호 (01012345678 또는 010-1234-5678)
 * @returns 포맷팅된 번호 (010-1234-5678)
 */
function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // 숫자만 추출
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Pill 스타일 상수 (스파게티 방지)
 */
const PHONE_STYLES = {
  student: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'text-blue-500' },
  parent: { bg: 'bg-green-50', text: 'text-green-600', icon: 'text-green-500' },
} as const;

/**
 * Pill 형태 전화 버튼 (Option D)
 * - 아이콘 + 라벨 + 전체 번호
 * - 전화번호 없으면 null 반환 (빈 공간으로 처리)
 */
function PhonePill({
  phone,
  label,
  variant,
}: {
  phone: string | null;
  label: string;
  variant: 'student' | 'parent';
}) {
  // 전화번호 없으면 렌더링 안 함
  if (!phone) return null;

  const styles = PHONE_STYLES[variant];
  const formattedPhone = formatPhone(phone);

  return (
    <a
      href={`tel:${phone.replace(/\D/g, '')}`}
      onClick={(e) => e.stopPropagation()}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
        ${styles.bg} active:opacity-70 transition-opacity
      `}
    >
      <Phone className={`w-3.5 h-3.5 ${styles.icon}`} />
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-medium ${styles.text}`}>
        {formattedPhone}
      </span>
    </a>
  );
}

export function StudentCard({ student, onClickDetail }: StudentCardProps) {
  // 이름의 첫 글자
  const initial = student.name.charAt(0);

  // 학년 표시
  const gradeText = student.grade_info?.name || '';
  const schoolText = student.school || '';

  // 등록된 반 (최대 2개 표시)
  const classNames = student.enrolled_classes
    ?.slice(0, 2)
    .map(c => c.class_name)
    .join(', ') || '';

  // 전화번호 유무 확인 (둘 다 없으면 오른쪽 영역 숨김)
  const hasAnyPhone = student.phone || student.parent_phone;

  return (
    <div
      onClick={onClickDetail}
      className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:bg-gray-50"
    >
      <div className="flex gap-3">
        {/* 왼쪽: 아바타 */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0 self-center">
          <span className="text-lg font-bold text-blue-600">{initial}</span>
        </div>

        {/* 중앙: 3줄 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{student.name}</span>
            {gradeText && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {gradeText}
              </span>
            )}
          </div>
          {schoolText && (
            <div className="text-sm text-gray-500 mt-0.5 truncate">{schoolText}</div>
          )}
          {classNames && (
            <div className="text-xs text-gray-400 mt-0.5 truncate">{classNames}</div>
          )}
        </div>

        {/* 오른쪽: 전화 Pill 버튼 (세로 배치) */}
        {hasAnyPhone && (
          <div className="flex flex-col gap-1.5 justify-center flex-shrink-0">
            <PhonePill phone={student.phone} label="학생" variant="student" />
            <PhonePill phone={student.parent_phone} label="학부모" variant="parent" />
          </div>
        )}

        {/* 화살표 */}
        <div className="flex items-center flex-shrink-0">
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>
      </div>
    </div>
  );
}

// 기존 호환성을 위한 레거시 타입 (점진적 마이그레이션용)
export interface LegacyStudentCardProps {
  student: {
    id: string;
    name: string;
    className?: string;
  };
  stats: {
    recentScore: number;
    scoreTrend: number;
  };
  alerts: Array<{
    type: string;
    message: string;
    severity: 'warning' | 'critical';
  }>;
  onClick: () => void;
}
