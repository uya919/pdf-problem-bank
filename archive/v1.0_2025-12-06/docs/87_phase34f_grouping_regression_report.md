# Phase 34-F 그룹핑 리그레션 에러 리포트

**작성일**: 2025-12-03
**심각도**: 🔴 치명적 (핵심 기능 마비)
**원인**: Phase 34-F 수정 시 의존성 배열 오류

---

## 1. 문제 요약

### 증상
```
캔버스에서 블록 선택 → 그룹 생성 → 그룹이 즉시 사라짐
```

### 영향 범위
- **모든 그룹 생성 작업 불가능**
- 라벨링 핵심 기능 완전 마비

---

## 2. 근본 원인 분석

### 2.1 버그 위치

**파일**: `frontend/src/pages/PageViewer.tsx`
**라인**: 310-339

```typescript
// Phase 34-F: 페이지 전환 시 이전 페이지 그룹 자동 저장
useEffect(() => {
  const prevPage = prevPageRef.current;
  const prevGroups = localGroupsRef.current;

  // 페이지가 실제로 변경되었고, 이전 그룹이 있으면 저장
  if (prevPage !== currentPage && prevGroups.length > 0 && documentId) {
    // ... 저장 로직
  }

  prevPageRef.current = currentPage;

  // ❌ 문제: 이 부분이 매 렌더링마다 실행됨!
  setSelectedBlocks([]);
  setLocalGroups([]);  // ← 그룹 초기화!
  isInitialLoadRef.current = true;
}, [currentPage, documentId, saveGroupsMutation]);  // ← 🔴 문제의 의존성!
```

### 2.2 버그 메커니즘

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. 사용자: 블록 선택 → 그룹 생성 버튼 클릭                         │
│                ↓                                                     │
│  2. handleCreateGroup() 실행                                         │
│                ↓                                                     │
│  3. setLocalGroups(updatedGroups)  ← 새 그룹 추가                   │
│                ↓                                                     │
│  4. 컴포넌트 리렌더링                                                │
│                ↓                                                     │
│  5. useSavePageGroups() 호출 → 새로운 mutation 객체 반환            │
│                ↓                                                     │
│  6. saveGroupsMutation 참조 변경 (의존성 변경!)                     │
│                ↓                                                     │
│  7. useEffect 재실행! (의존성 배열에 saveGroupsMutation 있음)       │
│                ↓                                                     │
│  8. setLocalGroups([])  ← 방금 만든 그룹 삭제! ❌                   │
│                ↓                                                     │
│  9. 그룹이 사라짐                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 React Query Mutation의 특성

```typescript
// useSavePageGroups()는 useMutation을 반환
export function useSavePageGroups() {
  return useMutation({
    mutationFn: ({ ... }) => api.savePageGroups(...),
    onSuccess: () => { ... },
  });
}

// useMutation은 매 렌더링마다 새로운 객체 반환
// → Object.is(prevMutation, newMutation) === false
// → useEffect 의존성 검사 시 "변경됨"으로 판단
```

### 2.4 왜 Phase 34-F 이전에는 문제가 없었나?

**Phase 34-F 이전 코드**:
```typescript
useEffect(() => {
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage]);  // ← saveGroupsMutation 없음!
```

**Phase 34-F 수정 후**:
```typescript
useEffect(() => {
  // ... 페이지 전환 저장 로직 추가
  saveGroupsMutation.mutate({ ... });  // ← mutation 사용

  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage, documentId, saveGroupsMutation]);  // ← saveGroupsMutation 추가!
```

---

## 3. 해결 방안

### 방안 1: 의존성에서 saveGroupsMutation 제거 (권장) ⭐

```typescript
useEffect(() => {
  const prevPage = prevPageRef.current;
  const prevGroups = localGroupsRef.current;

  if (prevPage !== currentPage && prevGroups.length > 0 && documentId) {
    console.log(`[Phase 34-F] Auto-saving page ${prevPage}`);

    // saveGroupsMutation.mutate는 안정적인 함수 참조
    saveGroupsMutation.mutate({
      documentId,
      pageIndex: prevPage,
      groups: prevGroups.map(g => ({
        id: g.id,
        block_ids: g.block_ids,
        problemInfo: g.problemInfo,
        link: g.link,
      })),
    });
  }

  prevPageRef.current = currentPage;
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPage, documentId]);  // ← saveGroupsMutation 제거!
```

**장점**:
- 가장 간단한 수정
- `saveGroupsMutation.mutate`는 React Query에서 안정적인 참조로 제공됨

### 방안 2: useRef로 mutation 참조 안정화

```typescript
const saveGroupsMutationRef = useRef(saveGroupsMutation);
useEffect(() => {
  saveGroupsMutationRef.current = saveGroupsMutation;
}, [saveGroupsMutation]);

useEffect(() => {
  // saveGroupsMutationRef.current.mutate() 사용
  // ...
}, [currentPage, documentId]);  // saveGroupsMutation 불필요
```

### 방안 3: 페이지 변경 감지를 별도 로직으로 분리

```typescript
// 페이지 변경 시 저장 (별도 useEffect)
const prevPageRef = useRef(currentPage);
useEffect(() => {
  if (prevPageRef.current !== currentPage) {
    const prevGroups = localGroupsRef.current;
    if (prevGroups.length > 0) {
      saveGroupsMutation.mutate({ ... });
    }
    prevPageRef.current = currentPage;
  }
}, [currentPage]);

// 페이지 변경 시 초기화 (별도 useEffect)
useEffect(() => {
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage]);
```

---

## 4. 체크리스트

```
[ ] Step 1: useEffect 의존성에서 saveGroupsMutation 제거
[ ] Step 2: ESLint 경고 무시 주석 추가
[ ] Step 3: TypeScript 컴파일 확인
[ ] Step 4: 그룹 생성 테스트
    [ ] 4.1 블록 선택 → G 키 → 그룹 생성 확인
    [ ] 4.2 블록 선택 → Enter 키 → 그룹 생성 확인
    [ ] 4.3 그룹 생성 버튼 클릭 → 그룹 생성 확인
[ ] Step 5: 페이지 전환 저장 테스트
    [ ] 5.1 그룹 생성 → 다음 페이지 → 이전 페이지 복귀 → 그룹 유지 확인
```

---

## 5. 수정 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/pages/PageViewer.tsx` | useEffect 의존성에서 saveGroupsMutation 제거 |

---

## 6. 교훈

### 6.1 React Query Mutation과 useEffect 의존성

```
⚠️ useMutation()의 반환값을 useEffect 의존성에 직접 넣지 말 것!
   - mutation 객체는 매 렌더링마다 새로 생성됨
   - useEffect가 매 렌더링마다 실행되는 원인이 됨

✅ mutation.mutate 함수만 사용하면 안정적
   - React Query는 mutate 함수의 참조 안정성을 보장
```

### 6.2 의존성 배열 변경 시 주의사항

```
⚠️ 기존 useEffect에 새 의존성을 추가할 때:
   1. 해당 의존성이 얼마나 자주 변경되는지 확인
   2. 변경 시 useEffect 본문 전체가 재실행됨을 인지
   3. 의도치 않은 상태 초기화가 없는지 검증
```

---

## 7. 타임라인

| 시간 | 이벤트 |
|------|--------|
| Phase 34-F 수정 | 페이지 전환 저장 로직 추가, saveGroupsMutation을 의존성에 추가 |
| 버그 발생 | 그룹 생성 즉시 사라지는 현상 |
| 분석 완료 | useEffect 의존성 문제로 확인 |

---

*승인 시 "진행해줘"로 수정 실행*
