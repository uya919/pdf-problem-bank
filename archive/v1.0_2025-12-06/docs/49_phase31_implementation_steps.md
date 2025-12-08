# Phase 31: 단계별 구현 가이드

**작성일**: 2025-12-03
**목표**: 싱글 탭 우선 매칭 시스템 구현
**총 예상 시간**: 20시간

---

## 구현 순서 다이어그램

```
Day 1 (8시간)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Zustand 스토어 (2h)
    ↓
Step 2: 기본 페이지 + 라우팅 (2h)
    ↓
Step 3: 탭 헤더 (1.5h)
    ↓
Step 4: Dashboard 개편 (2.5h)

Day 2 (7시간)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 5: 문제 목록 패널 (3h)
    ↓
Step 6: 캔버스 연동 + 자동 연결 (4h)

Day 3 (5시간)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 7: 문제 미리보기 (2h)
    ↓
Step 8: 키보드 단축키 (1h)
    ↓
Step 9: 진행률 + 완료 (1h)
    ↓
Step 10: 듀얼 윈도우 분리 (1h)
```

---

## Step 1: Zustand 스토어 생성 (2시간)

### 목표
문제/해설 매칭 상태를 관리하는 중앙 스토어

### 1.1 파일 생성
```
frontend/src/stores/matchingStore.ts
```

### 1.2 구현 코드
```typescript
/**
 * 매칭 스토어 (Phase 31-D)
 *
 * 싱글 탭 매칭 시스템의 상태 관리
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 문제 아이템 타입
interface ProblemItem {
  groupId: string;
  problemNumber: string;
  displayName: string;  // "베이직쎈_공통수학1_p18"
  pageIndex: number;
  documentId: string;
  blockIds: number[];
  createdAt: number;
}

// 연결 정보 타입
interface LinkInfo {
  problemId: string;
  solutionId: string;
  linkedAt: number;
}

interface MatchingStore {
  // === 문서 정보 ===
  problemDocId: string | null;
  solutionDocId: string | null;
  problemDocName: string;
  solutionDocName: string;

  // === 모드 ===
  activeTab: 'problem' | 'solution';

  // === 문제 목록 ===
  problems: ProblemItem[];

  // === 선택 상태 ===
  selectedProblemId: string | null;

  // === 연결 정보 ===
  links: LinkInfo[];

  // === Actions ===
  // 초기화
  initSession: (problemDocId: string, solutionDocId: string, problemName: string, solutionName: string) => void;
  resetSession: () => void;

  // 탭 전환
  setActiveTab: (tab: 'problem' | 'solution') => void;

  // 문제 관리
  addProblem: (problem: ProblemItem) => void;
  removeProblem: (groupId: string) => void;

  // 선택
  selectProblem: (groupId: string | null) => void;
  selectNextUnlinked: () => void;
  selectPrevUnlinked: () => void;

  // 연결
  createLink: (problemId: string, solutionId: string) => void;
  removeLink: (problemId: string) => void;

  // 헬퍼
  isLinked: (problemId: string) => boolean;
  getLinkedSolutionId: (problemId: string) => string | null;
  getUnlinkedProblems: () => ProblemItem[];
  getProgress: () => { linked: number; total: number; percent: number };
}

export const useMatchingStore = create<MatchingStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      problemDocId: null,
      solutionDocId: null,
      problemDocName: '',
      solutionDocName: '',
      activeTab: 'problem',
      problems: [],
      selectedProblemId: null,
      links: [],

      // 세션 초기화
      initSession: (problemDocId, solutionDocId, problemName, solutionName) => {
        set({
          problemDocId,
          solutionDocId,
          problemDocName: problemName,
          solutionDocName: solutionName,
          activeTab: 'problem',
          problems: [],
          selectedProblemId: null,
          links: [],
        });
      },

      resetSession: () => {
        set({
          problemDocId: null,
          solutionDocId: null,
          problemDocName: '',
          solutionDocName: '',
          activeTab: 'problem',
          problems: [],
          selectedProblemId: null,
          links: [],
        });
      },

      // 탭 전환
      setActiveTab: (tab) => {
        set({ activeTab: tab });
        // 해설 탭으로 전환 시 첫 번째 미연결 문제 선택
        if (tab === 'solution') {
          const unlinked = get().getUnlinkedProblems();
          if (unlinked.length > 0 && !get().selectedProblemId) {
            set({ selectedProblemId: unlinked[0].groupId });
          }
        }
      },

      // 문제 추가
      addProblem: (problem) => {
        set((state) => ({
          problems: [...state.problems, problem],
        }));
      },

      // 문제 삭제
      removeProblem: (groupId) => {
        set((state) => ({
          problems: state.problems.filter(p => p.groupId !== groupId),
          links: state.links.filter(l => l.problemId !== groupId),
          selectedProblemId: state.selectedProblemId === groupId ? null : state.selectedProblemId,
        }));
      },

      // 문제 선택
      selectProblem: (groupId) => {
        set({ selectedProblemId: groupId });
      },

      // 다음 미연결 문제 선택
      selectNextUnlinked: () => {
        const { problems, links, selectedProblemId } = get();
        const linkedIds = new Set(links.map(l => l.problemId));
        const unlinked = problems.filter(p => !linkedIds.has(p.groupId));

        if (unlinked.length === 0) {
          set({ selectedProblemId: null });
          return;
        }

        const currentIndex = unlinked.findIndex(p => p.groupId === selectedProblemId);
        const nextIndex = currentIndex < unlinked.length - 1 ? currentIndex + 1 : 0;
        set({ selectedProblemId: unlinked[nextIndex].groupId });
      },

      // 이전 미연결 문제 선택
      selectPrevUnlinked: () => {
        const { problems, links, selectedProblemId } = get();
        const linkedIds = new Set(links.map(l => l.problemId));
        const unlinked = problems.filter(p => !linkedIds.has(p.groupId));

        if (unlinked.length === 0) {
          set({ selectedProblemId: null });
          return;
        }

        const currentIndex = unlinked.findIndex(p => p.groupId === selectedProblemId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : unlinked.length - 1;
        set({ selectedProblemId: unlinked[prevIndex].groupId });
      },

      // 연결 생성
      createLink: (problemId, solutionId) => {
        set((state) => ({
          links: [
            ...state.links.filter(l => l.problemId !== problemId),
            { problemId, solutionId, linkedAt: Date.now() },
          ],
        }));
      },

      // 연결 해제
      removeLink: (problemId) => {
        set((state) => ({
          links: state.links.filter(l => l.problemId !== problemId),
        }));
      },

      // 연결 여부 확인
      isLinked: (problemId) => {
        return get().links.some(l => l.problemId === problemId);
      },

      // 연결된 해설 ID 조회
      getLinkedSolutionId: (problemId) => {
        const link = get().links.find(l => l.problemId === problemId);
        return link?.solutionId || null;
      },

      // 미연결 문제 목록
      getUnlinkedProblems: () => {
        const { problems, links } = get();
        const linkedIds = new Set(links.map(l => l.problemId));
        return problems.filter(p => !linkedIds.has(p.groupId));
      },

      // 진행률
      getProgress: () => {
        const { problems, links } = get();
        const total = problems.length;
        const linked = links.length;
        const percent = total > 0 ? Math.round((linked / total) * 100) : 0;
        return { linked, total, percent };
      },
    }),
    {
      name: 'matching-store',
      partialize: (state) => ({
        problemDocId: state.problemDocId,
        solutionDocId: state.solutionDocId,
        problems: state.problems,
        links: state.links,
      }),
    }
  )
);
```

### 1.3 체크리스트
- [ ] `frontend/src/stores/matchingStore.ts` 생성
- [ ] zustand 의존성 확인 (`npm list zustand`)
- [ ] 타입 정의 완료
- [ ] 테스트: 브라우저 콘솔에서 `useMatchingStore.getState()` 확인

---

## Step 2: 기본 페이지 + 라우팅 (2시간)

### 목표
통합 매칭 페이지의 기본 구조 생성

### 2.1 페이지 파일 생성
```
frontend/src/pages/UnifiedMatchingPage.tsx
```

### 2.2 구현 코드
```tsx
/**
 * 통합 매칭 페이지 (Phase 31-A)
 *
 * 싱글 탭 기반 문제-해설 매칭 메인 페이지
 */
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatchingStore } from '../stores/matchingStore';
import { useDocumentInfo } from '../hooks/useDocuments';
import { MatchingHeader } from '../components/unified/MatchingHeader';
import { ProblemListPanel } from '../components/unified/ProblemListPanel';
import { Loader2 } from 'lucide-react';

export function UnifiedMatchingPage() {
  const { problemDocId, solutionDocId } = useParams<{
    problemDocId: string;
    solutionDocId: string;
  }>();
  const navigate = useNavigate();

  // 스토어
  const {
    activeTab,
    initSession,
    problemDocName,
    solutionDocName,
  } = useMatchingStore();

  // 문서 정보 조회
  const { data: problemDoc, isLoading: loadingProblem } = useDocumentInfo(problemDocId || '');
  const { data: solutionDoc, isLoading: loadingSolution } = useDocumentInfo(solutionDocId || '');

  // 세션 초기화
  useEffect(() => {
    if (problemDocId && solutionDocId && problemDoc && solutionDoc) {
      initSession(
        problemDocId,
        solutionDocId,
        problemDoc.name || '문제 PDF',
        solutionDoc.name || '해설 PDF'
      );
    }
  }, [problemDocId, solutionDocId, problemDoc, solutionDoc, initSession]);

  // 유효성 검사
  if (!problemDocId || !solutionDocId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">문서 ID가 없습니다</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-500 hover:underline"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 로딩
  if (loadingProblem || loadingSolution) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">문서 로딩 중...</span>
      </div>
    );
  }

  // 현재 활성 문서 ID
  const currentDocId = activeTab === 'problem' ? problemDocId : solutionDocId;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <MatchingHeader />

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 캔버스 영역 (왼쪽) */}
        <div className="flex-1 overflow-hidden">
          {/* TODO: Step 6에서 PageViewer 연동 */}
          <div className="h-full flex items-center justify-center bg-white border-r">
            <p className="text-gray-400">
              캔버스 영역 - {activeTab === 'problem' ? '문제' : '해설'}
            </p>
          </div>
        </div>

        {/* 문제 목록 패널 (오른쪽) */}
        <div className="w-80 flex-shrink-0 border-l bg-white overflow-hidden">
          <ProblemListPanel />
        </div>
      </div>
    </div>
  );
}
```

### 2.3 라우트 추가
```tsx
// App.tsx에 추가
import { UnifiedMatchingPage } from './pages/UnifiedMatchingPage';

// Routes 내부에 추가
<Route path="/matching/:problemDocId/:solutionDocId" element={<UnifiedMatchingPage />} />
```

### 2.4 체크리스트
- [ ] `frontend/src/pages/UnifiedMatchingPage.tsx` 생성
- [ ] `frontend/src/App.tsx` 라우트 추가
- [ ] 브라우저에서 `/matching/test1/test2` 접근 테스트

---

## Step 3: 탭 헤더 컴포넌트 (1.5시간)

### 목표
문제/해설 탭 전환 + 분리 버튼 UI

### 3.1 파일 구조
```
frontend/src/components/unified/
├── index.ts
└── MatchingHeader.tsx
```

### 3.2 구현 코드
```tsx
/**
 * 매칭 헤더 (Phase 31-C)
 *
 * 탭 전환 + 분리 버튼 + 문서 정보
 */
import { FileText, BookOpen, Monitor, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMatchingStore } from '../../stores/matchingStore';
import { Button } from '../ui/Button';

export function MatchingHeader() {
  const navigate = useNavigate();
  const {
    activeTab,
    setActiveTab,
    problemDocName,
    solutionDocName,
    problems,
    links,
  } = useMatchingStore();

  const linkedCount = links.length;
  const totalCount = problems.length;

  return (
    <div className="bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        {/* 왼쪽: 뒤로가기 + 문서명 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="대시보드로"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="text-sm text-gray-500">
            {activeTab === 'problem' ? problemDocName : solutionDocName}
          </div>
        </div>

        {/* 중앙: 탭 */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('problem')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeTab === 'problem'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">문제</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'problem' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('solution')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
              activeTab === 'solution'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">해설</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === 'solution' ? 'bg-purple-100 text-purple-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {linkedCount}/{totalCount}
            </span>
          </button>
        </div>

        {/* 오른쪽: 분리 버튼 */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Step 10에서 구현
              alert('듀얼 윈도우 분리 기능 (추후 구현)');
            }}
            className="flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            분리
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 3.3 인덱스 파일
```tsx
// frontend/src/components/unified/index.ts
export { MatchingHeader } from './MatchingHeader';
export { ProblemListPanel } from './ProblemListPanel';
```

### 3.4 체크리스트
- [ ] `frontend/src/components/unified/` 폴더 생성
- [ ] `MatchingHeader.tsx` 생성
- [ ] `index.ts` 생성
- [ ] 탭 클릭 시 상태 변경 확인

---

## Step 4: Dashboard 매칭 카드 개편 (2.5시간)

### 목표
싱글 탭 = 기본, 듀얼 윈도우 = 서브 옵션 UI

### 4.1 수정 파일
```
frontend/src/components/matching/MatchingCard.tsx (기존 DualUploadCard 대체)
```

### 4.2 구현 코드
```tsx
/**
 * 매칭 카드 (Phase 31-B)
 *
 * 문제/해설 PDF 선택 → 매칭 시작
 * 기본: 싱글 탭, 서브: 듀얼 윈도우
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, BookOpen, ArrowRight, Monitor, Upload, X } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { api } from '../../api/client';

interface UploadState {
  file: File | null;
  documentId: string | null;
  uploading: boolean;
  error: string | null;
}

export function MatchingCard() {
  const navigate = useNavigate();
  const [problemState, setProblemState] = useState<UploadState>({
    file: null, documentId: null, uploading: false, error: null
  });
  const [solutionState, setSolutionState] = useState<UploadState>({
    file: null, documentId: null, uploading: false, error: null
  });
  const [showDualOption, setShowDualOption] = useState(false);

  // 파일 업로드
  const handleUpload = useCallback(async (file: File, type: 'problem' | 'solution') => {
    const setState = type === 'problem' ? setProblemState : setSolutionState;

    setState({ file, documentId: null, uploading: true, error: null });

    try {
      const response = await api.uploadPDF(file);
      setState({ file, documentId: response.document_id, uploading: false, error: null });
    } catch (err) {
      setState({
        file,
        documentId: null,
        uploading: false,
        error: err instanceof Error ? err.message : '업로드 실패'
      });
    }
  }, []);

  // 드롭 핸들러
  const handleDrop = useCallback((e: React.DragEvent, type: 'problem' | 'solution') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      handleUpload(file, type);
    }
  }, [handleUpload]);

  // 싱글 탭 시작
  const handleStartSingleTab = () => {
    if (problemState.documentId && solutionState.documentId) {
      navigate(`/matching/${problemState.documentId}/${solutionState.documentId}`);
    }
  };

  // 듀얼 윈도우 시작 (기존 로직 재사용)
  const handleStartDualWindow = () => {
    // TODO: 기존 useDualWindowLauncher 활용
    alert('듀얼 윈도우 시작 (기존 로직 연동 필요)');
  };

  const canStart = problemState.documentId && solutionState.documentId;

  return (
    <Card variant="elevated" className="max-w-2xl mx-auto">
      <CardHeader>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          📚 문제-해설 매칭
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          문제와 해설 PDF를 연결하세요
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 파일 업로드 영역 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 문제 PDF */}
          <UploadBox
            type="problem"
            state={problemState}
            onDrop={(e) => handleDrop(e, 'problem')}
            onFileSelect={(file) => handleUpload(file, 'problem')}
            onClear={() => setProblemState({ file: null, documentId: null, uploading: false, error: null })}
          />

          {/* 해설 PDF */}
          <UploadBox
            type="solution"
            state={solutionState}
            onDrop={(e) => handleDrop(e, 'solution')}
            onFileSelect={(file) => handleUpload(file, 'solution')}
            onClear={() => setSolutionState({ file: null, documentId: null, uploading: false, error: null })}
          />
        </div>

        {/* 메인 버튼: 싱글 탭 */}
        <Button
          onClick={handleStartSingleTab}
          variant="primary"
          size="lg"
          disabled={!canStart}
          className="w-full"
        >
          <FileText className="w-5 h-5 mr-2" />
          매칭 시작하기
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        <p className="text-center text-sm text-gray-500">
          하나의 화면에서 문제와 해설을 순차적으로 연결합니다
        </p>

        {/* 서브 옵션: 듀얼 윈도우 */}
        <div className="pt-4 border-t border-gray-200">
          {!showDualOption ? (
            <button
              onClick={() => setShowDualOption(true)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Monitor className="w-4 h-4" />
              듀얼 모니터를 사용하시나요? →
            </button>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Monitor className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-700">듀얼 윈도우 모드</p>
                  <p className="text-sm text-gray-500 mt-1">
                    문제와 해설을 두 개의 창에서 나란히 볼 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleStartDualWindow}
                  variant="outline"
                  size="sm"
                  disabled={!canStart}
                  className="flex-1"
                >
                  🖥️🖥️ 듀얼 윈도우로 열기
                </Button>
                <Button
                  onClick={() => setShowDualOption(false)}
                  variant="ghost"
                  size="sm"
                >
                  닫기
                </Button>
              </div>

              <p className="text-xs text-amber-600">
                ⚠️ 팝업 차단을 해제해야 합니다
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 업로드 박스 컴포넌트
function UploadBox({
  type,
  state,
  onDrop,
  onFileSelect,
  onClear
}: {
  type: 'problem' | 'solution';
  state: UploadState;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}) {
  const isProblem = type === 'problem';
  const Icon = isProblem ? FileText : BookOpen;
  const color = isProblem ? 'blue' : 'purple';

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
        state.documentId
          ? `border-${color}-300 bg-${color}-50`
          : 'border-gray-300 hover:border-gray-400'
      }`}
    >
      {state.documentId ? (
        <>
          <Icon className={`w-8 h-8 mx-auto text-${color}-500`} />
          <p className="mt-2 font-medium text-gray-700 truncate">{state.file?.name}</p>
          <p className={`text-sm text-${color}-600`}>업로드 완료</p>
          <button
            onClick={onClear}
            className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </>
      ) : state.uploading ? (
        <>
          <div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <p className="mt-2 text-sm text-gray-500">업로드 중...</p>
        </>
      ) : (
        <>
          <Upload className="w-8 h-8 mx-auto text-gray-400" />
          <p className="mt-2 font-medium text-gray-700">
            {isProblem ? '📝 문제 PDF' : '📖 해설 PDF'}
          </p>
          <p className="text-sm text-gray-500">드래그 또는 클릭</p>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </>
      )}

      {state.error && (
        <p className="mt-2 text-sm text-red-500">{state.error}</p>
      )}
    </div>
  );
}
```

### 4.3 Dashboard에 적용
```tsx
// Dashboard.tsx에서 기존 DualUploadCard를 MatchingCard로 교체
import { MatchingCard } from '../components/matching/MatchingCard';

// 렌더링
<MatchingCard />
```

### 4.4 체크리스트
- [ ] `MatchingCard.tsx` 생성
- [ ] Dashboard에 적용
- [ ] 파일 업로드 테스트
- [ ] "매칭 시작하기" 클릭 → `/matching/...` 이동 확인

---

## Step 5: 문제 목록 패널 (3시간)

### 목표
오른쪽 패널에 문제 목록 표시 + 선택 기능

### 5.1 파일 생성
```
frontend/src/components/unified/ProblemListPanel.tsx
```

### 5.2 구현 코드
```tsx
/**
 * 문제 목록 패널 (Phase 31-E)
 *
 * 문제 목록 + 연결 상태 + 선택 기능
 */
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { useMatchingStore } from '../../stores/matchingStore';

export function ProblemListPanel() {
  const {
    activeTab,
    problems,
    selectedProblemId,
    selectProblem,
    selectNextUnlinked,
    selectPrevUnlinked,
    isLinked,
    getProgress,
  } = useMatchingStore();

  const { linked, total, percent } = getProgress();
  const isComplete = total > 0 && linked === total;

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 해설 탭에서만 작동
      if (activeTab !== 'solution') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextUnlinked();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevUnlinked();
      } else if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        selectNextUnlinked();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, selectNextUnlinked, selectPrevUnlinked]);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-900">
          📋 문제 목록
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {total > 0 ? `${linked}/${total} 연결됨` : '문제를 먼저 등록하세요'}
        </p>
      </div>

      {/* 문제 리스트 */}
      <div className="flex-1 overflow-y-auto p-2">
        {problems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>등록된 문제가 없습니다</p>
            <p className="text-sm mt-1">문제 탭에서 그룹을 생성하세요</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {problems.map((problem, index) => {
              const linked = isLinked(problem.groupId);
              const selected = selectedProblemId === problem.groupId;

              return (
                <motion.div
                  key={problem.groupId}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => !linked && selectProblem(problem.groupId)}
                  className={`flex items-center gap-3 p-3 rounded-lg mb-1 cursor-pointer transition-all ${
                    selected
                      ? 'bg-blue-50 border-2 border-blue-400'
                      : linked
                        ? 'bg-green-50 border border-green-200'
                        : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {/* 상태 아이콘 */}
                  <div className="flex-shrink-0">
                    {linked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : selected ? (
                      <ChevronRight className="w-5 h-5 text-blue-500 animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* 문제 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${selected ? 'text-blue-700' : 'text-gray-900'}`}>
                        {problem.problemNumber}
                      </span>
                      {selected && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                          선택됨
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {problem.displayName}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* 안내 메시지 (해설 탭에서) */}
      {activeTab === 'solution' && selectedProblemId && (
        <div className="p-4 border-t bg-blue-50">
          <p className="text-sm text-blue-700 font-medium">
            💡 선택된 문제의 해설을 그룹핑하세요
          </p>
          <p className="text-xs text-blue-600 mt-1">
            ↑↓: 문제 선택 | Tab: 다음 미연결
          </p>
        </div>
      )}

      {/* 진행률 */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">진행률</span>
          <span className="font-medium text-gray-900">{percent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* 완료 메시지 */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-green-100 rounded-lg text-center"
          >
            <p className="text-green-700 font-medium">
              🎉 모든 문제가 연결되었습니다!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
```

### 5.3 체크리스트
- [ ] `ProblemListPanel.tsx` 생성
- [ ] `index.ts`에 export 추가
- [ ] 키보드 네비게이션 테스트 (↑↓, Tab)
- [ ] 연결 상태 아이콘 확인

---

## Step 6: 캔버스 영역 연동 (4시간)

### 목표
기존 PageViewer를 탭별로 렌더링 + 해설 그룹 생성 시 자동 연결

### 6.1 UnifiedMatchingPage 수정

```tsx
// UnifiedMatchingPage.tsx 수정
import { PageViewer } from './PageViewer';
import { useMatchingStore } from '../stores/matchingStore';
import { useToast } from '../components/Toast';

export function UnifiedMatchingPage() {
  // ... 기존 코드 ...

  const { showToast } = useToast();
  const {
    activeTab,
    selectedProblemId,
    addProblem,
    createLink,
    selectNextUnlinked,
    problems,
  } = useMatchingStore();

  // 현재 활성 문서 ID
  const currentDocId = activeTab === 'problem' ? problemDocId : solutionDocId;

  // 그룹 생성 콜백 (문제 탭)
  const handleProblemGroupCreated = useCallback((group: ProblemGroup) => {
    addProblem({
      groupId: group.id,
      problemNumber: group.problemInfo?.problemNumber || `#${problems.length + 1}`,
      displayName: formatDisplayName(group.problemInfo),
      pageIndex: /* 현재 페이지 */,
      documentId: problemDocId!,
      blockIds: group.block_ids,
      createdAt: Date.now(),
    });
    showToast(`${group.problemInfo?.problemNumber || '문제'} 등록됨`, 'success');
  }, [addProblem, problemDocId, problems.length, showToast]);

  // 그룹 생성 콜백 (해설 탭)
  const handleSolutionGroupCreated = useCallback((group: ProblemGroup) => {
    if (selectedProblemId) {
      createLink(selectedProblemId, group.id);

      const problem = problems.find(p => p.groupId === selectedProblemId);
      showToast(`${problem?.problemNumber || '문제'} 해설 연결 완료!`, 'success');

      // 다음 미연결 문제로 자동 이동
      selectNextUnlinked();
    } else {
      showToast('연결할 문제를 먼저 선택하세요', 'warning');
    }
  }, [selectedProblemId, createLink, problems, selectNextUnlinked, showToast]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <MatchingHeader />

      <div className="flex-1 flex overflow-hidden">
        {/* 캔버스 영역 */}
        <div className="flex-1 overflow-hidden">
          <PageViewer
            documentId={currentDocId!}
            onGroupCreated={activeTab === 'problem'
              ? handleProblemGroupCreated
              : handleSolutionGroupCreated
            }
            // 해설 탭에서 문제 미선택 시 그룹 생성 비활성화
            disableGroupCreation={activeTab === 'solution' && !selectedProblemId}
          />
        </div>

        {/* 문제 목록 패널 */}
        <div className="w-80 flex-shrink-0 border-l bg-white overflow-hidden">
          <ProblemListPanel />
        </div>
      </div>
    </div>
  );
}

// 표시명 포맷
function formatDisplayName(info?: ProblemInfo): string {
  if (!info) return '정보 없음';
  const parts = [info.bookName];
  if (info.course) parts.push(info.course);
  parts.push(`p${info.page}`);
  return parts.join('_');
}
```

### 6.2 PageViewer props 확장

```tsx
// PageViewer.tsx에 props 추가
interface PageViewerProps {
  documentId: string;
  // ... 기존 props ...
  onGroupCreated?: (group: ProblemGroup) => void;
  disableGroupCreation?: boolean;
}
```

### 6.3 체크리스트
- [ ] PageViewer에 `onGroupCreated`, `disableGroupCreation` props 추가
- [ ] UnifiedMatchingPage에서 콜백 연결
- [ ] 문제 탭에서 그룹 생성 → problems에 추가 확인
- [ ] 해설 탭에서 그룹 생성 → 자동 연결 + 다음 문제 선택 확인
- [ ] 문제 미선택 시 해설 그룹 생성 차단 확인

---

## Step 7-10: 추가 기능 (5시간)

### Step 7: 문제 미리보기 (2시간)
```
frontend/src/components/unified/ProblemPreview.tsx
- 선택된 문제의 썸네일 표시
- 안내 메시지
```

### Step 8: 키보드 단축키 (1시간)
```
- 1/2: 탭 전환
- G: 그룹 생성
- Ctrl+S: 저장
```

### Step 9: 진행률 + 완료 축하 (1시간)
```
- 100% 완료 시 애니메이션
- Confetti 효과 (선택)
```

### Step 10: 듀얼 윈도우 분리 (1시간)
```
- [분리] 버튼 클릭 → 확인 모달
- 기존 useDualWindowLauncher 재활용
- 해설 창 새 윈도우로 분리
```

---

## 체크리스트 요약

### Day 1
- [ ] Step 1: Zustand 스토어 생성
- [ ] Step 2: 기본 페이지 + 라우팅
- [ ] Step 3: 탭 헤더 컴포넌트
- [ ] Step 4: Dashboard 매칭 카드 개편

### Day 2
- [ ] Step 5: 문제 목록 패널
- [ ] Step 6: 캔버스 영역 연동

### Day 3
- [ ] Step 7: 문제 미리보기
- [ ] Step 8: 키보드 단축키
- [ ] Step 9: 진행률 + 완료 축하
- [ ] Step 10: 듀얼 윈도우 분리

---

**"진행해줘"라고 하시면 Step 1부터 순서대로 구현합니다.**
