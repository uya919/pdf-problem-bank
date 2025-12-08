# Phase 31: 페이지 네비게이션 에러 리포트

**작성일**: 2025-12-03
**Phase**: 31 (싱글 탭 매칭 시스템)
**분석자**: Claude (opus thinkharder)

---

## 1. 증상

**사용자 보고**: "PDF의 페이지가 안 넘어가는 에러가 발생"

---

## 2. 원인 분석

### 2.1 핵심 버그: 키보드 단축키 누락

**위치**: `MatchingCanvas.tsx:204-226`

```tsx
// 현재 구현 (문제 있음)
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'g' || e.key === 'G') {
      // G키: 그룹 생성
    }
    if (e.key === 'Escape') {
      // ESC: 선택 해제
    }
    // ❌ ArrowLeft, ArrowRight 핸들러가 없음!
  };
}, [selectedBlocks, handleGroupCreate]);
```

**비교: 기존 PageViewer.tsx (정상 작동)**

```tsx
// PageViewer.tsx:359-377
switch (e.key) {
  case 'ArrowLeft':
    if (currentPage > 0) {
      await saveImmediately(localGroups, currentPage);
      setCurrentPage(currentPage - 1);  // ✅ 페이지 전환
    }
    break;
  case 'ArrowRight':
    if (currentPage < totalPages - 1) {
      await saveImmediately(localGroups, currentPage);
      setCurrentPage(currentPage + 1);  // ✅ 페이지 전환
    }
    break;
}
```

### 2.2 버튼 클릭은 작동해야 함

`PageNavigation` 컴포넌트 자체는 버튼 클릭으로 `onPageChange`를 호출합니다:

```tsx
// PageNavigation.tsx:40-49
const handlePrevious = () => {
  if (currentPage > 0) {
    onPageChange(currentPage - 1);  // 직접 호출
  }
};

const handleNext = () => {
  if (currentPage < totalPages - 1) {
    onPageChange(currentPage + 1);  // 직접 호출
  }
};
```

**그러나** 사용자가 "페이지가 안 넘어간다"고 했으므로, 다른 가능성도 검토:

### 2.3 가능한 추가 원인들

#### 2.3.1 탭 전환 시 페이지 리셋 안됨

```tsx
// MatchingCanvas.tsx:63-68
useEffect(() => {
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage]);  // ❌ documentId가 deps에 없음!
```

탭 전환 시 `documentId`가 변경되지만 `currentPage`는 유지됨:
- 문제 PDF: 50페이지
- 해설 PDF: 30페이지
- 문제 탭에서 40페이지 보다가 해설 탭으로 전환
- `currentPage = 40`이지만 해설 PDF는 30페이지만 있음
- 존재하지 않는 페이지 요청 → 에러 또는 빈 화면

#### 2.3.2 totalPages prop 불일치

```tsx
// UnifiedMatchingPage.tsx:117
totalPages={activeTab === 'problem' ? (problemDoc?.totalPages || 1) : (solutionDoc?.totalPages || 1)}
```

`totalPages`는 탭에 따라 바뀌지만, `currentPage`는 `MatchingCanvas` 내부 state로 유지됨.

#### 2.3.3 CSS 레이아웃 문제

```tsx
// MatchingCanvas.tsx:228-282
<div className="h-full flex flex-col">
  <div className="flex-1 overflow-hidden bg-gray-100">
    <PageCanvas ... />
  </div>
  <PageNavigation ... />  // ← 이 영역이 보이지 않을 수 있음
</div>
```

부모 컨테이너 높이가 제대로 설정되지 않으면 `PageNavigation`이 화면 밖으로 밀려날 수 있음.

---

## 3. PDF 라벨링 전체 구조

### 3.1 기존 구조 (Phase 21까지)

```
┌─────────────────────────────────────────────────────┐
│ LabelingPage                                        │
│  ├─ Header (뒤로가기, 문서명)                        │
│  └─ PageViewer                                      │
│      ├─ PageCanvas (Konva 캔버스)                   │
│      ├─ GroupPanel (그룹 목록)                      │
│      └─ PageNavigation (페이지 전환)                │
│          ├─ 버튼: 처음/이전/다음/끝                  │
│          ├─ 입력: 페이지 번호                        │
│          └─ 진행률 바                               │
└─────────────────────────────────────────────────────┘

키보드 단축키 (PageViewer에서 처리):
- ←/→: 페이지 전환
- G: 그룹 생성
- Ctrl+S: 즉시 저장
- ESC: 선택 해제
```

### 3.2 Phase 31 새 구조 (문제 있음)

```
┌─────────────────────────────────────────────────────┐
│ UnifiedMatchingPage                                 │
│  ├─ MatchingHeader (탭 전환: 문제/해설)             │
│  └─ Main Area                                       │
│      ├─ MatchingCanvas (activeTab에 따라 문서 표시) │
│      │   ├─ PageCanvas                             │
│      │   └─ PageNavigation                         │
│      └─ ProblemListPanel (문제 목록)                │
└─────────────────────────────────────────────────────┘

키보드 단축키 (분산됨):
- 1/2: 탭 전환 (UnifiedMatchingPage)
- G: 그룹 생성 (MatchingCanvas)
- ESC: 선택 해제 (MatchingCanvas)
- ↑↓/Tab: 문제 선택 (ProblemListPanel)
- ❌ ←/→: 페이지 전환 (누락!)
```

### 3.3 데이터 흐름

```
[탭 전환]
UnifiedMatchingPage.activeTab 변경
    ↓
currentDocId = problem or solution documentId
    ↓
MatchingCanvas.documentId prop 변경
    ↓
❌ currentPage는 그대로 유지 (버그!)
    ↓
usePageBlocks(documentId, currentPage) 호출
    ↓
잘못된 페이지 데이터 요청 가능
```

---

## 4. 수정 방안

### 4.1 즉시 수정 (Critical)

#### A. 키보드 페이지 전환 추가

```tsx
// MatchingCanvas.tsx - 키보드 핸들러 수정
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // 페이지 전환 (추가)
    if (e.key === 'ArrowLeft' && currentPage > 0) {
      e.preventDefault();
      setCurrentPage(currentPage - 1);
    }
    if (e.key === 'ArrowRight' && currentPage < totalPages - 1) {
      e.preventDefault();
      setCurrentPage(currentPage + 1);
    }

    // 기존 단축키
    if ((e.key === 'g' || e.key === 'G') && selectedBlocks.length > 0) {
      handleGroupCreate(selectedBlocks);
    }
    if (e.key === 'Escape') {
      setSelectedBlocks([]);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentPage, totalPages, selectedBlocks, handleGroupCreate]);
```

#### B. documentId 변경 시 페이지 리셋

```tsx
// MatchingCanvas.tsx - documentId 변경 감지 추가
useEffect(() => {
  // 문서 변경 시 페이지 0으로 리셋
  setCurrentPage(0);
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [documentId]);  // documentId를 deps에 추가
```

### 4.2 권장 수정 (Medium)

#### C. 탭별 페이지 상태 저장

각 문서별로 마지막 페이지를 기억하도록 matchingStore에 상태 추가:

```tsx
// matchingStore.ts
interface MatchingStore {
  // ... 기존 상태
  problemCurrentPage: number;
  solutionCurrentPage: number;

  setProblemPage: (page: number) => void;
  setSolutionPage: (page: number) => void;
}
```

---

## 5. 영향 범위

| 컴포넌트 | 수정 필요 | 이유 |
|---------|----------|------|
| `MatchingCanvas.tsx` | ✅ 필수 | 키보드 단축키 + documentId 변경 처리 |
| `matchingStore.ts` | 선택 | 탭별 페이지 상태 저장 |
| `UnifiedMatchingPage.tsx` | 선택 | 페이지 상태를 store에서 관리 시 |

---

## 6. 테스트 시나리오

수정 후 확인할 사항:

1. **키보드 페이지 전환**
   - `←` 키로 이전 페이지 이동
   - `→` 키로 다음 페이지 이동
   - 첫 페이지에서 `←` 키 무시
   - 마지막 페이지에서 `→` 키 무시

2. **버튼 클릭 페이지 전환**
   - "이전" 버튼 클릭
   - "다음" 버튼 클릭
   - 페이지 번호 직접 입력

3. **탭 전환 시 페이지 처리**
   - 문제 탭에서 20페이지 보다가 해설 탭으로 전환
   - 해설 탭에서 1페이지로 리셋되어야 함
   - 다시 문제 탭으로 돌아왔을 때 동작 확인

---

## 7. 결론

**근본 원인**: `MatchingCanvas.tsx`에서 페이지 전환 키보드 단축키(`←`/`→`)가 구현되지 않음

**추가 문제**: 탭 전환 시 `documentId`가 변경되어도 `currentPage`가 리셋되지 않아 존재하지 않는 페이지를 요청할 수 있음

**수정 난이도**: ⭐⭐ (쉬움)

**예상 수정 시간**: 15분

---

*리포트 끝*
