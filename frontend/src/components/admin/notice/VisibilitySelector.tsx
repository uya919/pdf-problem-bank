/**
 * VisibilitySelector - 공지 대상 선택 컴포넌트
 *
 * Stage 17: 공지 등록 모달
 * - 공지 대상 권한 선택 (전체/관리자/강사)
 */

import type { NoticeVisibility } from '../../../types/admin';

interface VisibilitySelectorProps {
  /** 선택된 대상 */
  value: NoticeVisibility;
  /** 대상 변경 핸들러 */
  onChange: (visibility: NoticeVisibility) => void;
  /** 비활성화 */
  disabled?: boolean;
  /** 에러 메시지 */
  error?: string;
}

/** 대상 옵션 정보 */
const VISIBILITY_OPTIONS: {
  value: NoticeVisibility;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'all',
    label: '전체',
    description: '관리자와 강사 모두 볼 수 있음',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'admin',
    label: '관리자 전용',
    description: '관리자만 볼 수 있음',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    value: 'teacher',
    label: '강사 전용',
    description: '담당 강사만 볼 수 있음',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

/**
 * 공지 대상 선택기
 *
 * @example
 * ```tsx
 * const [visibility, setVisibility] = useState<NoticeVisibility>('all');
 *
 * <VisibilitySelector
 *   value={visibility}
 *   onChange={setVisibility}
 * />
 * ```
 */
export function VisibilitySelector({
  value,
  onChange,
  disabled = false,
  error,
}: VisibilitySelectorProps) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {VISIBILITY_OPTIONS.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-1.5
                px-3 py-3 rounded-xl
                border-2 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* 아이콘 */}
              <div
                className={`
                  p-2 rounded-lg
                  ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                `}
              >
                {option.icon}
              </div>

              {/* 라벨 */}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* 선택된 옵션 설명 */}
      <p className="mt-2 text-xs text-gray-500">
        {VISIBILITY_OPTIONS.find((o) => o.value === value)?.description}
      </p>

      {/* 에러 메시지 */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default VisibilitySelector;
