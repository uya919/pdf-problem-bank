/**
 * 결과 분석 화면
 * - 통계 카드: 응시인원, 평균, 최고, 최저
 * - 점수 분포 막대그래프
 * - 오답률 TOP 5 테이블
 * - 전체 순위 테이블
 */
import { ArrowLeft, Download } from 'lucide-react';
import { useExamDetail } from '../../../hooks/useExams';
import type { ExamResult, StudentAnswer } from '../../../types/exam';

interface ExamAnalysisViewProps {
  examId: string;
  onAssign: () => void;
  onBack: () => void;
}

interface ScoreDistribution {
  label: string;
  min: number;
  max: number;
  count: number;
  percent: number;
  color: string;
}

interface WrongRateStat {
  question: number;
  wrongRate: number;
  wrongCount: number;
}

export function ExamAnalysisView({ examId, onAssign, onBack }: ExamAnalysisViewProps) {
  const { data: examDetail, isLoading } = useExamDetail(examId);

  if (isLoading || !examDetail) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { exam, answers, results } = examDetail;

  // 통계 계산
  const attendedCount = results.length;
  const scores = results.map(r => r.total_score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const topStudent = results.find(r => r.total_score === maxScore);
  const bottomStudent = results.find(r => r.total_score === minScore);

  // 점수 분포 계산
  const distribution = calculateDistribution(results);

  // 오답률 계산
  const wrongRates = calculateWrongRates(answers, exam.total_questions);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-grey-500 hover:text-grey-700 hover:bg-grey-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-grey-900">{exam.name}</h1>
            <p className="text-sm text-grey-500">결과 분석</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2.5 border border-grey-200 text-grey-600 text-sm font-medium rounded-xl hover:bg-grey-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            엑셀 내보내기
          </button>
          <button
            onClick={onAssign}
            className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors"
          >
            반배정 하기
          </button>
        </div>
      </div>

      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="응시 인원" value={attendedCount} unit="명" subtext={`전체 ${exam.total_students}명 중`} />
        <StatCard label="평균 점수" value={avgScore} unit="점" color="blue" subtext="100점 만점" />
        <StatCard label="최고 점수" value={maxScore} unit="점" color="green" subtext={topStudent?.student_name} />
        <StatCard label="최저 점수" value={minScore} unit="점" color="red" subtext={bottomStudent?.student_name} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 점수 분포 */}
        <div className="col-span-5 bg-white rounded-2xl border border-grey-200 p-5">
          <h3 className="text-sm font-semibold text-grey-900 mb-4">점수 분포</h3>
          <div className="space-y-3">
            {distribution.map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="w-20 text-sm text-grey-600">{d.label}</span>
                <div className="flex-1 h-6 bg-grey-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${d.color} rounded-full transition-all`}
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
                <span className="w-24 text-sm text-grey-900 text-right font-medium">
                  {d.count}명 ({d.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 오답률 TOP 5 */}
        <div className="col-span-7 bg-white rounded-2xl border border-grey-200 p-5">
          <h3 className="text-sm font-semibold text-grey-900 mb-4">문항별 오답률 TOP 5</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-grey-200">
                <th className="py-2 text-left text-grey-500 font-medium">순위</th>
                <th className="py-2 text-left text-grey-500 font-medium">문항</th>
                <th className="py-2 text-left text-grey-500 font-medium">오답률</th>
                <th className="py-2 text-left text-grey-500 font-medium">오답 인원</th>
              </tr>
            </thead>
            <tbody>
              {wrongRates.slice(0, 5).map((stat, idx) => (
                <tr key={stat.question} className="border-b border-grey-100">
                  <td className="py-3">
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${idx === 0 ? 'bg-red-100 text-red-600' :
                        idx === 1 ? 'bg-orange-100 text-orange-600' :
                        idx === 2 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-grey-100 text-grey-600'}
                    `}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 font-medium">{stat.question}번</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-grey-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${stat.wrongRate}%` }}
                        />
                      </div>
                      <span className="text-red-600 font-semibold">{stat.wrongRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-grey-600">{stat.wrongCount}명</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 전체 순위 테이블 */}
      <div className="mt-6 bg-white rounded-2xl border border-grey-200 p-5">
        <h3 className="text-sm font-semibold text-grey-900 mb-4">전체 순위</h3>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-grey-200">
                <th className="py-2 text-left text-grey-500 font-medium w-16">순위</th>
                <th className="py-2 text-left text-grey-500 font-medium w-24">이름</th>
                <th className="py-2 text-left text-grey-500 font-medium w-20">점수</th>
                <th className="py-2 text-left text-grey-500 font-medium">오답 문항</th>
                <th className="py-2 text-left text-grey-500 font-medium w-20">추천반</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const recommendedClass = getRecommendedClass(result.rank, results.length);

                return (
                  <tr key={result.student_id} className="border-b border-grey-100 hover:bg-grey-50">
                    <td className="py-2.5">
                      <span className={`
                        px-2 py-0.5 rounded text-xs font-semibold
                        ${result.rank <= 3 ? 'bg-yellow-100 text-yellow-700' :
                          result.rank <= 10 ? 'bg-blue-50 text-blue-600' :
                          'bg-grey-100 text-grey-600'}
                      `}>
                        {result.rank}위
                      </span>
                    </td>
                    <td className="py-2.5 font-medium">{result.student_name}</td>
                    <td className="py-2.5">
                      <span className={`font-semibold ${
                        result.total_score >= 90 ? 'text-blue-600' :
                        result.total_score >= 70 ? 'text-green-600' :
                        result.total_score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {result.total_score}점
                      </span>
                    </td>
                    <td className="py-2.5 text-grey-500">
                      {result.wrong_questions.length > 0
                        ? result.wrong_questions.slice(0, 8).join(', ') +
                          (result.wrong_questions.length > 8 ? ` 외 ${result.wrong_questions.length - 8}개` : '')
                        : '-'
                      }
                    </td>
                    <td className="py-2.5">
                      <span className={`
                        px-2 py-1 rounded text-xs font-semibold
                        ${recommendedClass === 'A' ? 'bg-blue-50 text-blue-600' :
                          recommendedClass === 'B' ? 'bg-teal-50 text-teal-600' :
                          recommendedClass === 'C' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-grey-100 text-grey-600'}
                      `}>
                        {recommendedClass}반
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  unit,
  color,
  subtext,
}: {
  label: string;
  value: number;
  unit: string;
  color?: 'blue' | 'green' | 'red';
  subtext?: string;
}) {
  const colorClass = color === 'blue' ? 'text-blue-600' :
    color === 'green' ? 'text-green-600' :
    color === 'red' ? 'text-red-500' :
    'text-grey-900';

  return (
    <div className="bg-white rounded-2xl border border-grey-200 p-5">
      <div className="text-sm text-grey-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${colorClass}`}>
        {value}<span className="text-base font-normal text-grey-400">{unit}</span>
      </div>
      {subtext && <div className="text-xs text-grey-400 mt-1">{subtext}</div>}
    </div>
  );
}

// 점수 분포 계산
function calculateDistribution(results: ExamResult[]): ScoreDistribution[] {
  const ranges = [
    { label: '90점 이상', min: 90, max: 100, color: 'bg-blue-500' },
    { label: '80~89점', min: 80, max: 89, color: 'bg-teal-500' },
    { label: '70~79점', min: 70, max: 79, color: 'bg-yellow-500' },
    { label: '60~69점', min: 60, max: 69, color: 'bg-orange-500' },
    { label: '60점 미만', min: 0, max: 59, color: 'bg-red-500' },
  ];

  const total = results.length;

  return ranges.map((range) => {
    const count = results.filter(
      r => r.total_score >= range.min && r.total_score <= range.max
    ).length;

    return {
      ...range,
      count,
      percent: Math.round((count / total) * 100),
    };
  });
}

// 문항별 오답률 계산
function calculateWrongRates(answers: StudentAnswer[], totalQuestions: number): WrongRateStat[] {
  const wrongCounts = new Array(totalQuestions).fill(0);

  answers.forEach(a => {
    a.answers.forEach((status, idx) => {
      if (status === 'wrong') wrongCounts[idx]++;
    });
  });

  const total = answers.length;

  return wrongCounts
    .map((count, idx) => ({
      question: idx + 1,
      wrongRate: Math.round((count / total) * 100),
      wrongCount: count,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate);
}

// 추천 반 계산 (비율 기준)
function getRecommendedClass(rank: number, total: number): string {
  const percentile = (rank / total) * 100;

  if (percentile <= 25) return 'A';
  if (percentile <= 50) return 'B';
  if (percentile <= 75) return 'C';
  return 'D';
}
