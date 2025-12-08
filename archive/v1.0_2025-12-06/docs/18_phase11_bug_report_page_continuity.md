# Phase 11 버그 리포트: 페이지간 문항번호 연속성 실패

**보고일**: 2025-11-26
**심각도**: 🔴 Critical
**영향**: Phase 10-2와 Phase 11-2의 핵심 기능 완전 실패

---

## 📋 Executive Summary

**증상**: 사용자가 12페이지에서 문항번호 30까지 작성한 후 방향키로 13페이지로 이동하면, 문항번호가 31이 아닌 **1로 리셋**됨.

**근본 원인**: React 상태 업데이트 타이밍과 클로저 문제로 인한 **잘못된 페이지 인덱스로 저장**

**영향 범위**:
- ✅ Phase 10-2: 페이지간 문항번호 연속성 (완전 실패)
- ✅ Phase 11-2: 즉시 저장 기능 (구현되었으나 잘못된 페이지에 저장)

---

## 🔍 심층 분석

### 1. 데이터 흐름 분석

#### 정상 시나리오 (의도된 동작):
```
[Page 12]
1. 사용자가 문항번호 30 입력 → Enter
2. 방향키 → 누름
3. ✅ Page 12의 그룹을 즉시 저장 (30번 포함)
4. Page 13으로 이동
5. useProblemNumberContext가 Page 12의 마지막 번호(30) 조회
6. ✅ Page 13에서 그룹 생성 시 31번으로 자동 증가
```

#### 실제 발생하는 버그 시나리오:
```
[Page 12]
1. 사용자가 문항번호 30 입력 → Enter
2. 방향키 → 누름
3. ⚠️ saveImmediately(localGroups) 호출
4. ⚠️ setCurrentPage(13) 실행 (React 상태 업데이트)
5. ❌ saveGroups 함수가 currentPage = 13으로 저장 시도!
6. ❌ Page 13에 잘못된 데이터 저장됨
7. Page 13으로 이동
8. useProblemNumberContext가 Page 12를 조회 → 데이터 없음!
9. ❌ Page 13에서 그룹 생성 시 1번으로 시작
```

---

## 🐛 버그의 근본 원인

### 원인 1: React 상태와 클로저 문제

**문제 코드** ([PageViewer.tsx:168-180](frontend/src/pages/PageViewer.tsx#L168-L180)):

```typescript
case 'ArrowRight':
  // Phase 11-2: 다음 페이지 이동 전 즉시 저장
  if (currentPage < totalPages - 1) {
    await saveImmediately(localGroups);  // ⚠️ 여기서 currentPage = 12
    setCurrentPage(currentPage + 1);     // ⚠️ currentPage를 13으로 변경
  }
  break;
```

**문제점**:
1. `saveImmediately`는 `saveGroups`를 호출
2. `saveGroups`는 **클로저로 `currentPage`를 캡처**
3. `setCurrentPage`가 호출되면서 React가 **비동기적으로 상태 업데이트**
4. `saveGroups` 실행 시점에 `currentPage`가 이미 **13으로 변경됨**

**증거** ([PageViewer.tsx:271-295](frontend/src/pages/PageViewer.tsx#L271-L295)):

```typescript
const saveGroups = async (groups: ProblemGroup[]) => {
  const groupsData: PageGroups = {
    document_id: documentId,
    page_index: currentPage,  // ❌ currentPage가 13이 되어버림!
    groups: groups,
  };

  setIsSaving(true);
  try {
    await saveGroupsMutation.mutateAsync({
      documentId,
      pageIndex: currentPage,  // ❌ 13페이지에 저장됨!
      groups: groupsData,
    });
    // ...
    queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });
  }
  // ...
};
```

---

### 원인 2: 경쟁 조건 (Race Condition)

**시나리오**:
```
Time  | Thread 1 (saveGroups)           | Thread 2 (React)
------|----------------------------------|---------------------------
T0    | await saveImmediately() 시작    |
T1    | saveGroups() 호출               |
T2    |                                  | setCurrentPage(13) 호출
T3    |                                  | currentPage = 13 업데이트
T4    | pageIndex: currentPage 읽음     | (currentPage = 13!)
T5    | ❌ Page 13에 데이터 저장        |
T6    |                                  | 페이지 전환 (Page 13 렌더링)
T7    |                                  | localGroups = [] (새 페이지)
```

**결과**:
- Page 12의 데이터가 Page 13에 저장됨
- Page 12에는 데이터가 없음
- useProblemNumberContext가 Page 12 조회 시 `null` 반환
- 다음 페이지에서 1번부터 시작

---

### 원인 3: React Query 캐시 무효화 타이밍

**코드** ([PageViewer.tsx:288](frontend/src/pages/PageViewer.tsx#L288)):
```typescript
queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });
```

**문제**:
1. 캐시 무효화는 정상 작동
2. 하지만 **잘못된 페이지에 저장된 데이터**를 무효화함
3. 다음 조회 시 **잘못된 페이지 데이터**를 받아옴

---

## 📊 실제 발생한 데이터 손상

### 예상된 파일 구조:
```
dataset_root/documents/{doc_id}/groups/
├── page_0012_groups.json  ← 문항번호 30 포함
├── page_0013_groups.json  ← 비어 있음 (아직 작업 안 함)
```

### 실제 파일 구조 (버그 발생 후):
```
dataset_root/documents/{doc_id}/groups/
├── page_0012_groups.json  ← 비어 있음! (데이터 손실)
├── page_0013_groups.json  ← 문항번호 30 포함 (잘못 저장됨)
```

---

## 🔬 재현 단계

### 100% 재현 가능:

1. **준비**:
   - PDF 문서 업로드 (최소 2페이지)
   - Page 0로 이동

2. **Page 0에서 작업**:
   ```
   - 블록 드래그하여 그룹 생성
   - 문항번호 "1" 입력 → Enter
   - 다른 블록 드래그하여 그룹 생성
   - 자동으로 "2" 제안됨 → Enter
   ```

3. **방향키로 페이지 이동**:
   ```
   - 방향키 → 누름
   - 브라우저 콘솔에서 Network 탭 확인
   - ❌ POST /api/blocks/documents/{id}/groups/1 (잘못된 페이지!)
   ```

4. **Page 1에서 확인**:
   ```
   - 블록 드래그하여 그룹 생성
   - ❌ 문항번호가 "1"로 제안됨 (3이어야 함)
   ```

5. **데이터 확인**:
   ```bash
   # Page 0 그룹 파일 확인
   cat dataset_root/documents/{id}/groups/page_0000_groups.json
   # ❌ 비어 있거나 오래된 데이터

   # Page 1 그룹 파일 확인
   cat dataset_root/documents/{id}/groups/page_0001_groups.json
   # ❌ Page 0의 데이터가 잘못 저장됨
   ```

---

## 💡 해결 방안

### 방안 1: saveGroups에 명시적 pageIndex 전달 (권장)

**변경 사항**:

1. **saveGroups 함수 수정**:
```typescript
// Before
const saveGroups = async (groups: ProblemGroup[]) => {
  const groupsData: PageGroups = {
    document_id: documentId,
    page_index: currentPage,  // ❌ 클로저 문제
    groups: groups,
  };

  await saveGroupsMutation.mutateAsync({
    documentId,
    pageIndex: currentPage,  // ❌ 클로저 문제
    groups: groupsData,
  });
};

// After
const saveGroups = async (groups: ProblemGroup[], targetPageIndex: number) => {
  const groupsData: PageGroups = {
    document_id: documentId,
    page_index: targetPageIndex,  // ✅ 명시적 전달
    groups: groups,
  };

  await saveGroupsMutation.mutateAsync({
    documentId,
    pageIndex: targetPageIndex,  // ✅ 명시적 전달
    groups: groupsData,
  });
};
```

2. **saveImmediately 함수 수정**:
```typescript
// Before
const saveImmediately = async (groups: ProblemGroup[]) => {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
  await saveGroups(groups);
};

// After
const saveImmediately = async (groups: ProblemGroup[], targetPageIndex: number) => {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
  await saveGroups(groups, targetPageIndex);  // ✅ 명시적 전달
};
```

3. **방향키 핸들러 수정**:
```typescript
// Before
case 'ArrowRight':
  if (currentPage < totalPages - 1) {
    await saveImmediately(localGroups);  // ❌ currentPage 암묵적 사용
    setCurrentPage(currentPage + 1);
  }
  break;

// After
case 'ArrowRight':
  if (currentPage < totalPages - 1) {
    const pageToSave = currentPage;  // ✅ 명시적 캡처
    await saveImmediately(localGroups, pageToSave);  // ✅ 올바른 페이지
    setCurrentPage(currentPage + 1);
  }
  break;
```

4. **디바운스 useEffect 수정**:
```typescript
// Before
debounceTimerRef.current = setTimeout(() => {
  saveGroups(localGroups);  // ❌ currentPage 암묵적 사용
  debounceTimerRef.current = null;
}, 2000);

// After
debounceTimerRef.current = setTimeout(() => {
  saveGroups(localGroups, currentPage);  // ✅ 명시적 전달
  debounceTimerRef.current = null;
}, 2000);
```

5. **Ctrl+S 핸들러 수정**:
```typescript
// Before
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
  e.preventDefault();
  await saveImmediately(localGroups);  // ❌
  showToast('변경사항이 즉시 저장되었습니다', 'success');
  return;
}

// After
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
  e.preventDefault();
  await saveImmediately(localGroups, currentPage);  // ✅
  showToast('변경사항이 즉시 저장되었습니다', 'success');
  return;
}
```

---

### 방안 2: useRef로 currentPage 추적 (대안)

```typescript
const currentPageRef = useRef(currentPage);

useEffect(() => {
  currentPageRef.current = currentPage;
}, [currentPage]);

const saveGroups = async (groups: ProblemGroup[]) => {
  const pageIndex = currentPageRef.current;  // ✅ 최신 값
  // ...
};
```

**단점**: ref를 추가로 관리해야 하며, 여전히 경쟁 조건 가능성 존재

---

## 🎯 권장 조치

### 즉시 조치 (Critical):
1. ✅ **saveGroups에 targetPageIndex 파라미터 추가**
2. ✅ **모든 saveGroups 호출부 수정** (5곳)
3. ✅ **단위 테스트 추가**
4. ✅ **데이터 복구 스크립트** (잘못 저장된 데이터 이동)

### 단기 조치:
1. 디버깅 로그 추가 (어느 페이지에 저장되는지 명확히 표시)
2. React DevTools로 상태 전환 모니터링
3. E2E 테스트 작성

### 장기 조치:
1. 페이지 전환 시 낙관적 업데이트(Optimistic Update) 패턴 적용
2. Redux 또는 Zustand로 상태 관리 중앙화 고려
3. 저장 실패 시 롤백 메커니즘

---

## 📈 영향도 분석

### 기능별 영향:

| 기능 | 영향 | 복구 방법 |
|------|------|-----------|
| Phase 10-2: 페이지간 문항번호 연속성 | 🔴 완전 실패 | 코드 수정 필요 |
| Phase 11-1: 자동 확정 | 🟢 정상 작동 | 영향 없음 |
| Phase 11-2: 즉시 저장 | 🔴 잘못된 페이지에 저장 | 코드 수정 필요 |
| 디바운스 자동 저장 | 🟡 타이밍에 따라 실패 가능 | 코드 수정 필요 |

### 사용자 경험 영향:

- 😡 **데이터 손실 위험**: 사용자가 작업한 그룹이 잘못된 페이지에 저장됨
- 😡 **작업 효율 저하**: 문항번호를 매번 수동으로 입력해야 함
- 😡 **신뢰도 하락**: 자동 기능을 믿을 수 없음

---

## 🧪 테스트 시나리오

### 수정 후 반드시 테스트:

#### Test 1: 기본 페이지 이동
```
1. Page 0: 문항 1, 2 생성
2. 방향키 →
3. ✅ Page 0의 groups 파일 확인 (문항 1, 2 포함)
4. ✅ Page 1에서 그룹 생성 → 문항번호 3 제안됨
```

#### Test 2: 빠른 연속 페이지 이동
```
1. Page 0: 문항 1 생성
2. 방향키 → → → (빠르게 3번)
3. ✅ Page 0, 1, 2의 groups 파일 확인
4. ✅ Page 3에서 문항번호 2 제안됨
```

#### Test 3: Ctrl+S 즉시 저장
```
1. Page 0: 문항 1 생성
2. Ctrl+S
3. ✅ Page 0의 groups 파일 확인
4. 방향키 →
5. ✅ Page 1에서 문항번호 2 제안됨
```

#### Test 4: 디바운스 자동 저장
```
1. Page 0: 문항 1 생성
2. 2초 대기
3. ✅ Page 0의 groups 파일 확인
4. 방향키 →
5. ✅ Page 1에서 문항번호 2 제안됨
```

---

## 🔗 관련 파일

### 수정 필요:
- [frontend/src/pages/PageViewer.tsx](frontend/src/pages/PageViewer.tsx) (핵심)
  - `saveGroups` 함수 (L271-295)
  - `saveImmediately` 함수 (L83-91)
  - 방향키 핸들러 (L168-180)
  - Ctrl+S 핸들러 (L154-160)
  - 디바운스 useEffect (L128-149)
  - `handleUpdateGroupInfo` (L94-112)

### 검토 필요:
- [frontend/src/hooks/useProblemNumberContext.ts](frontend/src/hooks/useProblemNumberContext.ts)
- [backend/app/routers/blocks.py](backend/app/routers/blocks.py) (L135-162, L209-265)

---

## 📝 결론

이 버그는 **React의 상태 업데이트 타이밍과 클로저 문제**로 인해 발생했습니다.
`saveGroups` 함수가 `currentPage`를 클로저로 캡처하면서, 페이지 전환 시 이미 변경된 `currentPage` 값을 사용하여 **잘못된 페이지에 데이터를 저장**합니다.

**해결책**은 명시적으로 `targetPageIndex`를 전달하여 클로저 문제를 피하는 것입니다.

**우선순위**: 🔴 Critical - 즉시 수정 필요

---

**작성자**: Claude Code
**검토자**: 사용자
**다음 단계**: 코드 수정 → 테스트 → 배포
