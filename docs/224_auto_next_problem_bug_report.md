# 에러 리포트: 매칭 후 다음 문제 자동 선택 실패

**문서 번호**: 224
**작성일**: 2025-12-07
**심각도**: 높음 (UX 영향)

---

## 1. 증상

### 현상
- 문제와 해설을 연결한 후 **다음 미연결 문제로 자동 이동하지 않음**
- 대신 **항상 첫 번째** 미연결 문제로 이동함

### 재현 순서
1. 미연결 문제 목록에서 중간 문제 선택 (예: 11p · 10번)
2. 해설 문서에서 블록 선택 후 그룹 생성 (G키)
3. 연결 완료 후 → **11p · 4번**(첫 번째)으로 이동됨
4. 기대: **11p · 11번**(다음)으로 이동되어야 함

---

## 2. 원인 분석

### 2.1 코드 위치
```
frontend/src/stores/workSessionStore.ts:668-685
```

### 2.2 버그가 있는 코드
```typescript
// 다음 미연결 문제로 이동
selectNextUnlinkedProblem: () => {
  const { currentSession, selectedProblemId } = get();
  if (!currentSession) return;

  const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));
  const unlinked = currentSession.problems.filter((p) => !linkedIds.has(p.groupId));

  if (unlinked.length === 0) {
    set({ selectedProblemId: null });
    return;
  }

  // 🐛 버그: 현재 선택된 문제가 이미 연결되어 unlinked에 없음!
  const currentIndex = unlinked.findIndex((p) => p.groupId === selectedProblemId);
  // currentIndex = -1 (못 찾음)

  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % unlinked.length : 0;
  // nextIndex = 0 (항상 첫 번째로 이동)

  set({ selectedProblemId: unlinked[nextIndex].groupId });
},
```

### 2.3 버그 원인

```
호출 순서:
┌──────────────────────────────────────────────────────────────┐
│ 1. createLink() 호출                                         │
│    → currentSession.links에 새 연결 추가                      │
│    → selectedProblemId는 연결된 문제 ID 유지                   │
├──────────────────────────────────────────────────────────────┤
│ 2. selectNextUnlinkedProblem() 호출                           │
│    → linkedIds = {방금 연결된 문제 포함}                       │
│    → unlinked = [방금 연결된 문제 제외]                        │
│    → findIndex(selectedProblemId) = -1 (❌ 못 찾음!)          │
│    → nextIndex = 0 (항상 첫 번째)                             │
└──────────────────────────────────────────────────────────────┘
```

**핵심 문제**: 연결이 완료된 후에 호출되므로, 현재 선택된 문제는 이미 `unlinked` 배열에서 제외됨

---

## 3. 추가 발견된 문제

### 3.1 Phase 56 필터링 누락

`selectNextUnlinkedProblem`에서 모문제(isParent) 필터링이 누락됨:

```typescript
// 현재 코드 (Phase 56 필터링 없음)
const unlinked = currentSession.problems.filter((p) => !linkedIds.has(p.groupId));

// 올바른 코드 (Phase 56-M/N 필터링 포함)
const unlinked = currentSession.problems.filter((p) =>
  !linkedIds.has(p.groupId) &&
  !p.isParent &&
  !p.displayName?.includes('(모문제)') &&
  !p.problemNumber?.includes('모문제')
);
```

### 3.2 영향 범위
- `getUnlinkedProblems()`에는 필터링 있음 ✅
- `useUnlinkedProblems()` 훅에도 필터링 있음 ✅
- `selectNextUnlinkedProblem()`에는 필터링 없음 ❌

---

## 4. 해결 방안

### 방안 A: 연결 전 다음 문제 미리 계산 (권장)

```typescript
// UnifiedWorkPage.tsx handleGroupCreated 수정
// 연결 전에 다음 문제 ID 미리 계산
const nextProblemId = getNextUnlinkedProblemId(selectedProblemId);

await createLink({ ... });

// 미리 계산한 다음 문제로 이동
if (nextProblemId) {
  selectProblem(nextProblemId);
}
```

### 방안 B: 전체 problems 배열 기준으로 다음 찾기

```typescript
selectNextUnlinkedProblem: () => {
  const { currentSession, selectedProblemId } = get();
  if (!currentSession) return;

  const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));

  // Phase 56-M/N: 모문제 필터링 추가
  const isValidProblem = (p: ProblemReference) =>
    !linkedIds.has(p.groupId) &&
    !p.isParent &&
    !p.displayName?.includes('(모문제)') &&
    !p.problemNumber?.includes('모문제');

  // 전체 problems 배열에서 현재 위치 찾기
  const allProblems = currentSession.problems;
  const currentIndex = allProblems.findIndex((p) => p.groupId === selectedProblemId);

  if (currentIndex === -1) {
    // 현재 문제를 못 찾으면 첫 번째 미연결로
    const first = allProblems.find(isValidProblem);
    set({ selectedProblemId: first?.groupId || null });
    return;
  }

  // 현재 위치 이후에서 첫 번째 미연결 문제 찾기
  for (let i = currentIndex + 1; i < allProblems.length; i++) {
    if (isValidProblem(allProblems[i])) {
      set({ selectedProblemId: allProblems[i].groupId });
      return;
    }
  }

  // 못 찾으면 처음부터 검색
  for (let i = 0; i < currentIndex; i++) {
    if (isValidProblem(allProblems[i])) {
      set({ selectedProblemId: allProblems[i].groupId });
      return;
    }
  }

  // 모든 문제가 연결됨
  set({ selectedProblemId: null });
},
```

---

## 5. 수정 계획

### Phase 56-Q: 다음 문제 자동 선택 버그 수정

| 단계 | 내용 | 파일 | 예상 시간 |
|------|------|------|----------|
| Q-1 | selectNextUnlinkedProblem 로직 수정 | workSessionStore.ts | 10분 |
| Q-2 | Phase 56 필터링 추가 | workSessionStore.ts | 5분 |
| Q-3 | 테스트 및 검증 | - | 5분 |

**총 예상 시간**: 20분

---

## 6. 테스트 케이스

### 수정 후 검증 항목

1. **중간 문제 연결 테스트**
   - 11p · 10번 선택 → 연결 → 11p · 11번으로 이동 확인

2. **마지막 문제 연결 테스트**
   - 마지막 미연결 문제 선택 → 연결 → 첫 번째 미연결로 순환

3. **모문제 건너뛰기 테스트**
   - 모문제(isParent=true) 건너뛰고 다음 일반 문제 선택 확인

4. **모든 문제 연결 테스트**
   - 마지막 문제 연결 → selectedProblemId = null 확인

---

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| [workSessionStore.ts](../frontend/src/stores/workSessionStore.ts) | 문제 선택 로직 |
| [UnifiedWorkPage.tsx](../frontend/src/pages/UnifiedWorkPage.tsx) | 매칭 핸들러 |
| [ProblemListPanel.tsx](../frontend/src/components/matching/ProblemListPanel.tsx) | 문제 목록 UI |

---

*수정 요청: "Phase 56-Q 진행해줘"*
