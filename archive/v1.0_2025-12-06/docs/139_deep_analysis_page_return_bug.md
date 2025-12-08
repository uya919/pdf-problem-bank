# 심층 분석: 페이지 재방문 시 그룹 0개 표시 버그

**작성일**: 2025-12-04
**심각도**: Critical
**분석 방법**: Opus Thinkharder

---

## 핵심 발견

### 1. 서버 데이터는 정상

```
page_0009_groups.json: 7개 그룹 ✅ (책 페이지 10)
page_0017_groups.json: 8개 그룹 ✅ (책 페이지 18)
```

**결론**: 서버/파일 저장 문제가 아님. **클라이언트 측 문제!**

---

### 2. 페이지 번호 매핑 확인

| UI 표시 | PDF pageIndex | 책 페이지 | 그룹 수 |
|---------|---------------|-----------|---------|
| "페이지 10" | 9 | 10 | 7개 |
| "페이지 18" | 17 | 18 | 8개 |

---

## 의심되는 원인들

### 원인 1: React Query 캐시 타이밍 문제

```typescript
// usePageGroups 기본 설정
export function usePageGroups(documentId: string, pageIndex: number) {
  return useQuery({
    queryKey: ['groups', documentId, pageIndex],
    queryFn: () => api.getPageGroups(documentId, pageIndex),
    enabled: !!documentId && pageIndex >= 0,
    // staleTime: 0 (기본값) - 즉시 stale
    // cacheTime: 5분 (기본값)
  });
}
```

**문제 시나리오**:
```
1. 페이지 9 → 17 전환
2. saveGroups([7개], 9) 비동기 호출
3. 빠르게 페이지 9로 돌아감
4. React Query가 캐시에서 "stale" 데이터 반환
5. 하지만 invalidateQueries가 아직 실행 안됨
6. 백그라운드 refetch 시작
7. 이 시점에 groupsData가 무엇인가?
```

---

### 원인 2: useEffect 실행 순서와 경합 조건

```typescript
// PageViewer.tsx의 useEffect들
// 1. groupsData 로드 useEffect (라인 219-227)
// 2. localGroups 동기화 useEffect (라인 229-232)
// 3. 페이지 전환 useEffect (라인 238-261)
// 4. 자동 저장 useEffect (라인 266-297)
```

**문제 시나리오**:
```
[currentPage 변경: 17 → 9]

1. React가 currentPage = 9로 업데이트
2. useEffect [currentPage] 실행:
   - setLocalGroups([])
   - isInitialLoadRef.current = true

3. useEffect [groupsData, currentPage] 실행:
   - 이 시점 groupsData는 아직 페이지 17 데이터!
   - 조건: 17 === 9 → false
   - 아무것도 안함!

4. React Query가 페이지 9 데이터 fetch/캐시 반환
5. groupsData 업데이트
6. useEffect [groupsData, currentPage] 재실행:
   - 조건: 9 === 9 → true ✅
   - setLocalGroups([7개]) 실행해야 함...

문제: 6번이 실행되지 않을 수 있음!
```

---

### 원인 3: groupsData가 업데이트되지 않는 경우

**React Query stale-while-revalidate 동작**:
1. 캐시에 데이터 있으면 즉시 반환 (같은 객체 참조!)
2. 백그라운드에서 refetch
3. 데이터가 같으면 객체 참조 변경 안함
4. useEffect 재실행 안됨!

```typescript
// Phase 49 수정
useEffect(() => {
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);
  }
}, [groupsData, currentPage]);  // ← currentPage 변경만으로도 실행됨
```

**하지만!** `groupsData`가 같은 객체 참조면:
- React Query가 캐시에서 같은 객체 반환
- `groupsData` 참조 변경 없음
- `currentPage`만 변경됨
- useEffect 실행됨
- 조건 확인: `groupsData.page_index === currentPage`
- **groupsData.page_index가 아직 이전 페이지 값일 수 있음!**

---

## 진짜 버그: 캐시 참조와 조건 충돌

**문제 흐름**:
```
1. 페이지 9 방문 → groupsData = { page_index: 9, groups: [7개] } (참조 A)
2. 페이지 17 방문 → groupsData = { page_index: 17, groups: [8개] } (참조 B)
3. 페이지 9 재방문:
   - currentPage = 9
   - React Query 캐시 확인
   - 캐시에 참조 A 있음 (stale)
   - groupsData = 참조 A 반환 (즉시)

4. useEffect [groupsData, currentPage] 실행:
   - groupsData = 참조 A
   - groupsData.page_index = 9
   - currentPage = 9
   - 조건: 9 === 9 → true ✅
   - setLocalGroups([7개]) 실행!
```

**이론상 정상... 그러나 실제로는?**

---

## 추가 분석 필요

### 디버깅 로그 추가 위치

```typescript
// PageViewer.tsx

// 1. groupsData 변경 추적
useEffect(() => {
  console.log('[DEBUG] groupsData changed:', {
    page_index: groupsData?.page_index,
    groups_count: groupsData?.groups?.length,
    currentPage,
    isInitialLoad: isInitialLoadRef.current,
  });

  if (groupsData && groupsData.page_index === currentPage) {
    console.log('[DEBUG] Condition passed, setting localGroups');
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  } else {
    console.log('[DEBUG] Condition failed:', {
      hasGroupsData: !!groupsData,
      groupsDataPageIndex: groupsData?.page_index,
      currentPage,
    });
  }
}, [groupsData, currentPage]);

// 2. 페이지 전환 추적
useEffect(() => {
  console.log('[DEBUG] Page transition:', {
    from: prevPageRef.current,
    to: currentPage,
    localGroupsCount: localGroupsRef.current.length,
  });
  // ...
}, [currentPage, documentId]);
```

---

## 해결 방안

### 방안 1: groupsData 로드 강제 대기

```typescript
// 페이지 전환 시 데이터 로드 완료까지 대기
useEffect(() => {
  // ... 이전 페이지 저장 ...

  setLocalGroups([]);
  isInitialLoadRef.current = true;

  // 페이지 변경 후 강제 refetch
  queryClient.refetchQueries({
    queryKey: ['groups', documentId, currentPage],
  });
}, [currentPage, documentId, queryClient]);
```

### 방안 2: 조건 단순화

```typescript
// Phase 49 조건 제거하고 무조건 적용
useEffect(() => {
  if (groupsData) {
    // page_index 체크 없이 무조건 적용
    // 대신 currentPage가 변경될 때 초기화는 다른 useEffect에서 처리
    if (!isInitialLoadRef.current) return; // 초기 로드 시에만

    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData]);
```

### 방안 3: 명시적 캐시 무효화

```typescript
// 페이지 변경 시 이전 캐시 강제 삭제
useEffect(() => {
  const prevPage = prevPageRef.current;

  if (prevPage !== currentPage) {
    // 이전 페이지 저장
    if (localGroupsRef.current.length > 0) {
      saveGroups(localGroupsRef.current, prevPage);
    }

    // 새 페이지 캐시 강제 무효화 후 refetch
    queryClient.invalidateQueries({
      queryKey: ['groups', documentId, currentPage],
    });
  }

  // ...
}, [currentPage, documentId, queryClient]);
```

---

## 권장 해결책

**방안 3 + 디버깅 로그** 조합:

1. 먼저 디버깅 로그 추가하여 정확한 원인 파악
2. 캐시 무효화 로직 추가
3. 테스트 후 디버깅 로그 제거

---

## 다음 단계

1. [ ] 디버깅 로그 추가
2. [ ] 브라우저 콘솔에서 실제 흐름 확인
3. [ ] Network 탭에서 API 응답 확인
4. [ ] 정확한 원인 파악 후 수정

---

## 체크리스트

- [x] 서버 데이터 정상 확인
- [x] 세션 데이터 정상 확인
- [ ] 클라이언트 측 디버깅 로그 추가
- [ ] React Query 캐시 동작 확인
- [ ] useEffect 실행 순서 확인
- [ ] 최종 수정 적용

---

**디버깅 로그를 추가한 후 "진행해줘"로 테스트를 시작합니다.**
