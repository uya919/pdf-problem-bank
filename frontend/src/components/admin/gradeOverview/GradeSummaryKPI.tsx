/**
 * Phase 9-B: GradeSummaryKPI
 *
 * 선택된 학년의 요약 KPI 표시
 * - 총 학생 수
 * - 평균 진도율
 * - 숙제 제출률
 * - 금주 출석률
 *
 * 반응형:
 * - < 640px: 2열
 * - >= 640px: 4열
 */
import { Users, BookOpen, ClipboardCheck, Calendar } from 'lucide-react';
import { KPICard } from '../common/KPICard';

interface GradeSummaryKPIProps {
  grade: string;
  studentCount: number;
  averageProgressRate: number;
  homeworkSubmissionRate: number;
  attendanceRate: number;
  // 트렌드 데이터 (전주 대비)
  progressTrend?: number;
  homeworkTrend?: number;
  attendanceTrend?: number;
}

export function GradeSummaryKPI({
  grade,
  studentCount,
  averageProgressRate,
  homeworkSubmissionRate,
  attendanceRate,
  progressTrend,
  homeworkTrend,
  attendanceTrend,
}: GradeSummaryKPIProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {/* 총 학생 수 */}
      <KPICard
        title={`${grade} 총 학생`}
        value={studentCount}
        unit="명"
        icon={<Users className="w-5 h-5" />}
        color="blue"
      />

      {/* 평균 진도율 */}
      <KPICard
        title="평균 진도율"
        value={averageProgressRate}
        unit="%"
        icon={<BookOpen className="w-5 h-5" />}
        color="green"
        trend={progressTrend !== undefined ? { value: progressTrend, label: '전주 대비' } : undefined}
      />

      {/* 숙제 제출률 */}
      <KPICard
        title="숙제 제출률"
        value={homeworkSubmissionRate}
        unit="%"
        icon={<ClipboardCheck className="w-5 h-5" />}
        color="orange"
        trend={homeworkTrend !== undefined ? { value: homeworkTrend, label: '전주 대비' } : undefined}
      />

      {/* 금주 출석률 */}
      <KPICard
        title="금주 출석률"
        value={attendanceRate}
        unit="%"
        icon={<Calendar className="w-5 h-5" />}
        color="grey"
        trend={attendanceTrend !== undefined ? { value: attendanceTrend, label: '전주 대비' } : undefined}
      />
    </div>
  );
}
