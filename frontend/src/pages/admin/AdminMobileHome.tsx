/**
 * AdminMobileHome - 관리자 모바일 홈 (대시보드)
 *
 * 강사용 BackofficeDemo와 비교:
 * - 강사: 내 수업 캐러셀, 내 업무 뱃지 (출결/진도/숙제)
 * - 관리자: 전체 KPI, 주의 필요 카드, 실시간 수업 현황
 *
 * Phase 4-D: Supabase 연결 (Mock Fallback 패턴)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import { DateSelector } from '../../components/backoffice/dashboard';
import { useTodayClasses, useAdminKPI } from '../../hooks/useAdminData';
import {
  ChevronRight,
  Phone,
  Calendar,
  AlertTriangle,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  Check,
} from 'lucide-react';

// ============ Mock 데이터 ============

const mockKPI = {
  inProgress: 2,
  upcoming: 5,
  completed: 3,
  absent: 2,
  notEntered: 3,
};

const mockAlerts = [
  {
    id: '1',
    type: 'absent',
    title: '김민수(중3A) 무단결석',
    subtitle: '연락 필요 · 3일 연속',
    time: '09:30',
    urgent: true,
    phone: '010-1234-5678',
  },
  {
    id: '2',
    type: 'absent',
    title: '이영희(중2B) 결석',
    subtitle: '어머니 연락 완료',
    time: '10:00',
    urgent: false,
    phone: '010-2345-6789',
  },
  {
    id: '3',
    type: 'meeting',
    title: '박지민 학부모 상담',
    subtitle: '14:00 원장실',
    time: '11:00',
    urgent: false,
  },
];

const mockLiveClasses = [
  {
    id: '1',
    name: '중3A반',
    teacher: '김수학',
    time: '14:00-15:30',
    status: 'live' as const,
    attendance: { present: 7, total: 8 },
    progressEntered: false,
  },
  {
    id: '2',
    name: '고1B반',
    teacher: '이수학',
    time: '14:00-15:30',
    status: 'live' as const,
    attendance: { present: 6, total: 6 },
    progressEntered: true,
  },
];

// ============ 컴포넌트 ============

export default function AdminMobileHome() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Supabase 데이터 (Mock Fallback 패턴)
  const { data: todayClasses } = useTodayClasses();
  const { data: kpiData } = useAdminKPI();

  // KPI 계산 (Supabase 데이터 우선, 없으면 Mock)
  const computedKPI = todayClasses ? {
    inProgress: todayClasses.filter(c => c.status === 'current').length,
    upcoming: todayClasses.filter(c => c.status === 'upcoming').length,
    completed: todayClasses.filter(c => c.status === 'completed').length,
    absent: kpiData?.pendingAttendance || mockKPI.absent,
    notEntered: kpiData?.pendingProgress || mockKPI.notEntered,
  } : mockKPI;

  // 진행 중인 수업 (Supabase 데이터 우선)
  const liveClasses = todayClasses
    ? todayClasses
        .filter(c => c.status === 'current')
        .map(c => ({
          id: c.id,
          name: c.name,
          teacher: c.teacher?.name || '미배정',
          time: `${c.startTime}-${c.endTime}`,
          status: 'live' as const,
          attendance: { present: c.studentCount, total: c.studentCount },
          progressEntered: false, // TODO: 진도 입력 여부 확인
        }))
    : mockLiveClasses;

  // 날짜 문자열
  const dateStr = selectedDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#3182F6]">혜윰 관리자</h1>
            <p className="text-xs text-gray-500">원장님 대시보드</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-600">원</span>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 space-y-4">
        {/* 날짜 선택기 (강사용 컴포넌트 재사용) */}
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onOpenMonthly={() => {}}
          classScheduleDates={[]}
        />

        {/* 인사 메시지 */}
        <div className="text-gray-900">
          <p className="text-sm text-gray-500">안녕하세요, 원장님</p>
          <h2 className="text-lg font-bold">
            오늘 <span className="text-blue-600">{computedKPI.inProgress + computedKPI.upcoming + computedKPI.completed}</span>개 수업이 있습니다
          </h2>
        </div>

        {/* KPI 요약 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-5 gap-2 text-center">
            <KPIItem label="진행중" value={computedKPI.inProgress} color="green" icon={<Clock className="w-4 h-4" />} />
            <KPIItem label="예정" value={computedKPI.upcoming} color="blue" icon={<Calendar className="w-4 h-4" />} />
            <KPIItem label="완료" value={computedKPI.completed} color="gray" icon={<CheckCircle className="w-4 h-4" />} />
            <KPIItem label="결석" value={computedKPI.absent} color="red" icon={<Users className="w-4 h-4" />} />
            <KPIItem label="미입력" value={computedKPI.notEntered} color="orange" icon={<BookOpen className="w-4 h-4" />} />
          </div>
        </div>

        {/* 주의 필요 카드 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <span className="font-semibold text-gray-900">주의 필요</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {mockAlerts.length}
              </span>
            </div>
            <button
              onClick={() => navigate('/admin-mobile/notice')}
              className="text-sm text-blue-600 font-medium flex items-center"
            >
              전체
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {mockAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      alert.urgent ? 'bg-red-500 animate-pulse' : 'bg-orange-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                      {alert.urgent && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
                          긴급
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.subtitle}</p>
                  </div>
                  {alert.phone && (
                    <button
                      onClick={() => window.location.href = `tel:${alert.phone}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
                    >
                      <Phone className="w-3 h-3" />
                      연락
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 실시간 수업 현황 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold text-gray-900">실시간 수업</span>
              <span className="text-xs text-gray-500">{liveClasses.length}개 진행 중</span>
            </div>
            <button
              onClick={() => navigate('/admin-mobile/classes')}
              className="text-sm text-blue-600 font-medium flex items-center"
            >
              반 페이지
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {liveClasses.map((cls) => (
              <div key={cls.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{cls.name}</span>
                      <span className="text-xs text-gray-500">{cls.teacher}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{cls.time}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-grey-400" />
                        {cls.attendance.present}/{cls.attendance.total}
                      </span>
                      {cls.progressEntered ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                          진도 미입력
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 하단 네비게이션 */}
      <AdminBottomNav badges={{ notice: mockAlerts.length }} />
    </div>
  );
}

// KPI 아이템 컴포넌트
function KPIItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: 'green' | 'blue' | 'gray' | 'red' | 'orange';
  icon: React.ReactNode;
}) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    gray: 'text-gray-600 bg-gray-100',
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <span className={`text-lg font-bold mt-1 ${colorClasses[color].split(' ')[0]}`}>{value}</span>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}
