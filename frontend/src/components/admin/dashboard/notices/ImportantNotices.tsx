/**
 * ImportantNotices - 중요 알림 섹션 컴포넌트
 *
 * Stage 16: 캘린더 통합 공지사항
 * - 긴급, 휴원, 결석 등 중요 공지 표시
 * - 2열 그리드 레이아웃
 * - 빨간/주황 강조 배경
 */

import { AlertCircle } from 'lucide-react';
import { NoticeCard } from './NoticeCard';
import type { Notice } from '../../../../types/admin';

interface ImportantNoticesProps {
  notices: Notice[];
  onNoticeClick?: (notice: Notice) => void;
}

/**
 * 중요 알림 섹션
 * - 캘린더 하단에 2열 그리드로 표시
 * - 긴급/휴원/결석 공지만 필터링되어 전달됨
 */
export function ImportantNotices({ notices, onNoticeClick }: ImportantNoticesProps) {
  if (notices.length === 0) {
    return null;
  }

  return (
    <section className="px-5 pb-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <h4 className="text-sm font-semibold text-grey-900">중요 알림</h4>
        <span className="text-xs text-grey-400">({notices.length})</span>
      </div>

      {/* 카드 그리드 (2열) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {notices.map((notice) => (
          <NoticeCard
            key={notice.id}
            notice={notice}
            onClick={() => onNoticeClick?.(notice)}
          />
        ))}
      </div>
    </section>
  );
}
