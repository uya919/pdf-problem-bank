/**
 * MinimalLayout Component
 * Phase 21.5: 새로운 미니멀 레이아웃
 *
 * 토스 스타일 - 깔끔한 레이아웃 with 3-메뉴 사이드바
 */
import { Outlet } from 'react-router-dom';
import { MinimalSidebar } from './MinimalSidebar';
import { AnimatedPage } from './AnimatedPage';

export function MinimalLayout() {
  return (
    <div className="flex h-screen bg-grey-50">
      {/* Sidebar */}
      <MinimalSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <AnimatedPage className="h-full">
          <Outlet />
        </AnimatedPage>
      </main>
    </div>
  );
}
