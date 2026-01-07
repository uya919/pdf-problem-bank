/**
 * Phase 8-A: AdminLayout
 *
 * 관리자 PC 페이지용 레이아웃
 * - 사이드바: 240px 고정
 * - 헤더: 64px 고정
 * - 토스 스타일 디자인
 */
import { ReactNode } from 'react';
import { AdminTopNav } from './AdminTopNav';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-grey-50">
      {/* 상단 네비게이션 - 64px 고정 */}
      <AdminTopNav />

      {/* 메인 콘텐츠 영역 */}
      <main className="pt-16 p-6 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
