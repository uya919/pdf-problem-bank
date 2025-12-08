# PDF 라벨링 시스템 - UI/UX 및 안정성 종합 리뷰

**문서 번호**: 230
**작성일**: 2025-12-07
**목적**: UI/UX 철학 및 안정성 관점 종합 분석

---

## Executive Summary

시스템은 **토스(Toss) 디자인 시스템을 기반으로 일관된 UI**를 제공하고 있으며, 핵심 기능은 안정적으로 동작합니다. 그러나 **Race Condition, 동기화 불일치, 접근성 부족** 등 개선이 필요한 영역이 식별되었습니다.

---

## 1. UI/UX 분석

### 1.1 강점 ✅

| 항목 | 설명 |
|------|------|
| **일관된 디자인** | 토스 디자인 시스템 적용 (colors, spacing, typography) |
| **피드백 시스템** | Toast 알림으로 사용자 액션 결과 전달 |
| **시각적 계층** | 그룹 컬러, 선택 상태, 확정 표시 구분 명확 |
| **애니메이션** | framer-motion으로 부드러운 전환 |
| **키보드 단축키** | P키(XP), U키(해제), F키(확정) 등 생산성 향상 |

### 1.2 개선 필요 영역 ⚠️

#### A. 일관성 (Consistency)

| 문제 | 위치 | 권장 조치 |
|------|------|----------|
| 매직 넘버 | PageCanvas.tsx, GroupPanel.tsx | 상수 파일로 추출 |
| 에러 메시지 불일치 | 각 API 호출부 | 에러 메시지 표준화 |
| 버튼 스타일 혼재 | 여러 컴포넌트 | 공통 버튼 컴포넌트 사용 |

```typescript
// 현재: 매직 넘버
const DEBOUNCE_DELAY = 300;
const BLOCK_PADDING = 2;

// 권장: 상수 파일
// constants/ui.ts
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  BLOCK_PADDING: 2,
  TOAST_DURATION: 3000,
  AUTO_SAVE_DELAY: 1000,
};
```

#### B. 에러 예방 (Error Prevention)

| 문제 | 위치 | 권장 조치 |
|------|------|----------|
| 페이지 이탈 시 저장 확인 없음 | PageViewer.tsx | beforeunload 이벤트 핸들러 추가 |
| 위험 작업 확인 부족 | 삭제, 초기화 | 확인 모달 추가 |
| 동시 편집 감지 없음 | 전체 | Optimistic Lock 또는 알림 |

```typescript
// 권장: 페이지 이탈 방지
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '저장되지 않은 변경사항이 있습니다.';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

#### C. 접근성 (Accessibility)

| 문제 | 위치 | 권장 조치 |
|------|------|----------|
| aria-label 부족 | 아이콘 버튼들 | aria-label 추가 |
| 키보드 네비게이션 불완전 | 모달, 드롭다운 | focus trap 구현 |
| 색상 대비 일부 부족 | 비활성 상태 | WCAG AA 기준 충족 |

```typescript
// 현재
<button onClick={handleDelete}>
  <Trash2 size={16} />
</button>

// 권장
<button
  onClick={handleDelete}
  aria-label="그룹 삭제"
  title="그룹 삭제"
>
  <Trash2 size={16} />
</button>
```

#### D. 피드백 (Feedback)

| 문제 | 위치 | 권장 조치 |
|------|------|----------|
| 로딩 상태 불일치 | API 호출부 | 글로벌 로딩 인디케이터 |
| 저장 상태 불명확 | 자동 저장 | "저장 중...", "저장됨" 표시 |
| 에러 복구 가이드 없음 | 에러 발생 시 | 재시도 버튼, 도움말 링크 |

---

## 2. 안정성 분석

### 2.1 Critical Issues 🔴

#### Issue 1: Race Condition - 페이지 전환

**위치**: PageViewer.tsx lines 280-320

```typescript
// 문제: 페이지 전환 시 이전 페이지 저장과 새 페이지 로드가 경쟁
const handlePageChange = async (newPage: number) => {
  await saveGroups();  // ← 이전 페이지 저장
  setCurrentPage(newPage);  // ← 새 페이지로 전환
  // 새 페이지 데이터 로드...
  // ⚠️ saveGroups 완료 전에 setCurrentPage 실행될 수 있음
};
```

**권장 해결책**:
```typescript
const handlePageChange = async (newPage: number) => {
  setIsPageChanging(true);
  try {
    await saveGroups();
    setCurrentPage(newPage);
  } finally {
    setIsPageChanging(false);
  }
};
```

#### Issue 2: 동기화 불일치 - groups.json vs WorkSession

**위치**:
- export.py (groups.json 기반)
- work_sessions.py (session.problems 기반)

```
groups.json에 그룹 존재 → session.problems에 없음
→ Export 가능하지만 세션 목록에 안 보임

session.problems에 존재 → groups.json에서 삭제됨
→ 세션 목록에 보이지만 Export 실패
```

**권장 해결책**: 단일 소스 of Truth 확립
```python
# Option A: groups.json을 SSOT로
# Export 및 세션 목록 모두 groups.json에서 읽기

# Option B: 동기화 검증 API
@router.post("/documents/{document_id}/validate-sync")
async def validate_sync(document_id: str):
    """groups.json과 session.problems 일치 여부 검증"""
    pass
```

#### Issue 3: API 타임아웃 처리 부재

**위치**: 모든 API 호출부

```typescript
// 현재: 타임아웃 없음
const response = await fetch('/api/documents');

// 권장: 타임아웃 추가
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch('/api/documents', {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

### 2.2 High Priority Issues 🟠

#### Issue 4: 이미지 로드 취소 처리

**위치**: PageCanvas.tsx

```typescript
// 현재: 취소 처리 없음
useEffect(() => {
  const img = new Image();
  img.onload = () => setLoadedImage(img);
  img.src = imageUrl;
}, [imageUrl]);

// 권장: 취소 처리 추가
useEffect(() => {
  let cancelled = false;
  const img = new Image();
  img.onload = () => {
    if (!cancelled) setLoadedImage(img);
  };
  img.src = imageUrl;
  return () => { cancelled = true; };
}, [imageUrl]);
```

#### Issue 5: Optimistic Update 미적용

**위치**: 그룹 생성/삭제 시

```typescript
// 현재: 서버 응답 후 UI 업데이트
const handleCreateGroup = async () => {
  await saveGroups(newGroups);  // 서버 저장
  setLocalGroups(newGroups);     // UI 업데이트
};

// 권장: Optimistic Update
const handleCreateGroup = async () => {
  const previousGroups = localGroups;
  setLocalGroups(newGroups);     // UI 즉시 업데이트
  try {
    await saveGroups(newGroups);
  } catch {
    setLocalGroups(previousGroups);  // 실패 시 롤백
    toast.error('저장 실패, 다시 시도해주세요');
  }
};
```

### 2.3 Medium Priority Issues 🟡

| 문제 | 위치 | 설명 |
|------|------|------|
| 컴포넌트 비대화 | PageViewer.tsx (1335줄) | 500줄 이하로 분리 |
| useState 과다 | PageViewer.tsx (17개) | useReducer로 통합 |
| 메모이제이션 부족 | GroupPanel.tsx | useMemo, useCallback 적용 |
| 에러 바운더리 없음 | 전체 | ErrorBoundary 컴포넌트 추가 |

---

## 3. 코드 정리 대상

### 3.1 미사용 코드

| 파일 | 코드 | 상태 |
|------|------|------|
| PageViewer.tsx | `isDebugMode` 상태 | 삭제 가능 |
| GroupPanel.tsx | 레거시 Phase 코드 | 삭제 가능 |
| workSessionStore.ts | 미사용 액션 | 삭제 가능 |

### 3.2 중복 코드

| 위치 | 중복 내용 | 권장 조치 |
|------|----------|----------|
| export.py | 이미지 처리 로직 3곳 | 공통 함수 추출 |
| blocks.py, pdf.py | 파일 경로 생성 로직 | utils 함수로 추출 |
| GroupPanel.tsx | displayName 생성 | 유틸리티 함수 추출 |

### 3.3 리팩토링 대상

```
PageViewer.tsx (1335줄)
├── PageViewerContainer.tsx  // 메인 컨테이너
├── PageViewerHeader.tsx     // 상단 네비게이션
├── PageViewerCanvas.tsx     // 캔버스 영역
├── PageViewerSidebar.tsx    // 사이드바
└── usePageViewerState.ts    // 상태 관리 훅
```

---

## 4. 우선순위별 액션 플랜

### 4.1 즉시 조치 (CRITICAL)

| # | 항목 | 파일 | 예상 시간 |
|---|------|------|----------|
| 1 | Race Condition 수정 | PageViewer.tsx | 1시간 |
| 2 | 동기화 검증 API | work_sessions.py | 1시간 |
| 3 | API 타임아웃 추가 | api/client.ts | 30분 |

### 4.2 단기 개선 (HIGH)

| # | 항목 | 파일 | 예상 시간 |
|---|------|------|----------|
| 4 | 이미지 로드 취소 | PageCanvas.tsx | 30분 |
| 5 | 접근성 개선 | 전체 버튼/모달 | 2시간 |
| 6 | Optimistic Update | 그룹 CRUD | 1시간 |
| 7 | 페이지 이탈 방지 | PageViewer.tsx | 30분 |

### 4.3 중기 개선 (MEDIUM)

| # | 항목 | 파일 | 예상 시간 |
|---|------|------|----------|
| 8 | PageViewer 분리 | PageViewer.tsx | 3시간 |
| 9 | Toast 표준화 | 전체 | 1시간 |
| 10 | 상수 파일 추출 | 전체 | 1시간 |
| 11 | ErrorBoundary | App.tsx | 1시간 |

---

## 5. 품질 메트릭 목표

### 현재 상태 → 목표

| 메트릭 | 현재 | 목표 |
|--------|------|------|
| 안정성 점수 | 6.1/10 | 8.0/10 |
| 최대 파일 크기 | 1335줄 | 500줄 |
| useState 수 (PageViewer) | 17개 | 5개 이하 |
| 접근성 (WCAG) | 미측정 | AA 준수 |
| 테스트 커버리지 | 0% | 60% |

---

## 6. 결론

### 강점
- 토스 디자인 시스템 기반 일관된 UI
- 핵심 라벨링 기능 완성도 높음
- 키보드 단축키로 생산성 향상

### 개선 필요
- Race Condition 및 동기화 문제 해결 (CRITICAL)
- 접근성 및 에러 처리 강화 (HIGH)
- 컴포넌트 분리 및 코드 정리 (MEDIUM)

### 권장 진행 순서
1. **Phase 59**: CRITICAL 이슈 3개 해결 (2.5시간)
2. **Phase 60**: HIGH 이슈 4개 해결 (4시간)
3. **Phase 61**: MEDIUM 이슈 4개 해결 (6시간)

---

*작성: Claude Code*
