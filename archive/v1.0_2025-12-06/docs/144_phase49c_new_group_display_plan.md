# Phase 49-C: 새 그룹 최상단 표시 개발 계획

## 목표
새로 생성된 그룹(편집 중인 그룹)을 접기 영역이 아닌 최상단에 표시하여 즉시 편집 가능하게 함

---

## 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `GroupPanel.tsx` | displayedGroups 로직 수정 |

---

## 구현 단계

### Step 1: displayedGroups useMemo 수정

**파일:** `frontend/src/components/GroupPanel.tsx`

**기존 코드 (84-90줄):**
```typescript
// Phase 49-B: 표시할 그룹 계산
const displayedGroups = useMemo(() => {
  if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
    return groups;
  }
  return groups.slice(0, GROUP_PREVIEW_COUNT);
}, [groups, showAllGroups]);
```

**변경 코드:**
```typescript
// Phase 49-C: 표시할 그룹 계산 (편집 중인 그룹 최상단 배치)
const displayedGroups = useMemo(() => {
  const editingId = editingGroupId || autoEditGroupId;

  // 편집 중인 그룹이 있으면 최상단에 배치
  if (editingId) {
    const editingGroup = groups.find(g => g.id === editingId);
    const otherGroups = groups.filter(g => g.id !== editingId);

    if (editingGroup) {
      // 편집 그룹 + 나머지 (최대 4개 = GROUP_PREVIEW_COUNT - 1)
      const restCount = GROUP_PREVIEW_COUNT - 1;
      const displayedOthers = showAllGroups
        ? otherGroups
        : otherGroups.slice(0, restCount);
      return [editingGroup, ...displayedOthers];
    }
  }

  // 편집 중이 아니면 기존 로직
  if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
    return groups;
  }
  return groups.slice(0, GROUP_PREVIEW_COUNT);
}, [groups, showAllGroups, editingGroupId, autoEditGroupId]);
```

---

### Step 2: 애니메이션 최적화 (선택)

순서 변경 시 부드러운 애니메이션을 위해 `layout` prop 추가:

**기존 (263줄):**
```tsx
<motion.div
  key={group.id}
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 20 }}
```

**변경:**
```tsx
<motion.div
  key={group.id}
  layout  // 위치 변경 시 부드러운 애니메이션
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 20 }}
```

---

## 체크리스트

- [ ] Step 1: displayedGroups useMemo 수정 (편집 그룹 최상단 배치)
- [ ] Step 2: motion.div에 layout prop 추가 (애니메이션 최적화)
- [ ] 테스트: 5개 그룹 → 6번째 생성 → 6번이 최상단 표시 확인
- [ ] 테스트: 6번 편집 완료 (Enter) → 기존 순서로 복귀 확인
- [ ] 테스트: 펼친 상태에서 새 그룹 생성 → 동일하게 최상단 배치 확인

---

## 예상 결과

### 시나리오: 5개 그룹 존재 → 6번째 생성

**Before (현재):**
```
1번 (표시)
2번 (표시)
3번 (표시)
4번 (표시)
5번 (표시)
[+1개 더보기]  ← 6번이 여기 숨겨짐!
```

**After (변경 후):**
```
★ 6번 (편집 모드) ← 최상단에 표시!
1번 (표시)
2번 (표시)
3번 (표시)
4번 (표시)
[+1개 더보기]  ← 5번이 여기로 이동
```

### 시나리오: 6번 편집 완료

```
1번 (표시)
2번 (표시)
3번 (표시)
4번 (표시)
5번 (표시)
[+1개 더보기]  ← 6번이 여기로 이동
```

---

## 소요 시간 (예상)

- Step 1: 5분
- Step 2: 2분
- 테스트: 5분
- **총: 12분**

---

*작성일: 2025-12-05*
