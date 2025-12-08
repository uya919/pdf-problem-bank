# Phase 48-B: 탭별 페이지 기억 기능 분석 리포트

## 요청 사항
> 문제탭과 해설탭을 왔다갔다할 때 마지막 페이지가 저장되어야 함
> 예: 문제탭 10p → 해설탭 2p → 문제탭 복귀 시 10p 표시

---

## 1. 현재 구현 상태

### 1.1 이미 구현된 부분 (Phase 48)

| 컴포넌트 | 파일 | 구현 내용 |
|----------|------|----------|
| **백엔드 모델** | `work_session.py:82-83` | `lastProblemPage`, `lastSolutionPage` 필드 |
| **백엔드 API** | `work_sessions.py:189-192` | 페이지 업데이트 처리 |
| **프론트엔드 타입** | `client.ts:262-263` | WorkSession 타입에 필드 포함 |
| **세션 로드** | `workSessionStore.ts:278-283` | 로드 시 저장된 페이지 복원 |
| **페이지 저장** | `workSessionStore.ts:23-44` | 디바운스된 페이지 저장 함수 |

### 1.2 데이터 흐름 (설계)

```
[세션 로드]
  backend → response.lastProblemPage/lastSolutionPage
  → workSessionStore.problemPage/solutionPage 설정
  → useTabState().currentPage 계산
  → PageViewer initialPage prop 전달

[페이지 변경]
  workSessionStore.setCurrentPage(page)
  → problemPage 또는 solutionPage 업데이트
  → debouncedSavePage() → backend API 호출
```

---

## 2. 🐛 발견된 버그

### 2.1 핵심 문제: PageViewer 내부 페이지 변경이 부모에게 전달되지 않음

```typescript
// PageViewer.tsx:73 - 로컬 상태
const [currentPage, setCurrentPage] = useState(initialPage);

// PageViewer.tsx:329, 341 - 키보드 이동
setCurrentPage(currentPage - 1);  // ← PageViewer 로컬 상태만 변경!
setCurrentPage(currentPage + 1);  // ← workSessionStore에 반영 안됨
```

### 2.2 버그 재현 시나리오

```
1. 문제탭에서 10페이지로 이동 (화살표 키)
   → PageViewer.currentPage = 10 (로컬)
   → workSessionStore.problemPage = 0 (변경 안됨!)

2. 해설탭으로 전환
   → workSessionStore.activeTab = 'solution'
   → currentPage = solutionPage = 0

3. 문제탭으로 복귀
   → currentPage = problemPage = 0  ← 10이 아님!
   → PageViewer initialPage = 0
```

### 2.3 상태 흐름 다이어그램

```
┌────────────────────────────────────────────────────────────┐
│                     UnifiedWorkPage                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ workSessionStore                                     │  │
│  │   problemPage: 0  ← 업데이트 안됨!                   │  │
│  │   solutionPage: 0                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│           │                                                │
│           │ initialPage={currentPage} (=0)                 │
│           ▼                                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ PageViewer                                           │  │
│  │   currentPage: 10  ← 사용자가 여기서 이동           │  │
│  │                     (로컬 상태만 변경)              │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 3. 해결 방안

### 3.1 권장 방안: onPageChange 콜백 추가

**PageViewer에 콜백 prop 추가:**

```typescript
interface PageViewerProps {
  // ... 기존 props
  /** Phase 48-B: 페이지 변경 시 부모에게 알림 */
  onPageChange?: (page: number) => void;
}
```

**PageViewer 내부에서 페이지 변경 시 콜백 호출:**

```typescript
// 키보드 이동 시
if (currentPage > 0) {
  const newPage = currentPage - 1;
  setCurrentPage(newPage);
  onPageChange?.(newPage);  // ← 추가
}
```

**UnifiedWorkPage에서 콜백 연결:**

```typescript
<PageViewer
  initialPage={currentPage}
  onPageChange={setCurrentPage}  // workSessionStore.setCurrentPage
  // ...
/>
```

### 3.2 데이터 흐름 (수정 후)

```
[PageViewer 내부 페이지 변경]
  사용자 화살표 키 입력
  → PageViewer.setCurrentPage(newPage)
  → onPageChange?.(newPage)
  → workSessionStore.setCurrentPage(newPage)
  → problemPage/solutionPage 업데이트
  → debouncedSavePage() → 백엔드 저장

[탭 전환 시]
  activeTab 변경
  → currentPage = activeTab === 'problem' ? problemPage : solutionPage
  → PageViewer initialPage 업데이트
  → 저장된 페이지로 복귀 ✓
```

---

## 4. 구현 난이도 및 우려 사항

### 4.1 구현 난이도: ⭐⭐ (낮음)

| 항목 | 난이도 | 설명 |
|------|--------|------|
| 콜백 prop 추가 | ⭐ | 단순 인터페이스 확장 |
| 호출 지점 추가 | ⭐⭐ | 3-4곳 수정 필요 |
| 테스트 | ⭐⭐ | 탭 전환 시나리오 검증 |

### 4.2 우려 사항

#### ⚠️ 1. 무한 루프 가능성

```
initialPage 변경 → PageViewer.useEffect 실행
→ setCurrentPage(initialPage)
→ onPageChange?.(initialPage)
→ 부모 상태 변경
→ initialPage 변경 (다시 시작?)
```

**해결책:**
```typescript
// PageViewer.tsx
useEffect(() => {
  // 현재 페이지와 다를 때만 업데이트
  if (currentPage !== initialPage) {
    setCurrentPage(initialPage);
    // onPageChange는 호출하지 않음 (부모가 보낸 값이므로)
  }
}, [initialPage]);
```

#### ⚠️ 2. 양방향 동기화 복잡성

- **부모 → 자식**: `initialPage` prop
- **자식 → 부모**: `onPageChange` callback

양방향 데이터 흐름이 추적하기 어려울 수 있음.

**해결책:** 명확한 규칙 정립
- `initialPage`는 초기값 또는 탭 전환 시에만 사용
- `onPageChange`는 사용자 인터랙션에만 호출

#### ⚠️ 3. 기존 단독 사용 호환성

PageViewer가 UnifiedWorkPage 외에서 단독 사용될 때:
- `onPageChange`가 없어도 동작해야 함
- 옵셔널 체이닝 사용: `onPageChange?.(newPage)`

**영향도:** 낮음 (옵셔널 prop이므로)

#### ⚠️ 4. SimpleNavigation 컴포넌트

PageViewer 내부의 `SimpleNavigation`도 페이지 이동을 트리거할 수 있음.
해당 컴포넌트도 같이 수정 필요.

---

## 5. 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| `PageViewer.tsx` | `onPageChange` prop 추가, 호출 지점 추가 |
| `UnifiedWorkPage.tsx` | `onPageChange={setCurrentPage}` 연결 |
| `SimpleNavigation.tsx` | (필요시) 페이지 변경 콜백 전달 |

---

## 6. 구현 체크리스트

### Phase 48-B: 탭별 페이지 기억

- [ ] **A. PageViewer 수정**
  - [ ] `onPageChange?: (page: number) => void` prop 추가
  - [ ] 키보드 페이지 이동 시 `onPageChange` 호출 (line 329, 341)
  - [ ] SimpleNavigation 페이지 이동 시 `onPageChange` 호출

- [ ] **B. UnifiedWorkPage 연결**
  - [ ] `onPageChange={setCurrentPage}` prop 전달

- [ ] **C. 무한 루프 방지**
  - [ ] `initialPage` useEffect에서 `onPageChange` 호출하지 않도록 수정

- [ ] **D. 테스트**
  - [ ] 문제탭 10p → 해설탭 2p → 문제탭 복귀 시 10p 확인
  - [ ] 새로고침 후 저장된 페이지 복원 확인
  - [ ] 키보드/마우스 네비게이션 모두 동작 확인

---

## 7. 결론

### 구현 가능성: ✅ 높음

이미 Phase 48에서 백엔드 인프라(저장/로드)가 완성되어 있음.
프론트엔드에서 콜백 연결만 추가하면 됨.

### 예상 소요 시간: 30분~1시간

### 위험도: ⭐⭐ (낮음)

- 무한 루프만 주의하면 안전한 수정
- 기존 기능에 영향 없음 (옵셔널 prop)

---

*작성일: 2025-12-05*
*Phase: 48-B (탭별 페이지 기억)*
