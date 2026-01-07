/**
 * NoticeCard - 중요 알림 카드 컴포넌트
 *
 * Stage 16: 캘린더 통합 공지사항
 * - 긴급, 휴원, 결석 등 중요 알림을 강조 표시
 * - 아이콘 + 제목 + 설명 + 뱃지 레이아웃
 * - 토스 스타일 (rounded-xl, 컬러 배경)
 */

import { AlertTriangle, Calendar, UserX, Clock } from 'lucide-react';
import type { Notice, NoticeType } from '../../../../types/admin';
import { NOTICE_TYPE_STYLES } from '../../../../types/admin';

interface NoticeCardProps {
  notice: Notice;
  onClick?: () => void;
}

/**
 * 공지 유형별 아이콘 컴포넌트
 */
function NoticeIcon({ type, className }: { type: NoticeType; className?: string }) {
  switch (type) {
    case 'urgent':
      return <AlertTriangle className={className} />;
    case 'holiday':
      return <Calendar className={className} />;
    case 'absence':
      return <UserX className={className} />;
    default:
      return <Clock className={className} />;
  }
}

/**
 * 중요 알림 카드
 * - 긴급/휴원/결석 등 중요 공지에 사용
 * - 배경색 + 아이콘으로 시각적 강조
 */
export function NoticeCard({ notice, onClick }: NoticeCardProps) {
  const style = NOTICE_TYPE_STYLES[notice.type];

  return (
    <div
      className={`
        flex items-center gap-3 p-3
        ${style.bgColor} border ${style.borderColor}
        rounded-xl cursor-pointer
        hover:opacity-90 active:scale-[0.98]
        transition-all duration-150
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* 아이콘 */}
      <div
        className={`
          w-9 h-9 ${style.iconBgColor}
          rounded-lg flex items-center justify-center
          shrink-0
        `}
      >
        <NoticeIcon type={notice.type} className={`w-4 h-4 ${style.textColor}`} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-grey-900 text-sm truncate">
            {notice.title}
          </span>
          <span
            className={`
              px-1.5 py-0.5 shrink-0
              ${style.badgeBgColor} ${style.badgeTextColor}
              text-[10px] font-medium rounded
            `}
          >
            {style.label}
          </span>
        </div>
        {notice.description && (
          <p className="text-xs text-grey-500 truncate">{notice.description}</p>
        )}
      </div>

      {/* 시간 표시 (있는 경우) */}
      {notice.startTime && (
        <span className="text-xs text-grey-400 shrink-0">
          {notice.startTime}
          {notice.endTime && `~${notice.endTime}`}
        </span>
      )}
    </div>
  );
}
