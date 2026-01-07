/**
 * NoticeTooltip - 공지사항 말풍선 툴팁
 *
 * 목업: docs/mockups/tablet-dashboard-v2.html
 * - 다크 배경 + 화살표 말풍선
 * - 공지 제목 + 설명 표시
 * - 바깥 클릭 시 닫힘
 */
import { useEffect, useRef } from 'react';

export interface Notice {
  id: string;
  title: string;
  description: string;
  time?: string;
  /** 공지 유형 (Phase 28-A: 중요공지 색상 표시용) */
  type?: 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation';
}

interface NoticeTooltipProps {
  notices: Notice[];
  visible: boolean;
  onClose: () => void;
}

export function NoticeTooltip({ notices, visible, onClose }: NoticeTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!visible) return;

    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        // 부모 week-day 클릭은 제외 (재탭 처리용)
        const target = event.target as HTMLElement;
        if (!target.closest('.week-day')) {
          onClose();
        }
      }
    }

    // 약간의 딜레이 후 이벤트 등록 (클릭 직후 바로 닫히는 것 방지)
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible || notices.length === 0) return null;

  return (
    <div
      ref={tooltipRef}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
    >
      <div
        className="bg-[#191F28] text-white rounded-[10px] px-3.5 py-2.5 shadow-lg min-w-[140px]"
        style={{
          animation: 'tooltipFadeIn 0.2s ease',
        }}
      >
        {notices.map((notice, index) => (
          <div
            key={notice.id}
            className={`${index < notices.length - 1 ? 'pb-2 mb-2 border-b border-white/10' : ''}`}
          >
            <div className="text-[12px] font-semibold mb-0.5">{notice.title}</div>
            <div className="text-[10px] opacity-70">
              {notice.description}
              {notice.time && ` · ${notice.time}`}
            </div>
          </div>
        ))}

        {/* 화살표 */}
        <div
          className="absolute top-full left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #191F28',
          }}
        />
      </div>

      <style>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default NoticeTooltip;
