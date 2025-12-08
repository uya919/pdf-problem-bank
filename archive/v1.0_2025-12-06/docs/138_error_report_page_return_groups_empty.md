# 에러 리포트: 페이지 재방문 시 그룹 데이터가 0개로 표시되는 버그

**작성일**: 2025-12-04
**심각도**: Critical
**발생 위치**: `frontend/src/pages/PageViewer.tsx`
**Phase 49 관련**: Phase 49 수정 후에도 지속되는 버그

---

## 증상 재현 단계

```
1. 새로고침
2. "저장된 페이지" 목록에서 페이지 10 클릭 → 7개 문제 정상 표시 ✅
3. 페이지 18 클릭 → 8개 문제 정상 표시 ✅
4. 페이지 10 다시 클릭 → 0개 문제 표시됨! ❌
```

---

## 근본 원인 분석 (Deep Dive)

### Phase 49 수정이 효과 없었던 이유

Phase 49에서 useEffect 의존성에 `currentPage`를 추가하고 `groupsData.page_index === currentPage` 조건을 넣었습니다:

```typescript
// PageViewer.tsx 라인 219-227 (Phase 49 수정)
useEffect(() => {
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData, currentPage]);
```

**문제**: `groupsData.page_index`가 `undefined`가 되는 경우가 있습니다!

---

### 버그 코드 위치

**파일**: `frontend/src/pages/PageViewer.tsx`
**라인**: 248-257

```typescript
// 잘못된 코드 - 배열을 직접 전달!
saveGroupsMutation.mutate({
  documentId,
  pageIndex: prevPage,
  groups: groupsSnapshot.map(g => ({  // ❌ 배열!
    id: g.id,
    block_ids: g.block_ids,
    problemInfo: g.problemInfo,
    link: g.link,
  })),
});
```

**올바른 코드** (라인 517-534의 `saveGroups` 함수):

```typescript
const saveGroups = async (groups: ProblemGroup[], targetPageIndex: number) => {
  const groupsData: PageGroups = {
    document_id: documentId,
    page_index: targetPageIndex,
    groups: groups,  // ✅ PageGroups 객체로 감싸기
  };
  await saveGroupsMutation.mutateAsync({
    documentId,
    pageIndex: targetPageIndex,
    groups: groupsData,
  });
};
```

---

### 왜 두 방식이 다른가?

| 구분 | 라인 248-257 (버그) | saveGroups 함수 (정상) |
|------|---------------------|------------------------|
| 전달 데이터 | `[{id, block_ids, ...}]` | `{document_id, page_index, groups: [...]}` |
| 서버 저장 | 배열 그대로 저장 | PageGroups 객체로 저장 |
| 로드 시 | `groupsData = [...]` | `groupsData = {page_index: N, ...}` |
| Phase 49 조건 | `undefined === 10` → false | `10 === 10` → true |
| 결과 | 그룹 로드 안됨 | 그룹 정상 로드 |

---

### 버그 발생 시나리오 상세

```
시간축 →

[페이지 10 첫 방문]
1. usePageGroups(doc, 10) → 서버에서 PageGroups 객체 fetch
2. groupsData = { document_id: "...", page_index: 10, groups: [...7개] }
3. Phase 49 조건: 10 === 10 ✅
4. setLocalGroups([7개 그룹]) → 정상 표시

[페이지 18로 이동]
5. useEffect [currentPage] 실행 (라인 238-269)
6. prevPage = 10, groupsSnapshot = [7개 그룹]
7. 🔴 saveGroupsMutation.mutate() → 배열로 저장!
8. 서버가 배열을 그대로 파일에 저장
9. onSuccess → queryClient.invalidateQueries(['groups', doc, 10])
10. 페이지 10 캐시 무효화됨

[페이지 10으로 돌아감]
11. usePageGroups(doc, 10) → 서버에서 재요청
12. 서버가 배열로 저장된 파일 반환: [{...}, {...}, ...]
13. groupsData = [{...}, {...}, ...] ← 배열!
14. groupsData.page_index = undefined
15. Phase 49 조건: undefined === 10 ❌
16. setLocalGroups() 실행 안됨
17. 🔴 localGroups = [] (빈 배열 유지)
```

---

### 실제 파일 확인

**page_0010_groups.json**:
```json
{
  "document_id": "고1_공통수학1_베이직쎈_문제",
  "page_index": 10,
  "groups": []  ← 빈 배열로 저장됨
}
```

**page_0018_groups.json**:
```json
{
  "document_id": "고1_공통수학1_베이직쎈_문제",
  "page_index": 18,
  "groups": [...7개]  ← 정상
}
```

**분석**: 페이지 10은 마지막으로 `saveGroups()` 함수를 통해 저장되어 올바른 포맷이지만, 그룹이 빈 배열인 상태에서 저장됨. 페이지 전환 시 빈 배열로 초기화된 후 자동 저장이 실행된 것으로 추정.

---

## 타입 안전성 누수

**useDocuments.ts 라인 98**:
```typescript
groups: any;  // ❌ 타입 체크 우회!
```

이 `any` 타입 때문에 배열을 직접 전달해도 TypeScript가 에러를 잡지 못합니다.

---

## 해결 방안

### 방안 1: saveGroups 함수 재사용 (권장)

```typescript
// Before (라인 248-257)
saveGroupsMutation.mutate({
  documentId,
  pageIndex: prevPage,
  groups: groupsSnapshot.map(g => ({...})),
});

// After: saveGroups 함수 호출로 변경
if (prevPage !== currentPage && groupsSnapshot.length > 0 && documentId) {
  logger.info('PageViewer', `Saving ${groupsSnapshot.length} groups from page ${prevPage} → ${currentPage}`);

  // saveGroups 함수 사용 (PageGroups 객체로 저장)
  saveGroups(groupsSnapshot, prevPage);
}
```

**장점**:
- 코드 중복 제거
- 일관된 저장 로직
- 버그 재발 방지

### 방안 2: 인라인 수정

```typescript
// 직접 PageGroups 객체 생성
saveGroupsMutation.mutate({
  documentId,
  pageIndex: prevPage,
  groups: {
    document_id: documentId,
    page_index: prevPage,
    groups: groupsSnapshot.map(g => ({
      id: g.id,
      block_ids: g.block_ids,
      problemInfo: g.problemInfo,
      link: g.link,
    })),
  },
});
```

---

## 추가 권장 사항

### 1. 타입 강화

```typescript
// useDocuments.ts
export function useSavePageGroups() {
  return useMutation({
    mutationFn: ({
      documentId,
      pageIndex,
      groups,
    }: {
      documentId: string;
      pageIndex: number;
      groups: PageGroups;  // ✅ any → PageGroups
    }) => api.savePageGroups(documentId, pageIndex, groups),
    ...
  });
}
```

### 2. 로그 추가

```typescript
// PageViewer.tsx 페이지 전환 저장 시
logger.debug('PageViewer', `Saving format check: has page_index=${groups.page_index !== undefined}`);
```

---

## 영향 범위

| 컴포넌트 | 영향 | 심각도 |
|----------|------|--------|
| PageViewer.tsx | 페이지 전환 시 그룹 데이터 손실 | Critical |
| UnifiedWorkPage.tsx | 작업 세션에서 문제 표시 안됨 | High |
| 사용자 경험 | 저장한 작업이 사라진 것처럼 보임 | High |
| 데이터 무결성 | 서버에는 데이터 있음 (표시만 안됨) | Medium |

---

## 수정 파일 요약

| 파일 | 변경 내용 | 위험도 |
|------|----------|--------|
| `frontend/src/pages/PageViewer.tsx` | 라인 248-257을 saveGroups 함수 호출로 변경 | 낮음 |

---

## 테스트 체크리스트

- [ ] 페이지 10 → 18 → 10 이동 시 그룹 유지 확인
- [ ] 빠른 페이지 전환 (10 → 11 → 12 → 10) 시 그룹 유지 확인
- [ ] 새로고침 후에도 그룹 정상 표시 확인
- [ ] 키보드 (←/→) 페이지 이동 시 그룹 유지 확인
- [ ] "저장된 페이지" 클릭 시 그룹 정상 표시 확인
- [ ] 빌드 성공 확인

---

## 롤백 계획

문제 발생 시 라인 248-257을 원복하고 Phase 49 조건도 제거:

```typescript
// 롤백 코드
useEffect(() => {
  if (groupsData) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData]);
```

---

**승인 후 "진행해줘"로 수정을 시작합니다.**
