# Phase 49-C: 새 그룹 최상단 표시 기능 분석 리포트

**날짜**: 2025-12-05
**요청**: 새로 생성된 그룹은 접히지 않고 최상단에 표시, 완료 후 접기 안으로 이동

---

## 1. 현재 동작 vs 원하는 동작

### 1.1 현재 동작 (문제점)

```
[상태] 5개 그룹 존재 (전부 표시)

사용자: 6번째 그룹 생성

[결과]
1번 (표시)
2번 (표시)
3번 (표시)
4번 (표시)
5번 (표시)
[+1개 더보기]  ← 6번이 여기 숨겨짐!

→ 새로 만든 그룹이 바로 안 보임
→ 단축키(Enter 등)로 편집 불가
```

### 1.2 원하는 동작

```
[상태] 5개 그룹 존재 (전부 표시)

사용자: 6번째 그룹 생성

[결과]
★ 6번 (새로 생성 - 편집 모드) ← 최상단에 표시!
1번 (표시)
2번 (표시)
3번 (표시)
4번 (표시)
[+1개 더보기]  ← 5번이 여기로 이동

사용자: 6번 편집 완료 (Enter)

[결과]
1번 (표시)
2번 (표시)
3번 (표시)
4번 (표시)
5번 (표시)
[+1개 더보기]  ← 6번이 여기로 이동
```

---

## 2. 구현 방안

### 2.1 핵심 아이디어

**"편집 중인 그룹"은 항상 표시 목록에 포함**

```typescript
const displayedGroups = useMemo(() => {
  // 1. 편집 중인 그룹 찾기
  const editingGroup = editingGroupId
    ? groups.find(g => g.id === editingGroupId)
    : null;

  // 2. 편집 중인 그룹 제외한 나머지
  const otherGroups = groups.filter(g => g.id !== editingGroupId);

  // 3. 편집 중인 그룹을 최상단에 배치
  if (editingGroup) {
    const restCount = GROUP_PREVIEW_COUNT - 1; // 편집 그룹이 1자리 차지
    const displayedOthers = showAllGroups
      ? otherGroups
      : otherGroups.slice(0, restCount);
    return [editingGroup, ...displayedOthers];
  }

  // 4. 편집 중이 아니면 기존 로직
  if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
    return groups;
  }
  return groups.slice(0, GROUP_PREVIEW_COUNT);
}, [groups, showAllGroups, editingGroupId]);
```

### 2.2 시각적 구분

편집 중인 그룹에 시각적 하이라이트 추가:

```tsx
<motion.div
  className={`
    ${editingGroupId === group.id
      ? 'ring-2 ring-blue-400 ring-offset-2' // 편집 중 하이라이트
      : ''}
  `}
>
```

---

## 3. 구현 가능성: ✅ 높음

### 3.1 난이도: ⭐⭐☆☆☆ (쉬움)

| 항목 | 내용 |
|------|------|
| 수정 파일 | `GroupPanel.tsx` 1개 |
| 코드 변경량 | ~20줄 수정 |
| 기존 로직 영향 | useMemo 로직 변경 |

### 3.2 이유

- `editingGroupId` 상태가 이미 존재
- useMemo 로직만 수정하면 됨
- UI 변경 불필요 (이미 편집 모드 스타일 있음)

---

## 4. 우려되는 점

### 4.1 그룹 순서 혼란 ⚠️

**문제**:
- 원래 순서: 1, 2, 3, 4, 5, 6
- 편집 중 표시: 6, 1, 2, 3, 4 (순서 섞임)
- 완료 후: 1, 2, 3, 4, 5 (6은 접힘)

**사용자 혼란 가능성**:
- "왜 6번이 갑자기 위로 올라왔지?"
- "왜 5번이 없어졌지?"

**해결 방안**:
```tsx
// 옵션 A: 편집 중인 그룹에 "새로 생성됨" 라벨 표시
{editingGroupId === group.id && (
  <Badge className="bg-blue-100 text-blue-700">편집 중</Badge>
)}

// 옵션 B: 시각적 분리선 추가
{index === 0 && editingGroupId === group.id && (
  <div className="border-b border-blue-200 mb-2 pb-2">
    <span className="text-xs text-blue-500">새로 생성된 그룹</span>
  </div>
)}
```

---

### 4.2 자동 편집 모드와의 연동 ⚠️

**현재 흐름**:
1. 블록 선택 → "그룹 생성" 클릭
2. `autoEditGroupId` 설정됨
3. useEffect가 `startEditing()` 호출
4. `editingGroupId` 설정됨

**문제점**:
- `editingGroupId`가 설정되기 전에 렌더링이 먼저 발생할 수 있음
- 순서: groups 변경 → 렌더링 → editingGroupId 설정

**해결 방안**:
```typescript
// autoEditGroupId도 "편집 중"으로 간주
const isEditing = (groupId: string) =>
  editingGroupId === groupId || autoEditGroupId === groupId;

const displayedGroups = useMemo(() => {
  const editingId = editingGroupId || autoEditGroupId;
  // ... 나머지 로직
}, [groups, showAllGroups, editingGroupId, autoEditGroupId]);
```

---

### 4.3 hiddenGroupCount 계산

**문제**:
- 편집 중인 그룹이 있으면 "접힌 개수"가 달라짐
- 예: 6개 그룹, 편집 중 → "1개 더보기" (5번만 숨김)

**현재**:
```typescript
const hiddenGroupCount = Math.max(0, groups.length - GROUP_PREVIEW_COUNT);
// 6개 그룹 → hiddenGroupCount = 1
```

**수정 필요**:
```typescript
const hiddenGroupCount = useMemo(() => {
  if (showAllGroups) return 0;

  const editingId = editingGroupId || autoEditGroupId;
  if (editingId) {
    // 편집 중인 그룹이 있으면 5개 중 1자리를 차지
    // 나머지 4개 + 편집 그룹 = 5개 표시
    // 숨겨지는 개수 = 전체 - 5
    return Math.max(0, groups.length - GROUP_PREVIEW_COUNT);
  }
  return Math.max(0, groups.length - GROUP_PREVIEW_COUNT);
}, [groups.length, showAllGroups, editingGroupId, autoEditGroupId]);
```

실제로는 편집 그룹이 있어도 hiddenGroupCount는 동일하므로 변경 불필요.

---

### 4.4 애니메이션 충돌 ⚠️

**문제**:
- 새 그룹 생성 시 AnimatePresence가 애니메이션 실행
- 순서 변경으로 인해 다른 그룹들도 애니메이션 트리거

**현상**:
- 1, 2, 3, 4, 5 → 6, 1, 2, 3, 4
- 모든 그룹이 다시 애니메이션 (깜빡임)

**해결 방안**:
```tsx
// layout 애니메이션 사용
<motion.div
  key={group.id}
  layout  // 위치 변경 시 부드러운 애니메이션
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
>
```

---

### 4.5 편집 취소 시 동작

**시나리오**:
1. 6번 그룹 생성 → 최상단 표시
2. 사용자가 Esc로 편집 취소
3. 6번 그룹은 어디로?

**옵션 A**: 접힌 상태로 이동 (기존대로)
- 장점: 일관성
- 단점: 새 그룹이 바로 안 보임

**옵션 B**: 자동으로 펼치기
```typescript
const cancelEdit = () => {
  // 편집 취소 시 자동 펼침
  if (groups.length > GROUP_PREVIEW_COUNT) {
    setShowAllGroups(true);
  }
  setEditingGroupId(null);
  // ...
};
```

**추천**: 옵션 A (기존대로) - 단순함 유지

---

## 5. 대안 검토

### 5.1 대안 A: 새 그룹 생성 시 자동 펼침

```typescript
// 그룹 추가 감지
useEffect(() => {
  if (groups.length > prevGroupsLength) {
    // 새 그룹이 추가됨 → 자동 펼침
    setShowAllGroups(true);
  }
}, [groups.length]);
```

**장점**: 구현 단순
**단점**: 펼친 상태가 유지되어 접기 의미 없어짐

---

### 5.2 대안 B: 편집 완료 전까지 접기 버튼 비활성화

```tsx
{groups.length > GROUP_PREVIEW_COUNT && !editingGroupId && (
  <button onClick={() => setShowAllGroups(!showAllGroups)}>
    ...
  </button>
)}
```

**장점**: 편집 중에는 접기 불가 → 혼란 방지
**단점**: 기능 제한

---

### 5.3 대안 C: 편집 그룹만 분리 표시 (권장)

```
[편집 중]
★ 6번 문제 (편집 모드)

[문제 그룹 5개]
1번
2번
3번
4번
5번
```

**장점**: 시각적으로 명확히 분리
**단점**: UI 변경 필요

---

## 6. 최종 권장 구현

### 6.1 단계별 구현

**Step 1**: displayedGroups 로직 수정
- 편집 중인 그룹을 최상단에 배치
- autoEditGroupId도 고려

**Step 2**: 시각적 구분 추가 (선택)
- "편집 중" 배지 또는 하이라이트

**Step 3**: 애니메이션 최적화
- `layout` prop 추가

### 6.2 예상 코드

```typescript
// GroupPanel.tsx

const displayedGroups = useMemo(() => {
  const editingId = editingGroupId || autoEditGroupId;

  // 편집 중인 그룹이 있으면 최상단에 배치
  if (editingId) {
    const editingGroup = groups.find(g => g.id === editingId);
    const otherGroups = groups.filter(g => g.id !== editingId);

    if (editingGroup) {
      // 편집 그룹 + 나머지 (최대 4개)
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

## 7. 테스트 시나리오

| TC | 시나리오 | 예상 결과 |
|----|---------|----------|
| 1 | 5개 그룹 → 6번째 생성 | 6번 최상단, 1-4번 표시, +1개 더보기 |
| 2 | 6번 편집 완료 (Enter) | 1-5번 표시, +1개 더보기 (6번 숨김) |
| 3 | 6번 편집 취소 (Esc) | 1-5번 표시, +1개 더보기 (6번 숨김) |
| 4 | 펼친 상태에서 7번째 생성 | 7번 최상단, 1-6번 표시, 접기 버튼 |
| 5 | 접힌 6번 클릭 | 자동 펼침 → 6번 편집 모드 |

---

## 8. 결론

### 구현 가능성: ✅ 높음

- useMemo 로직 수정만으로 구현 가능
- 기존 코드와 자연스럽게 통합

### 우려 사항 요약

| 우려 | 심각도 | 해결 방안 |
|------|--------|----------|
| 순서 혼란 | 중 | "편집 중" 라벨 추가 |
| 자동 편집 연동 | 저 | autoEditGroupId도 고려 |
| 애니메이션 깜빡임 | 저 | layout prop 사용 |

### 예상 소요 시간

- 기본 구현: 15분
- 시각적 구분 추가: +10분
- 테스트: 10분

---

*작성일: 2025-12-05*
