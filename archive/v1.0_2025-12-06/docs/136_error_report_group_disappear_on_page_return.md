# 에러 리포트: 페이지 재방문 시 그룹 데이터 사라짐

**작성일**: 2025-12-04
**심각도**: Critical
**발생 위치**: PageViewer.tsx

---

## 증상

1. 새로고침 후 "저장된 페이지"를 클릭하면 → 그룹이 정상 표시됨
2. 다른 페이지로 이동
3. 다시 원래 페이지로 돌아가면 → **그룹이 비어있음!**

---

## 근본 원인 분석

### React Query 캐싱과 useEffect 의존성 충돌

**문제 코드** ([PageViewer.tsx:218-225](frontend/src/pages/PageViewer.tsx#L218-L225)):

```typescript
// 그룹 데이터 동기화
useEffect(() => {
  if (groupsData) {
    setLocalGroups(groupsData.groups || []);  // ✅ 정상 실행
    isInitialLoadRef.current = false;
  }
}, [groupsData]);  // 🔴 문제: groupsData 참조가 같으면 실행 안됨!
```

**페이지 전환 코드** ([PageViewer.tsx:236-267](frontend/src/pages/PageViewer.tsx#L236-L267)):

```typescript
useEffect(() => {
  // ... 이전 페이지 저장 ...

  setLocalGroups([]);  // 🔴 그룹 초기화
  isInitialLoadRef.current = true;
}, [currentPage, documentId]);
```

---

## 버그 발생 시나리오

```
시간축 →

[페이지 9 첫 방문]
1. usePageGroups(doc, 9) → 서버에서 데이터 fetch
2. groupsData 변경 (새 객체)
3. useEffect 실행 → setLocalGroups([그룹1, 그룹2, ...])
4. ✅ 그룹 정상 표시

[페이지 17로 이동]
5. currentPage 변경 → setLocalGroups([]) 실행
6. usePageGroups(doc, 17) → 서버에서 데이터 fetch
7. groupsData 변경 (새 객체)
8. useEffect 실행 → setLocalGroups([...])
9. ✅ 페이지 17 그룹 표시

[페이지 9로 다시 이동]  ← 🔴 여기서 문제 발생!
10. currentPage 변경 → setLocalGroups([]) 실행  ← 그룹 초기화됨
11. usePageGroups(doc, 9) → React Query 캐시에서 반환
12. groupsData === 이전 참조 (캐시된 같은 객체)
13. useEffect 실행 안됨! (의존성 변경 없음)
14. 🔴 localGroups = [] (비어있음!)
```

### 핵심 문제

React Query는 캐시된 데이터를 **같은 객체 참조**로 반환합니다.

```
페이지 9 첫 방문:  groupsData = { groups: [...] }  // 참조 A
페이지 17 방문:   groupsData = { groups: [...] }  // 참조 B
페이지 9 재방문:  groupsData = { groups: [...] }  // 참조 A (캐시에서 반환!)
                                                   ↑
                                    참조가 같아서 useEffect 실행 안됨
```

---

## 영향 범위

- **PageViewer.tsx**: 모든 페이지 전환 시 발생 가능
- **UnifiedWorkPage.tsx**: 라벨링/매칭 작업 시 영향
- **사용자 데이터**: 서버에는 저장되어 있지만 UI에 표시 안됨 (데이터 유실 아님)

---

## 해결 방안

### 방안 1: useEffect 의존성에 currentPage 추가 (권장)

```typescript
// PageViewer.tsx
useEffect(() => {
  if (groupsData) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData, currentPage]);  // ✅ currentPage 추가
```

**장점**: 간단, 안전
**단점**: currentPage 변경 시 무조건 실행 (불필요한 실행 가능성)

### 방안 2: groupsData.page_index 확인

```typescript
useEffect(() => {
  // 현재 페이지의 데이터인 경우에만 적용
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [groupsData, currentPage]);
```

**장점**: 정확한 페이지 매칭
**단점**: 약간 복잡

### 방안 3: 페이지 전환 시 그룹 초기화 제거 + 조건부 로드

```typescript
// 페이지 전환 시
useEffect(() => {
  // ... 이전 페이지 저장 ...

  // setLocalGroups([]);  ← 제거
  isInitialLoadRef.current = true;

  // 페이지 변경 시 즉시 캐시에서 로드 시도
  if (groupsData && groupsData.page_index === currentPage) {
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  }
}, [currentPage, documentId]);
```

**장점**: 깜빡임 없음
**단점**: 로직 복잡

---

## 권장 해결책

**방안 2**를 채택합니다.

이유:
1. 정확한 페이지 매칭으로 잘못된 데이터 표시 방지
2. 간단한 수정으로 버그 해결
3. 기존 로직 최소 변경

### 수정 코드

```typescript
// PageViewer.tsx 라인 218-225

// Before
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
    console.log(`[Phase 49] Loaded ${groupsData.groups?.length || 0} groups for page ${currentPage}`);
  }
}, [groupsData, currentPage]);
```

---

## 추가 발견: 페이지 상태 동기화 문제

### 두 번째 문제

PageViewer 내부에서 페이지를 변경하면 workSessionStore의 페이지가 업데이트되지 않음:

```typescript
// PageViewer.tsx 라인 725
onClick={() => setCurrentPage(pageIdx)}  // PageViewer 로컬 상태만 변경!
```

Phase 48에서 추가한 `debouncedSavePage`는 workSessionStore의 `setCurrentPage`에서만 호출되므로, PageViewer 내부에서의 페이지 변경은 백엔드에 저장되지 않음.

### 해결 방안

PageViewer에서 페이지 변경 시 부모에게 알리는 콜백 추가:

```typescript
interface PageViewerProps {
  // ... 기존 props ...
  onPageChange?: (page: number) => void;  // 추가
}

// 사용
onClick={() => {
  setCurrentPage(pageIdx);
  onPageChange?.(pageIdx);  // 부모에게 알림
}}
```

---

## 테스트 체크리스트

- [ ] 페이지 9 → 17 → 9 이동 시 그룹 유지 확인
- [ ] 새로고침 후에도 그룹 정상 표시 확인
- [ ] 키보드 (←/→) 페이지 이동 시 그룹 유지 확인
- [ ] "저장된 페이지" 클릭 시 그룹 정상 표시 확인
- [ ] 탭 전환 (문제 ↔ 해설) 시 그룹 유지 확인

---

## 파일 변경 목록

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pages/PageViewer.tsx` | groupsData useEffect 의존성 수정 |

---

**승인 후 "진행해줘"로 수정을 시작합니다.**
