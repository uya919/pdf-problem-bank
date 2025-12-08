# 해설 연결 워크플로우 개선 연구 리포트

> 2025-12-04 | Phase 40+ 기능 연구
> 요청: 해설 연결 시 자동 맵핑 및 다음 문제 자동 선택

---

## 1. 요청 사항 분석

### 1.1 현재 문제점 (스크린샷 기반)

```
┌──────────────────────────────────────────┐
│  문항 정보 편집                           │
│                                          │
│  책이름: 베이직쎈                         │
│  과정:   공통수학1                        │
│  페이지: 2                               │
│  문항번호: 베이직쎈_공통수학1_p  ← ❌ 잘못된 값 │
└──────────────────────────────────────────┘
```

**문제점**: 문항번호 필드에 displayName 형식이 들어감

### 1.2 요청된 개선사항

| # | 요청 | 설명 |
|---|------|------|
| 1 | **페이지 자동 맵핑** | 해설 그룹 생성 시 선택된 문제의 페이지와 동일하게 |
| 2 | **문항번호 자동 맵핑** | 선택된 문제의 번호와 동일하게 (예: "3") |
| 3 | **"_해설" UI 미표시** | 백엔드 저장 시에만 접미사 추가 |
| 4 | **다음 문제 자동 선택** | 3번 완료 → 4번 자동 선택 |
| 5 | **미연결 문제 연동** | 문항번호가 미연결 목록과 동기화 |

---

## 2. 현재 구현 분석

### 2.1 관련 코드 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  1. 사용자가 미연결 문제 목록에서 "3번" 선택                      │
│     → selectProblem("group-3")                                  │
│     → selectedProblemId = "group-3"                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. 해설 탭에서 블록 선택 후 그룹 생성 (G키)                      │
│     → handleGroupCreated() in UnifiedWorkPage.tsx               │
│     → suggestedGroupName = "베이직쎈_공통수학1_p2_3번_해설"       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. GroupPanel에서 자동 편집 모드 진입                           │
│     → startEditing(group)                                       │
│     → editForm 초기화 (❌ 현재: 독립적인 기본값 사용)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. 사용자가 Enter로 확정                                        │
│     → saveEdit() → createLink()                                 │
│     → selectProblem(null) ← 선택 해제만, 다음 선택 안 함 ❌       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 현재 코드의 문제점

#### GroupPanel.tsx - startEditing()
```typescript
// 현재 구현 (라인 110-131)
const startEditing = (group: ProblemGroup) => {
  setEditingGroupId(group.id);

  // ❌ 문항번호: 해설 탭에서도 자체 증가 로직 사용
  const suggestedProblemNumber = group.problemInfo?.problemNumber
    || getNextProblemNumberWithContext(groups, previousPageLastNumber || null);

  setEditForm({
    bookName: group.problemInfo?.bookName || defaultBookName,  // ✅ 기본값 사용
    course: group.problemInfo?.course || defaultCourse,         // ✅ 기본값 사용
    page: group.problemInfo?.page || bookPage || 1,            // ❌ bookPage 사용 (해설 페이지)
    problemNumber: suggestedProblemNumber,                     // ❌ 자체 증가
  });
};
```

#### UnifiedWorkPage.tsx - handleGroupCreated()
```typescript
// 현재 구현 (라인 98-127)
} else {
  // 해설 탭: 선택된 문제와 연결
  if (selectedProblemId) {
    const solutionName = `${problemName}_해설`;  // ❌ 여기서 _해설 추가

    await createLink({...});
    selectProblem(null);  // ❌ 선택 해제만, 다음 선택 안 함
    showToast(`${solutionName} 연결 완료!`);
  }
}
```

---

## 3. 구현 가능성 분석

### 3.1 요청 #1: 페이지 자동 맵핑

**구현 난이도**: ⭐ 쉬움

**방법**: 선택된 문제의 `pageIndex`를 해설 그룹 생성 시 전달

```typescript
// UnifiedWorkPage.tsx
const handleGroupCreated = useCallback(async (group, pageIndex) => {
  if (activeTab === 'solution' && selectedProblemId) {
    const selectedProblem = currentSession?.problems.find(
      p => p.groupId === selectedProblemId
    );

    // ✅ 문제의 페이지 정보를 해설에 전달
    const problemPage = selectedProblem?.page || selectedProblem?.pageIndex;
    // ... group.problemInfo.page = problemPage
  }
}, [...]);
```

**우려사항**: 없음 - 단순 값 복사

---

### 3.2 요청 #2: 문항번호 자동 맵핑

**구현 난이도**: ⭐⭐ 보통

**방법**: GroupPanel에 선택된 문제 정보 props로 전달

```typescript
// PageViewer.tsx → GroupPanel props 추가
<GroupPanel
  // ... 기존 props
  selectedProblemInfo={selectedProblem?.problemInfo}  // 새로 추가
/>

// GroupPanel.tsx - startEditing 수정
const startEditing = (group: ProblemGroup) => {
  // 해설 탭이고 selectedProblemInfo가 있으면 그 값 사용
  const suggestedNumber = selectedProblemInfo?.problemNumber
    || getNextProblemNumberWithContext(...);

  setEditForm({
    bookName: selectedProblemInfo?.bookName || defaultBookName,
    course: selectedProblemInfo?.course || defaultCourse,
    page: selectedProblemInfo?.page || bookPage || 1,
    problemNumber: suggestedNumber,  // "3" (문제 번호)
  });
};
```

**우려사항**:
- GroupPanel이 "어떤 탭에서 사용되는지" 알아야 함
- props 추가로 인터페이스 복잡도 증가

---

### 3.3 요청 #3: "_해설" UI 미표시

**구현 난이도**: ⭐ 쉬움

**현재 상태**: `_해설` 접미사는 이미 백엔드 저장 시에만 사용되도록 설계됨

```typescript
// UnifiedWorkPage.tsx (라인 106)
const solutionName = `${problemName}_해설`;  // Toast 메시지용

// 실제 저장은 group.problemInfo (사용자 입력 값) 사용
```

**수정 필요 부분**:
```typescript
// Toast 메시지만 수정
showToast(`${problemNumber}번 해설 연결 완료!`, 'success');
// 기존: "베이직쎈_공통수학1_p2_3번_해설 연결 완료!"
// 변경: "3번 해설 연결 완료!"
```

**우려사항**: 없음 - 표시 문구만 변경

---

### 3.4 요청 #4: 다음 문제 자동 선택

**구현 난이도**: ⭐⭐ 보통

**현재 상태**: `selectNextUnlinkedProblem()` 함수가 이미 존재

```typescript
// workSessionStore.ts (라인 508-525)
selectNextUnlinkedProblem: () => {
  const { currentSession, selectedProblemId } = get();
  // ... 다음 미연결 문제 찾아서 선택
};
```

**수정 필요**:
```typescript
// UnifiedWorkPage.tsx - handleGroupCreated
if (activeTab === 'solution' && selectedProblemId) {
  await createLink({...});

  // 기존: selectProblem(null);
  // 변경: 다음 미연결 문제로 이동
  selectNextUnlinkedProblem();  // ✅ 자동 진행

  showToast('연결 완료! 다음 문제로 이동합니다', 'success');
}
```

**우려사항**:
1. **UX 혼란**: 자동 이동이 사용자 의도와 다를 수 있음
   - 해결: 설정 옵션으로 on/off 가능하게
2. **마지막 문제 처리**: 모든 문제 연결 완료 시 동작
   - 해결: 완료 메시지 표시, 탭 전환 제안

---

### 3.5 요청 #5: 미연결 문제 연동

**구현 난이도**: ⭐⭐⭐ 어려움

**현재 상태**:
- 문제 목록 패널(ProblemListPanel)은 matchingStore 또는 workSessionStore 사용
- GroupPanel은 독립적인 상태 관리

**문제점**:
```
┌────────────────┐         ┌────────────────┐
│ ProblemListPanel│         │   GroupPanel   │
│                │         │                │
│ - problems[]   │ ←─ ❌ ─→ │ - editForm     │
│ - selectedId   │  분리됨  │ - localGroups  │
└────────────────┘         └────────────────┘
```

**해결 방안 A**: Context Provider로 통합
```typescript
// SolutionLinkingContext.tsx (새로 생성)
interface SolutionLinkingContextType {
  selectedProblem: ProblemInfo | null;
  onProblemSelect: (id: string) => void;
  suggestedSolutionInfo: ProblemInfo | null;  // 자동 맵핑 값
}

// GroupPanel이 이 Context를 구독하여 값 사용
```

**해결 방안 B**: Props drilling
```typescript
// UnifiedWorkPage → PageViewer → GroupPanel
// 선택된 문제 정보를 props로 전달
```

**우려사항**:
1. **상태 관리 복잡도**: 두 컴포넌트 간 동기화 필요
2. **성능**: 불필요한 리렌더링 가능성
3. **의존성**: GroupPanel이 매칭 워크플로우에 의존하게 됨

---

## 4. 종합 구현 계획

### 4.1 우선순위 및 난이도

| 요청 | 우선순위 | 난이도 | 예상 시간 |
|------|---------|-------|----------|
| #3 "_해설" 미표시 | P1 | ⭐ | 15분 |
| #4 다음 문제 자동 선택 | P1 | ⭐⭐ | 30분 |
| #1 페이지 자동 맵핑 | P2 | ⭐⭐ | 45분 |
| #2 문항번호 자동 맵핑 | P2 | ⭐⭐ | 45분 |
| #5 미연결 연동 | P3 | ⭐⭐⭐ | 2시간 |

### 4.2 권장 구현 순서

```
Phase 41-A: 빠른 UX 개선 (P1)
├── "_해설" Toast 메시지 수정
└── 연결 후 다음 문제 자동 선택

Phase 41-B: 자동 맵핑 (P2)
├── 해설 그룹 생성 시 문제 정보 전달
├── GroupPanel에 selectedProblemInfo props 추가
└── startEditing에서 조건부 기본값 사용

Phase 41-C: 통합 연동 (P3)
├── SolutionLinkingContext 생성
└── 상태 통합 및 동기화
```

---

## 5. 주요 우려사항 및 해결책

### 5.1 GroupPanel 범용성 유지

**우려**: GroupPanel이 매칭 워크플로우에 특화되면 다른 곳에서 사용 어려움

**해결**:
```typescript
interface GroupPanelProps {
  // 기존 props...

  // 매칭 모드 전용 (optional)
  matchingContext?: {
    selectedProblemInfo?: ProblemInfo;
    isMatchingMode: boolean;
  };
}
```

### 5.2 자동 선택의 예외 케이스

**우려**: 사용자가 특정 순서로 작업하고 싶을 때 방해

**해결**:
1. 설정에서 "자동 다음 문제" on/off
2. Shift+Enter로 "현재 문제 유지하며 확정"
3. Toast에 "실행 취소" 버튼

### 5.3 상태 불일치 가능성

**우려**: 문제 목록과 GroupPanel 상태가 달라질 수 있음

**해결**:
1. 단방향 데이터 흐름 유지 (문제 목록 → GroupPanel)
2. GroupPanel은 read-only로 제안값만 받고, 저장은 상위에서 처리
3. 연결 완료 시 fullSync 호출로 상태 일관성 보장

---

## 6. 결론

### 6.1 구현 가능성

| 요청 | 가능성 | 비고 |
|------|--------|------|
| 페이지 자동 맵핑 | ✅ 가능 | props 전달로 해결 |
| 문항번호 자동 맵핑 | ✅ 가능 | props 전달 + 조건부 로직 |
| "_해설" 미표시 | ✅ 즉시 가능 | Toast 메시지만 수정 |
| 다음 문제 자동 선택 | ✅ 가능 | 기존 함수 활용 |
| 미연결 연동 | ⚠️ 부분 가능 | 아키텍처 고려 필요 |

### 6.2 권장사항

1. **Phase 41-A 먼저 진행**: Toast 수정 + 자동 선택 (빠른 효과)
2. **Phase 41-B 신중히 진행**: props 추가 시 인터페이스 문서화
3. **Phase 41-C는 선택적**: 현재 워크플로우로 충분하면 생략 가능

### 6.3 최종 목표 UX

```
┌──────────────────────────────────────────────────────────────┐
│  [미연결 문제]           │                                   │
│                          │                                   │
│  ○ 1번 - 베이직쎈 p2    │     [해설 캔버스]                  │
│  ○ 2번 - 베이직쎈 p2    │                                   │
│  ● 3번 - 베이직쎈 p2 ←  │     블록 선택 후 G키              │
│  ○ 4번 - 베이직쎈 p3    │                                   │
│  ○ 5번 - 베이직쎈 p3    │     ┌─────────────────┐           │
│                          │     │ 문항 정보 편집   │           │
│  진행률: 40%             │     │ 책이름: 베이직쎈 │ ← 자동    │
│  ████████░░░░░░░░        │     │ 페이지: 2       │ ← 자동    │
│                          │     │ 문항번호: 3     │ ← 자동    │
│                          │     └─────────────────┘           │
└──────────────────────────────────────────────────────────────┘

Enter 누르면:
→ "3번 해설 연결 완료!" Toast
→ 자동으로 4번 선택됨
→ 캔버스는 그대로 (또는 4번 해설 페이지로 이동?)
```

---

*작성: Claude Code | 2025-12-04*
