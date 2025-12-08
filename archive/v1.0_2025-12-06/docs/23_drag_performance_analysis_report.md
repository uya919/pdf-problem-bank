# 드래그 성능 분석 리포트

**Phase**: 12 (성능 분석)
**작성일**: 2025-11-26
**분석 모델**: Claude Opus (thinkharder)

---

## 1. 문제 현상

사용자 보고:
- 블록 드래그 시 **간헐적인 렉(lag)** 발생
- 블록 수가 많을 때 더 심해지는 것으로 추정

---

## 2. 분석 결과 요약

### 근본 원인: **리렌더링 악순환**

```
mousemove 이벤트 (초당 60-240회)
    ↓
setDragEnd() 상태 업데이트
    ↓
PageCanvas 전체 리렌더링
    ↓
blocks.map() 재실행 (50개 블록 = 50회 반복)
    ↓
각 블록마다 getBlockGroup(), isBlockSelected() 선형 탐색
    ↓
calculateGroupBoundingBox() 그룹 수만큼 호출
    ↓
Konva Canvas 재그리기
    ↓
다음 mousemove... (반복)
```

### 성능 영향도

| 문제 영역 | 심각도 | 영향 |
|-----------|--------|------|
| setDragEnd 빈도 | **높음** | 초당 60회 상태 업데이트 |
| 선형 탐색 반복 | **높음** | O(블록수 × 그룹수) 복잡도 |
| 메모이제이션 부재 | **중간** | 불필요한 재계산 |
| 인라인 함수 | **중간** | 매번 새 함수 생성 |

---

## 3. 상세 분석

### 3.1 PageCanvas.tsx - 핵심 병목

#### 문제 1: 과도한 상태 업데이트

```typescript
// 현재 코드 (라인 161-172)
const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (!isDragging) return;
  // ...
  setDragEnd(pointerPosition);  // ← 매 mousemove마다 호출
};
```

**문제점:**
- `mousemove`는 초당 60-240회 발생
- 매 호출마다 React 상태 업데이트 → 전체 리렌더링

#### 문제 2: 선형 탐색 반복

```typescript
// 블록 렌더링 시 (라인 268-306)
blocks.map((block) => {
  const group = getBlockGroup(block.block_id);      // O(그룹 수)
  const isSelected = isBlockSelected(block.block_id); // O(선택 블록 수)
  // ...
});
```

**복잡도 분석:**
- 50개 블록, 10개 그룹일 때
- 매 렌더링: 50 × (10 + 선택수) = **최소 500회 탐색**
- 초당 60 렌더링: **30,000회/초**

#### 문제 3: calculateGroupBoundingBox 비효율

```typescript
// 라인 38-65
function calculateGroupBoundingBox(group, blocks, scale) {
  const groupBlocks = blocks.filter((b) =>
    group.block_ids.includes(b.block_id)  // O(n × m)
  );
  // ...
}
```

**호출 빈도:**
- 그룹 렌더링마다 호출
- 10개 그룹 × 초당 60 렌더링 = **초당 600회**

### 3.2 메모이제이션 부재

현재 상태:
- `React.memo`: 미사용
- `useCallback`: 미사용
- `useMemo`: 부분적 사용

```typescript
// 현재: 매 렌더링마다 새 함수 생성
const handleBlockClick = (blockId, e) => { ... };
const handleStageMouseDown = (e) => { ... };
const handleStageMouseMove = (e) => { ... };
```

### 3.3 selectedBlocks 상태 관리

```typescript
// 드래그 완료 시 (PageViewer 라인 224-233)
selectedBlockIds.forEach((id) => {
  onBlockSelect(id, true);  // 10개면 10번 상태 업데이트!
});
```

**문제점:**
- 배열에서 Set으로 변경 필요
- 일괄 업데이트 필요

---

## 4. 성능 메트릭 예측

### 현재 상황 (50개 블록, 5개 그룹, 2초 드래그)

| 지표 | 현재 값 | 원인 |
|------|---------|------|
| 상태 업데이트 | 120회 | setDragEnd 60회/초 |
| 컴포넌트 렌더링 | 120회 | 상태 변경마다 |
| 블록 탐색 | 6,000회 | 50블록 × 120렌더 |
| 그룹 계산 | 600회 | 5그룹 × 120렌더 |
| **예상 FPS** | **30-45** | 목표 60 미만 |
| **CPU 사용률** | **60-80%** | 메인 스레드 과부하 |

### 개선 후 예측

| 지표 | 개선 후 | 개선율 |
|------|---------|--------|
| 상태 업데이트 | 24회 | -80% (throttle) |
| 블록 탐색 | 1,200회 | -80% (Set 사용) |
| 그룹 계산 | 24회 | -96% (메모이제이션) |
| **예상 FPS** | **55-60** | +50% |
| **CPU 사용률** | **20-30%** | -60% |

---

## 5. 개선 방안

### 5.1 즉시 적용 (1순위)

#### A. setDragEnd throttle 적용

```typescript
// 개선 코드
import { throttle } from 'lodash-es';

const throttledSetDragEnd = useMemo(
  () => throttle((pos) => setDragEnd(pos), 16), // 60fps → 16ms
  []
);

const handleStageMouseMove = useCallback((e) => {
  if (!isDragging) return;
  const pos = e.target.getStage()?.getPointerPosition();
  if (pos) throttledSetDragEnd(pos);
}, [isDragging]);
```

**효과:** 상태 업데이트 80% 감소

#### B. 선형 탐색 → Set 변환

```typescript
// 개선: 블록-그룹 매핑 캐시
const blockToGroupMap = useMemo(() => {
  const map = new Map<number, ProblemGroup>();
  for (const group of localGroups) {
    for (const blockId of group.block_ids) {
      map.set(blockId, group);
    }
  }
  return map;
}, [localGroups]);

// 사용: O(1) 조회
const getBlockGroup = useCallback(
  (blockId: number) => blockToGroupMap.get(blockId),
  [blockToGroupMap]
);
```

**효과:** 블록당 탐색 O(n) → O(1)

#### C. selectedBlocks를 Set으로 변경

```typescript
// 현재: 배열
const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);

// 개선: Set
const [selectedBlockIds, setSelectedBlockIds] = useState<Set<number>>(new Set());

// 체크: O(1)
const isSelected = selectedBlockIds.has(blockId);
```

### 5.2 중기 적용 (2순위)

#### D. 이벤트 핸들러 메모이제이션

```typescript
const handleBlockClick = useCallback(
  (blockId: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
    onBlockSelect(blockId, isMultiSelect);
  },
  [onBlockSelect]
);
```

#### E. PageCanvas React.memo 적용

```typescript
const PageCanvas = React.memo(function PageCanvas({
  blocks,
  groups,
  selectedBlocks,
  // ...
}: PageCanvasProps) {
  // ...
});
```

#### F. 블록 일괄 선택 처리

```typescript
// 현재: 각각 처리
selectedBlockIds.forEach((id) => onBlockSelect(id, true));

// 개선: 일괄 처리
const handleDragSelectComplete = (blockIds: number[]) => {
  setSelectedBlocks(prev => {
    const newSet = new Set(prev);
    blockIds.forEach(id => newSet.add(id));
    return newSet;
  });
};
```

### 5.3 장기 적용 (3순위)

#### G. calculateGroupBoundingBox 메모이제이션

```typescript
const groupBoundingBoxes = useMemo(() => {
  const cache = new Map<string, BoundingBox>();
  for (const group of localGroups) {
    const bbox = calculateGroupBoundingBox(group, blocks, scale);
    if (bbox) cache.set(group.id, bbox);
  }
  return cache;
}, [localGroups, blocks, scale]);
```

#### H. 드래그 중 그룹 오버레이 비활성화

```typescript
// 드래그 중에는 그룹 오버레이 숨김
{!isDragging && groups.map((group) => (
  <GroupOverlay ... />
))}
```

---

## 6. 구현 우선순위

| 순서 | 작업 | 예상 시간 | 효과 |
|------|------|----------|------|
| 1 | setDragEnd throttle | 10분 | **높음** |
| 2 | blockToGroupMap 캐시 | 15분 | **높음** |
| 3 | selectedBlocks → Set | 20분 | **중간** |
| 4 | useCallback 적용 | 10분 | **중간** |
| 5 | React.memo 적용 | 5분 | **중간** |
| 6 | 일괄 선택 처리 | 15분 | **낮음** |

**총 예상 시간:** 1시간 15분

---

## 7. 결론

### 블록 수와 성능의 관계

**예, 블록 수가 많을수록 성능이 저하됩니다.**

| 블록 수 | 초당 연산 (현재) | 체감 |
|---------|-----------------|------|
| 20개 | 12,000회 | 양호 |
| 50개 | 30,000회 | 렉 시작 |
| 100개 | 60,000회 | 심각한 렉 |
| 200개 | 120,000회 | 사용 불가 |

### 핵심 원인

1. **mousemove 빈도**: 초당 60회 상태 업데이트
2. **선형 탐색**: 매 렌더링마다 모든 블록 순회
3. **리렌더링 연쇄**: 작은 변경 → 전체 재계산

### 권장 사항

1순위 개선(throttle + 캐시)만 적용해도 **체감 성능 2배 이상** 개선 예상.

---

*Phase 12 성능 분석 리포트 끝*
