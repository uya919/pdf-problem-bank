# Phase 38: 유연한 매칭 워크플로우 개발 계획

**작성일**: 2025-12-04
**기반 문서**: [99_flexible_matching_workflow_report.md](99_flexible_matching_workflow_report.md)
**예상 소요**: 23시간 (3일)

---

## 목표

3가지 매칭 시나리오를 모두 지원하는 통합 워크플로우 구현:

| 시나리오 | 설명 | 예시 |
|---------|------|------|
| **1:1 즉시** | 문제 1개 → 해설 1개 | 실시간 확인 |
| **페이지 배치** | 10p 7개 → 해설 7개 | 한 페이지 집중 |
| **멀티페이지** | 10~12p 30개 → 해설 30개 | 대량 작업 |

---

## Phase 38-1: 데이터 모델 확장 (2시간)

### 목표
WorkSessionStore에 탭 상태 및 매칭 관리 기능 추가

### 변경 파일
- `frontend/src/stores/workSessionStore.ts`

### Step 1-1: 타입 정의 확장

```typescript
// 기존 WorkSession 인터페이스에 추가
interface WorkSession {
  // ... 기존 필드

  // Phase 38 추가
  activeTab: 'problem' | 'solution';  // 현재 활성 탭
  problemPage: number;                 // 문제 탭 현재 페이지
  solutionPage: number;                // 해설 탭 현재 페이지
  matchingMode: 'auto' | 'manual';     // 매칭 모드
}
```

### Step 1-2: 스토어 상태 추가

```typescript
interface WorkSessionState {
  // ... 기존 상태

  // Phase 38: 탭/페이지 상태
  activeTab: 'problem' | 'solution';
  problemPage: number;
  solutionPage: number;
  selectedProblemId: string | null;  // 수동 매칭용 선택된 문제
  matchingMode: 'auto' | 'manual';
}
```

### Step 1-3: 파생 상태 계산 함수

```typescript
// 미연결 문제 목록
function getUnlinkedProblems(): ProblemReference[] {
  const { currentSession } = get();
  if (!currentSession) return [];

  const linkedIds = new Set(currentSession.links.map(l => l.problemGroupId));
  return currentSession.problems.filter(p => !linkedIds.has(p.groupId));
}

// 매칭 진행률
function getMatchingProgress(): { current: number; total: number; percent: number } {
  const { currentSession } = get();
  if (!currentSession) return { current: 0, total: 0, percent: 0 };

  const total = currentSession.problems.length;
  const current = currentSession.links.length;
  return {
    current,
    total,
    percent: total > 0 ? Math.round((current / total) * 100) : 0
  };
}
```

### Step 1-4: 탭/페이지 액션 추가

```typescript
// 탭 전환
setActiveTab: (tab: 'problem' | 'solution') => void;

// 탭별 페이지 설정
setTabPage: (tab: 'problem' | 'solution', page: number) => void;

// 현재 탭의 페이지 가져오기
getCurrentTabPage: () => number;

// 문제 선택 (수동 매칭용)
selectProblemForMatch: (problemId: string | null) => void;

// 다음 미연결 문제 자동 선택
selectNextUnlinkedProblem: () => void;
```

### Step 1-5: 백엔드 API 타입 업데이트

`frontend/src/api/client.ts`:
```typescript
// WorkSession 타입에 새 필드 추가
interface WorkSession {
  // ... 기존 필드
  activeTab?: 'problem' | 'solution';
  problemPage?: number;
  solutionPage?: number;
  matchingMode?: 'auto' | 'manual';
}
```

### 검증 기준
- [ ] 탭 전환 시 페이지 번호가 독립적으로 유지됨
- [ ] 미연결 문제 목록이 정확하게 계산됨
- [ ] 진행률이 실시간으로 업데이트됨

---

## Phase 38-2: 문제 목록 패널 (3시간)

### 목표
좌측 사이드바에 미연결/연결 문제 목록 표시

### 생성 파일
- `frontend/src/components/matching/ProblemListPanel.tsx`
- `frontend/src/components/matching/ProblemItem.tsx`
- `frontend/src/components/matching/LinkedPairItem.tsx`

### Step 2-1: ProblemListPanel 기본 구조

```
┌─────────────────────┐
│  미연결 문제 (4)    │
├─────────────────────┤
│ ○ 1번              │
│ ○ 2번              │
│ ▶ 3번 ← 선택됨     │
│ ○ 4번              │
├─────────────────────┤
│  매칭 완료 (8)      │
├─────────────────────┤
│ ⬤ 5번 ↔ 5번       │
│ ⬤ 6번 ↔ 6번       │
│ ⬤ 7번 ↔ 7번       │
│ ⬤ 8번 ↔ 8번       │
└─────────────────────┘
```

### Step 2-2: ProblemItem 컴포넌트

```typescript
interface ProblemItemProps {
  problem: ProblemReference;
  isSelected: boolean;
  isLinked: boolean;
  linkedSolution?: string;
  onSelect: () => void;
  onUnlink?: () => void;
}
```

상태별 UI:
- **미연결 (○)**: 회색 원, 클릭하면 선택
- **선택됨 (▶)**: 파란색 화살표, 현재 매칭 대상
- **연결됨 (⬤)**: 초록색 원, 호버 시 [해제] 버튼

### Step 2-3: 키보드 네비게이션

```typescript
// ↑↓: 문제 선택 이동
// Enter: 선택 확정
// Delete/Backspace: 연결 해제 (연결된 경우)
```

### Step 2-4: 스타일링 (토스 스타일)

```css
/* 패널 배경 */
.problem-list-panel {
  background: var(--grey-50);
  border-right: 1px solid var(--grey-100);
  width: 240px;
}

/* 섹션 헤더 */
.section-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--grey-600);
}

/* 문제 아이템 */
.problem-item {
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.problem-item:hover {
  background: var(--grey-100);
}

.problem-item.selected {
  background: var(--toss-blue-50);
  border-left: 3px solid var(--toss-blue);
}
```

### 검증 기준
- [ ] 미연결/연결 문제가 정확하게 분류됨
- [ ] 클릭으로 문제 선택 가능
- [ ] 키보드로 목록 탐색 가능
- [ ] 연결된 문제에서 해제 버튼 동작

---

## Phase 38-3: 탭 헤더 개선 (2시간)

### 목표
문제/해설 탭 전환 및 진행률 표시

### 변경 파일
- `frontend/src/pages/UnifiedWorkPage.tsx`
- `frontend/src/components/matching/MatchingTabHeader.tsx` (신규)

### Step 3-1: MatchingTabHeader 컴포넌트

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 매칭 작업: 베이직쎈 고1                        [🖥️ 분리]  │
│  진행률: ████████░░░░ 8/12 (67%)                               │
├─────────────────────────────────────────────────────────────────┤
│  [◉ 문제]  [ 해설]                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Step 3-2: 탭 버튼 상태

```typescript
interface TabButtonProps {
  label: string;
  isActive: boolean;
  count?: number;  // 해당 탭의 그룹 수
  onClick: () => void;
}
```

### Step 3-3: 진행률 바

```typescript
interface ProgressBarProps {
  current: number;
  total: number;
}

// UI: "8/12 (67%)" + 그래프 바
```

### Step 3-4: 단축키 연동

```typescript
// 1: 문제 탭
// 2: 해설 탭
// Tab: 다음 탭
// Shift+Tab: 이전 탭
```

### Step 3-5: 분리 버튼 (듀얼 윈도우)

```typescript
// [분리] 클릭 시:
// - 현재 해설 탭을 새 창으로 분리
// - BroadcastChannel로 동기화
// - 기존 Phase 22 로직 활용
```

### 검증 기준
- [ ] 탭 클릭으로 전환 동작
- [ ] 단축키(1, 2, Tab)로 전환 동작
- [ ] 진행률이 실시간 반영
- [ ] 분리 버튼 동작 (선택적)

---

## Phase 38-4: 자동 매칭 제안 UI (3시간)

### 목표
해설 그룹핑 시 자동으로 문제 번호 매칭 제안

### 생성 파일
- `frontend/src/components/matching/MatchSuggestionToast.tsx`
- `frontend/src/hooks/useAutoMatchSuggestion.ts`

### Step 4-1: 자동 매칭 알고리즘

```typescript
function suggestMatch(
  solutionGroupName: string,
  unlinkedProblems: ProblemReference[]
): ProblemReference | null {
  // 1. 해설 이름에서 문제 번호 추출
  const number = extractProblemNumber(solutionGroupName);

  // 2. 번호 일치하는 미연결 문제 찾기
  if (number) {
    const match = unlinkedProblems.find(
      p => p.problemNumber === number
    );
    if (match) return match;
  }

  // 3. 없으면 FIFO (첫 번째 미연결 문제)
  return unlinkedProblems[0] || null;
}
```

### Step 4-2: 문제 번호 추출 정규식

```typescript
function extractProblemNumber(text: string): string | null {
  const patterns = [
    /(\d+)번/,         // "3번"
    /문제\s*(\d+)/,    // "문제 3"
    /^(\d+)$/,         // "3"
    /\[(\d+)\]/,       // "[3]"
    /p(\d+)/i,         // "P3"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}
```

### Step 4-3: MatchSuggestionToast UI

```
┌─────────────────────────────────────┐
│ ✅ "3번" 문제와 자동 연결           │
│                                     │
│ [Enter] 승인    [M] 수동 선택       │
└─────────────────────────────────────┘
```

- 해설 그룹핑 직후 화면 하단에 표시
- 3초 후 자동 사라짐 (사용자 입력 시 즉시 처리)

### Step 4-4: 키보드 인터랙션

```typescript
// Enter: 제안 승인 → 링크 생성
// M: 수동 매칭 모달 열기
// Escape: 제안 무시 (매칭 안함)
```

### Step 4-5: 훅 통합

```typescript
function useAutoMatchSuggestion() {
  const [suggestion, setSuggestion] = useState<{
    solutionGroupId: string;
    suggestedProblem: ProblemReference | null;
    isVisible: boolean;
  } | null>(null);

  const showSuggestion = (solutionGroupId: string) => {
    const unlinked = getUnlinkedProblems();
    const suggested = suggestMatch(solutionGroupName, unlinked);
    setSuggestion({ solutionGroupId, suggestedProblem: suggested, isVisible: true });
  };

  const acceptSuggestion = () => { /* ... */ };
  const openManualMatch = () => { /* ... */ };
  const dismissSuggestion = () => { /* ... */ };

  return { suggestion, showSuggestion, acceptSuggestion, openManualMatch, dismissSuggestion };
}
```

### 검증 기준
- [ ] 해설 그룹핑 시 자동 제안 표시
- [ ] Enter로 승인 동작
- [ ] M으로 수동 모달 열림
- [ ] 번호 추출 정확도 확인

---

## Phase 38-5: 수동 매칭 모달 (3시간)

### 목표
자동 매칭이 틀렸을 때 사용자가 직접 문제 선택

### 생성 파일
- `frontend/src/components/matching/ManualMatchModal.tsx`

### Step 5-1: 모달 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 수동 매칭                                       [X] 닫기   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  해설 그룹: "3번" (방금 생성)                                  │
│                                                                 │
│  연결할 문제를 선택하세요:                                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ 1번 - 베이직쎈_p10_1번                               │   │
│  │ ○ 2번 - 베이직쎈_p10_2번                               │   │
│  │ ◉ 3번 - 베이직쎈_p10_3번  ← 제안                       │   │
│  │ ○ 4번 - 베이직쎈_p11_4번                               │   │
│  │ ○ 5번 - 베이직쎈_p11_5번                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [🔗 연결] (Enter)              [✕ 취소] (Esc)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 5-2: 문제 목록 필터링

```typescript
interface ManualMatchModalProps {
  solutionGroupId: string;
  solutionName: string;
  suggestedProblemId?: string;
  onMatch: (problemId: string) => void;
  onCancel: () => void;
}
```

### Step 5-3: 검색/필터 기능

```typescript
// 검색창: 문제 번호로 필터링
// "3" 입력 → "3번", "13번", "23번" 등 필터됨
```

### Step 5-4: 키보드 네비게이션

```typescript
// ↑↓: 선택 이동
// Enter: 연결 확정
// Escape: 취소
// 숫자 입력: 검색
```

### Step 5-5: 썸네일 미리보기 (선택적)

```typescript
// 문제 항목 호버 시 썸네일 표시
// 동일 번호가 여러 개일 때 구분용
```

### 검증 기준
- [ ] 모달 열림/닫힘 동작
- [ ] 라디오 버튼 선택 동작
- [ ] Enter로 연결 확정
- [ ] 제안된 항목 하이라이트

---

## Phase 38-6: 페이지 네비게이션 독립화 (2시간)

### 목표
문제/해설 탭별로 페이지 번호 독립 관리

### 변경 파일
- `frontend/src/pages/UnifiedWorkPage.tsx`
- `frontend/src/stores/workSessionStore.ts`

### Step 6-1: 탭별 페이지 상태 분리

```typescript
// 기존: 단일 currentPage
// 변경: problemPage, solutionPage 분리

const currentPage = activeTab === 'problem'
  ? problemPage
  : solutionPage;
```

### Step 6-2: 페이지 전환 핸들러 수정

```typescript
function handlePageChange(newPage: number) {
  // 현재 탭의 페이지만 변경
  setTabPage(activeTab, newPage);
}
```

### Step 6-3: 탭 전환 시 페이지 복원

```typescript
function handleTabChange(tab: 'problem' | 'solution') {
  // 1. 현재 탭 그룹 자동 저장
  await saveCurrentPageGroups();

  // 2. 탭 전환
  setActiveTab(tab);

  // 3. 해당 탭의 저장된 페이지로 복원 (자동)
}
```

### Step 6-4: PageViewer 리팩토링

```typescript
// documentId 동적 결정
const documentId = activeTab === 'problem'
  ? currentSession.problemDocumentId
  : currentSession.solutionDocumentId;
```

### 검증 기준
- [ ] 탭 전환 후 이전 페이지 번호 유지
- [ ] 문제/해설 독립적으로 페이지 이동 가능
- [ ] 문제 10페이지 → 해설 50페이지 시나리오 동작

---

## Phase 38-7: 링크 관리 통합 (2시간)

### 목표
문제-해설 연결 생성/삭제 로직 통합

### 변경 파일
- `frontend/src/stores/workSessionStore.ts`
- `backend/app/routers/work_sessions.py`

### Step 7-1: createLink 액션

```typescript
async function createLink(problemGroupId: string, solutionGroupId: string) {
  const { currentSession } = get();

  // 1. 로컬 상태 업데이트
  const newLink: ProblemSolutionLink = {
    problemGroupId,
    solutionGroupId,
    solutionDocumentId: currentSession.solutionDocumentId,
    solutionPageIndex: getCurrentTabPage(),
    createdAt: new Date().toISOString()
  };

  set(state => ({
    currentSession: {
      ...state.currentSession!,
      links: [...state.currentSession!.links, newLink]
    }
  }));

  // 2. 백엔드 API 호출
  await api.createLink(currentSession.sessionId, newLink);

  // 3. 다음 미연결 문제 자동 선택
  selectNextUnlinkedProblem();
}
```

### Step 7-2: removeLink 액션

```typescript
async function removeLink(problemGroupId: string) {
  const { currentSession } = get();

  // 1. 로컬 상태 업데이트
  set(state => ({
    currentSession: {
      ...state.currentSession!,
      links: state.currentSession!.links.filter(
        l => l.problemGroupId !== problemGroupId
      )
    }
  }));

  // 2. 백엔드 API 호출
  await api.removeLink(currentSession.sessionId, problemGroupId);
}
```

### Step 7-3: 백엔드 API 확장

```python
# POST /api/work-sessions/{session_id}/links
@router.post("/{session_id}/links")
async def create_link(session_id: str, link: ProblemSolutionLink):
    # 세션 로드
    # links 배열에 추가
    # 세션 저장
    # (선택) groups.json에 link 속성 추가
    pass

# DELETE /api/work-sessions/{session_id}/links/{problem_group_id}
@router.delete("/{session_id}/links/{problem_group_id}")
async def remove_link(session_id: str, problem_group_id: str):
    # 세션 로드
    # links 배열에서 제거
    # 세션 저장
    pass
```

### 검증 기준
- [ ] 링크 생성 후 미연결 목록 업데이트
- [ ] 링크 삭제 후 미연결 목록에 복원
- [ ] 백엔드와 동기화 확인

---

## Phase 38-8: 완료 화면 (1시간)

### 목표
모든 문제 매칭 완료 시 축하 화면

### 생성 파일
- `frontend/src/components/matching/MatchingCompleteView.tsx`

### Step 8-1: 완료 조건

```typescript
const isComplete = unlinkedProblems.length === 0 &&
                   currentSession.problems.length > 0;
```

### Step 8-2: 완료 화면 UI

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🎉                                           │
│                                                                 │
│              매칭 작업이 완료되었어요!                          │
│                                                                 │
│              12개 문제 · 12개 해설 연결됨                       │
│                                                                 │
│       ┌──────────────┐    ┌──────────────┐                     │
│       │  📋 검토하기  │    │  ✓ 완료     │                     │
│       └──────────────┘    └──────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Step 8-3: 미완료 경고

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ 3개 문제가 아직 연결되지 않았습니다                         │
│                                                                 │
│  미연결: 8번, 9번, 10번                                         │
│                                                                 │
│       ┌──────────────┐    ┌──────────────────┐                 │
│       │  계속 작업   │    │  미연결로 완료    │                 │
│       └──────────────┘    └──────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### 검증 기준
- [ ] 모든 문제 연결 시 완료 화면 표시
- [ ] 미연결 문제 있으면 경고 표시
- [ ] 검토/완료 버튼 동작

---

## Phase 38-9: 듀얼 윈도우 호환성 (2시간)

### 목표
기존 듀얼 윈도우 모드 유지 및 호환

### 변경 파일
- `frontend/src/hooks/useAutoMatching.ts`
- `frontend/src/pages/UnifiedWorkPage.tsx`

### Step 9-1: 모드 전환

```typescript
// 싱글 윈도우 → 듀얼 윈도우
function handleSplitWindow() {
  // 해설 탭을 새 창으로 열기
  window.open(
    `/work/${sessionId}?mode=solution`,
    'solution-window',
    'width=800,height=600'
  );
}

// 듀얼 윈도우 → 싱글 윈도우
// (새 창 닫으면 자동으로 싱글 모드)
```

### Step 9-2: BroadcastChannel 동기화 유지

```typescript
// 기존 Phase 22 로직 유지
// 듀얼 윈도우 모드에서만 활성화
```

### Step 9-3: 모드별 UI 분기

```typescript
if (isDualWindowMode) {
  // 기존 듀얼 윈도우 UI
} else {
  // 새로운 싱글 윈도우 UI (탭 기반)
}
```

### 검증 기준
- [ ] [분리] 버튼으로 듀얼 윈도우 전환
- [ ] 듀얼 윈도우에서 매칭 동작
- [ ] 창 닫으면 싱글 모드 복귀

---

## Phase 38-10: 테스트 및 버그 수정 (3시간)

### 테스트 시나리오

#### 시나리오 1: 1:1 즉시 매칭
```
1. 세션 생성
2. 문제 탭에서 1번 그룹핑
3. 해설 탭 전환
4. 해설 1번 그룹핑
5. 자동 제안 → Enter 승인
6. 2~5번 반복
7. 완료 화면 확인
```

#### 시나리오 2: 페이지 배치 매칭
```
1. 문제 탭에서 10페이지의 7개 문제 모두 그룹핑
2. 해설 탭 전환
3. 해설 20~22페이지 탐색하며 7개 해설 그룹핑
4. 각 해설마다 자동 제안 승인
5. 완료 화면 확인
```

#### 시나리오 3: 멀티페이지 배치 매칭
```
1. 문제 탭에서 10~12페이지 30개 문제 그룹핑
2. 해설 탭 전환
3. 해설 20~25페이지 30개 해설 그룹핑
4. 각 해설마다 자동 제안 승인
5. 완료 화면 확인
```

### 에지 케이스 테스트

| 케이스 | 예상 동작 |
|--------|----------|
| 문제 번호 중복 (1-1, 1-2) | 수동 매칭 모달로 구분 |
| 해설만 있음 (문제 없음) | "매칭할 문제 없음" 경고 |
| 문제만 있음 (해설 없음) | 완료 시 미연결 경고 |
| 순서 다름 (1,2,3 vs 2,1,3) | 번호 기반 매칭으로 정상 동작 |
| 그룹 삭제 | 관련 링크 자동 삭제 |

### 검증 기준
- [ ] 3가지 시나리오 모두 정상 동작
- [ ] 에지 케이스 처리 확인
- [ ] 성능 테스트 (100개 문제)
- [ ] 키보드 워크플로우 테스트

---

## 일정 요약

| Phase | 작업 | 예상 시간 | 누적 |
|-------|------|----------|------|
| 38-1 | 데이터 모델 확장 | 2시간 | 2시간 |
| 38-2 | 문제 목록 패널 | 3시간 | 5시간 |
| 38-3 | 탭 헤더 개선 | 2시간 | 7시간 |
| 38-4 | 자동 매칭 제안 | 3시간 | 10시간 |
| 38-5 | 수동 매칭 모달 | 3시간 | 13시간 |
| 38-6 | 페이지 네비게이션 | 2시간 | 15시간 |
| 38-7 | 링크 관리 통합 | 2시간 | 17시간 |
| 38-8 | 완료 화면 | 1시간 | 18시간 |
| 38-9 | 듀얼 윈도우 호환 | 2시간 | 20시간 |
| 38-10 | 테스트 | 3시간 | 23시간 |

---

## 의존성 그래프

```
Phase 38-1 (데이터 모델)
    │
    ├──→ Phase 38-2 (문제 목록)
    │        │
    │        └──→ Phase 38-5 (수동 매칭)
    │
    ├──→ Phase 38-3 (탭 헤더)
    │        │
    │        └──→ Phase 38-6 (페이지 네비게이션)
    │
    └──→ Phase 38-4 (자동 매칭)
             │
             └──→ Phase 38-7 (링크 관리)
                      │
                      ├──→ Phase 38-8 (완료 화면)
                      │
                      └──→ Phase 38-9 (듀얼 윈도우)
                               │
                               └──→ Phase 38-10 (테스트)
```

---

## 롤백 계획

문제 발생 시:
1. Phase 38 변경 사항 revert
2. 기존 UnifiedWorkPage로 복원
3. 기존 듀얼 윈도우 모드만 사용

---

*작성자: Claude Code*
