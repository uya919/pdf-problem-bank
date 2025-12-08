# Phase 13: 드래그 성능 최적화 상세 개발 계획

**작성일**: 2025-11-26
**분석 기반**: docs/23_drag_performance_analysis_report.md
**예상 총 소요시간**: 1시간 30분

---

## 목차

1. [개요](#1-개요)
2. [Task 13-1: setDragEnd Throttle](#task-13-1)
3. [Task 13-2: 블록-그룹 매핑 캐시](#task-13-2)
4. [Task 13-3: selectedBlocks Set 변환](#task-13-3)
5. [Task 13-4: 이벤트 핸들러 메모이제이션](#task-13-4)
6. [Task 13-5: React.memo 적용](#task-13-5)
7. [Task 13-6: 드래그 선택 일괄 처리](#task-13-6)
8. [테스트 계획](#테스트-계획)
9. [롤백 계획](#롤백-계획)

---

## 1. 개요

### 현재 문제

드래그 시 렉 발생 원인:
- `setDragEnd()`: 초당 60회 상태 업데이트
- 선형 탐색: O(블록수 × 그룹수) 복잡도
- 메모이제이션 부재: 매번 함수/객체 재생성

### 목표

| 지표 | 현재 | 목표 |
|------|------|------|
| FPS | 30-45 | 55-60 |
| CPU 사용률 | 60-80% | 20-30% |
| 상태 업데이트/초 | 60회 | 12-16회 |

### 적용 파일

| 파일 | 변경 내용 |
|------|----------|
| `PageCanvas.tsx` | Task 1, 2, 4, 5 |
| `PageViewer.tsx` | Task 3, 6 |

---

## Task 13-1: setDragEnd Throttle {#task-13-1}

### 목표
mousemove 이벤트의 상태 업데이트 빈도를 60fps → 16fps로 감소

### 예상 시간: 15분

### 현재 코드 (PageCanvas.tsx:161-173)

```typescript
const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
  if (!isDragging) return;
  const stage = e.target.getStage();
  if (!stage) return;
  const pointerPosition = stage.getPointerPosition();
  if (!pointerPosition) return;

  if (Math.random() < 0.05) {
    console.log('[PageCanvas Debug] 드래그 중:', pointerPosition);
  }
  setDragEnd(pointerPosition);  // ← 매번 호출
};
```

### 변경 코드

```typescript
import { useRef, useCallback, useMemo } from 'react';

// 컴포넌트 내부 상단에 추가
const lastUpdateRef = useRef<number>(0);
const THROTTLE_MS = 16; // ~60fps → 실제 업데이트는 16ms마다

const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
  if (!isDragging) return;

  // Throttle: 16ms 이내 재호출 무시
  const now = performance.now();
  if (now - lastUpdateRef.current < THROTTLE_MS) return;
  lastUpdateRef.current = now;

  const stage = e.target.getStage();
  if (!stage) return;
  const pointerPosition = stage.getPointerPosition();
  if (!pointerPosition) return;

  setDragEnd(pointerPosition);
}, [isDragging]);
```

### 대안: lodash throttle 사용

```typescript
import { throttle } from 'lodash-es';

// 컴포넌트 외부 또는 useMemo 내부
const throttledSetDragEnd = useMemo(
  () => throttle((pos: { x: number; y: number }) => setDragEnd(pos), 16),
  []
);

// cleanup 필요
useEffect(() => {
  return () => {
    throttledSetDragEnd.cancel();
  };
}, [throttledSetDragEnd]);
```

### 변경 위치

| 파일 | 라인 | 변경 내용 |
|------|------|----------|
| `PageCanvas.tsx` | 7 | `useRef, useCallback` import 추가 |
| `PageCanvas.tsx` | 80 | `lastUpdateRef` 추가 |
| `PageCanvas.tsx` | 161-173 | `handleStageMouseMove` 교체 |

### 검증 방법

1. 콘솔에서 mousemove 로그 빈도 확인
2. React DevTools Profiler로 리렌더링 횟수 측정
3. 체감 드래그 부드러움 확인

---

## Task 13-2: 블록-그룹 매핑 캐시 {#task-13-2}

### 목표
`getBlockGroup()` 호출을 O(n) → O(1)로 개선

### 예상 시간: 20분

### 현재 코드 (PageCanvas.tsx:122-124)

```typescript
const getBlockGroup = (blockId: number): ProblemGroup | undefined => {
  return groups.find((group) => group.block_ids.includes(blockId));
};
```

### 문제점

- `groups.find()`: O(그룹 수)
- `group.block_ids.includes()`: O(블록 수)
- 전체: O(그룹수 × 블록수)
- 매 렌더링마다 모든 블록에 대해 호출

### 변경 코드

```typescript
import { useMemo } from 'react';

// 블록 ID → 그룹 매핑 캐시 (O(1) 조회)
const blockToGroupMap = useMemo(() => {
  const map = new Map<number, ProblemGroup>();
  for (const group of groups) {
    for (const blockId of group.block_ids) {
      map.set(blockId, group);
    }
  }
  return map;
}, [groups]);

// O(1) 조회
const getBlockGroup = useCallback(
  (blockId: number): ProblemGroup | undefined => {
    return blockToGroupMap.get(blockId);
  },
  [blockToGroupMap]
);
```

### 추가: calculateGroupBoundingBox 최적화

```typescript
// 그룹별 블록 Set 캐시
const groupBlockSets = useMemo(() => {
  const map = new Map<string, Set<number>>();
  for (const group of groups) {
    map.set(group.id, new Set(group.block_ids));
  }
  return map;
}, [groups]);

// 그룹별 bounding box 캐시
const groupBoundingBoxes = useMemo(() => {
  const cache = new Map<string, { x: number; y: number; width: number; height: number } | null>();

  for (const group of groups) {
    const blockSet = groupBlockSets.get(group.id);
    if (!blockSet) {
      cache.set(group.id, null);
      continue;
    }

    const groupBlocks = blocks.filter((b) => blockSet.has(b.block_id));
    if (groupBlocks.length === 0) {
      cache.set(group.id, null);
      continue;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const block of groupBlocks) {
      const [x1, y1, x2, y2] = block.bbox;
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    }

    cache.set(group.id, {
      x: minX * scale,
      y: minY * scale,
      width: (maxX - minX) * scale,
      height: (maxY - minY) * scale,
    });
  }

  return cache;
}, [groups, blocks, scale]);
```

### 변경 위치

| 파일 | 라인 | 변경 내용 |
|------|------|----------|
| `PageCanvas.tsx` | 7 | `useMemo, useCallback` import 확인 |
| `PageCanvas.tsx` | 85-95 | `blockToGroupMap` 추가 |
| `PageCanvas.tsx` | 97-105 | `groupBoundingBoxes` 추가 |
| `PageCanvas.tsx` | 122-124 | `getBlockGroup` 교체 |
| `PageCanvas.tsx` | 310-311 | `calculateGroupBoundingBox` → 캐시 사용 |

### 검증 방법

1. 100개 블록, 20개 그룹으로 테스트
2. React DevTools Profiler로 렌더링 시간 비교
3. 그룹 오버레이 정확성 확인

---

## Task 13-3: selectedBlocks Set 변환 {#task-13-3}

### 목표
`selectedBlocks.includes()` 호출을 O(n) → O(1)로 개선

### 예상 시간: 25분

### 현재 코드 (PageViewer.tsx:36, 244-258)

```typescript
// 상태 정의
const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);

// 선택 확인 (PageCanvas에서 사용)
const isBlockSelected = (blockId: number) => {
  return selectedBlocks.includes(blockId);  // O(n)
};

// 선택 핸들러
const handleBlockSelect = (blockId: number, isMultiSelect: boolean) => {
  setSelectedBlocks((prev) => {
    if (isMultiSelect) {
      if (prev.includes(blockId)) {  // O(n)
        return prev.filter((id) => id !== blockId);  // O(n)
      } else {
        return [...prev, blockId];
      }
    } else {
      return [blockId];
    }
  });
};
```

### 변경 코드

**PageViewer.tsx:**

```typescript
// 상태 정의 변경
const [selectedBlockIds, setSelectedBlockIds] = useState<Set<number>>(new Set());

// 배열 변환 (하위 호환성)
const selectedBlocks = useMemo(
  () => Array.from(selectedBlockIds),
  [selectedBlockIds]
);

// 선택 핸들러 변경
const handleBlockSelect = useCallback((blockId: number, isMultiSelect: boolean) => {
  setSelectedBlockIds((prev) => {
    const next = new Set(prev);

    if (isMultiSelect) {
      if (next.has(blockId)) {  // O(1)
        next.delete(blockId);   // O(1)
      } else {
        next.add(blockId);      // O(1)
      }
    } else {
      next.clear();
      next.add(blockId);
    }

    return next;
  });
}, []);

// 일괄 선택 (드래그용)
const handleBatchSelect = useCallback((blockIds: number[], isMultiSelect: boolean) => {
  setSelectedBlockIds((prev) => {
    if (isMultiSelect) {
      const next = new Set(prev);
      for (const id of blockIds) {
        next.add(id);
      }
      return next;
    } else {
      return new Set(blockIds);
    }
  });
}, []);

// 선택 해제
const clearSelection = useCallback(() => {
  setSelectedBlockIds(new Set());
}, []);
```

**PageCanvas.tsx:**

```typescript
// Props 타입 변경 (선택적)
interface PageCanvasProps {
  // ...
  selectedBlockIds: Set<number>;  // 또는 기존 배열 유지
  onBatchSelect?: (blockIds: number[], isMultiSelect: boolean) => void;
}

// 선택 확인 변경
const isBlockSelected = useCallback(
  (blockId: number) => selectedBlockIds.has(blockId),  // O(1)
  [selectedBlockIds]
);
```

### 변경 위치

| 파일 | 라인 | 변경 내용 |
|------|------|----------|
| `PageViewer.tsx` | 36 | `selectedBlocks` → `selectedBlockIds` (Set) |
| `PageViewer.tsx` | 37 | `selectedBlocks` 배열 파생 추가 |
| `PageViewer.tsx` | 244-258 | `handleBlockSelect` 교체 |
| `PageViewer.tsx` | 새로 추가 | `handleBatchSelect`, `clearSelection` |
| `PageCanvas.tsx` | 17 | Props 타입 업데이트 (선택적) |
| `PageCanvas.tsx` | 117-119 | `isBlockSelected` 교체 |

### 주의사항

- `selectedBlocks` 배열이 필요한 곳에서는 `Array.from()` 사용
- 하위 호환성을 위해 `selectedBlocks` 배열도 유지
- GroupPanel 등 다른 컴포넌트도 확인 필요

---

## Task 13-4: 이벤트 핸들러 메모이제이션 {#task-13-4}

### 목표
인라인 함수를 useCallback으로 래핑하여 불필요한 재생성 방지

### 예상 시간: 15분

### 현재 코드 (PageCanvas.tsx)

```typescript
// 매 렌더링마다 새 함수 생성
const handleBlockClick = (blockId: number, e: Konva.KonvaEventObject<MouseEvent>) => {
  const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
  onBlockSelect(blockId, isMultiSelect);
};

const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
  // ...
};

const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
  // ...
};
```

### 변경 코드

```typescript
const handleBlockClick = useCallback(
  (blockId: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
    onBlockSelect(blockId, isMultiSelect);
  },
  [onBlockSelect]
);

const handleStageMouseDown = useCallback(
  (e: Konva.KonvaEventObject<MouseEvent>) => {
    const targetType = e.target.getType();
    if (targetType === 'Stage' || targetType === 'Image') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      setIsDragging(true);
      setDragStart(pointerPosition);
      setDragEnd(pointerPosition);
    }
  },
  []
);

const handleStageMouseUp = useCallback(
  (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDragging || !dragStart || !dragEnd) return;

    setIsDragging(false);

    const minDragSize = 5;
    const dragWidth = Math.abs(dragEnd.x - dragStart.x);
    const dragHeight = Math.abs(dragEnd.y - dragStart.y);

    if (dragWidth < minDragSize && dragHeight < minDragSize) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    // 선택 로직...
    const selectionRect = {
      x1: Math.min(dragStart.x, dragEnd.x),
      y1: Math.min(dragStart.y, dragEnd.y),
      x2: Math.max(dragStart.x, dragEnd.x),
      y2: Math.max(dragStart.y, dragEnd.y),
    };

    const selectedBlockIds = blocks
      .filter((block) => {
        const [x1, y1, x2, y2] = block.bbox;
        const blockRect = {
          x1: x1 * scale,
          y1: y1 * scale,
          x2: x2 * scale,
          y2: y2 * scale,
        };
        return isRectOverlap(selectionRect, blockRect);
      })
      .map((block) => block.block_id);

    if (selectedBlockIds.length > 0) {
      const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
      // 일괄 선택 사용
      onBatchSelect?.(selectedBlockIds, isMultiSelect);
    }

    setDragStart(null);
    setDragEnd(null);
  },
  [isDragging, dragStart, dragEnd, blocks, scale, onBatchSelect]
);
```

### 변경 위치

| 파일 | 라인 | 변경 내용 |
|------|------|----------|
| `PageCanvas.tsx` | 111-114 | `handleBlockClick` useCallback 래핑 |
| `PageCanvas.tsx` | 141-159 | `handleStageMouseDown` useCallback 래핑 |
| `PageCanvas.tsx` | 175-240 | `handleStageMouseUp` useCallback 래핑 |

---

## Task 13-5: React.memo 적용 {#task-13-5}

### 목표
props가 변경되지 않았을 때 리렌더링 방지

### 예상 시간: 10분

### 변경 코드

**PageCanvas.tsx:**

```typescript
import { memo, useEffect, useRef, useState, useCallback, useMemo } from 'react';

// 컴포넌트를 memo로 래핑
export const PageCanvas = memo(function PageCanvas({
  documentId,
  pageIndex,
  blocks,
  groups,
  selectedBlockIds,
  onBlockSelect,
  onBatchSelect,
  onGroupCreate,
}: PageCanvasProps) {
  // 기존 컴포넌트 내용...
});
```

**GroupPanel.tsx (선택적):**

```typescript
import { memo } from 'react';

export const GroupPanel = memo(function GroupPanel({
  groups,
  selectedBlocks,
  // ...
}: GroupPanelProps) {
  // 기존 컴포넌트 내용...
});
```

### 주의사항

- `memo`는 shallow comparison 사용
- 객체/배열 props는 참조가 변경되면 리렌더링 발생
- `useMemo`/`useCallback`과 함께 사용해야 효과적

### 변경 위치

| 파일 | 라인 | 변경 내용 |
|------|------|----------|
| `PageCanvas.tsx` | 7 | `memo` import 추가 |
| `PageCanvas.tsx` | 67 | `export function` → `export const ... = memo(function ...)` |
| `GroupPanel.tsx` | 상단 | `memo` import 및 적용 (선택적) |

---

## Task 13-6: 드래그 선택 일괄 처리 {#task-13-6}

### 목표
드래그 완료 시 개별 선택 대신 일괄 선택으로 상태 업데이트 1회로 감소

### 예상 시간: 15분

### 현재 코드 (PageCanvas.tsx:224-233)

```typescript
if (selectedBlockIds.length > 0) {
  const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;

  if (isMultiSelect) {
    selectedBlockIds.forEach((id) => {
      onBlockSelect(id, true);  // N번 호출
    });
  } else {
    onBlockSelect(selectedBlockIds[0], false);
    selectedBlockIds.slice(1).forEach((id) => {
      onBlockSelect(id, true);  // N-1번 호출
    });
  }
}
```

### 변경 코드

**PageCanvas Props 추가:**

```typescript
interface PageCanvasProps {
  // 기존 props...
  onBatchSelect: (blockIds: number[], isMultiSelect: boolean) => void;
}
```

**PageCanvas 내부 변경:**

```typescript
// handleStageMouseUp 내부
if (selectedBlockIds.length > 0) {
  const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
  onBatchSelect(selectedBlockIds, isMultiSelect);  // 1회 호출
}
```

**PageViewer 변경:**

```typescript
// 일괄 선택 핸들러 (Task 13-3에서 정의)
const handleBatchSelect = useCallback((blockIds: number[], isMultiSelect: boolean) => {
  setSelectedBlockIds((prev) => {
    if (isMultiSelect) {
      const next = new Set(prev);
      for (const id of blockIds) {
        next.add(id);
      }
      return next;
    } else {
      return new Set(blockIds);
    }
  });
}, []);

// PageCanvas에 전달
<PageCanvas
  // 기존 props...
  onBatchSelect={handleBatchSelect}
/>
```

### 변경 위치

| 파일 | 라인 | 변경 내용 |
|------|------|----------|
| `PageCanvas.tsx` | 12-20 | Props 인터페이스에 `onBatchSelect` 추가 |
| `PageCanvas.tsx` | 224-233 | 개별 호출 → `onBatchSelect` 1회 호출 |
| `PageViewer.tsx` | 새로 추가 | `handleBatchSelect` 정의 |
| `PageViewer.tsx` | 419-427 | `PageCanvas`에 `onBatchSelect` 전달 |

---

## 테스트 계획

### 단위 테스트

| 테스트 항목 | 방법 |
|-------------|------|
| throttle 동작 | 100회 mousemove 호출 → 실제 업데이트 횟수 확인 |
| Map 조회 성능 | 1000개 블록으로 `blockToGroupMap.get()` 시간 측정 |
| Set 선택 성능 | 100개 블록 일괄 선택 시간 측정 |

### 통합 테스트

| 테스트 시나리오 | 기대 결과 |
|-----------------|----------|
| 50개 블록 드래그 선택 | 렉 없이 부드럽게 동작 |
| 100개 블록 페이지 로드 | 3초 이내 로드 완료 |
| 그룹 20개 오버레이 표시 | 정확한 위치에 표시 |

### 성능 프로파일링

```bash
# React DevTools Profiler 사용
1. Chrome DevTools → React DevTools → Profiler
2. Record 클릭 → 드래그 작업 수행 → Stop
3. 렌더링 횟수 및 시간 확인

# 예상 결과:
# - 개선 전: 드래그 2초간 120회 렌더링
# - 개선 후: 드래그 2초간 24-30회 렌더링
```

---

## 롤백 계획

### Git 브랜치 전략

```bash
# 작업 전 브랜치 생성
git checkout -b feature/phase13-performance

# 각 Task 완료 시 커밋
git commit -m "Phase 13-1: Add setDragEnd throttle"
git commit -m "Phase 13-2: Add block-group mapping cache"
# ...

# 문제 발생 시 롤백
git checkout main
git branch -D feature/phase13-performance
```

### Task별 롤백

| Task | 롤백 방법 |
|------|----------|
| 13-1 | `lastUpdateRef`, `THROTTLE_MS` 제거, 원래 함수 복원 |
| 13-2 | `blockToGroupMap`, `groupBoundingBoxes` 제거, 원래 함수 복원 |
| 13-3 | `Set` → 배열로 복원 |
| 13-4 | `useCallback` 제거 |
| 13-5 | `memo` 제거 |
| 13-6 | `onBatchSelect` 제거, 개별 호출 복원 |

---

## 구현 순서 요약

```
Task 13-1 (15분)
  ↓
Task 13-2 (20분)
  ↓
Task 13-3 (25분)  ← 가장 영향 범위 큼, 신중하게
  ↓
Task 13-4 (15분)
  ↓
Task 13-5 (10분)
  ↓
Task 13-6 (15분)
  ↓
통합 테스트 (20분)
```

**총 예상 시간: 약 2시간**

---

## 체크리스트

### Task 13-1
- [ ] `lastUpdateRef` 추가
- [ ] `handleStageMouseMove`에 throttle 적용
- [ ] 디버그 로그 제거 또는 조건부 로깅

### Task 13-2
- [ ] `blockToGroupMap` useMemo 추가
- [ ] `groupBoundingBoxes` useMemo 추가
- [ ] `getBlockGroup` 캐시 사용으로 변경
- [ ] `calculateGroupBoundingBox` 호출 제거

### Task 13-3
- [ ] `selectedBlockIds` Set으로 변경
- [ ] `selectedBlocks` 배열 파생 추가
- [ ] `handleBlockSelect` Set 연산으로 변경
- [ ] `handleBatchSelect` 추가
- [ ] `clearSelection` 추가

### Task 13-4
- [ ] `handleBlockClick` useCallback 래핑
- [ ] `handleStageMouseDown` useCallback 래핑
- [ ] `handleStageMouseMove` useCallback 래핑
- [ ] `handleStageMouseUp` useCallback 래핑

### Task 13-5
- [ ] `PageCanvas` React.memo 적용
- [ ] (선택) `GroupPanel` React.memo 적용

### Task 13-6
- [ ] `onBatchSelect` prop 추가
- [ ] 드래그 완료 시 일괄 선택 사용
- [ ] PageViewer에서 `handleBatchSelect` 전달

---

*Phase 13 상세 개발 계획 끝*
