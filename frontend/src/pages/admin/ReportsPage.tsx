/**
 * Phase 7: ReportsPage (Supabase 연동)
 *
 * 리포트 페이지
 * - 주간/월간 통계
 * - 반별 진도 현황
 * - 학생 성적 추이
 * - 출결 통계
 */
import { useState, useMemo, ReactNode } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  useClasses,
  useStudents,
  useDashboardStats,
} from '../../hooks/useBackofficeData';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  BarChart3,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Download,
  Link,
  AlertTriangle,
  AlertCircle,
  FileText,
  ClipboardList,
} from 'lucide-react';

// ============================================
// Types
// ============================================

type ReportPeriod = 'week' | 'month' | 'quarter';
type ReportType = 'overview' | 'progress' | 'attendance' | 'scores';

// ============================================
// Main Component
// ============================================

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [reportType, setReportType] = useState<ReportType>('overview');

  // Supabase 데이터 조회
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: classes, isLoading: classesLoading } = useClasses({ status: 'active' });
  const { data: students, isLoading: studentsLoading } = useStudents({ status: 'active' });

  const isLoading = statsLoading || classesLoading || studentsLoading;

  // 기간별 날짜 계산
  const dateRange = useMemo(() => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let start: string;

    switch (period) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        start = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        start = monthAgo.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(today.getMonth() - 3);
        start = quarterAgo.toISOString().split('T')[0];
        break;
      default:
        start = end;
    }

    return { start, end };
  }, [period]);

  // Supabase 미설정 시 안내
  if (!isSupabaseConfigured) {
    return (
      <AdminLayoutV5>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Link className="w-16 h-16 text-grey-400" />
            </div>
            <h2 className="text-xl font-bold text-grey-900 mb-2">Supabase 연결 필요</h2>
            <p className="text-grey-500">
              .env.local 파일에 Supabase 환경 변수를 설정해주세요.
            </p>
          </div>
        </div>
      </AdminLayoutV5>
    );
  }

  const periodLabels = {
    week: '주간',
    month: '월간',
    quarter: '분기',
  };

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="리포트"
          description="학원 운영 현황을 분석합니다"
          actions={
            <div className="flex items-center gap-3">
              {/* 기간 선택 */}
              <div className="flex bg-grey-100 rounded-lg p-0.5">
                {(['week', 'month', 'quarter'] as ReportPeriod[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      period === p
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>

              <button className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                PDF 내보내기
              </button>
            </div>
          }
        />

        {/* 리포트 타입 탭 */}
        <div className="flex gap-2">
          {[
            { id: 'overview' as const, label: '종합', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'progress' as const, label: '진도', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'attendance' as const, label: '출결', icon: <CheckCircle className="w-4 h-4" /> },
            { id: 'scores' as const, label: '성적', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                reportType === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        {isLoading ? (
          <div className="bg-white border border-grey-200 rounded-2xl p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            리포트 생성 중...
          </div>
        ) : (
          <>
            {reportType === 'overview' && (
              <OverviewReport
                stats={stats}
                classes={classes || []}
                students={students || []}
                dateRange={dateRange}
                period={period}
              />
            )}
            {reportType === 'progress' && (
              <ProgressReport classes={classes || []} dateRange={dateRange} />
            )}
            {reportType === 'attendance' && (
              <AttendanceReport stats={stats} classes={classes || []} dateRange={dateRange} />
            )}
            {reportType === 'scores' && (
              <ScoresReport classes={classes || []} dateRange={dateRange} />
            )}
          </>
        )}
      </div>
    </AdminLayoutV5>
  );
}

// ============================================
// Report Sections
// ============================================

function OverviewReport({
  stats,
  classes,
  students,
  dateRange,
  period,
}: {
  stats: ReturnType<typeof useDashboardStats>['data'];
  classes: { id: string; name: string; subject: string }[];
  students: { id: string; name: string; is_active?: boolean; status?: string }[];
  dateRange: { start: string; end: string };
  period: ReportPeriod;
}) {
  const periodLabel = period === 'week' ? '주간' : period === 'month' ? '월간' : '분기';

  return (
    <div className="space-y-6">
      {/* 핵심 지표 */}
      <section className="bg-white border border-grey-200 rounded-2xl p-6">
        <h3 className="font-semibold text-grey-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-grey-400" />
          {periodLabel} 핵심 지표
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <MetricBox
            label="총 학생 수"
            value={stats?.totalStudents || 0}
            unit="명"
            trend="+3"
            trendLabel="지난 주 대비"
          />
          <MetricBox
            label="진행 중 반"
            value={stats?.totalClasses || 0}
            unit="개"
          />
          <MetricBox
            label="평균 출석률"
            value={stats?.todayAttendance?.total ? Math.round((stats.todayAttendance.present / stats.todayAttendance.total) * 100) : 95}
            unit="%"
            trend="+2"
            positive
          />
          <MetricBox
            label="이번 주 숙제"
            value={stats?.weekHomeworkCount || 0}
            unit="건"
          />
        </div>
      </section>

      {/* 반별 현황 요약 */}
      <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-grey-100">
          <h3 className="font-semibold text-grey-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-grey-400" />
            반별 현황 요약
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-4">
            {classes.slice(0, 6).map((cls) => (
              <div key={cls.id} className="bg-grey-50 rounded-xl p-4">
                <div className="font-semibold text-grey-900 mb-2">{cls.name}</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-grey-500">{cls.subject}</span>
                  <span className="text-green-500">출석 92%</span>
                  <span className="text-blue-500">진도 85%</span>
                </div>
              </div>
            ))}
          </div>
          {classes.length > 6 && (
            <div className="text-center mt-4">
              <button className="text-sm text-blue-500 hover:underline">
                전체 {classes.length}개 반 보기 →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 주요 이슈 */}
      <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-grey-100">
          <h3 className="font-semibold text-grey-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            주요 이슈
          </h3>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            <IssueItem
              type="attendance"
              message="결석 3회 이상 학생 2명"
              severity="warning"
            />
            <IssueItem
              type="homework"
              message="숙제 미제출 연속 2회 학생 5명"
              severity="info"
            />
            <IssueItem
              type="progress"
              message="진도 미기록 반 1개"
              severity="info"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressReport({
  classes,
  dateRange,
}: {
  classes: { id: string; name: string; subject: string }[];
  dateRange: { start: string; end: string };
}) {
  return (
    <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-grey-100">
        <h3 className="font-semibold text-grey-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-grey-400" />
          반별 진도 현황
        </h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
            <th className="px-5 py-3 text-left">반</th>
            <th className="px-5 py-3 text-left">과목</th>
            <th className="px-5 py-3 text-left">교재</th>
            <th className="px-5 py-3 text-center">현재 페이지</th>
            <th className="px-5 py-3 text-center">목표 페이지</th>
            <th className="px-5 py-3 text-center">진도율</th>
            <th className="px-5 py-3 text-center">주간 진도</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {classes.map((cls, idx) => {
            const current = 50 + idx * 15;
            const target = 200;
            const rate = Math.round((current / target) * 100);
            const weeklyPages = 8 + (idx % 5) * 2;

            return (
              <tr key={cls.id} className="hover:bg-grey-50">
                <td className="px-5 py-4 font-medium text-grey-900">{cls.name}</td>
                <td className="px-5 py-4 text-grey-600">{cls.subject}</td>
                <td className="px-5 py-4 text-grey-600">개념원리 수학</td>
                <td className="px-5 py-4 text-center font-medium">{current}p</td>
                <td className="px-5 py-4 text-center text-grey-500">{target}p</td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-20 h-2 bg-grey-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-blue-500">{rate}%</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="text-green-500 font-medium">+{weeklyPages}p</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function AttendanceReport({
  stats,
  classes,
  dateRange,
}: {
  stats: ReturnType<typeof useDashboardStats>['data'];
  classes: { id: string; name: string }[];
  dateRange: { start: string; end: string };
}) {
  const attendance = stats?.todayAttendance || { total: 0, present: 0, absent: 0, late: 0 };
  const rate = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* 출결 요약 */}
      <section className="bg-white border border-grey-200 rounded-2xl p-6">
        <h3 className="font-semibold text-grey-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          출결 요약
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <MetricBox label="전체 출석" value={attendance.present} unit="명" />
          <MetricBox label="결석" value={attendance.absent} unit="명" />
          <MetricBox label="지각" value={attendance.late} unit="명" />
          <MetricBox label="출석률" value={rate} unit="%" positive />
        </div>
      </section>

      {/* 반별 출결 현황 */}
      <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-grey-100">
          <h3 className="font-semibold text-grey-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-grey-400" />
            반별 출결 현황
          </h3>
        </div>
        <div className="p-5 grid grid-cols-3 gap-4">
          {classes.map((cls, idx) => {
            const classRate = 90 + (idx % 10);
            const absentCount = idx % 3;

            return (
              <div key={cls.id} className="bg-grey-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-grey-900">{cls.name}</span>
                  <span className={`text-lg font-bold ${classRate >= 95 ? 'text-green-500' : classRate >= 85 ? 'text-orange-500' : 'text-red-500'}`}>
                    {classRate}%
                  </span>
                </div>
                <div className="h-2 bg-grey-200 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full ${classRate >= 95 ? 'bg-green-500' : classRate >= 85 ? 'bg-orange-500' : 'bg-red-500'}`}
                    style={{ width: `${classRate}%` }}
                  />
                </div>
                {absentCount > 0 && (
                  <div className="text-xs text-red-500">결석 {absentCount}명</div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ScoresReport({
  classes,
  dateRange,
}: {
  classes: { id: string; name: string }[];
  dateRange: { start: string; end: string };
}) {
  return (
    <div className="space-y-6">
      {/* 성적 요약 */}
      <section className="bg-white border border-grey-200 rounded-2xl p-6">
        <h3 className="font-semibold text-grey-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-grey-400" />
          성적 요약
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <MetricBox label="평균 점수" value={78} unit="점" trend="+3" positive />
          <MetricBox label="90점 이상" value={12} unit="명" />
          <MetricBox label="70점 미만" value={5} unit="명" />
          <MetricBox label="시험 횟수" value={8} unit="회" />
        </div>
      </section>

      {/* 반별 평균 성적 */}
      <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-grey-100">
          <h3 className="font-semibold text-grey-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-grey-400" />
            반별 평균 성적
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
              <th className="px-5 py-3 text-left">반</th>
              <th className="px-5 py-3 text-center">평균</th>
              <th className="px-5 py-3 text-center">최고점</th>
              <th className="px-5 py-3 text-center">최저점</th>
              <th className="px-5 py-3 text-center">변화</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100">
            {classes.map((cls, idx) => {
              const avg = 70 + (idx % 20);
              const max = avg + 15 + (idx % 10);
              const min = avg - 20 - (idx % 15);
              const trend = (idx % 5) - 2;

              return (
                <tr key={cls.id} className="hover:bg-grey-50">
                  <td className="px-5 py-4 font-medium text-grey-900">{cls.name}</td>
                  <td className="px-5 py-4 text-center font-bold text-grey-900">{avg}점</td>
                  <td className="px-5 py-4 text-center text-green-500">{max}점</td>
                  <td className="px-5 py-4 text-center text-red-500">{Math.max(0, min)}점</td>
                  <td className="px-5 py-4 text-center">
                    <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {trend >= 0 ? '+' : ''}{trend}점
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ============================================
// Sub Components
// ============================================

function MetricBox({
  label,
  value,
  unit,
  trend,
  trendLabel,
  positive,
}: {
  label: string;
  value: number;
  unit: string;
  trend?: string;
  trendLabel?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-grey-50 rounded-xl p-4">
      <div className="text-sm text-grey-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-grey-900">
        {value}
        <span className="text-base font-medium text-grey-500 ml-1">{unit}</span>
      </div>
      {trend && (
        <div className={`text-sm mt-1 ${positive || trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
          {trend} {trendLabel && <span className="text-grey-400">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function IssueItem({
  type,
  message,
  severity,
}: {
  type: 'attendance' | 'homework' | 'progress';
  message: string;
  severity: 'warning' | 'info';
}) {
  const icons: Record<typeof type, ReactNode> = {
    attendance: <AlertCircle className="w-5 h-5" />,
    homework: <FileText className="w-5 h-5" />,
    progress: <BookOpen className="w-5 h-5" />,
  };

  const colors = {
    warning: 'bg-orange-50 border-orange-200 text-orange-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${colors[severity]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button className="text-sm font-medium hover:underline">확인 →</button>
    </div>
  );
}
