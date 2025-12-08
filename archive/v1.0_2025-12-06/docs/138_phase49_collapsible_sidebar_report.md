# Phase 49: 해설 탭 사이드바 접기 기능 상세 분석 리포트

**날짜**: 2025-12-05
**분석자**: Claude Code
**목표**: 해설 탭에서 매칭된 문제가 많을 때(1000개 등) UI 복잡도 해결

---

## 1. 요구사항 정리

### 1.1 사용자 요청
- **좌측 사이드패널**: 매칭 완료된 해설 3개만 표시, 4개 이상이면 나머지 접기
- **우측 사이드패널**: 마찬가지로 3개만 표시, 4개 이상이면 나머지 접기

### 1.2 명확화 필요 사항
**"좌측/우측 사이드패널"의 정의**:
- **좌측**: `ProblemListPanel` (현재 260px, 미연결/연결된 문제 목록)
- **우측**: `GroupPanel` (현재 사용되지 않음 - UnifiedWorkPage에서는 렌더링 안 됨)

**실제 UI 구조 (UnifiedWorkPage)**:
```
┌──────────────────────────────────────────────────────────────┐
│ Header (탭, 진행률, 사이드바 토글)                              │
├───────────┬──────────────────────────────────────────────────┤
│ 좌측 패널  │ 중앙 캔버스 (PageViewer)                          │
│           │                                                  │
│ Problem   │ - 문제 탭: 문제 문서 라벨링                       │
│ List      │ - 해설 탭: 해설 문서 라벨링 + 매칭                │
│ Panel     │                                                  │
│           │                                                  │
│ (260px)   │                                                  │
│           │                                                  │
│ - 미연결  │                                                  │
│ - 연결됨  │                                                  │
└───────────┴──────────────────────────────────────────────────┤
│ Footer (미연결 문제 목록, 키보드 힌트)                          │
└──────────────────────────────────────────────────────────────┘
```

**❗ 발견**: UnifiedWorkPage에는 우측 패널(GroupPanel)이 없음!
→ 요구사항 재해석 필요: "우측 사이드패널"은 무엇을 의미하는가?

---

## 2. 현재 구조 분석

### 2.1 UnifiedWorkPage.tsx
**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\pages\UnifiedWorkPage.tsx`

**레이아웃 구조**:
```tsx
<div className="h-full flex flex-col">
  {/* Header */}
  <header>
    <Tabs: 문제 / 해설>
    <Controls: 사이드바 토글, 새로고침 등>
  </header>

  {/* Main Content */}
  <div className="flex-1 flex">
    {/* 좌측 사이드바 (showSidebar === true) */}
    <AnimatePresence>
      <ProblemListPanel width={260} />
    </AnimatePresence>

    {/* 중앙 캔버스 */}
    <PageViewer />
  </div>

  {/* Footer */}
  <footer>
    <미연결 문제 버튼들 (가로 스크롤)>
  </footer>
</div>
```

**특징**:
- 좌측 패널만 존재 (`ProblemListPanel`)
- 우측에는 별도 패널 없음 (PageViewer가 전체 차지)
- Footer에 미연결 문제가 버튼 형태로 표시됨 (이미 가로 스크롤 지원)

---

### 2.2 ProblemListPanel.tsx
**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\components\matching\ProblemListPanel.tsx`

**데이터 흐름**:
```typescript
useUnlinkedProblems() → ProblemReference[]  // 미연결 문제
useLinkedProblems()   → LinkedProblemPair[] // 연결된 문제-해설 쌍
```

**현재 렌더링**:
```tsx
<div className="flex flex-col h-full">
  {/* 미연결 문제 섹션 */}
  <div className="flex-1 overflow-y-auto">
    <SectionHeader title="미연결 문제" count={unlinkedProblems.length} />
    <div>
      {unlinkedProblems.map(...)} // 전체 표시
    </div>

    {/* 연결된 문제 섹션 */}
    <SectionHeader title="매칭 완료" count={linkedProblems.length} />
    <div>
      {linkedProblems.map(...)} // 전체 표시 ← 여기가 문제!
    </div>
  </div>

  {/* 하단 진행률 */}
  <div>...</div>
</div>
```

**1000개 문제 시나리오**:
- 미연결: 0개
- 연결됨: 1000개
- **현재**: 1000개 모두 렌더링 → 스크롤 지옥
- **목표**: 3개만 표시, "더보기 (997개)" 버튼

---

### 2.3 GroupPanel.tsx
**파일**: `c:\MYCLAUDE_PROJECT\pdf\frontend\src\components\GroupPanel.tsx`

**역할**:
- PageViewer 내부의 우측 패널 (현재 페이지의 그룹 관리)
- 그룹 생성/삭제/편집 기능
- UnifiedWorkPage에서는 사용 안 됨 (PageViewer 단독 사용 시에만)

**구조**:
```tsx
<Card>
  <CardHeader>문제 그룹 (N개)</CardHeader>
  <CardContent>
    <Button>그룹 생성</Button>
    <div className="overflow-y-auto">
      {groups.map(...)} // 현재 페이지의 그룹 전체 표시
    </div>
  </CardContent>
</Card>
```

**현재 사용처**:
- `PageViewer.tsx` 내부에서 조건부 렌더링
- UnifiedWorkPage에서는 PageViewer에 showGroupPanel 전달 안 함 → 기본값 false → 렌더링 안 됨

---

### 2.4 데이터 구조
**workSessionStore.ts**:

```typescript
interface WorkSession {
  problems: ProblemReference[];  // 문제 목록
  links: ProblemSolutionLink[];  // 문제-해설 연결
}

interface ProblemReference {
  groupId: string;
  problemNumber: string;
  displayName: string;  // "베이직쎈_p10_3번"
}

interface ProblemSolutionLink {
  problemGroupId: string;
  solutionGroupId: string;
  solutionDocumentId: string;
  solutionPageIndex: number;
}
```

**연결된 문제 계산**:
```typescript
// useLinkedProblems 훅
const linkedProblems = problems
  .filter(p => links.some(l => l.problemGroupId === p.groupId))
  .map(p => ({
    problem: p,
    link: links.find(l => l.problemGroupId === p.groupId)!
  }));
```

---

## 3. 구현 방안

### 3.1 좌측 패널 (ProblemListPanel) - 연결된 문제 접기

**목표**: 매칭 완료된 문제 3개만 표시, 4개 이상이면 나머지 접기

**구현 전략**:
```tsx
// ProblemListPanel.tsx에 추가
const [showAllLinked, setShowAllLinked] = useState(false);
const LINKED_PREVIEW_COUNT = 3;

const displayedLinkedProblems = showAllLinked
  ? linkedProblems
  : linkedProblems.slice(0, LINKED_PREVIEW_COUNT);

const hiddenLinkedCount = linkedProblems.length - LINKED_PREVIEW_COUNT;
```

**UI 구조**:
```tsx
<SectionHeader title="매칭 완료" count={linkedProblems.length} />
<div>
  {displayedLinkedProblems.map(...)}

  {/* 접기/펼치기 버튼 */}
  {linkedProblems.length > LINKED_PREVIEW_COUNT && (
    <button
      onClick={() => setShowAllLinked(!showAllLinked)}
      className="w-full py-2 text-sm text-toss-blue hover:bg-grey-100"
    >
      {showAllLinked
        ? `접기 ▲`
        : `${hiddenLinkedCount}개 더보기 ▼`}
    </button>
  )}
</div>
```

**변경 파일**:
- `frontend/src/components/matching/ProblemListPanel.tsx`

**예상 코드 변경량**: 약 30줄

---

### 3.2 우측 패널 해석 및 구현

**시나리오 A: Footer의 미연결 문제 버튼들**
현재 이미 가로 스크롤 지원 중:
```tsx
<div className="flex items-center gap-2 overflow-x-auto">
  {unlinkedProblems.map(problem => (
    <button>{problem.problemNumber}번</button>
  ))}
</div>
```

**문제점**: 미연결 문제가 많을 때 가로 스크롤이 불편함

**해결 방안**:
```tsx
const [showAllUnlinked, setShowAllUnlinked] = useState(false);
const UNLINKED_PREVIEW_COUNT = 3;

const displayedUnlinked = showAllUnlinked
  ? unlinkedProblems
  : unlinkedProblems.slice(0, UNLINKED_PREVIEW_COUNT);

<div className="flex items-center gap-2">
  {displayedUnlinked.map(...)}

  {unlinkedProblems.length > UNLINKED_PREVIEW_COUNT && (
    <button onClick={() => setShowAllUnlinked(!showAllUnlinked)}>
      {showAllUnlinked
        ? '접기'
        : `+${unlinkedProblems.length - UNLINKED_PREVIEW_COUNT}개`}
    </button>
  )}
</div>
```

**변경 파일**:
- `frontend/src/pages/UnifiedWorkPage.tsx` (Footer 영역)

---

**시나리오 B: 미연결 문제 섹션도 접기**
좌측 패널의 "미연결 문제" 섹션도 동일하게 처리:

```tsx
// ProblemListPanel.tsx
const [showAllUnlinked, setShowAllUnlinked] = useState(true); // 기본 펼침
const displayedUnlinkedProblems = showAllUnlinked
  ? unlinkedProblems
  : unlinkedProblems.slice(0, LINKED_PREVIEW_COUNT);
```

**이유**: 미연결 문제는 "작업 대상"이므로 기본 펼침이 자연스러움

---

### 3.3 최종 추천 구현

**Phase 49-A: 좌측 패널 연결된 문제 접기**
- ProblemListPanel의 "매칭 완료" 섹션만 접기
- 기본값: 3개 표시, 나머지 접힘
- "N개 더보기" 버튼으로 펼침/접기

**Phase 49-B: Footer 미연결 문제 접기 (선택)**
- Footer의 가로 스크롤 버튼들을 3개 + 더보기로 변경
- 우선순위: 낮음 (현재 큰 문제 아님)

---

## 4. 구현 가능성 및 리스크

### 4.1 구현 난이도
**난이도**: ⭐⭐☆☆☆ (쉬움)

**이유**:
- 단순 UI 상태 관리 (useState 추가)
- 기존 렌더링 로직에 slice() 추가
- 데이터 흐름 변경 없음
- 백엔드 변경 불필요

---

### 4.2 우려되는 점

#### 4.2.1 UX 혼란
**문제**: 사용자가 연결된 문제를 찾기 어려울 수 있음

**해결**:
- 검색 기능 추가 (Phase 50 고려)
- 정렬 옵션 (최신순/번호순)
- 접은 상태에서도 카운트 표시 ("매칭 완료 (1000)")

---

#### 4.2.2 성능 이슈
**현재**: 1000개 연결된 문제 → 1000개 컴포넌트 렌더링

**개선 후**: 3개 또는 1000개 조건부 렌더링

**더 나은 방법**: 가상 스크롤 (react-window)
```tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={400}
  itemCount={linkedProblems.length}
  itemSize={48}
>
  {({ index, style }) => (
    <div style={style}>
      <LinkedProblemItem problem={linkedProblems[index]} />
    </div>
  )}
</FixedSizeList>
```

**추천**: 먼저 접기 기능 구현 → 추후 가상 스크롤 고려 (Phase 51)

---

#### 4.2.3 상태 관리
**문제**: showAllLinked 상태를 어디에 저장?

**옵션**:
1. **로컬 상태** (useState): 컴포넌트 언마운트 시 리셋
2. **세션 스토어** (workSessionStore): 페이지 전환 시에도 유지
3. **로컬 스토리지**: 브라우저 재시작 후에도 유지

**추천**: 로컬 상태 (가장 단순, 사용자가 매번 새롭게 판단 가능)

---

### 4.3 데이터 일관성
**문제 없음**:
- 읽기 전용 UI (데이터 수정 없음)
- 백엔드 동기화 불필요

---

## 5. 세부 구현 계획

### 5.1 Phase 49-A: ProblemListPanel 접기 기능

**파일**: `frontend/src/components/matching/ProblemListPanel.tsx`

**변경 사항**:
1. 상태 추가
```tsx
const [showAllLinked, setShowAllLinked] = useState(false);
const LINKED_PREVIEW_COUNT = 3;
```

2. 표시 데이터 계산
```tsx
const displayedLinkedProblems = useMemo(() => {
  if (showAllLinked || linkedProblems.length <= LINKED_PREVIEW_COUNT) {
    return linkedProblems;
  }
  return linkedProblems.slice(0, LINKED_PREVIEW_COUNT);
}, [linkedProblems, showAllLinked]);

const hiddenLinkedCount = Math.max(0, linkedProblems.length - LINKED_PREVIEW_COUNT);
```

3. 렌더링 수정
```tsx
<div className="px-2 pb-2">
  {linkedProblems.length === 0 ? (
    <EmptyState message="아직 연결된 문제가 없습니다" />
  ) : (
    <>
      {displayedLinkedProblems.map(...)}

      {/* 접기/펼치기 버튼 */}
      {linkedProblems.length > LINKED_PREVIEW_COUNT && (
        <button
          onClick={() => setShowAllLinked(!showAllLinked)}
          className="w-full mt-1 px-3 py-2 text-sm font-medium text-toss-blue hover:bg-grey-100 rounded-lg transition-colors flex items-center justify-between"
        >
          <span>
            {showAllLinked
              ? '접기'
              : `${hiddenLinkedCount}개 더보기`}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAllLinked ? 'rotate-180' : ''}`} />
        </button>
      )}
    </>
  )}
</div>
```

4. import 추가
```tsx
import { ChevronDown } from 'lucide-react';
```

**예상 라인 변경**: +25줄, 수정 3줄

---

### 5.2 Phase 49-B: 미연결 문제 섹션 접기 (선택)

**파일**: 동일 (`ProblemListPanel.tsx`)

**변경 사항**:
```tsx
const [showAllUnlinked, setShowAllUnlinked] = useState(true); // 기본 펼침

const displayedUnlinkedProblems = useMemo(() => {
  if (showAllUnlinked || unlinkedProblems.length <= LINKED_PREVIEW_COUNT) {
    return unlinkedProblems;
  }
  return unlinkedProblems.slice(0, LINKED_PREVIEW_COUNT);
}, [unlinkedProblems, showAllUnlinked]);
```

**우선순위**: 낮음 (미연결 문제는 작업 대상이므로 접을 필요 적음)

---

### 5.3 Phase 49-C: Footer 접기 (선택)

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

**현재 Footer 구조**:
```tsx
<footer>
  <div className="flex items-center gap-2 overflow-x-auto">
    <span>미연결:</span>
    {unlinkedProblems.map(problem => (
      <button onClick={() => selectProblem(problem.groupId)}>
        {problem.problemNumber}번
      </button>
    ))}
  </div>
</footer>
```

**개선안**:
```tsx
const [showAllFooterUnlinked, setShowAllFooterUnlinked] = useState(false);
const displayedFooterUnlinked = showAllFooterUnlinked
  ? unlinkedProblems
  : unlinkedProblems.slice(0, 3);

<footer>
  <div className="flex items-center gap-2">
    <span>미연결:</span>
    {displayedFooterUnlinked.map(...)}
    {unlinkedProblems.length > 3 && (
      <button onClick={() => setShowAllFooterUnlinked(!showAllFooterUnlinked)}>
        {showAllFooterUnlinked ? '접기' : `+${unlinkedProblems.length - 3}`}
      </button>
    )}
  </div>
</footer>
```

**우선순위**: 중간 (가로 스크롤보다는 나음, 하지만 긴급하지 않음)

---

## 6. 테스트 시나리오

### 6.1 기본 동작 테스트
| 테스트 케이스 | 연결된 문제 수 | 예상 동작 |
|--------------|--------------|----------|
| TC-1 | 0개 | "아직 연결된 문제가 없습니다" 표시 |
| TC-2 | 1개 | 1개 표시, 접기 버튼 없음 |
| TC-3 | 3개 | 3개 표시, 접기 버튼 없음 |
| TC-4 | 4개 | 3개 표시, "1개 더보기" 버튼 |
| TC-5 | 100개 | 3개 표시, "97개 더보기" 버튼 |
| TC-6 | 1000개 | 3개 표시, "997개 더보기" 버튼 |

### 6.2 상호작용 테스트
| 테스트 케이스 | 동작 | 예상 결과 |
|--------------|------|----------|
| TC-7 | "97개 더보기" 클릭 | 100개 모두 표시, "접기" 버튼으로 변경 |
| TC-8 | "접기" 클릭 | 다시 3개만 표시, "97개 더보기" 버튼 |
| TC-9 | 펼친 상태에서 스크롤 | 스크롤 정상 동작 |
| TC-10 | 연결 해제 (99개로 감소) | 접힌 상태 유지, "96개 더보기" 업데이트 |

### 6.3 성능 테스트
| 테스트 | 조건 | 측정 항목 |
|--------|------|----------|
| PT-1 | 1000개 연결 (현재) | 초기 렌더링 시간 |
| PT-2 | 1000개 연결 (개선) | 초기 렌더링 시간 (3개만 렌더) |
| PT-3 | "997개 더보기" 클릭 | 펼침 렌더링 시간 |

**예상 개선**: 초기 렌더링 시간 ~99% 감소 (1000개 → 3개)

---

## 7. UI/UX 디자인 제안

### 7.1 토스 스타일 접기 버튼
```tsx
<button
  onClick={() => setShowAllLinked(!showAllLinked)}
  className="
    w-full mt-1 px-3 py-2.5
    bg-white hover:bg-grey-50
    border border-grey-200
    rounded-lg
    transition-all duration-200
    flex items-center justify-between
    text-sm font-medium text-grey-700
  "
>
  <span className="flex items-center gap-2">
    {showAllLinked ? (
      <>
        <ChevronUp className="w-4 h-4 text-grey-500" />
        접기
      </>
    ) : (
      <>
        <ChevronDown className="w-4 h-4 text-toss-blue" />
        <span className="text-toss-blue">{hiddenLinkedCount}개</span>
        더보기
      </>
    )}
  </span>
  <span className="text-xs text-grey-400">
    전체 {linkedProblems.length}개
  </span>
</button>
```

### 7.2 애니메이션
```tsx
import { AnimatePresence, motion } from 'framer-motion';

<AnimatePresence>
  {displayedLinkedProblems.map((pair, index) => (
    <motion.div
      key={pair.problem.groupId}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
    >
      <LinkedProblemItem {...pair} />
    </motion.div>
  ))}
</AnimatePresence>
```

**주의**: 1000개 펼칠 때는 애니메이션 스킵 (성능)
```tsx
const shouldAnimate = linkedProblems.length <= 50;
```

---

## 8. 대안 고려

### 8.1 가상 스크롤 (react-window)
**장점**:
- 1000개 문제도 부드러운 스크롤
- 메모리 효율적 (보이는 항목만 렌더)

**단점**:
- 라이브러리 추가 필요
- 고정 높이 필요 (동적 높이 어려움)
- 구현 복잡도 증가

**추천**: Phase 51에서 고려 (현재는 접기로 충분)

---

### 8.2 페이지네이션
**장점**:
- 명확한 구조 (1페이지, 2페이지...)
- 대량 데이터 처리 표준 방식

**단점**:
- 연속적인 탐색 불편
- 페이지 네비게이션 UI 공간 필요
- 수학 문제 매칭에는 부자연스러움

**추천**: 부적합

---

### 8.3 검색/필터
**장점**:
- 특정 문제 빠르게 찾기
- 책/페이지별 필터링

**단점**:
- 추가 UI 공간 필요
- 구현 복잡도 높음

**추천**: Phase 50에서 고려 (접기와 함께 사용하면 시너지)

---

## 9. 최종 구현 권장사항

### 9.1 우선순위
1. **Phase 49-A**: ProblemListPanel 연결된 문제 접기 (필수)
2. **Phase 49-C**: Footer 미연결 문제 접기 (선택)
3. **Phase 49-B**: 미연결 문제 섹션 접기 (불필요)

### 9.2 구현 순서
```
1. Phase 49-A 구현 (30분)
   ├─ useState, useMemo 추가
   ├─ 접기/펼치기 버튼 추가
   └─ 스타일링 (토스 스타일)

2. 테스트 (10분)
   ├─ 3개/4개/100개/1000개 시나리오
   └─ 접기/펼치기 동작 확인

3. Phase 49-C 검토 (선택)
   └─ Footer 접기 필요 여부 재확인
```

### 9.3 추가 개선 계획
- **Phase 50**: 검색 기능 (책 이름, 문항번호)
- **Phase 51**: 가상 스크롤 (5000개 이상 대비)
- **Phase 52**: 정렬 옵션 (번호순, 최신순, 페이지순)

---

## 10. 예상 코드 미리보기

### 10.1 ProblemListPanel.tsx (수정 후)
```tsx
export const ProblemListPanel = memo(function ProblemListPanel({
  width = 240,
  enableKeyboard = true,
  onProblemClick,
  onUnlinkClick,
}: ProblemListPanelProps) {
  // ... 기존 코드 ...

  // Phase 49-A: 접기 상태
  const [showAllLinked, setShowAllLinked] = useState(false);
  const LINKED_PREVIEW_COUNT = 3;

  // Phase 49-A: 표시할 문제 계산
  const displayedLinkedProblems = useMemo(() => {
    if (showAllLinked || linkedProblems.length <= LINKED_PREVIEW_COUNT) {
      return linkedProblems;
    }
    return linkedProblems.slice(0, LINKED_PREVIEW_COUNT);
  }, [linkedProblems, showAllLinked]);

  const hiddenLinkedCount = Math.max(0, linkedProblems.length - LINKED_PREVIEW_COUNT);

  return (
    <div className="flex flex-col h-full bg-grey-50 border-r border-grey-200" style={{ width }}>
      {/* 미연결 문제 섹션 - 변경 없음 */}
      <div className="flex-1 overflow-y-auto">
        <SectionHeader title="미연결 문제" count={unlinkedProblems.length} color="text-yellow-600" />
        <div className="px-2 pb-2">
          {/* ... 기존 미연결 문제 렌더링 ... */}
        </div>

        {/* 연결된 문제 섹션 - 수정됨 */}
        <SectionHeader title="매칭 완료" count={linkedProblems.length} color="text-green-600" />
        <div className="px-2 pb-2">
          {linkedProblems.length === 0 ? (
            <EmptyState message="아직 연결된 문제가 없습니다" />
          ) : (
            <>
              {/* Phase 49-A: 표시 제한 */}
              {displayedLinkedProblems.map((pair) => (
                <LinkedProblemItem
                  key={pair.problem.groupId}
                  pair={pair}
                  isSelected={pair.problem.groupId === selectedProblemId}
                  onClick={() => handleProblemClick(pair.problem)}
                  onUnlink={(e) => handleUnlinkClick(pair.problem.groupId, e)}
                />
              ))}

              {/* Phase 49-A: 접기/펼치기 버튼 */}
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
            </>
          )}
        </div>
      </div>

      {/* 하단 진행률 - 변경 없음 */}
      <div className="border-t border-grey-200 p-3 bg-white">
        {/* ... 기존 진행률 표시 ... */}
      </div>
    </div>
  );
});
```

### 10.2 import 수정
```tsx
import {
  Circle,
  CheckCircle2,
  ChevronRight,
  Link2Off,
  ArrowRight,
  ChevronDown,  // Phase 49-A: 추가
  ChevronUp,    // Phase 49-A: 추가
} from 'lucide-react';
```

---

## 11. 결론

### 11.1 구현 가능성
**✅ 높음**: 단순 UI 로직 추가, 데이터 흐름 변경 없음

### 11.2 예상 효과
- **성능**: 초기 렌더링 1000개 → 3개 (99% 개선)
- **UX**: 깔끔한 UI, 필요 시 펼침 가능
- **유지보수**: 코드 변경 최소 (25줄 추가)

### 11.3 리스크
- **낮음**: 기존 기능 영향 없음, 백엔드 변경 불필요

### 11.4 다음 단계
1. 사용자 확인: "좌측/우측 사이드패널" 정의 명확화
2. Phase 49-A 구현 (ProblemListPanel 접기)
3. 테스트 (3/4/100/1000개 시나리오)
4. 필요 시 Phase 49-C (Footer) 구현

---

**작성일**: 2025-12-05
**리포트 버전**: 1.0
**다음 액션**: 사용자 피드백 대기 → "진행해줘" 시 Phase 49-A 구현 시작
