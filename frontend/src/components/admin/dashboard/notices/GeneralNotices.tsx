/**
 * GeneralNotices - 일반 공지 섹션 컴포넌트
 *
 * Stage 16: 캘린더 통합 공지사항
 * - 시험, 특강, 행사, 운영 등 일반 공지 표시
 * - 리스트 형태로 간결하게 표시
 * - 빈 상태 처리 포함
 */

import { Bell, Calendar } from 'lucide-react';
import { NoticeItem } from './NoticeItem';
import type { Notice } from '../../../../types/admin';

interface GeneralNoticesProps {
  notices: Notice[];
  date: string;
  isEmpty?: boolean; // 중요 알림도 없을 때 true
  onNoticeClick?: (notice: Notice) => void;
}

/**
 * 날짜 포맷 (YYYY-MM-DD → M월 D일)
 */
function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-').map(Number);
  return `${month}월 ${day}일`;
}

/**
 * 일반 공지 섹션
 * - 캘린더 하단에 리스트로 표시
 * - 시험/특강/행사/운영 공지
 */
export function GeneralNotices({
  notices,
  date,
  isEmpty = false,
  onNoticeClick,
}: GeneralNoticesProps) {
  // 중요 알림도 일반 공지도 없는 경우
  if (isEmpty && notices.length === 0) {
    return (
      <section className="px-5 pb-5">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 bg-grey-100 rounded-full flex items-center justify-center mb-3">
            <Calendar className="w-6 h-6 text-grey-400" />
          </div>
          <p className="text-sm text-grey-500 mb-1">
            {formatDateLabel(date)} 공지사항이 없습니다
          </p>
          <p className="text-xs text-grey-400">
            새로운 공지가 등록되면 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  // 일반 공지만 없는 경우 (중요 알림은 있음)
  if (notices.length === 0) {
    return null;
  }

  return (
    <section className="px-5 pb-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-grey-400" />
        <h4 className="text-sm font-semibold text-grey-900">일반 공지</h4>
        <span className="text-xs text-grey-400">({notices.length})</span>
      </div>

      {/* 공지 리스트 */}
      <div className="space-y-0.5">
        {notices.map((notice) => (
          <NoticeItem
            key={notice.id}
            notice={notice}
            onClick={() => onNoticeClick?.(notice)}
          />
        ))}
      </div>
    </section>
  );
}
