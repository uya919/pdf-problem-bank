# Phase 40: 라벨링 시스템 전체 리팩토링 계획

> 2025-12-04 | Opus 심층 설계
> "누더기 코드를 깨끗한 아키텍처로"

---

## 1. 현재 상태 진단

### 1.1 누더기가 된 원인

```
Phase 3  → Phase 8  → Phase 9  → Phase 11 → Phase 21 → Phase 23 → Phase 29 → Phase 34 → Phase 39
   ↓          ↓          ↓          ↓          ↓          ↓          ↓          ↓          ↓
기본 UI  → 책페이지 → 자동편집 → 자동확정 → 미니멀UI → 확정시스템 → 문서설정 → 메인개선 → 콜백추가
   +          +          +          +          +          +          +          +          +
   ========================================================================
                    계속 기존 코드 위에 덧붙이기
   ========================================================================
```

**문제**: 새 기능 추가 시 기존 구조를 리팩토링하지 않고 그 위에 쌓아올림

### 1.2 PageViewer.tsx 분석 (760줄)

```
현재 구조:
├── 상태 선언 (15개 useState + 5개 useRef)     ← 너무 많음
├── 훅 호출 (10개)                             ← 괜찮음
├── 핸들러 함수 (15개+)                        ← 너무 많음
├── useEffect (8개)                           ← 복잡
└── JSX 렌더링 (150줄)                         ← UI 요소 과다
    ├── DocumentSettingsModal
    ├── 보라색 헤더 배너 (40줄)                 ← 삭제 대상
    ├── PageNavigation
    ├── "페이지 미리보기" 헤더                  ← 삭제 대상
    ├── PageCanvas
    ├── GroupPanel
    └── 통계 카드 4개 (60줄)                   ← 삭제 대상
```

### 1.3 파일 정리 현황

```
frontend/src/pages/ (27개 파일)
├── 활성 사용 (10개)
│   ├── MainPage.tsx              ← 메인
│   ├── LabelingPage.tsx          ← 라벨링 진입점
│   ├── PageViewer.tsx            ← 핵심 (리팩토링 대상)
│   ├── UnifiedWorkPage.tsx       ← 통합 작업
│   ├── UnifiedMatchingPage.tsx   ← 매칭
│   ├── ViewerPage.tsx            ← 듀얼 윈도우
│   ├── ProblemBankHub.tsx        ← 문제은행
│   ├── ExamBuilderPage.tsx       ← 시험지
│   ├── ExamEditorPage.tsx        ← 시험지 편집
│   └── SettingsPage.tsx          ← 설정
│
├── 레거시/하위호환 (4개)
│   ├── RegistrationPage.tsx
│   ├── WorkSessionLabelingPage.tsx
│   ├── WorkSessionSetupPage.tsx
│   └── WorkSessionMatchingPage.tsx
│
└── 미사용/고아 파일 (13개)          ← 정리 대상
    ├── Dashboard.tsx
    ├── DocumentsPage.tsx
    ├── TasksPage.tsx
    ├── StatisticsPage.tsx
    ├── ClassificationTestPage.tsx
    ├── HangulUploadPage.tsx
    ├── SolutionMatchingPage.tsx
    ├── ProblemBankPage.tsx
    ├── NewProblemBankPage.tsx
    ├── IntegratedProblemBankPage.tsx
    ├── ProblemsView.tsx
    ├── ProblemsViewWrapper.tsx
    └── WorkSessionDashboard.tsx
```

---

## 2. 리팩토링 목표

### 2.1 토스 철학 달성

| 원칙 | 현재 | 목표 |
|------|------|------|
| 시각적 단순화 | 45% | **90%** |
| 기본값 자동화 | 80% | 90% |
| 속도감 | 70% | 90% |

### 2.2 코드 품질 목표

| 지표 | 현재 | 목표 |
|------|------|------|
| PageViewer.tsx | 760줄 | **200줄 이하** |
| 컴포넌트 분리 | 3개 | **6개** (단일 책임) |
| 미사용 파일 | 13개 | **0개** |
| 상태 복잡도 | 15개 useState | **5개 이하** (훅 분리) |

---

## 3. 새로운 아키텍처

### 3.1 컴포넌트 트리 (목표)

```
LabelingPage (진입점, 라우팅만)
└── LabelingWorkspace (새로 생성)
    ├── LabelingHeader (새로 생성)
    │   ├── BackButton
    │   ├── DocumentTitle
    │   ├── ProgressIndicator
    │   └── ExportButton
    │
    ├── LabelingContent (새로 생성)
    │   ├── ProblemListPanel (기존 유지)
    │   ├── CanvasArea (새로 생성)
    │   │   ├── SimpleNavigation (새로 생성, 간소화)
    │   │   └── PageCanvas (기존 유지)
    │   └── AccordionGroupPanel (새로 생성)
    │       ├── CurrentPageSection
    │       └── CompletedPageSection[]
    │
    └── (모달들은 필요시 lazy load)
```

### 3.2 상태 관리 분리

```typescript
// 현재: PageViewer에 모든 상태가 몰려있음

// 목표: 커스텀 훅으로 분리
useLabelingState(documentId)
├── currentPage, setCurrentPage
├── selectedBlocks, setSelectedBlocks
├── localGroups, setLocalGroups
└── visitedPages (새로 추가)

useGroupActions(documentId, currentPage)
├── createGroup()
├── deleteGroup()
├── updateGroupInfo()
├── confirmGroup()
└── saveGroups()

usePageNavigation(documentId, totalPages)
├── goToPage()
├── goNext()
├── goPrev()
└── bookPage (계산된 값)
```

### 3.3 파일 구조 (목표)

```
frontend/src/
├── pages/
│   ├── labeling/                    ← 새 폴더
│   │   ├── LabelingPage.tsx         ← 진입점 (50줄)
│   │   ├── LabelingWorkspace.tsx    ← 메인 컨테이너 (100줄)
│   │   ├── LabelingHeader.tsx       ← 상단 헤더 (50줄)
│   │   └── LabelingContent.tsx      ← 3단 레이아웃 (50줄)
│   │
│   ├── MainPage.tsx
│   └── ... (기타 활성 페이지)
│
├── components/
│   ├── labeling/                    ← 새 폴더
│   │   ├── SimpleNavigation.tsx     ← 간소화된 네비게이션 (80줄)
│   │   ├── CanvasArea.tsx           ← 캔버스 + 네비게이션 (50줄)
│   │   ├── AccordionGroupPanel.tsx  ← 아코디언 패널 (200줄)
│   │   └── PageSection.tsx          ← 아코디언 섹션 (100줄)
│   │
│   ├── PageCanvas.tsx               ← 기존 유지 (핵심 로직)
│   └── ... (기타 공용 컴포넌트)
│
├── hooks/
│   ├── labeling/                    ← 새 폴더
│   │   ├── useLabelingState.ts      ← 상태 관리 (100줄)
│   │   ├── useGroupActions.ts       ← 그룹 액션 (150줄)
│   │   ├── usePageNavigation.ts     ← 네비게이션 (50줄)
│   │   └── useVisitedPages.ts       ← 방문 페이지 추적 (50줄)
│   │
│   └── ... (기타 훅)
│
└── ... (기타)
```

---

## 4. 구현 단계

### Phase 40-A: 파일 정리 (30분)

```
[ ] 1. 백업 파일 삭제
    - PageViewer.tsx.backup
    - PageViewer.tsx.backup-20251126-144518
    - PageCanvas.tsx.backup

[ ] 2. 미사용 파일 아카이브 (삭제 전 확인)
    - pages/_archived/ 폴더로 이동
    - 13개 파일 이동

[ ] 3. 빌드 확인
    - npm run build
    - 라우팅 확인
```

### Phase 40-B: UI 요소 삭제/간소화 (1시간)

```
[ ] 1. PageViewer.tsx에서 삭제
    - 보라색 그라데이션 헤더 (L627-641)
    - "페이지 미리보기" 헤더 (L660-662)
    - 하단 통계 카드 4개 (L700-756)

[ ] 2. PageNavigation.tsx 간소화
    - [<<] [>>] 버튼 제거
    - 단축키 힌트 한 줄로 축소
    - 페이지 오프셋 설정 → 드롭다운으로 숨김

[ ] 3. 빌드 및 UI 확인
```

### Phase 40-C: 상태 훅 분리 (1시간)

```
[ ] 1. hooks/labeling/ 폴더 생성

[ ] 2. useLabelingState.ts 생성
    - PageViewer에서 상태 로직 추출
    - currentPage, selectedBlocks, localGroups
    - visitedPages 추가

[ ] 3. useGroupActions.ts 생성
    - 그룹 생성/삭제/업데이트/확정 로직 추출
    - 저장 로직 (디바운스, 즉시 저장)

[ ] 4. PageViewer.tsx 리팩토링
    - 훅 사용으로 변경
    - 600줄 → 300줄 목표
```

### Phase 40-D: 아코디언 패널 구현 (1.5시간)

```
[ ] 1. components/labeling/ 폴더 생성

[ ] 2. AccordionGroupPanel.tsx 생성
    - 기존 GroupPanel 로직 재사용
    - 페이지별 섹션 구조
    - 자동 펼침/접힘 로직

[ ] 3. PageSection.tsx 생성
    - 펼쳐진 상태: 그룹 목록
    - 접힌 상태: 페이지번호 + 진행률

[ ] 4. useVisitedPages.ts 생성
    - 방문 페이지 추적
    - localStorage 영속화

[ ] 5. PageViewer에 통합
```

### Phase 40-E: 레이아웃 재구성 (1시간)

```
[ ] 1. LabelingHeader.tsx 생성
    - 뒤로가기 + 문서명 + 진행률 + 내보내기
    - 간결한 한 줄 헤더

[ ] 2. SimpleNavigation.tsx 생성
    - 기존 PageNavigation 대체
    - 핵심 기능만 (이전/현재/다음)
    - 진행률 바 통합

[ ] 3. CanvasArea.tsx 생성
    - SimpleNavigation + PageCanvas 조합
    - 깔끔한 컨테이너

[ ] 4. LabelingContent.tsx 생성
    - 3단 레이아웃 (왼쪽/중앙/오른쪽)
    - 반응형 처리

[ ] 5. PageViewer → LabelingWorkspace 이름 변경
    - 300줄 → 200줄 목표
```

### Phase 40-F: 최종 정리 (30분)

```
[ ] 1. 기존 PageViewer.tsx 삭제 (새 구조로 대체)

[ ] 2. 기존 PageNavigation.tsx 삭제

[ ] 3. 기존 GroupPanel.tsx → 레거시 폴더로 이동

[ ] 4. 라우팅 업데이트 (필요시)

[ ] 5. 전체 빌드 및 테스트

[ ] 6. 문서 업데이트
```

---

## 5. 상세 설계

### 5.1 LabelingHeader (새로 생성)

```tsx
// components/labeling/LabelingHeader.tsx (50줄)
interface LabelingHeaderProps {
  documentId: string;
  documentName: string;
  progress: { completed: number; total: number };
  onBack: () => void;
  onExport: () => void;
}

export function LabelingHeader({
  documentId,
  documentName,
  progress,
  onBack,
  onExport,
}: LabelingHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-grey-100">
      {/* 왼쪽: 뒤로가기 + 문서명 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-grey-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">{documentName}</h1>
          <p className="text-sm text-grey-500">
            {progress.completed}/{progress.total} 완료
          </p>
        </div>
      </div>

      {/* 오른쪽: 도움말 + 설정 + 내보내기 */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-grey-100 rounded-lg">
          <HelpCircle className="w-5 h-5 text-grey-500" />
        </button>
        <button className="p-2 hover:bg-grey-100 rounded-lg">
          <Settings className="w-5 h-5 text-grey-500" />
        </button>
        <Button onClick={onExport} variant="primary" size="sm">
          내보내기
        </Button>
      </div>
    </header>
  );
}
```

### 5.2 SimpleNavigation (새로 생성)

```tsx
// components/labeling/SimpleNavigation.tsx (80줄)
interface SimpleNavigationProps {
  currentPage: number;
  totalPages: number;
  bookPage?: number;
  onPageChange: (page: number) => void;
}

export function SimpleNavigation({
  currentPage,
  totalPages,
  bookPage,
  onPageChange,
}: SimpleNavigationProps) {
  const progress = ((currentPage + 1) / totalPages) * 100;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-grey-50">
      {/* 이전 버튼 */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-grey-100 rounded-lg disabled:opacity-50"
      >
        <ChevronLeft className="w-4 h-4" />
        이전
      </button>

      {/* 중앙: 페이지 정보 + 진행률 */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-medium">
          {currentPage + 1} / {totalPages}
          {bookPage && <span className="text-grey-500 ml-2">(책 {bookPage}p)</span>}
        </span>
        <div className="w-32 h-1 bg-grey-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-toss-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 다음 버튼 */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-grey-100 rounded-lg disabled:opacity-50"
      >
        다음
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### 5.3 AccordionGroupPanel (새로 생성)

```tsx
// components/labeling/AccordionGroupPanel.tsx
interface AccordionGroupPanelProps {
  // 현재 페이지 데이터
  currentPage: number;
  bookPage: number;
  groups: ProblemGroup[];
  selectedBlocks: number[];

  // 작업한 페이지 히스토리
  visitedPages: PageSummary[];

  // 이벤트 핸들러
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onGroupSelect: (blockIds: number[]) => void;
  onUpdateGroupInfo: (groupId: string, info: ProblemInfo) => void;
  onPageClick: (pageIndex: number) => void;

  // 기타
  autoEditGroupId?: string | null;
  confirmingGroupId?: string | null;
}

export function AccordionGroupPanel(props: AccordionGroupPanelProps) {
  const {
    currentPage,
    bookPage,
    groups,
    visitedPages,
    ...handlers
  } = props;

  return (
    <div className="h-full flex flex-col bg-white border-l border-grey-100">
      {/* 현재 페이지 섹션 (항상 펼침) */}
      <CurrentPageSection
        pageIndex={currentPage}
        bookPage={bookPage}
        groups={groups}
        {...handlers}
      />

      {/* 완료된 페이지들 (접힌 상태) */}
      <div className="flex-1 overflow-y-auto">
        {visitedPages
          .filter(p => p.pageIndex !== currentPage)
          .reverse()
          .map(page => (
            <CompletedPageSection
              key={page.pageIndex}
              page={page}
              onClick={() => handlers.onPageClick(page.pageIndex)}
            />
          ))}
      </div>
    </div>
  );
}
```

### 5.4 useLabelingState (새로 생성)

```typescript
// hooks/labeling/useLabelingState.ts
export function useLabelingState(documentId: string, initialPage = 0) {
  // 페이지 상태
  const [currentPage, setCurrentPage] = useState(initialPage);

  // 선택 상태
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);

  // 그룹 상태 (로컬)
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);

  // 방문 페이지 추적
  const { visitedPages, markVisited } = useVisitedPages(documentId);

  // 페이지 변경 시 방문 기록
  useEffect(() => {
    markVisited(currentPage);
  }, [currentPage, markVisited]);

  // 페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedBlocks([]);
  }, [currentPage]);

  // 블록 선택 핸들러
  const handleBlockSelect = useCallback((blockId: number, isMultiSelect: boolean) => {
    setSelectedBlocks(prev => {
      if (isMultiSelect) {
        return prev.includes(blockId)
          ? prev.filter(id => id !== blockId)
          : [...prev, blockId];
      }
      return [blockId];
    });
  }, []);

  return {
    // 상태
    currentPage,
    selectedBlocks,
    localGroups,
    visitedPages,

    // 세터
    setCurrentPage,
    setSelectedBlocks,
    setLocalGroups,

    // 핸들러
    handleBlockSelect,
  };
}
```

---

## 6. 예상 결과

### 6.1 코드량 변화

| 파일 | Before | After |
|------|--------|-------|
| PageViewer.tsx | 760줄 | **삭제** (LabelingWorkspace로 대체) |
| LabelingWorkspace.tsx | - | **150줄** |
| LabelingHeader.tsx | - | **50줄** |
| SimpleNavigation.tsx | - | **80줄** |
| AccordionGroupPanel.tsx | - | **200줄** |
| useLabelingState.ts | - | **100줄** |
| useGroupActions.ts | - | **150줄** |
| **총합** | **760줄 (1파일)** | **730줄 (7파일)** |

→ 코드량은 비슷하지만 **단일 책임 원칙** 준수

### 6.2 UI 변화

```
Before:                              After:
┌────────────────────────┐          ┌────────────────────────┐
│ 🟣 라벨링 작업 배너     │          │ ← 문서명    2/7   [내보내기] │
├────────────────────────┤          ├────────────────────────┤
│ 복잡한 네비게이션       │    →     │ [<] 1/120 (15p) [>]    │
├────────────────────────┤          │ ━━━━■□□□□□□□□□□□ 1%   │
│ 페이지 미리보기 헤더    │          ├────────────────────────┤
├────────────────────────┤          │                        │
│     PDF 캔버스          │          │     PDF 캔버스 (확대)  │
├────────────────────────┤          │                        │
│ 통계 카드 4개           │          ├────────────────────────┤
└────────────────────────┘          │ ▼ 17p  4/7 (아코디언)  │
                                    │ ▶ 10p  7/7 ✓          │
                                    └────────────────────────┘

화면 요소: 10개 → 5개
작업 영역: +30% 확대
```

### 6.3 파일 구조 변화

```
Before (혼재):                       After (정리됨):
pages/                              pages/
├── 27개 파일 (무질서)               ├── labeling/
│   ├── 활성 10개                    │   ├── LabelingPage.tsx
│   ├── 레거시 4개                   │   ├── LabelingWorkspace.tsx
│   └── 미사용 13개                  │   ├── LabelingHeader.tsx
│                                    │   └── LabelingContent.tsx
│                                    ├── _archived/ (레거시)
│                                    └── ... (기타 활성 페이지)
│
components/                         components/
├── GroupPanel.tsx (600줄)           ├── labeling/
├── PageNavigation.tsx (290줄)       │   ├── SimpleNavigation.tsx
│                                    │   ├── AccordionGroupPanel.tsx
│                                    │   └── PageSection.tsx
│                                    ├── PageCanvas.tsx (유지)
│                                    └── _archived/ (레거시)
```

---

## 7. 타임라인

```
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 40-A: 파일 정리                                    │ 30분    │
│ └── 백업/미사용 파일 정리                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Phase 40-B: UI 삭제/간소화                               │ 1시간   │
│ └── 보라색 헤더, 통계 카드 삭제, 네비게이션 간소화                   │
├─────────────────────────────────────────────────────────────────────┤
│ Phase 40-C: 상태 훅 분리                                 │ 1시간   │
│ └── useLabelingState, useGroupActions 추출                         │
├─────────────────────────────────────────────────────────────────────┤
│ Phase 40-D: 아코디언 패널                                │ 1.5시간 │
│ └── AccordionGroupPanel, PageSection, useVisitedPages              │
├─────────────────────────────────────────────────────────────────────┤
│ Phase 40-E: 레이아웃 재구성                              │ 1시간   │
│ └── LabelingHeader, SimpleNavigation, 3단 레이아웃                  │
├─────────────────────────────────────────────────────────────────────┤
│ Phase 40-F: 최종 정리                                    │ 30분    │
│ └── 레거시 삭제, 문서화                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                    총합 │ 5.5시간 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. 체크리스트

### Phase 40-A: 파일 정리
- [ ] 백업 파일 3개 삭제
- [ ] 미사용 파일 13개 → `_archived/`로 이동
- [ ] 빌드 확인

### Phase 40-B: UI 삭제/간소화
- [ ] 보라색 그라데이션 헤더 삭제
- [ ] "페이지 미리보기" 헤더 삭제
- [ ] 하단 통계 카드 4개 삭제
- [ ] PageNavigation 간소화
- [ ] 빌드 및 UI 확인

### Phase 40-C: 상태 훅 분리
- [ ] `hooks/labeling/` 폴더 생성
- [ ] `useLabelingState.ts` 구현
- [ ] `useGroupActions.ts` 구현
- [ ] PageViewer 리팩토링 (훅 적용)
- [ ] 테스트

### Phase 40-D: 아코디언 패널
- [ ] `components/labeling/` 폴더 생성
- [ ] `useVisitedPages.ts` 구현
- [ ] `PageSection.tsx` 구현
- [ ] `AccordionGroupPanel.tsx` 구현
- [ ] PageViewer에 통합
- [ ] 테스트

### Phase 40-E: 레이아웃 재구성
- [ ] `LabelingHeader.tsx` 구현
- [ ] `SimpleNavigation.tsx` 구현
- [ ] `CanvasArea.tsx` 구현
- [ ] `LabelingContent.tsx` 구현
- [ ] `LabelingWorkspace.tsx` 구현 (PageViewer 대체)
- [ ] 테스트

### Phase 40-F: 최종 정리
- [ ] 기존 PageViewer.tsx 삭제
- [ ] 기존 PageNavigation.tsx 삭제
- [ ] 기존 GroupPanel.tsx → `_archived/`
- [ ] 라우팅 업데이트
- [ ] 전체 빌드 및 테스트
- [ ] CLAUDE.md 업데이트

---

## 9. 리스크 관리

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 기존 기능 손상 | 중 | 높음 | 각 단계별 테스트, 롤백 가능하도록 |
| 레거시 페이지 깨짐 | 낮 | 중 | `_archived/` 이동 전 라우팅 확인 |
| 상태 관리 버그 | 중 | 중 | 훅 분리 시 기존 로직 그대로 유지 |
| 아코디언 성능 | 낮 | 낮 | 방문한 페이지만 로드 + 캐싱 |

---

## 10. 성공 기준

- [ ] PageViewer.tsx 760줄 → 200줄 이하
- [ ] 화면 요소 10개 → 5개 이하
- [ ] 토스 적합도 45% → 85% 이상
- [ ] 빌드 성공, 주요 기능 정상 작동
- [ ] 코드 리뷰 가능한 수준의 가독성

---

*계획 작성: Claude Opus | 2025-12-04*
