/**
 * 학생 통계 요약 카드
 */
import { StudentStats, getScoreColor } from './index';

interface StudentStatsCardProps {
  stats: StudentStats;
  title?: string;
}

export function StudentStatsCard({ stats, title = '이번 달 통계' }: StudentStatsCardProps) {
  const attendanceColor =
    stats.attendanceRate >= 90
      ? 'text-[#3182F6]'
      : stats.attendanceRate >= 80
      ? 'text-[#F59E0B]'
      : 'text-[#EF4444]';

  const homeworkColor =
    stats.homeworkRate >= 80
      ? 'text-[#3182F6]'
      : stats.homeworkRate >= 50
      ? 'text-[#F59E0B]'
      : 'text-[#EF4444]';

  const scoreColor = getScoreColor(stats.averageScore);

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-5">
      <div className="text-sm font-semibold text-[#191F28] mb-4">{title}</div>
      <div className="grid grid-cols-3 gap-4">
        {/* 출석률 */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${attendanceColor}`}>
            {stats.attendanceRate}%
          </div>
          <div className="text-xs text-[#8B95A1] mt-1">출석률</div>
        </div>

        {/* 숙제 제출률 */}
        <div className="text-center border-l border-[#F2F4F6]">
          <div className={`text-2xl font-bold ${homeworkColor}`}>
            {stats.homeworkRate}%
          </div>
          <div className="text-xs text-[#8B95A1] mt-1">숙제 제출</div>
        </div>

        {/* 평균 점수 */}
        <div className="text-center border-l border-[#F2F4F6]">
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {stats.averageScore}
          </div>
          <div className="text-xs text-[#8B95A1] mt-1">평균 점수</div>
        </div>
      </div>
    </div>
  );
}
