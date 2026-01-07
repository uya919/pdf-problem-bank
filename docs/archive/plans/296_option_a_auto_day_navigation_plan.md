# Option A: 완전 자동 날짜 이동 개발 계획

> 마지막 수업 카드에서 스와이프하면 바로 다음 날짜로 이동

**작성일**: 2025-12-12
**참조**: [295_auto_day_navigation_feasibility_report.md](295_auto_day_navigation_feasibility_report.md)

---

## 1. 개요

### 1.1 목표
```
[수업1] → [수업2] → [수업3] → (스와이프) → 바로 다음 날짜 로드
```

- 날짜 이동 카드(DayNavCard) 제거
- 마지막/첫 카드에서 스와이프 시 자동으로 날짜 변경
- 전환 오버레이로 날짜 변경 피드백 제공

### 1.2 예상 작업량
- **총 예상**: 4단계, 약 2시간
- **난이도**: 중간 (6/10)

---

## 2. 단계별 개발 계획

### Phase 1: DayNavCard 제거 및 Props 정리 (20분)

**목표**: 기존 날짜 이동 카드 제거, 자동 이동 준비

**작업 내용**:

1. **HeroCarousel.tsx 수정**
   - DayNavCard 렌더링 제거
   - 날짜 카드 관련 인디케이터 제거
   - hasPrevDay/hasNextDay는 유지 (자동 이동 가능 여부 판단용)

2. **슬라이드 인덱스 재계산**
   - 날짜 카드 없으므로 offset 불필요
   - startIndex = classStartIndex (직접 매핑)

**변경 파일**:
- `frontend/src/components/backoffice/dashboard/HeroCarousel.tsx`

**코드 변경**:
```typescript
// Before: 날짜 카드 포함
const totalSlides = (hasPrevDay ? 1 : 0) + contentSlideCount + (hasNextDay ? 1 : 0);

// After: 수업 카드만
const totalSlides = contentSlideCount;
```

---

### Phase 2: 스와이프 경계 감지 로직 (30분)

**목표**: 마지막/첫 카드에서 스와이프 방향 감지

**작업 내용**:

1. **Embla 이벤트 리스너 추가**
   - `scroll` 이벤트로 실시간 스와이프 감지
   - `settle` 이벤트로 스와이프 완료 감지

2. **스와이프 방향 판단**
   - scrollProgress > 1: 마지막 카드 넘어서 오른쪽으로 스와이프
   - scrollProgress < 0: 첫 카드 넘어서 왼쪽으로 스와이프

3. **임계값 설정**
   - 기본: 50px 이상 스와이프 시 날짜 이동
   - 작은 스와이프는 무시 (실수 방지)

**핵심 코드**:
```typescript
const SWIPE_THRESHOLD = 50; // px

useEffect(() => {
  if (!emblaApi) return;

  let dragStartPos = 0;

  const onDragStart = () => {
    dragStartPos = emblaApi.internalEngine().location.get();
  };

  const onSettle = () => {
    const currentPos = emblaApi.internalEngine().location.get();
    const diff = currentPos - dragStartPos;
    const isAtEnd = emblaApi.selectedScrollSnap() === totalSlides - 1;
    const isAtStart = emblaApi.selectedScrollSnap() === 0;

    // 마지막 카드에서 왼쪽으로 스와이프 (다음 날)
    if (isAtEnd && diff < -SWIPE_THRESHOLD && onNextDay) {
      triggerDayChange('next');
    }

    // 첫 카드에서 오른쪽으로 스와이프 (이전 날)
    if (isAtStart && diff > SWIPE_THRESHOLD && onPrevDay) {
      triggerDayChange('prev');
    }
  };

  emblaApi.on('pointerDown', onDragStart);
  emblaApi.on('settle', onSettle);

  return () => {
    emblaApi.off('pointerDown', onDragStart);
    emblaApi.off('settle', onSettle);
  };
}, [emblaApi, totalSlides, onNextDay, onPrevDay]);
```

---

### Phase 3: 전환 오버레이 UI (25분)

**목표**: 날짜 변경 시 시각적 피드백 제공

**작업 내용**:

1. **TransitionOverlay 컴포넌트 생성**
   - fade-in/fade-out 애니메이션
   - 날짜 아이콘 + "12월 13일로 이동 중..." 텍스트

2. **상태 관리**
   - `isTransitioning`: 전환 중 여부
   - `transitionDirection`: 'next' | 'prev'

3. **전환 플로우**
   ```
   스와이프 감지 → 오버레이 표시 (0.3초)
                → 날짜 변경 콜백 실행
                → 오버레이 숨김 (0.3초)
   ```

**핵심 코드**:
```typescript
const [isTransitioning, setIsTransitioning] = useState(false);
const [transitionText, setTransitionText] = useState('');

const triggerDayChange = useCallback((direction: 'next' | 'prev') => {
  const targetDay = direction === 'next' ? nextDay : prevDay;
  if (!targetDay) return;

  setTransitionText(`${targetDay.date}(${targetDay.dayOfWeek})로 이동 중...`);
  setIsTransitioning(true);

  setTimeout(() => {
    if (direction === 'next') onNextDay?.();
    else onPrevDay?.();

    setTimeout(() => setIsTransitioning(false), 300);
  }, 300);
}, [nextDay, prevDay, onNextDay, onPrevDay]);
```

**TransitionOverlay JSX**:
```tsx
{isTransitioning && (
  <div className="fixed inset-0 bg-white/90 flex flex-col items-center justify-center z-50 animate-fade-in">
    <CalendarIcon size={48} className="text-[#3182F6] mb-4" />
    <div className="text-lg font-semibold text-[#191F28]">
      {transitionText}
    </div>
  </div>
)}
```

---

### Phase 4: 엣지 케이스 처리 및 테스트 (25분)

**목표**: 안정적인 동작 보장

**작업 내용**:

1. **수업 없는 날 처리**
   - NoClassCard에서도 스와이프 감지
   - 양방향 이동 가능

2. **연속 스와이프 방지**
   - 전환 중 스와이프 무시
   - debounce 적용 (500ms)

3. **날짜 범위 제한**
   - onPrevDay/onNextDay가 없으면 해당 방향 무시
   - 시각적 힌트 (탄성 효과)

4. **테스트 케이스**
   | 시나리오 | 예상 동작 |
   |----------|-----------|
   | 수업 3개 → 마지막에서 왼쪽 스와이프 | 다음 날로 이동 |
   | 수업 3개 → 첫 카드에서 오른쪽 스와이프 | 이전 날로 이동 |
   | 수업 없는 날 → 스와이프 | 해당 방향 날짜로 이동 |
   | 빠른 연속 스와이프 | 첫 번째만 처리 |
   | 작은 스와이프 (30px) | 무시됨 |

**debounce 코드**:
```typescript
const [canTrigger, setCanTrigger] = useState(true);

const triggerDayChange = useCallback((direction: 'next' | 'prev') => {
  if (!canTrigger || isTransitioning) return;

  setCanTrigger(false);
  // ... 전환 로직

  setTimeout(() => setCanTrigger(true), 500);
}, [canTrigger, isTransitioning, ...]);
```

---

## 3. 파일 변경 목록

| 파일 | 변경 내용 |
|------|-----------|
| `HeroCarousel.tsx` | DayNavCard 제거, 스와이프 감지, 전환 오버레이 |
| `BackofficeDemo.tsx` | 변경 없음 (기존 props 유지) |

---

## 4. 위험 요소 및 대응

| 위험 | 대응책 |
|------|--------|
| 실수로 날짜 변경 | 50px 임계값 + 전환 오버레이로 인지 |
| 되돌리기 어려움 | 역방향 스와이프로 즉시 복귀 가능 |
| 현재 날짜 혼란 | 헤더에 현재 날짜 표시 (DateSelector) |

---

## 5. 롤백 계획

Option A가 UX 문제를 유발하면:
1. DayNavCard 복원 (git에서)
2. 스와이프 감지 로직 제거
3. 기존 방식으로 즉시 복귀 가능

---

## 6. 체크리스트

- [ ] Phase 1: DayNavCard 제거
- [ ] Phase 2: 스와이프 경계 감지
- [ ] Phase 3: 전환 오버레이
- [ ] Phase 4: 엣지 케이스 처리
- [ ] 모바일 테스트 (iPhone)
- [ ] 연속 스와이프 테스트

---

*개발 계획 완료: 2025-12-12*
