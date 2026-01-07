/**
 * Phase 6: SettlementPage (정산/미수금)
 *
 * 정산 및 미수금 관리 페이지
 * - 월별 정산 현황
 * - 미수금 목록
 * - 결제 내역
 *
 * NOTE: 현재 Supabase 스키마에 payments 테이블이 없음
 * 추후 payments, invoices 테이블 추가 필요
 * 일단 students 테이블 기반 + Mock 구조로 구현
 */
import { useState, useMemo, ReactNode } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import { useStudents, useClasses } from '../../hooks/useBackofficeData';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  Link,
  AlertTriangle,
  Wallet,
  CheckCircle,
  Clock,
  BarChart3,
  Scroll,
  CreditCard,
  Building,
  Banknote,
  PartyPopper,
} from 'lucide-react';

// ============================================
// Types (추후 Supabase 테이블로 대체)
// ============================================

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: 'paid' | 'pending' | 'overdue';
  method?: 'card' | 'transfer' | 'cash';
  note?: string;
}

// ============================================
// Mock Data (추후 Supabase 연동)
// ============================================

const generateMockPayments = (students: { id: string; name: string }[]): PaymentRecord[] => {
  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  return students.slice(0, 20).map((student, idx) => {
    const isPaid = idx % 3 !== 0; // 2/3은 납부
    const isOverdue = !isPaid && idx % 5 === 0; // 일부는 연체

    return {
      id: `payment-${student.id}`,
      studentId: student.id,
      studentName: student.name,
      amount: 300000 + (idx % 5) * 50000, // 30만~50만
      dueDate: `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-10`,
      paidDate: isPaid ? `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-${String(5 + idx % 5).padStart(2, '0')}` : null,
      status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
      method: isPaid ? (['card', 'transfer', 'cash'] as const)[idx % 3] : undefined,
    };
  });
};

// ============================================
// Main Component
// ============================================

export default function SettlementPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'unpaid' | 'history'>('overview');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Supabase 데이터 조회
  const { data: students, isLoading: studentsLoading } = useStudents({ status: 'active' });
  const { data: classes } = useClasses({ status: 'active' });

  // Mock 결제 데이터 생성
  const payments = useMemo(() => {
    if (!students) return [];
    return generateMockPayments(students.map((s) => ({ id: s.id, name: s.name })));
  }, [students]);

  // 통계 계산
  const stats = useMemo(() => {
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const paid = payments.filter((p) => p.status === 'paid');
    const paidAmount = paid.reduce((sum, p) => sum + p.amount, 0);
    const pending = payments.filter((p) => p.status === 'pending');
    const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);
    const overdue = payments.filter((p) => p.status === 'overdue');
    const overdueAmount = overdue.reduce((sum, p) => sum + p.amount, 0);

    return {
      total,
      paidAmount,
      paidCount: paid.length,
      pendingAmount,
      pendingCount: pending.length,
      overdueAmount,
      overdueCount: overdue.length,
      collectionRate: total > 0 ? Math.round((paidAmount / total) * 100) : 0,
    };
  }, [payments]);

  // 미납 목록
  const unpaidPayments = useMemo(() => {
    return payments.filter((p) => p.status !== 'paid');
  }, [payments]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${parseInt(month)}월`;
  };

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="정산 관리"
          description="월별 수업료 정산 및 미수금을 관리합니다"
          actions={
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-grey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
                청구서 발송
              </button>
            </div>
          }
        />

        {/* 알림 배너 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <div className="font-medium text-yellow-800">개발 중인 기능</div>
            <div className="text-sm text-yellow-700">
              현재 Mock 데이터로 표시됩니다. payments 테이블 추가 후 실제 데이터로 연동됩니다.
            </div>
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label={`${formatMonth(selectedMonth)} 총 청구액`}
            value={formatCurrency(stats.total)}
            unit="원"
            icon={<Wallet className="w-4 h-4" />}
          />
          <KPICard
            label="수납 완료"
            value={formatCurrency(stats.paidAmount)}
            unit="원"
            subValue={`${stats.paidCount}건`}
            icon={<CheckCircle className="w-4 h-4" />}
            color="green"
          />
          <KPICard
            label="미수금"
            value={formatCurrency(stats.pendingAmount + stats.overdueAmount)}
            unit="원"
            subValue={`${stats.pendingCount + stats.overdueCount}건`}
            icon={<Clock className="w-4 h-4" />}
            color="orange"
          />
          <KPICard
            label="수납률"
            value={stats.collectionRate}
            unit="%"
            icon={<BarChart3 className="w-4 h-4" />}
            color="blue"
          />
        </div>

        {/* 탭 */}
        <div className="flex gap-2 bg-grey-100 p-1 rounded-xl w-fit">
          {[
            { id: 'overview' as const, label: '전체 현황' },
            { id: 'unpaid' as const, label: `미수금 (${stats.pendingCount + stats.overdueCount})` },
            { id: 'history' as const, label: '결제 내역' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-grey-900 shadow-sm'
                  : 'text-grey-500 hover:text-grey-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        {activeTab === 'overview' && (
          <OverviewSection
            payments={payments}
            formatCurrency={formatCurrency}
            loading={studentsLoading}
          />
        )}

        {activeTab === 'unpaid' && (
          <UnpaidSection
            payments={unpaidPayments}
            formatCurrency={formatCurrency}
          />
        )}

        {activeTab === 'history' && (
          <HistorySection
            payments={payments.filter((p) => p.status === 'paid')}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </AdminLayoutV5>
  );
}

// ============================================
// Sub Components
// ============================================

function KPICard({
  label,
  value,
  unit,
  subValue,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  subValue?: string;
  icon: ReactNode;
  color?: 'green' | 'orange' | 'blue';
}) {
  const colorClasses = {
    green: 'text-green-500',
    orange: 'text-orange-500',
    blue: 'text-blue-500',
  };

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-grey-500 text-sm mb-2">
        <span className="text-grey-400">{icon}</span>
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-grey-900'}`}>
        {value}
        <span className="text-sm font-medium text-grey-500 ml-1">{unit}</span>
      </div>
      {subValue && (
        <div className="text-sm text-grey-500 mt-1">{subValue}</div>
      )}
    </div>
  );
}

function OverviewSection({
  payments,
  formatCurrency,
  loading,
}: {
  payments: PaymentRecord[];
  formatCurrency: (n: number) => string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white border border-grey-200 rounded-2xl p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        로딩 중...
      </div>
    );
  }

  return (
    <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-grey-100">
        <h3 className="font-semibold text-grey-900">전체 정산 현황</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
            <th className="px-5 py-3 text-left">학생</th>
            <th className="px-5 py-3 text-right">금액</th>
            <th className="px-5 py-3 text-center">납부기한</th>
            <th className="px-5 py-3 text-center">상태</th>
            <th className="px-5 py-3 text-center">결제방법</th>
            <th className="px-5 py-3 text-center">납부일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-grey-50">
              <td className="px-5 py-4 font-medium text-grey-900">{payment.studentName}</td>
              <td className="px-5 py-4 text-right font-medium">{formatCurrency(payment.amount)}원</td>
              <td className="px-5 py-4 text-center text-grey-600">{payment.dueDate}</td>
              <td className="px-5 py-4 text-center">
                <StatusBadge status={payment.status} />
              </td>
              <td className="px-5 py-4 text-center text-grey-600">
                {payment.method === 'card' ? (
                  <span className="inline-flex items-center gap-1"><CreditCard className="w-4 h-4 text-grey-400" /> 카드</span>
                ) : payment.method === 'transfer' ? (
                  <span className="inline-flex items-center gap-1"><Building className="w-4 h-4 text-grey-400" /> 이체</span>
                ) : payment.method === 'cash' ? (
                  <span className="inline-flex items-center gap-1"><Banknote className="w-4 h-4 text-grey-400" /> 현금</span>
                ) : '-'}
              </td>
              <td className="px-5 py-4 text-center text-grey-600">{payment.paidDate || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function UnpaidSection({
  payments,
  formatCurrency,
}: {
  payments: PaymentRecord[];
  formatCurrency: (n: number) => string;
}) {
  return (
    <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
        <h3 className="font-semibold text-grey-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-grey-400" />
          미수금 목록
        </h3>
        <button className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg">
          일괄 알림 발송
        </button>
      </div>
      {payments.length > 0 ? (
        <div className="divide-y divide-grey-100">
          {payments.map((payment) => (
            <div key={payment.id} className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  payment.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {payment.studentName.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-grey-900">{payment.studentName}</div>
                  <div className="text-sm text-grey-500">납부기한: {payment.dueDate}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-grey-900">{formatCurrency(payment.amount)}원</div>
                  <StatusBadge status={payment.status} />
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg">
                    알림
                  </button>
                  <button className="px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-lg">
                    수납
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center text-grey-500">
          <div className="mb-3 flex justify-center">
            <PartyPopper className="w-10 h-10 text-grey-400" />
          </div>
          미수금이 없습니다
        </div>
      )}
    </section>
  );
}

function HistorySection({
  payments,
  formatCurrency,
}: {
  payments: PaymentRecord[];
  formatCurrency: (n: number) => string;
}) {
  return (
    <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-grey-100">
        <h3 className="font-semibold text-grey-900 flex items-center gap-2">
          <Scroll className="w-5 h-5 text-grey-400" />
          결제 내역
        </h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
            <th className="px-5 py-3 text-left">학생</th>
            <th className="px-5 py-3 text-right">금액</th>
            <th className="px-5 py-3 text-center">결제일</th>
            <th className="px-5 py-3 text-center">결제방법</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-grey-50">
              <td className="px-5 py-4 font-medium text-grey-900">{payment.studentName}</td>
              <td className="px-5 py-4 text-right font-medium text-green-600">+{formatCurrency(payment.amount)}원</td>
              <td className="px-5 py-4 text-center text-grey-600">{payment.paidDate}</td>
              <td className="px-5 py-4 text-center">
                {payment.method === 'card' ? (
                  <span className="inline-flex items-center gap-1"><CreditCard className="w-4 h-4 text-grey-400" /> 카드</span>
                ) : payment.method === 'transfer' ? (
                  <span className="inline-flex items-center gap-1"><Building className="w-4 h-4 text-grey-400" /> 이체</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Banknote className="w-4 h-4 text-grey-400" /> 현금</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StatusBadge({ status }: { status: 'paid' | 'pending' | 'overdue' }) {
  const config = {
    paid: { label: '완료', color: 'bg-green-100 text-green-700' },
    pending: { label: '미납', color: 'bg-orange-100 text-orange-700' },
    overdue: { label: '연체', color: 'bg-red-100 text-red-700' },
  };

  const c = config[status];
  return <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.color}`}>{c.label}</span>;
}
