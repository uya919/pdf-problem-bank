# Phase 22-G: 기존 문서 역할 지정 기능 - 상세 개발 계획

**작성일**: 2025-12-02
**기반 문서**: 59_existing_document_role_assignment_research.md
**목표**: "진행중인 라벨링"의 기존 문서를 문제/해설 PDF로 지정하는 UI 구현

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RegistrationPage                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  상태 관리                                                    │    │
│  │  - selectedProblemDoc: { id, name } | null                   │    │
│  │  - selectedSolutionDoc: { id, name } | null                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│           │                                      │                   │
│           ▼                                      ▼                   │
│  ┌─────────────────────┐            ┌─────────────────────────┐    │
│  │   DualUploadCard    │            │     DocumentCard        │    │
│  │                     │            │                         │    │
│  │  Props:             │            │  Props:                 │    │
│  │  - selectedProblem  │◄───────────│  - onSetAsProblem()    │    │
│  │  - selectedSolution │            │  - onSetAsSolution()   │    │
│  │  - onClearProblem() │            │                         │    │
│  │  - onClearSolution()│            │  ┌───────────────────┐  │    │
│  │                     │            │  │   DocumentMenu    │  │    │
│  └─────────────────────┘            │  │                   │  │    │
│                                      │  │  - 문제로 지정     │  │    │
│                                      │  │  - 해설로 지정     │  │    │
│                                      │  └───────────────────┘  │    │
│                                      └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 22-G-1: 타입 정의 및 기반 작업

### 목표
공통 타입 정의 및 인터페이스 설계

### 파일: `frontend/src/types/matching.ts` (신규)

```typescript
/**
 * Phase 22-G: 문서 역할 지정 타입
 */

// 선택된 문서 정보
export interface SelectedDocument {
  id: string;           // document_id
  name: string;         // 표시용 이름
  source: 'upload' | 'existing';  // 업로드 vs 기존 문서
}

// 역할 타입
export type DocumentRole = 'problem' | 'solution';

// DualUploadCard에서 사용하는 문서 상태
export interface DocumentSelection {
  problem: SelectedDocument | null;
  solution: SelectedDocument | null;
}
```

### 예상 시간: 10분

---

## Phase 22-G-2: DocumentMenu 확장

### 목표
문서 메뉴에 "문제로 지정" / "해설로 지정" 옵션 추가

### 파일: `frontend/src/components/DocumentMenu.tsx`

### 변경 사항

#### 2-1. Props 인터페이스 확장

```typescript
// Before
interface DocumentMenuProps {
  documentId: string;
  documentName: string;
  onDelete: () => void;
  onSettings?: () => void;
}

// After
interface DocumentMenuProps {
  documentId: string;
  documentName: string;
  onDelete: () => void;
  onSettings?: () => void;
  // Phase 22-G: 역할 지정
  onSetAsProblem?: () => void;
  onSetAsSolution?: () => void;
  isProblemDisabled?: boolean;   // 이미 다른 문서가 문제로 지정됨
  isSolutionDisabled?: boolean;  // 이미 다른 문서가 해설로 지정됨
  isCurrentProblem?: boolean;    // 이 문서가 현재 문제로 지정됨
  isCurrentSolution?: boolean;   // 이 문서가 현재 해설로 지정됨
}
```

#### 2-2. 메뉴 아이템 추가

```tsx
import { FileText, BookOpen, Link2 } from 'lucide-react';

// Menu.Items 내부에 추가
{/* Phase 22-G: 매칭에 사용 섹션 */}
{(onSetAsProblem || onSetAsSolution) && (
  <>
    {/* 섹션 헤더 */}
    <div className="px-4 py-2 text-xs font-medium text-grey-400 uppercase tracking-wider">
      매칭에 사용
    </div>

    {/* 문제로 지정 */}
    {onSetAsProblem && (
      <Menu.Item disabled={isProblemDisabled}>
        {({ active, disabled }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onSetAsProblem();
            }}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-3 text-sm',
              disabled
                ? 'text-grey-300 cursor-not-allowed'
                : active
                  ? 'bg-toss-blue-light text-toss-blue'
                  : 'text-grey-700',
              isCurrentProblem && 'bg-toss-blue-light'
            )}
          >
            <FileText className="w-4 h-4" />
            {isCurrentProblem ? '✓ 문제로 지정됨' : '문제로 지정'}
          </button>
        )}
      </Menu.Item>
    )}

    {/* 해설로 지정 */}
    {onSetAsSolution && (
      <Menu.Item disabled={isSolutionDisabled}>
        {({ active, disabled }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onSetAsSolution();
            }}
            className={cn(
              'flex items-center gap-3 w-full px-4 py-3 text-sm',
              disabled
                ? 'text-grey-300 cursor-not-allowed'
                : active
                  ? 'bg-toss-blue-light text-toss-blue'
                  : 'text-grey-700',
              isCurrentSolution && 'bg-toss-blue-light'
            )}
          >
            <BookOpen className="w-4 h-4" />
            {isCurrentSolution ? '✓ 해설로 지정됨' : '해설로 지정'}
          </button>
        )}
      </Menu.Item>
    )}

    {/* 구분선 */}
    <div className="border-t border-grey-100 my-1" />
  </>
)}
```

### 테스트 시나리오
1. 메뉴 열기 → "문제로 지정", "해설로 지정" 표시 확인
2. 문제 지정 후 → 같은 문서 메뉴에서 "✓ 문제로 지정됨" 표시
3. 다른 문서 메뉴에서 → "문제로 지정" 비활성화 확인

### 예상 시간: 30분

---

## Phase 22-G-3: RegistrationPage 상태 관리

### 목표
선택된 문서 상태를 관리하고 자식 컴포넌트에 전달

### 파일: `frontend/src/pages/RegistrationPage.tsx`

### 변경 사항

#### 3-1. 상태 추가

```typescript
// 기존 상태들...
const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
const [showPopupBlockedModal, setShowPopupBlockedModal] = useState(false);

// Phase 22-G: 역할 지정 상태 추가
const [selectedProblemDoc, setSelectedProblemDoc] = useState<{
  id: string;
  name: string;
} | null>(null);

const [selectedSolutionDoc, setSelectedSolutionDoc] = useState<{
  id: string;
  name: string;
} | null>(null);
```

#### 3-2. 핸들러 함수 추가

```typescript
// Phase 22-G: 역할 지정 핸들러
const handleSetAsProblem = useCallback((doc: DocumentItem) => {
  // 같은 문서가 해설로 지정되어 있는지 확인
  if (selectedSolutionDoc?.id === doc.id) {
    showToast('이 문서는 이미 해설로 지정되어 있습니다', { type: 'warning' });
    return;
  }

  // 이미 같은 문서가 문제로 지정되어 있으면 해제
  if (selectedProblemDoc?.id === doc.id) {
    setSelectedProblemDoc(null);
    showToast('문제 지정이 해제되었습니다', { type: 'info' });
    return;
  }

  setSelectedProblemDoc({ id: doc.id, name: doc.name });
  showToast(`${doc.name}이(가) 문제 PDF로 지정되었습니다`, { type: 'success' });
}, [selectedSolutionDoc, selectedProblemDoc, showToast]);

const handleSetAsSolution = useCallback((doc: DocumentItem) => {
  // 같은 문서가 문제로 지정되어 있는지 확인
  if (selectedProblemDoc?.id === doc.id) {
    showToast('이 문서는 이미 문제로 지정되어 있습니다', { type: 'warning' });
    return;
  }

  // 이미 같은 문서가 해설로 지정되어 있으면 해제
  if (selectedSolutionDoc?.id === doc.id) {
    setSelectedSolutionDoc(null);
    showToast('해설 지정이 해제되었습니다', { type: 'info' });
    return;
  }

  setSelectedSolutionDoc({ id: doc.id, name: doc.name });
  showToast(`${doc.name}이(가) 해설 PDF로 지정되었습니다`, { type: 'success' });
}, [selectedProblemDoc, selectedSolutionDoc, showToast]);

// 역할 해제 핸들러 (DualUploadCard에서 호출)
const handleClearProblem = useCallback(() => {
  setSelectedProblemDoc(null);
  showToast('문제 지정이 해제되었습니다', { type: 'info' });
}, [showToast]);

const handleClearSolution = useCallback(() => {
  setSelectedSolutionDoc(null);
  showToast('해설 지정이 해제되었습니다', { type: 'info' });
}, [showToast]);
```

#### 3-3. DocumentCard에 Props 전달

```tsx
// DocumentCard 컴포넌트 사용 부분 수정
{inProgressDocs.map(doc => (
  <DocumentCard
    key={doc.id}
    document={doc}
    onContinue={handleContinueLabeling}
    onDelete={handleDeleteClick}
    // Phase 22-G: 역할 지정 Props
    onSetAsProblem={() => handleSetAsProblem(doc)}
    onSetAsSolution={() => handleSetAsSolution(doc)}
    isProblemDisabled={!!selectedProblemDoc && selectedProblemDoc.id !== doc.id}
    isSolutionDisabled={!!selectedSolutionDoc && selectedSolutionDoc.id !== doc.id}
    isCurrentProblem={selectedProblemDoc?.id === doc.id}
    isCurrentSolution={selectedSolutionDoc?.id === doc.id}
  />
))}
```

#### 3-4. DualUploadCard에 Props 전달

```tsx
<DualUploadCard
  onPopupBlocked={() => setShowPopupBlockedModal(true)}
  // Phase 22-G: 기존 문서 선택 지원
  selectedProblemDoc={selectedProblemDoc}
  selectedSolutionDoc={selectedSolutionDoc}
  onClearProblem={handleClearProblem}
  onClearSolution={handleClearSolution}
/>
```

### 예상 시간: 30분

---

## Phase 22-G-4: DocumentCard Props 확장

### 목표
DocumentCard가 역할 지정 관련 Props를 받아 DocumentMenu에 전달

### 파일: `frontend/src/pages/RegistrationPage.tsx` (내부 컴포넌트)

### 변경 사항

#### 4-1. DocumentCardProps 확장

```typescript
interface DocumentCardProps {
  document: DocumentItem;
  onContinue: (id: string) => void;
  onDelete: (document: DocumentItem) => void;
  // Phase 22-G: 역할 지정
  onSetAsProblem?: () => void;
  onSetAsSolution?: () => void;
  isProblemDisabled?: boolean;
  isSolutionDisabled?: boolean;
  isCurrentProblem?: boolean;
  isCurrentSolution?: boolean;
}
```

#### 4-2. DocumentMenu에 Props 전달

```tsx
function DocumentCard({
  document,
  onContinue,
  onDelete,
  onSetAsProblem,
  onSetAsSolution,
  isProblemDisabled,
  isSolutionDisabled,
  isCurrentProblem,
  isCurrentSolution,
}: DocumentCardProps) {
  // ...기존 코드...

  return (
    <motion.div>
      <Card>
        <div className="flex items-start gap-4">
          {/* ... 기존 내용 ... */}

          {/* More Menu */}
          <DocumentMenu
            documentId={document.id}
            documentName={document.name}
            onDelete={() => onDelete(document)}
            // Phase 22-G: 역할 지정
            onSetAsProblem={onSetAsProblem}
            onSetAsSolution={onSetAsSolution}
            isProblemDisabled={isProblemDisabled}
            isSolutionDisabled={isSolutionDisabled}
            isCurrentProblem={isCurrentProblem}
            isCurrentSolution={isCurrentSolution}
          />

          {/* ... 기존 내용 ... */}
        </div>
      </Card>
    </motion.div>
  );
}
```

#### 4-3. 역할 지정 표시 배지 추가

```tsx
// 아이콘 영역에 역할 배지 추가
<div className="w-10 h-10 bg-grey-100 rounded-lg flex items-center justify-center flex-shrink-0 relative">
  <File className="w-5 h-5 text-grey-600" />

  {/* Phase 22-G: 역할 배지 */}
  {isCurrentProblem && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-toss-blue rounded-full flex items-center justify-center">
      <FileText className="w-2.5 h-2.5 text-white" />
    </span>
  )}
  {isCurrentSolution && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
      <BookOpen className="w-2.5 h-2.5 text-white" />
    </span>
  )}
</div>
```

### 예상 시간: 20분

---

## Phase 22-G-5: DualUploadCard 기존 문서 지원

### 목표
DualUploadCard가 기존 문서 선택을 표시하고, 새 업로드와 기존 선택을 통합 관리

### 파일: `frontend/src/components/matching/DualUploadCard.tsx`

### 변경 사항

#### 5-1. Props 인터페이스 확장

```typescript
interface DualUploadCardProps {
  onPopupBlocked?: () => void;
  // Phase 22-G: 기존 문서 선택 지원
  selectedProblemDoc?: { id: string; name: string } | null;
  selectedSolutionDoc?: { id: string; name: string } | null;
  onClearProblem?: () => void;
  onClearSolution?: () => void;
}
```

#### 5-2. 컴포넌트 로직 수정

```typescript
export function DualUploadCard({
  onPopupBlocked,
  selectedProblemDoc,
  selectedSolutionDoc,
  onClearProblem,
  onClearSolution,
}: DualUploadCardProps) {
  const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
  const [solutionFile, setSolutionFile] = useState<UploadedFile | null>(null);

  // Phase 22-G: 최종 문서 ID 결정 (업로드 > 기존 선택)
  const effectiveProblemDocId = problemFile?.documentId || selectedProblemDoc?.id || '';
  const effectiveSolutionDocId = solutionFile?.documentId || selectedSolutionDoc?.id || '';

  const { launchDualWindows, isLaunching, error: launchError } = useDualWindowLauncher({
    problemDocId: effectiveProblemDocId,
    solutionDocId: effectiveSolutionDocId,
    onPopupBlocked,
  });

  // 매칭 시작 가능 여부 (업로드 또는 기존 선택 둘 중 하나)
  const canStartMatching = effectiveProblemDocId && effectiveSolutionDocId && !isLaunching;

  // Phase 22-G: 기존 문서 선택 해제 핸들러
  const handleClearExistingProblem = useCallback(() => {
    onClearProblem?.();
  }, [onClearProblem]);

  const handleClearExistingSolution = useCallback(() => {
    onClearSolution?.();
  }, [onClearSolution]);

  // 파일 제거 (기존 로직 + 기존 선택도 해제)
  const removeFile = useCallback((type: 'problem' | 'solution') => {
    if (type === 'problem') {
      if (problemFile) {
        setProblemFile(null);
      } else if (selectedProblemDoc) {
        handleClearExistingProblem();
      }
    } else {
      if (solutionFile) {
        setSolutionFile(null);
      } else if (selectedSolutionDoc) {
        handleClearExistingSolution();
      }
    }
  }, [problemFile, solutionFile, selectedProblemDoc, selectedSolutionDoc,
      handleClearExistingProblem, handleClearExistingSolution]);
```

#### 5-3. renderDropzone 수정 - 기존 문서 선택 상태 표시

```typescript
const renderDropzone = (
  type: 'problem' | 'solution',
  uploadedFile: UploadedFile | null
) => {
  const isProblem = type === 'problem';
  const Icon = isProblem ? FileText : BookOpen;
  const label = isProblem ? '문제 PDF' : '해설 PDF';
  const inputId = `${type}-file-input`;

  // Phase 22-G: 기존 문서 선택 상태
  const existingDoc = isProblem ? selectedProblemDoc : selectedSolutionDoc;
  const hasExistingSelection = !uploadedFile && existingDoc;

  // 업로드 중...
  if (uploadedFile?.uploading) {
    // ... 기존 코드 ...
  }

  // 업로드 완료 상태
  if (uploadedFile?.documentId) {
    // ... 기존 코드 ...
  }

  // Phase 22-G: 기존 문서 선택됨 상태 (NEW)
  if (hasExistingSelection) {
    return (
      <div className="relative flex h-40 flex-col items-center justify-center rounded-lg border-2 border-toss-blue/30 bg-toss-blue-light">
        <button
          onClick={() => removeFile(type)}
          className="absolute right-2 top-2 rounded-full p-1 text-grey-400 hover:bg-grey-200 hover:text-grey-600"
        >
          <X className="h-4 w-4" />
        </button>
        <Icon className="h-8 w-8 text-toss-blue" />
        <p className="mt-2 max-w-[150px] truncate text-sm font-medium text-toss-blue">
          {existingDoc.name}
        </p>
        <p className="text-xs text-toss-blue/80">기존 문서 선택됨</p>
      </div>
    );
  }

  // 에러 상태
  if (uploadedFile?.error) {
    // ... 기존 코드 ...
  }

  // 기본 상태 (빈 드롭존)
  return (
    // ... 기존 코드 ...
  );
};
```

#### 5-4. 파일명 표시 영역 수정

```tsx
{/* 파일명 표시 */}
<div className="mt-4 space-y-1">
  {/* 문제 파일 */}
  {(problemFile?.documentId || selectedProblemDoc) && (
    <div className="flex items-center gap-2 text-sm text-grey-600">
      <FileText className="h-4 w-4" />
      <span className="truncate">
        문제: {problemFile?.file.name || selectedProblemDoc?.name}
      </span>
      {problemFile?.documentId ? (
        <span className="text-success">✓ 업로드됨</span>
      ) : (
        <span className="text-toss-blue">✓ 선택됨</span>
      )}
    </div>
  )}

  {/* 해설 파일 */}
  {(solutionFile?.documentId || selectedSolutionDoc) && (
    <div className="flex items-center gap-2 text-sm text-grey-600">
      <BookOpen className="h-4 w-4" />
      <span className="truncate">
        해설: {solutionFile?.file.name || selectedSolutionDoc?.name}
      </span>
      {solutionFile?.documentId ? (
        <span className="text-success">✓ 업로드됨</span>
      ) : (
        <span className="text-toss-blue">✓ 선택됨</span>
      )}
    </div>
  )}
</div>
```

#### 5-5. 설명 문구 업데이트

```tsx
<p className="text-body-sm text-grey-500 mb-6">
  PDF를 업로드하거나, 아래 문서 목록에서 선택하세요
</p>
```

### 예상 시간: 45분

---

## Phase 22-G-6: 테스트 및 버그 수정

### 테스트 시나리오

#### 시나리오 1: 기본 플로우
```
1. 단일 파일 업로드로 문제.pdf 업로드
2. 단일 파일 업로드로 해설.pdf 업로드
3. 문제.pdf 문서 메뉴 → "문제로 지정" 클릭
4. 해설.pdf 문서 메뉴 → "해설로 지정" 클릭
5. DualUploadCard에 두 문서 표시 확인
6. "듀얼 윈도우로 매칭 시작" 클릭
7. 두 창이 정상적으로 열리는지 확인
```

#### 시나리오 2: 역할 해제
```
1. 문서를 문제로 지정
2. DualUploadCard에서 X 버튼 클릭
3. 지정 해제되고 토스트 메시지 확인
4. 문서 카드의 배지 사라짐 확인
```

#### 시나리오 3: 충돌 방지
```
1. 문서 A를 문제로 지정
2. 같은 문서 A 메뉴에서 "해설로 지정" 클릭
3. "이미 문제로 지정되어 있습니다" 경고 확인
```

#### 시나리오 4: 업로드와 기존 선택 혼합
```
1. DualUploadCard에서 문제 PDF 새로 업로드
2. 아래 목록에서 기존 문서를 해설로 지정
3. 두 가지 소스가 함께 작동하는지 확인
4. 매칭 시작 정상 동작 확인
```

#### 시나리오 5: 상태 우선순위
```
1. 기존 문서를 문제로 지정
2. DualUploadCard에서 새 문제 PDF 업로드
3. 새 업로드가 우선 표시되는지 확인
4. 새 업로드 X로 제거
5. 기존 선택이 다시 표시되는지 확인
```

### 예상 시간: 30분

---

## 전체 파일 수정 목록

| 파일 | 작업 | 변경 라인 (예상) |
|------|------|----------------|
| `types/matching.ts` | 신규 생성 | ~20줄 |
| `DocumentMenu.tsx` | 수정 | +60줄 |
| `RegistrationPage.tsx` | 수정 | +80줄 |
| `DualUploadCard.tsx` | 수정 | +50줄 |

---

## 구현 순서

```
Phase 22-G-1 (10분)
    │
    ▼
Phase 22-G-2 (30분) ─── DocumentMenu 확장
    │
    ▼
Phase 22-G-3 (30분) ─── RegistrationPage 상태 관리
    │
    ▼
Phase 22-G-4 (20분) ─── DocumentCard Props 확장
    │
    ▼
Phase 22-G-5 (45분) ─── DualUploadCard 기존 문서 지원
    │
    ▼
Phase 22-G-6 (30분) ─── 테스트
    │
    ▼
   완료 (총 2시간 45분)
```

---

## 롤백 계획

각 단계는 독립적으로 롤백 가능:
- G-1: 타입 파일 삭제
- G-2: DocumentMenu에서 새 Props 제거
- G-3: RegistrationPage에서 상태와 핸들러 제거
- G-4: DocumentCard에서 새 Props 제거
- G-5: DualUploadCard에서 새 Props 및 로직 제거

---

## 체크리스트

### Phase 22-G-1
- [ ] `types/matching.ts` 생성
- [ ] 타입 정의 완료

### Phase 22-G-2
- [ ] DocumentMenuProps 확장
- [ ] "문제로 지정" 메뉴 아이템 추가
- [ ] "해설로 지정" 메뉴 아이템 추가
- [ ] disabled/active 상태 스타일링
- [ ] 현재 선택 표시 (✓)

### Phase 22-G-3
- [ ] selectedProblemDoc 상태 추가
- [ ] selectedSolutionDoc 상태 추가
- [ ] handleSetAsProblem 핸들러 구현
- [ ] handleSetAsSolution 핸들러 구현
- [ ] handleClearProblem 핸들러 구현
- [ ] handleClearSolution 핸들러 구현
- [ ] 토스트 메시지 추가

### Phase 22-G-4
- [ ] DocumentCardProps 확장
- [ ] DocumentMenu에 Props 전달
- [ ] 역할 배지 UI 추가

### Phase 22-G-5
- [ ] DualUploadCardProps 확장
- [ ] effectiveProblemDocId/effectiveSolutionDocId 로직
- [ ] 기존 문서 선택 드롭존 UI
- [ ] 파일명 표시 영역 업데이트
- [ ] 설명 문구 업데이트

### Phase 22-G-6
- [ ] 시나리오 1 테스트
- [ ] 시나리오 2 테스트
- [ ] 시나리오 3 테스트
- [ ] 시나리오 4 테스트
- [ ] 시나리오 5 테스트
- [ ] TypeScript 빌드 확인

---

*작성: Claude Code (Opus)*
*날짜: 2025-12-02*
