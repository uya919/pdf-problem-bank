/**
 * AdminLayoutV5 - 관리자 PC 페이지용 레이아웃 (v5 디자인)
 *
 * v5 디자인:
 * - 상단 네비게이션: 64px 고정
 * - 우측 사이드바: PC에서만 표시 (lg:1024px 이상)
 * - 태블릿 이하: 사이드바 숨김, 전체 너비 사용
 *
 * 반응형:
 * - < 1024px (태블릿): 사이드바 숨김, 패딩 축소
 * - >= 1024px (PC): 사이드바 표시, 전체 기능
 */
import { ReactNode, useState, useEffect } from 'react';
import { AdminTopNav } from './AdminTopNav';
import { AdminRightSidebar } from './AdminRightSidebar';

interface AdminLayoutV5Props {
  children: ReactNode;
  userName?: string;
  userRole?: string;
}

export function AdminLayoutV5({
  children,
  userName = '김수학',
  userRole = '수학 관리자',
}: AdminLayoutV5Props) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <div className="min-h-screen bg-grey-50">
      {/* 상단 네비게이션 - 64px 고정 */}
      <AdminTopNav userName={userName} userRole={userRole} />

      {/* 메인 레이아웃 */}
      <div className="flex mt-16 min-h-[calc(100vh-64px)]">
        {/* 메인 콘텐츠 - 반응형 패딩 및 마진 */}
        <main
          className={`
            flex-1 transition-all duration-250 ease-out
            p-4 md:p-5 lg:p-6
            ${isLargeScreen ? (sidebarExpanded ? 'lg:mr-[280px]' : 'lg:mr-14') : 'mr-0'}
          `}
        >
          {children}
        </main>

        {/* 우측 사이드바 - PC에서만 표시 */}
        {isLargeScreen && (
          <AdminRightSidebar
            userName={userName}
            userRole={userRole}
            defaultExpanded={false}
            onExpandedChange={setSidebarExpanded}
          />
        )}
      </div>
    </div>
  );
}
