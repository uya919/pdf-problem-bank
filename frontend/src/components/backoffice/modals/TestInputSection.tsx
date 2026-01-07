/**
 * TestInputSection - 시험 점수 입력 섹션
 *
 * ProgressModal 내에서 사용
 * - 시험 토글
 * - Daily/Weekly/Monthly 선택
 * - 학생별 점수 입력 그리드
 */
import { useState, useEffect } from 'react';
import type {
  TestType,
  StudentScore,
  TestStats,
} from '../../../types/test';
import {
  TEST_TYPE_LABELS,
  calculateTestStats,
  getScoreGrade,
} from '../../../types/test';

interface TestInputSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  testType: TestType;
  onTestTypeChange: (type: TestType) => void;
  range: string;
  onRangeChange: (range: string) => void;
  totalScore: number;
  onTotalScoreChange: (score: number) => void;
  students: StudentScore[];
  onScoreChange: (studentId: string, score: number | null) => void;
}

export function TestInputSection({
  enabled,
  onToggle,
  testType,
  onTestTypeChange,
  range,
  onRangeChange,
  totalScore,
  onTotalScoreChange,
  students,
  onScoreChange,
}: TestInputSectionProps) {
  const [stats, setStats] = useState<TestStats>({
    count: 0,
    total: 0,
    average: null,
    highest: null,
    lowest: null,
  });

  // 통계 계산
  useEffect(() => {
    setStats(calculateTestStats(students));
  }, [students]);

  return (
    <div className="bg-white border border-[#E5E8EB] rounded-xl p-3.5">
      {/* 토글 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[15px]">📊</span>
          <span className="text-[15px] font-semibold text-[#191F28]">시험</span>
          <span className="text-xs text-[#8B95A1]">점수 기록</span>
        </div>
        <ToggleSwitch checked={enabled} onChange={onToggle} />
      </div>

      {/* 시험 콘텐츠 (토글 ON시 표시) */}
      {enabled && (
        <div className="mt-4 animate-slideDown">
          {/* 시험 유형 선택 */}
          <div className="mb-4">
            <label className="text-xs font-medium text-[#6B7684] mb-2 block">
              시험 유형
            </label>
            <TestTypeSelector value={testType} onChange={onTestTypeChange} />
          </div>

          {/* 시험 범위 입력 */}
          <div className="mb-4">
            <label className="text-xs font-medium text-[#6B7684] mb-2 block">
              시험 범위
            </label>
            <input
              type="text"
              value={range}
              onChange={(e) => onRangeChange(e.target.value)}
              placeholder="예: 이차방정식 p.40-50"
              className="w-full h-10 px-3 border border-[#E5E8EB] rounded-lg text-sm text-[#191F28] focus:outline-none focus:border-[#3182F6]"
            />
          </div>

          {/* 총점 설정 */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs font-medium text-[#6B7684]">총점</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={totalScore}
                onChange={(e) => onTotalScoreChange(Number(e.target.value) || 100)}
                className="w-16 h-9 text-center border border-[#E5E8EB] rounded-lg text-sm font-semibold text-[#191F28] focus:outline-none focus:border-[#3182F6]"
              />
              <span className="text-sm text-[#8B95A1]">점</span>
            </div>
          </div>

          {/* 학생별 점수 입력 */}
          <div className="border-t border-[#F2F4F6] pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#6B7684]">
                학생별 점수
              </span>
              <span className="text-[11px] text-[#8B95A1]">
                {students.length}명
              </span>
            </div>

            {/* 학생 목록 그리드 */}
            <div className="grid grid-cols-2 gap-2">
              {students.map((student) => (
                <StudentScoreInput
                  key={student.studentId}
                  student={student}
                  totalScore={totalScore}
                  onChange={(score) => onScoreChange(student.studentId, score)}
                />
              ))}
            </div>

            {/* 입력 통계 */}
            <ScoreStatsBar stats={stats} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ToggleSwitch - iOS 스타일 토글
 */
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        relative w-11 h-[26px] rounded-full transition-colors duration-200
        ${checked ? 'bg-[#3182F6]' : 'bg-[#D5D8DC]'}
      `}
    >
      <span
        className={`
          absolute top-[3px] left-[3px] w-5 h-5 bg-white rounded-full shadow-sm
          transition-transform duration-200
          ${checked ? 'translate-x-[18px]' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

/**
 * TestTypeSelector - Daily/Weekly/Monthly 탭
 */
function TestTypeSelector({
  value,
  onChange,
}: {
  value: TestType;
  onChange: (type: TestType) => void;
}) {
  const types: TestType[] = ['daily', 'weekly', 'monthly'];

  return (
    <div className="flex gap-1 bg-[#F2F4F6] rounded-lg p-1">
      {types.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`
            flex-1 py-2 rounded-md text-[12px] font-medium transition-all
            ${
              value === type
                ? 'bg-white text-[#191F28] shadow-sm'
                : 'text-[#8B95A1] hover:bg-white/50'
            }
          `}
        >
          {TEST_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}

/**
 * StudentScoreInput - 학생별 점수 입력
 */
function StudentScoreInput({
  student,
  totalScore,
  onChange,
}: {
  student: StudentScore;
  totalScore: number;
  onChange: (score: number | null) => void;
}) {
  const hasScore = student.score !== null;
  const grade = hasScore ? getScoreGrade(student.score!, totalScore) : null;

  // 등급별 스타일
  const gradeStyles = {
    high: 'border-[#3182F6] text-[#3182F6] bg-[#EBF4FF]',
    mid: 'border-[#3182F6] text-[#3182F6] bg-[#EBF4FF]',
    low: 'border-[#E65100] text-[#E65100] bg-[#FFF3E0]',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onChange(null);
    } else {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0 && num <= totalScore) {
        onChange(num);
      }
    }
  };

  return (
    <div className="flex items-center justify-between bg-[#F9FAFB] rounded-lg px-3 py-2.5">
      <span className="text-[13px] text-[#333D4B]">{student.studentName}</span>
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={student.score ?? ''}
          onChange={handleChange}
          placeholder="-"
          className={`
            w-12 h-7 text-center border rounded text-[13px] font-semibold
            focus:outline-none focus:border-[#3182F6]
            ${
              hasScore && grade
                ? gradeStyles[grade]
                : 'border-[#E5E8EB] text-[#191F28] bg-white'
            }
          `}
        />
        <span className="text-[11px] text-[#8B95A1]">점</span>
      </div>
    </div>
  );
}

/**
 * ScoreStatsBar - 입력 통계 바
 */
function ScoreStatsBar({ stats }: { stats: TestStats }) {
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F2F4F6]">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#8B95A1]">입력완료</span>
        <span className="text-[13px] font-semibold text-[#3182F6]">
          {stats.count}/{stats.total}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#6B7684]">
        <span>
          평균{' '}
          <strong className="text-[#191F28]">
            {stats.average ?? '-'}
          </strong>
          점
        </span>
        <span>
          최고{' '}
          <strong className="text-[#2E7D32]">
            {stats.highest ?? '-'}
          </strong>
          점
        </span>
        <span>
          최저{' '}
          <strong className="text-[#E65100]">
            {stats.lowest ?? '-'}
          </strong>
          점
        </span>
      </div>
    </div>
  );
}

export default TestInputSection;
