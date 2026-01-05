/**
 * 학생 테이블 컴포넌트 (PC/태블릿용)
 *
 * 테이블 형태로 학생 목록을 표시
 * 전화번호 복사 버튼 제공
 */
import { useState } from 'react';
import { Copy, Check, Phone, ChevronRight } from 'lucide-react';
import type { MyStudent } from '../../../hooks/useMyStudents';

interface StudentTableProps {
  students: MyStudent[];
  onClickDetail: (student: MyStudent) => void;
}

/**
 * 전화번호 포맷팅
 */
function formatPhone(phone: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * 복사 버튼 컴포넌트
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text.replace(/\D/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-md transition-colors ${
        copied
          ? 'bg-green-100 text-green-600'
          : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
      }`}
      title={copied ? '복사됨!' : '전화번호 복사'}
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

/**
 * 전화번호 셀 컴포넌트
 */
function PhoneCell({
  phone,
  variant,
}: {
  phone: string | null;
  variant: 'student' | 'parent';
}) {
  if (!phone) {
    return <span className="text-gray-400">-</span>;
  }

  const formattedPhone = formatPhone(phone);
  const textColor = variant === 'student' ? 'text-blue-600' : 'text-green-600';

  return (
    <div className="flex items-center gap-2">
      <Phone className={`w-3.5 h-3.5 ${textColor} opacity-60`} />
      <span className={`font-medium ${textColor}`}>{formattedPhone}</span>
      <CopyButton text={phone} />
    </div>
  );
}

export function StudentTable({ students, onClickDetail }: StudentTableProps) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              학생
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              학년
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              학교
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              학생 연락처
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              학부모 연락처
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              반
            </th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {students.map((student) => (
            <tr
              key={student.id}
              onClick={() => onClickDetail(student)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              {/* 학생 이름 */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">
                      {student.name.charAt(0)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">{student.name}</span>
                </div>
              </td>

              {/* 학년 */}
              <td className="px-4 py-4">
                {student.grade_info?.name ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {student.grade_info.name}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>

              {/* 학교 */}
              <td className="px-4 py-4 text-sm text-gray-600">
                {student.school || <span className="text-gray-400">-</span>}
              </td>

              {/* 학생 연락처 */}
              <td className="px-4 py-4">
                <PhoneCell phone={student.phone} variant="student" />
              </td>

              {/* 학부모 연락처 */}
              <td className="px-4 py-4">
                <PhoneCell phone={student.parent_phone} variant="parent" />
              </td>

              {/* 반 */}
              <td className="px-4 py-4 text-sm text-gray-600">
                {student.enrolled_classes && student.enrolled_classes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {student.enrolled_classes.slice(0, 2).map((cls) => (
                      <span
                        key={cls.class_id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
                      >
                        {cls.class_name}
                      </span>
                    ))}
                    {student.enrolled_classes.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{student.enrolled_classes.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>

              {/* 상세 보기 */}
              <td className="px-4 py-4">
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 빈 상태 */}
      {students.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          학생이 없습니다
        </div>
      )}
    </div>
  );
}
