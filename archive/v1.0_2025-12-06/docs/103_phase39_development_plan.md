# Phase 39: 단계별 개발 계획

**작성일**: 2025-12-04
**총 예상 시간**: 8.5시간
**상태**: 계획 완료

---

## Phase 39-1: PageViewer 레거시 제거 (2시간)

### 목표
PageViewer에서 Phase 22 관련 코드를 모두 제거하여 순수 라벨링 컴포넌트로 변환

### 작업 체크리스트

```
□ Step 1.1: 레거시 import 제거 (10분)
  - useMatchingSession import 제거
  - useAutoMatching import 제거
  - RoleSelector import 제거
  - MatchingHeader import 제거
  - MatchingStatusPanel import 제거

□ Step 1.2: 레거시 훅 호출 제거 (20분)
  - useMatchingSession() 호출 및 관련 변수 제거
    - sessionId, role, isMatchingMode, isRolePreset, setRole, endSession
  - useAutoMatching() 호출 및 관련 변수 제거
    - pendingProblems, matchedPairs, nextPendingNumber 등
  - 관련 핸들러 함수 제거
    - handleAutoName, handleLinkGroup, handleNavigateToLinked, handleUnlinkGroup

□ Step 1.3: 레거시 상태 제거 (10분)
  - showRoleSelector useState 제거
  - role 관련 useEffect 제거

□ Step 1.4: 레거시 조건문 단순화 (30분)
  - isMatchingMode 조건 분기 제거
  - role === 'problem' / 'solution' 분기 제거
  - showGroupPanel 조건 단순화 (항상 true)
  - handleCreateGroup에서 매칭 로직 제거
    - onProblemLabeled(newGroup) 호출 제거
    - onSolutionLabeled(newGroup) 호출 제거

□ Step 1.5: 레거시 렌더링 제거 (20분)
  - MatchingHeader 컴포넌트 렌더링 제거
  - RoleSelector 컴포넌트 렌더링 제거
  - MatchingStatusPanel 컴포넌트 렌더링 제거

□ Step 1.6: Props 인터페이스 정리 (10분)
  - PageViewerProps 정리 (불필요한 props 제거)

□ Step 1.7: TypeScript 검증 (20분)
  - npx tsc --noEmit 실행
  - 타입 에러 수정
```

### 결과 확인
```bash
# TypeScript 검증
cd frontend && npx tsc --noEmit

# 브라우저 테스트
# - PageViewer가 정상 렌더링되는지 확인
# - 블록 선택 및 그룹 생성이 동작하는지 확인
```

---

## Phase 39-2: 콜백 인터페이스 추가 (1시간)

### 목표
PageViewer에 이벤트 콜백을 추가하여 상위 컴포넌트가 그룹 이벤트를 수신할 수 있게 함

### 작업 체크리스트

```
□ Step 2.1: Props 인터페이스 확장 (10분)

  interface PageViewerProps {
    documentId: string;
    totalPages: number;
    initialPage?: number;  // 추가: 초기 페이지

    // Phase 39: 이벤트 콜백
    onGroupCreated?: (group: ProblemGroup, pageIndex: number) => void;
    onGroupDeleted?: (groupId: string, pageIndex: number) => void;
    onGroupUpdated?: (group: ProblemGroup, pageIndex: number) => void;
    onPageChange?: (pageIndex: number) => void;
  }

□ Step 2.2: handleCreateGroup에 콜백 연결 (15분)

  const handleCreateGroup = async () => {
    // ... 기존 그룹 생성 로직 ...

    // Phase 39: 상위 컴포넌트에 알림
    onGroupCreated?.(newGroup, currentPage);
  };

□ Step 2.3: handleDeleteGroup에 콜백 연결 (10분)

  const handleDeleteGroup = (groupId: string) => {
    // ... 기존 삭제 로직 ...

    // Phase 39: 상위 컴포넌트에 알림
    onGroupDeleted?.(groupId, currentPage);
  };

□ Step 2.4: handleUpdateGroupInfo에 콜백 연결 (10분)

  const handleUpdateGroupInfo = async (groupId: string, problemInfo: ProblemInfo) => {
    // ... 기존 업데이트 로직 ...

    // Phase 39: 상위 컴포넌트에 알림
    const updatedGroup = updatedGroups.find(g => g.id === groupId);
    if (updatedGroup) {
      onGroupUpdated?.(updatedGroup, currentPage);
    }
  };

□ Step 2.5: 페이지 변경 콜백 연결 (10분)

  // setCurrentPage 호출 시 콜백 추가
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onPageChange?.(newPage);
  };

□ Step 2.6: TypeScript 검증 (5분)
  - npx tsc --noEmit 실행
```

### 결과 확인
```typescript
// PageViewer 사용 예시
<PageViewer
  documentId="doc-1"
  totalPages={100}
  onGroupCreated={(group, page) => console.log('Created:', group.id)}
  onGroupDeleted={(id, page) => console.log('Deleted:', id)}
/>
```

---

## Phase 39-3: UnifiedWorkPage 통합 (3시간)

### 목표
그룹 이벤트를 workSessionStore와 연결하고 매칭 UI 통합

### 작업 체크리스트

```
□ Step 3.1: 필요한 import 추가 (10분)

  import { useAutoMatchSuggestion } from '@/hooks/useAutoMatchSuggestion';
  import {
    MatchSuggestionToast,
    NoMatchToast,
    ManualMatchModal,
    MatchingCompleteView
  } from '@/components/matching';

□ Step 3.2: 자동 매칭 제안 훅 연결 (20분)

  const {
    suggestion,
    showSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    requestManualMatch,
    hasUnlinkedProblems,
  } = useAutoMatchSuggestion();

□ Step 3.3: 수동 매칭 모달 상태 추가 (10분)

  const [manualMatchState, setManualMatchState] = useState<{
    isOpen: boolean;
    solutionGroupId: string;
    solutionName: string;
    solutionPageIndex: number;
  } | null>(null);

□ Step 3.4: handleGroupCreated 핸들러 구현 (40분)

  const handleGroupCreated = useCallback(async (
    group: ProblemGroup,
    pageIndex: number
  ) => {
    if (activeTab === 'problem') {
      // 문제 탭: workSession에 문제 등록
      try {
        await addProblem({
          groupId: group.id,
          pageIndex,
          problemNumber: group.problemInfo?.problemNumber || group.id,
          displayName: group.problemInfo?.displayName,
        });
        console.log('[Phase 39] Problem registered:', group.id);
      } catch (error) {
        console.error('[Phase 39] Failed to register problem:', error);
      }

    } else if (activeTab === 'solution') {
      // 해설 탭: 매칭 제안 표시
      const solutionName = group.problemInfo?.problemNumber || group.id;
      showSuggestion(group.id, solutionName);

      // 현재 해설 정보 저장 (수동 매칭용)
      setManualMatchState({
        isOpen: false,
        solutionGroupId: group.id,
        solutionName,
        solutionPageIndex: pageIndex,
      });
    }
  }, [activeTab, addProblem, showSuggestion]);

□ Step 3.5: 매칭 승인 핸들러 구현 (20분)

  const handleAcceptMatch = useCallback(async () => {
    if (!suggestion?.suggestedProblem || !manualMatchState) return;

    const accepted = await acceptSuggestion(
      currentSession!.solutionDocumentId!,
      manualMatchState.solutionPageIndex
    );

    if (accepted) {
      setManualMatchState(null);
    }
  }, [suggestion, manualMatchState, acceptSuggestion, currentSession]);

□ Step 3.6: 수동 매칭 핸들러 구현 (20분)

  const handleManualMatch = useCallback(() => {
    requestManualMatch();
    if (manualMatchState) {
      setManualMatchState({
        ...manualMatchState,
        isOpen: true,
      });
    }
  }, [requestManualMatch, manualMatchState]);

  const handleManualMatchComplete = useCallback((problemId: string) => {
    setManualMatchState(null);
  }, []);

□ Step 3.7: PageViewer에 콜백 전달 (10분)

  <PageViewer
    documentId={currentDocId}
    totalPages={currentDoc.total_pages}
    initialPage={currentPage}
    onGroupCreated={handleGroupCreated}
    onPageChange={setCurrentPage}
    key={`${currentDocId}-${activeTab}`}
  />

□ Step 3.8: MatchSuggestionToast 렌더링 추가 (15분)

  {/* 매칭 제안 토스트 */}
  <MatchSuggestionToast
    suggestion={suggestion}
    onAccept={handleAcceptMatch}
    onManual={handleManualMatch}
    onDismiss={dismissSuggestion}
  />

□ Step 3.9: ManualMatchModal 렌더링 추가 (15분)

  {/* 수동 매칭 모달 */}
  {manualMatchState?.isOpen && (
    <ManualMatchModal
      isOpen={true}
      solutionGroupId={manualMatchState.solutionGroupId}
      solutionName={manualMatchState.solutionName}
      solutionDocumentId={currentSession!.solutionDocumentId!}
      solutionPageIndex={manualMatchState.solutionPageIndex}
      onClose={() => setManualMatchState(null)}
      onLinked={handleManualMatchComplete}
    />
  )}

□ Step 3.10: 완료 화면 조건부 렌더링 (15분)

  // 모든 문제 매칭 완료 시 완료 화면 표시
  const isAllMatched = progress.total > 0 && progress.linked === progress.total;

  {isAllMatched && (
    <MatchingCompleteView
      sessionName={currentSession?.name}
      onComplete={() => navigate('/')}
      onReview={() => setActiveTab('problem')}
    />
  )}

□ Step 3.11: TypeScript 검증 (15분)
  - npx tsc --noEmit 실행
  - 타입 에러 수정
```

### 결과 확인
```
테스트 시나리오:
1. 문제 탭에서 그룹 생성 → 좌측 목록에 추가되는지 확인
2. 해설 탭으로 전환 → 동기화 실행
3. 해설 그룹 생성 → 토스트 표시 확인
4. Enter 키 → 매칭 승인 및 다음 문제 선택
5. M 키 → 수동 매칭 모달 열림
```

---

## Phase 39-4: 레거시 파일 제거 (30분)

### 목표
사용하지 않는 Phase 22 레거시 파일 삭제

### 작업 체크리스트

```
□ Step 4.1: 레거시 훅 삭제 (10분)

  삭제할 파일:
  - frontend/src/hooks/useMatchingSession.ts
  - frontend/src/hooks/useAutoMatching.ts
  - frontend/src/hooks/useSyncChannel.ts
  - frontend/src/hooks/useDualWindowLauncher.ts

□ Step 4.2: 레거시 컴포넌트 삭제 (10분)

  삭제할 파일:
  - frontend/src/components/matching/RoleSelector.tsx
  - frontend/src/components/matching/MatchingHeader.tsx
  - frontend/src/components/matching/MatchingStatusPanel.tsx
  - frontend/src/components/matching/PopupBlockedModal.tsx
  - frontend/src/components/matching/LinkedBadge.tsx
  - frontend/src/components/matching/PairConfirmDialog.tsx
  - frontend/src/components/matching/DocumentMergeAnimation.tsx
  - frontend/src/components/matching/DocumentPairCard.tsx

□ Step 4.3: index.ts export 정리 (5분)

  // components/matching/index.ts
  // 삭제된 컴포넌트 export 제거

  export { DualUploadCard } from './DualUploadCard';
  export { DualDocumentSelector } from './DualDocumentSelector';

  // Phase 38: 유연한 매칭 워크플로우
  export { ProblemListPanel } from './ProblemListPanel';
  export { MatchingTabHeader } from './MatchingTabHeader';
  export { MatchSuggestionToast, NoMatchToast } from './MatchSuggestionToast';
  export { ManualMatchModal } from './ManualMatchModal';
  export { MatchingCompleteView } from './MatchingCompleteView';

□ Step 4.4: TypeScript 검증 (5분)
  - npx tsc --noEmit 실행
  - 삭제된 파일 참조 에러 수정 (있다면)
```

### 결과 확인
```bash
# 삭제 확인
ls frontend/src/hooks/ | grep -E "(useMatchingSession|useAutoMatching|useSyncChannel)"
# 결과: 파일 없음

# TypeScript 검증
cd frontend && npx tsc --noEmit
```

---

## Phase 39-5: 테스트 및 버그 수정 (2시간)

### 목표
전체 플로우를 테스트하고 발견된 버그 수정

### 테스트 체크리스트

```
□ Test 5.1: 기본 라벨링 (20분)
  - [ ] 문서 업로드
  - [ ] 작업 세션 생성
  - [ ] 문제 탭에서 블록 선택
  - [ ] G 키로 그룹 생성
  - [ ] 그룹이 좌측 패널에 표시
  - [ ] 그룹 정보 편집
  - [ ] 그룹 삭제

□ Test 5.2: 탭 전환 (15분)
  - [ ] 해설 탭으로 전환
  - [ ] 동기화 실행 확인
  - [ ] 해설 문서 로드
  - [ ] 문제 탭으로 돌아가기

□ Test 5.3: 자동 매칭 (20분)
  - [ ] 해설 탭에서 그룹 생성
  - [ ] 토스트 표시 확인
  - [ ] Enter로 승인
  - [ ] 다음 문제 자동 선택
  - [ ] 진행률 업데이트

□ Test 5.4: 수동 매칭 (15분)
  - [ ] 해설 그룹 생성
  - [ ] M 키로 수동 모달 열기
  - [ ] 문제 검색
  - [ ] 문제 선택 및 연결
  - [ ] 모달 닫힘 확인

□ Test 5.5: 키보드 단축키 (15분)
  - [ ] 1 키: 문제 탭
  - [ ] 2 키: 해설 탭
  - [ ] ↑↓: 문제 선택
  - [ ] G: 그룹 생성
  - [ ] Enter: 매칭 승인
  - [ ] M: 수동 매칭
  - [ ] Esc: 선택 해제/닫기

□ Test 5.6: 완료 플로우 (10분)
  - [ ] 모든 문제 매칭
  - [ ] 완료 화면 표시
  - [ ] 검토 버튼 동작
  - [ ] 완료 버튼 동작

□ Test 5.7: 데이터 영속성 (15분)
  - [ ] 페이지 새로고침
  - [ ] 세션 데이터 유지
  - [ ] 문제 목록 유지
  - [ ] 연결 정보 유지

□ Test 5.8: 버그 수정 (30분)
  - 발견된 버그 목록화
  - 버그 수정
  - 재테스트
```

### 버그 수정 템플릿

```markdown
### Bug #1: [버그 제목]
- **증상**:
- **재현 방법**:
- **원인**:
- **해결**:
- **파일**:
```

---

## 최종 검증

### 코드 품질 검증

```bash
# TypeScript 검증
cd frontend && npx tsc --noEmit

# 사용하지 않는 파일 확인
# (삭제된 파일에 대한 import 에러가 없어야 함)

# 빌드 테스트
npm run build
```

### 기능 검증 체크리스트

```
□ 문제 라벨링 → 세션에 등록
□ 해설 라벨링 → 자동 매칭 제안
□ Enter 승인 → 연결 생성
□ M 수동 → 모달에서 선택
□ 진행률 실시간 업데이트
□ 완료 시 축하 화면
□ 데이터 영속 저장
```

---

## 롤백 계획

문제 발생 시 롤백 방법:

```bash
# Git으로 이전 상태 복원
git stash  # 현재 작업 임시 저장
git checkout HEAD~1 -- frontend/src/pages/PageViewer.tsx
git checkout HEAD~1 -- frontend/src/pages/UnifiedWorkPage.tsx

# 또는 전체 롤백
git reset --hard HEAD~1
```

---

*계획 완료: 2025-12-04*
