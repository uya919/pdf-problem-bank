# Phase 62-C/D: 파일 분리 개발 계획

**작성일**: 2025-12-07
**목적**: 대형 파일 모듈화로 유지보수성 향상

---

## 현재 상태

| 파일 | 줄 수 | 권장 | 초과 |
|------|-------|------|------|
| PageViewer.tsx | 1,350줄 | 300줄 | +1,050줄 |
| GroupPanel.tsx | 821줄 | 300줄 | +521줄 |
| **총합** | **2,171줄** | 600줄 | +1,571줄 |

---

## Phase 62-C: PageViewer.tsx 분리 (2시간)

### 분리 대상 분석

| 섹션 | 라인 범위 | 줄 수 | 분리 파일 |
|------|----------|-------|-----------|
| 키보드 단축키 | 492-692 | ~200줄 | `usePageViewerKeyboard.ts` |
| 크로스페이지 로직 | 908-1070 | ~160줄 | `usePageViewerCrossPage.ts` |
| 모문제 모드 로직 | 579-685 + 산발 | ~150줄 | `usePageViewerParentProblem.ts` |
| 그룹 CRUD | 717-890 | ~170줄 | `usePageViewerGroups.ts` |

### Step 62-C-1: usePageViewerKeyboard.ts (45분)

**위치**: `frontend/src/hooks/usePageViewerKeyboard.ts`

**추출 대상**:
```typescript
// 라인 492-692: handleKeyDown 함수 전체
const handleKeyDown = async (e: KeyboardEvent) => {
  // Ctrl+S: 즉시 저장
  // ArrowLeft/Right: 페이지 이동
  // G/Enter: 그룹 생성
  // Delete/Backspace: 그룹 삭제
  // Escape: 모드 취소
  // P: 크로스 페이지 모드
  // M: 모문제 생성
  // L: 하위문제 생성
};
```

**인터페이스**:
```typescript
interface UsePageViewerKeyboardParams {
  currentPage: number;
  totalPages: number;
  selectedBlocks: number[];
  localGroups: ProblemGroup[];
  crossPageSelection: CrossPageSelectionState;
  parentProblemMode: ParentProblemModeState;
  isPageChanging: boolean;
  blocksData: BlocksData | undefined;
  documentId: string;
  documentSettings: DocumentSettings | undefined;
  bookPage: number;
  previousPageLastNumber: string;

  // 콜백
  saveImmediately: (groups: ProblemGroup[], page: number) => Promise<void>;
  safePageChange: (page: number) => Promise<void>;
  handleCreateGroup: () => void;
  handleCreateCrossPageGroup: () => void;
  handleDeleteGroup: (groupId: string) => void;
  handleStartCrossPage: () => void;
  handleCancelCrossPage: () => void;
  finalizeParentProblem: () => Promise<void>;
  setSelectedBlocks: (blocks: number[] | ((prev: number[]) => number[])) => void;
  setLocalGroups: (groups: ProblemGroup[] | ((prev: ProblemGroup[]) => ProblemGroup[])) => void;
  setAutoEditGroupId: (id: string | null) => void;
  setParentProblemMode: (mode: ParentProblemModeState | ((prev: ParentProblemModeState) => ParentProblemModeState)) => void;
  showToast: (message: string, type: string) => void;
}

export function usePageViewerKeyboard(params: UsePageViewerKeyboardParams): void;
```

**난이도**: 중간 (의존성 많음)

---

### Step 62-C-2: usePageViewerCrossPage.ts (30분)

**위치**: `frontend/src/hooks/usePageViewerCrossPage.ts`

**추출 대상**:
```typescript
// 라인 908-952: handleStartCrossPage
// 라인 952-1060: handleCreateCrossPageGroup
// 라인 1063-1080: handleCancelCrossPage
// 라인 38-44: CrossPageSelectionState 타입
```

**인터페이스**:
```typescript
export interface CrossPageSelectionState {
  isActive: boolean;
  sourcePageIndex: number;
  sourceColumn: "L" | "R";
  sourceBlockIds: number[];
}

interface UsePageViewerCrossPageParams {
  documentId: string;
  currentPage: number;
  selectedBlocks: number[];
  localGroups: ProblemGroup[];
  blocksData: BlocksData | undefined;
  documentSettings: DocumentSettings | undefined;
  bookPage: number;
  queryClient: QueryClient;

  // 콜백
  setSelectedBlocks: Dispatch<SetStateAction<number[]>>;
  setLocalGroups: Dispatch<SetStateAction<ProblemGroup[]>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  saveImmediately: (groups: ProblemGroup[], page: number) => Promise<void>;
  onGroupCreated?: (group: ProblemGroup, pageIndex: number) => void;
  showToast: (message: string, type: string) => void;
}

export function usePageViewerCrossPage(params: UsePageViewerCrossPageParams): {
  crossPageSelection: CrossPageSelectionState;
  setCrossPageSelection: Dispatch<SetStateAction<CrossPageSelectionState>>;
  handleStartCrossPage: () => void;
  handleCreateCrossPageGroup: () => Promise<void>;
  handleCancelCrossPage: () => void;
};
```

**난이도**: 중간

---

### Step 62-C-3: usePageViewerGroups.ts (30분)

**위치**: `frontend/src/hooks/usePageViewerGroups.ts`

**추출 대상**:
```typescript
// 라인 717-810: handleCreateGroup
// 라인 852-890: handleDeleteGroup
// 라인 1180-1230: handleConfirmGroup
// 라인 1235-1260: handleConfirmAllGroups
// 라인 1138-1178: handleUpdateGroupInfo
```

**인터페이스**:
```typescript
interface UsePageViewerGroupsParams {
  documentId: string;
  currentPage: number;
  selectedBlocks: number[];
  localGroups: ProblemGroup[];
  blocksData: BlocksData | undefined;
  documentSettings: DocumentSettings | undefined;
  bookPage: number;
  previousPageLastNumber: string;
  suggestedGroupName?: string;
  selectedProblemInfo?: ProblemInfo;
  queryClient: QueryClient;

  // 콜백
  setLocalGroups: Dispatch<SetStateAction<ProblemGroup[]>>;
  setSelectedBlocks: Dispatch<SetStateAction<number[]>>;
  setAutoEditGroupId: Dispatch<SetStateAction<string | null>>;
  setConfirmingGroupId: Dispatch<SetStateAction<string | null>>;
  saveImmediately: (groups: ProblemGroup[], page: number) => Promise<void>;
  onGroupCreated?: (group: ProblemGroup, pageIndex: number) => void;
  onGroupDeleted?: (groupId: string, pageIndex: number) => void;
  onGroupUpdated?: (groupId: string, info: ProblemInfo, pageIndex: number) => void;
  showToast: (message: string, type: string) => void;
}

export function usePageViewerGroups(params: UsePageViewerGroupsParams): {
  handleCreateGroup: () => Promise<void>;
  handleDeleteGroup: (groupId: string) => Promise<void>;
  handleConfirmGroup: (groupId: string) => Promise<void>;
  handleConfirmAllGroups: () => Promise<void>;
  handleUpdateGroupInfo: (groupId: string, info: ProblemInfo) => Promise<void>;
};
```

**난이도**: 중간

---

### Step 62-C-4: 통합 및 테스트 (15분)

1. PageViewer.tsx에서 훅 import
2. 기존 함수 제거 및 훅 호출로 대체
3. 빌드 테스트
4. 기능 테스트 (키보드, 크로스페이지, 그룹 CRUD)

---

## Phase 62-D: GroupPanel.tsx 분리 (1시간)

### 분리 대상 분석

| 섹션 | 라인 범위 | 줄 수 | 분리 파일 |
|------|----------|-------|-----------|
| 편집 폼 | 476-557 | ~80줄 | `GroupEditForm.tsx` |
| 그룹 카드 보기 모드 | 559-740 | ~180줄 | `GroupCardView.tsx` |
| 편집 상태 관리 | 185-280 | ~95줄 | `useGroupEdit.ts` |

### Step 62-D-1: GroupEditForm.tsx (20분)

**위치**: `frontend/src/components/group/GroupEditForm.tsx`

**추출 대상**:
```typescript
// 라인 476-557: 편집 모드 UI
// 책이름, 과정, 페이지, 문항번호 입력 필드
```

**인터페이스**:
```typescript
interface GroupEditFormProps {
  editForm: {
    bookName?: string;
    course?: string;
    page?: number;
    problemNumber?: string;
  };
  setEditForm: Dispatch<SetStateAction<EditForm>>;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  problemNumberInputRef: RefObject<HTMLInputElement>;
}

export function GroupEditForm(props: GroupEditFormProps): JSX.Element;
```

**난이도**: 쉬움

---

### Step 62-D-2: GroupCardView.tsx (25분)

**위치**: `frontend/src/components/group/GroupCardView.tsx`

**추출 대상**:
```typescript
// 라인 559-740: 보기 모드 UI
// - 문항번호 표시
// - 요약 정보 (책, 페이지, 블록 수)
// - 모문제 연결 표시
// - 확정/편집/삭제 버튼
// - 연결 정보 (LinkedBadge)
// - 모문제 드롭다운
```

**인터페이스**:
```typescript
interface GroupCardViewProps {
  group: ProblemGroup;
  index: number;
  parentGroups: ProblemGroup[];
  allParentGroups: ProblemGroup[];
  confirmingGroupId: string | null;

  // 콜백
  onStartEditing: () => void;
  onDeleteGroup: () => void;
  onConfirmGroup?: () => void;
  onToggleIsParent?: () => void;
  onSetParentGroup?: (parentId: string | null) => void;
  onNavigateToLinked?: () => void;

  // 헬퍼
  getParentGroupName: (parentGroupId: string) => string;
  getGroupTypeStyle: (group: ProblemGroup) => string;
}

export function GroupCardView(props: GroupCardViewProps): JSX.Element;
```

**난이도**: 중간 (props 많음)

---

### Step 62-D-3: useGroupEdit.ts (15분)

**위치**: `frontend/src/hooks/useGroupEdit.ts`

**추출 대상**:
```typescript
// 라인 185-280: 편집 상태 관리
// - editingGroupId 상태
// - editForm 상태
// - startEditing, cancelEdit, saveEdit 함수
// - handleEditFormKeyDown 함수
```

**인터페이스**:
```typescript
interface UseGroupEditParams {
  groups: ProblemGroup[];
  onUpdateGroupInfo?: (groupId: string, info: ProblemInfo) => void;
}

interface UseGroupEditReturn {
  editingGroupId: string | null;
  editForm: EditForm;
  setEditForm: Dispatch<SetStateAction<EditForm>>;
  problemNumberInputRef: RefObject<HTMLInputElement>;
  startEditing: (group: ProblemGroup) => void;
  cancelEdit: () => void;
  saveEdit: (groupId: string) => void;
  handleEditFormKeyDown: (e: React.KeyboardEvent, groupId: string) => void;
}

export function useGroupEdit(params: UseGroupEditParams): UseGroupEditReturn;
```

**난이도**: 쉬움

---

## 예상 결과

### 파일 구조 (분리 후)

```
frontend/src/
├── hooks/
│   ├── usePageViewerKeyboard.ts    (NEW, ~200줄)
│   ├── usePageViewerCrossPage.ts   (NEW, ~160줄)
│   ├── usePageViewerGroups.ts      (NEW, ~170줄)
│   └── useGroupEdit.ts             (NEW, ~95줄)
│
├── components/
│   └── group/
│       ├── GroupEditForm.tsx       (NEW, ~80줄)
│       └── GroupCardView.tsx       (NEW, ~180줄)
│
├── pages/
│   └── PageViewer.tsx              (820줄 → 권장 근접)
│
└── components/
    └── GroupPanel.tsx              (470줄 → 권장 근접)
```

### 줄 수 변화

| 파일 | 변경 전 | 변경 후 | 감소 |
|------|--------|--------|------|
| PageViewer.tsx | 1,350줄 | ~820줄 | -530줄 |
| GroupPanel.tsx | 821줄 | ~470줄 | -351줄 |
| 새 파일 6개 | 0줄 | ~885줄 | - |
| **총합** | 2,171줄 | 2,175줄 | ±0 |

> 총 줄 수는 비슷하지만, 파일당 평균 줄 수가 크게 감소

---

## 구현 순서 (권장)

```
1단계: Phase 62-C-2 (크로스페이지) - 30분
       → 가장 독립적인 로직

2단계: Phase 62-C-3 (그룹 CRUD) - 30분
       → 핵심 비즈니스 로직

3단계: Phase 62-C-1 (키보드) - 45분
       → 1,2단계 훅 의존

4단계: Phase 62-C-4 (통합) - 15분
       → PageViewer 리팩토링

5단계: Phase 62-D-3 (편집 훅) - 15분
       → 상태 관리 분리

6단계: Phase 62-D-1 (편집 폼) - 20분
       → UI 컴포넌트 분리

7단계: Phase 62-D-2 (카드 뷰) - 25분
       → UI 컴포넌트 분리
```

**총 예상 시간**: 3시간

---

## 위험 요소 및 대응

| 위험 | 확률 | 대응 |
|------|------|------|
| 순환 의존성 | 중간 | 인터페이스 먼저 정의, 의존성 그래프 확인 |
| 타입 에러 | 높음 | 단계별 빌드 테스트 |
| 기능 회귀 | 낮음 | 기존 기능 변경 없이 추출만 |
| 상태 동기화 | 중간 | 훅에서 상태 관리, 컴포넌트는 props만 |

---

## 명령어

```
Phase 62-C 진행해줘       # PageViewer 분리
Phase 62-D 진행해줘       # GroupPanel 분리
Phase 62-C-1 진행해줘     # 키보드 훅만
```

---

*v1.0 - 2025-12-07*
