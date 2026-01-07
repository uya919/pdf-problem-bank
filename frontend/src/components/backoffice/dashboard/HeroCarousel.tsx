/**
 * HeroCarousel - 스와이프 가능한 히어로 카드 캐러셀
 *
 * - 좌우 스와이프로 오늘 수업 탐색
 * - 현재/다음 수업에 자동 포커스
 * - 완료된 수업은 시각적 구분
 * - 양 끝에 날짜 이동 카드 표시
 */
import { useCallback, useEffect, useState, useRef, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { CalendarIcon, NoteIcon, CheckIcon } from '../../ui/Icons';
import { Clock, ChevronLeft, ChevronRight, Sun, Eye, Check } from 'lucide-react';

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

  // 현재/다음 수업 인덱스 찾기 (DayNavCard 제거로 offset 불필요)
  const classCurrentIndex = classes.findIndex((c) => c.status === 'current');
  const startIndex = classCurrentIndex >= 0 ? classCurrentIndex : 0;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex,
    align: 'center',
    containScroll: 'trimSnaps',
  });

  const [selectedIndex, setSelectedIndex] = useState(startIndex);

  // Phase 1: 경계 상태 추적
  const [isAtStart, setIsAtStart] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

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

  // Phase 1: 경계 상태 업데이트
  useEffect(() => {
    if (!emblaApi) return;

    const updateBoundary = () => {
      const canPrev = emblaApi.canScrollPrev();
      const canNext = emblaApi.canScrollNext();
      setIsAtStart(!canPrev);
      setIsAtEnd(!canNext);
    };

    emblaApi.on('select', updateBoundary);
    emblaApi.on('reInit', updateBoundary);
    updateBoundary(); // 초기 상태

    return () => {
      emblaApi.off('select', updateBoundary);
      emblaApi.off('reInit', updateBoundary);
    };
  }, [emblaApi]);

  // 통합 네비게이션: 모든 케이스에서 터치 이벤트만 사용
  // Embla는 캐러셀 스크롤과 경계 상태 감지만 담당
  const isNavigatingRef = useRef(false);

  // 날짜 변경 시 startPosition에 따라 스크롤
  // 'first' → 첫 번째 수업, 'last' → 마지막 수업
  useEffect(() => {
    if (!emblaApi) return;

    // Embla가 새 슬라이드를 인식하도록 reInit 호출
    emblaApi.reInit();

    // DOM 업데이트 후 스크롤 (requestAnimationFrame 사용)
    // DayNavCard 제거로 단순화: [class0, class1, ..., classN-1]
    requestAnimationFrame(() => {
      const classCount = classes.length || 1; // 수업 없으면 NoClassCard 1개

      let targetIndex: number;
      if (startPosition === 'last') {
        // 마지막 수업으로 (이전 날짜에서 왔을 때)
        targetIndex = classCount - 1;
      } else {
        // 첫 번째 수업으로 (다음 날짜에서 왔을 때)
        targetIndex = 0;
      }

      emblaApi.scrollTo(targetIndex, true);
      // 인디케이터 동기화: scrollTo(true)는 select 이벤트를 발생시키지 않으므로 수동 설정
      setSelectedIndex(targetIndex);
    });
  }, [emblaApi, classes, startPosition]);

  // 수업이 없으면 NoClassCard 1개를 캐러셀에 표시 (스와이프로 날짜 이동 가능)
  const hasNoClass = classes.length === 0;

  // 통합 터치 핸들러: 모든 케이스에서 동일하게 동작
  // 터치 시작 시점의 경계 상태를 저장해서 사용
  const touchStartRef = useRef<number | null>(null);
  const wasAtStartRef = useRef(false);
  const wasAtEndRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    // 터치 시작 시점의 경계 상태 저장
    wasAtStartRef.current = isAtStart;
    wasAtEndRef.current = isAtEnd;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    if (isNavigatingRef.current) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;
    const threshold = 50; // 50px 이상 스와이프해야 인식

    // 터치 시작 시점에 경계에 있었고, 해당 방향으로 스와이프했으면 날짜 이동
    // 왼쪽으로 스와이프 → 다음 날짜 (시작 시점에 끝에 있었을 때만)
    if (diff > threshold && wasAtEndRef.current && hasNextDay && onNextDay) {
      isNavigatingRef.current = true;
      onNextDay();
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 600);
    }
    // 오른쪽으로 스와이프 → 이전 날짜 (시작 시점에 처음에 있었을 때만)
    else if (diff < -threshold && wasAtStartRef.current && hasPrevDay && onPrevDay) {
      isNavigatingRef.current = true;
      onPrevDay();
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 600);
    }

    touchStartRef.current = null;
  };

  return (
    <div className="mb-4">
      {/* 캐러셀 - 수업 카드 또는 수업 없음 카드 */}
      <div
        ref={emblaRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex">
          {hasNoClass ? (
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
        </div>
      </div>

      {/* 인디케이터 - 수업이 있을 때만 표시 */}
      {!hasNoClass && classes.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {classes.map((cls, index) => (
            <button
              key={cls.id}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`transition-all duration-200 rounded-full ${
                index === selectedIndex
                  ? 'w-6 h-2 bg-[#3182F6]'
                  : cls.status === 'completed'
                  ? 'w-2 h-2 bg-[#B0B8C1]'
                  : 'w-2 h-2 bg-[#E5E8EB]'
              }`}
              aria-label={`${cls.name} 수업으로 이동`}
            />
          ))}
        </div>
      )}
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
          {isCompleted ? <Eye className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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
