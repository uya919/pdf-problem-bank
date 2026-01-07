/**
 * ClassDetailModal - 반별 진도/숙제 상세 보기
 *
 * 기능:
 * - 일별/주별/월별 기간 선택
 * - 날짜별 진도/숙제 테이블
 * - 요약 카드 (수업 횟수, 진도량, 숙제량, 제출률)
 * - 교재별 누적 진도
 *
 * Supabase 연동: 2024-12-14
 */
import { useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClassProgressRecords, useClassSummary } from '../../../hooks/useAdminData';
import { isSupabaseConfigured } from '../../../lib/supabase';

// Types
interface ProgressRecord {
  date: string;
  weekday: string;
  progress?: {
    textbook: string;
    pageStart: number;
    pageEnd: number;
    topic?: string;
  };
  homework?: {
    textbook: string;
    pageStart: number;
    pageEnd: number;
  };
}

interface TextbookProgress {
  name: string;
  currentPage: number;
  totalPage: number;
  color: string;
}

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: {
    id: string;
    name: string;
    teacher: string;
    studentCount: number;
    grade: string;
    // 추가 데이터 (GradeOverview에서 전달)
    textbook?: string;
    currentPage?: number;
    targetPage?: number;
    lastDate?: string;
    homework?: {
      range: string;
      dueDate: string;
      submitted: number;
      total: number;
      pending: string[];
    };
  };
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

// Mock Data 생성 함수 - classInfo 기반
function generateMockRecords(classInfo: ClassDetailModalProps['classInfo']): ProgressRecord[] {
  const { textbook, currentPage, targetPage } = classInfo;
  const baseTextbook = textbook || '수학 교재';
  const basePage = currentPage || 50;

  // 최근 3회 수업 기록 생성
  return [
    {
      date: '12/9',
      weekday: '월요일',
      progress: {
        textbook: baseTextbook,
        pageStart: basePage - 14,
        pageEnd: basePage - 11,
        topic: '단원 핵심 개념'
      },
      homework: { textbook: baseTextbook, pageStart: basePage - 10, pageEnd: basePage - 7 },
    },
    {
      date: '12/11',
      weekday: '수요일',
      progress: {
        textbook: baseTextbook,
        pageStart: basePage - 10,
        pageEnd: basePage - 5,
        topic: '응용 문제 풀이'
      },
      homework: { textbook: baseTextbook, pageStart: basePage - 4, pageEnd: basePage - 1 },
    },
    {
      date: '12/13',
      weekday: '금요일',
      progress: {
        textbook: baseTextbook,
        pageStart: basePage - 4,
        pageEnd: basePage,
        topic: '실전 문제 풀이'
      },
      homework: {
        textbook: baseTextbook,
        pageStart: basePage + 1,
        pageEnd: basePage + 4
      },
    },
  ];
}

function generateMockTextbooks(classInfo: ClassDetailModalProps['classInfo']): TextbookProgress[] {
  const { textbook, currentPage, targetPage } = classInfo;

  if (textbook && currentPage && targetPage) {
    return [
      {
        name: textbook,
        currentPage: currentPage,
        totalPage: targetPage,
        color: '#3182F6'
      },
    ];
  }

  // 기본 Mock 데이터
  return [
    { name: '수학 교재', currentPage: 94, totalPage: 180, color: '#3182F6' },
  ];
}

function generateMockSummary(classInfo: ClassDetailModalProps['classInfo']) {
  const { homework, studentCount } = classInfo;
  const submitted = homework?.submitted || 0;
  const total = homework?.total || studentCount || 8;
  const rate = total > 0 ? Math.round((submitted / total) * 100) : 100;

  return {
    classCount: 3,
    classDays: '월, 수, 금',
    weeklyProgress: 18,
    progressDiff: '+2',
    weeklyHomework: 12,
    homeworkCount: 3,
    submissionRate: rate,
    submissionCount: `${submitted}/${total}`,
  };
}

export function ClassDetailModal({ isOpen, onClose, classInfo }: ClassDetailModalProps) {
  const [period, setPeriod] = useState<PeriodType>('weekly');
  const [dateLabel, setDateLabel] = useState('12월 2주차 (12/9 ~ 12/14)');

  // 날짜 범위 계산 (이번 주 기준)
  const dateRange = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
    };
  }, []);

  // Supabase 데이터 조회
  const { data: realRecords, isLoading: recordsLoading } = useClassProgressRecords(
    isOpen ? classInfo.id : null,
    dateRange
  );
  const realSummary = useClassSummary(isOpen ? classInfo.id : null, dateRange);

  // Mock Fallback 패턴 - classInfo 기반 동적 생성
  const mockRecords = useMemo(() => generateMockRecords(classInfo), [classInfo]);
  const mockTextbooks = useMemo(() => generateMockTextbooks(classInfo), [classInfo]);
  const mockSummary = useMemo(() => generateMockSummary(classInfo), [classInfo]);

  const records = realRecords && realRecords.length > 0 ? realRecords : mockRecords;
  const summary = realSummary || mockSummary;
  const textbooks = mockTextbooks; // Supabase에서 교재 진도 조회 기능 추가 시 대체

  if (!isOpen) return null;

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    switch (newPeriod) {
      case 'daily':
        setDateLabel('12월 14일 (토)');
        break;
      case 'weekly':
        setDateLabel('12월 2주차 (12/9 ~ 12/14)');
        break;
      case 'monthly':
        setDateLabel('2024년 12월');
        break;
    }
  };

  const getPageCount = (start: number, end: number) => end - start + 1;

  // 주간 합계 계산
  const progressTotal = records.reduce((sum, r) => {
    if (r.progress) {
      return sum + getPageCount(r.progress.pageStart, r.progress.pageEnd);
    }
    return sum;
  }, 0);

  const homeworkTotal = records.reduce((sum, r) => {
    if (r.homework) {
      return sum + getPageCount(r.homework.pageStart, r.homework.pageEnd);
    }
    return sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-grey-50 rounded-2xl w-[900px] max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-grey-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-grey-600 hover:text-grey-900 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              반 목록으로
            </button>
            <div className="h-5 w-px bg-grey-200" />
            <div>
              <h2 className="text-lg font-bold text-grey-900">{classInfo.name}</h2>
              <p className="text-sm text-grey-500">{classInfo.teacher} 선생님 · {classInfo.studentCount}명</p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <div className="flex bg-grey-100 rounded-lg p-0.5">
              {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                    period === p
                      ? 'bg-white text-grey-900 shadow-sm'
                      : 'text-grey-500 hover:text-grey-700'
                  }`}
                >
                  {p === 'daily' ? '일별' : p === 'weekly' ? '주별' : '월별'}
                </button>
              ))}
            </div>

            <button className="w-7 h-7 flex items-center justify-center bg-grey-100 hover:bg-grey-200 rounded-md transition-colors">
              <ChevronLeft className="w-4 h-4 text-grey-600" />
            </button>
            <div className="px-3 py-1.5 bg-white border border-grey-200 rounded-lg text-sm text-grey-700 cursor-pointer hover:border-blue-500">
              {dateLabel}
            </div>
            <button className="w-7 h-7 flex items-center justify-center bg-grey-100 hover:bg-grey-200 rounded-md transition-colors">
              <ChevronRight className="w-4 h-4 text-grey-600" />
            </button>

            <button
              onClick={onClose}
              className="ml-2 w-8 h-8 flex items-center justify-center text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <SummaryCard
              label="수업 횟수"
              value={summary.classCount}
              unit="회"
              sub={summary.classDays}
            />
            <SummaryCard
              label="주간 진도량"
              value={summary.weeklyProgress}
              unit="p"
              sub={`목표 대비 ${summary.progressDiff}p`}
            />
            <SummaryCard
              label="주간 숙제량"
              value={summary.weeklyHomework}
              unit="p"
              sub={`${summary.homeworkCount}회 할당`}
            />
            <SummaryCard
              label="숙제 제출률"
              value={summary.submissionRate}
              unit="%"
              sub={`${summary.submissionCount}명 제출`}
            />
          </div>

          {/* Progress/Homework Table */}
          <div className="bg-white border border-grey-200 rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
              <h3 className="font-semibold text-grey-900 flex items-center gap-2">
                <span>📖</span>
                진도 및 숙제 기록
                {recordsLoading && (
                  <span className="text-xs text-grey-400 ml-2">로딩 중...</span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  isSupabaseConfigured
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {isSupabaseConfigured ? '🟢 실시간' : '🟡 Mock'}
                </span>
                <span className="text-sm text-grey-500">12월 2주차</span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left w-24">날짜</th>
                  <th className="px-5 py-3 text-left">진도</th>
                  <th className="px-5 py-3 text-left">숙제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {records.map((record, idx) => (
                  <tr key={idx} className="hover:bg-grey-50">
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-grey-900">{record.date}</div>
                      <div className="text-xs text-grey-500">{record.weekday}</div>
                    </td>
                    <td className="px-5 py-4">
                      {record.progress ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-grey-900">{record.progress.textbook}</span>
                            <span className="text-sm text-grey-600">
                              p.{record.progress.pageStart} ~ {record.progress.pageEnd}
                            </span>
                            <span className="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                              {getPageCount(record.progress.pageStart, record.progress.pageEnd)}p
                            </span>
                          </div>
                          {record.progress.topic && (
                            <div className="text-xs text-grey-500 mt-1">{record.progress.topic}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-grey-400 italic">기록 없음</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {record.homework ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-grey-900">{record.homework.textbook}</span>
                          <span className="text-sm text-grey-600">
                            p.{record.homework.pageStart} ~ {record.homework.pageEnd}
                          </span>
                          <span className="text-xs font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                            {getPageCount(record.homework.pageStart, record.homework.pageEnd)}p
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-grey-400 italic">없음</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Summary Row */}
                <tr className="bg-grey-100">
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-grey-600">주간 합계</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-lg font-bold text-blue-500">{progressTotal}p</span>
                    <span className="text-sm text-grey-500 ml-2">
                      (최상위 12p + 쎈 6p)
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-lg font-bold text-blue-500">{homeworkTotal}p</span>
                    <span className="text-sm text-grey-500 ml-2">
                      (최상위 4p + 쎈 8p)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 미제출 학생 목록 */}
          {classInfo.homework && classInfo.homework.pending.length > 0 && (
            <div className="bg-white border border-grey-200 rounded-2xl overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
                <h3 className="font-semibold text-grey-900 flex items-center gap-2">
                  <span>⚠️</span>
                  숙제 미제출 학생
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                    {classInfo.homework.pending.length}명
                  </span>
                </h3>
                <span className="text-sm text-grey-500">
                  {classInfo.homework.range} · 마감 {classInfo.homework.dueDate}
                </span>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {classInfo.homework.pending.map((studentName, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <span>👤</span>
                      {studentName}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-grey-100 flex items-center justify-between">
                  <span className="text-sm text-grey-500">
                    제출률: {Math.round((classInfo.homework.submitted / classInfo.homework.total) * 100)}%
                    ({classInfo.homework.submitted}/{classInfo.homework.total}명)
                  </span>
                  <button className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    학부모 알림 발송
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Textbook Progress */}
          <div className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
              <h3 className="font-semibold text-grey-900 flex items-center gap-2">
                <span>📚</span>
                교재별 누적 진도
              </h3>
              <span className="text-sm text-grey-500">12월 기준</span>
            </div>
            <div className="p-5">
              <div className={`grid gap-5 ${textbooks.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {textbooks.map((textbook, idx) => (
                  <TextbookCard key={idx} textbook={textbook} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub Components
function SummaryCard({ label, value, unit, sub }: { label: string; value: number; unit: string; sub: string }) {
  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      <div className="text-xs text-grey-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-grey-900">
        {value}<span className="text-sm font-medium text-grey-500 ml-0.5">{unit}</span>
      </div>
      <div className="text-xs text-grey-500 mt-1">{sub}</div>
    </div>
  );
}

function TextbookCard({ textbook }: { textbook: TextbookProgress }) {
  const progressRate = Math.round((textbook.currentPage / textbook.totalPage) * 100);

  return (
    <div className="bg-grey-50 rounded-xl p-4">
      <div className="font-semibold text-grey-900 mb-2">{textbook.name}</div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold" style={{ color: textbook.color }}>
          {textbook.currentPage}
        </span>
        <span className="text-sm text-grey-500">/ {textbook.totalPage}p</span>
      </div>
      <div className="h-2 bg-grey-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progressRate}%`, backgroundColor: textbook.color }}
        />
      </div>
      <div className="text-xs text-grey-500">진도율 {progressRate}%</div>
    </div>
  );
}
