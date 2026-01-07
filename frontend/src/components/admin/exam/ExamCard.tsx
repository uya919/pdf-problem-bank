/**
 * 시험 카드 컴포넌트
 * - 시험 기본 정보 표시
 * - 상태 뱃지 (입력중/완료)
 * - 클릭 시 상세로 이동
 */
import {
  Exam,
  SUBJECT_LABELS,
  SUBJECT_COLORS,
  EXAM_STATUS_LABELS,
} from '../../../types/exam';

interface ExamCardProps {
  exam: Exam;
  onClick: () => void;
}

export function ExamCard({ exam, onClick }: ExamCardProps) {
  const subjectColor = SUBJECT_COLORS[exam.subject];
  const statusLabel = EXAM_STATUS_LABELS[exam.status];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-grey-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      {/* 헤더: 아이콘 + 시험명 + 상태 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${exam.status === 'completed' ? 'bg-blue-50' : 'bg-yellow-50'} rounded-xl flex items-center justify-center`}>
            <span className="text-lg">
              {exam.status === 'completed' ? '📊' : '📝'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-grey-900">{exam.name}</h3>
            <p className="text-sm text-grey-500">{exam.exam_date}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 ${statusLabel.bgColor} ${statusLabel.textColor} text-xs font-medium rounded-full flex items-center gap-1.5`}>
            {exam.status === 'scoring' && (
              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
            )}
            {statusLabel.label}
          </span>
          {exam.class_assignments && exam.class_assignments.length > 0 && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
              반배정 완료
            </span>
          )}
        </div>
      </div>

      {/* 정보: 과목, 문항수, 응시인원, 평균 */}
      <div className="flex items-center gap-6 text-sm text-grey-600 mb-4">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 ${subjectColor.dot} rounded-full`} />
          {SUBJECT_LABELS[exam.subject]}
        </span>
        <span>{exam.total_questions}문항</span>
        <span>응시 {exam.attended_count || 0}/{exam.total_students || 0}명</span>
        <span className={exam.average_score !== undefined ? 'font-medium text-grey-900' : 'text-grey-400'}>
          {exam.average_score !== undefined ? `평균 ${exam.average_score}점` : '평균 -'}
        </span>
      </div>

      {/* 진행률 바 (입력 중일 때만) */}
      {exam.status === 'scoring' && exam.input_progress !== undefined && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-grey-500 mb-1.5">
            <span>성적 입력 진행률</span>
            <span className="font-medium text-blue-600">
              {Math.round((exam.input_progress / 100) * (exam.total_students || 0))}/{exam.total_students || 0}명 ({exam.input_progress}%)
            </span>
          </div>
          <div className="w-full h-2 bg-grey-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${exam.input_progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 반배정 결과 */}
      {exam.class_assignments && exam.class_assignments.length > 0 && (
        <div className="flex items-center gap-2">
          {exam.class_assignments.map((assignment) => {
            const colorMap: Record<string, string> = {
              A: 'bg-blue-50 text-blue-600',
              B: 'bg-teal-50 text-teal-600',
              C: 'bg-yellow-50 text-yellow-700',
              D: 'bg-grey-100 text-grey-600',
            };
            const colorClass = colorMap[assignment.className] || 'bg-grey-100 text-grey-600';

            return (
              <span
                key={assignment.className}
                className={`px-3 py-1.5 ${colorClass} text-xs font-semibold rounded-lg`}
              >
                {assignment.className}반 {assignment.count}명
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
