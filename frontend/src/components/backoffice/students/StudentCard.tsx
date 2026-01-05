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
 * 전화번호 버튼 컴포넌트
 */
function PhoneButton({
  phone,
  label,
  variant,
}: {
  phone: string | null;
  label: string;
  variant: 'student' | 'parent';
}) {
  if (!phone) {
    return (
      <div className="flex-1 py-2 px-3 bg-gray-100 rounded-lg text-center">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="text-sm text-gray-400">없음</div>
      </div>
    );
  }

  const formattedPhone = formatPhone(phone);
  const bgColor = variant === 'student' ? 'bg-blue-50' : 'bg-green-50';
  const textColor = variant === 'student' ? 'text-blue-600' : 'text-green-600';
  const iconColor = variant === 'student' ? 'text-blue-500' : 'text-green-500';

  return (
    <a
      href={`tel:${phone.replace(/\D/g, '')}`}
      className={`flex-1 py-2 px-3 ${bgColor} rounded-lg text-center active:opacity-70 transition-opacity`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Phone className={`w-3 h-3 ${iconColor}`} />
        <span className={`text-xs ${textColor} font-medium`}>{label}</span>
      </div>
      <div className={`text-sm font-semibold ${textColor}`}>
        {formattedPhone}
      </div>
    </a>
  );
}

export function StudentCard({ student, onClickDetail }: StudentCardProps) {
  // 이름의 첫 글자
  const initial = student.name.charAt(0);

  // 학년 표시
  const gradeText = student.grade_info?.name || '';
  const schoolText = student.school || '';
  const subInfo = [gradeText, schoolText].filter(Boolean).join(' · ');

  // 등록된 반 (최대 2개 표시)
  const classNames = student.enrolled_classes
    ?.slice(0, 2)
    .map(c => c.class_name)
    .join(', ') || '';

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* 상단: 학생 정보 + 상세 보기 버튼 */}
      <div
        onClick={onClickDetail}
        className="flex items-center gap-3 p-4 cursor-pointer active:bg-gray-50 transition-colors"
      >
        {/* 프로필 아바타 */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-blue-600">{initial}</span>
        </div>

        {/* 정보 영역 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-base">
              {student.name}
            </span>
            {gradeText && (
              <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {gradeText}
              </span>
            )}
          </div>
          {schoolText && (
            <div className="text-sm text-gray-500 mt-0.5 truncate">
              {schoolText}
            </div>
          )}
          {classNames && (
            <div className="text-xs text-gray-400 mt-0.5 truncate">
              {classNames}
            </div>
          )}
        </div>

        {/* 상세 보기 화살표 */}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>

      {/* 하단: 전화 버튼 영역 */}
      <div className="flex gap-2 px-4 pb-4">
        <PhoneButton
          phone={student.phone}
          label="학생"
          variant="student"
        />
        <PhoneButton
          phone={student.parent_phone}
          label="학부모"
          variant="parent"
        />
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
