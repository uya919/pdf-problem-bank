# Phase 6: UI/UX 전면 리디자인 & 워크플로우 확장

## 📋 목차
1. [워크플로우 분석](#워크플로우-분석)
2. [새로운 레이아웃 설계](#새로운-레이아웃-설계)
3. [기능 확장 계획](#기능-확장-계획)
4. [단계별 구현 계획](#단계별-구현-계획)

---

## 🔄 워크플로우 분석

### 현재 워크플로우 (Phase 1-5)
```
PDF 업로드 → 블록 자동 검출 → 그룹 수동 생성 → 이미지 내보내기
```

**문제점**:
- 선형적 흐름만 지원
- 문제 메타데이터 없음
- 해설 연결 불가
- 문제 재사용 어려움
- 배치 작업 불가

### 학원 실제 워크플로우 (확장 필요)

```
┌─────────────────────────────────────────────────────────────┐
│                     1. 수집 단계                              │
│  - 여러 PDF 일괄 업로드 (문제집, 해설집)                      │
│  - 자동 블록 검출 & 백그라운드 처리                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     2. 라벨링 단계                            │
│  - 페이지별 문제 그룹핑                                       │
│  - 메타데이터 입력 (난이도, 유형, 출처)                       │
│  - 해설 PDF와 문제 PDF 매칭                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     3. 검증 단계                              │
│  - 추출된 이미지 품질 확인                                     │
│  - 잘못된 그룹핑 수정                                         │
│  - 해설 매칭 확인                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     4. 문제은행 구축                          │
│  - DB에 저장 (문제 이미지 + 메타데이터)                       │
│  - 태그 및 카테고리 관리                                       │
│  - 검색 & 필터링                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     5. 활용 단계                              │
│  - 조건별 문제 검색                                            │
│  - 시험지 조합 (미래 기능)                                     │
│  - 통계 및 분석                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 새로운 레이아웃 설계

### 전체 구조: 사이드바 + 메인 영역

```
┌────────────────────────────────────────────────────────────────┐
│  Header (고정)                                                  │
│  - 로고 + 프로젝트명                                             │
│  - 검색바                                                        │
│  - 사용자 메뉴 (다크모드, 설정)                                  │
└────────────────────────────────────────────────────────────────┘
┌─────────────┬──────────────────────────────────────────────────┐
│             │                                                  │
│  Sidebar    │           Main Content Area                     │
│  (고정)      │                                                  │
│             │                                                  │
│  [대시보드]  │  - 선택된 섹션에 따라 변경                        │
│  [문서관리]  │  - 문서 목록                                     │
│  [라벨링]   │  - 페이지 뷰어 + 블록 편집                        │
│  [문제은행]  │  - 문제 검색 & 필터                              │
│  [작업관리]  │  - 배치 작업 모니터링                             │
│  [통계]     │                                                  │
│             │                                                  │
│  ─────────  │                                                  │
│             │                                                  │
│  [설정]     │                                                  │
│  [도움말]   │                                                  │
│             │                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

### 사이드바 메뉴 구조

```typescript
const navigationItems = [
  {
    section: 'main',
    items: [
      {
        id: 'dashboard',
        label: '대시보드',
        icon: 'LayoutDashboard',
        route: '/',
        description: '전체 현황 및 최근 작업',
      },
      {
        id: 'documents',
        label: '문서 관리',
        icon: 'FileText',
        route: '/documents',
        description: 'PDF 업로드 및 문서 목록',
        badge: documents.length, // 문서 개수 표시
      },
      {
        id: 'labeling',
        label: '라벨링 작업',
        icon: 'Edit3',
        route: '/labeling',
        description: '문제 그룹핑 및 메타데이터 입력',
      },
      {
        id: 'problem-bank',
        label: '문제은행',
        icon: 'Database',
        route: '/problems',
        description: '추출된 문제 검색 및 관리',
      },
      {
        id: 'tasks',
        label: '작업 관리',
        icon: 'Activity',
        route: '/tasks',
        description: '배치 작업 및 진행 상황',
        badge: runningTasks.length, // 실행 중인 작업 수
      },
    ],
  },
  {
    section: 'analytics',
    items: [
      {
        id: 'statistics',
        label: '통계',
        icon: 'BarChart3',
        route: '/stats',
        description: '문제 분포 및 작업 통계',
      },
    ],
  },
  {
    section: 'system',
    items: [
      {
        id: 'settings',
        label: '설정',
        icon: 'Settings',
        route: '/settings',
        description: '시스템 설정 및 환경 구성',
      },
      {
        id: 'help',
        label: '도움말',
        icon: 'HelpCircle',
        route: '/help',
        description: '사용 가이드 및 FAQ',
      },
    ],
  },
];
```

---

## 🚀 기능 확장 계획

### 1. 문제 메타데이터 시스템

#### 데이터 모델 확장
```typescript
interface ProblemMetadata {
  // 기본 정보
  problem_id: string;           // 고유 ID
  document_id: string;          // 출처 문서
  page_index: number;           // 페이지 번호
  group_id: string;             // 그룹 ID (L1, R2 등)

  // 메타데이터
  difficulty: 'easy' | 'medium' | 'hard' | null;
  problem_type: 'multiple_choice' | 'short_answer' | 'proof' | 'calculation' | null;
  subject: string;              // 과목 (수학I, 수학II 등)
  chapter: string;              // 단원 (이차방정식, 미분 등)
  keywords: string[];           // 키워드 태그

  // 연결 정보
  solution_id?: string;         // 연결된 해설 ID
  source: {
    title: string;              // 문제집명
    publisher: string;          // 출판사
    year: number;               // 출판년도
  };

  // 시스템 정보
  created_at: number;
  updated_at: number;
  created_by: string;
  status: 'draft' | 'reviewed' | 'approved';
}
```

#### API 엔드포인트 추가
```
POST   /api/problems                    # 문제 메타데이터 생성
GET    /api/problems                    # 문제 목록 (필터링, 페이지네이션)
GET    /api/problems/{problem_id}       # 문제 상세 조회
PUT    /api/problems/{problem_id}       # 문제 메타데이터 수정
DELETE /api/problems/{problem_id}       # 문제 삭제

GET    /api/problems/search             # 고급 검색 (키워드, 난이도 등)
GET    /api/problems/statistics         # 문제 통계
```

### 2. 해설 연결 시스템

#### 워크플로우
```
1. 문제 PDF 업로드 → 문제 라벨링
2. 해설 PDF 업로드 → 해설 라벨링
3. 자동 매칭: 페이지/그룹 ID 기반으로 1:1 매칭 시도
4. 수동 매칭: UI에서 드래그 앤 드롭으로 매칭
5. 검증: 매칭된 문제-해설 쌍 확인
```

#### UI 컴포넌트
```tsx
<SolutionMatchingView>
  <div className="split-view">
    {/* 왼쪽: 문제 목록 */}
    <ProblemList problems={problems} />

    {/* 가운데: 매칭 인터페이스 */}
    <MatchingCanvas
      problems={problems}
      solutions={solutions}
      onMatch={(problemId, solutionId) => handleMatch(problemId, solutionId)}
    />

    {/* 오른쪽: 해설 목록 */}
    <SolutionList solutions={solutions} />
  </div>
</SolutionMatchingView>
```

### 3. 문제은행 (Problem Bank)

#### 기능 요구사항
- **검색**: 키워드, 난이도, 유형, 출처로 검색
- **필터링**: 다중 필터 조합
- **정렬**: 최신순, 난이도순, 사용빈도순
- **태그 관리**: 커스텀 태그 생성 및 할당
- **북마크**: 자주 쓰는 문제 즐겨찾기
- **통계**: 문제 분포 차트 (난이도별, 유형별, 출처별)

#### UI 레이아웃
```
┌─────────────────────────────────────────────────────────────┐
│  검색바 + 필터                                                │
│  [키워드 검색] [난이도▼] [유형▼] [출처▼] [태그▼]              │
└─────────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────────────────┐
│  필터 사이드바    │  문제 그리드 (카드 형식)                  │
│                  │                                          │
│  난이도          │  ┌───────┐ ┌───────┐ ┌───────┐          │
│  ☑ 상 (12)      │  │문제 1 │ │문제 2 │ │문제 3 │          │
│  ☐ 중 (45)      │  │이미지 │ │이미지 │ │이미지 │          │
│  ☐ 하 (23)      │  │       │ │       │ │       │          │
│                  │  │메타   │ │메타   │ │메타   │          │
│  유형            │  └───────┘ └───────┘ └───────┘          │
│  ☐ 객관식 (34)   │                                          │
│  ☑ 주관식 (28)   │  ┌───────┐ ┌───────┐ ┌───────┐          │
│                  │  │문제 4 │ │문제 5 │ │문제 6 │          │
│  출처            │  │...    │ │...    │ │...    │          │
│  ☐ 쎈 (15)       │  └───────┘ └───────┘ └───────┘          │
│  ☑ 개념원리 (18) │                                          │
│                  │  [더 보기] (페이지네이션)                 │
└──────────────────┴──────────────────────────────────────────┘
```

### 4. 배치 작업 관리

#### 기능
- **일괄 업로드**: 폴더 선택 → 모든 PDF 자동 처리
- **작업 큐**: 여러 작업을 큐에 추가하여 순차 실행
- **진행 모니터링**: 실시간 진행률 표시
- **에러 처리**: 실패한 작업 재시도 또는 건너뛰기

#### UI
```tsx
<TaskQueue>
  <TaskList>
    {tasks.map(task => (
      <TaskCard key={task.id}>
        <div className="task-info">
          <h4>{task.name}</h4>
          <Badge status={task.status} />
        </div>

        <ProgressBar
          progress={task.progress}
          total={task.total}
        />

        <div className="task-actions">
          <Button onClick={() => pauseTask(task.id)}>일시정지</Button>
          <Button onClick={() => cancelTask(task.id)}>취소</Button>
        </div>
      </TaskCard>
    ))}
  </TaskList>
</TaskQueue>
```

---

## 📅 단계별 구현 계획

### **Phase 6-1: 레이아웃 리디자인 (2-3일)**

#### 목표
사이드바 네비게이션 추가 및 전체 레이아웃 재구성

#### 작업 내용
1. **패키지 설치**
   ```bash
   npm install lucide-react framer-motion clsx class-variance-authority
   ```

2. **디자인 시스템 파일 생성**
   - `frontend/src/lib/design-system/colors.ts`
   - `frontend/src/lib/design-system/spacing.ts`
   - `frontend/src/lib/design-system/typography.ts`
   - `frontend/src/lib/utils.ts` (cn 헬퍼 함수)

3. **공용 UI 컴포넌트 생성**
   - `frontend/src/components/ui/Button.tsx`
   - `frontend/src/components/ui/Card.tsx`
   - `frontend/src/components/ui/Badge.tsx`
   - `frontend/src/components/ui/Input.tsx`
   - `frontend/src/components/ui/Select.tsx`
   - `frontend/src/components/ui/Dialog.tsx`
   - `frontend/src/components/ui/Skeleton.tsx`

4. **레이아웃 컴포넌트 생성**
   - `frontend/src/components/layout/Sidebar.tsx`
   - `frontend/src/components/layout/Header.tsx`
   - `frontend/src/components/layout/MainLayout.tsx`

5. **라우팅 구조 변경**
   - React Router 설치: `npm install react-router-dom`
   - `frontend/src/App.tsx` 리팩토링 (라우터 추가)
   - 페이지별 라우트 설정

#### 예상 산출물
```
frontend/src/
├── lib/
│   ├── design-system/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   └── utils.ts
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Dialog.tsx
│   │   └── Skeleton.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── MainLayout.tsx
└── pages/
    ├── Dashboard.tsx
    ├── DocumentsPage.tsx
    ├── LabelingPage.tsx
    ├── ProblemBankPage.tsx
    ├── TasksPage.tsx
    └── SettingsPage.tsx
```

---

### **Phase 6-2: 대시보드 구현 (1-2일)**

#### 목표
전체 현황을 한눈에 보여주는 대시보드 페이지 구현

#### 작업 내용
1. **통계 카드 컴포넌트**
   ```tsx
   <StatsCard
     title="전체 문서"
     value={documents.length}
     icon={<FileText />}
     trend={+5} // 지난 주 대비
   />
   ```

2. **최근 작업 목록**
   - 최근 라벨링한 문서
   - 최근 내보낸 문제
   - 최근 업로드한 PDF

3. **작업 진행 현황**
   - 분석 중인 문서
   - 라벨링 대기 중인 페이지
   - 실패한 작업

4. **퀵 액션**
   - PDF 업로드 버튼
   - 라벨링 계속하기
   - 문제은행 검색

#### 예상 결과
```
┌────────────────────────────────────────────────────────────┐
│  통계 카드 (4개)                                            │
│  [전체 문서 15] [추출된 문제 324] [작업 중 2] [완료율 78%] │
└────────────────────────────────────────────────────────────┘
┌───────────────────────┬────────────────────────────────────┐
│  최근 작업            │  작업 진행 현황                     │
│                       │                                    │
│  - 수학의 정석 (2분전) │  분석 중: 베이직쎈 수학2 (85%)     │
│  - 쎈 수학I (1시간전)  │  대기 중: 12페이지                 │
│  - 개념원리 (3시간전)  │  실패: 없음                        │
└───────────────────────┴────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  퀵 액션                                                    │
│  [📤 PDF 업로드] [✏️ 라벨링 계속] [🔍 문제 검색]           │
└────────────────────────────────────────────────────────────┘
```

---

### **Phase 6-3: 문서 관리 페이지 리디자인 (1-2일)**

#### 목표
기존 DocumentList를 모던한 카드 그리드로 변경

#### 작업 내용
1. **문서 카드 컴포넌트 리디자인**
   - 그라데이션 배경
   - 호버 애니메이션
   - 프로그레스 바 개선
   - 액션 버튼 드롭다운

2. **필터링 & 정렬**
   - 상태별 필터 (전체/분석중/완료)
   - 정렬 (최신순/이름순/진행률순)
   - 검색 기능

3. **일괄 작업**
   - 다중 선택
   - 일괄 삭제
   - 일괄 내보내기

#### 변경 사항
```tsx
// 현재 (DocumentList.tsx)
<div className="space-y-2">
  {documents.map(doc => (
    <div className="p-4 border rounded-lg">...</div>
  ))}
</div>

// 개선안
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {documents.map(doc => (
    <DocumentCard key={doc.id} document={doc} />
  ))}
</div>
```

---

### **Phase 6-4: 라벨링 페이지 리팩토링 (2-3일)**

#### 목표
기존 PageViewer를 개선하고 메타데이터 입력 UI 추가

#### 작업 내용
1. **3단 레이아웃**
   ```
   ┌──────────┬────────────────────┬──────────┐
   │ 페이지   │  캔버스             │ 그룹 패널 │
   │ 썸네일   │  (블록 편집)        │ + 메타   │
   │ 목록     │                    │ 데이터    │
   └──────────┴────────────────────┴──────────┘
   ```

2. **메타데이터 입력 폼**
   ```tsx
   <MetadataForm
     problemId={selectedProblem.id}
     onSave={handleSaveMetadata}
   >
     <Select label="난이도" options={difficulties} />
     <Select label="유형" options={problemTypes} />
     <Input label="단원" />
     <TagInput label="키워드" />
   </MetadataForm>
   ```

3. **키보드 단축키 확장**
   - `1`, `2`, `3`: 난이도 빠른 입력
   - `Ctrl+S`: 저장
   - `Ctrl+D`: 복제
   - `Ctrl+Z`: 실행 취소

4. **실행 취소/다시 실행**
   - 히스토리 스택 구현
   - 변경 사항 추적

---

### **Phase 6-5: 문제은행 페이지 구현 (3-4일)**

#### 목표
추출된 문제를 검색/필터링/관리하는 문제은행 구현

#### 작업 내용
1. **백엔드 API 확장**
   ```python
   # backend/app/routers/problem_bank.py
   @router.get("/problems")
   async def get_problems(
       keyword: Optional[str] = None,
       difficulty: Optional[str] = None,
       problem_type: Optional[str] = None,
       skip: int = 0,
       limit: int = 20
   ):
       # 문제 검색 로직
       pass
   ```

2. **프론트엔드 구현**
   - 검색바 + 필터 사이드바
   - 문제 카드 그리드
   - 무한 스크롤 또는 페이지네이션
   - 문제 상세 모달

3. **태그 시스템**
   - 태그 생성/편집/삭제
   - 문제에 태그 할당
   - 태그별 필터링

4. **북마크 기능**
   - 즐겨찾기 추가/제거
   - 북마크 목록 페이지

---

### **Phase 6-6: 해설 연결 시스템 (3-4일)**

#### 목표
문제와 해설을 매칭하는 UI 구현

#### 작업 내용
1. **데이터 모델 확장**
   ```typescript
   interface Solution {
     solution_id: string;
     document_id: string; // 해설 PDF
     page_index: number;
     group_id: string;
     matched_problem_id?: string; // 연결된 문제
   }
   ```

2. **자동 매칭 알고리즘**
   ```python
   def auto_match_solutions(problems, solutions):
       """
       페이지 번호와 그룹 ID 기반 자동 매칭
       예: 문제 page_0005_L1 → 해설 page_0005_L1
       """
       matches = []
       for problem in problems:
           matching_solution = find_matching_solution(
               solutions,
               problem.page_index,
               problem.group_id
           )
           if matching_solution:
               matches.append((problem.id, matching_solution.id))
       return matches
   ```

3. **수동 매칭 UI**
   - 드래그 앤 드롭 인터페이스
   - 매칭 선 시각화
   - 매칭 해제 기능

4. **검증 페이지**
   - 매칭된 문제-해설 쌍 리뷰
   - 이미지 비교 뷰
   - 잘못된 매칭 수정

---

### **Phase 6-7: 배치 작업 관리 (2-3일)**

#### 목표
여러 PDF를 일괄 처리하는 배치 시스템 구현

#### 작업 내용
1. **백엔드 작업 큐**
   ```python
   # backend/app/services/task_queue.py
   from celery import Celery

   app = Celery('pdf_labeling', broker='redis://localhost:6379/0')

   @app.task
   def process_pdf_batch(file_paths):
       for path in file_paths:
           try:
               process_single_pdf(path)
           except Exception as e:
               logger.error(f"Failed: {path}, Error: {e}")
   ```

2. **폴더 일괄 업로드**
   ```tsx
   <FolderUpload
     onUpload={(files) => handleBatchUpload(files)}
     accept=".pdf"
     multiple={true}
   />
   ```

3. **작업 모니터링 대시보드**
   - 작업 큐 상태
   - 실시간 진행률
   - 로그 표시
   - 에러 알림

4. **작업 제어**
   - 일시정지/재개
   - 취소
   - 우선순위 변경

---

### **Phase 6-8: 통계 페이지 (1-2일)**

#### 목표
문제 분포 및 작업 통계 시각화

#### 작업 내용
1. **차트 라이브러리 설치**
   ```bash
   npm install recharts
   ```

2. **차트 컴포넌트**
   - 난이도별 문제 분포 (파이 차트)
   - 유형별 문제 분포 (바 차트)
   - 출처별 문제 수 (바 차트)
   - 월별 작업량 추이 (라인 차트)

3. **데이터 집계 API**
   ```python
   @router.get("/statistics/difficulty")
   async def get_difficulty_stats():
       return {
           "easy": 120,
           "medium": 234,
           "hard": 78
       }
   ```

---

### **Phase 6-9: 설정 페이지 (1일)**

#### 목표
시스템 설정 및 사용자 환경 구성

#### 작업 내용
1. **다크모드 토글**
2. **자동 저장 간격 설정**
3. **기본 메타데이터 설정**
4. **키보드 단축키 커스터마이징**
5. **데이터 백업/복원**

---

### **Phase 6-10: 폴리싱 & 최적화 (2-3일)**

#### 목표
성능 최적화 및 UX 개선

#### 작업 내용
1. **성능 최적화**
   - React.memo 적용
   - 이미지 lazy loading
   - 가상 스크롤 (react-window)
   - API 응답 캐싱

2. **접근성 개선**
   - ARIA 속성 추가
   - 키보드 네비게이션 개선
   - 스크린 리더 지원

3. **에러 처리**
   - Error Boundary 추가
   - 사용자 친화적 에러 메시지
   - 재시도 메커니즘

4. **반응형 디자인 강화**
   - 태블릿 레이아웃 최적화
   - 모바일 레이아웃 (선택적)

---

## 📊 전체 타임라인

```
Week 1:
├─ Phase 6-1: 레이아웃 리디자인 (2-3일)
└─ Phase 6-2: 대시보드 구현 (1-2일)

Week 2:
├─ Phase 6-3: 문서 관리 리디자인 (1-2일)
└─ Phase 6-4: 라벨링 페이지 리팩토링 (2-3일)

Week 3:
└─ Phase 6-5: 문제은행 페이지 구현 (3-4일)

Week 4:
└─ Phase 6-6: 해설 연결 시스템 (3-4일)

Week 5:
├─ Phase 6-7: 배치 작업 관리 (2-3일)
├─ Phase 6-8: 통계 페이지 (1-2일)
└─ Phase 6-9: 설정 페이지 (1일)

Week 6:
└─ Phase 6-10: 폴리싱 & 최적화 (2-3일)
```

**총 예상 기간**: 5-6주

---

## 🎯 우선순위

### 🔥 High Priority (핵심 기능)
1. ✅ Phase 6-1: 레이아웃 리디자인
2. ✅ Phase 6-2: 대시보드
3. ✅ Phase 6-3: 문서 관리 리디자인
4. ✅ Phase 6-4: 라벨링 페이지 리팩토링

### 🟡 Medium Priority (중요하지만 나중에 가능)
5. ✅ Phase 6-5: 문제은행
6. ✅ Phase 6-8: 통계
7. ✅ Phase 6-9: 설정

### 🟢 Low Priority (선택적 기능)
8. ✅ Phase 6-6: 해설 연결 (UI 완료, 백엔드는 향후 추가)
9. ✅ Phase 6-7: 배치 작업 (UI 완료, 백엔드는 향후 추가)
10. ✅ Phase 6-10: 폴리싱 (Error Boundary, Lazy Loading 완료)

---

## 🚦 다음 단계

**즉시 시작 가능**: Phase 6-1 (레이아웃 리디자인)

1. `lucide-react`, `framer-motion` 패키지 설치
2. 디자인 시스템 파일 생성
3. 사이드바 컴포넌트 구현
4. React Router 설정

시작하시겠습니까?
