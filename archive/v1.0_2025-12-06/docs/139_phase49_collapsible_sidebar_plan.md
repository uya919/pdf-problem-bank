# Phase 49: 사이드바 접기 기능 개발 계획

## 목표
매칭 완료된 문제가 많을 때 (1000개 등) 3개만 표시하고 나머지는 접기

---

## 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `ProblemListPanel.tsx` | "매칭 완료" 섹션 접기/펼치기 |

---

## 구현 단계

### Step 1: 상태 및 상수 추가

**파일:** `frontend/src/components/matching/ProblemListPanel.tsx`

```typescript
// Phase 49: 접기 상태
const [showAllLinked, setShowAllLinked] = useState(false);
const LINKED_PREVIEW_COUNT = 3;
```

---

### Step 2: 표시할 문제 계산

```typescript
// Phase 49: 표시할 연결된 문제 계산
const displayedLinkedProblems = useMemo(() => {
  if (showAllLinked || linkedProblems.length <= LINKED_PREVIEW_COUNT) {
    return linkedProblems;
  }
  return linkedProblems.slice(0, LINKED_PREVIEW_COUNT);
}, [linkedProblems, showAllLinked]);

const hiddenLinkedCount = Math.max(0, linkedProblems.length - LINKED_PREVIEW_COUNT);
```

---

### Step 3: import 추가

```typescript
import { ChevronDown, ChevronUp } from 'lucide-react';
```

---

### Step 4: 접기/펼치기 버튼 렌더링

연결된 문제 목록 아래에 버튼 추가:

```typescript
{/* Phase 49: 접기/펼치기 버튼 */}
{linkedProblems.length > LINKED_PREVIEW_COUNT && (
  <button
    onClick={() => setShowAllLinked(!showAllLinked)}
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
      {showAllLinked ? (
        <>
          <ChevronUp className="w-4 h-4 text-grey-500" />
          <span className="text-grey-700">접기</span>
        </>
      ) : (
        <>
          <ChevronDown className="w-4 h-4 text-toss-blue" />
          <span className="text-toss-blue">{hiddenLinkedCount}개 더보기</span>
        </>
      )}
    </span>
    <span className="text-xs text-grey-400">
      전체 {linkedProblems.length}개
    </span>
  </button>
)}
```

---

### Step 5: map 대상 변경

```typescript
// 기존
{linkedProblems.map((pair) => ...)}

// 변경
{displayedLinkedProblems.map((pair) => ...)}
```

---

## 체크리스트

- [ ] Step 1: useState, 상수 추가
- [ ] Step 2: displayedLinkedProblems useMemo 추가
- [ ] Step 3: ChevronDown, ChevronUp import
- [ ] Step 4: 접기/펼치기 버튼 렌더링
- [ ] Step 5: linkedProblems → displayedLinkedProblems 변경
- [ ] 테스트: 4개 이상 매칭 시 "N개 더보기" 버튼 확인
- [ ] 테스트: 버튼 클릭 시 펼침/접기 동작 확인

---

## 예상 결과

| 연결된 문제 수 | 표시 |
|--------------|------|
| 0~3개 | 전체 표시, 버튼 없음 |
| 4개 | 3개 표시 + "1개 더보기" |
| 100개 | 3개 표시 + "97개 더보기" |
| 1000개 | 3개 표시 + "997개 더보기" |

---

*작성일: 2025-12-05*
