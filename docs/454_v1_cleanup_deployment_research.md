# V1 프로젝트 정리 및 Vercel 배포 연구리포트

> **목적**: hyeyum을 대체할 새로운 UX 철학의 백오피스 V1 완성 후 정리 및 배포
> **작성일**: 2025-12-30
> **개발 방식**: Claude Code (Opus) 100% 코드 작성

---

## 1. 프로젝트 개요

### 1.1 목표
- 기존 hyeyum 프로젝트를 **새로운 UI/UX 철학**으로 완전 대체
- **토스 디자인 시스템** 기반의 현대적 백오피스 구축
- **강사용 + 관리자용** 통합 웹앱

### 1.2 개발 환경
| 항목 | 내용 |
|------|------|
| **개발 도구** | Claude Code (Opus 4.5) |
| **프론트엔드** | React 19, TypeScript, Vite, Tailwind CSS |
| **백엔드** | Supabase (DB + Auth + Storage) |
| **배포 대상** | Vercel (프론트엔드) + Supabase (백엔드) |
| **Worker** | Railway (메이크에듀 동기화) |

### 1.3 현재 상태
| Stage | 내용 | 상태 |
|-------|------|------|
| 1-20 | 강사/관리자 기본 기능 | ✅ 완료 |
| 28-30 | 캘린더/공휴일 시스템 | ✅ 완료 |
| 32-33 | 학년 승급/상담 관리 | ✅ 완료 |
| 35 | 부담임 권한 시스템 | ✅ 완료 |
| 5 | Timetable Studio | 🔄 진행중 |
| 31 | 초등부 담임/부담임 | ⬜ 대기 |

---

## 2. 코드베이스 현황 분석

### 2.1 파일 통계
| 항목 | 수량 | 비고 |
|------|------|------|
| **TSX 파일** | 324개 | React 컴포넌트/페이지 |
| **TS 파일** | 167개 | 훅/유틸/타입/API |
| **문서 파일** | 197개 | 연구리포트/개발계획 |
| **총 코드 파일** | 491개 | - |

### 2.2 프로젝트 구조 (사용 중)
```
pdf/
├── frontend/src/
│   ├── pages/
│   │   ├── BackofficeDemo.tsx      # 강사용 대시보드 (핵심)
│   │   ├── HomePage.tsx            # 랜딩/라우팅
│   │   ├── backoffice/             # 강사용 페이지 (4개)
│   │   ├── admin/                  # 관리자용 페이지 (20+개)
│   │   ├── auth/                   # 인증 페이지
│   │   └── problemBank/            # 문제은행 (레거시)
│   │
│   ├── components/
│   │   ├── admin/                  # 관리자 컴포넌트
│   │   ├── backoffice/             # 강사 컴포넌트
│   │   ├── toss/                   # 토스 스타일 UI
│   │   ├── ui/                     # 공통 UI
│   │   └── layout/                 # 레이아웃
│   │
│   ├── hooks/                      # 54개 커스텀 훅
│   ├── api/                        # API 함수
│   ├── types/                      # TypeScript 타입
│   ├── contexts/                   # React Context
│   ├── stores/                     # Zustand 스토어
│   └── utils/                      # 유틸리티
│
├── backend/                        # Python FastAPI (레거시)
├── railway-worker/                 # 메이크에듀 동기화
├── supabase/                       # Migration 파일
└── docs/                           # 개발 문서
```

---

## 3. 정리가 필요한 영역

### 3.1 레거시 코드 (삭제 대상)

#### A. 문제은행 관련 (PDF 라벨링 시스템)
```
pages/
├── LabelingPage.tsx
├── ViewerPage.tsx
├── WorkSessionLabelingPage.tsx
├── WorkSessionSetupPage.tsx
├── WorkSessionDashboard.tsx
├── WorkSessionMatchingPage.tsx
├── ClassificationTestPage.tsx
├── Dashboard.tsx
├── DocumentsPage.tsx
├── ExamBuilderPage.tsx
├── ExamEditorPage.tsx
├── HangulUploadPage.tsx
├── IntegratedProblemBankPage.tsx
├── NewProblemBankPage.tsx
├── ProblemBankHub.tsx
├── ProblemBankPage.tsx
├── ProblemsView.tsx
├── ProblemsViewWrapper.tsx
├── SettingsPage.tsx
├── SolutionMatchingPage.tsx
├── StatisticsPage.tsx
├── TasksPage.tsx
├── UnifiedMatchingPage.tsx
├── UnifiedWorkPage.tsx
├── MainPage.tsx
├── PageViewer.tsx
├── RegistrationPage.tsx
└── problemBank/              # 전체 폴더
```

**이유**: PDF 문제 라벨링 시스템은 백오피스와 무관한 별도 프로젝트

#### B. Backend (Python FastAPI)
```
backend/
├── app/
│   ├── routers/              # 대부분 레거시
│   │   ├── blocks.py         # PDF 라벨링용
│   │   ├── documents.py
│   │   ├── export.py
│   │   ├── groups.py
│   │   ├── matching.py
│   │   ├── pages.py
│   │   ├── problems.py
│   │   └── ...
│   └── services/
└── ...
```

**현황**:
- **사용 중**: `sync.py`, `grade_promotion.py`, `admin_users.py` (메이크에듀 연동)
- **미사용**: PDF 라벨링 관련 모든 라우터

#### C. 레거시 컴포넌트
```
components/
├── matching/                 # PDF 매칭
├── unified/                  # 통합 뷰어
├── pdf/                      # PDF 관련
├── main/                     # 레거시 메인페이지
└── PageCanvas.tsx            # PDF 캔버스
```

### 3.2 Mock 데이터 사용 현황

| 파일 | Mock 변수 | 상태 | 우선순위 |
|------|-----------|------|----------|
| `RecordsPage.tsx` | `MOCK_PROGRESS_DATA`, `MOCK_HOMEWORK_DATA`, `MOCK_EXAM_SCORES` | 진도/숙제/성적 탭 | 🔴 높음 |
| `ClassesPage.tsx` | `MOCK_CLASS_SESSIONS` | 세션 목록 | 🟡 중간 |
| `exams.ts` | `MOCK_EXAMS` | 시험 관리 | 🟡 중간 |
| `useTextbooks.ts` | `MOCK_CLASS_TEXTBOOKS` | 교재 관리 | 🟢 낮음 |
| `useStudentSearch.ts` | 검색 Mock | 학생 검색 | 🟢 낮음 |
| `GradeOverview.tsx` | 일부 Mock | 학년 현황 | 🟢 낮음 |

### 3.3 디버그 코드 현황

| 유형 | 발생 수 | 상태 |
|------|---------|------|
| `console.log` | 66개 (17파일) | 🔴 정리 필요 |
| `TODO/FIXME/HACK` | 29개 (19파일) | 🟡 검토 필요 |

**주요 console.log 파일**:
- `BackofficeDemo.tsx`: 16개 (디버깅용)
- `PageViewer.tsx`: 15개 (레거시)
- `AuthContext.tsx`: 5개 (인증 디버깅)

### 3.4 문서 정리 필요

| 카테고리 | 파일 수 | 상태 |
|----------|---------|------|
| 연구리포트 (370-453) | 84개 | 보관 필요 |
| 목업 HTML | 20+개 | 보관 필요 |
| 레거시 문서 (200번대) | 삭제됨 | ✅ 완료 |

---

## 4. 정리 전략 제안

### 4.1 Phase 1: 레거시 코드 분리 (권장)
```
pdf/                          # 백오피스 전용
└── frontend/src/
    └── pages/
        ├── backoffice/       # 강사용 (유지)
        ├── admin/            # 관리자용 (유지)
        ├── auth/             # 인증 (유지)
        ├── BackofficeDemo.tsx
        └── HomePage.tsx

archive/                      # 레거시 보관
└── problem-bank/             # PDF 라벨링 시스템
    ├── pages/
    ├── components/
    └── hooks/
```

### 4.2 Phase 2: Mock 데이터 제거

#### 우선순위 1: RecordsPage
```typescript
// 현재 (Mock)
const MOCK_PROGRESS_DATA = [...];
const progressData = selectedClass ? MOCK_PROGRESS_DATA : [];

// 변경 (Supabase)
const { data: progressData } = useProgress({ classId: selectedClass });
```

**필요 작업**:
1. `useProgress` 훅 Supabase 연결
2. `useHomework` 훅 Supabase 연결
3. `useExamScores` 훅 Supabase 연결

#### 우선순위 2: ClassesPage 세션
```typescript
// useClassSessions 훅 Supabase 연결
```

### 4.3 Phase 3: 디버그 코드 정리
```typescript
// 삭제 대상
console.log('Debug:', data);
console.log('Stage 35-B:', myClassIds);

// 유지 (에러 로깅)
console.error('API Error:', error);
```

### 4.4 Phase 4: 문서 아카이브
```
docs/
├── plan.md                   # 핵심 계획
├── supabase-schema.md        # DB 스키마
├── business-logic.md         # 비즈니스 로직
├── hyeyum-features.md        # 기능 명세
└── archive/                  # 연구리포트 보관
    └── research/
        ├── 370-399/
        ├── 400-429/
        └── 430-453/
```

---

## 5. Vercel 배포 체크리스트

### 5.1 환경 변수 설정
```env
# Vercel 환경변수
VITE_SUPABASE_URL=https://rhejybeufojkfdfntpfg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 5.2 빌드 설정
```json
// vercel.json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": "vite"
}
```

### 5.3 배포 전 체크리스트

| 항목 | 상태 | 비고 |
|------|------|------|
| TypeScript 빌드 성공 | ⬜ | `npm run build` |
| 환경변수 설정 | ⬜ | Vercel Dashboard |
| Supabase RLS 정책 | ✅ | 이미 적용됨 |
| 도메인 연결 | ⬜ | hyeyum.vercel.app |
| HTTPS 인증서 | ✅ | Vercel 자동 |

### 5.4 배포 후 검증

| 테스트 | 내용 |
|--------|------|
| 로그인 | owner/admin/teacher 계정 |
| 강사 대시보드 | 본인 반만 표시 |
| 관리자 대시보드 | 전체 반 표시 |
| 공지사항 | 권한별 필터링 |
| 순환수업 | 캘린더 연동 |
| 모바일 반응형 | 4탭 네비게이션 |

---

## 6. Railway Worker 연동

### 6.1 현재 상태
- **서비스**: 메이크에듀 학생 데이터 동기화
- **배포**: Railway (`railway-worker/`)
- **스케줄**: 매일 자동 실행

### 6.2 Vercel 배포 시 변경사항
- 없음 (독립 서비스)
- 환경변수는 Railway에서 별도 관리

---

## 7. 권장 정리 순서

### Stage A: 빌드 검증 (1단계)
1. `npm run build` 성공 확인
2. TypeScript 에러 수정
3. 환경변수 체크

### Stage B: 디버그 코드 정리 (2단계)
1. `console.log` 제거 (백오피스 파일)
2. 레거시 파일은 그대로 (나중에 삭제)

### Stage C: 배포 (3단계)
1. Vercel 프로젝트 생성
2. 환경변수 설정
3. 배포 및 검증

### Stage D: 레거시 분리 (4단계 - 배포 후)
1. 레거시 페이지 라우팅 제거
2. 관련 컴포넌트/훅 archive로 이동
3. 백엔드 레거시 라우터 제거

### Stage E: Mock 데이터 제거 (5단계 - 선택)
1. RecordsPage Supabase 연결
2. ClassesPage 세션 연결
3. ExamManagement Supabase 연결

---

## 8. 결론

### 8.1 핵심 포인트
1. **V1 완성도**: 백오피스 핵심 기능 (강사/관리자) 완료
2. **레거시 분리 필요**: PDF 라벨링 시스템은 별도 프로젝트로 분리 권장
3. **Mock 데이터**: 배포 후 점진적으로 Supabase 연결
4. **디버그 코드**: 배포 전 정리 권장

### 8.2 즉시 배포 가능 여부
- **가능**: 현재 상태로 Vercel 배포 가능
- **권장**: 디버그 코드 정리 후 배포
- **레거시 분리**: 배포 후 진행해도 무방

### 8.3 향후 작업
| 우선순위 | 작업 | 이유 |
|----------|------|------|
| 🔴 높음 | Vercel 배포 | V1 공개 |
| 🔴 높음 | console.log 정리 | 프로덕션 품질 |
| 🟡 중간 | RecordsPage Supabase | 기능 완성 |
| 🟡 중간 | 레거시 분리 | 코드 정리 |
| 🟢 낮음 | 문서 아카이브 | 가독성 향상 |

---

*작성: Claude Code (Opus 4.5) | 2025-12-30*
