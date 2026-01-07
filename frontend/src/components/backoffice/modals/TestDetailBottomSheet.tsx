/**
 * TestDetailBottomSheet - 시험 상세 바텀시트
 *
 * 목업: classes-page-v3-segment-control.html
 * - 학생별 점수 목록
 * - 점수 바 시각화
 * - 색상: 상위(녹색), 중위(황색), 하위(적색)
 */
import { useEffect } from 'react';

export interface StudentScore {
  studentId: string;
  studentName: string;
  score: number;
}

interface TestDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  testDate: string;
  testType: 'daily' | 'weekly' | 'monthly';
  testRange: string;
  totalScore: number;
  scores: StudentScore[];
}

const TEST_TYPE_LABELS = {
  daily: 'Daily Test',
  weekly: 'Weekly Test',
  monthly: 'Monthly Test',
};

export function TestDetailBottomSheet({
  isOpen,
  onClose,
  testDate,
  testType,
  testRange,
  totalScore,
  scores,
}: TestDetailBottomSheetProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 점수 정렬 (높은 순)
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  // 점수에 따른 색상
  const getScoreColor = (score: number) => {
    const percentage = (score / totalScore) * 100;
    if (percentage >= 80) return { bg: 'bg-[#F0FDF4]', bar: 'bg-[#22C55E]', text: 'text-[#22C55E]' };
    if (percentage >= 60) return { bg: 'bg-[#FFFBEB]', bar: 'bg-[#F59E0B]', text: 'text-[#F59E0B]' };
    return { bg: 'bg-[#FEF2F2]', bar: 'bg-[#EF4444]', text: 'text-[#EF4444]' };
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 바텀시트 */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 (sticky) */}
        <div className="sticky top-0 bg-white pt-3 pb-2 px-5 border-b border-[#F2F4F6]">
          <div className="w-12 h-1 bg-[#D1D5DB] rounded-full mx-auto" />
          <h3 className="text-lg font-bold text-[#191F28] mt-3">
            {testDate} {TEST_TYPE_LABELS[testType]} 결과
          </h3>
          <p className="text-xs text-[#8B95A1]">범위: {testRange}</p>
        </div>

        {/* 점수 목록 */}
        <div className="px-5 py-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            {sortedScores.map((student) => {
              const colors = getScoreColor(student.score);
              const percentage = (student.score / totalScore) * 100;

              return (
                <div
                  key={student.studentId}
                  className={`flex items-center justify-between p-3 rounded-xl ${colors.bg}`}
                >
                  <span className="text-sm text-[#333D4B]">
                    {student.studentName}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[#E5E8EB] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${colors.text}`}>
                      {student.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 닫기 버튼 */}
        <div className="px-5 pb-8">
          <button
            onClick={onClose}
            className="w-full py-3 text-[#8B95A1] text-sm"
          >
            닫기
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease;
        }
      `}</style>
    </div>
  );
}

export default TestDetailBottomSheet;
