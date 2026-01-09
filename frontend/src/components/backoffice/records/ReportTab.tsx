/**
 * ReportTab - 주간 학생 리포트 탭
 *
 * Stage 58: 강사가 주담임 학생에 대해 주간 평가 작성
 *
 * 기능:
 * 1. 오늘 작성할 학생 목록 표시 (Round-robin 배정)
 * 2. 진행률 카드 (N/M명 완료)
 * 3. 학생 카드 클릭 → ReportModal 열기
 */
import { useState } from 'react';
import { CheckCircle, FileText, ChevronRight, Users } from 'lucide-react';
import {
  useHomeroomStudents,
  useTodayReportStudents,
  useWeeklyReports,
  useReportProgress,
  getWeekStart,
  getTodayDayIndex,
  type HomeroomStudent,
  type WeeklyReport,
} from '../../../hooks/backoffice/useWeeklyReports';
import { ReportModal } from '../modals/ReportModal';
import type { TabProps } from './types';

// =====================================================
// 진행률 카드
// =====================================================

interface ProgressCardProps {
  completed: number;
  total: number;
  percentage: number;
}

function ProgressCard({ completed, total, percentage }: ProgressCardProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">오늘의 기록</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {completed}/{total}명
          </div>
          <div className="text-xs text-gray-500 mt-0.5">완료</div>
        </div>
        <div className="relative w-16 h-16">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#E9D5FF"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#9333EA"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 1.76} 176`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-purple-600">{percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 학생 리포트 카드
// =====================================================

interface StudentCardProps {
  student: HomeroomStudent;
  report: WeeklyReport | undefined;
  onClick: () => void;
}

function StudentReportCard({ student, report, onClick }: StudentCardProps) {
  const isDraft = report?.is_draft ?? true;
  const isCompleted = report && !isDraft;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
        isCompleted
          ? 'bg-green-50 border border-green-200'
          : 'bg-white border border-gray-100 hover:border-purple-200 hover:shadow-sm'
      }`}
    >
      {/* 상태 아이콘 */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-100' : 'bg-purple-100'
        }`}
      >
        {isCompleted ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <span className="text-lg font-bold text-purple-600">
            {student.name.charAt(0)}
          </span>
        )}
      </div>

      {/* 학생 정보 */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{student.name}</span>
          {student.grade_name && (
            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {student.grade_name}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {student.class_name}
          {student.school && ` · ${student.school}`}
        </div>
      </div>

      {/* 상태 배지 + 화살표 */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted ? (
          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
            완료
          </span>
        ) : report ? (
          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
            작성중
          </span>
        ) : (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            미작성
          </span>
        )}
        <ChevronRight className="w-5 h-5 text-gray-300" />
      </div>
    </button>
  );
}

// =====================================================
// 빈 상태
// =====================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

// =====================================================
// 요일 표시
// =====================================================

const DAY_NAMES = ['월', '화', '수', '목', '금'];

function getDayLabel(dayIndex: number): string {
  if (dayIndex < 0 || dayIndex > 4) return '주말';
  return `${DAY_NAMES[dayIndex]}요일`;
}

// =====================================================
// 메인 컴포넌트
// =====================================================

export function ReportTab({ teacherId }: TabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<HomeroomStudent | null>(null);

  const dayIndex = getTodayDayIndex();
  const weekStart = getWeekStart();

  // 데이터 조회
  const { data: allStudents, isLoading: loadingStudents } = useHomeroomStudents(teacherId);
  const todayStudents = useTodayReportStudents(allStudents, dayIndex);
  const { data: reports, isLoading: loadingReports } = useWeeklyReports(teacherId, weekStart);
  const progress = useReportProgress(todayStudents, reports);

  // 학생별 리포트 매핑
  const reportMap = new Map(reports?.map(r => [r.student_id, r]));

  const handleSelectStudent = (student: HomeroomStudent) => {
    setSelectedStudent(student);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedStudent(null);
  };

  // 로딩 상태
  if (loadingStudents || loadingReports) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  // 주말인 경우
  if (dayIndex < 0 || dayIndex > 4) {
    return (
      <EmptyState message="주말에는 리포트 작성이 없습니다" />
    );
  }

  // 주담임 학생이 없는 경우
  if (!allStudents?.length) {
    return (
      <EmptyState message="주담임으로 배정된 학생이 없습니다" />
    );
  }

  // 오늘 배정된 학생이 없는 경우
  if (!todayStudents.length) {
    return (
      <EmptyState message={`${getDayLabel(dayIndex)}에 배정된 학생이 없습니다`} />
    );
  }

  return (
    <div className="space-y-4">
      {/* 진행률 카드 */}
      <ProgressCard
        completed={progress.completed}
        total={progress.total}
        percentage={progress.percentage}
      />

      {/* 오늘 배정 학생 헤더 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-gray-900">
          {getDayLabel(dayIndex)} 학생
        </h3>
        <span className="text-sm text-gray-500">
          전체 {allStudents.length}명 중 {todayStudents.length}명
        </span>
      </div>

      {/* 학생 목록 */}
      <div className="space-y-2">
        {todayStudents.map(student => (
          <StudentReportCard
            key={student.id}
            student={student}
            report={reportMap.get(student.id)}
            onClick={() => handleSelectStudent(student)}
          />
        ))}
      </div>

      {/* 리포트 모달 */}
      <ReportModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        student={selectedStudent}
        weekStart={weekStart}
        teacherId={teacherId}
      />
    </div>
  );
}
