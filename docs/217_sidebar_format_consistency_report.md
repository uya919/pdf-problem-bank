# Phase 56-I: 좌측 사이드바 문제 형식 일관성 구현 보고서

**문서 번호**: 217
**작성일**: 2025-12-06
**관련 버그**: Phase 56-H 버그 리포트 (문서 216)

---

## 1. 현재 문제점

### 스크린샷에서 확인된 문제

| 현재 표시 | 원하는 표시 |
|----------|------------|
| `고1 · 22p · 29번` | ✅ OK (기존 데이터) |
| `(모문제)번` | ❌ 목록에서 제외해야 함 |
| `1번` | `베이직쎈 · 10p · 1번` |
| `2번` | `베이직쎈 · 10p · 2번` |
| `3번` | `베이직쎈 · 10p · 3번` |
| `4번` | `베이직쎈 · 10p · 4번` |

### 문제 분류

| 문제 | 원인 | 심각도 |
|------|------|--------|
| **모문제가 목록에 포함** | `workSessionStore`에서 `isParent` 필터링 없음 | 중간 |
| **메타데이터 누락** | `displayName` 생성 시 메타데이터 미반영 | 높음 |
| **형식 불일치** | "고1" vs "베이직쎈" 등 | 낮음 (기존 데이터 문제) |

---

## 2. 원인 분석

### 2.1 모문제가 목록에 포함되는 원인

**현재 로직** (`workSessionStore.ts`):
```typescript
// 모든 문제를 목록에 포함 (isParent 체크 없음)
getUnlinkedProblems: () => {
  const session = get().currentSession;
  return session?.problems.filter(p => !linkedGroupIds.has(p.groupId)) || [];
}
```

**필요한 변경**:
```typescript
getUnlinkedProblems: () => {
  const session = get().currentSession;
  return session?.problems.filter(p =>
    !linkedGroupIds.has(p.groupId) &&
    !p.isParent  // 모문제 제외
  ) || [];
}
```

### 2.2 메타데이터 누락 원인

**데이터 흐름**:
```
1. L키로 하위문제 생성 (PageViewer.tsx)
   └─ problemInfo: { problemNumber, bookName, course, page }

2. 세션에 저장 (workSessionStore.ts - addProblem)
   └─ displayName 생성: `${bookName}_p${page}_${problemNumber}번`
   └─ 하지만 bookName, page가 전달되지 않으면 fallback 사용

3. 사이드바 표시 (ProblemListPanel.tsx)
   └─ parseProblemDisplayName(problem.displayName) 호출
   └─ displayName이 "1번"이면 → bookName: "-", page: "-"
```

**문제 지점**:
- Phase 56-H에서 `problemInfo`에 메타데이터를 추가했지만
- 세션 저장 시 `displayName` 생성에 반영되지 않을 가능성

---

## 3. 해결 방안

### 방안 A: 세션 저장 시 displayName 개선 (권장)

**위치**: `workSessionStore.ts` - `addProblem` 함수

```typescript
addProblem: async (problemData) => {
  // Phase 56-I: problemInfo에서 메타데이터 가져오기
  const bookName = problemData.bookName || defaultSettings?.bookName || '문제';
  const page = problemData.page || problemData.pageIndex;

  // displayName 생성
  problemData.displayName = `${bookName}_p${page}_${problemData.problemNumber}번`;
}
```

### 방안 B: ProblemListPanel에서 직접 포맷팅

**위치**: `ProblemListPanel.tsx`

```typescript
// problem.displayName 대신 problemInfo 직접 사용
const formatLabel = (problem: ProblemReference) => {
  if (problem.bookName && problem.page) {
    return `${problem.bookName} · ${problem.page}p · ${problem.problemNumber}번`;
  }
  return parseProblemDisplayName(problem.displayName);
};
```

### 방안 C: isParent 필터링 추가

**위치**: `workSessionStore.ts`

```typescript
getUnlinkedProblems: () => {
  const session = get().currentSession;
  return session?.problems.filter(p =>
    !linkedGroupIds.has(p.groupId) &&
    !p.isParent  // 모문제 제외
  ) || [];
}
```

---

## 4. 구현 가능성 분석

### 4.1 난이도

| 항목 | 난이도 | 시간 |
|------|--------|------|
| 모문제 필터링 | 낮음 | 10분 |
| displayName 메타데이터 반영 | 중간 | 20분 |
| 전체 테스트 | 낮음 | 10분 |

**총 예상 시간**: 40분

### 4.2 구현 순서

1. **Phase 56-H 버그 수정** (우선) - 문서 216
   - `getLastProblemNumberOnPage`에서 모문제 제외
   - 이것이 해결되면 하위문제 번호가 정상 생성됨

2. **Phase 56-I 구현** (다음)
   - 모문제 목록 필터링
   - displayName 메타데이터 반영

---

## 5. 우려되는 점

### 5.1 위험도: 낮음

| 우려사항 | 심각도 | 해결책 |
|----------|--------|--------|
| **기존 데이터 호환** | 낮음 | displayName 파싱 로직이 다양한 형식 지원 |
| **ProblemReference 타입 확장** | 낮음 | `isParent` 필드 추가 필요 |
| **세션 데이터 마이그레이션** | 없음 | 새로 저장되는 데이터만 영향 |

### 5.2 의존성

```
Phase 56-H 버그 수정 (문서 216)
        ↓
Phase 56-I 사이드바 형식 일관성 (이 문서)
```

Phase 56-H 버그가 먼저 수정되어야 Phase 56-I가 의미 있음.

---

## 6. 상세 구현 계획

### 단계 1: ProblemReference 타입 확장

**파일**: `frontend/src/api/client.ts`

```typescript
export interface ProblemReference {
  groupId: string;
  documentId: string;
  pageIndex: number;
  problemNumber: string;
  displayName?: string;
  // Phase 56-I: 추가
  bookName?: string;
  course?: string;
  page?: number;
  isParent?: boolean;  // 모문제 여부
}
```

### 단계 2: 세션 저장 시 메타데이터 전달

**파일**: `frontend/src/pages/PageViewer.tsx`

L키, G키로 그룹 생성 시 세션에 저장할 때:
```typescript
// 세션에 문제 추가
await addProblem({
  groupId: newGroup.id,
  documentId,
  pageIndex: currentPage,
  problemNumber: nextNumber,
  // Phase 56-I: 메타데이터 추가
  bookName: documentSettings?.defaultBookName || bookName,
  course: documentSettings?.defaultCourse || course,
  page: bookPage,
  isParent: newGroup.isParent,
});
```

### 단계 3: 모문제 필터링

**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
getUnlinkedProblems: () => {
  const session = get().currentSession;
  const links = get().links;
  const linkedGroupIds = new Set(links.map(l => l.problemGroupId));

  return session?.problems.filter(p =>
    !linkedGroupIds.has(p.groupId) &&
    !p.isParent  // Phase 56-I: 모문제 제외
  ) || EMPTY_PROBLEMS;
}
```

### 단계 4: displayName 생성 개선

**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
addProblem: async (problemData) => {
  // Phase 56-I: 메타데이터 기반 displayName 생성
  if (!problemData.displayName && problemData.bookName) {
    problemData.displayName =
      `${problemData.bookName}_p${problemData.page || problemData.pageIndex}_${problemData.problemNumber}번`;
  }
  // ...
}
```

---

## 7. 예상 결과

### Before (현재)
```
미연결 문제        10
○ 고1 · 22p · 29번
○ 고1 · 22p · 30번
○ (모문제)번       ← 제거됨
○ 1번              ← 형식 변경
○ 2번              ← 형식 변경
○ 3번              ← 형식 변경
○ 4번              ← 형식 변경
```

### After (수정 후)
```
미연결 문제        9
○ 고1 · 22p · 29번
○ 고1 · 22p · 30번
○ 베이직쎈 · 10p · 1번
○ 베이직쎈 · 10p · 2번
○ 베이직쎈 · 10p · 3번
○ 베이직쎈 · 10p · 4번
```

---

## 8. 구현 순서 권장

```
1. Phase 56-H 버그 수정 (20분)
   └─ getLastProblemNumberOnPage에서 모문제 제외
   └─ 하위문제 번호 정상화

2. Phase 56-I 사이드바 개선 (40분)
   └─ 56-I-1: ProblemReference 타입 확장
   └─ 56-I-2: 세션 저장 시 메타데이터 전달
   └─ 56-I-3: 모문제 필터링
   └─ 56-I-4: displayName 생성 개선
   └─ 56-I-5: 테스트
```

---

## 9. 결론

| 항목 | 평가 |
|------|------|
| **구현 가능성** | ✅ 높음 |
| **난이도** | 중간 (총 1시간) |
| **위험도** | 낮음 |
| **의존성** | Phase 56-H 버그 수정 필요 |

### 권장 순서

1. **먼저**: "버그 수정해줘" → Phase 56-H 버그 수정
2. **다음**: "Phase 56-I 진행해줘" → 사이드바 형식 일관성

---

*Phase 56-H 버그 수정 후 실행: "Phase 56-I 진행해줘"*
