# Phase 31: 싱글 캔버스 탭 시스템 개발 계획

**작성일**: 2025-12-03
**목표**: 듀얼 윈도우 → 싱글 캔버스 탭 전환
**예상 소요**: 13-16시간 (2-3일)

---

## 목표 UI

```
┌──────────────────────────────────────────────────────────────┐
│  📄 베이직쎈_문제.pdf          [문제] [해설]       ⚙️ 설정   │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┬───────────────────────────┐  │
│  │                            │  📋 문제 목록 (5/12)      │  │
│  │                            │  ─────────────────────────│  │
│  │      PDF 캔버스            │  ⬤ 1번  베이직쎈_p18    │  │
│  │    (문제 또는 해설)         │  ⬤ 2번  베이직쎈_p18    │  │
│  │                            │  ○ 3번  베이직쎈_p19    │  │
│  │                            │  ▶ 4번  베이직쎈_p19 ◀  │  │
│  │                            │  ○ 5번  베이직쎈_p20    │  │
│  │                            │  ─────────────────────────│  │
│  │                            │                           │  │
│  │                            │  ┌─────────────────────┐  │  │
│  │                            │  │  [문제 미리보기]    │  │  │
│  │                            │  │   4번 문제 썸네일   │  │  │
│  │                            │  └─────────────────────┘  │  │
│  │                            │                           │  │
│  │                            │  "해설을 그룹핑하세요"    │  │
│  │                            │                           │  │
│  │                            │  ─────────────────────────│  │
│  │                            │  진행률: 5/12 (42%)       │  │
│  │                            │  ████████░░░░░░░░░░░░     │  │
│  └────────────────────────────┴───────────────────────────┘  │
│  ← →: 페이지 | G: 그룹 | ↑↓: 문제 선택 | Tab: 다음 미연결    │
└──────────────────────────────────────────────────────────────┘
```

---

## 워크플로우

### 1단계: 문서 선택
```
Dashboard → "통합 뷰어로 매칭" 클릭
→ 문제 PDF 선택
→ 해설 PDF 선택
→ 통합 뷰어 열기
```

### 2단계: 문제 라벨링
```
[문제 탭] 활성화
블록 선택 → G키 → 그룹 생성 → 문제 정보 입력 → Enter
→ 오른쪽 패널에 문제 추가
→ 다음 문제 반복
```

### 3단계: 해설 연결
```
[해설 탭] 클릭
오른쪽 패널에서 문제 클릭 (예: 4번)
→ 캔버스에서 해설 블록 선택 → G키 → 그룹 생성
→ 4번 문제와 자동 연결 ⬤
→ 다음 미연결 문제로 자동 이동 (5번)
→ 반복
```

---

## 단계별 개발 계획

### Phase 31-A: 기본 구조 및 라우팅 (2시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] 새 라우트 추가: `/unified/:problemDocId/:solutionDocId`
- [ ] UnifiedViewerPage.tsx 기본 구조 생성
- [ ] Dashboard에 "통합 뷰어로 매칭" 버튼 추가

**생성 파일**:
```
frontend/src/pages/UnifiedViewerPage.tsx
```

**수정 파일**:
```
frontend/src/App.tsx (라우트 추가)
frontend/src/pages/Dashboard.tsx (버튼 추가)
```

**코드 스니펫**:
```tsx
// UnifiedViewerPage.tsx 기본 구조
export function UnifiedViewerPage() {
  const { problemDocId, solutionDocId } = useParams();
  const [activeTab, setActiveTab] = useState<'problem' | 'solution'>('problem');

  return (
    <div className="h-screen flex flex-col">
      <TabHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex">
        <CanvasArea documentId={activeTab === 'problem' ? problemDocId : solutionDocId} />
        <ProblemListPanel />
      </div>
    </div>
  );
}
```

---

### Phase 31-B: 탭 헤더 컴포넌트 (1시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] TabHeader 컴포넌트 생성
- [ ] 문제/해설 탭 전환 UI
- [ ] 현재 문서명 표시

**생성 파일**:
```
frontend/src/components/unified/TabHeader.tsx
```

**UI 디자인**:
```
┌─────────────────────────────────────────────────────┐
│  📄 베이직쎈_문제.pdf                               │
│  ┌──────────┐ ┌──────────┐                         │
│  │ 📝 문제  │ │ 📖 해설  │              ⚙️ 설정    │
│  │  (활성)  │ │          │                         │
│  └──────────┘ └──────────┘                         │
└─────────────────────────────────────────────────────┘
```

**코드 스니펫**:
```tsx
interface TabHeaderProps {
  activeTab: 'problem' | 'solution';
  onTabChange: (tab: 'problem' | 'solution') => void;
  problemDocName: string;
  solutionDocName: string;
}

export function TabHeader({ activeTab, onTabChange, problemDocName, solutionDocName }: TabHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {activeTab === 'problem' ? problemDocName : solutionDocName}
        </span>
        <div className="flex">
          <button
            onClick={() => onTabChange('problem')}
            className={`px-4 py-2 rounded-t-lg ${
              activeTab === 'problem'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📝 문제
          </button>
          <button
            onClick={() => onTabChange('solution')}
            className={`px-4 py-2 rounded-t-lg ${
              activeTab === 'solution'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📖 해설
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 31-C: 문제 목록 패널 (3시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] ProblemListPanel 컴포넌트 생성
- [ ] 문제 목록 표시 (연결 상태 아이콘)
- [ ] 문제 클릭 → 선택 상태
- [ ] 키보드 네비게이션 (↑↓)

**생성 파일**:
```
frontend/src/components/unified/ProblemListPanel.tsx
```

**인터페이스**:
```typescript
interface ProblemItem {
  groupId: string;
  problemNumber: string;
  displayName: string;  // "베이직쎈_공통수학1_p18"
  pageIndex: number;
  isLinked: boolean;
  linkedSolutionId?: string;
}

interface ProblemListPanelProps {
  problems: ProblemItem[];
  selectedProblemId: string | null;
  onSelectProblem: (problemId: string) => void;
  activeTab: 'problem' | 'solution';
}
```

**UI 상태**:
```
○ 미연결 (회색 원)
⬤ 연결됨 (초록 원)
▶ 현재 선택 (파란 화살표)
```

---

### Phase 31-D: 상태 관리 (Zustand 스토어) (2시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] useUnifiedStore 생성
- [ ] 문제/해설 그룹 상태 관리
- [ ] 선택 상태 관리
- [ ] 연결 정보 관리

**생성 파일**:
```
frontend/src/stores/unifiedStore.ts
```

**스토어 구조**:
```typescript
interface UnifiedStore {
  // 문서 정보
  problemDocId: string;
  solutionDocId: string;

  // 활성 탭
  activeTab: 'problem' | 'solution';
  setActiveTab: (tab: 'problem' | 'solution') => void;

  // 문제 그룹 (문제 탭에서 생성)
  problemGroups: ProblemGroup[];
  addProblemGroup: (group: ProblemGroup) => void;
  updateProblemGroup: (groupId: string, updates: Partial<ProblemGroup>) => void;

  // 해설 그룹 (해설 탭에서 생성)
  solutionGroups: ProblemGroup[];
  addSolutionGroup: (group: ProblemGroup) => void;

  // 선택된 문제 (해설 연결 대기)
  selectedProblemId: string | null;
  setSelectedProblemId: (id: string | null) => void;

  // 연결 정보
  links: Map<string, string>;  // problemGroupId → solutionGroupId
  createLink: (problemId: string, solutionId: string) => void;

  // 자동 다음 이동
  selectNextUnlinked: () => void;
}
```

---

### Phase 31-E: 캔버스 영역 연동 (3시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] 기존 PageViewer를 탭별로 렌더링
- [ ] 탭 전환 시 문서 ID 변경
- [ ] 그룹 생성 시 스토어 연동
- [ ] 해설 탭에서 그룹 생성 시 자동 연결

**수정 파일**:
```
frontend/src/pages/UnifiedViewerPage.tsx
frontend/src/components/GroupPanel.tsx (연결 로직 추가)
```

**핵심 로직**:
```typescript
// 해설 탭에서 그룹 생성 시
const handleCreateGroup = (blockIds: number[], column: string) => {
  const newGroup = createGroup(blockIds, column);

  if (activeTab === 'solution' && selectedProblemId) {
    // 선택된 문제와 자동 연결
    createLink(selectedProblemId, newGroup.id);
    showToast('해설이 연결되었습니다', 'success');

    // 다음 미연결 문제로 자동 이동
    selectNextUnlinked();
  }
};
```

---

### Phase 31-F: 문제 미리보기 (2시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] 선택된 문제의 썸네일 표시
- [ ] 문제 이미지 로드 (크롭된 이미지 또는 페이지 일부)
- [ ] 연결 안내 메시지

**생성 파일**:
```
frontend/src/components/unified/ProblemPreview.tsx
```

**UI**:
```
┌─────────────────────┐
│  선택: 4번 문제     │
│  ┌───────────────┐  │
│  │               │  │
│  │   [썸네일]    │  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  "해설을 그룹핑     │
│   하세요"           │
└─────────────────────┘
```

---

### Phase 31-G: 키보드 단축키 (1시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] 문제 선택 이동 (↑↓)
- [ ] 다음 미연결 문제 (Tab)
- [ ] 탭 전환 (1, 2 또는 Ctrl+Tab)

**수정 파일**:
```
frontend/src/pages/UnifiedViewerPage.tsx (키보드 이벤트 추가)
```

**단축키 목록**:
```
공통:
  ← →     : 페이지 이동
  G       : 그룹 생성
  Ctrl+S  : 저장
  Esc     : 선택 해제

해설 탭:
  ↑ ↓     : 문제 선택 이동
  Tab     : 다음 미연결 문제
  Enter   : 문제 선택 확정

탭 전환:
  1       : 문제 탭
  2       : 해설 탭
```

---

### Phase 31-H: 진행률 및 완료 처리 (1시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] 진행률 바 표시
- [ ] 모든 문제 연결 완료 시 축하 메시지
- [ ] 결과 저장 및 내보내기

**UI**:
```
───────────────────────────
진행률: 10/12 (83%)
████████████████░░░░░

[모든 연결 완료!]
"12개 문제가 모두 연결되었습니다 🎉"
[ 저장하기 ] [ 내보내기 ]
```

---

### Phase 31-I: Dashboard 통합 (1시간)
**상태**: [ ] 승인 대기

**작업 내용**:
- [ ] 문서 선택 UI (문제 PDF + 해설 PDF)
- [ ] "통합 뷰어로 시작" 버튼
- [ ] 기존 "듀얼 윈도우" 옵션 유지

**수정 파일**:
```
frontend/src/pages/Dashboard.tsx
frontend/src/components/matching/DualUploadCard.tsx (옵션 추가)
```

**UI**:
```
┌─────────────────────────────────────────────┐
│  문제-해설 매칭                              │
├─────────────────────────────────────────────┤
│  문제 PDF: [베이직쎈_문제.pdf    ] [선택]   │
│  해설 PDF: [베이직쎈_해설.pdf    ] [선택]   │
│                                             │
│  ┌─────────────────┐ ┌─────────────────┐   │
│  │ 🖥️ 듀얼 윈도우  │ │ 📑 통합 뷰어   │   │
│  │   (2개 창)      │ │   (1개 창)      │   │
│  └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 개발 순서 요약

| 순서 | Phase | 내용 | 예상 시간 | 의존성 |
|------|-------|------|----------|--------|
| 1 | 31-A | 기본 구조 및 라우팅 | 2시간 | - |
| 2 | 31-B | 탭 헤더 컴포넌트 | 1시간 | 31-A |
| 3 | 31-D | 상태 관리 (Zustand) | 2시간 | 31-A |
| 4 | 31-C | 문제 목록 패널 | 3시간 | 31-D |
| 5 | 31-E | 캔버스 영역 연동 | 3시간 | 31-C, 31-D |
| 6 | 31-F | 문제 미리보기 | 2시간 | 31-C |
| 7 | 31-G | 키보드 단축키 | 1시간 | 31-E |
| 8 | 31-H | 진행률 및 완료 | 1시간 | 31-E |
| 9 | 31-I | Dashboard 통합 | 1시간 | 31-A |

**총 예상 시간: 16시간**

---

## 파일 구조

```
frontend/src/
├── pages/
│   └── UnifiedViewerPage.tsx      # [신규] 통합 뷰어 페이지
│
├── components/
│   └── unified/                    # [신규] 통합 뷰어 컴포넌트
│       ├── index.ts
│       ├── TabHeader.tsx           # 탭 헤더
│       ├── ProblemListPanel.tsx    # 문제 목록 패널
│       └── ProblemPreview.tsx      # 문제 미리보기
│
├── stores/
│   └── unifiedStore.ts             # [신규] Zustand 스토어
│
└── App.tsx                         # [수정] 라우트 추가
```

---

## 기존 코드 재사용

| 기존 컴포넌트 | 재사용 방식 |
|--------------|------------|
| PageViewer | 그대로 사용 (documentId만 변경) |
| GroupPanel | 그대로 사용 |
| BlockCanvas | 그대로 사용 |
| PageNavigation | 그대로 사용 |

---

## 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 상태 관리 복잡성 | 중 | Zustand로 단순화 |
| 기존 기능 충돌 | 낮 | 새 페이지로 분리 |
| 성능 (두 문서 로드) | 낮 | 탭별 lazy 로딩 |

---

## 승인 체크리스트

- [ ] Phase 31-A: 기본 구조 및 라우팅
- [ ] Phase 31-B: 탭 헤더 컴포넌트
- [ ] Phase 31-C: 문제 목록 패널
- [ ] Phase 31-D: 상태 관리 (Zustand)
- [ ] Phase 31-E: 캔버스 영역 연동
- [ ] Phase 31-F: 문제 미리보기
- [ ] Phase 31-G: 키보드 단축키
- [ ] Phase 31-H: 진행률 및 완료
- [ ] Phase 31-I: Dashboard 통합

---

**진행하시려면 "진행해줘"라고 말씀해주세요.**

*전체 승인 또는 특정 Phase만 선택 가능합니다.*
