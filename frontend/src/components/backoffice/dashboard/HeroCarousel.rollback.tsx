/**
 * HeroCarousel - 스와이프 가능한 히어로 카드 캐러셀
 *
 * 🔒 ROLLBACK POINT: 2025-12-13
 * - DayNavCard 탭 방식 (안정 버전)
 * - startPosition prop으로 날짜 변경 후 위치 제어
 * - 문제 시 이 파일로 복원
 *
 * - 좌우 스와이프로 오늘 수업 탐색
 * - 현재/다음 수업에 자동 포커스
 * - 완료된 수업은 시각적 구분
 * - 양 끝에 날짜 이동 카드 표시
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { CalendarIcon, NoteIcon, CheckIcon } from '../../ui/Icons';
import { Clock, ChevronLeft, ChevronRight, Sun } from 'lucide-react';

type ClassStatus = 'completed' | 'current' | 'upcoming';

export interface ClassSchedule {
  id: string;
  name: string;           // "중3A반"
  subject?: string;       // "수학"
  studentCount?: number;  // 8
  startTime: string;      // "17:00"
  endTime: string;        // "19:00"
  status: ClassStatus;
}

export interface DayInfo {
  date: string;           // "12월 11일"
  dayOfWeek: string;      // "목"
  classCount: number;     // 3
}

interface HeroCarouselProps {
  classes: ClassSchedule[];
  onAttendance: (classId: string) => void;
  onProgress: (classId: string) => void;
  // 날짜 이동 관련
  prevDay?: DayInfo;
  nextDay?: DayInfo;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  // 날짜 변경 후 시작 위치 ('first' = 첫 수업, 'last' = 마지막 수업)
  startPosition?: 'first' | 'last';
}

export function HeroCarousel({
  classes,
  onAttendance,
  onProgress,
  prevDay,
  nextDay,
  onPrevDay,
  onNextDay,
  startPosition = 'first',
}: HeroCarouselProps) {
  // 날짜 이동 카드 포함 여부
  const hasPrevDay = !!prevDay && !!onPrevDay;
  const hasNextDay = !!nextDay && !!onNextDay;

  // 현재/다음 수업 인덱스 찾기 (날짜 카드 offset 고려)
  const classCurrentIndex = classes.findIndex((c) => c.status === 'current');
  const classStartIndex = classCurrentIndex >= 0 ? classCurrentIndex : 0;
  // 이전 날짜 카드가 있으면 +1
  const startIndex = hasPrevDay ? classStartIndex + 1 : classStartIndex;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex,
    align: 'center',
    containScroll: 'trimSnaps',
  });

  const [selectedIndex, setSelectedIndex] = useState(startIndex);

  // 슬라이드 변경 시 인덱스 업데이트
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // 날짜 변경 시 startPosition에 따라 스크롤
  // 'first' → 첫 번째 수업, 'last' → 마지막 수업
  useEffect(() => {
    if (!emblaApi) return;

    // Embla가 새 슬라이드를 인식하도록 reInit 호출
    emblaApi.reInit();

    // DOM 업데이트 후 스크롤 (requestAnimationFrame 사용)
    requestAnimationFrame(() => {
      const classCount = classes.length || 1; // 수업 없으면 NoClassCard 1개

      if (startPosition === 'last') {
        // 마지막 수업으로 (이전 날짜에서 왔을 때)
        // 슬라이드: [prev?, class0, class1, ..., classN-1, next?]
        // 마지막 수업 인덱스 = (hasPrevDay ? 1 : 0) + classCount - 1
        const prevOffset = hasPrevDay ? 1 : 0;
        const lastClassIndex = prevOffset + classCount - 1;
        emblaApi.scrollTo(lastClassIndex, true);
      } else {
        // 첫 번째 수업으로 (다음 날짜에서 왔을 때)
        const firstClassIndex = hasPrevDay ? 1 : 0;
        emblaApi.scrollTo(firstClassIndex, true);
      }
    });
  }, [emblaApi, classes, hasPrevDay, startPosition]);

  // 수업이 1개이고 날짜 이동 카드가 없으면 단일 카드 표시
  if (classes.length === 1 && !hasPrevDay && !hasNextDay) {
    return (
      <div className="mb-4">
        <HeroCard
          classInfo={classes[0]}
          onAttendance={() => onAttendance(classes[0].id)}
          onProgress={() => onProgress(classes[0].id)}
        />
      </div>
    );
  }

  // 수업이 없고 날짜 이동 카드도 없으면 표시 안함
  if (classes.length === 0 && !hasPrevDay && !hasNextDay) {
    return null;
  }

  // 수업이 없으면 "수업 없음" 카드 1개 추가
  const hasNoClassCard = classes.length === 0;
  const contentSlideCount = hasNoClassCard ? 1 : classes.length;

  // 전체 슬라이드 수 계산
  const totalSlides = (hasPrevDay ? 1 : 0) + contentSlideCount + (hasNextDay ? 1 : 0);

  return (
    <div className="mb-4">
      {/* 캐러셀 */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {/* 이전 날짜 카드 */}
          {hasPrevDay && prevDay && (
            <div className="flex-[0_0_100%] min-w-0">
              <DayNavCard
                direction="prev"
                dayInfo={prevDay}
                onClick={onPrevDay!}
              />
            </div>
          )}

          {/* 수업 카드들 또는 수업 없음 카드 */}
          {hasNoClassCard ? (
            <div className="flex-[0_0_100%] min-w-0">
              <NoClassCard />
            </div>
          ) : (
            classes.map((cls) => (
              <div
                key={cls.id}
                className="flex-[0_0_100%] min-w-0"
              >
                <HeroCard
                  classInfo={cls}
                  onAttendance={() => onAttendance(cls.id)}
                  onProgress={() => onProgress(cls.id)}
                />
              </div>
            ))
          )}

          {/* 다음 날짜 카드 */}
          {hasNextDay && nextDay && (
            <div className="flex-[0_0_100%] min-w-0">
              <DayNavCard
                direction="next"
                dayInfo={nextDay}
                onClick={onNextDay!}
              />
            </div>
          )}
        </div>
      </div>

      {/* 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {/* 이전 날짜 인디케이터 */}
        {hasPrevDay && (
          <button
            onClick={() => emblaApi?.scrollTo(0)}
            className={`transition-all duration-200 rounded-full ${
              selectedIndex === 0
                ? 'w-6 h-2 bg-[#9CA3AF]'
                : 'w-2 h-2 bg-[#9CA3AF]'
            }`}
            aria-label="이전 날짜로 이동"
          />
        )}

        {/* 수업 인디케이터 또는 수업 없음 인디케이터 */}
        {hasNoClassCard ? (
          <button
            onClick={() => emblaApi?.scrollTo(hasPrevDay ? 1 : 0)}
            className={`transition-all duration-200 rounded-full ${
              selectedIndex === (hasPrevDay ? 1 : 0)
                ? 'w-6 h-2 bg-[#3182F6]'
                : 'w-2 h-2 bg-[#E5E8EB]'
            }`}
            aria-label="오늘 수업"
          />
        ) : (
          classes.map((cls, index) => {
            const slideIndex = hasPrevDay ? index + 1 : index;
            return (
              <button
                key={cls.id}
                onClick={() => emblaApi?.scrollTo(slideIndex)}
                className={`transition-all duration-200 rounded-full ${
                  slideIndex === selectedIndex
                    ? 'w-6 h-2 bg-[#3182F6]'
                    : cls.status === 'completed'
                    ? 'w-2 h-2 bg-[#B0B8C1]'
                    : 'w-2 h-2 bg-[#E5E8EB]'
                }`}
                aria-label={`${cls.name} 수업으로 이동`}
              />
            );
          })
        )}

        {/* 다음 날짜 인디케이터 */}
        {hasNextDay && (
          <button
            onClick={() => emblaApi?.scrollTo(totalSlides - 1)}
            className={`transition-all duration-200 rounded-full ${
              selectedIndex === totalSlides - 1
                ? 'w-6 h-2 bg-[#9CA3AF]'
                : 'w-2 h-2 bg-[#9CA3AF]'
            }`}
            aria-label="다음 날짜로 이동"
          />
        )}
      </div>
    </div>
  );
}

/**
 * HeroCard - 개별 히어로 카드
 */
interface HeroCardProps {
  classInfo: ClassSchedule;
  onAttendance: () => void;
  onProgress: () => void;
}

function HeroCard({ classInfo, onAttendance, onProgress }: HeroCardProps) {
  const isCompleted = classInfo.status === 'completed';
  const isCurrent = classInfo.status === 'current';

  // 상태별 라벨
  const getStatusLabel = (): ReactNode => {
    if (isCompleted) return <><CheckIcon size={12} /> 수업 완료</>;
    if (isCurrent) return <><Clock size={12} /> 다음 수업</>;
    return <><CalendarIcon size={12} /> 예정된 수업</>;
  };

  // 상태별 배경 그라디언트
  const getBackground = () => {
    if (isCompleted) {
      return 'linear-gradient(135deg, #6B7684 0%, #4E5968 100%)';
    }
    return 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)';
  };

  return (
    <div
      className="rounded-2xl p-5 text-white relative overflow-hidden"
      style={{ background: getBackground() }}
    >
      {/* 현재 수업 강조 링 */}
      {isCurrent && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-white/30 pointer-events-none" />
      )}

      {/* 상태 라벨 */}
      <div className="text-xs opacity-80 mb-2 flex items-center gap-1.5">
        <span>{getStatusLabel()}</span>
        {isCurrent && (
          <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-medium">
            NOW
          </span>
        )}
      </div>

      {/* 시간 */}
      <div className={`text-2xl font-bold mb-1 ${isCompleted ? 'opacity-70' : ''}`}>
        {classInfo.startTime} - {classInfo.endTime}
      </div>

      {/* 반 정보 */}
      <div className={`text-sm opacity-90 mb-4 ${isCompleted ? 'opacity-70' : ''}`}>
        {classInfo.name}
        {classInfo.subject && ` ${classInfo.subject}`}
        {classInfo.studentCount && ` | 학생 ${classInfo.studentCount}명`}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={onAttendance}
          className={`flex-1 py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isCompleted
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white text-[#3182F6]'
          }`}
        >
          <span>{isCompleted ? '👁' : '✓'}</span>
          <span>{isCompleted ? '출결 보기' : '출결 체크'}</span>
        </button>
        <button
          onClick={onProgress}
          className={`flex-1 py-2.5 px-4 rounded-[10px] text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isCompleted
              ? 'bg-white/10 text-white/70'
              : 'bg-white/20 text-white'
          }`}
        >
          <NoteIcon size={16} />
          <span>{isCompleted ? '기록 보기' : '진도 기록'}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * NoClassCard - 수업 없음 카드
 */
function NoClassCard() {
  return (
    <div
      className="rounded-2xl p-5 text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]"
      style={{ background: 'linear-gradient(135deg, #3182F6 0%, #2563eb 100%)' }}
    >
      <Sun size={48} className="mb-3 opacity-90" />
      <div className="text-xl font-bold mb-2">오늘 수업이 없습니다</div>
      <div className="text-sm opacity-80">편안한 하루 보내세요!</div>
    </div>
  );
}

/**
 * DayNavCard - 날짜 이동 카드
 */
interface DayNavCardProps {
  direction: 'prev' | 'next';
  dayInfo: DayInfo;
  onClick: () => void;
}

function DayNavCard({ direction, dayInfo, onClick }: DayNavCardProps) {
  const isPrev = direction === 'prev';

  return (
    <div
      onClick={onClick}
      className="rounded-2xl p-5 relative overflow-hidden cursor-pointer transition-all duration-200 active:scale-[0.98] flex flex-col items-center justify-center min-h-[160px]"
      style={{ background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)' }}
    >
      {/* 화살표 아이콘 */}
      <div className="text-[#6B7280] mb-2">
        {isPrev ? <ChevronLeft size={32} /> : <ChevronRight size={32} />}
      </div>

      {/* 날짜 */}
      <div className="text-base font-semibold text-[#374151] mb-1">
        {dayInfo.date} ({dayInfo.dayOfWeek})
      </div>

      {/* 라벨 */}
      <div className="text-[13px] text-[#6B7280]">
        {isPrev ? '이전 날짜로 이동' : '다음 날짜로 이동'}
      </div>

      {/* 수업 개수 */}
      <div className="text-[12px] text-[#9CA3AF] mt-2">
        {dayInfo.classCount > 0 ? `수업 ${dayInfo.classCount}개` : '수업 없음'}
      </div>
    </div>
  );
}

export default HeroCarousel;
