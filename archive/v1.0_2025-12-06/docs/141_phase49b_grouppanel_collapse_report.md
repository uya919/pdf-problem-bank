# Phase 49-B: GroupPanel 그룹 목록 접기 기능 분석 리포트

**날짜**: 2025-12-05
**요청**: 우측 패널(GroupPanel)의 그룹 목록을 5개만 표시하고 나머지 접기

---

## 1. 현재 구조

### 1.1 GroupPanel 위치
```
┌────────────────────────────────────────────────────────────────────┐
│ UnifiedWorkPage                                                     │
├───────────┬────────────────────────────────────────┬───────────────┤
│ 좌측 패널  │        중앙 캔버스                      │  우측 패널    │
│           │        (PageViewer)                    │  (GroupPanel) │
│ Problem   │                                        │               │
│ List      │                                        │  [문제 그룹]   │
│ Panel     │                                        │  - 3번 p11    │
│           │                                        │  - 4번 p11    │
│ (Phase49  │                                        │  - 5번 p11    │
│  완료)    │                                        │  - ...15개... │
│           │                                        │               │
└───────────┴────────────────────────────────────────┴───────────────┘
```

### 1.2 GroupPanel 현재 코드 (GroupPanel.tsx:246-479)

```tsx
{/* Group List */}
<div className="flex-1 overflow-y-auto space-y-3">
  {groups.length === 0 ? (
    <EmptyState />
  ) : (
    <AnimatePresence>
      {groups.map((group, index) => (
        <motion.div>
          {/* 그룹 카드 */}
        </motion.div>
      ))}
    </AnimatePresence>
  )}
</div>
```

**문제점**: 한 페이지에 15개 그룹이 있으면 15개 전부 표시 → 스크롤 길어짐

---

## 2. 요구사항

- **5개만 표시**하고 나머지는 접기
- "+N개 더보기" 버튼으로 펼침
- Phase 49 (좌측 패널)와 동일한 UX

---

## 3. 구현 가능성: ✅ 매우 높음

### 3.1 난이도: ⭐☆☆☆☆ (매우 쉬움)

| 항목 | 내용 |
|------|------|
| 수정 파일 | `GroupPanel.tsx` 1개 |
| 코드 변경량 | ~25줄 |
| 패턴 | Phase 49와 동일 |

### 3.2 구현 코드

```tsx
// GroupPanel.tsx에 추가
const [showAllGroups, setShowAllGroups] = useState(false);
const GROUP_PREVIEW_COUNT = 5;

const displayedGroups = useMemo(() => {
  if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
    return groups;
  }
  return groups.slice(0, GROUP_PREVIEW_COUNT);
}, [groups, showAllGroups]);

const hiddenGroupCount = Math.max(0, groups.length - GROUP_PREVIEW_COUNT);
```

---

## 4. 우려되는 점

### 4.1 선택된 그룹이 숨겨질 수 있음 ⚠️

**시나리오**:
1. 페이지에 10개 그룹 (5개만 표시)
2. 사용자가 6번째 그룹의 블록 클릭
3. 해당 그룹이 숨겨져 있어 하이라이트 안 보임

**해결 방안**:
```tsx
// 선택된 그룹이 숨겨진 경우 자동 펼침
useEffect(() => {
  if (selectedBlocks.length > 0 && !showAllGroups) {
    const selectedGroupIndex = groups.findIndex(
      g => g.block_ids.some(id => selectedBlocks.includes(id))
    );
    if (selectedGroupIndex >= GROUP_PREVIEW_COUNT) {
      setShowAllGroups(true);
    }
  }
}, [selectedBlocks, groups, showAllGroups]);
```

---

### 4.2 그룹 생성 시 목록 갱신

**시나리오**:
1. 5개 그룹 있음 (접기 버튼 없음)
2. 새 그룹 생성 → 6개 됨
3. 접기 버튼 자동 표시

**해결**: useMemo 의존성에 groups.length 포함 → 자동 갱신

---

### 4.3 애니메이션 충돌

GroupPanel은 Framer Motion 애니메이션 사용 중:
```tsx
<AnimatePresence>
  {groups.map((group, index) => (
    <motion.div initial={{ opacity: 0, x: -20 }} ... />
  ))}
</AnimatePresence>
```

**해결**: displayedGroups로 변경해도 AnimatePresence가 자동 처리

---

## 5. 구현 단계

### Step 1: import 추가
```tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
```

### Step 2: 상태 및 계산 추가
```tsx
// Phase 49-B: 그룹 접기 상태
const [showAllGroups, setShowAllGroups] = useState(false);
const GROUP_PREVIEW_COUNT = 5;

const displayedGroups = useMemo(() => {
  if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
    return groups;
  }
  return groups.slice(0, GROUP_PREVIEW_COUNT);
}, [groups, showAllGroups]);

const hiddenGroupCount = Math.max(0, groups.length - GROUP_PREVIEW_COUNT);
```

### Step 3: 자동 펼침 useEffect 추가
```tsx
// Phase 49-B: 선택된 그룹이 숨겨진 경우 자동 펼침
useEffect(() => {
  if (selectedBlocks.length > 0 && !showAllGroups) {
    const selectedGroupIndex = groups.findIndex(
      g => g.block_ids.some(id => selectedBlocks.includes(id))
    );
    if (selectedGroupIndex >= GROUP_PREVIEW_COUNT) {
      setShowAllGroups(true);
    }
  }
}, [selectedBlocks, groups, showAllGroups]);
```

### Step 4: map 대상 변경 + 버튼 추가
```tsx
<AnimatePresence>
  {displayedGroups.map((group, index) => (
    // ... 기존 그룹 카드 ...
  ))}
</AnimatePresence>

{/* Phase 49-B: 접기/펼치기 버튼 */}
{groups.length > GROUP_PREVIEW_COUNT && (
  <button
    onClick={() => setShowAllGroups(!showAllGroups)}
    className="
      w-full mt-2 px-3 py-2.5
      bg-white hover:bg-grey-50
      border border-grey-200
      rounded-lg
      transition-all duration-200
      flex items-center justify-between
      text-sm font-medium
    "
  >
    <span className="flex items-center gap-2">
      {showAllGroups ? (
        <>
          <ChevronUp className="w-4 h-4 text-grey-500" />
          <span className="text-grey-700">접기</span>
        </>
      ) : (
        <>
          <ChevronDown className="w-4 h-4 text-blue-600" />
          <span className="text-blue-600">{hiddenGroupCount}개 더보기</span>
        </>
      )}
    </span>
    <span className="text-xs text-grey-400">
      전체 {groups.length}개
    </span>
  </button>
)}
```

---

## 6. 예상 결과

| 그룹 수 | 표시 |
|--------|------|
| 0개 | "아직 그룹이 없습니다" |
| 1~5개 | 전체 표시, 버튼 없음 |
| 6개 | 5개 + "+1개 더보기" |
| 15개 | 5개 + "+10개 더보기" |

---

## 7. 결론

### 구현 가능성: ✅ 매우 높음

- Phase 49와 100% 동일한 패턴
- 코드 ~25줄 추가
- 10분 내 구현 가능

### 우려 사항

- 선택된 그룹 자동 펼침 필요 (해결 방안 포함)

---

*작성일: 2025-12-05*
