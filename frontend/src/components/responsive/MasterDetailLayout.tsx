/**
 * MasterDetailLayout - Master-Detail 패턴 레이아웃
 *
 * 태블릿/데스크톱에서 좌측 마스터 리스트 + 우측 상세 패널 구조
 * 모바일에서는 전체 화면 전환 방식으로 동작
 */
import React, { ReactNode } from 'react';
import { useBreakpoint } from '../../hooks/useIsMobile';

interface MasterDetailLayoutProps {
  /** 마스터 패널 (리스트) */
  master: ReactNode;
  /** 디테일 패널 (상세 내용) */
  detail: ReactNode;
  /** 마스터 패널 너비 (기본값: 280px) */
  masterWidth?: number;
  /** 선택된 아이템이 있는지 (모바일에서 디테일 표시 여부) */
  hasSelection?: boolean;
  /** 모바일에서 뒤로가기 클릭 시 */
  onBack?: () => void;
  /** 빈 상태 컴포넌트 */
  emptyState?: ReactNode;
  /** 마스터 패널 배경색 */
  masterBg?: string;
  /** 디테일 패널 배경색 */
  detailBg?: string;
}

export function MasterDetailLayout({
  master,
  detail,
  masterWidth = 280,
  hasSelection = false,
  onBack,
  emptyState,
  masterBg = 'bg-gray-50',
  detailBg = 'bg-white',
}: MasterDetailLayoutProps) {
  const { isMobile } = useBreakpoint();

  // 모바일: 전체 화면 전환 방식
  if (isMobile) {
    return (
      <div className="h-full">
        {hasSelection ? (
          <div className={`h-full ${detailBg}`}>
            {/* 모바일 뒤로가기 헤더 */}
            {onBack && (
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-white border-b">
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  aria-label="뒤로가기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            )}
            {detail}
          </div>
        ) : (
          <div className={`h-full ${masterBg}`}>
            {master}
          </div>
        )}
      </div>
    );
  }

  // 태블릿/데스크톱: Master-Detail 레이아웃
  return (
    <div className="h-full flex">
      {/* 마스터 패널 (좌측) */}
      <div
        className={`flex-shrink-0 border-r overflow-y-auto ${masterBg}`}
        style={{ width: masterWidth }}
      >
        {master}
      </div>

      {/* 디테일 패널 (우측) */}
      <div className={`flex-1 overflow-y-auto ${detailBg}`}>
        {hasSelection ? (
          detail
        ) : (
          emptyState || <DefaultEmptyState />
        )}
      </div>
    </div>
  );
}

/** 기본 빈 상태 컴포넌트 */
function DefaultEmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-gray-400">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">항목을 선택해주세요</p>
      </div>
    </div>
  );
}

export default MasterDetailLayout;
