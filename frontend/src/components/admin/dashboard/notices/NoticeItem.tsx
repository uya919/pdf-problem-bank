/**
 * NoticeItem - 일반 공지 아이템 컴포넌트
 *
 * Stage 16: 캘린더 통합 공지사항
 * - 시험, 특강, 행사, 운영 등 일반 공지용
 * - 리스트 형태로 간결하게 표시
 * - 호버 시 배경색 변경 + 수정/삭제 버튼 표시
 */

import { useState } from 'react';
import {
  FileText,
  GraduationCap,
  PartyPopper,
  Settings,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Notice, NoticeType } from '../../../../types/admin';
import { NOTICE_TYPE_STYLES } from '../../../../types/admin';

interface NoticeItemProps {
  notice: Notice;
  onClick?: () => void;
  onEdit?: (notice: Notice) => void;
  onDelete?: (notice: Notice) => void;
  showActions?: boolean;
}

/**
 * 일반 공지 유형별 아이콘
 */
function NoticeIcon({ type, className }: { type: NoticeType; className?: string }) {
  switch (type) {
    case 'exam':
      return <FileText className={className} />;
    case 'special':
      return <GraduationCap className={className} />;
    case 'event':
      return <PartyPopper className={className} />;
    case 'operation':
      return <Settings className={className} />;
    default:
      return <Clock className={className} />;
  }
}

/**
 * 일반 공지 아이템
 * - 리스트 형태로 표시
 * - 아이콘 + 제목 + 시간 + 뱃지
 * - 호버 시 수정/삭제 메뉴 표시
 */
export function NoticeItem({
  notice,
  onClick,
  onEdit,
  onDelete,
  showActions = false,
}: NoticeItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const style = NOTICE_TYPE_STYLES[notice.type];

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit?.(notice);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete?.(notice);
  };

  return (
    <div
      className={`
        relative group flex items-center gap-3 p-2.5
        rounded-lg cursor-pointer
        hover:bg-grey-100 active:bg-grey-200
        transition-colors duration-150
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* 아이콘 */}
      <div
        className={`
          w-7 h-7 ${style.iconBgColor}
          rounded-md flex items-center justify-center
          shrink-0
        `}
      >
        <NoticeIcon type={notice.type} className={`w-3.5 h-3.5 ${style.textColor}`} />
      </div>

      {/* 제목 + 시간 */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-grey-900 truncate">{notice.title}</span>
        {notice.startTime && (
          <span className="text-xs text-grey-400 shrink-0">{notice.startTime}</span>
        )}
      </div>

      {/* 뱃지 */}
      <span
        className={`
          px-1.5 py-0.5 shrink-0
          ${style.badgeBgColor} ${style.badgeTextColor}
          text-[10px] font-medium rounded
        `}
      >
        {style.label}
      </span>

      {/* 더보기 메뉴 (showActions=true일 때만) */}
      {showActions && (onEdit || onDelete) && (
        <div className="relative">
          <button
            onClick={handleMenuClick}
            className={`
              p-1 rounded-md transition-opacity
              ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              hover:bg-grey-200
            `}
            aria-label="더보기"
          >
            <MoreVertical className="w-4 h-4 text-grey-500" />
          </button>

          {/* 드롭다운 메뉴 */}
          {isMenuOpen && (
            <>
              {/* 배경 클릭 시 닫기 */}
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }}
              />

              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-grey-100 py-1 min-w-[100px]">
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-grey-700 hover:bg-grey-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    수정
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
