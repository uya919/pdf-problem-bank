# Option A 자동 날짜 이동 - 에러 리포트

**작성일**: 2025-12-12
**증상**: 마지막/첫 카드에서 스와이프해도 날짜가 넘어가지 않음

---

## 1. 현재 구현 분석

### 1.1 문제의 코드

```typescript
// HeroCarousel.tsx - 스와이프 감지 로직
useEffect(() => {
  if (!emblaApi) return;

  const onPointerDown = () => {
    const engine = emblaApi.internalEngine();
    dragStartPosRef.current = engine.location.get();
  };

  const onSettle = () => {
    const engine = emblaApi.internalEngine();
    const currentPos = engine.location.get();
    const diff = currentPos - dragStartPosRef.current;
    // ...
  };
}, [...]);
```

### 1.2 의심되는 원인

| 원인 | 가능성 | 설명 |
|------|--------|------|
| **containScroll 설정** | 높음 | `containScroll: 'trimSnaps'`가 경계에서 스와이프를 차단 |
| **location.get() 반환값** | 높음 | Embla 버전에 따라 API가 다를 수 있음 |
| **diff 계산 방향** | 중간 | 스와이프 방향과 diff 부호가 반대일 수 있음 |
| **settle 이벤트 타이밍** | 중간 | 경계에서 settle이 발생하지 않을 수 있음 |

---

## 2. 디버깅 필요 사항

### 2.1 콘솔 로그 추가 버전

```typescript
const onPointerDown = () => {
  const engine = emblaApi.internalEngine();
  dragStartPosRef.current = engine.location.get();
  console.log('[DEBUG] pointerDown - startPos:', dragStartPosRef.current);
};

const onSettle = () => {
  const engine = emblaApi.internalEngine();
  const currentPos = engine.location.get();
  const diff = currentPos - dragStartPosRef.current;
  const currentSlide = emblaApi.selectedScrollSnap();

  console.log('[DEBUG] settle - currentPos:', currentPos);
  console.log('[DEBUG] settle - diff:', diff);
  console.log('[DEBUG] settle - currentSlide:', currentSlide);
  console.log('[DEBUG] settle - totalSlides:', totalSlides);
  console.log('[DEBUG] settle - canGoNext:', canGoNext);
  console.log('[DEBUG] settle - canGoPrev:', canGoPrev);
  // ...
};
```

---

## 3. 대안적 구현 방법

### 3.1 Option A-1: scrollProgress 사용

Embla의 `scrollProgress`를 활용하여 경계 감지:

```typescript
useEffect(() => {
  if (!emblaApi) return;

  const onScroll = () => {
    const progress = emblaApi.scrollProgress();

    // 1보다 크면 마지막을 넘어서 스와이프 중
    if (progress > 1.05 && canGoNext) {
      triggerDayChange('next');
    }

    // 0보다 작으면 처음을 넘어서 스와이프 중
    if (progress < -0.05 && canGoPrev) {
      triggerDayChange('prev');
    }
  };

  emblaApi.on('scroll', onScroll);
  return () => emblaApi.off('scroll', onScroll);
}, [emblaApi, canGoNext, canGoPrev, triggerDayChange]);
```

### 3.2 Option A-2: 터치 이벤트 직접 감지

Embla 이벤트 대신 DOM 터치 이벤트 사용:

```typescript
const [touchStart, setTouchStart] = useState(0);

const handleTouchStart = (e: React.TouchEvent) => {
  setTouchStart(e.touches[0].clientX);
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const touchEnd = e.changedTouches[0].clientX;
  const diff = touchStart - touchEnd;
  const currentSlide = emblaApi?.selectedScrollSnap() ?? 0;

  // 왼쪽으로 50px 이상 스와이프 + 마지막 카드
  if (diff > 50 && currentSlide === totalSlides - 1 && canGoNext) {
    triggerDayChange('next');
  }

  // 오른쪽으로 50px 이상 스와이프 + 첫 카드
  if (diff < -50 && currentSlide === 0 && canGoPrev) {
    triggerDayChange('prev');
  }
};
```

### 3.3 Option A-3: watchDrag 옵션 사용

Embla의 `watchDrag` 콜백으로 드래그 감지:

```typescript
const [emblaRef, emblaApi] = useEmblaCarousel({
  loop: false,
  startIndex,
  align: 'center',
  containScroll: false,  // 경계 제한 해제
  watchDrag: (emblaApi, event) => {
    // 드래그 중 위치 추적 가능
    return true; // 드래그 허용
  },
});
```

---

## 4. 권장 수정안

**Option A-2 (터치 이벤트 직접 감지)** 권장

이유:
- Embla 내부 API에 의존하지 않음
- 터치 이벤트는 모든 브라우저에서 동일하게 동작
- 디버깅이 쉬움

---

## 5. 즉시 적용 가능한 수정

```typescript
// HeroCarousel.tsx 수정
export function HeroCarousel({...}) {
  // ... 기존 코드 ...

  // 터치 이벤트로 경계 스와이프 감지
  const touchStartRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!canTriggerRef.current || isTransitioning) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd; // 양수 = 왼쪽 스와이프
    const currentSlide = emblaApi?.selectedScrollSnap() ?? 0;

    // 왼쪽으로 80px 이상 스와이프 + 마지막 카드
    if (diff > 80 && currentSlide === totalSlides - 1 && canGoNext) {
      triggerDayChange('next');
    }

    // 오른쪽으로 80px 이상 스와이프 + 첫 카드
    if (diff < -80 && currentSlide === 0 && canGoPrev) {
      triggerDayChange('prev');
    }
  }, [emblaApi, totalSlides, canGoNext, canGoPrev, triggerDayChange, isTransitioning]);

  return (
    <div className="mb-4 relative">
      <div
        ref={emblaRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ... */}
      </div>
    </div>
  );
}
```

---

## 6. 적용된 수정

### 변경 내용

1. **Embla 내부 API 감지 제거** - `internalEngine().location.get()` 방식 삭제
2. **터치 이벤트 직접 감지 추가** - `onTouchStart`, `onTouchEnd` 핸들러 사용
3. **임계값 조정** - 50px → 80px (실수 방지 강화)

### 수정된 코드

```typescript
// 터치 이벤트로 경계 스와이프 감지
const handleTouchStart = useCallback((e: React.TouchEvent) => {
  touchStartRef.current = e.touches[0].clientX;
}, []);

const handleTouchEnd = useCallback((e: React.TouchEvent) => {
  if (!canTriggerRef.current || isTransitioning) return;

  const touchEnd = e.changedTouches[0].clientX;
  const diff = touchStartRef.current - touchEnd; // 양수 = 왼쪽 스와이프
  const currentSlide = emblaApi?.selectedScrollSnap() ?? 0;

  // 왼쪽으로 80px 이상 스와이프 + 마지막 카드 → 다음 날
  if (diff > SWIPE_THRESHOLD && currentSlide === totalSlides - 1 && canGoNext) {
    triggerDayChange('next');
    return;
  }

  // 오른쪽으로 80px 이상 스와이프 + 첫 카드 → 이전 날
  if (diff < -SWIPE_THRESHOLD && currentSlide === 0 && canGoPrev) {
    triggerDayChange('prev');
    return;
  }
}, [...]);
```

---

## 7. 테스트 필요

- [x] 빌드 성공
- [ ] 마지막 카드 → 왼쪽 스와이프 → 다음 날 이동
- [ ] 첫 카드 → 오른쪽 스와이프 → 이전 날 이동
- [ ] 수업 없는 날 → 스와이프 → 날짜 이동

---

*수정 완료: 2025-12-12*
