/**
 * OperationsPage - 운영 페이지
 *
 * 기능:
 * - 왼쪽 사이드바: 운영 메뉴
 * - 시간표 관리, 강사 관리, 재무, 리포트, 설정
 *
 * 리팩토링: Stage 54-C (2025-01-07)
 * - 1,585줄 → ~110줄
 * - 분리된 컴포넌트 사용: PlaceholderView, MakeeduSyncView, AcademySettingsView
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminTopNav } from '../../components/admin/layout';
import {
  PlaceholderView,
  MakeeduSyncView,
  AcademySettingsView,
  MENU_SECTIONS,
} from '../../components/admin/operations';

export default function OperationsPage() {
  const [activeMenu, setActiveMenu] = useState('schedule');
  const navigate = useNavigate();

  // 메뉴 클릭 핸들러
  const handleMenuClick = (menuId: string) => {
    // 별도 페이지로 이동하는 메뉴들
    if (menuId === 'classes') {
      navigate('/admin/classes');
      return;
    }
    if (menuId === 'rotation') {
      navigate('/admin/rotation');
      return;
    }
    if (menuId === 'textbooks') {
      navigate('/admin/textbooks');
      return;
    }
    if (menuId === 'students') {
      navigate('/admin/students');
      return;
    }
    if (menuId === 'users') {
      navigate('/admin/users');
      return;
    }
    setActiveMenu(menuId);
  };

  // 콘텐츠 렌더링
  const renderContent = () => {
    switch (activeMenu) {
      case 'sync':
        return <MakeeduSyncView />;
      case 'academy-settings':
        return <AcademySettingsView />;
      case 'schedule':
        return <PlaceholderView title="시간표 관리" icon="📅" description="반별 시간표를 설정하고 관리합니다" />;
      case 'payment':
        return <PlaceholderView title="수납 관리" icon="💰" description="수강료 수납 현황을 확인하고 관리합니다" badge="미수납 12건" />;
      case 'revenue':
        return <PlaceholderView title="매출 리포트" icon="📊" description="월별/분기별 매출 현황을 확인합니다" />;
      case 'parent-report':
        return <PlaceholderView title="학부모 리포트" icon="📄" description="학부모에게 발송할 리포트를 생성합니다" badge="NEW" badgeType="info" />;
      case 'analytics':
        return <PlaceholderView title="성과 분석" icon="📈" description="학생 성적 향상도와 출석률을 분석합니다" />;
      case 'notification':
        return <PlaceholderView title="알림 설정" icon="🔔" description="알림 수신 설정을 관리합니다" />;
      default:
        return <PlaceholderView title="개발 중" icon="🚧" description="이 기능은 곧 출시됩니다" />;
    }
  };

  return (
    <div className="min-h-screen bg-grey-50">
      {/* 상단 네비게이션 */}
      <AdminTopNav />

      {/* 메인 레이아웃 */}
      <div className="flex mt-16 min-h-[calc(100vh-64px)]">
        {/* 좌측 사이드바 */}
        <aside className="w-60 bg-white border-r border-grey-200 flex-shrink-0 p-3">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="text-[11px] font-semibold text-grey-500 uppercase tracking-wide px-3 mb-2">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                      ${activeMenu === item.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-grey-600 hover:bg-grey-50 hover:text-grey-900'
                      }
                    `}
                  >
                    <span className={`w-5 text-center ${activeMenu === item.id ? 'text-blue-600' : 'text-grey-400'}`}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`
                          px-2 py-0.5 text-[10px] font-semibold rounded-full
                          ${item.badgeType === 'info' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}
                        `}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
