/**
 * AdminMobileDashboard - 관리자 모바일 대시보드 (목업)
 *
 * UX 연구 리포트 기반:
 * - 알림 중심 대시보드
 * - 주의 필요 항목 카드
 * - 오늘 수업 요약
 * - 빠른 액션 버튼
 *
 * 강사용 앱 패턴 재사용:
 * - TaskBadgeCard 스타일 차용
 * - 하단 네비게이션
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import {
  AlertTriangle,
  Users,
  BookOpen,
  ClipboardCheck,
  Search,
  ChevronRight,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
} from 'lucide-react';

// ============ Mock 데이터 ============

const mockAlerts = [
  {
    id: '1',
    type: 'absence',
    title: '김민수(중3A) 무단결석',
    subtitle: '연락 필요 - 3일 연속',
    urgent: true,
    time: '10:30',
  },
  {
    id: '2',
    type: 'homework',
    title: '중2B 숙제 미제출 4명',
    subtitle: '제출 마감: 오늘 18:00',
    urgent: false,
    time: '09:00',
  },
  {
    id: '3',
    type: 'late',
    title: '이영희(중1C) 지각',
    subtitle: '15분 지각 - 학부모 연락 완료',
    urgent: false,
    time: '14:15',
  },
];

type ClassStatus = 'current' | 'upcoming' | 'completed';

const mockTodayClasses: {
  id: string;
  name: string;
  time: string;
  teacher: string;
  status: ClassStatus;
  attendance: { present: number; total: number } | null;
}[] = [
  {
    id: '1',
    name: '중3A반',
    time: '14:00-15:30',
    teacher: '김수학',
    status: 'current',
    attendance: { present: 7, total: 8 },
  },
  {
    id: '2',
    name: '고1B반',
    time: '16:00-17:30',
    teacher: '이수학',
    status: 'upcoming',
    attendance: null,
  },
  {
    id: '3',
    name: '중2A반',
    time: '18:00-19:30',
    teacher: '박수학',
    status: 'upcoming',
    attendance: null,
  },
];

const mockQuickStats = {
  totalStudents: 156,
  todayAbsences: 3,
  homeworkPending: 8,
  todayClasses: 12,
};

// ============ 컴포넌트 ============

export default function AdminMobileDashboard() {
  const navigate = useNavigate();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  // 현재 시간 포맷
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR', {
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
            <h1 className="text-lg font-bold text-gray-900">혜윰 관리자</h1>
            <p className="text-xs text-gray-500">{dateStr}</p>
          </div>
          <button
            onClick={() => navigate('/admin-mobile/search')}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 space-y-4">
        {/* 인사 + 요약 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <p className="text-sm opacity-90">안녕하세요, 원장님</p>
          <h2 className="text-xl font-bold mt-1">오늘 {mockQuickStats.todayClasses}개 수업이 있습니다</h2>

          {/* 미니 KPI */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{mockQuickStats.totalStudents}</div>
              <div className="text-xs opacity-80">총 학생</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-200">{mockQuickStats.todayAbsences}</div>
              <div className="text-xs opacity-80">오늘 결석</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-orange-200">{mockQuickStats.homeworkPending}</div>
              <div className="text-xs opacity-80">숙제 미제출</div>
            </div>
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
            <button className="text-sm text-blue-600 font-medium">모두 보기</button>
          </div>

          <div className="divide-y divide-gray-50">
            {mockAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-4 py-3 ${expandedAlert === alert.id ? 'bg-gray-50' : ''}`}
                onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
              >
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
                  <span className="text-xs text-gray-400">{alert.time}</span>
                </div>

                {/* 확장된 액션 버튼 */}
                {expandedAlert === alert.id && (
                  <div className="flex gap-2 mt-3 ml-5">
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                      <Phone className="w-3 h-3" />
                      연락하기
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                      <MessageSquare className="w-3 h-3" />
                      메모
                    </button>
                    <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                      상세 보기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 오늘 수업 카드 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">오늘 수업</span>
            </div>
            <button
              onClick={() => navigate('/admin-mobile/classes')}
              className="text-sm text-blue-600 font-medium flex items-center"
            >
              전체 보기
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {mockTodayClasses.map((cls) => (
              <div key={cls.id} className="px-4 py-3 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    cls.status === 'current'
                      ? 'bg-green-100'
                      : cls.status === 'completed'
                      ? 'bg-gray-100'
                      : 'bg-blue-50'
                  }`}
                >
                  {cls.status === 'current' ? (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  ) : (
                    <Clock
                      className={`w-5 h-5 ${
                        cls.status === 'completed' ? 'text-gray-400' : 'text-blue-500'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{cls.name}</span>
                    {cls.status === 'current' && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">
                        진행 중
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cls.time} · {cls.teacher}
                  </p>
                </div>
                {cls.attendance && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {cls.attendance.present}/{cls.attendance.total}
                    </div>
                    <div className="text-xs text-gray-500">출석</div>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">빠른 액션</h3>
          <div className="grid grid-cols-4 gap-3">
            <QuickActionButton
              icon={<Users className="w-5 h-5" />}
              label="학생 검색"
              color="blue"
              onClick={() => navigate('/admin-mobile/search')}
            />
            <QuickActionButton
              icon={<ClipboardCheck className="w-5 h-5" />}
              label="출결 입력"
              color="green"
              onClick={() => {}}
            />
            <QuickActionButton
              icon={<BookOpen className="w-5 h-5" />}
              label="진도 확인"
              color="purple"
              onClick={() => {}}
            />
            <QuickActionButton
              icon={<MessageSquare className="w-5 h-5" />}
              label="알림 발송"
              color="orange"
              onClick={() => {}}
            />
          </div>
        </div>
      </main>

      {/* 하단 네비게이션 */}
      <AdminBottomNav badges={{ notice: 3 }} />
    </div>
  );
}

// 빠른 액션 버튼
function QuickActionButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  onClick: () => void;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-transform active:scale-95"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  );
}
