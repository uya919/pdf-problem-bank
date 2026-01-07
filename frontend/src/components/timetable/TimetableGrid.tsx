/**
 * TimetableGrid - 시간표 그리드 컴포넌트
 *
 * Stage 5-C: 단일 시간표 그리드
 * Stage 5-H: 반응형 최적화
 * - Y축: 시간대 (10:00 ~ 22:00)
 * - X축: 요일 (월 ~ 토)
 * - 셀: 슬롯 배정 영역
 * - 모바일/태블릿: 가로 스크롤 + 시간 컬럼 고정
 */

import { useMemo } from 'react';
import type { TimetableSlot, DayOfWeek, TimeGridConfig } from '@/types/timetable';
import { DAY_OF_WEEK_LABELS, DEFAULT_TIME_GRID_CONFIG, generateTimeSlots } from '@/types/timetable';
import { SlotCell } from './SlotCell';

interface TimetableGridProps {
  slots: TimetableSlot[];
  config?: TimeGridConfig;
  onSlotClick?: (slot: TimetableSlot) => void;
  onCellClick?: (dayOfWeek: DayOfWeek, time: string) => void;
  onSlotDelete?: (slotId: string) => void;
  isDropTarget?: boolean;
  /** 컴팩트 모드 (모바일용) */
  compact?: boolean;
}

const DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5];

/**
 * 시간표 그리드
 */
export function TimetableGrid({
  slots,
  config = DEFAULT_TIME_GRID_CONFIG,
  onSlotClick,
  onCellClick,
  onSlotDelete,
  isDropTarget = false,
  compact = false,
}: TimetableGridProps) {
  const timeSlots = useMemo(() => generateTimeSlots(config), [config]);

  // 슬롯을 요일+시간으로 인덱싱
  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    slots.forEach((slot) => {
      const key = `${slot.dayOfWeek}-${slot.startTime}`;
      map.set(key, slot);
    });
    return map;
  }, [slots]);

  // 컴팩트/일반 모드에 따른 스타일
  const timeColumnWidth = compact ? '48px' : '60px';
  const dayColumnWidth = compact ? '80px' : '1fr';
  const cellHeight = compact ? '48px' : '60px';

  return (
    <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
      {/* 반응형 가로 스크롤 컨테이너 */}
      <div className="overflow-x-auto">
        <div
          className="min-w-[560px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `${timeColumnWidth} repeat(6, ${dayColumnWidth})`,
          }}
        >
          {/* 요일 헤더 */}
          <div
            className="sticky left-0 z-10 bg-grey-50 border-b border-grey-200"
            style={{ gridColumn: 1 }}
          >
            <div className={`${compact ? 'p-2' : 'p-3'}`} />
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              className={`
                ${compact ? 'p-2 text-xs' : 'p-3 text-sm'}
                text-center font-semibold text-grey-700
                border-l border-b border-grey-200 bg-grey-50
              `}
            >
              {DAY_OF_WEEK_LABELS[day]}
            </div>
          ))}

          {/* 시간대별 행 */}
          {timeSlots.map((time) => (
            <>
              {/* 시간 라벨 (sticky) */}
              <div
                key={`time-${time}`}
                className={`
                  sticky left-0 z-10 bg-grey-50/95 backdrop-blur-sm
                  ${compact ? 'p-1 text-[10px]' : 'p-2 text-xs'}
                  text-grey-500 text-right pr-2
                  border-b border-grey-100
                `}
                style={{ minHeight: cellHeight }}
              >
                {time}
              </div>

              {/* 요일별 셀 */}
              {DAYS.map((day) => {
                const key = `${day}-${time}`;
                const slot = slotMap.get(key);

                return (
                  <div
                    key={key}
                    className="border-l border-b border-grey-100"
                    style={{ minHeight: cellHeight }}
                  >
                    <SlotCell
                      dayOfWeek={day}
                      time={time}
                      slot={slot}
                      onClick={() => {
                        if (slot) {
                          onSlotClick?.(slot);
                        } else {
                          onCellClick?.(day, time);
                        }
                      }}
                      onDelete={slot ? () => onSlotDelete?.(slot.id) : undefined}
                      isDropTarget={isDropTarget}
                      compact={compact}
                    />
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
