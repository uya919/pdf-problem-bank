# V1 배포 및 최적화 단계별 개발 계획

> **목적**: 무료 플랜 최적화 + Vercel 배포 + 레거시 정리
> **작성일**: 2025-12-30
> **참조**: [454_v1_cleanup_deployment_research.md](454_v1_cleanup_deployment_research.md)

---

## 전체 Phase 개요

| Phase | 내용 | 예상 시간 | 우선순위 |
|-------|------|-----------|----------|
| **A** | 빌드 검증 및 디버그 정리 | 30분 | 🔴 필수 |
| **B** | Vercel 배포 설정 | 20분 | 🔴 필수 |
| **C** | Railway → GitHub Actions 전환 | 40분 | 🔴 필수 |
| **D** | 레거시 코드 분리 | 1시간 | 🟡 권장 |
| **E** | Mock 데이터 제거 (RecordsPage) | 1시간 | 🟢 선택 |
| **F** | 문서 아카이브 | 30분 | 🟢 선택 |

---

## Phase A: 빌드 검증 및 디버그 정리

### A-1: TypeScript 빌드 테스트
```bash
cd frontend
npm run build
```

**체크리스트**:
- [ ] 빌드 성공 확인
- [ ] 에러 0개 확인
- [ ] warning 검토 (무시 가능한 것 확인)

### A-2: console.log 정리 (백오피스 핵심 파일만)

**정리 대상 파일** (16개 → 5개 핵심):
| 파일 | console.log 수 | 조치 |
|------|----------------|------|
| `BackofficeDemo.tsx` | 16개 | 삭제 |
| `AuthContext.tsx` | 5개 | 삭제 |
| `WeeklyCalendar.tsx` | 2개 | 삭제 |
| `StudentDetailPage.tsx` | 1개 | 삭제 |
| `ClassAssignmentPage.tsx` | 1개 | 삭제 |

**레거시 파일은 무시** (나중에 삭제됨):
- `PageViewer.tsx` (15개)
- `UnifiedWorkPage.tsx` (7개)
- 기타 PDF 라벨링 관련

**코드 수정**:
```typescript
// 삭제 대상 패턴
console.log('Debug:', ...);
console.log('Stage 35-B:', ...);
console.log('[WeeklyCalendar]', ...);

// 유지 (에러 로깅)
console.error('API Error:', error);
```

### A-3: 환경변수 확인

**frontend/.env.local 필요 변수**:
```env
VITE_SUPABASE_URL=https://rhejybeufojkfdfntpfg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

---

## Phase B: Vercel 배포 설정

### B-1: vercel.json 생성

**파일**: `frontend/vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### B-2: Vercel 프로젝트 설정

1. [vercel.com](https://vercel.com) 접속
2. "Import Project" 클릭
3. GitHub 저장소 연결: `pdf` (또는 `hyeyum-backoffice`)
4. 설정:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### B-3: 환경변수 설정 (Vercel Dashboard)

| 변수명 | 값 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://rhejybeufojkfdfntpfg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |

### B-4: 배포 및 검증

**테스트 체크리스트**:
- [ ] 로그인 (owner@hyeyum.com)
- [ ] 강사 대시보드 표시
- [ ] 관리자 대시보드 표시
- [ ] 모바일 반응형 확인
- [ ] 공지사항 CRUD

---

## Phase C: Railway → GitHub Actions 전환 (무료화)

### C-1: GitHub Secrets 설정

**저장소 Settings → Secrets and variables → Actions**:

| Secret 이름 | 값 |
|-------------|-----|
| `MAKEEDU_ID` | 메이크에듀 로그인 ID |
| `MAKEEDU_PW` | 메이크에듀 비밀번호 |
| `SUPABASE_URL` | `https://rhejybeufojkfdfntpfg.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key |

### C-2: GitHub Actions 워크플로우 생성

**파일**: `.github/workflows/sync-makeedu.yml`
```yaml
name: 메이크에듀 학생 동기화

on:
  schedule:
    # 매일 한국시간 오전 6시 (UTC 21시 전날)
    - cron: '0 21 * * *'
  workflow_dispatch:
    # 수동 실행 버튼

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install playwright supabase python-dotenv
          playwright install chromium
          playwright install-deps chromium

      - name: Run sync
        env:
          MAKEEDU_ID: ${{ secrets.MAKEEDU_ID }}
          MAKEEDU_PW: ${{ secrets.MAKEEDU_PW }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          cd railway-worker
          python worker.py

      - name: Notify on failure
        if: failure()
        run: echo "동기화 실패! GitHub Actions 로그를 확인하세요."
```

### C-3: worker.py 환경변수 수정

**파일**: `railway-worker/worker.py`
```python
# 기존
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # Railway용

# 수정 (GitHub Actions 호환)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY")
```

### C-4: 테스트 실행

1. GitHub → Actions 탭
2. "메이크에듀 학생 동기화" 워크플로우 선택
3. "Run workflow" 클릭 (수동 실행)
4. 로그 확인 → 성공 여부

### C-5: Railway 서비스 중지

1. Railway Dashboard 접속
2. `pdf` 프로젝트 선택
3. Worker 서비스 → Settings → Delete Service

**비용 절감**: 월 $5 → $0

---

## Phase D: 레거시 코드 분리 (권장)

### D-1: 레거시 페이지 라우팅 제거

**파일**: `frontend/src/App.tsx`

```typescript
// 삭제 대상 라우트
<Route path="/" element={<MainPage />} />
<Route path="/viewer" element={<ViewerPage />} />
<Route path="/labeling" element={<LabelingPage />} />
<Route path="/work-session/*" element={...} />
<Route path="/problem-bank/*" element={...} />
<Route path="/exam-builder" element={...} />
<Route path="/exam-editor" element={...} />
<Route path="/statistics" element={...} />
<Route path="/settings" element={...} />
<Route path="/tasks" element={...} />
// ... 기타 PDF 라벨링 관련
```

**유지 라우트**:
```typescript
<Route path="/" element={<HomePage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/backoffice/*" element={...} />
<Route path="/admin/*" element={...} />
```

### D-2: 레거시 파일 archive 폴더로 이동

```bash
# 폴더 생성
mkdir -p archive/problem-bank/pages
mkdir -p archive/problem-bank/components
mkdir -p archive/problem-bank/hooks

# 페이지 이동
mv frontend/src/pages/LabelingPage.tsx archive/problem-bank/pages/
mv frontend/src/pages/ViewerPage.tsx archive/problem-bank/pages/
mv frontend/src/pages/WorkSession*.tsx archive/problem-bank/pages/
mv frontend/src/pages/ProblemBank*.tsx archive/problem-bank/pages/
mv frontend/src/pages/PageViewer.tsx archive/problem-bank/pages/
mv frontend/src/pages/MainPage.tsx archive/problem-bank/pages/
# ... 기타

# 컴포넌트 이동
mv frontend/src/components/matching archive/problem-bank/components/
mv frontend/src/components/unified archive/problem-bank/components/
mv frontend/src/components/pdf archive/problem-bank/components/
mv frontend/src/components/main archive/problem-bank/components/
mv frontend/src/components/PageCanvas.tsx archive/problem-bank/components/
```

### D-3: 백엔드 레거시 라우터 제거

**유지 대상** (`backend/app/main.py`):
```python
# 유지
app.include_router(sync.router)
app.include_router(grade_promotion.router)
app.include_router(admin_users.router)

# 삭제
# app.include_router(blocks.router)
# app.include_router(documents.router)
# app.include_router(groups.router)
# app.include_router(matching.router)
# app.include_router(pages.router)
# app.include_router(problems.router)
# app.include_router(export.router)
```

### D-4: 빌드 재검증

```bash
cd frontend
npm run build
```

---

## Phase E: Mock 데이터 제거 - RecordsPage (선택)

### E-1: 진도 탭 Supabase 연결

**기존 테이블 확인**: `progress`

**훅 수정**: `useBackofficeData.ts`
```typescript
export function useProgress(options: {
  classId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['progress', options.classId, options.startDate, options.endDate],
    queryFn: async () => {
      let query = supabase
        .from('progress')
        .select('*')
        .order('date', { ascending: false });

      if (options.classId) {
        query = query.eq('class_id', options.classId);
      }
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!options.classId,
  });
}
```

### E-2: 숙제 탭 Supabase 연결

**기존 테이블 확인**: `homework`, `homework_submissions`

### E-3: 성적 탭 Supabase 연결

**기존 테이블 확인**: `exam_scores`

### E-4: RecordsPage Mock 제거

```typescript
// 삭제
const MOCK_PROGRESS_DATA = [...];
const MOCK_HOMEWORK_DATA = [...];
const MOCK_EXAM_SCORES = [...];

// 변경
const { data: progressData } = useProgress({ classId: selectedClassId });
const { data: homeworkData } = useHomework({ classId: selectedClassId });
const { data: examScores } = useExamScores({ classId: selectedClassId });
```

---

## Phase F: 문서 아카이브 (선택)

### F-1: 폴더 구조 생성

```bash
mkdir -p docs/archive/research-370-399
mkdir -p docs/archive/research-400-429
mkdir -p docs/archive/research-430-459
```

### F-2: 연구리포트 이동

```bash
# 370-399
mv docs/370_*.md docs/archive/research-370-399/
mv docs/371_*.md docs/archive/research-370-399/
# ...

# 400-429
mv docs/400_*.md docs/archive/research-400-429/
# ...

# 430-459
mv docs/430_*.md docs/archive/research-430-459/
# ...
```

### F-3: docs/ 최종 구조

```
docs/
├── plan.md                    # 핵심 개발 계획
├── supabase-schema.md         # DB 스키마
├── business-logic.md          # 비즈니스 로직
├── hyeyum-features.md         # 기능 명세
├── mockups/                   # HTML 목업
└── archive/                   # 연구리포트 보관
    ├── research-370-399/
    ├── research-400-429/
    └── research-430-459/
```

---

## 최종 무료 운영 구성

| 서비스 | 용도 | 월 비용 |
|--------|------|---------|
| **Vercel** | 프론트엔드 호스팅 | $0 |
| **Supabase** | DB + Auth | $0 |
| **GitHub Actions** | 메이크에듀 동기화 | $0 |
| **Railway** | ❌ 사용 안 함 | - |

**총 비용: $0/월**

---

## 실행 체크리스트

### Phase A (필수)
- [ ] `npm run build` 성공
- [ ] console.log 정리 (5개 파일)
- [ ] 환경변수 확인

### Phase B (필수)
- [ ] vercel.json 생성
- [ ] Vercel 프로젝트 생성
- [ ] 환경변수 설정
- [ ] 배포 성공
- [ ] 로그인 테스트
- [ ] 강사/관리자 대시보드 확인

### Phase C (필수 - 무료화)
- [ ] GitHub Secrets 설정 (4개)
- [ ] sync-makeedu.yml 생성
- [ ] worker.py 환경변수 수정
- [ ] 수동 실행 테스트
- [ ] Railway 서비스 삭제

### Phase D (권장)
- [ ] App.tsx 라우팅 정리
- [ ] 레거시 파일 archive 이동
- [ ] 백엔드 라우터 정리
- [ ] 빌드 재검증

### Phase E (선택)
- [ ] useProgress 훅 생성
- [ ] useHomework 훅 생성
- [ ] useExamScores 훅 생성
- [ ] RecordsPage Mock 제거

### Phase F (선택)
- [ ] archive 폴더 구조 생성
- [ ] 연구리포트 이동

---

*작성: Claude Code (Opus 4.5) | 2025-12-30*
