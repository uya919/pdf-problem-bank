# Phase 49: 페이지 재방문 시 그룹 캐시 버그 수정

**작성일**: 2025-12-04
**선행 분석**: [136_error_report_group_disappear_on_page_return.md](136_error_report_group_disappear_on_page_return.md)
**예상 소요**: 30분

---

## 목표

페이지 전환 후 재방문 시 그룹이 사라지는 버그 수정

---

## Step 1: useEffect 의존성 수정 (10분)

### 1-1. groupsData 로드 로직 수정

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
// Before (라인 218-225)
useEffect(() => {
  if (groupsData) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData]);

// After
useEffect(() => {
  // Phase 49: 현재 페이지의 데이터인 경우에만 적용 (캐시 참조 문제 해결)
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
    logger.debug('PageViewer', `Loaded ${groupsData.groups?.length || 0} groups for page ${currentPage}`);
  }
}, [groupsData, currentPage]);
```

### 1-2. 변경 이유

| 문제 | 해결 |
|------|------|
| React Query가 캐시된 같은 객체 참조 반환 | currentPage 의존성 추가로 페이지 변경 시 항상 실행 |
| 다른 페이지 데이터가 적용될 수 있음 | page_index === currentPage 조건으로 검증 |

---

## Step 2: 페이지 전환 로직 개선 (10분)

### 2-1. 페이지 전환 시 초기화 순서 조정

현재 문제:
1. `setLocalGroups([])` 실행 → 그룹 초기화
2. React Query 캐시에서 데이터 반환 → 같은 참조
3. useEffect 미실행 → 빈 배열 유지

개선:
1. `setLocalGroups([])` 실행 → 그룹 초기화
2. `currentPage` 의존성으로 useEffect 실행 보장
3. `page_index === currentPage` 조건으로 정확한 데이터 로드

### 2-2. 디버그 로그 추가

```typescript
// 페이지 전환 useEffect (라인 236-267)
useEffect(() => {
  const prevPage = prevPageRef.current;
  const groupsSnapshot = [...localGroupsRef.current];

  if (prevPage !== currentPage && groupsSnapshot.length > 0 && documentId) {
    logger.info('PageViewer', `Page transition: ${prevPage} → ${currentPage}, saving ${groupsSnapshot.length} groups`);
    // ... 저장 로직 ...
  }

  prevPageRef.current = currentPage;
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
  logger.debug('PageViewer', `Page ${currentPage} initialized, waiting for data...`);
}, [currentPage, documentId]);
```

---

## Step 3: 테스트 (10분)

### 3-1. 시나리오 테스트

```
테스트 1: 기본 페이지 전환
1. 페이지 9에서 그룹 3개 생성
2. 페이지 17로 이동
3. 페이지 9로 복귀
→ 예상: 그룹 3개 표시됨

테스트 2: 빠른 페이지 전환
1. 페이지 9 → 10 → 11 → 12 빠르게 이동
2. 페이지 9로 복귀
→ 예상: 그룹 정상 표시

테스트 3: 저장된 페이지 클릭
1. 우측 "저장된 페이지" 목록에서 클릭
2. 다른 페이지 클릭
3. 원래 페이지 다시 클릭
→ 예상: 그룹 정상 표시

테스트 4: 키보드 네비게이션
1. ← → 키로 페이지 이동
2. 원래 페이지로 복귀
→ 예상: 그룹 정상 표시
```

### 3-2. 콘솔 로그 확인

```
[PageViewer] Page transition: 9 → 17, saving 3 groups
[PageViewer] Page 17 initialized, waiting for data...
[PageViewer] Loaded 2 groups for page 17
[PageViewer] Page transition: 17 → 9, saving 2 groups
[PageViewer] Page 9 initialized, waiting for data...
[PageViewer] Loaded 3 groups for page 9  ← 캐시에서 정상 로드 확인
```

---

## 변경 파일 요약

| 파일 | 변경 내용 | 위험도 |
|------|----------|--------|
| `frontend/src/pages/PageViewer.tsx` | useEffect 의존성 수정 | 낮음 |

---

## 롤백 계획

문제 발생 시:

```typescript
// 원복 코드
useEffect(() => {
  if (groupsData) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData]);
```

---

## 체크리스트

- [ ] Step 1: useEffect 의존성 수정
- [ ] Step 2: 디버그 로그 추가
- [ ] Step 3-1: 기본 페이지 전환 테스트
- [ ] Step 3-2: 빠른 페이지 전환 테스트
- [ ] Step 3-3: 저장된 페이지 클릭 테스트
- [ ] Step 3-4: 키보드 네비게이션 테스트
- [ ] 빌드 성공 확인

---

**승인 후 "진행해줘"로 구현을 시작합니다.**
