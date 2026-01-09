/**
 * StudentRow - 학생 테이블 행 컴포넌트
 *
 * 테이블에서는 핵심 정보만 표시 (출석률/숙제/평균은 모달에서만)
 */
import { MessageSquare } from 'lucide-react';
import type { StudentWithEnrollments } from '../../../types/database';
import type { MockStudent } from './types';
import { SubjectBadges } from './SubjectBadges';
import { getGradeString, getSubjectEnrollments } from './utils';

interface StudentRowProps {
  student: MockStudent | StudentWithEnrollments;
  onClick: () => void;
  onConsultation: () => void;
}

export function StudentRow({ student, onClick, onConsultation }: StudentRowProps) {
  const statusConfig = {
    active: { label: '재원', color: 'bg-green-100 text-green-700' },
    inactive: { label: '휴원', color: 'bg-orange-100 text-orange-700' },
    graduated: { label: '졸업', color: 'bg-blue-100 text-blue-700' },
  };

  // Supabase: is_active boolean, Mock: status string
  const studentStatus =
    'is_active' in student ? (student.is_active ? 'active' : 'inactive') : student.status || 'active';
  const config = statusConfig[studentStatus as keyof typeof statusConfig] || statusConfig.active;

  // 과목별 배정 정보 (Mock/Supabase 모두 지원)
  const subjectEnrollments = getSubjectEnrollments(student);

  return (
    <tr className="hover:bg-grey-50 cursor-pointer" onClick={onClick}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-grey-200 flex items-center justify-center text-grey-600 font-medium">
            {student.name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-grey-900">{student.name}</div>
            <div className="text-sm text-grey-500">{student.phone || '-'}</div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="text-grey-900">{getGradeString(student) || '-'}</div>
        <div className="text-sm text-grey-500">{student.school || '-'}</div>
      </td>
      <td className="px-5 py-4">
        <SubjectBadges subjectEnrollments={subjectEnrollments} />
      </td>
      <td className="px-5 py-4">
        <span className={`px-2 py-1 text-xs font-medium rounded ${config.color}`}>{config.label}</span>
      </td>
      <td className="px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onConsultation();
            }}
            className="p-1.5 text-grey-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="상담 기록"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          >
            상세
          </button>
        </div>
      </td>
    </tr>
  );
}
