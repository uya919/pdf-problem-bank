/**
 * Phase 8-A: AdminHeader
 *
 * 관리자 페이지 상단 헤더
 * - 페이지 제목
 * - 과목 필터 (전역)
 * - 사용자 정보
 * - 알림 (추후)
 */
import { Bell, Search, User } from 'lucide-react';
import { SubjectSelector } from './SubjectSelector';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-grey-200 px-6 flex items-center justify-between sticky top-0 z-10">
      {/* 페이지 제목 */}
      <div>
        {title && (
          <h1 className="text-lg font-bold text-grey-900">{title}</h1>
        )}
        {subtitle && (
          <p className="text-sm text-grey-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* 우측 액션 영역 */}
      <div className="flex items-center gap-3">
        {/* 검색 */}
        <button className="p-2 rounded-lg hover:bg-grey-100 text-grey-500 transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* 알림 */}
        <button className="p-2 rounded-lg hover:bg-grey-100 text-grey-500 transition-colors relative">
          <Bell className="w-5 h-5" />
          {/* 알림 뱃지 */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 구분선 */}
        <div className="w-px h-6 bg-grey-200" />

        {/* 과목 필터 */}
        <SubjectSelector />

        {/* 구분선 */}
        <div className="w-px h-6 bg-grey-200" />

        {/* 사용자 프로필 */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-grey-100 transition-colors">
          <div className="w-8 h-8 bg-grey-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-grey-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-grey-900">김원장</p>
            <p className="text-xs text-grey-500">원장</p>
          </div>
        </button>
      </div>
    </header>
  );
}
