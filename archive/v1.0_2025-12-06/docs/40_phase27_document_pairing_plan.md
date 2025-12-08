# Phase 27: 문서 페어링 영구 연결 - 단계별 개발 계획

## 목표

"문제로 지정" / "해설로 지정" 선택 시:
1. 두 문서가 **영구적으로 연결**
2. **머지 애니메이션**으로 하나의 카드로 합쳐짐
3. **시작 버튼 1개**로 듀얼 윈도우 실행
4. 관계가 **영구 유지**

---

## Phase 27-A: 선택 상태 관리 (기반 작업)

### 목표
문서 선택 상태를 전역으로 관리하는 훅 생성

### 작업 내용

#### 1. `useDocumentSelection.ts` 생성

```typescript
// frontend/src/hooks/useDocumentSelection.ts

import { create } from 'zustand';

interface DocumentSelectionState {
  // 선택된 문서 ID
  problemDocId: string | null;
  solutionDocId: string | null;

  // 선택 액션
  selectAsProblem: (docId: string) => void;
  selectAsSolution: (docId: string) => void;
  clearSelection: () => void;

  // 선택 취소
  deselectProblem: () => void;
  deselectSolution: () => void;

  // 상태 확인
  isSelectedAsProblem: (docId: string) => boolean;
  isSelectedAsSolution: (docId: string) => boolean;
  isReadyToPair: () => boolean;
}

export const useDocumentSelection = create<DocumentSelectionState>((set, get) => ({
  problemDocId: null,
  solutionDocId: null,

  selectAsProblem: (docId) => set({ problemDocId: docId }),
  selectAsSolution: (docId) => set({ solutionDocId: docId }),
  clearSelection: () => set({ problemDocId: null, solutionDocId: null }),

  deselectProblem: () => set({ problemDocId: null }),
  deselectSolution: () => set({ solutionDocId: null }),

  isSelectedAsProblem: (docId) => get().problemDocId === docId,
  isSelectedAsSolution: (docId) => get().solutionDocId === docId,
  isReadyToPair: () => {
    const { problemDocId, solutionDocId } = get();
    return !!(problemDocId && solutionDocId && problemDocId !== solutionDocId);
  },
}));
```

#### 2. 의존성 설치

```bash
npm install zustand
```

### 예상 시간: 1시간

---

## Phase 27-B: 문서 카드 선택 UI

### 목표
문서 카드에 선택 상태를 시각적으로 표시

### 작업 내용

#### 1. DocumentCard 컴포넌트 수정

```typescript
// frontend/src/components/ui/DocumentCard.tsx

// 추가할 props
interface DocumentCardProps {
  // ... 기존 props
  isSelectedAsProblem?: boolean;
  isSelectedAsSolution?: boolean;
  onSetAsProblem?: () => void;
  onSetAsSolution?: () => void;
}

// 렌더링 부분 추가
{/* 선택 상태 뱃지 */}
{isSelectedAsProblem && (
  <div className="absolute top-2 right-2 z-10">
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                     bg-blue-500 text-white text-xs font-medium shadow-lg">
      <FileText className="w-3 h-3" />
      문제
    </span>
  </div>
)}

{isSelectedAsSolution && (
  <div className="absolute top-2 right-2 z-10">
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                     bg-green-500 text-white text-xs font-medium shadow-lg">
      <BookOpen className="w-3 h-3" />
      해설
    </span>
  </div>
)}

{/* 선택 시 테두리 강조 */}
<div className={cn(
  "relative rounded-lg border transition-all duration-300",
  isSelectedAsProblem && "ring-2 ring-blue-500 border-blue-500",
  isSelectedAsSolution && "ring-2 ring-green-500 border-green-500",
  !isSelectedAsProblem && !isSelectedAsSolution && "border-gray-200"
)}>
```

#### 2. DocumentMenu 연결

```typescript
// DocumentMenu.tsx의 콜백을 DocumentCard에서 호출

<DocumentMenu
  onSetAsProblem={() => {
    selectAsProblem(document.document_id);
  }}
  onSetAsSolution={() => {
    selectAsSolution(document.document_id);
  }}
  isProblemDisabled={isSelectedAsProblem}
  isSolutionDisabled={isSelectedAsSolution}
/>
```

### 예상 시간: 2시간

---

## Phase 27-C: 페어 생성 플로우

### 목표
두 문서 선택 완료 시 확인 다이얼로그 → API 호출 → 페어 생성

### 작업 내용

#### 1. 페어 확인 다이얼로그 컴포넌트

```typescript
// frontend/src/components/matching/PairConfirmDialog.tsx

import { motion, AnimatePresence } from 'framer-motion';

interface PairConfirmDialogProps {
  isOpen: boolean;
  problemDoc: Document | null;
  solutionDoc: Document | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function PairConfirmDialog({
  isOpen,
  problemDoc,
  solutionDoc,
  onConfirm,
  onCancel,
  isLoading
}: PairConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-center mb-4">
              이 문서들을 연결하시겠어요?
            </h2>

            <div className="space-y-3 mb-6">
              {/* 문제 문서 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {problemDoc?.document_id}
                  </p>
                  <p className="text-xs text-blue-600">문제</p>
                </div>
              </div>

              {/* 연결 아이콘 */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Link2 className="w-6 h-6 text-gray-400" />
                </motion.div>
              </div>

              {/* 해설 문서 */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900 truncate">
                    {solutionDoc?.document_id}
                  </p>
                  <p className="text-xs text-green-600">해설</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300
                           text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white
                           hover:bg-blue-700 transition-colors flex items-center
                           justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                연결하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### 2. HomePage에서 다이얼로그 통합

```typescript
// frontend/src/pages/HomePage.tsx

const HomePage = () => {
  const { problemDocId, solutionDocId, isReadyToPair, clearSelection } = useDocumentSelection();
  const { mutateAsync: createPair, isPending } = useCreateDocumentPair();
  const [showPairDialog, setShowPairDialog] = useState(false);

  // 페어 준비 완료 시 다이얼로그 표시
  useEffect(() => {
    if (isReadyToPair()) {
      setShowPairDialog(true);
    }
  }, [problemDocId, solutionDocId]);

  const handleConfirmPair = async () => {
    try {
      await createPair({
        problem_document_id: problemDocId!,
        solution_document_id: solutionDocId!,
      });
      clearSelection();
      setShowPairDialog(false);
      showToast('문서 페어가 연결되었습니다!', 'success');
    } catch (error) {
      showToast('페어 연결에 실패했습니다', 'error');
    }
  };

  return (
    <>
      {/* 기존 UI */}

      <PairConfirmDialog
        isOpen={showPairDialog}
        problemDoc={documents?.find(d => d.document_id === problemDocId)}
        solutionDoc={documents?.find(d => d.document_id === solutionDocId)}
        onConfirm={handleConfirmPair}
        onCancel={() => {
          clearSelection();
          setShowPairDialog(false);
        }}
        isLoading={isPending}
      />
    </>
  );
};
```

### 예상 시간: 3시간

---

## Phase 27-D: 머지 애니메이션

### 목표
두 문서 카드가 하나로 합쳐지는 애니메이션 구현

### 작업 내용

#### 1. 애니메이션 전략

```
[Phase 1: 확인 다이얼로그 닫힘]
          ↓
[Phase 2: 두 카드가 화면 중앙으로 이동]
          ↓
[Phase 3: 카드들이 겹치면서 크기 축소]
          ↓
[Phase 4: 통합 카드가 페어 섹션에서 확대되며 등장]
```

#### 2. 머지 애니메이션 컴포넌트

```typescript
// frontend/src/components/matching/DocumentMergeAnimation.tsx

import { motion, AnimatePresence } from 'framer-motion';

interface DocumentMergeAnimationProps {
  isAnimating: boolean;
  problemDoc: Document | null;
  solutionDoc: Document | null;
  onComplete: () => void;
}

export function DocumentMergeAnimation({
  isAnimating,
  problemDoc,
  solutionDoc,
  onComplete
}: DocumentMergeAnimationProps) {
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isAnimating && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* 문제 카드 - 왼쪽에서 중앙으로 */}
          <motion.div
            initial={{ x: -200, opacity: 1, scale: 1 }}
            animate={{
              x: 0,
              opacity: 0,
              scale: 0.5,
              transition: { duration: 0.6, ease: "easeInOut" }
            }}
            className="absolute"
          >
            <div className="w-64 h-32 rounded-lg bg-blue-100 border-2 border-blue-500
                          flex items-center justify-center shadow-lg">
              <div className="text-center">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-blue-800 truncate px-4">
                  {problemDoc?.document_id}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 해설 카드 - 오른쪽에서 중앙으로 */}
          <motion.div
            initial={{ x: 200, opacity: 1, scale: 1 }}
            animate={{
              x: 0,
              opacity: 0,
              scale: 0.5,
              transition: { duration: 0.6, ease: "easeInOut" }
            }}
            className="absolute"
          >
            <div className="w-64 h-32 rounded-lg bg-green-100 border-2 border-green-500
                          flex items-center justify-center shadow-lg">
              <div className="text-center">
                <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800 truncate px-4">
                  {solutionDoc?.document_id}
                </p>
              </div>
            </div>
          </motion.div>

          {/* 통합 카드 - 중앙에서 확대 */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { delay: 0.4, duration: 0.4, ease: "backOut" }
            }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute"
          >
            <div className="w-72 h-40 rounded-xl bg-gradient-to-br from-blue-500 to-green-500
                          flex items-center justify-center shadow-2xl">
              <div className="text-center text-white">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="w-6 h-6" />
                  <Link2 className="w-5 h-5" />
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-lg font-bold">페어 연결 완료!</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### 3. 애니메이션 타이밍 조율

```typescript
// HomePage에서 애니메이션 상태 관리

const [showMergeAnimation, setShowMergeAnimation] = useState(false);

const handleConfirmPair = async () => {
  try {
    await createPair({...});

    // 다이얼로그 닫기
    setShowPairDialog(false);

    // 머지 애니메이션 시작
    setShowMergeAnimation(true);

    // 1초 후 애니메이션 종료 & 선택 초기화
    setTimeout(() => {
      setShowMergeAnimation(false);
      clearSelection();
    }, 1000);

  } catch (error) {...}
};
```

### 예상 시간: 4시간

---

## Phase 27-E: 페어 카드 개선

### 목표
DocumentPairCard를 개선하여 통합된 시작 버튼 제공

### 작업 내용

#### 1. DocumentPairCard 리디자인

```typescript
// frontend/src/components/matching/DocumentPairCard.tsx

export function DocumentPairCard({ pair, onDelete, onStart }: DocumentPairCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm
                 hover:shadow-md transition-shadow"
    >
      {/* 헤더: 그라데이션 배경 */}
      <div className="h-2 bg-gradient-to-r from-blue-500 to-green-500" />

      <div className="p-4">
        {/* 페어 아이콘 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500
                        flex items-center justify-center">
            <Link2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-500">문제-해설 페어</span>
        </div>

        {/* 문서 정보 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
              <FileText className="w-3 h-3 text-blue-600" />
            </span>
            <span className="text-sm text-gray-900 truncate flex-1">
              {pair.problem_document_name || pair.problem_document_id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-green-600" />
            </span>
            <span className="text-sm text-gray-900 truncate flex-1">
              {pair.solution_document_name || pair.solution_document_id}
            </span>
          </div>
        </div>

        {/* 매칭 통계 */}
        {pair.matched_count > 0 && (
          <div className="text-xs text-gray-500 mb-3">
            {pair.matched_count}개 문제-해설 매칭 완료
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={onStart}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700
                     text-white font-medium hover:from-blue-700 hover:to-blue-800
                     transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <PlayCircle className="w-4 h-4" />
            듀얼 라벨링 시작
          </button>

          <button
            onClick={onDelete}
            className="px-3 py-2.5 rounded-lg border border-gray-200 text-gray-500
                     hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

#### 2. 듀얼 윈도우 실행 로직

```typescript
// onStart 핸들러
const handleStartDualLabeling = (pair: DocumentPair) => {
  // 매칭 세션 생성 또는 기존 세션 사용
  const sessionId = pair.last_session_id || generateSessionId();

  // 문제 창 열기
  const problemUrl = `/viewer/${pair.problem_document_id}?session=${sessionId}&role=problem`;
  window.open(problemUrl, `problem-${sessionId}`, 'width=800,height=900');

  // 해설 창 열기 (약간의 딜레이)
  setTimeout(() => {
    const solutionUrl = `/viewer/${pair.solution_document_id}?session=${sessionId}&role=solution`;
    window.open(solutionUrl, `solution-${sessionId}`, 'width=800,height=900,left=820');
  }, 300);
};
```

### 예상 시간: 2시간

---

## Phase 27-F: 문서 목록 필터링

### 목표
페어된 문서를 개별 목록에서 숨기고, 페어 섹션에만 표시

### 작업 내용

#### 1. HomePage 레이아웃 재구성

```typescript
// frontend/src/pages/HomePage.tsx

const HomePage = () => {
  const { data: documents } = useDocuments();
  const { data: pairs } = useDocumentPairs();

  // 페어된 문서 ID 집합
  const pairedDocIds = useMemo(() => {
    const ids = new Set<string>();
    pairs?.forEach(pair => {
      ids.add(pair.problem_document_id);
      ids.add(pair.solution_document_id);
    });
    return ids;
  }, [pairs]);

  // 페어되지 않은 문서만 필터링
  const unpairedDocuments = useMemo(() => {
    return documents?.filter(doc => !pairedDocIds.has(doc.document_id)) || [];
  }, [documents, pairedDocIds]);

  return (
    <div className="space-y-8">
      {/* 섹션 1: 문제-해설 페어 */}
      {pairs && pairs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">문제-해설 페어</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm">
              {pairs.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairs.map(pair => (
              <DocumentPairCard
                key={pair.id}
                pair={pair}
                onStart={() => handleStartDualLabeling(pair)}
                onDelete={() => handleDeletePair(pair.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 섹션 2: 개별 문서 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">진행 중인 라벨링</h2>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-sm">
            {unpairedDocuments.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpairedDocuments.map(doc => (
            <DocumentCard
              key={doc.document_id}
              document={doc}
              isSelectedAsProblem={isSelectedAsProblem(doc.document_id)}
              isSelectedAsSolution={isSelectedAsSolution(doc.document_id)}
              onSetAsProblem={() => selectAsProblem(doc.document_id)}
              onSetAsSolution={() => selectAsSolution(doc.document_id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
```

#### 2. 페어 표시 토글 옵션 (선택적)

```typescript
// 페어된 문서도 개별로 보기 옵션
const [showPairedDocuments, setShowPairedDocuments] = useState(false);

const displayDocuments = showPairedDocuments
  ? documents
  : unpairedDocuments;
```

### 예상 시간: 2시간

---

## Phase 27-G: 폴리시 & UX 개선

### 목표
사용자 경험 개선을 위한 마무리 작업

### 작업 내용

#### 1. 토스트 알림

```typescript
// 페어 생성 성공
showToast('문서 페어가 연결되었습니다! 🔗', 'success');

// 페어 삭제
showToast('페어 연결이 해제되었습니다', 'info');

// 오류
showToast('페어 연결에 실패했습니다. 다시 시도해주세요.', 'error');
```

#### 2. 키보드 단축키

```typescript
// ESC: 선택 취소
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSelection();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### 3. 선택 취소 버튼

```typescript
// 화면 하단에 선택 상태 표시 및 취소 버튼
{(problemDocId || solutionDocId) && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 text-white shadow-lg">
      <span className="text-sm">
        {problemDocId && !solutionDocId && '해설 문서를 선택하세요'}
        {solutionDocId && !problemDocId && '문제 문서를 선택하세요'}
        {problemDocId && solutionDocId && '페어 연결 준비 완료'}
      </span>
      <button
        onClick={clearSelection}
        className="p-1 hover:bg-gray-700 rounded-full"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
)}
```

#### 4. 로딩 상태

```typescript
// API 호출 중 로딩 표시
{isPending && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className="bg-white rounded-lg p-6 flex items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      <span>페어 연결 중...</span>
    </div>
  </div>
)}
```

### 예상 시간: 2시간

---

## 구현 순서 요약

| 단계 | 내용 | 예상 시간 | 우선순위 |
|-----|------|----------|---------|
| 27-A | 선택 상태 관리 (zustand) | 1시간 | 🔴 필수 |
| 27-B | 문서 카드 선택 UI | 2시간 | 🔴 필수 |
| 27-C | 페어 생성 플로우 | 3시간 | 🔴 필수 |
| 27-D | 머지 애니메이션 | 4시간 | 🟡 중요 |
| 27-E | 페어 카드 개선 | 2시간 | 🔴 필수 |
| 27-F | 문서 목록 필터링 | 2시간 | 🔴 필수 |
| 27-G | 폴리시 & UX 개선 | 2시간 | 🟢 선택 |
| **합계** | | **16시간** | |

---

## MVP vs Full 버전

### MVP (최소 기능, 8시간)
- 27-A: 선택 상태 관리
- 27-B: 문서 카드 선택 UI (뱃지만)
- 27-C: 페어 생성 플로우 (간단한 confirm)
- 27-E: 페어 카드 개선
- 27-F: 문서 목록 필터링

### Full 버전 (+8시간)
- 27-D: 머지 애니메이션
- 27-G: 폴리시 & UX 개선
- 추가 애니메이션 효과
- 키보드 단축키

---

## 테스트 시나리오

1. **페어 생성 플로우**
   - [ ] 문서 A에서 "문제로 지정" 클릭 → 파란 뱃지 표시
   - [ ] 문서 B에서 "해설로 지정" 클릭 → 초록 뱃지 표시
   - [ ] 확인 다이얼로그 표시
   - [ ] "연결하기" 클릭 → API 호출 성공
   - [ ] 머지 애니메이션 재생
   - [ ] 페어 카드가 "문제-해설 페어" 섹션에 표시
   - [ ] 개별 문서가 목록에서 사라짐

2. **듀얼 윈도우 실행**
   - [ ] 페어 카드의 "듀얼 라벨링 시작" 클릭
   - [ ] 문제 창 열림 (role=problem)
   - [ ] 해설 창 열림 (role=solution)
   - [ ] 두 창이 동기화됨

3. **페어 삭제**
   - [ ] 페어 카드의 삭제 버튼 클릭
   - [ ] 확인 다이얼로그 표시
   - [ ] 삭제 후 개별 문서가 다시 목록에 표시

4. **선택 취소**
   - [ ] ESC 키로 선택 취소
   - [ ] 취소 버튼으로 선택 취소
   - [ ] 같은 문서를 문제/해설 동시 선택 불가

---

*작성일: 2025-12-03*
