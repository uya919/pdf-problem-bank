/**
 * NoticeTypeSelector - 공지 유형 선택 컴포넌트
 *
 * Stage 17: 공지 등록 모달
 * - 7가지 공지 유형 선택
 * - 칩 형태 또는 드롭다운 형태
 */

import type { NoticeType } from '../../../types/admin';
import { NOTICE_TYPE_STYLES } from '../../../types/admin';

interface NoticeTypeSelectorProps {
  /** 선택된 유형 */
  value: NoticeType;
  /** 유형 변경 핸들러 */
  onChange: (type: NoticeType) => void;
  /** 표시 형태 */
  variant?: 'chips' | 'dropdown';
  /** 비활성화 */
  disabled?: boolean;
}

/** 공지 유형 목록 (우선순위 순서) */
const NOTICE_TYPES: NoticeType[] = [
  'urgent',
  'enrollment',
  'absence',
  'holiday',
  'exam',
  'special',
  'event',
  'operation',
];

/** 유형별 아이콘 */
const NOTICE_TYPE_ICONS: Record<NoticeType, React.ReactNode> = {
  urgent: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  enrollment: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  holiday: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  absence: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  exam: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  special: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  event: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  operation: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

/**
 * 공지 유형 선택 (칩 형태)
 */
function ChipsSelector({
  value,
  onChange,
  disabled,
}: Omit<NoticeTypeSelectorProps, 'variant'>) {
  return (
    <div className="flex flex-wrap gap-2">
      {NOTICE_TYPES.map((type) => {
        const style = NOTICE_TYPE_STYLES[type];
        const isSelected = type === value;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5
              rounded-full text-sm font-medium
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isSelected
                  ? `${style.badgeBgColor} ${style.badgeTextColor} ring-2 ring-offset-1`
                  : `${style.bgColor} ${style.textColor} hover:ring-2 hover:ring-offset-1`
              }
            `}
            style={{
              ...(isSelected && { ['--tw-ring-color' as string]: style.borderColor }),
            }}
          >
            {NOTICE_TYPE_ICONS[type]}
            <span>{style.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 공지 유형 선택 (드롭다운 형태)
 */
function DropdownSelector({
  value,
  onChange,
  disabled,
}: Omit<NoticeTypeSelectorProps, 'variant'>) {
  const selectedStyle = NOTICE_TYPE_STYLES[value];

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as NoticeType)}
        disabled={disabled}
        className={`
          w-full appearance-none
          px-4 py-2.5 pr-10
          border border-gray-200 rounded-lg
          text-sm font-medium
          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${selectedStyle.textColor}
        `}
      >
        {NOTICE_TYPES.map((type) => (
          <option key={type} value={type}>
            {NOTICE_TYPE_STYLES[type].label}
          </option>
        ))}
      </select>

      {/* 드롭다운 화살표 */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

/**
 * 공지 유형 선택기
 *
 * @example
 * ```tsx
 * const [type, setType] = useState<NoticeType>('urgent');
 *
 * <NoticeTypeSelector
 *   value={type}
 *   onChange={setType}
 *   variant="chips"
 * />
 * ```
 */
export function NoticeTypeSelector({
  value,
  onChange,
  variant = 'chips',
  disabled = false,
}: NoticeTypeSelectorProps) {
  if (variant === 'dropdown') {
    return (
      <DropdownSelector value={value} onChange={onChange} disabled={disabled} />
    );
  }

  return (
    <ChipsSelector value={value} onChange={onChange} disabled={disabled} />
  );
}

export default NoticeTypeSelector;
