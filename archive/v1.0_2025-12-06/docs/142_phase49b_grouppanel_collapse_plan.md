# Phase 49-B: GroupPanel 그룹 목록 접기 개발 계획

## 목표
우측 패널(GroupPanel)의 그룹 목록을 5개만 표시하고 나머지는 접기

---

## 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `GroupPanel.tsx` | 그룹 목록 접기/펼치기 |

---

## 구현 단계

### Step 1: import 추가

**파일:** `frontend/src/components/GroupPanel.tsx`

```typescript
import { useState, useEffect, useRef, useMemo } from 'react';  // useMemo 추가
import { Plus, Trash2, Layers, Box, Edit2, BookOpen, Check, X, CheckCircle, Loader2, Link2, ChevronDown, ChevronUp } from 'lucide-react';  // ChevronDown, ChevronUp 추가
```

---

### Step 2: 상태 및 계산 추가

컴포넌트 내부 상단에 추가:

```typescript
// Phase 49-B: 그룹 접기 상태
const [showAllGroups, setShowAllGroups] = useState(false);
const GROUP_PREVIEW_COUNT = 5;

// Phase 49-B: 표시할 그룹 계산
const displayedGroups = useMemo(() => {
  if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
    return groups;
  }
  return groups.slice(0, GROUP_PREVIEW_COUNT);
}, [groups, showAllGroups]);

const hiddenGroupCount = Math.max(0, groups.length - GROUP_PREVIEW_COUNT);
```

---

### Step 3: 자동 펼침 useEffect 추가

선택된 그룹이 숨겨진 경우 자동 펼침:

```typescript
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

---

### Step 4: map 대상 변경

```typescript
// 기존
{groups.map((group, index) => (

// 변경
{displayedGroups.map((group, index) => (
```

---

### Step 5: 접기/펼치기 버튼 추가

`</AnimatePresence>` 바로 뒤에 추가:

```typescript
{/* Phase 49-B: 접기/펼치기 버튼 */}
{groups.length > GROUP_PREVIEW_COUNT && (
  <button
    onClick={() => setShowAllGroups(!showAllGroups)}
    className="
      w-full mt-2 px-3 py-2.5
      bg-white hover:bg-gray-50
      border border-gray-200
      rounded-lg
      transition-all duration-200
      flex items-center justify-between
      text-sm font-medium
    "
  >
    <span className="flex items-center gap-2">
      {showAllGroups ? (
        <>
          <ChevronUp className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">접기</span>
        </>
      ) : (
        <>
          <ChevronDown className="w-4 h-4 text-blue-600" />
          <span className="text-blue-600">{hiddenGroupCount}개 더보기</span>
        </>
      )}
    </span>
    <span className="text-xs text-gray-400">
      전체 {groups.length}개
    </span>
  </button>
)}
```

---

## 체크리스트

- [ ] Step 1: useMemo, ChevronDown, ChevronUp import 추가
- [ ] Step 2: showAllGroups 상태 및 displayedGroups useMemo 추가
- [ ] Step 3: 자동 펼침 useEffect 추가
- [ ] Step 4: groups.map → displayedGroups.map 변경
- [ ] Step 5: 접기/펼치기 버튼 렌더링 추가
- [ ] 테스트: 6개 이상 그룹 시 "N개 더보기" 버튼 확인
- [ ] 테스트: 숨겨진 그룹의 블록 클릭 시 자동 펼침 확인

---

## 예상 결과

| 그룹 수 | 표시 |
|--------|------|
| 0~5개 | 전체 표시, 버튼 없음 |
| 6개 | 5개 + "+1개 더보기" |
| 15개 | 5개 + "+10개 더보기" |

---

*작성일: 2025-12-05*
