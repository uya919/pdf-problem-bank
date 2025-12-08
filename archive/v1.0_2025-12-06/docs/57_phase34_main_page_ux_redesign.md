# Phase 34: 메인 페이지 UX 리디자인 개발 계획

> **목표**: `/` (RegistrationPage)를 `/work` (WorkSessionDashboard) 수준의 직관성으로 개선
> **작성일**: 2025-12-03
> **예상 소요**: 4-5시간
> **기반 문서**: `56_ux_research_registration_vs_work.md`

---

## 1. 핵심 설계 원칙

### 1.1 토스(Toss) UX 원칙 적용

```
┌─────────────────────────────────────────────────────────────┐
│  원칙 1: 한 화면, 하나의 목표                                │
│  → "작업 세션 시작"이 유일한 주요 행동                       │
├─────────────────────────────────────────────────────────────┤
│  원칙 2: Progressive Disclosure                             │
│  → 파일 추가는 접힌 상태로, 필요 시 펼침                     │
├─────────────────────────────────────────────────────────────┤
│  원칙 3: 시각적 계층 명확화                                  │
│  → Hero 영역 > 진행 중 세션 > 파일 추가                      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Before vs After 비교

**Before (현재)**
```
┌────────────────────────────────────────┐
│ Header: "등록 & 라벨링"                 │
├────────────────────────────────────────┤
│ [DualDocumentSelector - 복잡한 UI]     │  ← 6개 영역이
├────────────────────────────────────────┤     한 화면에 혼재
│ "또는" 구분선                           │
├────────────────────────────────────────┤
│ [DropZone - 큰 영역]                   │
├────────────────────────────────────────┤
│ [처리 중 문서 리스트]                   │
├────────────────────────────────────────┤
│ [진행 중 문서 리스트]                   │
├────────────────────────────────────────┤
│ [완료된 문서 리스트]                    │
└────────────────────────────────────────┘
```

**After (목표)**
```
┌────────────────────────────────────────┐
│ Header: "문제은행"  [+ 파일 추가]       │  ← 단순화된 헤더
├────────────────────────────────────────┤
│                                        │
│  ┌────────────────────────────────┐   │
│  │      🎯 새 작업 시작하기         │   │  ← Hero 영역
│  │                                │   │     (주요 CTA)
│  │  [문제 문서 ▼]    [해설 문서 ▼]  │   │
│  │                                │   │
│  │      [ ▶ 작업 시작 ]            │   │
│  └────────────────────────────────┘   │
│                                        │
├────────────────────────────────────────┤
│ 진행 중인 세션 (1개)                   │  ← 세션 카드
│ ┌────────────────────────────────┐   │     (있을 때만)
│ │ 수학의바이블  [재개 →]          │   │
│ └────────────────────────────────┘   │
├────────────────────────────────────────┤
│ ▼ 파일 추가하기 (접힘)                 │  ← Collapsible
└────────────────────────────────────────┘
```

---

## 2. 정보 아키텍처 (IA) 재설계

### 2.1 컴포넌트 계층 구조

```
MainPage (새 컴포넌트)
├── Header
│   ├── Logo/Title: "문제은행"
│   └── [+ 파일 추가] 버튼 (옵션)
│
├── HeroSection (새 컴포넌트)
│   ├── Title: "새 작업 시작하기"
│   ├── DocumentDropdowns (새 컴포넌트)
│   │   ├── ProblemDocDropdown
│   │   └── SolutionDocDropdown
│   └── StartButton
│
├── ActiveSessionsSection (조건부)
│   └── SessionCard[] (WorkSessionDashboard에서 재사용)
│
└── CollapsibleUploadSection (새 컴포넌트)
    ├── Header: "▼ 파일 추가하기"
    └── DropZone (축소형)
```

### 2.2 라우팅 전략

| 경로 | 컴포넌트 | 용도 |
|------|----------|------|
| `/` | `MainPage` | 새 메인 페이지 (리디자인) |
| `/work` | Redirect to `/` | 통합 (제거 후 리다이렉트) |
| `/work/:sessionId` | `UnifiedWorkPage` | 작업 캔버스 (유지) |

**결정 포인트**: `/work` 페이지를 `/`로 통합할지, 별도 유지할지
- **권장**: `/work`를 `/`로 리다이렉트하여 진입점 단일화

---

## 3. 개발 단계 (Step-by-Step)

### Phase 34-A: 새 메인 페이지 레이아웃 (1.5시간)

#### 34-A-1: MainPage 컴포넌트 생성
```
파일: frontend/src/pages/MainPage.tsx
```

**핵심 구조:**
```tsx
export function MainPage() {
  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <header className="bg-white border-b border-grey-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-grey-900">문제은행</h1>
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            파일 추가
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <HeroSection />

        {/* Active Sessions */}
        <ActiveSessionsSection />

        {/* Collapsible Upload */}
        <CollapsibleUploadSection />
      </main>
    </div>
  );
}
```

#### 34-A-2: HeroSection 컴포넌트
```
파일: frontend/src/components/main/HeroSection.tsx
```

**디자인 요소:**
- 중앙 정렬, 넉넉한 패딩
- 그라데이션 배경 (subtle)
- 큰 "작업 시작" 버튼

```tsx
export function HeroSection() {
  const [problemDoc, setProblemDoc] = useState<string | null>(null);
  const [solutionDoc, setSolutionDoc] = useState<string | null>(null);

  return (
    <div className="bg-gradient-to-br from-toss-blue/5 to-purple-500/5 rounded-2xl p-8 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-grey-900 mb-2">
          새 작업 시작하기
        </h2>
        <p className="text-grey-600">
          문제와 해설 문서를 선택하고 라벨링을 시작하세요
        </p>
      </div>

      {/* Document Selectors */}
      <div className="flex justify-center gap-4 mb-6">
        <DocumentDropdown
          type="problem"
          value={problemDoc}
          onChange={setProblemDoc}
          disabledValue={solutionDoc}
        />
        <DocumentDropdown
          type="solution"
          value={solutionDoc}
          onChange={setSolutionDoc}
          disabledValue={problemDoc}
        />
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <Button
          variant="solid"
          size="lg"
          disabled={!problemDoc || !solutionDoc}
          onClick={handleStart}
        >
          <Play className="w-5 h-5 mr-2" />
          작업 시작
        </Button>
      </div>
    </div>
  );
}
```

#### 34-A-3: DocumentDropdown 컴포넌트
```
파일: frontend/src/components/main/DocumentDropdown.tsx
```

**특징:**
- 드롭다운 스타일 (리스트가 아닌)
- 선택 시 문서명 표시
- 색상 구분 (문제: 파란색, 해설: 보라색)

```tsx
interface DocumentDropdownProps {
  type: 'problem' | 'solution';
  value: string | null;
  onChange: (docId: string | null) => void;
  disabledValue: string | null;  // 다른 쪽에서 선택된 값
}

export function DocumentDropdown({
  type,
  value,
  onChange,
  disabledValue,
}: DocumentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: documents } = useDocuments();

  const isProblem = type === 'problem';
  const Icon = isProblem ? FileText : BookOpen;
  const label = isProblem ? '문제 문서' : '해설 문서';
  const color = isProblem ? 'toss-blue' : 'purple-600';

  const selectedDoc = documents?.find(d => d.document_id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-64 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left
          transition-all duration-200
          ${value
            ? `border-${color} bg-${color}/5`
            : 'border-grey-200 hover:border-grey-300'}
        `}
      >
        <Icon className={`w-5 h-5 ${value ? `text-${color}` : 'text-grey-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-grey-500">{label}</div>
          <div className={`truncate ${value ? 'text-grey-900 font-medium' : 'text-grey-400'}`}>
            {selectedDoc?.document_id || '선택하세요'}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-grey-200 py-2 z-50 max-h-64 overflow-y-auto"
          >
            {documents?.map(doc => (
              <button
                key={doc.document_id}
                disabled={doc.document_id === disabledValue}
                onClick={() => {
                  onChange(doc.document_id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 text-left
                  ${doc.document_id === disabledValue
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-grey-50'}
                  ${doc.document_id === value ? `bg-${color}/10` : ''}
                `}
              >
                <Icon className={`w-4 h-4 ${doc.document_id === value ? `text-${color}` : 'text-grey-400'}`} />
                <span className="truncate text-sm">{doc.document_id}</span>
                {doc.document_id === value && (
                  <Check className={`w-4 h-4 ml-auto text-${color}`} />
                )}
              </button>
            ))}

            {(!documents || documents.length === 0) && (
              <div className="px-4 py-8 text-center text-grey-400">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">등록된 문서가 없습니다</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

### Phase 34-B: 진행 중 세션 섹션 (30분)

#### 34-B-1: ActiveSessionsSection 컴포넌트
```
파일: frontend/src/components/main/ActiveSessionsSection.tsx
```

```tsx
export function ActiveSessionsSection() {
  const { sessions, sessionsLoading, fetchSessions } = useWorkSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const activeSessions = sessions.filter(s => s.status === 'active');

  if (sessionsLoading) {
    return <div className="h-20 flex items-center justify-center">...</div>;
  }

  if (activeSessions.length === 0) {
    return null;  // 진행 중 세션 없으면 숨김
  }

  return (
    <section className="mb-8">
      <h3 className="text-sm font-medium text-grey-500 mb-3">
        진행 중인 작업 ({activeSessions.length})
      </h3>
      <div className="space-y-2">
        {activeSessions.map(session => (
          <SessionCard
            key={session.sessionId}
            session={session}
            onResume={() => navigate(`/work/${session.sessionId}`)}
          />
        ))}
      </div>
    </section>
  );
}
```

#### 34-B-2: SessionCard 컴포넌트 (간소화)
```
파일: frontend/src/components/main/SessionCard.tsx
```

```tsx
interface SessionCardProps {
  session: WorkSession;
  onResume: () => void;
}

export function SessionCard({ session, onResume }: SessionCardProps) {
  const progress = session.problems.length > 0
    ? Math.round((session.links.length / session.problems.length) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-grey-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onResume}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-toss-blue/10 rounded-lg">
            <FileText className="w-4 h-4 text-toss-blue" />
          </div>
          <div>
            <h4 className="font-medium text-grey-900">
              {session.name || session.problemDocumentId}
            </h4>
            <p className="text-sm text-grey-500">
              {session.problems.length}개 문제 · {progress}% 완료
            </p>
          </div>
        </div>

        <Button variant="solid" size="sm">
          재개
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Progress Bar */}
      {session.problems.length > 0 && (
        <div className="mt-3 h-1.5 bg-grey-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-toss-blue rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
```

---

### Phase 34-C: 접이식 파일 업로드 (30분)

#### 34-C-1: CollapsibleUploadSection 컴포넌트
```
파일: frontend/src/components/main/CollapsibleUploadSection.tsx
```

```tsx
export function CollapsibleUploadSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const uploadMutation = useUploadPDF();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadMutation.mutateAsync(file);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/haansofthwp': ['.hwp'],
      'application/hwpx': ['.hwpx'],
    },
  });

  return (
    <section className="border-t border-grey-200 pt-6">
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 text-grey-600 hover:text-grey-900"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Upload className="w-4 h-4" />
          파일 추가하기
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              {...getRootProps()}
              className={`
                mt-4 p-8 border-2 border-dashed rounded-xl text-center cursor-pointer
                transition-colors duration-200
                ${isDragActive
                  ? 'border-toss-blue bg-toss-blue/5'
                  : 'border-grey-200 hover:border-grey-300'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragActive ? 'text-toss-blue' : 'text-grey-400'}`} />
              <p className="text-sm text-grey-600">
                {isDragActive ? '여기에 놓으세요' : '파일을 드래그하거나 클릭'}
              </p>
              <p className="text-xs text-grey-400 mt-1">PDF, HWP, HWPX 지원</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

---

### Phase 34-D: 라우팅 및 통합 (30분)

#### 34-D-1: App.tsx 라우팅 수정
```tsx
// Before
<Route path="/" element={<RegistrationPage />} />
<Route path="/work" element={<WorkSessionDashboard />} />

// After
<Route path="/" element={<MainPage />} />
<Route path="/work" element={<Navigate to="/" replace />} />  // 리다이렉트
```

#### 34-D-2: 기존 RegistrationPage 보존 (백업)
- `RegistrationPage.tsx` → `RegistrationPage.legacy.tsx`로 rename
- 필요 시 롤백 가능

---

### Phase 34-E: 시각적 개선 (1시간)

#### 34-E-1: 컬러 시스템 정리
```css
/* 상태별 색상 */
--status-problem: #3182F6;     /* 문제 - 파란색 */
--status-solution: #8B5CF6;    /* 해설 - 보라색 */
--status-active: #F59E0B;      /* 진행중 - 주황색 */
--status-complete: #10B981;    /* 완료 - 초록색 */
```

#### 34-E-2: 애니메이션 통일
- 모든 전환: `spring, stiffness: 400, damping: 30`
- 페이드인: `opacity 0→1, y 10→0`

#### 34-E-3: Empty State 개선
```tsx
// 문서 없을 때
<EmptyState
  icon={<Upload className="w-12 h-12" />}
  title="아직 문서가 없어요"
  description="PDF 또는 HWP 파일을 업로드하여 시작하세요"
  action={
    <Button variant="solid" onClick={openUpload}>
      파일 업로드
    </Button>
  }
/>
```

---

### Phase 34-F: 테스트 및 버그 수정 (1시간)

#### 34-F-1: 기능 테스트 체크리스트
- [ ] 문서 드롭다운 열기/닫기
- [ ] 문제/해설 문서 선택
- [ ] 같은 문서 양쪽 선택 방지
- [ ] 세션 생성 → `/work/:id` 이동
- [ ] 진행 중 세션 표시 및 재개
- [ ] 파일 업로드 (접기/펼치기)
- [ ] 빈 문서 상태 표시

#### 34-F-2: 반응형 테스트
- [ ] 모바일 (< 640px)
- [ ] 태블릿 (640px ~ 1024px)
- [ ] 데스크톱 (> 1024px)

#### 34-F-3: 접근성 테스트
- [ ] 키보드 탐색
- [ ] 스크린 리더 호환
- [ ] 색상 대비

---

## 4. 파일 변경 요약

### 신규 파일
```
frontend/src/
├── pages/
│   └── MainPage.tsx                    # 새 메인 페이지
├── components/
│   └── main/
│       ├── HeroSection.tsx             # Hero 영역
│       ├── DocumentDropdown.tsx        # 문서 선택 드롭다운
│       ├── ActiveSessionsSection.tsx   # 진행 중 세션
│       ├── SessionCard.tsx             # 세션 카드
│       ├── CollapsibleUploadSection.tsx # 접이식 업로드
│       └── EmptyState.tsx              # 빈 상태 컴포넌트
```

### 수정 파일
```
frontend/src/
├── App.tsx                             # 라우팅 변경
└── pages/
    └── RegistrationPage.tsx → .legacy.tsx  # 백업
```

### 삭제/Deprecated 파일
```
frontend/src/
└── pages/
    └── WorkSessionDashboard.tsx        # /로 통합 (선택)
```

---

## 5. 마일스톤

| 단계 | 작업 | 예상 시간 | 체크 |
|------|------|-----------|------|
| **34-A** | 새 메인 페이지 레이아웃 | 1.5시간 | ⬜ |
| **34-B** | 진행 중 세션 섹션 | 30분 | ⬜ |
| **34-C** | 접이식 파일 업로드 | 30분 | ⬜ |
| **34-D** | 라우팅 및 통합 | 30분 | ⬜ |
| **34-E** | 시각적 개선 | 1시간 | ⬜ |
| **34-F** | 테스트 및 버그 수정 | 1시간 | ⬜ |
| | **총계** | **5시간** | |

---

## 6. 의존성 순서

```
34-A (레이아웃) ────────────────────────┐
                                       │
34-B (세션 섹션) ──┬──► 34-D (라우팅) ──┼──► 34-F (테스트)
                  │                    │
34-C (업로드) ────┘                    │
                                       │
34-E (시각적) ─────────────────────────┘
```

**권장 순서**:
1. 34-A (레이아웃) - 기본 구조
2. 34-B (세션 섹션) - 핵심 기능
3. 34-C (업로드) - 보조 기능
4. 34-D (라우팅) - 통합
5. 34-E (시각적) - 폴리싱
6. 34-F (테스트) - 마무리

---

## 7. 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 기존 사용자 혼란 | 중간 | 높음 | 공지 및 가이드 제공 |
| /work 리다이렉트 이슈 | 낮음 | 중간 | 라우팅 테스트 철저히 |
| 드롭다운 UX 미흡 | 중간 | 중간 | 키보드 탐색 지원 |
| 모바일 레이아웃 | 중간 | 중간 | 반응형 우선 설계 |

---

## 8. 롤백 계획

문제 발생 시:
1. `RegistrationPage.legacy.tsx` → `RegistrationPage.tsx`로 복원
2. App.tsx 라우팅 원복
3. `/work` 리다이렉트 제거

---

## 9. 성공 지표

### 정량적 지표
- [ ] 메인 페이지에서 세션 시작까지 클릭 수: 3회 → 2회
- [ ] 페이지 내 CTA 버튼 수: 6개 → 2개
- [ ] 스크롤 없이 주요 기능 접근 가능

### 정성적 지표
- [ ] "다음에 뭘 해야 하지?" 질문 제거
- [ ] 시각적 계층 명확
- [ ] 토스 UX 원칙 준수

---

*계획 작성: Claude Code (Opus)*
*마지막 업데이트: 2025-12-03*
