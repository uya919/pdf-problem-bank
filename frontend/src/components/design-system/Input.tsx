/**
 * Input - 40px 높이 통일 입력 컴포넌트
 *
 * 디자인 스펙:
 * - 높이: 40px (h-10)
 * - 테두리: gray-200
 * - 포커스: primary 컬러
 */
import { TW } from './tokens';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'tel' | 'email';
  disabled?: boolean;
  className?: string;
}

export function Input({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  disabled = false,
  className = '',
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${TW.input} w-full ${
        disabled ? 'bg-[#F2F4F6] cursor-not-allowed' : 'bg-white'
      } ${className}`}
    />
  );
}

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  className?: string;
}

export function TextArea({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  disabled = false,
  className = '',
}: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`px-3 py-2 border border-[#E5E8EB] rounded-lg text-sm focus:border-[#3182F6] focus:outline-none w-full resize-none ${
        disabled ? 'bg-[#F2F4F6] cursor-not-allowed' : 'bg-white'
      } ${className}`}
    />
  );
}
