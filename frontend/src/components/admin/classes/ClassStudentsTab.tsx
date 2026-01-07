/**
 * 반 학생 목록 탭
 * EditClassModal 내 탭으로 사용되는 학생 목록 컴포넌트
 */
import { useClassStudents } from '../../../hooks/useClasses';
import { ClassStudent } from '../../../api/classes';

interface ClassStudentsTabProps {
  classId: string;
}

/**
 * 전화번호 마스킹
 * @example "010-1234-5678" → "010-****-5678"
 */
function maskPhone(phone: string | null): string {
  if (!phone) return '-';
  // 다양한 형식 처리 (010-1234-5678, 01012345678 등)
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-****-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-***-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * 등록일 포맷팅
 * @example "2025-12-19T10:30:00Z" → "2025.12"
 */
function formatEnrolledAt(date: string): string {
  try {
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

/**
 * 학생 항목 컴포넌트
 */
function StudentListItem({ student }: { student: ClassStudent }) {
  return (
    <div className="flex items-center justify-between p-3 bg-grey-50 rounded-lg hover:bg-grey-100 transition-colors">
      <div className="flex items-center gap-3">
        {/* 아바타 */}
        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium shrink-0">
          {student.name[0]}
        </div>

        {/* 이름 + 학년/등록일 */}
        <div className="min-w-0">
          <div className="font-medium text-grey-900 truncate">{student.name}</div>
          <div className="text-xs text-grey-400 truncate">
            {student.grade_name || '학년 미지정'} | {formatEnrolledAt(student.enrolled_at)} 등록
          </div>
        </div>
      </div>

      {/* 연락처 (마스킹) */}
      <div className="text-sm text-grey-500 shrink-0 ml-2">
        {maskPhone(student.phone)}
      </div>
    </div>
  );
}

/**
 * 빈 상태 컴포넌트
 */
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">
        <svg className="w-12 h-12 mx-auto text-grey-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p className="text-grey-500 mb-4">등록된 학생이 없습니다</p>
      <p className="text-sm text-grey-400">
        반 배정 관리에서 학생을 추가해주세요
      </p>
    </div>
  );
}

/**
 * 로딩 스켈레톤
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-grey-50 rounded-lg">
          <div className="w-9 h-9 bg-grey-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-grey-200 rounded w-24" />
            <div className="h-3 bg-grey-200 rounded w-32" />
          </div>
          <div className="h-4 bg-grey-200 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * 반 학생 목록 탭 메인 컴포넌트
 */
export function ClassStudentsTab({ classId }: ClassStudentsTabProps) {
  const { data: students, isLoading, error } = useClassStudents(classId);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSkeleton />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            학생 목록을 불러오는데 실패했습니다
          </p>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (!students?.length) {
    return (
      <div className="p-4">
        <EmptyState />
      </div>
    );
  }

  // 학생 목록
  return (
    <div className="p-4">
      {/* 학생 수 */}
      <div className="text-sm text-grey-500 mb-3">
        총 {students.length}명
      </div>

      {/* 학생 목록 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {students.map((student) => (
          <StudentListItem key={student.id} student={student} />
        ))}
      </div>
    </div>
  );
}
