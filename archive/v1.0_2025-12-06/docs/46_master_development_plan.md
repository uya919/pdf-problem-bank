# 마스터 개발 계획 (Master Development Plan)

**작성일**: 2025-12-02
**버전**: 2.0 (딥러닝 자동화 로드맵 반영)
**핵심 전략**: 수동 라벨링 → 데이터 축적 (1000페이지) → 딥러닝 자동화

---

## 전략적 비전

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           개발 로드맵 전체 그림                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 1: Foundation (현재)                                             │
│  ├── 토스 스타일 UI 기반 구축 ✅                                        │
│  └── 핵심 컴포넌트 라이브러리 ✅                                        │
│                                                                         │
│  Phase 2: Manual Labeling Optimization                                  │
│  ├── 3-메뉴 UI 쉘 구축                                                  │
│  ├── 수동 라벨링 UX 최적화 (속도 2배)                                   │
│  └── 라벨링 진행률 대시보드                                             │
│           ↓                                                             │
│  ┌─────────────────────────────────────────┐                           │
│  │  📊 데이터 축적 목표: 1,000 페이지       │                           │
│  │     (약 5,000~10,000 문제 예상)          │                           │
│  └─────────────────────────────────────────┘                           │
│           ↓                                                             │
│  Phase 3: AI Enhancement (라벨링 후 처리)                               │
│  ├── Mathpix OCR (라벨링된 문제에서 수식 추출)                          │
│  ├── Claude 태깅 (단원/난이도 자동 분류)                                │
│  └── 문제 메타데이터 자동 enrichment                                    │
│           ↓                                                             │
│  Phase 4: Deep Learning Automation                                      │
│  ├── 학습 데이터 포맷 변환 (YOLO/COCO)                                  │
│  ├── 문제 영역 검출 모델 학습                                           │
│  ├── 추론 파이프라인 구축                                               │
│  └── 사용자 검수 → 승인 워크플로우                                      │
│           ↓                                                             │
│  🎯 최종 목표: "파일 드롭 → AI 자동검출 → Enter 승인"                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 21.5: UI 쉘 교체 (Minimal Shell)

### 목표
기존 12개 메뉴 UI를 **3개 핵심 메뉴**로 교체하되, 수동 라벨링 기능은 유지

### 새로운 메뉴 구조

```
┌─────────────────────────────────────┐
│  새로운 사이드바                    │
├─────────────────────────────────────┤
│                                     │
│  📥 등록 & 라벨링                   │
│     ├── 파일 업로드 (PDF/HML/HWPX) │
│     ├── 수동 라벨링 작업            │
│     └── 라벨링 진행률               │
│                                     │
│  📚 문제은행                        │
│     ├── 전체 문제 검색              │
│     ├── 단원별 필터                 │
│     └── 문제 상세/편집              │
│                                     │
│  📝 시험지 (후순위)                 │
│     └── 시험지 생성                 │
│                                     │
├─────────────────────────────────────┤
│  ⚙️ 설정                            │
│  📊 라벨링 통계 (N/1000)            │
└─────────────────────────────────────┘
```

### 구현 항목

#### Step 1: App.tsx 교체
```typescript
// 새로운 라우팅 구조
const routes = [
  { path: '/', element: <RegistrationPage /> },      // 등록 & 라벨링
  { path: '/labeling/:docId', element: <LabelingPage /> },  // 수동 라벨링
  { path: '/bank', element: <ProblemBankPage /> },   // 문제은행
  { path: '/exam', element: <ExamBuilderPage /> },   // 시험지 (후순위)
  { path: '/settings', element: <SettingsPage /> },  // 설정
];
```

#### Step 2: MinimalSidebar 컴포넌트
```typescript
// 파일: frontend/src/components/layout/MinimalSidebar.tsx

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;  // 진행 중인 작업 수
}

const menuItems: MenuItem[] = [
  { icon: Upload, label: '등록 & 라벨링', path: '/' },
  { icon: Library, label: '문제은행', path: '/bank' },
  { icon: FileText, label: '시험지', path: '/exam' },
];
```

#### Step 3: RegistrationPage (통합 등록 페이지)
```
┌─────────────────────────────────────────────────────────────┐
│  등록 & 라벨링                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │           📁 파일을 여기에 드롭하세요                  │ │
│  │              PDF, HWP, HWPX 지원                       │ │
│  │                                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 라벨링 진행률: 127 / 1,000 페이지 (12.7%)              │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  진행 중인 문서                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 베이직쎈 중등 2-1.pdf                            │   │
│  │    라벨링: 23/50 페이지 (46%)                       │   │
│  │    [계속하기]                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 수능특강 수학1.hwpx                              │   │
│  │    ✅ 파싱 완료 · 78문제 추출                        │   │
│  │    [문제은행에서 보기]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  완료된 문서 (3개)                                          │
│  [더 보기]                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Step 4: 라벨링 진행률 추적 시스템
```typescript
// 파일: frontend/src/hooks/useLabelingProgress.ts

interface LabelingProgress {
  totalPages: number;           // 전체 라벨링된 페이지
  targetPages: number;          // 목표 (1000)
  totalProblems: number;        // 전체 문제 수
  documentsInProgress: number;  // 진행 중 문서
  documentsCompleted: number;   // 완료 문서
}

// 백엔드 API
GET /api/stats/labeling-progress
Response: LabelingProgress
```

### 파일 생성/수정 목록

| 작업 | 파일 | 설명 |
|------|------|------|
| 생성 | `components/layout/MinimalSidebar.tsx` | 3개 메뉴 사이드바 |
| 생성 | `components/layout/MinimalLayout.tsx` | 새로운 레이아웃 |
| 생성 | `pages/RegistrationPage.tsx` | 통합 등록 페이지 |
| 수정 | `App.tsx` | 라우팅 교체 |
| 수정 | `components/layout/index.ts` | export 업데이트 |
| 생성 | `hooks/useLabelingProgress.ts` | 진행률 훅 |
| 생성 | `components/ProgressBar.tsx` | 진행률 바 |

### 체크리스트

- [ ] MinimalSidebar 컴포넌트 생성
- [ ] MinimalLayout 컴포넌트 생성
- [ ] RegistrationPage 기본 구조
- [ ] App.tsx 라우팅 교체
- [ ] 기존 Sidebar/Header 비활성화
- [ ] 라벨링 진행률 API 연동
- [ ] 진행률 바 UI 구현

---

## Phase 21.6: 수동 라벨링 UX 최적화

### 목표
수동 라벨링 속도를 **2배 향상** (페이지당 60초 → 30초)

### 현재 라벨링 워크플로우 분석

```
현재 워크플로우 (페이지당 ~60초):

1. 페이지 이미지 확인 (2초)
2. 블록 클릭하여 선택 (10초, 다중 선택 번거로움)
3. "그룹 생성" 버튼 클릭 (1초)
4. 문제 정보 입력 (10초)
   - 문제 번호 (자동이지만 확인 필요)
   - 문제 유형 선택
5. "저장" 버튼 클릭 (1초)
6. 다음 문제 영역으로 스크롤 (5초)
7. 반복... (페이지당 평균 3-5문제)

비효율 포인트:
- 마우스 클릭 많음
- 키보드 단축키 부재
- 저장 후 피드백 느림
```

### 최적화된 라벨링 워크플로우

```
새로운 워크플로우 (페이지당 ~30초):

1. 페이지 로드 시 블록 자동 하이라이트 (0초)
2. 드래그로 영역 선택 OR 블록 클릭 (5초)
3. [Enter] 즉시 그룹 생성 (0.5초)
4. 문제 번호 자동 증가 (0초, 수정 시 Tab+입력)
5. [Enter] 저장 & 다음 영역으로 자동 스크롤 (0.5초)
6. 반복...

개선 포인트:
- 키보드 중심 워크플로우
- Optimistic UI (즉시 반영)
- 자동 스크롤 & 포커스
```

### 키보드 단축키 시스템

```
┌─────────────────────────────────────────────────────────────┐
│                    라벨링 단축키                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  선택 & 그룹                                                │
│  ─────────────────────────────────────────────────────────  │
│  [클릭]        블록 선택 (토글)                             │
│  [Shift+클릭]  범위 선택                                    │
│  [Ctrl+A]      페이지 전체 블록 선택                        │
│  [Enter]       선택된 블록으로 그룹 생성 & 저장             │
│  [Esc]         선택 해제                                    │
│                                                             │
│  탐색                                                       │
│  ─────────────────────────────────────────────────────────  │
│  [←] [→]       이전/다음 페이지                             │
│  [↑] [↓]       이전/다음 블록으로 포커스                    │
│  [Space]       현재 포커스 블록 선택 토글                   │
│  [Tab]         다음 미라벨링 영역으로 점프                  │
│                                                             │
│  편집                                                       │
│  ─────────────────────────────────────────────────────────  │
│  [E]           마지막 그룹 편집                             │
│  [D]           마지막 그룹 삭제                             │
│  [Z]           실행 취소 (Undo)                             │
│                                                             │
│  빠른 유형 지정                                             │
│  ─────────────────────────────────────────────────────────  │
│  [1]           객관식                                       │
│  [2]           단답형                                       │
│  [3]           서술형                                       │
│  [4]           빈칸                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 최적화된 라벨링 UI 목업

```
┌─────────────────────────────────────────────────────────────────────────┐
│  베이직쎈 중등 2-1.pdf                    페이지 23/50  [←] [→]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │                                 │  │  이 페이지 문제             │  │
│  │                                 │  │                             │  │
│  │      [페이지 이미지]            │  │  ┌─────────────────────┐   │  │
│  │                                 │  │  │ #47 객관식          │   │  │
│  │   ┌──────────────────┐         │  │  │ 블록 3개            │   │  │
│  │   │ ████ 선택됨 ████ │         │  │  └─────────────────────┘   │  │
│  │   │ ████████████████ │         │  │                             │  │
│  │   └──────────────────┘         │  │  ┌─────────────────────┐   │  │
│  │                                 │  │  │ #48 단답형          │   │  │
│  │   ┌──────────────────┐         │  │  │ 블록 2개            │   │  │
│  │   │ 다음 영역 (희미) │         │  │  └─────────────────────┘   │  │
│  │   └──────────────────┘         │  │                             │  │
│  │                                 │  │  + 새 문제 (Enter)         │  │
│  │                                 │  │                             │  │
│  └─────────────────────────────────┘  │  ─────────────────────────  │  │
│                                        │  다음 문제 번호: #49       │  │
│                                        │  유형: [객관식 ▼]          │  │
│                                        └─────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  💡 Tip: 블록 선택 후 Enter로 빠르게 저장 | [?] 단축키 도움말   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 구현 항목

#### Step 1: 키보드 이벤트 핸들러
```typescript
// 파일: frontend/src/hooks/useLabelingKeyboard.ts

export function useLabelingKeyboard({
  onCreateGroup,
  onNextPage,
  onPrevPage,
  onUndo,
  selectedBlocks,
  setSelectedBlocks,
}: LabelingKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter: 그룹 생성 & 저장
      if (e.key === 'Enter' && selectedBlocks.length > 0) {
        e.preventDefault();
        onCreateGroup(selectedBlocks);
      }

      // Arrow keys: 페이지 이동
      if (e.key === 'ArrowRight') onNextPage();
      if (e.key === 'ArrowLeft') onPrevPage();

      // Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onUndo();
      }

      // 1-4: 문제 유형 빠른 선택
      if (['1', '2', '3', '4'].includes(e.key)) {
        setQuickType(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlocks]);
}
```

#### Step 2: Optimistic UI 적용
```typescript
// 파일: frontend/src/hooks/useOptimisticGroups.ts

export function useOptimisticGroups(pageId: string) {
  const queryClient = useQueryClient();

  const createGroup = useMutation({
    mutationFn: createGroupAPI,

    // 즉시 UI 업데이트 (서버 응답 전)
    onMutate: async (newGroup) => {
      await queryClient.cancelQueries(['groups', pageId]);

      const previousGroups = queryClient.getQueryData(['groups', pageId]);

      // 낙관적 업데이트
      queryClient.setQueryData(['groups', pageId], (old: Group[]) => [
        ...old,
        { ...newGroup, id: 'temp-' + Date.now(), isPending: true }
      ]);

      return { previousGroups };
    },

    // 성공 시: temp ID를 실제 ID로 교체
    onSuccess: (result, variables, context) => {
      queryClient.setQueryData(['groups', pageId], (old: Group[]) =>
        old.map(g => g.id.startsWith('temp-') ? result : g)
      );
    },

    // 실패 시: 롤백
    onError: (err, variables, context) => {
      queryClient.setQueryData(['groups', pageId], context.previousGroups);
      toast.error('저장 실패. 다시 시도해주세요.');
    },
  });

  return { createGroup };
}
```

#### Step 3: 자동 스크롤 & 포커스
```typescript
// 파일: frontend/src/hooks/useAutoScroll.ts

export function useAutoScroll(canvasRef: RefObject<HTMLDivElement>) {
  const scrollToNextUnlabeled = useCallback((groups: Group[], blocks: Block[]) => {
    // 라벨링되지 않은 블록 찾기
    const labeledBlockIds = new Set(groups.flatMap(g => g.blockIds));
    const unlabeledBlock = blocks.find(b => !labeledBlockIds.has(b.id));

    if (unlabeledBlock && canvasRef.current) {
      // 부드러운 스크롤
      canvasRef.current.scrollTo({
        top: unlabeledBlock.y - 100,
        behavior: 'smooth'
      });

      // 포커스 표시
      highlightBlock(unlabeledBlock.id);
    }
  }, []);

  return { scrollToNextUnlabeled };
}
```

### 체크리스트

- [ ] useLabelingKeyboard 훅 구현
- [ ] useOptimisticGroups 훅 구현
- [ ] useAutoScroll 훅 구현
- [ ] LabelingPage UI 리팩토링
- [ ] 단축키 도움말 오버레이
- [ ] 블록 선택 UX 개선 (시각적 피드백)
- [ ] 문제 번호 자동 증가 로직
- [ ] Undo/Redo 스택 구현

---

## Phase 22: AI Enhancement (라벨링 후 처리)

### 목표
라벨링된 문제에 **메타데이터 자동 추가** (수식 추출, 단원 분류)

### 중요: AI는 라벨링 자동화가 아님

```
┌─────────────────────────────────────────────────────────────┐
│                    AI 역할 명확화                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ❌ AI가 하지 않는 것 (Phase 22):                          │
│     - PDF에서 문제 영역 자동 검출                          │
│     - 블록 자동 그룹핑                                     │
│     (→ 이건 Phase 24 딥러닝에서 해결)                      │
│                                                             │
│  ✅ AI가 하는 것 (Phase 22):                               │
│     - 라벨링된 문제 이미지 → LaTeX 수식 추출 (Mathpix)     │
│     - 추출된 텍스트 → 단원/난이도 자동 분류 (Claude)       │
│     - HML/HWPX 파일 → 문제 자동 파싱 (기존 파서)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### B-1: Mathpix OCR (수식 추출)

#### 사용 시점
```
라벨링 완료 → 문제 이미지 생성 → [Mathpix OCR] → LaTeX 저장
                                       ↑
                                   이 시점에 호출
```

#### 구현
```python
# 파일: backend/app/services/ai/mathpix_service.py

class MathpixService:
    async def extract_latex(self, problem_image_path: str) -> MathpixResult:
        """
        라벨링된 문제 이미지에서 LaTeX 수식 추출

        호출 시점: 그룹 저장 후 자동 또는 배치 처리
        """
        # ... 구현
```

#### API 엔드포인트
```
POST /api/problems/{problem_id}/extract-latex
- 단일 문제 수식 추출

POST /api/documents/{doc_id}/extract-latex-batch
- 문서 전체 문제 일괄 추출
```

### B-2: Claude 태깅 (단원/난이도 분류)

#### 사용 시점
```
문제 이미지 + LaTeX → [Claude API] → 단원/난이도 태그
                           ↑
                       이 시점에 호출
```

#### 구현
```python
# 파일: backend/app/services/ai/tagging_service.py

class TaggingService:
    async def auto_tag(self, problem: Problem) -> TaggingResult:
        """
        문제 내용 분석하여 자동 태깅

        입력: 문제 이미지 + LaTeX 텍스트
        출력: 단원, 난이도, 문제유형, 신뢰도
        """
        # ... 구현
```

### Phase 22 체크리스트

- [ ] Mathpix 서비스 구현
- [ ] Claude 태깅 서비스 구현
- [ ] 라벨링 완료 시 자동 트리거
- [ ] 배치 처리 API
- [ ] 비용 모니터링

---

## Phase 23: 문제은행 통합 & Mathpix OCR

### 목표
1. **소스 타입 구분**: HML/HWPX vs PDF라벨링 vs PDF+OCR 분리 저장
2. **Mathpix 통합**: PDF 라벨링 이미지 → LaTeX 텍스트 변환
3. **통합 UI**: 모든 소스를 하나의 문제은행에서 관리

### 핵심 발견 (연구 리포트 기반)

```
┌─────────────────────────────────────────────────────────────┐
│              형식 호환성 분석                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HML/HWPX 파서 출력:                                       │
│  ├── content_text: "방정식 x + 2 = 5 를 풀어라"            │
│  ├── content_latex: "방정식 $x + 2 = 5$ 를 풀어라"         │
│  ├── answer: "3"                                           │
│  └── answer_type: "value"                                  │
│                                                             │
│  Mathpix API 출력:                                         │
│  ├── text: "방정식 \( x + 2 = 5 \) 를 풀어라"              │
│  ├── latex_styled: "방정식 $x + 2 = 5$ 를 풀어라"          │
│  └── confidence: 0.95                                       │
│                                                             │
│  ✅ 결론: 변환 가능! (정답은 수동 입력 필요)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 23-A: 통합 데이터 모델 (3일)

#### 새로운 ProblemSource 타입
```python
class ProblemSource:
    type: str  # "hml" | "hwpx" | "pdf_labeled" | "pdf_ocr" | "manual"
    document_id: Optional[str]
    document_name: Optional[str]
    page_index: Optional[int]
    ocr_provider: Optional[str]      # "mathpix"
    ocr_confidence: Optional[float]  # 0.0~1.0
```

#### 마이그레이션
- 기존 HML/HWPX 문제 → `source.type = "hml"` / `"hwpx"`
- 기존 PDF 라벨링 → `source.type = "pdf_labeled"`

### Phase 23-B: Mathpix OCR 통합 (4일)

#### API 클라이언트
```python
# backend/app/services/ocr/mathpix_client.py
class MathpixClient:
    async def ocr_image(self, image_path: str) -> MathpixResponse
    async def convert_to_problem(self, response, source_info) -> UnifiedProblem
```

#### 엔드포인트
```
POST /api/problems/{id}/ocr          # 단일 문제 OCR
POST /api/problems/ocr-batch         # 배치 OCR
GET  /api/problems/ocr-status/{id}   # OCR 상태 확인
```

### Phase 23-C: 통합 API (3일)

```python
# 새로운 통합 엔드포인트
GET  /api/v2/problems                    # 통합 목록 (소스 필터 지원)
GET  /api/v2/problems/{id}               # 상세 조회
POST /api/v2/problems/import/pdf-labeled # PDF 라벨링에서 가져오기
POST /api/v2/problems/import/hml         # HML에서 가져오기
GET  /api/v2/problems/stats              # 소스별 통계
```

### Phase 23-D: 통합 UI (5일)

#### 새로운 탭 구조
```
┌─────────────────────────────────────────────────────────────┐
│  문제은행                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [전체 1,234] [한글파일 856] [PDF+OCR 251] [이미지만 127]  │
│  [검수필요 45] [휴지통 12]                                  │
│                                                             │
│  ┌─ 필터 ─────────────────────────────────────────────┐    │
│  │ 소스: [전체 ▼]  과목: [수학 ▼]  상태: [전체 ▼]     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ [HML]   │  │ [OCR]   │  │ [IMG]   │  │ [HWPX]  │       │
│  │ 수학1   │  │ ⚠️ 95%  │  │ No OCR  │  │ 수학2   │       │
│  │ 1번     │  │ 3번     │  │ 5번     │  │ 2번     │       │
│  │ ✓ 정답  │  │ - 정답  │  │ - 정답  │  │ ✓ 정답  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 소스 타입별 배지

| 소스 타입 | 배지 | 색상 | 설명 |
|-----------|------|------|------|
| `hml` | HML | 🟢 Green | 한글 HML 파싱 |
| `hwpx` | HWPX | 🟢 Green | 한글 HWPX 파싱 |
| `pdf_ocr` | OCR | 🟡 Yellow | PDF + Mathpix OCR |
| `pdf_labeled` | IMG | 🔵 Blue | PDF 이미지만 (OCR 없음) |

#### OCR 검수 워크플로우
```
PDF 라벨링 완료 → [OCR 적용] 버튼 → Mathpix 호출 → 결과 표시
                                            ↓
                              신뢰도 < 95%: 검수 필요 표시
                                            ↓
                              사용자 수정 → 저장
```

### Phase 23 비용 분석

| 항목 | 비용 | 비고 |
|------|------|------|
| Mathpix Starter | $9.99/월 | 5,000문제/월 |
| 1,000페이지 × 5문제 | = 5,000문제 | 1개월 내 처리 가능 |

### Phase 23 체크리스트

#### 23-A: 데이터 모델 (Day 1-3)
- [ ] UnifiedProblem 모델 정의
- [ ] ProblemSource 타입 구현
- [ ] 마이그레이션 스크립트

#### 23-B: Mathpix 통합 (Day 4-7)
- [ ] MathpixClient 구현
- [ ] OCR API 엔드포인트
- [ ] 응답 → Problem 변환

#### 23-C: 통합 API (Day 8-10)
- [ ] /api/v2/problems CRUD
- [ ] 소스별 필터링
- [ ] 통계 API

#### 23-D: 통합 UI (Day 11-15)
- [ ] UnifiedProblemBankPage
- [ ] 소스 타입 배지
- [ ] OCR 버튼 및 검수 UI
- [ ] 배치 OCR 기능

---

## Phase 24: 딥러닝 자동화 준비

### 목표
1,000페이지 라벨링 데이터로 **문제 영역 검출 모델** 학습

### 24-1: 학습 데이터 포맷 변환

#### YOLO 포맷 (권장)
```
dataset/
├── images/
│   ├── train/
│   │   ├── page_001.png
│   │   ├── page_002.png
│   │   └── ...
│   └── val/
│       └── ...
├── labels/
│   ├── train/
│   │   ├── page_001.txt  # x_center y_center width height (normalized)
│   │   └── ...
│   └── val/
│       └── ...
└── data.yaml
```

#### 변환 스크립트
```python
# 파일: backend/app/services/ml/export_training_data.py

def export_to_yolo(output_dir: str, train_ratio: float = 0.8):
    """
    라벨링 데이터를 YOLO 학습 포맷으로 변환

    Classes:
    0: problem_region (문제 영역)
    1: answer_region (정답 영역, 선택)
    """
    # 모든 라벨링된 그룹 조회
    # 바운딩 박스 계산 (블록들의 union)
    # 정규화 좌표 계산
    # train/val 분할
    # 파일 출력
```

### 24-2: 모델 선정

| 모델 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| YOLOv8 | 빠름, 쉬운 학습 | 정확도 중간 | ⭐⭐⭐⭐ |
| YOLOv9 | 최신, 높은 정확도 | 학습 오래 걸림 | ⭐⭐⭐⭐ |
| RT-DETR | Transformer 기반 | 복잡 | ⭐⭐⭐ |
| Detectron2 | 유연함 | 설정 복잡 | ⭐⭐ |

**권장**: YOLOv8 또는 YOLOv9 (Ultralytics)

### 24-3: 학습 파이프라인

```python
# 파일: scripts/train_problem_detector.py

from ultralytics import YOLO

# 사전학습 모델 로드
model = YOLO('yolov8m.pt')  # medium 모델

# 커스텀 데이터로 학습
results = model.train(
    data='dataset/data.yaml',
    epochs=100,
    imgsz=1280,  # 고해상도 (문서 이미지)
    batch=8,
    patience=20,
    device='cuda',
)

# 모델 저장
model.export(format='onnx')  # 추론용 ONNX 변환
```

### 24-4: 추론 파이프라인

```python
# 파일: backend/app/services/ml/problem_detector.py

class ProblemDetector:
    def __init__(self, model_path: str):
        self.model = YOLO(model_path)

    def detect(self, page_image_path: str) -> list[DetectedRegion]:
        """
        페이지 이미지에서 문제 영역 검출

        Returns:
            list[DetectedRegion]: 검출된 영역들
                - bbox: (x1, y1, x2, y2)
                - confidence: 신뢰도
                - class: 'problem' | 'answer'
        """
        results = self.model.predict(page_image_path, conf=0.5)

        regions = []
        for r in results[0].boxes:
            regions.append(DetectedRegion(
                bbox=r.xyxy[0].tolist(),
                confidence=r.conf[0].item(),
                class_name=self.model.names[int(r.cls[0])]
            ))

        return regions
```

### 24-5: 자동화 워크플로우 (최종 목표)

```
┌─────────────────────────────────────────────────────────────┐
│              Phase 24 완료 후 워크플로우                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 파일 드롭 (PDF)                                         │
│           ↓                                                 │
│  2. 페이지 → 이미지 변환                                    │
│           ↓                                                 │
│  3. 🤖 딥러닝 모델: 문제 영역 자동 검출                     │
│           ↓                                                 │
│  4. 🤖 Mathpix: 수식 추출                                   │
│           ↓                                                 │
│  5. 🤖 Claude: 단원/난이도 태깅                             │
│           ↓                                                 │
│  6. 사용자 검수 (Enter로 승인)                              │
│           ↓                                                 │
│  7. 문제은행에 저장                                         │
│                                                             │
│  예상 시간: 페이지당 3초 (대부분 자동)                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 24 체크리스트

- [ ] 학습 데이터 내보내기 스크립트
- [ ] YOLO 학습 환경 설정
- [ ] 모델 학습 (1000페이지 후)
- [ ] 추론 서비스 구현
- [ ] 검수 UI 연동

---

## 전체 일정 요약 및 시기 권장

### 개발 순서 및 권장 시기

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    개발 로드맵 (권장 순서)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ══════════════════════════════════════════════════════════════════    │
│  📍 현재 위치: Phase 21.5 ✅ → Phase 21.6 ✅                            │
│  ══════════════════════════════════════════════════════════════════    │
│                                                                         │
│  🟢 즉시 진행 (이번 주)                                                 │
│  ─────────────────────────────────────────────────────────────────     │
│  Phase 22: AI Enhancement (4-5일)                                       │
│  ├── Day 1-2: Mathpix 클라이언트 구현                                   │
│  ├── Day 3-4: Claude 태깅 서비스                                        │
│  └── Day 5: 통합 테스트                                                 │
│  ⚡ 권장: 라벨링 시작 전에 Mathpix 연동 완료                            │
│                                                                         │
│  🟡 다음 단계 (다음 주)                                                 │
│  ─────────────────────────────────────────────────────────────────     │
│  Phase 23: 문제은행 통합 (15일)                                         │
│  ├── 23-A: 통합 데이터 모델 (3일)                                       │
│  ├── 23-B: Mathpix OCR 통합 (4일)                                       │
│  ├── 23-C: 통합 API (3일)                                               │
│  └── 23-D: 통합 UI 재설계 (5일)                                         │
│  ⚡ 권장: Phase 22 완료 후 바로 진행                                     │
│                                                                         │
│  🔵 라벨링 시작 가능 시점                                               │
│  ─────────────────────────────────────────────────────────────────     │
│  Phase 22 + 23 완료 후 → 본격 라벨링 시작                               │
│  ├── 목표: 1,000 페이지                                                 │
│  ├── 예상 기간: 2-3개월 (하루 평균 15-20페이지)                        │
│  └── 동시에: OCR 적용하며 데이터 품질 확인                              │
│                                                                         │
│  ⚪ 데이터 축적 완료 후 (3개월 후)                                      │
│  ─────────────────────────────────────────────────────────────────     │
│  Phase 24: 딥러닝 자동화                                                │
│  ├── 24-1: 학습 데이터 포맷 변환 (YOLO)                                 │
│  ├── 24-2: 모델 학습 (GPU 서버 필요)                                    │
│  ├── 24-3: 추론 서비스 구현                                             │
│  └── 24-4: 검수 워크플로우 연동                                         │
│  ⚡ 전제 조건: 1,000페이지 라벨링 데이터 축적                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 상세 일정표

| Phase | 기간 | 시작 조건 | 권장 시기 |
|-------|------|-----------|-----------|
| **21.5** | 2일 | - | ✅ 완료 |
| **21.6** | 3일 | 21.5 완료 | ✅ 완료 |
| **22** | 5일 | 21.6 완료 | 🟢 **이번 주** |
| **23-A** | 3일 | 22 완료 | 🟡 다음 주 |
| **23-B** | 4일 | 23-A 완료 | 🟡 다음 주 |
| **23-C** | 3일 | 23-B 완료 | 🟡 +1주 |
| **23-D** | 5일 | 23-C 완료 | 🟡 +1주 |
| **라벨링** | 2-3개월 | 23 완료 | Phase 23 완료 후 |
| **24** | 2주 | 1,000페이지 | 라벨링 완료 후 |

### 왜 이 순서인가?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        순서 결정 근거                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ❓ Q: Phase 22 (Mathpix)를 먼저 하는 이유?                            │
│  ─────────────────────────────────────────────────────────────────     │
│  A: 라벨링하면서 바로 OCR 적용 가능                                     │
│     → 라벨링 + OCR 동시 진행 = 시간 절약                               │
│     → 나중에 일괄 OCR 시 비용/시간 낭비                                │
│                                                                         │
│  ❓ Q: Phase 23 (문제은행 통합)을 라벨링 전에 하는 이유?               │
│  ─────────────────────────────────────────────────────────────────     │
│  A: 소스 타입 구분이 데이터 저장 구조에 영향                            │
│     → 나중에 마이그레이션하면 더 복잡                                   │
│     → 처음부터 통합 형식으로 저장하는 게 효율적                        │
│                                                                         │
│  ❓ Q: Phase 24 (딥러닝)를 가장 마지막에 하는 이유?                    │
│  ─────────────────────────────────────────────────────────────────     │
│  A: 학습 데이터 1,000페이지 필요                                        │
│     → 데이터 없이 모델 학습 불가                                        │
│     → 라벨링 완료 후에만 의미 있음                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 병렬 진행 가능 항목

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       병렬 작업 맵                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Timeline →                                                             │
│                                                                         │
│  Week 1    Week 2    Week 3    Week 4    Month 2-3   Month 4           │
│  ────────────────────────────────────────────────────────────────       │
│                                                                         │
│  [Phase 22]                                                             │
│  └──────┘                                                               │
│           [Phase 23-A][Phase 23-B]                                      │
│           └──────────────────────┘                                      │
│                        [Phase 23-C][Phase 23-D]                         │
│                        └──────────────────────┘                         │
│                                    ┌────────────────────────────┐       │
│                                    │    라벨링 작업 (1,000p)    │       │
│                                    │    + 동시 OCR 적용         │       │
│                                    └────────────────────────────┘       │
│                                                              [Phase 24] │
│                                                              └────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 성공 지표

### 단기 (Phase 21-23)
| 지표 | 목표 |
|------|------|
| 페이지당 라벨링 시간 | 60초 → 30초 |
| UI 메뉴 수 | 12개 → 3개 |
| 라벨링 완료 페이지 | 0 → 1,000 |

### 장기 (Phase 24 이후)
| 지표 | 목표 |
|------|------|
| 문제 영역 검출 정확도 | 90%+ (mAP) |
| 자동화 후 페이지당 시간 | 3초 |
| 사용자 개입 | 승인만 (Enter) |

---

## 현재 진행 상태

### 완료된 Phase
- ✅ **Phase 21.5**: UI 쉘 교체 (MinimalSidebar, 3개 메뉴)
- ✅ **Phase 21.6**: 수동 라벨링 UX 최적화 (Enter 키, 단축키 도움말)

### 다음 단계

| 순서 | Phase | 내용 | 권장 시기 |
|------|-------|------|-----------|
| 1 | **Phase 22** | Mathpix + Claude 통합 | 🟢 **이번 주** |
| 2 | **Phase 23** | 문제은행 통합 (소스 구분, OCR) | 🟡 다음 주 |
| 3 | 라벨링 | 1,000페이지 수동 라벨링 | Phase 23 완료 후 |
| 4 | **Phase 24** | 딥러닝 자동화 | 라벨링 완료 후 (3개월) |

---

## 참고 문서

- [47_problem_bank_unification_research.md](47_problem_bank_unification_research.md) - 문제은행 통합 연구 리포트
- [44_phase22_intelligence_plan.md](44_phase22_intelligence_plan.md) - AI Enhancement 상세 계획

---

*"Phase 22 진행해줘"라고 말씀하시면 Mathpix/Claude 통합부터 시작합니다.*
*"Phase 23 진행해줘"라고 말씀하시면 문제은행 통합을 시작합니다.*

---

*마지막 업데이트: 2025-12-02*
