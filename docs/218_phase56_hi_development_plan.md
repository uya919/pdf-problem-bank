# Phase 56-H/I 통합 개발 계획

**문서 번호**: 218
**작성일**: 2025-12-06
**참조 문서**:
- [216_phase56h_bug_report.md](216_phase56h_bug_report.md)
- [217_sidebar_format_consistency_report.md](217_sidebar_format_consistency_report.md)

---

## 목표

```
Before:
  - L키 → "(모문제)번" 생성 ❌
  - 사이드바: "(모문제)번", "1번", "2번" ❌

After:
  - L키 → "5번", "6번" 연속 생성 ✅
  - 사이드바: "베이직쎈 · 10p · 5번" 형식 ✅
  - 모문제는 사이드바에서 제외 ✅
```

---

## Part 1: Phase 56-H 버그 수정 (20분)

### 56-H-fix-1: getLastProblemNumberOnPage 수정 (10분)

**파일**: `frontend/src/utils/problemNumberUtils.ts`

**변경 전**:
```typescript
export function getLastProblemNumberOnPage(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>
): string | null {
  const groupsWithProblemNumber = groups
    .filter(g => g.problemInfo?.problemNumber)
    .map(g => g.problemInfo!.problemNumber!);
  // ...
}
```

**변경 후**:
```typescript
export function getLastProblemNumberOnPage(
  groups: Array<{
    column: string;
    problemInfo?: { problemNumber?: string };
    isParent?: boolean;
  }>
): string | null {
  const groupsWithProblemNumber = groups
    .filter(g => {
      const num = g.problemInfo?.problemNumber;
      // Phase 56-H: 모문제 제외 + 숫자로 시작하는 번호만
      if (g.isParent) return false;
      return num && /^\d/.test(num);
    })
    .map(g => g.problemInfo!.problemNumber!);
  // ...
}
```

**테스트**:
- [ ] M→L→L 시 번호가 연속 생성되는지 확인

---

### 56-H-fix-2: getNextProblemNumberWithContext 타입 확장 (5분)

**파일**: `frontend/src/utils/problemNumberUtils.ts`

**변경**:
```typescript
export function getNextProblemNumberWithContext(
  currentPageGroups: Array<{
    column: string;
    problemInfo?: { problemNumber?: string };
    isParent?: boolean;  // 추가
  }>,
  previousPageLastNumber: string | null
): string {
  // ...
}
```

---

### 56-H-fix-3: 테스트 (5분)

```
1. 블록 선택 → M키 (모문제 생성)
2. 블록 선택 → L키 → 번호 확인 (1 또는 이전+1)
3. 블록 선택 → L키 → 번호 확인 (+1 연속)
4. 블록 선택 → L키 → 번호 확인 (+1 연속)
```

---

## Part 2: Phase 56-I 사이드바 형식 일관성 (40분)

### 56-I-1: ProblemReference 타입 확장 (5분)

**파일**: `frontend/src/api/client.ts`

**변경**:
```typescript
export interface ProblemReference {
  groupId: string;
  documentId: string;
  pageIndex: number;
  problemNumber: string;
  displayName?: string;
  // Phase 56-I: 메타데이터 추가
  bookName?: string;
  course?: string;
  page?: number;
  isParent?: boolean;
}
```

---

### 56-I-2: 세션 저장 시 메타데이터 전달 (15분)

**파일**: `frontend/src/pages/PageViewer.tsx`

**수정 위치 1**: L키 핸들러 (하위문제 생성 후 세션 저장)

현재 L키 코드에서 세션 저장 부분을 확인하고, 메타데이터 전달 추가.

**수정 위치 2**: G키 핸들러 (일반 문제 생성 후 세션 저장)

동일하게 메타데이터 전달 추가.

**수정 위치 3**: `handleConfirmGroup` 함수

그룹 확정 시 세션에 저장하는 로직 확인 및 수정.

---

### 56-I-3: 모문제 필터링 (10분)

**파일**: `frontend/src/stores/workSessionStore.ts`

**수정 위치**: `getUnlinkedProblems` 선택자

**변경 전**:
```typescript
export const useUnlinkedProblems = () =>
  useWorkSessionStore((state) => {
    const session = state.currentSession;
    if (!session) return EMPTY_PROBLEMS;
    const linkedIds = new Set(state.links.map(l => l.problemGroupId));
    return session.problems.filter(p => !linkedIds.has(p.groupId));
  });
```

**변경 후**:
```typescript
export const useUnlinkedProblems = () =>
  useWorkSessionStore((state) => {
    const session = state.currentSession;
    if (!session) return EMPTY_PROBLEMS;
    const linkedIds = new Set(state.links.map(l => l.problemGroupId));
    return session.problems.filter(p =>
      !linkedIds.has(p.groupId) &&
      !p.isParent  // Phase 56-I: 모문제 제외
    );
  });
```

---

### 56-I-4: displayName 생성 개선 (5분)

**파일**: `frontend/src/stores/workSessionStore.ts`

**수정 위치**: `addProblem` 함수

**변경**:
```typescript
addProblem: async (problemData) => {
  // Phase 56-I: 메타데이터 기반 displayName 자동 생성
  if (!problemData.displayName) {
    if (problemData.bookName && problemData.page) {
      problemData.displayName =
        `${problemData.bookName}_p${problemData.page}_${problemData.problemNumber}번`;
    } else {
      // Fallback
      problemData.displayName = `${problemData.problemNumber}번`;
    }
  }
  // 기존 로직...
}
```

---

### 56-I-5: 테스트 (5분)

```
1. 새 문제 생성 후 사이드바 확인
   - 모문제가 목록에 없는지 확인
   - "베이직쎈 · 10p · 1번" 형식인지 확인

2. 시나리오 A 테스트
   M → L(1) → L(2) → L(3) → M → L(4) → L(5)
   사이드바: 1, 2, 3, 4, 5번 (모문제 없음)

3. 시나리오 B 테스트
   M → L(1) → L(2) → G(3) → M → L(4)
   사이드바: 1, 2, 3, 4번 (모문제 없음)
```

---

## 전체 체크리스트

### Part 1: Phase 56-H 버그 수정
- [ ] 56-H-fix-1: `getLastProblemNumberOnPage` 수정
- [ ] 56-H-fix-2: `getNextProblemNumberWithContext` 타입 확장
- [ ] 56-H-fix-3: 번호 연속 생성 테스트

### Part 2: Phase 56-I 사이드바 개선
- [ ] 56-I-1: `ProblemReference` 타입 확장
- [ ] 56-I-2: 세션 저장 시 메타데이터 전달
- [ ] 56-I-3: 모문제 필터링
- [ ] 56-I-4: `displayName` 생성 개선
- [ ] 56-I-5: 사이드바 형식 테스트

---

## 파일별 변경 요약

| 파일 | 변경 내용 |
|------|----------|
| `problemNumberUtils.ts` | 모문제 제외 필터링 |
| `client.ts` | `ProblemReference` 타입 확장 |
| `PageViewer.tsx` | 세션 저장 시 메타데이터 전달 |
| `workSessionStore.ts` | 모문제 필터링 + displayName 개선 |

---

## 실행 순서

```
Part 1: Phase 56-H 버그 수정 (20분)
    56-H-fix-1 → 56-H-fix-2 → 56-H-fix-3
            ↓
Part 2: Phase 56-I 사이드바 개선 (40분)
    56-I-1 → 56-I-2 → 56-I-3 → 56-I-4 → 56-I-5
```

**총 예상 시간**: 1시간

---

## 예상 최종 결과

### 라벨링 페이지

```
M키 → 모문제 생성 (노란색 그룹)
L키 → 하위문제 1번 (파란색 그룹, 메타데이터 포함)
L키 → 하위문제 2번 (연속 번호)
L키 → 하위문제 3번 (연속 번호)
G키 → 모문제 완료 ("1~3의 모문제") + 일반 4번
M키 → 새 모문제 시작
L키 → 하위문제 5번 (연속!)
```

### 사이드바

```
미연결 문제                    6
○ 베이직쎈 · 10p · 1번
○ 베이직쎈 · 10p · 2번
○ 베이직쎈 · 10p · 3번
○ 베이직쎈 · 10p · 4번
○ 베이직쎈 · 10p · 5번
○ 베이직쎈 · 10p · 6번

(모문제는 목록에 없음 ✅)
```

---

*승인 후 실행: "진행해줘"*
