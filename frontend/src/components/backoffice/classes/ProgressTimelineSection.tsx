/**
 * ProgressTimelineSection - 진도 타임라인 섹션
 *
 * 목업: classes-page-v3-segment-control.html
 * - 타임라인 형태 (●/○ 마커)
 * - 날짜별 수업 내용
 * - 단원, 교재, 페이지
 * - 숙제 상태 (완료/미완료)
 */
import { BookIcon, NoteIcon, CheckIcon } from '../../ui/Icons';
import { Clock } from 'lucide-react';

export interface ProgressSession {
  id: string;
  date: string; // "12/11 (수)"
  isToday?: boolean;
  chapter: string;
  textbook: string;
  pages: string;
  homework?: {
    range: string;
    submitted: number;
    total: number;
  };
}

interface ProgressTimelineSectionProps {
  sessions: ProgressSession[];
}

export function ProgressTimelineSection({
  sessions,
}: ProgressTimelineSectionProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white mx-4 mt-3 rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookIcon size={18} className="text-gray-600" />
            <span className="text-sm font-semibold text-[#191F28]">진도</span>
          </div>
          <div className="text-center py-6">
            <NoteIcon size={28} className="text-gray-400 mx-auto" />
            <p className="text-sm text-[#8B95A1] mt-2">
              첫 수업을 기록해주세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white mx-4 mt-3 rounded-2xl border border-[#E5E8EB] overflow-hidden">
      <div className="p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookIcon size={18} className="text-gray-600" />
            <span className="text-sm font-semibold text-[#191F28]">진도</span>
          </div>
          <span className="text-xs text-[#8B95A1]">{sessions.length}회 수업</span>
        </div>

        {/* 타임라인 */}
        <div className="relative pl-4">
          {/* 타임라인 라인 */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-[#E5E8EB]" />

          {/* 수업 항목들 */}
          {sessions.map((session, index) => (
            <div
              key={session.id}
              className={`relative ${index < sessions.length - 1 ? 'pb-4' : ''}`}
            >
              {/* 마커 */}
              <div
                className={`absolute left-[-11px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                  session.isToday ? 'bg-[#3182F6]' : 'bg-[#3182F6]'
                }`}
              />

              {/* 내용 */}
              <div className="ml-4">
                {/* 날짜 */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[#191F28]">
                    {session.date}
                  </span>
                  {session.isToday && (
                    <span className="px-1.5 py-0.5 bg-[#3182F6] text-white text-[10px] rounded">
                      오늘
                    </span>
                  )}
                </div>

                {/* 단원 */}
                <div className="text-sm text-[#333D4B] font-medium">
                  {session.chapter}
                </div>

                {/* 교재/페이지 */}
                <div className="text-xs text-[#6B7684] mt-0.5">
                  {session.textbook} {session.pages}
                </div>

                {/* 숙제 */}
                {session.homework && (
                  <div className="flex items-center gap-1 mt-1">
                    {session.homework.submitted === session.homework.total ? (
                      <>
                        <CheckIcon size={12} className="text-[#22C55E]" />
                        <span className="text-xs text-[#22C55E]">
                          숙제 완료 {session.homework.submitted}/
                          {session.homework.total}
                        </span>
                      </>
                    ) : session.homework.submitted === 0 ? (
                      <>
                        <NoteIcon size={12} className="text-[#8B95A1]" />
                        <span className="text-xs text-[#6B7684]">
                          숙제 {session.homework.range} ({session.homework.total}
                          문제)
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock size={12} className="text-[#F59E0B]" />
                        <span className="text-xs text-[#F59E0B]">
                          진행 중 {session.homework.submitted}/
                          {session.homework.total}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProgressTimelineSection;
