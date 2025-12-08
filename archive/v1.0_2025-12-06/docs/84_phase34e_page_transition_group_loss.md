# Phase 34-E: 페이지 전환 시 그룹 데이터 손실 분석 리포트

**작성일**: 2025-12-03
**보고 유형**: 치명적 버그 분석
**심각도**: 🔴 매우 높음 (데이터 손실)

---

## 1. 문제 요약

### 사용자 보고
```
10쪽에서 그룹핑하고 11쪽 갔다가 다시 10쪽으로 왔는데 풀려있어
```

### 버그 재현 단계
1. 10쪽에서 블록 선택 → 그룹 생성
2. 페이지 버튼으로 11쪽 이동
3. 다시 10쪽으로 돌아가기
4. **그룹이 사라짐** ❌

---

## 2. 근본 원인 분석

### 2.1 문제의 본질

```
┌─────────────────────────────────────────────────────────────┐
│  10쪽 그룹 편집 중 (localGroups = [...])                    │
│                                                              │
│  사용자: 11쪽 버튼 클릭                                      │
│      ↓                                                       │
│  setCurrentPage(11)  ← 저장 없이 페이지만 변경!             │
│      ↓                                                       │
│  useEffect 실행 (라인 301-306)                              │
│      ↓                                                       │
│  setLocalGroups([])  ← 10쪽 그룹 즉시 제거!                 │
│      ↓                                                       │
│  isInitialLoadRef.current = true                             │
│      ↓                                                       │
│  자동 저장 useEffect 체크 (라인 316)                        │
│      ↓                                                       │
│  if (isInitialLoadRef.current) return  ← 저장 건너뜀!       │
│      ↓                                                       │
│  10쪽 그룹 데이터 영구 손실 ❌                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 코드 분석

**PageViewer.tsx 라인 299-306 (페이지 변경 useEffect):**
```typescript
useEffect(() => {
  setSelectedBlocks([]);
  setLocalGroups([]);  // ← 저장 여부 확인 없이 즉시 초기화!
  isInitialLoadRef.current = true;
  console.log(`[PageChange] Page changed to ${currentPage}, resetting groups`);
}, [currentPage]);
```

**UnifiedWorkPage.tsx 라인 93-98 (페이지 이동 핸들러):**
```typescript
const handleNextPage = useCallback(() => {
  const totalPages = currentDoc?.total_pages || 0;
  if (currentPage < totalPages - 1) {
    setCurrentPage(currentPage + 1);  // ← 저장 없이 페이지만 변경!
  }
}, [currentPage, currentDoc, setCurrentPage]);
```

### 2.3 키보드 vs UI 버튼의 차이

| 방식 | 저장 여부 | 결과 |
|------|----------|------|
| **화살표 키 (←→)** | ✅ `saveImmediately()` 호출 | 그룹 유지 |
| **UI 페이지 버튼** | ❌ 저장 없음 | 그룹 손실 |

**화살표 키 (PageViewer.tsx 라인 362-378):**
```typescript
// 화살표 키 → 이전 페이지 이동
if (e.key === 'ArrowLeft' && currentPage > 0) {
  saveImmediately();  // ← 저장 후 이동
  setCurrentPage(currentPage - 1);
}

// 화살표 키 → 다음 페이지 이동
if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
  saveImmediately();  // ← 저장 후 이동
  setCurrentPage(currentPage + 1);
}
```

---

## 3. 타이밍 다이어그램

```
시간 →
────────────────────────────────────────────────────────────────

[10쪽] 그룹 생성   localGroups = [{id: 'g1', ...}]
         ↓
      디바운스 시작 (2초 대기)
         ↓
         │  ← 사용자가 2초 내에 페이지 이동!
         ↓
[버튼 클릭] setCurrentPage(11)
         ↓
      React 리렌더링
         ↓
[useEffect 1] setLocalGroups([])  ← 그룹 제거!
         ↓
[useEffect 1] isInitialLoadRef = true
         ↓
[useEffect 2] 자동 저장 체크
         ↓
      if (isInitialLoadRef.current) return  ← 저장 안함!
         ↓
[11쪽] 새 페이지 로드
         ↓
      10쪽 그룹 = 영구 손실 ❌
```

---

## 4. 해결 방안

### 방안 1: 페이지 이동 전 명시적 저장 (권장) ⭐

**수정 파일**: `UnifiedWorkPage.tsx`

**변경 내용**: 페이지 이동 버튼에 저장 로직 추가

```typescript
// 현재 코드
const handleNextPage = useCallback(() => {
  if (currentPage < totalPages - 1) {
    setCurrentPage(currentPage + 1);
  }
}, [...]);

// 수정 코드
const handleNextPage = useCallback(async () => {
  if (currentPage < totalPages - 1) {
    // PageViewer의 저장 함수 호출 필요
    await saveCurrentPage?.();  // 새로 추가
    setCurrentPage(currentPage + 1);
  }
}, [...]);
```

**장점**: 화살표 키와 동일한 동작으로 통일

### 방안 2: 페이지 변경 useEffect에서 저장 (권장) ⭐⭐

**수정 파일**: `PageViewer.tsx`

**변경 내용**: 페이지 변경 전 이전 페이지 저장

```typescript
const prevPageRef = useRef(currentPage);

useEffect(() => {
  // 페이지가 실제로 변경되었고, 이전 그룹이 있으면 저장
  if (prevPageRef.current !== currentPage && localGroups.length > 0) {
    console.log(`[PageChange] Saving page ${prevPageRef.current} before switching`);
    // 이전 페이지의 그룹을 이전 페이지 번호로 저장
    saveGroupsMutation.mutate({
      documentId,
      pageIndex: prevPageRef.current,
      groups: localGroups,
    });
  }

  prevPageRef.current = currentPage;

  // 그 후 초기화
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage, localGroups]);
```

**장점**:
- 어떤 방식의 페이지 이동도 안전
- 자동 처리로 누락 없음

### 방안 3: 하이브리드 (가장 안전) ⭐⭐⭐

**수정 파일**:
- `PageViewer.tsx`: `saveBeforePageChange()` 함수 추가 및 expose
- `UnifiedWorkPage.tsx`: 페이지 이동 시 호출

```typescript
// PageViewer.tsx
const saveBeforePageChange = useCallback(async () => {
  if (localGroups.length > 0 && !isInitialLoadRef.current) {
    await saveGroupsMutation.mutateAsync({
      documentId,
      pageIndex: currentPage,
      groups: localGroups,
    });
  }
}, [localGroups, documentId, currentPage]);

// 부모에게 전달
useImperativeHandle(ref, () => ({
  saveBeforePageChange,
}));
```

---

## 5. 구현 권장사항

### 즉시 수정 (방안 2)

**PageViewer.tsx 라인 299-306 수정:**

```typescript
// 이전 페이지 번호 추적
const prevPageRef = useRef(currentPage);

useEffect(() => {
  const prevPage = prevPageRef.current;

  // 페이지가 변경되었고, 이전 그룹이 있으면 저장
  if (prevPage !== currentPage && localGroups.length > 0) {
    console.log(`[Phase 34-E] Auto-saving page ${prevPage} before switching to ${currentPage}`);

    // 비동기로 저장 (await 없이 - 페이지 전환을 막지 않음)
    saveGroupsMutation.mutate({
      documentId,
      pageIndex: prevPage,
      groups: localGroups,
    });
  }

  // 페이지 번호 업데이트
  prevPageRef.current = currentPage;

  // 새 페이지 초기화
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage]);  // localGroups는 의도적으로 의존성에서 제외
```

**주의**: `localGroups`를 의존성 배열에 넣으면 무한 루프 위험!
- 대신 `useRef`로 최신 값 캡처

---

## 6. 체크리스트

```
[ ] Step 1: PageViewer.tsx에 prevPageRef 추가
[ ] Step 2: 페이지 변경 useEffect에서 저장 로직 추가
[ ] Step 3: localGroups를 ref로 캡처하여 의존성 이슈 해결
[ ] Step 4: TypeScript 컴파일 확인
[ ] Step 5: 테스트 시나리오 검증
    [ ] 10쪽 그룹 생성 → 11쪽 이동 → 10쪽 복귀 → 그룹 유지 확인
    [ ] 빠른 연속 페이지 이동 (10→11→12→13→10) → 그룹 유지 확인
    [ ] 화살표 키로 페이지 이동 → 기존 동작 유지 확인
```

---

## 7. 관련 파일

| 파일 | 역할 | 수정 필요 |
|------|------|----------|
| `frontend/src/pages/PageViewer.tsx` | 그룹 저장/로드 | ✅ |
| `frontend/src/pages/UnifiedWorkPage.tsx` | 페이지 네비게이션 | (선택) |

---

## 8. 영향 범위

- **UnifiedWorkPage**: 통합 작업 페이지 (Phase 33)
- **LabelingPage**: 기존 라벨링 페이지 (동일 PageViewer 사용)
- **모든 페이지 전환 시나리오**

---

## 9. 테스트 시나리오

### 9.1 기본 시나리오
```
1. 10쪽: 블록 5개 선택 → 그룹 생성 → "1번 문제" 입력
2. 11쪽 버튼 클릭
3. 10쪽 버튼 클릭
4. ✅ "1번 문제" 그룹이 표시되어야 함
```

### 9.2 빠른 연속 이동
```
1. 10쪽: 그룹 생성
2. 11쪽 → 12쪽 → 13쪽 (빠르게 연속 클릭)
3. 10쪽으로 돌아가기
4. ✅ 그룹이 유지되어야 함
```

### 9.3 새로고침 후 복구
```
1. 10쪽: 그룹 생성
2. 11쪽 이동
3. F5 새로고침
4. 10쪽으로 이동
5. ✅ 그룹이 유지되어야 함 (Phase 34-E 자동 동기화)
```

---

*승인 시 "진행해줘"로 실행*
