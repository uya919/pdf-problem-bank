# Phase 38 시스템 충돌 연구 리포트

**작성일**: 2025-12-04
**상태**: 분석 완료
**우선순위**: Critical

---

## 1. 문제 요약

### 1.1 사용자 피드백
> "새롭게 만든 시스템이 마음에 들어. 그런데 기존의 문제그룹 같은 시스템이랑 조화롭지 않아.
> 기존걸 재활용하기보다는 새롭게 만든 시스템에 맞게 제거할건 제거하고 필요한것만 남겨야돼."

> "미연결 문제에서 1번 누르고 그룹핑하면 연결이 되지도 않아"

### 1.2 핵심 문제
1. **두 개의 분리된 시스템**이 병렬로 존재
2. **데이터 흐름 단절**: ProblemListPanel ↔ PageViewer 연결 없음
3. **그룹핑 → 연결 불가**: 해설 그룹핑 시 선택된 문제와 연결되지 않음

---

## 2. 시스템 아키텍처 분석

### 2.1 시스템 A: PageViewer (Phase 22 기반)

```
파일: frontend/src/pages/PageViewer.tsx

데이터 흐름:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   localGroups   │ →  │ savePageGroups  │ →  │   groups.json   │
│   (useState)    │    │   (mutation)    │    │  (로컬 파일)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

매칭 시스템:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ useAutoMatching │ →  │ BroadcastChannel│ →  │ 다른 창으로 전파│
│ (Phase 22)      │    │ useSyncChannel  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘

주요 특징:
- ProblemGroup 타입 사용
- useMatchingSession으로 세션 관리
- role: 'problem' | 'solution' 역할 기반
- 듀얼 윈도우 BroadcastChannel 동기화
```

### 2.2 시스템 B: WorkSession (Phase 32-38 기반)

```
파일: frontend/src/stores/workSessionStore.ts

데이터 흐름:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ currentSession  │ →  │  API Client     │ →  │ Backend API     │
│  (Zustand)      │    │  work-sessions  │    │ (Python)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘

매칭 시스템:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ selectedProblem │ →  │ createLink()    │ →  │ session.links[] │
│ Id (Zustand)    │    │ API 호출        │    │ (백엔드 저장)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘

주요 특징:
- ProblemReference, ProblemSolutionLink 타입 사용
- 탭 기반 통합 UI (problem/solution)
- Zustand 상태 관리
- 백엔드 영속 저장
```

### 2.3 두 시스템의 통합 시도 (UnifiedWorkPage)

```
현재 구조:

┌──────────────────────────────────────────────────────────────────┐
│                      UnifiedWorkPage                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐           ┌─────────────────────────────┐ │
│  │  ProblemListPanel │           │        PageViewer           │ │
│  │                   │           │                             │ │
│  │ ▪ workSessionStore│           │ ▪ localGroups (useState)    │ │
│  │ ▪ selectedProblem │    ❌     │ ▪ useAutoMatching           │ │
│  │   Id              │◄─────────►│ ▪ useMatchingSession        │ │
│  │ ▪ createLink()    │  연결없음  │ ▪ onSolutionLabeled()       │ │
│  │                   │           │                             │ │
│  └───────────────────┘           └─────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 흐름 단절 상세 분석

### 3.1 사용자 시나리오 (버그 재현)

```
Step 1: 미연결 문제 "1번" 클릭
        └── ProblemListPanel → workSessionStore.selectProblem("group-1")
        └── selectedProblemId = "group-1" (Zustand 상태)

Step 2: 해설 탭으로 이동
        └── setActiveTab('solution')
        └── PageViewer가 해설 문서로 전환
        └── useMatchingSession은 별개의 세션 관리

Step 3: 해설 영역 그룹핑 (G 키 또는 버튼)
        └── PageViewer.handleCreateGroup()
        └── isMatchingMode && role === 'solution' 조건 확인
        └── 문제: role이 설정되어 있지 않음! (useMatchingSession이 별개 시스템)
        └── onSolutionLabeled() 호출되지 않거나, 잘못된 context에서 호출

Step 4: 연결 실패
        └── workSessionStore.selectedProblemId와 연결되는 코드가 없음
        └── useAutoMatching.pendingProblems와도 연결 없음
```

### 3.2 코드 레벨 분석

**PageViewer.tsx:506-513**
```typescript
// Phase 22: 매칭 모드에서 그룹 생성 시 매칭 로직 호출
if (isMatchingMode && role === 'problem') {
  // 문제 창에서 그룹 생성 → 대기 목록에 추가
  onProblemLabeled(newGroup);
} else if (isMatchingMode && role === 'solution') {
  // 해설 창에서 그룹 생성 → 자동 매칭
  onSolutionLabeled(newGroup);
}
```

**문제점**:
1. `isMatchingMode`는 `useMatchingSession`에서 가져옴 (별개 시스템)
2. UnifiedWorkPage에서 PageViewer를 호출할 때 매칭 모드 정보가 전달되지 않음
3. `workSessionStore.selectedProblemId`와 연결되는 코드가 없음

**UnifiedWorkPage.tsx:336-343**
```typescript
{currentDocId && currentDoc && (
  <PageViewer
    documentId={currentDocId}
    totalPages={currentDoc.total_pages}
    initialPage={currentPage}
    key={`${currentDocId}-${activeTab}`}
  />
)}
```

**문제점**:
- PageViewer에 매칭 관련 props가 전달되지 않음
- `activeTab`, `selectedProblemId` 등 정보 누락

---

## 4. 근본 원인

### 4.1 아키텍처 불일치

| 측면 | Phase 22 시스템 | Phase 32-38 시스템 |
|------|----------------|-------------------|
| **상태 관리** | useState + BroadcastChannel | Zustand |
| **세션 개념** | useMatchingSession (창 간 동기화) | WorkSession (백엔드 영속) |
| **그룹 개념** | ProblemGroup (블록 기반) | ProblemReference (참조 기반) |
| **연결 저장** | GroupLink (groups.json 내 link 필드) | ProblemSolutionLink (별도 API) |
| **문서 모델** | 단일 문서 뷰어 | 듀얼 문서 (문제+해설) |
| **페이지 관리** | currentPage (뷰어 내부) | problemPage/solutionPage (탭별) |

### 4.2 점진적 확장의 부작용

```
Phase 22: 듀얼 윈도우 매칭 → 별개 창에서 문제/해설 동시 작업
    ↓
Phase 32: WorkSession 도입 → 백엔드 영속 저장
    ↓
Phase 33: 통합 캔버스 탭 → 하나의 창에서 탭 전환
    ↓
Phase 38: 유연한 매칭 → 새 UI 컴포넌트 추가
    ↓
결과: 두 시스템이 공존하지만 연결되지 않음
```

---

## 5. 해결 방안

### 5.1 Option A: 브릿지 패턴 (단기 수정)

```typescript
// UnifiedWorkPage에서 PageViewer에 props 전달
<PageViewer
  documentId={currentDocId}
  totalPages={currentDoc.total_pages}
  initialPage={currentPage}
  // Phase 38 통합: 매칭 정보 전달
  workSessionId={currentSession.sessionId}
  selectedProblemId={selectedProblemId}
  activeTab={activeTab}
  onLinkCreated={(problemId, solutionGroupId, solutionPageIndex) => {
    createLink({
      problemGroupId: problemId,
      solutionGroupId,
      solutionDocumentId: currentSession.solutionDocumentId,
      solutionPageIndex,
    });
  }}
/>
```

**장점**: 기존 코드 최소 수정
**단점**: 복잡도 증가, 두 시스템 유지 필요

### 5.2 Option B: 시스템 통합 (중기)

```
┌─────────────────────────────────────────────────────────────────┐
│                   통합 아키텍처                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  workSessionStore (Single Source of Truth)                       │
│  ├── currentSession                                              │
│  ├── problems[]          ◄── PageViewer.handleCreateGroup 연동   │
│  ├── links[]             ◄── 해설 그룹핑 시 자동 생성            │
│  ├── activeTab                                                   │
│  ├── selectedProblemId                                           │
│  └── ...                                                         │
│                                                                  │
│  PageViewer (Pure UI Component)                                  │
│  ├── 블록 선택/그룹 생성 UI                                      │
│  ├── 그룹 생성 시 → workSessionStore.addProblem() 호출           │
│  └── 해설 그룹 생성 시 → workSessionStore.createLink() 호출       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**장점**: 단일 시스템, 명확한 데이터 흐름
**단점**: 기존 코드 리팩토링 필요

### 5.3 Option C: 완전 리디자인 (장기, 권장)

Phase 38 설계 기반으로 새 시스템 구축:

```
제거 대상:
├── useMatchingSession.ts (Phase 22 레거시)
├── useAutoMatching.ts (Phase 22 레거시)
├── useSyncChannel.ts (BroadcastChannel 기반)
├── RoleSelector.tsx (역할 선택 모달)
├── MatchingHeader.tsx (Phase 22 헤더)
├── MatchingStatusPanel.tsx (Phase 22 상태 패널)
└── PageViewer의 Phase 22 관련 코드

유지 대상:
├── PageCanvas.tsx (블록 렌더링 - 순수 UI)
├── GroupPanel.tsx (그룹 목록 - 순수 UI)
├── PageNavigation.tsx (페이지 네비게이션 - 순수 UI)
├── workSessionStore.ts (Zustand 상태)
└── Phase 38 새 컴포넌트들

새로 구축:
├── SimplifiedPageViewer.tsx (Phase 38 전용)
│   └── 그룹 생성 → workSessionStore 직접 연동
├── MatchingWorkflow.tsx (Phase 38 매칭 플로우)
│   └── 문제 선택 → 해설 그룹핑 → 자동 연결
└── IntegratedCanvas.tsx (통합 캔버스)
    └── 탭 전환 + 사이드바 + 매칭 토스트
```

---

## 6. 권장 구현 계획

### Phase 39: 시스템 정리 및 통합

#### 39-1: PageViewer 분리 (2시간)
```
목표: PageViewer에서 Phase 22 레거시 코드 제거

작업:
1. useMatchingSession 제거
2. useAutoMatching 제거
3. role, sessionId 관련 props 제거
4. RoleSelector, MatchingHeader, MatchingStatusPanel 렌더링 제거
5. GroupLink 처리 코드 제거

결과: PageViewer는 순수 블록/그룹 편집 컴포넌트가 됨
```

#### 39-2: 통합 매칭 로직 구현 (3시간)
```
목표: workSessionStore 기반 매칭 로직

작업:
1. PageViewer에 onGroupCreated 콜백 추가
2. UnifiedWorkPage에서 콜백 처리:
   - 문제 탭: addProblem() 호출
   - 해설 탭: selectedProblemId와 createLink() 호출
3. 매칭 성공 시 다음 미연결 문제 자동 선택

결과: 그룹핑 → 연결 플로우 동작
```

#### 39-3: 자동 매칭 제안 통합 (2시간)
```
목표: Phase 38 MatchSuggestionToast 활성화

작업:
1. 해설 그룹 생성 시 useAutoMatchSuggestion.showSuggestion() 호출
2. Enter 키로 제안 승인 → createLink()
3. M 키로 ManualMatchModal 열기
4. 연결 완료 시 다음 문제 자동 선택

결과: 토스 스타일 매칭 UX
```

#### 39-4: 레거시 코드 정리 (1시간)
```
목표: 사용하지 않는 파일 제거

작업:
1. hooks/useMatchingSession.ts 삭제 (또는 deprecated 마킹)
2. hooks/useAutoMatching.ts 삭제
3. hooks/useSyncChannel.ts 삭제
4. components/matching/RoleSelector.tsx 삭제
5. components/matching/MatchingHeader.tsx 삭제
6. components/matching/MatchingStatusPanel.tsx 삭제
7. types/matching.ts에서 불필요 타입 제거

결과: 깨끗한 코드베이스
```

---

## 7. 즉시 수정 (임시 해결책)

가장 빠른 해결책: **UnifiedWorkPage에서 해설 그룹 생성 이벤트 처리**

```typescript
// UnifiedWorkPage.tsx에 추가

// PageViewer에 콜백 전달
<PageViewer
  documentId={currentDocId}
  totalPages={currentDoc.total_pages}
  initialPage={currentPage}
  // NEW: 그룹 생성 콜백
  onGroupCreated={handleGroupCreated}
/>

// 그룹 생성 핸들러
const handleGroupCreated = useCallback(async (group: ProblemGroup, pageIndex: number) => {
  if (activeTab === 'solution' && selectedProblemId) {
    // 해설 탭에서 그룹 생성 + 문제 선택된 상태 → 자동 연결
    try {
      await createLink({
        problemGroupId: selectedProblemId,
        solutionGroupId: group.id,
        solutionDocumentId: currentSession.solutionDocumentId,
        solutionPageIndex: pageIndex,
      });
      selectNextUnlinkedProblem();
      showToast('매칭 완료!');
    } catch (error) {
      console.error('Link creation failed:', error);
    }
  }
}, [activeTab, selectedProblemId, createLink, selectNextUnlinkedProblem]);
```

---

## 8. 결론

### 문제의 본질
Phase 22(듀얼 윈도우)와 Phase 32-38(통합 세션) 두 시스템이 **독립적으로 발전**하면서 **데이터 흐름이 단절**됨.

### 권장 방향
1. **단기**: Option A (브릿지) 또는 즉시 수정으로 기능 동작 확보
2. **중기**: Option B (통합)으로 시스템 일원화
3. **장기**: Option C (리디자인)으로 깨끗한 아키텍처

### 핵심 원칙
- **Single Source of Truth**: workSessionStore가 유일한 상태 소스
- **Props Down, Events Up**: PageViewer는 순수 UI, 이벤트로 상위에 알림
- **Phase 22 레거시 제거**: BroadcastChannel 기반 코드 정리

---

*연구 완료: 2025-12-04*
