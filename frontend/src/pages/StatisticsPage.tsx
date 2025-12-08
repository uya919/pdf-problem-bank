/**
 * Statistics Page (Phase 6-8)
 *
 * Visualize statistics and analytics with charts
 */
import { useDashboardStats, useDocuments } from '../hooks/useDocuments';
import { Loader2, AlertCircle, BarChart3, PieChart, TrendingUp, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

export function StatisticsPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: documents, isLoading: docsLoading } = useDocuments();

  // Loading state
  if (statsLoading || docsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-grey-600">통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (statsError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h3 className="mt-4 text-lg font-semibold text-grey-900">데이터 로딩 실패</h3>
          <p className="mt-2 text-sm text-grey-600">{(statsError as Error).message}</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const documentProgressData = documents?.map((doc) => ({
    name: doc.document_id.length > 15 ? doc.document_id.substring(0, 15) + '...' : doc.document_id,
    진행률: Math.round((doc.analyzed_pages / doc.total_pages) * 100),
    완료페이지: doc.analyzed_pages,
    전체페이지: doc.total_pages,
  })) || [];

  const documentProblemsData = documents?.map((doc) => {
    // Calculate problems count (assuming problems are exported)
    return {
      name: doc.document_id.length > 15 ? doc.document_id.substring(0, 15) + '...' : doc.document_id,
      문제수: 0, // TODO: Get actual problem count per document
    };
  }) || [];

  const statusDistributionData = [
    { name: '완료', value: (stats?.completion_rate || 0) },
    { name: '진행 중', value: 100 - (stats?.completion_rate || 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">통계 및 분석</h1>
            <p className="mt-2 text-indigo-100">
              문서 처리 현황과 작업 통계를 시각화합니다
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Documents */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 uppercase">전체 문서</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats?.total_documents || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Problems */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 uppercase">추출된 문제</p>
                <p className="text-3xl font-bold text-emerald-900 mt-2">{stats?.total_problems || 0}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 uppercase">작업 중</p>
                <p className="text-3xl font-bold text-amber-900 mt-2">{stats?.in_progress_documents || 0}</p>
              </div>
              <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 uppercase">완료율</p>
                <p className="text-3xl font-bold text-purple-900 mt-2">{stats?.completion_rate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <PieChart className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Progress Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              문서별 진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documentProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={documentProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-grey-200 rounded-lg shadow-lg">
                            <p className="font-semibold text-grey-900">{payload[0].payload.name}</p>
                            <p className="text-sm text-blue-600">
                              진행률: {payload[0].value}%
                            </p>
                            <p className="text-xs text-grey-600">
                              {payload[0].payload.완료페이지} / {payload[0].payload.전체페이지} 페이지
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="진행률" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-grey-500">
                <div className="text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-grey-400" />
                  <p className="mt-4">문서 데이터가 없습니다</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              작업 완료 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-grey-50 to-grey-100 border-grey-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-grey-900">향후 추가될 통계</h3>
              <p className="mt-2 text-sm text-grey-600">
                문제 메타데이터(난이도, 유형, 출처 등)가 추가되면 다음 차트들이 표시됩니다:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-grey-600 list-disc list-inside">
                <li>난이도별 문제 분포 (쉬움/보통/어려움)</li>
                <li>유형별 문제 분포 (객관식/주관식/증명/계산 등)</li>
                <li>출처별 문제 수 (문제집별 통계)</li>
                <li>월별 작업량 추이</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
