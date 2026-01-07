/**
 * TestSection - 기간별 시험 섹션
 *
 * 목업: classes-page-v3-segment-control.html
 * - 기간별 시험 목록
 * - 시험 유형 뱃지 (Daily/Weekly/Monthly)
 * - 통계: 평균, 최고, 최저
 * - 분포 바 (상/중/하)
 */
import { useState } from 'react';
import { TestDetailBottomSheet, StudentScore } from '../modals/TestDetailBottomSheet';
import { NoteIcon, ChecklistIcon } from '../../ui/Icons';

export interface TestData {
  id: string;
  date: string; // "12/11 (수)"
  type: 'daily' | 'weekly' | 'monthly';
  range: string;
  totalScore: number;
  scores: StudentScore[];
}

interface TestSectionProps {
  tests: TestData[];
}

const TEST_TYPE_BADGES = {
  daily: { label: 'Daily', bg: 'bg-[#E3F2FD]', text: 'text-[#1565C0]' },
  weekly: { label: 'Weekly', bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]' },
  monthly: { label: 'Monthly', bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]' },
};

function calculateStats(scores: StudentScore[]) {
  if (scores.length === 0) return { average: 0, highest: 0, lowest: 0 };
  const values = scores.map((s) => s.score);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    average: Math.round(sum / values.length),
    highest: Math.max(...values),
    lowest: Math.min(...values),
  };
}

function calculateDistribution(scores: StudentScore[], totalScore: number) {
  const high = scores.filter((s) => s.score >= totalScore * 0.8).length;
  const mid = scores.filter(
    (s) => s.score >= totalScore * 0.6 && s.score < totalScore * 0.8
  ).length;
  const low = scores.filter((s) => s.score < totalScore * 0.6).length;
  return { high, mid, low, total: scores.length };
}

export function TestSection({ tests }: TestSectionProps) {
  const [detailSheet, setDetailSheet] = useState<{
    isOpen: boolean;
    test: TestData | null;
  }>({
    isOpen: false,
    test: null,
  });

  const openDetail = (test: TestData) => {
    setDetailSheet({ isOpen: true, test });
  };

  const closeDetail = () => {
    setDetailSheet((prev) => ({ ...prev, isOpen: false }));
  };

  if (tests.length === 0) {
    return (
      <div className="bg-white mx-4 mt-3 rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <NoteIcon size={18} className="text-gray-600" />
            <span className="text-sm font-semibold text-[#191F28]">시험</span>
          </div>
          <div className="text-center py-6">
            <ChecklistIcon size={28} className="text-gray-400 mx-auto" />
            <p className="text-sm text-[#8B95A1] mt-2">
              선택한 기간에 시험 기록이 없습니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white mx-4 mt-3 rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="p-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <NoteIcon size={18} className="text-gray-600" />
              <span className="text-sm font-semibold text-[#191F28]">시험</span>
            </div>
            <span className="text-xs text-[#8B95A1]">{tests.length}회 시험</span>
          </div>

          {/* 시험 목록 */}
          <div className="space-y-3">
            {tests.map((test) => {
              const stats = calculateStats(test.scores);
              const dist = calculateDistribution(test.scores, test.totalScore);
              const badge = TEST_TYPE_BADGES[test.type];

              return (
                <div
                  key={test.id}
                  className="bg-[#FAFBFC] rounded-xl p-3"
                >
                  {/* 날짜 + 유형 + 상세보기 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6B7684]">{test.date}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <button
                      onClick={() => openDetail(test)}
                      className="text-xs text-[#3182F6] font-medium hover:underline"
                    >
                      상세 →
                    </button>
                  </div>

                  {/* 범위 */}
                  <div className="text-xs text-[#8B95A1] mb-2">
                    범위: {test.range}
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#191F28]">
                        {stats.average}
                      </div>
                      <div className="text-[10px] text-[#8B95A1]">평균</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#22C55E]">
                        {stats.highest}
                      </div>
                      <div className="text-[10px] text-[#8B95A1]">최고</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-[#EF4444]">
                        {stats.lowest}
                      </div>
                      <div className="text-[10px] text-[#8B95A1]">최저</div>
                    </div>
                  </div>

                  {/* 분포 바 */}
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                    {dist.high > 0 && (
                      <div
                        className="bg-[#22C55E]"
                        style={{ width: `${(dist.high / dist.total) * 100}%` }}
                      />
                    )}
                    {dist.mid > 0 && (
                      <div
                        className="bg-[#F59E0B]"
                        style={{ width: `${(dist.mid / dist.total) * 100}%` }}
                      />
                    )}
                    {dist.low > 0 && (
                      <div
                        className="bg-[#EF4444]"
                        style={{ width: `${(dist.low / dist.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-[#8B95A1]">
                    <span>상위 {dist.high}명</span>
                    <span>중위 {dist.mid}명</span>
                    <span>하위 {dist.low}명</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 시험 상세 바텀시트 */}
      {detailSheet.test && (
        <TestDetailBottomSheet
          isOpen={detailSheet.isOpen}
          onClose={closeDetail}
          testDate={detailSheet.test.date}
          testType={detailSheet.test.type}
          testRange={detailSheet.test.range}
          totalScore={detailSheet.test.totalScore}
          scores={detailSheet.test.scores}
        />
      )}
    </>
  );
}

export default TestSection;
