/**
 * AdminMobileSettings - 관리자 모바일 설정 페이지
 *
 * 강사용 MorePage와 비교:
 * - 강사: 개인 설정, 로그아웃
 * - 관리자: 학원 설정, 강사 관리, 시스템 설정
 *
 * 차이점:
 * - 강사는 "개인" 설정
 * - 관리자는 "학원 전체" 설정 + 강사 관리 권한
 *
 * 핵심 기능:
 * - 학원 기본 정보
 * - 강사 계정 관리
 * - 알림 설정
 * - 시스템 설정
 */
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import {
  Building2,
  Users,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
  Clock,
  Calendar,
  MessageSquare,
} from 'lucide-react';

// ============ Mock 데이터 ============

const mockAdminInfo = {
  name: '관리자',
  role: '원장',
  academy: '수학의 정석 학원',
  phone: '010-1234-5678',
};

// ============ 컴포넌트 ============

export default function AdminMobileSettings() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-gray-900">설정</h1>
        <p className="text-xs text-gray-500">학원 운영 설정</p>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 space-y-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">{mockAdminInfo.name}</h3>
              <p className="text-sm text-gray-500">{mockAdminInfo.role}</p>
              <p className="text-xs text-gray-400 mt-0.5">{mockAdminInfo.academy}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </div>
        </div>

        {/* 학원 관리 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">학원 관리</h3>
          </div>
          <div>
            <SettingItem
              icon={<Building2 className="w-5 h-5 text-blue-500" />}
              label="학원 정보"
              description="학원명, 연락처, 주소"
            />
            <SettingItem
              icon={<Users className="w-5 h-5 text-green-500" />}
              label="강사 관리"
              description="강사 계정 추가/수정"
              badge="5명"
            />
            <SettingItem
              icon={<Calendar className="w-5 h-5 text-purple-500" />}
              label="수업 시간표"
              description="시간대별 수업 설정"
            />
            <SettingItem
              icon={<Clock className="w-5 h-5 text-orange-500" />}
              label="운영 시간"
              description="학원 운영 시간 설정"
            />
          </div>
        </div>

        {/* 알림 설정 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">알림 설정</h3>
          </div>
          <div>
            <SettingItem
              icon={<Bell className="w-5 h-5 text-red-500" />}
              label="푸시 알림"
              description="결석, 숙제 미제출 알림"
              hasToggle
              toggleOn
            />
            <SettingItem
              icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
              label="메시지 알림"
              description="강사 메시지 알림"
              hasToggle
              toggleOn
            />
          </div>
        </div>

        {/* 시스템 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">시스템</h3>
          </div>
          <div>
            <SettingItem
              icon={<Shield className="w-5 h-5 text-gray-500" />}
              label="보안 설정"
              description="비밀번호 변경"
            />
            <SettingItem
              icon={<HelpCircle className="w-5 h-5 text-gray-500" />}
              label="도움말"
              description="사용 가이드"
            />
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-2xl shadow-sm text-red-600 font-medium">
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>

        {/* 버전 정보 */}
        <p className="text-center text-xs text-gray-400">
          혜윰 관리자 v1.0.0
        </p>
      </main>

      {/* 하단 네비게이션 */}
      <AdminBottomNav />
    </div>
  );
}

// 설정 아이템 컴포넌트
function SettingItem({
  icon,
  label,
  description,
  badge,
  hasToggle,
  toggleOn,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  badge?: string;
  hasToggle?: boolean;
  toggleOn?: boolean;
}) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {hasToggle ? (
        <div
          className={`w-11 h-6 rounded-full transition-colors ${
            toggleOn ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
              toggleOn ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'
            }`}
          />
        </div>
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-300" />
      )}
    </button>
  );
}
