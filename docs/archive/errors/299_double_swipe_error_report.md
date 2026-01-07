# 카드 2개 동시 이동 에러 리포트

**작성일**: 2025-12-13
**증상**: 스와이프 시 카드가 2개씩 한꺼번에 넘어감

---

## 1. 문제 분석

### 1.1 현재 이벤트 흐름

```
사용자 스와이프
    ↓
┌─────────────────────────────────────┐
│  Embla Carousel (내장 스와이프)      │ ← 1번째 카드 이동
│  + 우리 터치 핸들러 (날짜 변경)       │ ← 2번째 카드 이동 (날짜 변경 후)
└─────────────────────────────────────┘
```

### 1.2 의심되는 원인

| 원인 | 가능성 | 설명 |
|------|--------|------|
| **이중 이벤트 처리** | 높음 | Embla + 커스텀 핸들러가 둘 다 스와이프 처리 |
| **터치/마우스 동시 발생** | 중간 | 터치 디바이스에서 두 이벤트가 모두 발생 |
| **startIndex 초기화 문제** | 중간 | 날짜 변경 후 캐러셀이 잘못된 위치에서 시작 |

---

## 2. 원인 상세 분석

### 2.1 Embla + 커스텀 핸들러 충돌

**현재 코드:**
```typescript
// Embla가 자체적으로 스와이프 처리 (1번 이동)
const [emblaRef, emblaApi] = useEmblaCarousel({
  loop: false,
  startIndex,
  align: 'center',
  containScroll: 'trimSnaps',
});

// 우리 핸들러도 스와이프 처리 (날짜 변경 → 새 카드 로드)
const handleTouchEnd = useCallback((e: React.TouchEvent) => {
  // 날짜 변경 트리거
  if (diff > SWIPE_THRESHOLD && currentSlide === totalSlides - 1) {
    triggerDayChange('next'); // 날짜 변경 → 새 데이터 로드
  }
}, [...]);
```

**문제:**
1. 사용자가 마지막 카드(3번)에서 왼쪽으로 스와이프
2. Embla가 스와이프를 감지하지만 마지막이라 이동 안함
3. 우리 핸들러가 `triggerDayChange('next')` 호출
4. 날짜가 바뀌면서 새로운 수업 데이터 로드
5. **새 날짜의 startIndex가 "current" 수업 위치로 설정됨**
6. 결과: 1번 카드가 아닌 2번 카드에서 시작

### 2.2 startIndex 문제

```typescript
// 현재/다음 수업 인덱스 찾기
const classCurrentIndex = classes.findIndex((c) => c.status === 'current');
const startIndex = classCurrentIndex >= 0 ? classCurrentIndex : 0;
```

**문제:**
- 다음 날로 이동 시 `status === 'current'`인 수업이 1번째가 아닐 수 있음
- 예: 다음 날 첫 수업이 `upcoming`, 두 번째가 `current`면 2번에서 시작

---

## 3. 해결 방안

### 3.1 Option 1: 날짜 변경 시 startIndex 강제 설정

```typescript
const triggerDayChange = useCallback((direction: 'next' | 'prev') => {
  // ...기존 코드...

  setTimeout(() => {
    handler();

    // 날짜 변경 후 첫 번째 카드로 강제 이동
    setTimeout(() => {
      emblaApi?.scrollTo(0, false); // 애니메이션 없이 첫 카드로
      setIsTransitioning(false);
      canTriggerRef.current = true;
    }, 300);
  }, 400);
}, [...]);
```

### 3.2 Option 2: 날짜 변경 플래그로 startIndex 제어

```typescript
const [justChangedDate, setJustChangedDate] = useState(false);

// 날짜 변경 직후면 항상 0번 인덱스
const startIndex = justChangedDate
  ? 0
  : (classCurrentIndex >= 0 ? classCurrentIndex : 0);

const triggerDayChange = useCallback((direction: 'next' | 'prev') => {
  setJustChangedDate(true);
  // ...
  setTimeout(() => {
    setJustChangedDate(false);
  }, 500);
}, [...]);
```

### 3.3 Option 3: 이전 날 → 마지막 카드, 다음 날 → 첫 카드

```typescript
// BackofficeDemo.tsx에서 제어
const [forcedStartIndex, setForcedStartIndex] = useState<number | null>(null);

const handleNextDay = () => {
  setForcedStartIndex(0); // 다음 날: 첫 카드
  setSelectedDate(nextDate);
};

const handlePrevDay = () => {
  setForcedStartIndex(-1); // 이전 날: 마지막 카드 (-1은 특수값)
  setSelectedDate(prevDate);
};
```

---

## 4. 권장 해결책

**Option 1 (가장 간단)** 권장

이유:
- 코드 변경 최소화
- HeroCarousel 내부에서 처리 가능
- 날짜 변경 후 항상 첫 카드에서 시작 (일관된 UX)

---

## 5. 즉시 적용 코드

```typescript
// HeroCarousel.tsx - triggerDayChange 수정
const triggerDayChange = useCallback((direction: 'next' | 'prev') => {
  if (!canTriggerRef.current || isTransitioning) return;

  const targetDay = direction === 'next' ? nextDay : prevDay;
  const handler = direction === 'next' ? onNextDay : onPrevDay;

  if (!targetDay || !handler) return;

  canTriggerRef.current = false;
  setTransitionText(`${targetDay.date}(${targetDay.dayOfWeek})로 이동 중...`);
  setIsTransitioning(true);

  setTimeout(() => {
    handler();

    // 오버레이 숨김 + 첫 카드로 강제 이동
    setTimeout(() => {
      emblaApi?.scrollTo(0, false); // ← 추가: 첫 카드로 이동
      setIsTransitioning(false);
      canTriggerRef.current = true;
    }, 300);
  }, 400);
}, [emblaApi, nextDay, prevDay, onNextDay, onPrevDay, isTransitioning]);
```

---

## 6. 추가 고려사항

### 6.1 이전 날로 갈 때는?

- **현재**: 첫 카드에서 시작
- **개선 가능**: 마지막 카드에서 시작 (연속성)

```typescript
const triggerDayChange = useCallback((direction: 'next' | 'prev') => {
  // ...
  setTimeout(() => {
    handler();

    setTimeout(() => {
      if (direction === 'next') {
        emblaApi?.scrollTo(0, false); // 다음 날: 첫 카드
      } else {
        // 이전 날: 마지막 카드 (classes.length - 1)
        // 하지만 새 데이터가 아직 로드 안됐을 수 있음
      }
      setIsTransitioning(false);
    }, 300);
  }, 400);
}, [...]);
```

### 6.2 데이터 로드 타이밍

- `handler()` 호출 후 React 상태 업데이트까지 시간 필요
- `scrollTo` 호출 시 새 데이터가 아직 반영 안됐을 수 있음
- 해결: 충분한 딜레이 또는 useEffect로 처리

---

## 7. 테스트 체크리스트

- [ ] 마지막 카드 → 왼쪽 스와이프 → 다음 날 첫 카드
- [ ] 첫 카드 → 오른쪽 스와이프 → 이전 날 첫 카드
- [ ] 중간 카드에서 스와이프 → 정상 이동 (날짜 변경 없음)
- [ ] 빠른 연속 스와이프 → 한 번만 날짜 변경

---

*에러 리포트 완료: 2025-12-13*
