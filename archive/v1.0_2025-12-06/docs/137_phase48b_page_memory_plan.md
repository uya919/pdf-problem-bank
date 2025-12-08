# Phase 48-B: 탭별 페이지 기억 기능 개발 계획

## 목표
문제탭/해설탭 전환 시 마지막 작업 페이지를 기억하여 복귀 시 해당 페이지로 이동

---

## 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `PageViewer.tsx` | `onPageChange` 콜백 prop 추가 |
| `UnifiedWorkPage.tsx` | 콜백 연결 |

---

## 구현 단계

### Step 1: PageViewer에 onPageChange prop 추가

**파일:** `frontend/src/pages/PageViewer.tsx`

```typescript
interface PageViewerProps {
  // ... 기존 props
  /** Phase 48-B: 페이지 변경 시 부모에게 알림 */
  onPageChange?: (page: number) => void;
}
```

---

### Step 2: 키보드 페이지 이동 시 콜백 호출

**파일:** `frontend/src/pages/PageViewer.tsx` (handleKeyDown 내부)

```typescript
// ArrowLeft (line ~329)
if (currentPage > 0) {
  const newPage = currentPage - 1;
  setCurrentPage(newPage);
  onPageChange?.(newPage);  // 추가
}

// ArrowRight (line ~341)
if (currentPage < totalPages - 1) {
  const newPage = currentPage + 1;
  setCurrentPage(newPage);
  onPageChange?.(newPage);  // 추가
}
```

---

### Step 3: SimpleNavigation 페이지 변경 핸들러 수정

**파일:** `frontend/src/pages/PageViewer.tsx`

SimpleNavigation의 onPageChange 호출 시에도 부모 콜백 호출:

```typescript
// SimpleNavigation에 전달되는 핸들러
const handleNavigationPageChange = useCallback((page: number) => {
  setCurrentPage(page);
  onPageChange?.(page);  // 부모에게도 알림
}, [onPageChange]);
```

---

### Step 4: 무한 루프 방지

**파일:** `frontend/src/pages/PageViewer.tsx` (initialPage useEffect)

```typescript
// Phase 48-B: initialPage 변경 시 동기화 (무한 루프 방지)
useEffect(() => {
  // 부모에서 온 값이므로 onPageChange 호출하지 않음
  if (currentPage !== initialPage) {
    setCurrentPage(initialPage);
  }
}, [initialPage]);
// currentPage는 의존성에서 제외 (의도적)
```

---

### Step 5: UnifiedWorkPage에서 콜백 연결

**파일:** `frontend/src/pages/UnifiedWorkPage.tsx`

```typescript
<PageViewer
  documentId={currentDocId}
  totalPages={currentDoc.total_pages}
  initialPage={currentPage}
  onPageChange={setCurrentPage}  // 추가
  // ... 기존 props
/>
```

---

## 체크리스트

- [ ] Step 1: PageViewer props에 `onPageChange` 추가
- [ ] Step 2: 키보드 ArrowLeft/ArrowRight에서 콜백 호출
- [ ] Step 3: SimpleNavigation 핸들러에 콜백 추가
- [ ] Step 4: initialPage useEffect 무한 루프 방지
- [ ] Step 5: UnifiedWorkPage에서 콜백 연결
- [ ] 테스트: 문제탭 10p → 해설탭 → 문제탭 복귀 시 10p 확인

---

## 예상 소요 시간
약 30분

---

*작성일: 2025-12-05*
