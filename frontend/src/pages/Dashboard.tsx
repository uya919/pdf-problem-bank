/**
 * Dashboard Page (Phase 6-2: Real Data Integration)
 * Phase 22-F-3: 듀얼 매칭 카드 통합
 *
 * Overview and quick stats
 */
import { useState } from 'react';
import { FileText, CheckCircle, Clock, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useDashboardStats } from '../hooks/useDocuments';
import { DualUploadCard, PopupBlockedModal } from '../components/matching';

export function Dashboard() {
  const { data: stats, isLoading, isError, error } = useDashboardStats();
  const [showPopupBlockedModal, setShowPopupBlockedModal] = useState(false);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-grey-600">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Card className="max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <h3 className="mt-4 text-lg font-semibold text-grey-900">데이터 로딩 실패</h3>
            <p className="mt-2 text-sm text-grey-600">
              {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: '전체 문서',
      value: stats.total_documents.toString(),
      icon: FileText,
      change: null,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '추출된 문제',
      value: stats.total_problems.toString(),
      icon: CheckCircle,
      change: null,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '작업 중',
      value: stats.in_progress_documents.toString(),
      icon: Clock,
      change: null,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: '완료율',
      value: `${stats.completion_rate}%`,
      icon: TrendingUp,
      change: null,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-grey-900">대시보드</h1>
        <p className="mt-2 text-grey-600">
          전체 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* Phase 22-F: 듀얼 매칭 카드 */}
      <div className="max-w-md">
        <DualUploadCard
          onPopupBlocked={() => setShowPopupBlockedModal(true)}
        />
      </div>

      {/* 팝업 차단 모달 */}
      <PopupBlockedModal
        isOpen={showPopupBlockedModal}
        onClose={() => setShowPopupBlockedModal(false)}
        onRetry={() => {
          setShowPopupBlockedModal(false);
        }}
        onSingleWindow={() => {
          setShowPopupBlockedModal(false);
          // 단일 창 모드로 진행 시 문서 목록 페이지로 이동
          window.location.href = '/documents';
        }}
      />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} variant="elevated">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-grey-600">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-grey-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full ${stat.bgColor} p-3`}>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 작업</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_activities.length === 0 ? (
              <div className="py-8 text-center text-grey-500">
                최근 작업이 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recent_activities.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-grey-100 pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-grey-900">{item.name}</p>
                      <p className="text-sm text-grey-500">{item.time}</p>
                    </div>
                    <Badge
                      variant={
                        item.status === 'completed' ? 'success' : 'warning'
                      }
                    >
                      {item.status === 'completed' ? '완료' : '진행중'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>작업 진행 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.document_progress.length === 0 ? (
              <div className="py-8 text-center text-grey-500">
                진행 중인 작업이 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {stats.document_progress.map((doc, i) => (
                  <div key={i}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-grey-700">
                        {doc.name}
                      </span>
                      <span className="text-grey-500">{doc.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-grey-200">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  </div>
                ))}

                {stats.pending_pages > 0 && (
                  <div className="mt-4 rounded-lg bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-900">
                      대기 중: {stats.pending_pages}페이지
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      백그라운드 분석이 진행 중입니다
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
