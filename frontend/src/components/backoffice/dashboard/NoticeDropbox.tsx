/**
 * NoticeDropbox - 접기/펼치기 가능한 공지사항
 *
 * 목업: dashboard-modal-final.html 기준
 * - 헤더 클릭으로 접기/펼치기
 * - 읽지 않은 공지 개수 뱃지
 * - 체크박스로 읽음 처리
 */
import { useState } from 'react';

interface Notice {
  id: string;
  title: string;
  meta: string;     // "어머니 연락 · 오전 9:23"
  read: boolean;
}

interface NoticeDropboxProps {
  notices: Notice[];
  onToggleRead: (id: string) => void;
  defaultExpanded?: boolean;
}

export function NoticeDropbox({
  notices,
  onToggleRead,
  defaultExpanded = false,
}: NoticeDropboxProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const unreadCount = notices.filter((n) => !n.read).length;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
      {/* 헤더 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">📢</span>
          <span className="text-sm font-semibold text-[#191F28]">공지사항</span>
          {unreadCount > 0 && (
            <span className="bg-[#F04452] text-white text-[11px] px-2 py-0.5 rounded-full font-semibold">
              {unreadCount}
            </span>
          )}
        </div>
        <span
          className={`text-[#8B95A1] text-xs transition-transform duration-200 ${
            expanded ? '' : '-rotate-90'
          }`}
        >
          ▼
        </span>
      </button>

      {/* 콘텐츠 */}
      {expanded && (
        <div className="border-t border-[#F2F4F6]">
          {notices.length === 0 ? (
            <div className="py-6 text-center text-[#8B95A1] text-sm">
              공지사항이 없습니다
            </div>
          ) : (
            notices.map((notice) => (
              <NoticeItem
                key={notice.id}
                notice={notice}
                onToggleRead={onToggleRead}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface NoticeItemProps {
  notice: Notice;
  onToggleRead: (id: string) => void;
}

function NoticeItem({ notice, onToggleRead }: NoticeItemProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-[#F2F4F6] last:border-b-0 ${
        notice.read ? 'opacity-50' : ''
      }`}
    >
      {/* 체크박스 */}
      <button
        onClick={() => onToggleRead(notice.id)}
        className={`w-5 h-5 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
          notice.read
            ? 'bg-[#3182F6] border-[#3182F6] text-white'
            : 'border-2 border-[#B0B8C1] hover:border-[#3182F6]'
        }`}
      >
        {notice.read && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium ${
            notice.read ? 'text-[#8B95A1]' : 'text-[#191F28]'
          }`}
        >
          {notice.title}
        </div>
        <div className="text-[11px] text-[#8B95A1] mt-0.5">{notice.meta}</div>
      </div>
    </div>
  );
}
