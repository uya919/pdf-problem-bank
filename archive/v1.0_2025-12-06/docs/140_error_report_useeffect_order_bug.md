# 에러 리포트: useEffect 실행 순서로 인한 그룹 덮어쓰기 버그

**작성일**: 2025-12-04
**심각도**: Critical
**분석 방법**: Opus Thinkharder + Phase 51 디버깅 로그

---

## 핵심 발견: useEffect 실행 순서 문제

### 버그 증상
```
페이지 9 → 페이지 17 → 페이지 9 돌아가기
결과: 7개 그룹이 표시되어야 하는데 0개 표시
```

### 로그에서 발견된 문제 시퀀스

```
[페이지 17 → 페이지 9 돌아갈 때]

1️⃣ React Query가 캐시된 데이터 즉시 반환:
   usePageGroups hook render: {requestedPageIndex: 9, data_page_index: 9, data_groups_count: 7}

2️⃣ groupsData effect 실행 (라인 222):
   groupsData effect triggered: {groupsData_page_index: 9, currentPage: 9, isInitialLoad: false}
   ✅ Condition PASSED - Setting localGroups: 7  ← 7개 설정됨!

3️⃣ page transition effect 실행 (라인 260):
   Page transition effect: {prevPage: 17, currentPage: 9, groupsSnapshotCount: 8}
   📤 Saving previous page groups: {prevPage: 17, groupsCount: 8}
   🔄 Resetting page state: {settingLocalGroupsTo: '[]'}  ← 0개로 덮어씀! ❌
```

---

## 근본 원인 분석

### 문제의 핵심

**두 useEffect가 같은 렌더 사이클에서 순차 실행되며, 나중에 실행된 effect가 먼저 설정한 값을 덮어씀!**

```
렌더 사이클:
┌─────────────────────────────────────────────────────────────┐
│ 1. currentPage = 9로 변경                                    │
│ 2. React Query가 캐시에서 page 9 데이터 즉시 반환 (7개 그룹)   │
│ 3. 컴포넌트 리렌더                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ useEffect 1 (라인 220-242): groupsData effect               │
│ - groupsData.page_index(9) === currentPage(9) ✅             │
│ - setLocalGroups([7개 그룹]) 호출                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ useEffect 2 (라인 254-295): page transition effect          │
│ - prevPage(17) !== currentPage(9) → 저장 로직 실행           │
│ - setLocalGroups([]) 호출 ← 여기서 덮어씀! ❌                 │
│ - isInitialLoadRef.current = true                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ React 배치 처리:                                             │
│ - 마지막 setState가 승리 → localGroups = []                  │
│ - 리렌더: 0개 그룹 표시 ❌                                    │
└─────────────────────────────────────────────────────────────┘
```

### 왜 이후에 복구되지 않는가?

```
┌─────────────────────────────────────────────────────────────┐
│ React Query refetch 완료:                                    │
│ - Received data for page 9: {groups_count: 7}               │
│                                                              │
│ 하지만 groupsData effect가 다시 실행되지 않음!                │
│ - groupsData 객체 참조가 동일 (캐시된 데이터와 refetch 결과 동일) │
│ - currentPage도 여전히 9                                     │
│ - 의존성 배열 [groupsData, currentPage] 변경 없음             │
│ → useEffect 재실행 안됨! ❌                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 코드 위치

### 버그 발생 코드 (PageViewer.tsx 라인 290-291)

```typescript
// Phase 21.8: 페이지 변경 시 선택 및 그룹 초기화
useEffect(() => {
  // ... 이전 페이지 저장 로직 ...

  // 새 페이지 초기화
  setSelectedBlocks([]);
  setLocalGroups([]);  // ❌ 이 줄이 문제! groupsData effect가 설정한 값을 덮어씀
  isInitialLoadRef.current = true;
}, [currentPage, documentId]);
```

### 정상 동작해야 하는 코드 (라인 220-242)

```typescript
// Phase 49: groupsData 동기화
useEffect(() => {
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);  // ✅ 올바르게 설정하지만...
    isInitialLoadRef.current = false;
  }
}, [groupsData, currentPage]);  // ← 이후 재실행되지 않음!
```

---

## 해결 방안

### 방안 1: setLocalGroups([]) 제거 (권장)

```typescript
// 수정 전
useEffect(() => {
  // ... 저장 로직 ...

  setSelectedBlocks([]);
  setLocalGroups([]);  // ← 삭제
  isInitialLoadRef.current = true;
}, [currentPage, documentId]);

// 수정 후
useEffect(() => {
  // ... 저장 로직 ...

  setSelectedBlocks([]);
  // setLocalGroups는 groupsData effect에서 처리
  isInitialLoadRef.current = true;
}, [currentPage, documentId]);
```

**왜 안전한가?**
- 새 페이지로 이동 시: groupsData는 undefined → 조건 실패 → 기존 그룹 유지 안됨
- 캐시된 페이지 복귀 시: groupsData에 올바른 데이터 → 조건 통과 → 그룹 설정

### 방안 2: 조건부 초기화

```typescript
useEffect(() => {
  // ... 저장 로직 ...

  setSelectedBlocks([]);

  // 캐시된 페이지가 아닐 때만 초기화
  if (!groupsData || groupsData.page_index !== currentPage) {
    setLocalGroups([]);
  }
  isInitialLoadRef.current = true;
}, [currentPage, documentId, groupsData]);
```

### 방안 3: 실행 순서 보장 (복잡)

```typescript
// groupsData effect 내에서 모든 로직 처리
useEffect(() => {
  // 페이지 전환 감지
  if (prevPageRef.current !== currentPage) {
    // 이전 페이지 저장
    if (localGroupsRef.current.length > 0) {
      saveGroups(localGroupsRef.current, prevPageRef.current);
    }
    prevPageRef.current = currentPage;
    setSelectedBlocks([]);
  }

  // 그룹 데이터 로드
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  } else {
    setLocalGroups([]);
    isInitialLoadRef.current = true;
  }
}, [groupsData, currentPage]);
```

---

## 권장 해결책: 방안 1

**이유:**
1. 최소 변경으로 문제 해결
2. groupsData effect의 Phase 49 조건이 이미 올바르게 동작
3. 부작용 위험 낮음

**변경 내용:**
- 파일: `frontend/src/pages/PageViewer.tsx`
- 위치: 라인 290-291
- 내용: `setLocalGroups([]);` 라인 삭제

---

## 테스트 시나리오

1. **기본 시나리오**: 페이지 9 → 17 → 9 돌아가기 → 7개 그룹 유지 확인
2. **빠른 전환**: 9 → 10 → 11 → 9 빠르게 이동 → 그룹 유지 확인
3. **새 페이지**: 캐시 없는 새 페이지 방문 → 0개로 시작 확인
4. **새로고침**: 새로고침 후에도 정상 동작 확인

---

## 영향 분석

| 시나리오 | 현재 동작 | 수정 후 동작 |
|---------|----------|-------------|
| 새 페이지 방문 | groupsData undefined → localGroups [] | 동일 |
| 캐시된 페이지 복귀 | 7개 설정 → 0개로 덮어씀 ❌ | 7개 설정 ✅ |
| 페이지 전환 저장 | 정상 | 정상 |

---

## 결론

**Phase 49의 조건부 로드는 올바르게 구현되었으나, page transition effect의 `setLocalGroups([])` 호출이 이를 덮어쓰고 있었습니다.**

이 버그는 React의 useEffect 실행 순서와 React Query의 캐시 동작이 결합되어 발생한 복잡한 타이밍 이슈입니다.

---

**"진행해줘"로 수정을 시작합니다.**
