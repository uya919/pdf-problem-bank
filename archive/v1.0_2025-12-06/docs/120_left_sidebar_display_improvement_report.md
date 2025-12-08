# 좌측 사이드바 표시 형식 개선 연구 리포트

**작성일**: 2025-12-04
**요청**: 좌측 사이드바에 "베이직쎈 10P 1번" 형식으로 표시 (우측 사이드바처럼)
**상태**: 구현 가능, 간단한 수정

---

## 1. 현재 상태 분석

### 1.1 좌측 사이드바 (ProblemListPanel.tsx)

```
현재 표시:
┌─────────────────────┐
│ 문제 L3번           │  ← problemNumber만 표시
│ 문제 L2             │
│ ...                 │
└─────────────────────┘
```

**코드 (Line 247-253):**
```typescript
<span className={`text-sm font-medium ${isSelected ? 'text-toss-blue' : 'text-grey-700'}`}>
  {problem.problemNumber}번
</span>
{problem.displayName && (
  <p className="text-xs text-grey-400 truncate mt-0.5">
    {problem.displayName}  // 현재는 보조 텍스트로만 표시
  </p>
)}
```

### 1.2 우측 사이드바 (GroupPanel.tsx)

```
현재 표시:
┌─────────────────────────────────┐
│ 1  베이직쎈 · 10p · 98블록  ✓  │  ← 문항번호 + 책이름 + 페이지 + 블록수
│ 2  베이직쎈 · 10p · 76블록  ✓  │
└─────────────────────────────────┘
```

**코드 (Line 376-393):**
```typescript
{/* 문항번호 (큰 글씨) */}
<span className="text-lg font-bold text-gray-900 whitespace-nowrap">
  {group.problemInfo?.problemNumber || `#${index + 1}`}
</span>

{/* 요약 정보 */}
<div className="flex items-center gap-2 text-sm text-gray-500 truncate">
  <span className="truncate">{group.problemInfo.bookName}</span>
  <span className="text-gray-300">·</span>
  <span>{group.problemInfo.page}p</span>
  <span className="text-gray-300">·</span>
  <span className="text-xs text-gray-400">{group.block_ids.length}블록</span>
</div>
```

---

## 2. 데이터 구조 분석

### 2.1 ProblemReference (좌측 사이드바에서 사용)

```typescript
export interface ProblemReference {
  groupId: string;           // "L1", "R2"
  documentId: string;        // 문서 ID
  pageIndex: number;         // 0-based 페이지
  problemNumber: string;     // "문제 L3" 또는 "1", "2"
  displayName: string;       // "베이직쎈_공통수학1_p10_3번" ← 핵심!
  createdAt: number;
}
```

### 2.2 displayName 형식

```
형식: {책이름}_{과정}_{p페이지}_{문항번호}번
예시: 베이직쎈_공통수학1_p10_3번
```

**중요 발견**: `displayName`에 이미 모든 정보가 포함되어 있음!

---

## 3. 구현 방안

### 3.1 Option A: displayName 파싱하여 표시 (권장)

`displayName`을 파싱하여 우측 사이드바와 동일한 형식으로 표시

```typescript
// displayName: "베이직쎈_공통수학1_p10_3번" → { bookName, course, page, problemNumber }
const parseProblemDisplayName = (displayName: string) => {
  const parts = displayName.split('_');
  if (parts.length >= 4) {
    return {
      bookName: parts[0],
      course: parts[1],
      page: parts[2]?.replace('p', '') || '',
      problemNumber: parts[3]?.replace('번', '') || '',
    };
  }
  return null;
};
```

**표시 결과:**
```
┌─────────────────────────────────┐
│ ○ 3번  베이직쎈 · 10p          │
│ ○ 4번  베이직쎈 · 10p          │
│ ...                             │
└─────────────────────────────────┘
```

### 3.2 Option B: displayName 그대로 표시 (가장 간단)

`problemNumber번` 대신 `displayName`을 그대로 표시

```typescript
<span className="text-sm font-medium">
  {problem.displayName || `${problem.problemNumber}번`}
</span>
```

**표시 결과:**
```
┌─────────────────────────────────┐
│ ○ 베이직쎈_공통수학1_p10_3번   │
│ ○ 베이직쎈_공통수학1_p10_4번   │
└─────────────────────────────────┘
```

### 3.3 Option C: 세션에서 문서 정보 가져오기

세션에 이미 `problemDocumentName`이 있으므로 이를 활용

```typescript
const bookName = currentSession?.problemDocumentName; // 또는 파싱
```

---

## 4. 권장 구현 (Option A 상세)

### 4.1 수정할 파일

`frontend/src/components/matching/ProblemListPanel.tsx`

### 4.2 수정 내용

**UnlinkedProblemItem 컴포넌트:**

```typescript
const UnlinkedProblemItem = memo(function UnlinkedProblemItem({
  problem,
  isSelected,
  onClick,
}: UnlinkedProblemItemProps) {
  // displayName 파싱
  const parsed = useMemo(() => {
    if (!problem.displayName) return null;
    const parts = problem.displayName.split('_');
    if (parts.length >= 4) {
      return {
        bookName: parts[0],
        page: parts[2]?.replace('p', '') || '',
        problemNumber: parts[3]?.replace('번', '') || problem.problemNumber,
      };
    }
    return null;
  }, [problem.displayName, problem.problemNumber]);

  return (
    <button onClick={onClick} className="...">
      {isSelected ? <ChevronRight /> : <Circle />}
      <div className="flex-1 min-w-0">
        {parsed ? (
          <>
            <span className="text-sm font-medium">
              {parsed.problemNumber}
            </span>
            <span className="text-xs text-grey-500 ml-1.5">
              {parsed.bookName} · {parsed.page}p
            </span>
          </>
        ) : (
          <span className="text-sm font-medium">
            {problem.problemNumber}번
          </span>
        )}
      </div>
    </button>
  );
});
```

---

## 5. 우려 사항 및 고려점

### 5.1 displayName이 없는 경우

**문제**: 오래된 데이터나 수동 생성된 그룹은 `displayName`이 없을 수 있음

**해결책**: fallback으로 기존 표시 유지
```typescript
{parsed ? (
  // 새 형식
) : (
  // 기존 형식: {problem.problemNumber}번
)}
```

### 5.2 displayName 형식 불일치

**문제**: `displayName` 형식이 다를 수 있음
- 예: "3번" (과정 정보 없음)
- 예: "수학_p10_3번" (과정 없이 책이름_페이지_번호)

**해결책**: 파싱 실패 시 graceful fallback
```typescript
const parseProblemDisplayName = (displayName: string) => {
  const parts = displayName.split('_');

  // 최소 형식: 책이름_p페이지_번호
  if (parts.length >= 3 && parts[parts.length - 2]?.startsWith('p')) {
    return {
      bookName: parts.slice(0, -2).join('_'),  // 앞부분 전체를 책이름으로
      page: parts[parts.length - 2].replace('p', ''),
      problemNumber: parts[parts.length - 1].replace('번', ''),
    };
  }

  return null;  // 파싱 실패 → 기존 형식 사용
};
```

### 5.3 공간 제약

**문제**: 좌측 사이드바 너비가 좁음 (기본 240px)

**해결책**:
- 책이름 truncate 처리
- 핵심 정보만 표시 (문항번호 + 페이지)
- 호버 시 전체 정보 tooltip

```typescript
<span className="truncate max-w-[80px]">{parsed.bookName}</span>
```

### 5.4 성능 고려

**문제**: 매번 displayName 파싱

**해결책**: `useMemo`로 메모이제이션
```typescript
const parsed = useMemo(() => parseProblemDisplayName(problem.displayName), [problem.displayName]);
```

### 5.5 연결된 문제 (LinkedProblemItem)도 동일하게 수정

현재 `LinkedProblemItem`도 `{problem.problemNumber}번`만 표시하므로 동일하게 수정 필요

---

## 6. 구현 복잡도 평가

| 항목 | 난이도 | 비고 |
|------|--------|------|
| 코드 수정량 | 낮음 | 1개 파일, 약 30줄 |
| 테스트 범위 | 낮음 | UI만 변경, 로직 변경 없음 |
| 기존 코드 영향 | 없음 | fallback 있으므로 안전 |
| 예상 소요 시간 | 30분 | |

---

## 7. 결론 및 권장사항

### 7.1 구현 가능성

**높음** - `displayName`에 이미 필요한 모든 정보가 있으므로 파싱만 추가하면 됨

### 7.2 권장 구현 순서

1. `parseProblemDisplayName` 유틸 함수 생성
2. `UnlinkedProblemItem` 수정
3. `LinkedProblemItem` 수정
4. 테스트: 기존 데이터와 새 데이터 모두 확인

### 7.3 추가 개선 제안

- **Phase 45 후보**: 문제 목록 표시 형식 통일
  - 좌측/우측 사이드바 동일 컴포넌트 사용
  - `ProblemItemCard` 공통 컴포넌트 추출

---

## 8. 예상 결과

```
Before:
┌─────────────────────┐
│ 미연결 문제      7  │
│ ○ 문제 L3번        │
│ ○ 문제 L2번        │
│ ○ 문제 L1번        │
│ ...                 │
└─────────────────────┘

After:
┌─────────────────────────────┐
│ 미연결 문제              7  │
│ ○ 3  베이직쎈 · 10p        │
│ ○ 4  베이직쎈 · 10p        │
│ ○ 5  베이직쎈 · 10p        │
│ ...                         │
└─────────────────────────────┘
```

---

*작성자: Claude Code*
*Phase: 45 후보 기능*
