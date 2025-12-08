# Phase 49-B: Footer 미연결 문제 접기 기능 분석 리포트

**날짜**: 2025-12-05
**요청**: Footer(하단 바)의 미연결 문제 버튼을 5개만 표시하고 나머지 접기

---

## 1. 현재 구조

### 1.1 Footer UI (UnifiedWorkPage.tsx:581-628)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔗 미연결: [11번] [8번] [9번] [10번] ... [22번]  ← 가로 스크롤  │ ⌨ 1 2 탭 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 현재 코드

```tsx
<div className="flex items-center gap-2 overflow-x-auto flex-1">
  <span>🔗 미연결:</span>
  {unlinkedProblems.map((problem) => (
    <button>{problem.problemNumber}번</button>
  ))}
</div>
```

**문제점**: 미연결 문제가 15개 이상이면 가로 스크롤이 매우 길어짐

---

## 2. 구현 방안

### 2.1 변경 후 UI

```
미연결 문제 6개 이상일 때:
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔗 미연결: [11번] [8번] [9번] [10번] [12번] [+10개 더]      │ ⌨ 1 2 탭 │
└─────────────────────────────────────────────────────────────────────────────┘

"+10개 더" 클릭 시 (펼친 상태):
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔗 미연결: [11번] [8번] ... [22번] [접기]                    │ ⌨ 1 2 탭 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 구현 코드

```tsx
// UnifiedWorkPage.tsx에 추가
const [showAllUnlinked, setShowAllUnlinked] = useState(false);
const UNLINKED_PREVIEW_COUNT = 5;

const displayedUnlinkedProblems = useMemo(() => {
  if (showAllUnlinked || unlinkedProblems.length <= UNLINKED_PREVIEW_COUNT) {
    return unlinkedProblems;
  }
  return unlinkedProblems.slice(0, UNLINKED_PREVIEW_COUNT);
}, [unlinkedProblems, showAllUnlinked]);

const hiddenUnlinkedCount = Math.max(0, unlinkedProblems.length - UNLINKED_PREVIEW_COUNT);
```

### 2.3 렌더링 변경

```tsx
{displayedUnlinkedProblems.map((problem) => (
  <button>{problem.problemNumber}번</button>
))}

{/* 더보기/접기 버튼 */}
{unlinkedProblems.length > UNLINKED_PREVIEW_COUNT && (
  <button
    onClick={() => setShowAllUnlinked(!showAllUnlinked)}
    className="px-3 py-1 rounded-full text-sm bg-grey-200 text-grey-600 hover:bg-grey-300 flex-shrink-0"
  >
    {showAllUnlinked ? '접기' : `+${hiddenUnlinkedCount}개 더`}
  </button>
)}
```

---

## 3. 구현 가능성

### 3.1 난이도: ⭐☆☆☆☆ (매우 쉬움)

| 항목 | 내용 |
|------|------|
| 수정 파일 | `UnifiedWorkPage.tsx` 1개 |
| 코드 변경량 | ~20줄 |
| 백엔드 변경 | 없음 |
| 테스트 범위 | Footer UI만 |

### 3.2 이유

- Phase 49에서 이미 동일한 패턴 구현 완료 (ProblemListPanel)
- 로직 복사 + 상수값만 변경 (3 → 5)
- 데이터 흐름 변경 없음

---

## 4. 우려되는 점

### 4.1 선택된 문제가 숨겨질 수 있음 ⚠️

**시나리오**:
1. 미연결 문제 15개 (5개만 표시)
2. 사용자가 6번째 문제 선택 (숨겨진 상태)
3. 선택된 문제가 보이지 않음

**해결 방안**:
```tsx
// 선택된 문제가 숨겨진 경우 자동 펼침
useEffect(() => {
  if (selectedProblemId) {
    const selectedIndex = unlinkedProblems.findIndex(
      (p) => p.groupId === selectedProblemId
    );
    if (selectedIndex >= UNLINKED_PREVIEW_COUNT) {
      setShowAllUnlinked(true);
    }
  }
}, [selectedProblemId, unlinkedProblems]);
```

**추천**: 선택된 문제가 숨겨지면 자동으로 펼침

---

### 4.2 키보드 네비게이션과의 호환성

**현재**: ↑↓ 키로 문제 선택 가능

**문제점**: 숨겨진 문제로 이동 시 보이지 않음

**해결**: 4.1과 동일 (자동 펼침)

---

### 4.3 UI 공간 부족

Footer는 가로 공간이 한정됨:
- 미연결 버튼 5개
- "+N개 더" 버튼
- 키보드 힌트

**확인 필요**: 작은 화면에서 레이아웃 깨짐 가능성

**해결**: 반응형 처리 또는 키보드 힌트 축소

---

## 5. 구현 단계

### Step 1: 상태 추가
```tsx
const [showAllUnlinked, setShowAllUnlinked] = useState(false);
const UNLINKED_PREVIEW_COUNT = 5;
```

### Step 2: useMemo 추가
```tsx
const displayedUnlinkedProblems = useMemo(() => {
  if (showAllUnlinked || unlinkedProblems.length <= UNLINKED_PREVIEW_COUNT) {
    return unlinkedProblems;
  }
  return unlinkedProblems.slice(0, UNLINKED_PREVIEW_COUNT);
}, [unlinkedProblems, showAllUnlinked]);

const hiddenUnlinkedCount = Math.max(0, unlinkedProblems.length - UNLINKED_PREVIEW_COUNT);
```

### Step 3: 자동 펼침 useEffect 추가
```tsx
// Phase 49-B: 선택된 문제가 숨겨진 경우 자동 펼침
useEffect(() => {
  if (selectedProblemId && !showAllUnlinked) {
    const selectedIndex = unlinkedProblems.findIndex(
      (p) => p.groupId === selectedProblemId
    );
    if (selectedIndex >= UNLINKED_PREVIEW_COUNT) {
      setShowAllUnlinked(true);
    }
  }
}, [selectedProblemId, unlinkedProblems, showAllUnlinked]);
```

### Step 4: map 대상 변경 + 버튼 추가
```tsx
{displayedUnlinkedProblems.map((problem) => (
  <button>...</button>
))}

{unlinkedProblems.length > UNLINKED_PREVIEW_COUNT && (
  <button onClick={() => setShowAllUnlinked(!showAllUnlinked)}>
    {showAllUnlinked ? '접기' : `+${hiddenUnlinkedCount}개`}
  </button>
)}
```

---

## 6. 예상 결과

| 미연결 문제 수 | 표시 |
|--------------|------|
| 0개 | "모두 연결됨" |
| 1~5개 | 전체 표시, 버튼 없음 |
| 6개 | 5개 + "+1개 더" |
| 15개 | 5개 + "+10개 더" |

---

## 7. 결론

### 구현 가능성: ✅ 매우 높음

- Phase 49와 동일한 패턴
- 코드 ~20줄 추가
- 10분 내 구현 가능

### 추가 고려사항

- 선택된 문제 자동 펼침 (권장)
- 반응형 레이아웃 확인

---

*작성일: 2025-12-05*
