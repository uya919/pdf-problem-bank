# Phase 39: 완전 리디자인 연구 리포트

**작성일**: 2025-12-04
**상태**: 설계 완료
**목표**: Phase 38 기반 통합 시스템으로 전환

---

## 1. 리디자인 원칙

### 1.1 핵심 철학

```
┌─────────────────────────────────────────────────────────────────┐
│  "하나의 진실 소스, 단순한 데이터 흐름"                          │
│                                                                  │
│  1. workSessionStore = Single Source of Truth                    │
│  2. 컴포넌트는 순수 UI (상태 없음)                               │
│  3. 이벤트 위임 (Props Down, Events Up)                          │
│  4. 레거시 제거 (Phase 22 BroadcastChannel 시스템)               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 목표 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│                        UnifiedWorkPage                            │
│  (세션 로딩, 탭 관리, 키보드 단축키)                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │ ProblemList │  │    LabelingCanvas    │  │  MatchingPanel  │  │
│  │   Panel     │  │                      │  │   (조건부)      │  │
│  │             │  │  ┌────────────────┐  │  │                 │  │
│  │ - 미연결    │  │  │  PageCanvas    │  │  │ - 제안 토스트   │  │
│  │ - 연결됨    │  │  │  (블록 렌더)   │  │  │ - 수동 모달     │  │
│  │ - 진행률    │  │  └────────────────┘  │  │ - 완료 화면     │  │
│  │             │  │  ┌────────────────┐  │  │                 │  │
│  │             │  │  │  GroupPanel    │  │  │                 │  │
│  │             │  │  │  (그룹 목록)   │  │  │                 │  │
│  │             │  │  └────────────────┘  │  │                 │  │
│  └─────────────┘  └──────────────────────┘  └─────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    BottomBar (미연결 문제)                 │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 코드 분류

### 2.1 제거 대상 (Phase 22 레거시)

| 파일 | 이유 |
|------|------|
| `hooks/useMatchingSession.ts` | BroadcastChannel 세션 관리, WorkSession으로 대체 |
| `hooks/useAutoMatching.ts` | 듀얼 윈도우 매칭, 단일 창 통합으로 불필요 |
| `hooks/useSyncChannel.ts` | BroadcastChannel 동기화, 불필요 |
| `hooks/useDualWindowLauncher.ts` | 팝업 창 실행, 불필요 |
| `components/matching/RoleSelector.tsx` | 역할 선택 모달, 탭으로 대체 |
| `components/matching/MatchingHeader.tsx` | Phase 22 헤더, 새 헤더로 대체 |
| `components/matching/MatchingStatusPanel.tsx` | Phase 22 상태, 새 패널로 대체 |
| `components/matching/PopupBlockedModal.tsx` | 팝업 차단 안내, 불필요 |
| `components/matching/LinkedBadge.tsx` | 연결 뱃지, 새 UI로 대체 |
| `components/matching/PairConfirmDialog.tsx` | 매칭 확인, 새 토스트로 대체 |
| `components/matching/DocumentMergeAnimation.tsx` | 애니메이션, 불필요 |
| `components/matching/DocumentPairCard.tsx` | 문서 쌍 카드, 새 UI로 대체 |
| `types/matching.ts` | 레거시 타입 정의 (부분 제거) |

### 2.2 유지 대상 (순수 UI)

| 파일 | 역할 |
|------|------|
| `components/PageCanvas.tsx` | 블록 렌더링, 선택/드래그 |
| `components/GroupPanel.tsx` | 그룹 목록 표시, 편집/삭제 |
| `components/PageNavigation.tsx` | 페이지 이동 UI |
| `components/Toast.tsx` | 토스트 알림 |
| `components/DocumentSettingsModal.tsx` | 문서 설정 |
| `components/SyncIndicator.tsx` | 동기화 상태 표시 |

### 2.3 신규 유지 (Phase 38)

| 파일 | 역할 |
|------|------|
| `components/matching/ProblemListPanel.tsx` | 좌측 문제 목록 |
| `components/matching/MatchingTabHeader.tsx` | 탭 헤더 |
| `components/matching/MatchSuggestionToast.tsx` | 매칭 제안 토스트 |
| `components/matching/ManualMatchModal.tsx` | 수동 매칭 모달 |
| `components/matching/MatchingCompleteView.tsx` | 완료 화면 |
| `hooks/useAutoMatchSuggestion.ts` | 자동 매칭 제안 로직 |

### 2.4 수정 대상

| 파일 | 수정 내용 |
|------|----------|
| `pages/PageViewer.tsx` | Phase 22 코드 제거, 순수 라벨링 뷰어로 변환 |
| `pages/UnifiedWorkPage.tsx` | 매칭 로직 통합, 콜백 연결 |
| `stores/workSessionStore.ts` | 그룹 생성 시 자동 등록 액션 추가 |
| `api/client.ts` | 레거시 매칭 API 제거 |

---

## 3. 새로운 데이터 흐름

### 3.1 그룹 생성 → 문제 등록 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  사용자: 블록 선택 후 G 키                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PageCanvas.onGroupCreate(selectedBlocks)                        │
│  → LabelingCanvas.handleCreateGroup()                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UnifiedWorkPage.onGroupCreated(group, pageIndex)                │
│                                                                  │
│  if (activeTab === 'problem') {                                  │
│    // 1. groups.json에 저장 (기존 로직)                          │
│    await saveGroup(group)                                        │
│    // 2. workSession에 문제 등록                                 │
│    await addProblem({                                            │
│      groupId: group.id,                                          │
│      pageIndex,                                                  │
│      problemNumber: group.problemInfo?.problemNumber             │
│    })                                                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  workSessionStore 업데이트                                       │
│  → currentSession.problems[] 에 추가                             │
│  → ProblemListPanel 자동 리렌더                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 해설 그룹 생성 → 자동 매칭 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  사용자: 해설 탭에서 블록 선택 후 G 키                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  UnifiedWorkPage.onGroupCreated(group, pageIndex)                │
│                                                                  │
│  if (activeTab === 'solution') {                                 │
│    // 1. groups.json에 저장                                      │
│    await saveGroup(group)                                        │
│                                                                  │
│    // 2. 자동 매칭 제안 표시                                     │
│    const suggestion = suggestMatch(group.problemInfo?.name)      │
│    showMatchSuggestion({                                         │
│      solutionGroupId: group.id,                                  │
│      solutionName: group.problemInfo?.problemNumber,             │
│      suggestedProblem: suggestion                                │
│    })                                                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  MatchSuggestionToast 표시                                       │
│  "3번 해설" → "3번 문제와 연결할까요?"                           │
│                                                                  │
│  [Enter] 승인  [M] 수동 선택  [Esc] 닫기                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   [Enter 승인]          [M 수동]              [Esc 닫기]
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐    ┌────────────┐
│ createLink() │    │ ManualMatchModal │    │   무시     │
│ → links[]    │    │ → 문제 선택     │    │            │
│ 업데이트     │    │ → createLink()  │    │            │
└──────────────┘    └──────────────────┘    └────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  selectNextUnlinkedProblem()                                     │
│  → 다음 미연결 문제 자동 선택                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 새로운 컴포넌트 설계

### 4.1 SimplifiedPageViewer (PageViewer 대체)

```typescript
// pages/SimplifiedPageViewer.tsx

interface SimplifiedPageViewerProps {
  documentId: string;
  pageIndex: number;
  totalPages: number;

  // 이벤트 콜백 (상위 컴포넌트로 위임)
  onGroupCreated: (group: ProblemGroup, pageIndex: number) => void;
  onGroupDeleted: (groupId: string, pageIndex: number) => void;
  onGroupUpdated: (group: ProblemGroup, pageIndex: number) => void;
  onPageChange: (newPage: number) => void;
}

/**
 * 순수 라벨링 뷰어
 *
 * 책임:
 * - 페이지 이미지 표시
 * - 블록 렌더링 및 선택
 * - 그룹 생성/편집/삭제 UI
 *
 * 제거된 것:
 * - useMatchingSession (레거시)
 * - useAutoMatching (레거시)
 * - role 개념 (레거시)
 * - BroadcastChannel 동기화 (레거시)
 */
export function SimplifiedPageViewer({...}: SimplifiedPageViewerProps) {
  // 로컬 상태 (UI만)
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);

  // 그룹 생성
  const handleCreateGroup = useCallback(() => {
    const newGroup = createGroup(selectedBlocks);
    setLocalGroups(prev => [...prev, newGroup]);

    // 상위로 이벤트 전달 (매칭/저장은 상위에서)
    onGroupCreated(newGroup, pageIndex);
  }, [selectedBlocks, pageIndex, onGroupCreated]);

  return (
    <div className="flex gap-6">
      <PageCanvas
        blocks={blocks}
        groups={localGroups}
        selectedBlocks={selectedBlocks}
        onBlockSelect={setSelectedBlocks}
        onGroupCreate={handleCreateGroup}
      />
      <GroupPanel
        groups={localGroups}
        onDelete={handleDeleteGroup}
        onUpdate={handleUpdateGroup}
      />
    </div>
  );
}
```

### 4.2 IntegratedMatchingPage (UnifiedWorkPage 대체)

```typescript
// pages/IntegratedMatchingPage.tsx

/**
 * 통합 매칭 페이지
 *
 * 책임:
 * - 세션 관리 (로드/저장)
 * - 탭 전환 (문제/해설)
 * - 그룹 생성 이벤트 처리
 * - 매칭 로직 조율
 * - 키보드 단축키
 */
export function IntegratedMatchingPage() {
  const { sessionId } = useParams();

  // Zustand 스토어
  const {
    currentSession,
    loadSession,
    addProblem,
    createLink,
    selectNextUnlinkedProblem,
  } = useWorkSessionStore();

  const { activeTab, selectedProblemId } = useTabState();
  const unlinkedProblems = useUnlinkedProblems();

  // Phase 38: 자동 매칭 제안
  const {
    suggestion,
    showSuggestion,
    acceptSuggestion,
    dismissSuggestion,
  } = useAutoMatchSuggestion();

  // 수동 매칭 모달
  const [manualMatchModal, setManualMatchModal] = useState<{
    isOpen: boolean;
    solutionGroupId: string;
    solutionName: string;
  } | null>(null);

  // 그룹 생성 핸들러
  const handleGroupCreated = useCallback(async (
    group: ProblemGroup,
    pageIndex: number
  ) => {
    if (activeTab === 'problem') {
      // 문제 탭: 문제 등록
      await addProblem({
        groupId: group.id,
        pageIndex,
        problemNumber: group.problemInfo?.problemNumber || group.id,
        displayName: group.problemInfo?.displayName,
      });

    } else if (activeTab === 'solution') {
      // 해설 탭: 매칭 제안 표시
      showSuggestion(group.id, group.problemInfo?.problemNumber || '');
    }
  }, [activeTab, addProblem, showSuggestion]);

  // 매칭 승인
  const handleAcceptMatch = useCallback(async () => {
    if (!suggestion?.suggestedProblem) return;

    await createLink({
      problemGroupId: suggestion.suggestedProblem.groupId,
      solutionGroupId: suggestion.solutionGroupId,
      solutionDocumentId: currentSession.solutionDocumentId,
      solutionPageIndex: currentPage,
    });

    dismissSuggestion();
    selectNextUnlinkedProblem();
  }, [suggestion, createLink, dismissSuggestion, selectNextUnlinkedProblem]);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 + 탭 */}
      <Header ... />

      {/* 메인 영역 */}
      <div className="flex-1 flex">
        {/* 좌측 사이드바 */}
        <ProblemListPanel />

        {/* 캔버스 */}
        <SimplifiedPageViewer
          documentId={currentDocId}
          pageIndex={currentPage}
          onGroupCreated={handleGroupCreated}
        />
      </div>

      {/* 하단 바 */}
      <BottomBar unlinkedProblems={unlinkedProblems} />

      {/* 매칭 제안 토스트 */}
      <MatchSuggestionToast
        suggestion={suggestion}
        onAccept={handleAcceptMatch}
        onManual={() => setManualMatchModal({...})}
        onDismiss={dismissSuggestion}
      />

      {/* 수동 매칭 모달 */}
      {manualMatchModal && (
        <ManualMatchModal
          isOpen={manualMatchModal.isOpen}
          solutionGroupId={manualMatchModal.solutionGroupId}
          onClose={() => setManualMatchModal(null)}
        />
      )}
    </div>
  );
}
```

---

## 5. 상태 관리 개선

### 5.1 workSessionStore 확장

```typescript
// stores/workSessionStore.ts 추가 액션

interface WorkSessionStore {
  // ... 기존 상태 ...

  // Phase 39: 그룹 생성 통합
  registerGroupAsProblem: (data: {
    documentId: string;
    pageIndex: number;
    group: ProblemGroup;
  }) => Promise<void>;

  // Phase 39: 해설 그룹 생성 시 자동 매칭
  matchSolutionGroup: (data: {
    solutionGroupId: string;
    solutionPageIndex: number;
    problemGroupId: string;  // 선택된 문제 또는 자동 제안
  }) => Promise<void>;
}

// 구현
registerGroupAsProblem: async ({ documentId, pageIndex, group }) => {
  const { currentSession, addProblem } = get();
  if (!currentSession) return;

  // 1. 백엔드에 문제 등록
  await addProblem({
    groupId: group.id,
    pageIndex,
    problemNumber: group.problemInfo?.problemNumber || group.id,
    displayName: group.problemInfo?.displayName,
  });

  console.log('[Phase 39] Group registered as problem:', group.id);
},

matchSolutionGroup: async ({ solutionGroupId, solutionPageIndex, problemGroupId }) => {
  const { currentSession, createLink, selectNextUnlinkedProblem } = get();
  if (!currentSession) return;

  // 1. 연결 생성
  await createLink({
    problemGroupId,
    solutionGroupId,
    solutionDocumentId: currentSession.solutionDocumentId!,
    solutionPageIndex,
  });

  // 2. 다음 문제 선택
  selectNextUnlinkedProblem();

  console.log('[Phase 39] Solution matched:', solutionGroupId, '→', problemGroupId);
},
```

---

## 6. 구현 단계

### Phase 39-1: PageViewer 정리 (2시간)

```
목표: PageViewer에서 Phase 22 레거시 제거

작업:
□ useMatchingSession 호출 제거
□ useAutoMatching 호출 제거
□ role, sessionId 관련 코드 제거
□ RoleSelector 렌더링 제거
□ MatchingHeader 렌더링 제거
□ MatchingStatusPanel 렌더링 제거
□ isMatchingMode 조건문 단순화
□ onProblemLabeled, onSolutionLabeled 호출 제거

결과: PageViewer는 순수 라벨링 컴포넌트
```

### Phase 39-2: 콜백 인터페이스 추가 (1시간)

```
목표: PageViewer에 이벤트 콜백 추가

작업:
□ Props 인터페이스에 onGroupCreated 추가
□ Props 인터페이스에 onGroupDeleted 추가
□ Props 인터페이스에 onGroupUpdated 추가
□ handleCreateGroup에서 onGroupCreated 호출
□ handleDeleteGroup에서 onGroupDeleted 호출
□ handleUpdateGroupInfo에서 onGroupUpdated 호출

결과: 상위 컴포넌트가 그룹 이벤트 수신 가능
```

### Phase 39-3: UnifiedWorkPage 통합 (3시간)

```
목표: 그룹 이벤트 → 세션 업데이트 연결

작업:
□ handleGroupCreated 핸들러 구현
  - 문제 탭: addProblem 호출
  - 해설 탭: showSuggestion 호출
□ PageViewer에 콜백 전달
□ MatchSuggestionToast 통합
□ ManualMatchModal 통합
□ 키보드 단축키 (Enter, M, Esc) 처리

결과: 그룹 생성 → 매칭 플로우 동작
```

### Phase 39-4: 레거시 파일 제거 (30분)

```
목표: 사용하지 않는 파일 삭제

작업:
□ hooks/useMatchingSession.ts 삭제
□ hooks/useAutoMatching.ts 삭제
□ hooks/useSyncChannel.ts 삭제
□ hooks/useDualWindowLauncher.ts 삭제
□ components/matching/RoleSelector.tsx 삭제
□ components/matching/MatchingHeader.tsx 삭제
□ components/matching/MatchingStatusPanel.tsx 삭제
□ components/matching/PopupBlockedModal.tsx 삭제
□ components/matching/LinkedBadge.tsx 삭제
□ components/matching/PairConfirmDialog.tsx 삭제
□ components/matching/DocumentMergeAnimation.tsx 삭제
□ components/matching/DocumentPairCard.tsx 삭제
□ types/matching.ts에서 레거시 타입 제거

결과: 깨끗한 코드베이스
```

### Phase 39-5: 테스트 및 버그 수정 (2시간)

```
목표: 전체 플로우 테스트

테스트 시나리오:
□ 문제 탭에서 그룹 생성 → 문제 목록에 추가
□ 해설 탭 전환 → 동기화 실행
□ 해설 그룹 생성 → 매칭 제안 토스트 표시
□ Enter 키 → 자동 매칭 승인
□ M 키 → 수동 매칭 모달
□ 모든 문제 매칭 → 완료 화면
□ 페이지 새로고침 → 상태 유지

결과: 안정적인 매칭 워크플로우
```

---

## 7. 예상 결과

### 7.1 Before (현재)

```
UnifiedWorkPage
├── ProblemListPanel (workSessionStore)
└── PageViewer
    ├── useMatchingSession ─── BroadcastChannel ─── 다른 창
    ├── useAutoMatching ────── pendingProblems ─── 별도 관리
    └── localGroups ────────── groups.json ──────── 파일 저장

문제: 두 시스템이 연결되지 않음
```

### 7.2 After (리디자인 후)

```
IntegratedMatchingPage
├── workSessionStore (Single Source of Truth)
│   ├── currentSession.problems[]
│   └── currentSession.links[]
│
├── ProblemListPanel
│   └── useUnlinkedProblems() → problems[] 구독
│
├── SimplifiedPageViewer
│   └── onGroupCreated → handleGroupCreated
│
├── MatchSuggestionToast
│   └── suggestion → acceptSuggestion → createLink
│
└── ManualMatchModal
    └── onLinked → createLink

결과: 단일 데이터 흐름, 명확한 책임 분리
```

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 세션 호환성 | 이전 세션 데이터 사용 불가 | 마이그레이션 스크립트 또는 재작업 필요 |
| 듀얼 윈도우 기능 상실 | 두 화면 동시 작업 불가 | 탭 전환으로 대체 (더 간단) |
| 그룹 저장 중복 | groups.json + session API | 점진적 통합, 중복 허용 후 제거 |
| TypeScript 에러 | 타입 불일치 | 단계별 수정, tsc 검증 |

---

## 9. 마일스톤

| 단계 | 목표 | 예상 시간 |
|------|------|----------|
| 39-1 | PageViewer 레거시 제거 | 2시간 |
| 39-2 | 콜백 인터페이스 | 1시간 |
| 39-3 | UnifiedWorkPage 통합 | 3시간 |
| 39-4 | 레거시 파일 제거 | 30분 |
| 39-5 | 테스트 및 수정 | 2시간 |
| **합계** | | **8.5시간** |

---

*연구 완료: 2025-12-04*
