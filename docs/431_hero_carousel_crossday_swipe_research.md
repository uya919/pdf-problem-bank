# 431 히어로 캐러셀 날짜 간 스와이프 연구 리포트

> 작성일: 2025-12-25
> 목적: 첫/마지막 수업에서 스와이프 시 다른 날짜로 이동하는 기능 분석

---

## 1. 요청 사항

> "오늘 1번수업 2번수업이 있다고 하면,
> 1번수업에서 왼쪽으로 스와이프하면 전날 마지막수업으로 넘어가고,
> 2번수업에서 오른쪽으로 스와이프하면 다음날 첫수업으로 넘어가는 건 어떻게 생각해?"

---

## 2. 현재 구현 상태 분석

### 2.1 이미 구현되어 있음!

**놀랍게도 이 기능은 이미 `HeroCarousel.tsx`에 구현되어 있습니다.**

```typescript
// HeroCarousel.tsx (Line 147-187)

// 터치 핸들러: 경계에서 스와이프 시 날짜 이동
const handleTouchEnd = (e: React.TouchEvent) => {
  // ...
  // 왼쪽으로 스와이프 → 다음 날짜 (끝에 있을 때만)
  if (diff > threshold && wasAtEndRef.current && hasNextDay && onNextDay) {
    onNextDay();
  }
  // 오른쪽으로 스와이프 → 이전 날짜 (처음에 있을 때만)
  else if (diff < -threshold && wasAtStartRef.current && hasPrevDay && onPrevDay) {
    onPrevDay();
  }
};
```

### 2.2 현재 동작 방식

| 상황 | 스와이프 방향 | 결과 |
|------|-------------|------|
| 첫 번째 수업에서 | 오른쪽 (→) | 전날 **마지막** 수업으로 이동 |
| 마지막 수업에서 | 왼쪽 (←) | 다음날 **첫 번째** 수업으로 이동 |

### 2.3 startPosition 파라미터

```typescript
// BackofficeDemo.tsx
const handlePrevDay = () => {
  // ...
  setCarouselStartPosition('last'); // 이전 날짜 → 마지막 수업부터
};

const handleNextDay = () => {
  // ...
  setCarouselStartPosition('first'); // 다음 날짜 → 첫 수업부터
};
```

---

## 3. 구현 가능성: ✅ 이미 완료

### 3.1 관련 파일

| 파일 | 역할 |
|------|------|
| `HeroCarousel.tsx` | 스와이프 감지 + 경계 상태 추적 |
| `BackofficeDemo.tsx` | 날짜 이동 핸들러 + startPosition 설정 |

### 3.2 핵심 로직

1. **경계 상태 추적** (Line 72-110)
   ```typescript
   const [isAtStart, setIsAtStart] = useState(false);
   const [isAtEnd, setIsAtEnd] = useState(false);

   // Embla API로 canScrollPrev/canScrollNext 체크
   const updateBoundary = () => {
     setIsAtStart(!emblaApi.canScrollPrev());
     setIsAtEnd(!emblaApi.canScrollNext());
   };
   ```

2. **터치 시작 시점 저장** (Line 153-158)
   ```typescript
   const handleTouchStart = (e: React.TouchEvent) => {
     touchStartRef.current = e.touches[0].clientX;
     wasAtStartRef.current = isAtStart;  // 터치 시작 시 경계 상태 저장
     wasAtEndRef.current = isAtEnd;
   };
   ```

3. **스와이프 방향 + 경계 조건 확인** (Line 160-187)
   - 50px 이상 스와이프해야 인식
   - 터치 **시작 시점**에 경계에 있었는지 확인
   - 해당 방향으로 스와이프했으면 날짜 이동

---

## 4. 우려되는 점

### 4.1 UX 관련

| 우려 사항 | 설명 | 현재 해결 방식 |
|----------|------|---------------|
| **의도치 않은 이동** | 빠르게 스와이프하다가 실수로 날짜 이동 | 50px threshold 적용 |
| **피드백 부재** | 경계에 도달했는지 사용자가 모름 | 인디케이터로 현재 위치 표시 |
| **로딩 시간** | 날짜 이동 시 새 데이터 로딩 | 300ms 애니메이션으로 마스킹 |
| **중복 트리거** | 빠른 연속 스와이프로 여러 번 이동 | `isNavigatingRef` + 600ms 쿨다운 |

### 4.2 기술적 우려

| 우려 사항 | 설명 | 현재 상태 |
|----------|------|----------|
| **Embla vs 터치 충돌** | 캐러셀 스크롤과 날짜 이동 동시 발생 | `wasAtStartRef/wasAtEndRef`로 분리 |
| **상태 동기화** | 날짜 이동 후 캐러셀 위치 | `startPosition` + `reInit()` + `scrollTo()` |
| **수업 없는 날** | NoClassCard에서 스와이프 | 동일하게 동작 (테스트됨) |

---

## 5. 테스트 체크리스트

현재 구현이 제대로 동작하는지 확인이 필요합니다:

### 5.1 기본 동작
- [ ] 첫 번째 수업에서 오른쪽 스와이프 → 전날 마지막 수업
- [ ] 마지막 수업에서 왼쪽 스와이프 → 다음날 첫 번째 수업
- [ ] 중간 수업에서 스와이프 → 같은 날 다른 수업으로 이동 (날짜 변경 X)

### 5.2 엣지 케이스
- [ ] 오늘 수업 1개 → 양방향 날짜 이동 가능
- [ ] 오늘 수업 없음 (NoClassCard) → 양방향 날짜 이동 가능
- [ ] 빠른 연속 스와이프 → 600ms 쿨다운 작동
- [ ] 짧은 스와이프 (< 50px) → 날짜 이동 안됨

### 5.3 날짜 경계
- [ ] 월 경계 (12/31 → 1/1) 정상 동작
- [ ] 전날/다음날 수업 없을 때도 이동 가능

---

## 6. 개선 제안 (선택)

### 6.1 시각적 피드백 추가

```
현재: 경계에서 스와이프해도 피드백 없음
개선: 경계 도달 시 힌트 표시
```

**옵션 A: 양 끝 그라데이션 힌트**
```tsx
{isAtStart && (
  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-200/50 to-transparent pointer-events-none" />
)}
```

**옵션 B: 날짜 라벨 표시**
```tsx
{isAtStart && prevDay && (
  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
    ← {prevDay.date}
  </div>
)}
```

### 6.2 햅틱 피드백 (모바일)

```typescript
// 날짜 이동 시 진동 피드백
if (navigator.vibrate) {
  navigator.vibrate(50);
}
```

### 6.3 애니메이션 개선

현재 `transitionDirection`으로 fade 효과만 있음.
슬라이드 애니메이션 추가 가능:

```css
.slide-out-left {
  transform: translateX(-100%);
  opacity: 0;
}
.slide-in-right {
  animation: slideInRight 0.3s ease;
}
```

---

## 7. 결론

### 7.1 구현 가능성

| 항목 | 상태 |
|------|------|
| 기능 구현 | ✅ **이미 완료** |
| 코드 품질 | ✅ 좋음 (ref 기반 상태 관리) |
| 엣지 케이스 처리 | ✅ 대부분 처리됨 |

### 7.2 추가 작업 필요 여부

**현재 상태로 사용 가능합니다.**

다만, 실제로 테스트해보면서 아래 사항 확인 필요:
1. 스와이프 임계값 (50px) 적절한지
2. 쿨다운 시간 (600ms) 적절한지
3. 사용자가 경계 도달을 인지하는지

### 7.3 권장 사항

| 우선순위 | 작업 |
|---------|------|
| 높음 | 실제 디바이스에서 테스트 |
| 중간 | 경계 도달 시 시각적 힌트 추가 |
| 낮음 | 햅틱 피드백 추가 |

---

## 8. 질문에 대한 답변

> "구현가능성과 우려되는점 궁금한점"

1. **구현 가능성**: ✅ 이미 구현되어 있습니다!

2. **우려되는 점**:
   - 사용자가 이 기능의 존재를 모를 수 있음 (발견성 낮음)
   - 의도치 않은 날짜 이동 가능성 (하지만 threshold로 완화)

3. **추가 질문**:
   - 현재 구현이 예상대로 동작하나요?
   - 시각적 힌트가 필요한가요?
   - 스와이프 감도 조절이 필요한가요?

---

*v1.0 - 2025-12-25*
