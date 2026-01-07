/**
 * 성적 추이 차트 컴포넌트
 */
import { ScoreRecord } from './index';

interface ScoreChartProps {
  scores: ScoreRecord[];
  classAverage?: number;
  maxScore?: number;
}

export function ScoreChart({
  scores,
  classAverage,
  maxScore = 100,
}: ScoreChartProps) {
  // 최근 5개만 표시
  const recentScores = scores.slice(-5);

  // 점수에 따른 바 색상
  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-[#3182F6]';
    if (score >= 70) return 'bg-[#F59E0B]';
    return 'bg-[#EF4444]';
  };

  // 날짜 포맷 (MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#191F28]">성적 추이</div>
        <div className="text-xs text-[#8B95A1]">최근 {recentScores.length}회</div>
      </div>

      {recentScores.length > 0 ? (
        <>
          {/* 막대 그래프 */}
          <div className="flex items-end justify-between h-32 gap-2">
            {recentScores.map((record, idx) => {
              const heightPercent = (record.score / maxScore) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full ${getBarColor(record.score)} rounded-t transition-all`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <div className="text-xs text-[#8B95A1] mt-2">
                    {formatDate(record.date)}
                  </div>
                  <div className="text-xs font-medium text-[#191F28]">
                    {record.score}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 반 평균 라인 */}
          {classAverage && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[#F2F4F6]">
              <div className="w-4 h-0.5 bg-[#8B95A1]" />
              <div className="text-xs text-[#8B95A1]">
                반 평균: {classAverage}점
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="h-32 flex items-center justify-center text-sm text-[#8B95A1]">
          시험 기록이 없습니다
        </div>
      )}
    </div>
  );
}
