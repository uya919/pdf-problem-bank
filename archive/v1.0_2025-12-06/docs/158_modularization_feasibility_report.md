# 프로젝트 모듈화 구현 가능성 리포트

**문서 번호**: 158
**작성일**: 2025-12-06
**목적**: 코드베이스 전체 분석 및 모듈화 전략 수립

---

## 1. 요약 (Executive Summary)

### 현재 상태

| 영역 | 파일 수 | 총 라인 | 300줄 초과 | 상태 |
|------|--------|---------|----------|------|
| Frontend | 174 | 38,386 | 25개 (14%) | 위험 |
| Backend | 51 | 14,205 | 16개 (31%) | 위험 |
| **합계** | **225** | **52,591** | **41개** | **모듈화 필요** |

### 결론: 구현 가능성 85%

**권장 사항**: 단계적 리팩토링 (Big Bang 방식 금지)
- Phase 1: 가장 큰 파일 5개 분리 (1-2주)
- Phase 2: 중간 크기 파일 10개 분리 (2-3주)
- Phase 3: 구조 개선 및 최적화 (1주)

---

## 2. 현재 코드베이스 분석

### 2.1 Frontend 위험 파일 (300줄 이상)

| 순위 | 파일 | 줄 수 | 위험도 | 모듈화 우선순위 |
|------|------|------|--------|---------------|
| 1 | IntegratedProblemBankPage.tsx | 1,493 | CRITICAL | P0 |
| 2 | client.ts (API) | 1,036 | CRITICAL | P0 |
| 3 | PageViewer.tsx | 1,026 | CRITICAL | P0 |
| 4 | ExamEditorPage.tsx | 845 | HIGH | P1 |
| 5 | workSessionStore.ts | 769 | HIGH | P1 |
| 6 | SolutionMatchingPage.tsx | 716 | HIGH | P1 |
| 7 | PageCanvas.tsx | 674 | HIGH | P2 |
| 8 | HangulUploadPage.tsx | 672 | HIGH | P2 |
| 9 | GroupPanel.tsx | 666 | HIGH | P2 |
| 10 | UnifiedWorkPage.tsx | 640 | HIGH | P2 |

### 2.2 Backend 위험 파일 (300줄 이상)

| 순위 | 파일 | 줄 수 | 위험도 | 모듈화 우선순위 |
|------|------|------|--------|---------------|
| 1 | hml_parser.py | 1,221 | CRITICAL | P1 (복잡) |
| 2 | export.py | 1,080 | CRITICAL | P0 |
| 3 | hangul.py | 1,008 | CRITICAL | P0 |
| 4 | hwp_latex_converter.py | 834 | HIGH | P2 (전문) |
| 5 | work_sessions.py | 775 | HIGH | P1 |
| 6 | sync_manager.py | 563 | MEDIUM | P2 |
| 7 | problem_service.py | 553 | MEDIUM | P2 |

---

## 3. 모듈화 전략

### 3.1 Frontend 분리 계획

#### P0: IntegratedProblemBankPage.tsx (1,493줄)
```
현재: 모든 기능이 한 파일에
분리 후:
├── pages/
│   └── IntegratedProblemBankPage.tsx (~200줄, 조합만)
├── features/problemBank/
│   ├── components/
│   │   ├── ProblemListSection.tsx (~150줄)
│   │   ├── FilterSection.tsx (~100줄)
│   │   ├── StatsSection.tsx (~80줄)
│   │   └── ActionBar.tsx (~100줄)
│   ├── hooks/
│   │   ├── useProblemFilters.ts (~100줄)
│   │   ├── useProblemSelection.ts (~80줄)
│   │   └── useProblemActions.ts (~150줄)
│   └── types.ts (~50줄)
```

#### P0: client.ts (1,036줄)
```
현재: 모든 API 함수가 한 파일에
분리 후:
├── api/
│   ├── client.ts (~50줄, axios 설정만)
│   ├── documents.ts (~100줄)
│   ├── blocks.ts (~100줄)
│   ├── groups.ts (~80줄)
│   ├── sessions.ts (~150줄)
│   ├── matching.ts (~100줄)
│   ├── export.ts (~100줄)
│   └── index.ts (배럴 export)
```

#### P0: PageViewer.tsx (1,026줄)
```
현재: 뷰어 + 로직 + 이벤트 핸들러 혼재
분리 후:
├── pages/
│   └── PageViewer.tsx (~200줄, 레이아웃만)
├── features/pageViewer/
│   ├── components/
│   │   ├── CanvasArea.tsx (~150줄)
│   │   ├── ToolBar.tsx (~100줄)
│   │   └── StatusBar.tsx (~50줄)
│   ├── hooks/
│   │   ├── usePageGroups.ts (~150줄)
│   │   ├── useCanvasInteraction.ts (~150줄)
│   │   ├── useKeyboardShortcuts.ts (~100줄)
│   │   └── usePageNavigation.ts (~80줄)
│   └── utils/
│       └── groupUtils.ts (~50줄)
```

### 3.2 Backend 분리 계획

#### P0: export.py (1,080줄)
```
현재: 모든 내보내기 로직이 라우터에
분리 후:
├── routers/
│   └── export.py (~150줄, 라우팅만)
├── services/export/
│   ├── __init__.py
│   ├── image_exporter.py (~200줄)
│   ├── json_exporter.py (~150줄)
│   ├── pdf_exporter.py (~200줄)
│   ├── batch_exporter.py (~150줄)
│   └── utils.py (~100줄)
```

#### P0: hangul.py (1,008줄)
```
현재: 한글 파일 처리 모든 API가 한 라우터에
분리 후:
├── routers/hangul/
│   ├── __init__.py (~50줄, 라우터 등록)
│   ├── upload.py (~150줄)
│   ├── parse.py (~200줄)
│   ├── extract.py (~200줄)
│   └── debug.py (~100줄)
```

---

## 4. 구현 가능성 분석

### 4.1 장점

| 항목 | 설명 |
|------|------|
| Claude Code 효율 | 작은 파일 = 정확한 수정, 빠른 이해 |
| 버그 격리 | 모듈별 에러 추적 용이 |
| 병렬 개발 | 기능별 독립 작업 가능 |
| 테스트 용이 | 단위 테스트 작성 수월 |
| 재사용성 | 공통 로직 추출 가능 |

### 4.2 우려 사항

| 우려 | 위험도 | 대응 방안 |
|------|--------|----------|
| 기능 중단 위험 | HIGH | 단계적 리팩토링 + 즉시 테스트 |
| 순환 의존성 | MEDIUM | 의존성 방향 명확히 정의 |
| 과도한 분리 | MEDIUM | 너무 잘게 쪼개지 않기 (50줄 이상) |
| 시간 투자 | HIGH | 우선순위 기반 점진적 진행 |
| 테스트 부재 | HIGH | 분리 전 수동 테스트 체크리스트 |

### 4.3 위험도 평가

```
┌─────────────────────────────────────────────────────────┐
│  구현 가능성: 85%                                        │
├─────────────────────────────────────────────────────────┤
│  ✅ 기술적 가능성: 95%                                   │
│     - TypeScript/Python 모두 모듈화 지원                 │
│     - 기존 import 구조 변경만 필요                       │
│                                                         │
│  ⚠️  실행 위험도: 25%                                    │
│     - 기능 중단 가능성 (테스트 부재)                     │
│     - 시간 소요 (3-6주 예상)                            │
│                                                         │
│  💡 성공 조건:                                          │
│     1. 한 번에 하나씩 분리                              │
│     2. 분리 후 즉시 브라우저 테스트                     │
│     3. 너무 잘게 쪼개지 않기                            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 실행 계획

### Phase 61: Frontend 모듈화 (P0)

**예상 시간**: 1-2주
**위험도**: 중간

| 단계 | 대상 | 예상 시간 |
|------|------|----------|
| 61-A | client.ts 분리 | 2시간 |
| 61-B | IntegratedProblemBankPage 분리 | 4시간 |
| 61-C | PageViewer 분리 | 4시간 |

### Phase 62: Backend 모듈화 (P0)

**예상 시간**: 1주
**위험도**: 중간

| 단계 | 대상 | 예상 시간 |
|------|------|----------|
| 62-A | export.py 분리 | 3시간 |
| 62-B | hangul.py 분리 | 3시간 |

### Phase 63: Frontend 추가 모듈화 (P1-P2)

**예상 시간**: 2주
**위험도**: 낮음

| 단계 | 대상 | 예상 시간 |
|------|------|----------|
| 63-A | ExamEditorPage 분리 | 3시간 |
| 63-B | workSessionStore 분리 | 2시간 |
| 63-C | SolutionMatchingPage 분리 | 3시간 |
| 63-D | 기타 페이지 분리 | 4시간 |

### Phase 64: Backend 추가 모듈화 (P1-P2)

**예상 시간**: 1주
**위험도**: 낮음

| 단계 | 대상 | 예상 시간 |
|------|------|----------|
| 64-A | work_sessions.py 분리 | 3시간 |
| 64-B | sync_manager.py 정리 | 2시간 |

---

## 6. 모듈화 원칙

### 6.1 파일 크기 기준

| 크기 | 조치 |
|------|------|
| ~150줄 | 유지 |
| 150-300줄 | 검토 |
| 300줄+ | 분리 강력 권장 |
| 500줄+ | 반드시 분리 |

### 6.2 분리 기준 (우선순위)

1. **단일 책임**: 한 파일 = 한 기능
2. **응집도**: 관련 코드는 함께
3. **결합도**: 의존성 최소화
4. **재사용성**: 공통 로직 추출

### 6.3 분리하지 말아야 할 경우

- 50줄 미만의 작은 파일
- 단일 목적의 유틸리티
- 타입 정의 파일
- 설정 파일

---

## 7. 권장 폴더 구조

### Frontend (Feature-based)
```
frontend/src/
├── api/                    # API 클라이언트 (도메인별 분리)
│   ├── client.ts           # axios 설정
│   ├── documents.ts
│   ├── sessions.ts
│   └── index.ts
│
├── features/               # 기능별 모듈
│   ├── labeling/           # 라벨링 기능
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── problemBank/        # 문제은행 기능
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   └── matching/           # 매칭 기능
│       ├── components/
│       ├── hooks/
│       └── types.ts
│
├── components/             # 공통 컴포넌트
│   ├── ui/                 # 기본 UI (Button, Card...)
│   └── layout/             # 레이아웃
│
├── hooks/                  # 공통 훅
├── stores/                 # 상태 관리
├── pages/                  # 페이지 (조합만)
├── types/                  # 공통 타입
└── utils/                  # 유틸리티
```

### Backend (Domain-based)
```
backend/app/
├── routers/                # API 라우터
│   ├── documents/
│   ├── hangul/
│   ├── export/
│   └── sessions/
│
├── services/               # 비즈니스 로직
│   ├── hangul/
│   ├── export/
│   ├── problems/
│   └── sync/
│
├── models/                 # 데이터 모델
├── utils/                  # 유틸리티
└── config.py              # 설정
```

---

## 8. 최종 권장사항

### 지금 당장 시작할 것

1. **client.ts 분리** (가장 안전, 영향 적음)
   - API 도메인별로 파일 분리
   - import 경로만 변경

2. **테스트 체크리스트 작성**
   - 각 페이지별 수동 테스트 항목
   - 분리 후 확인할 기능 목록

### 점진적으로 진행할 것

3. **페이지별 모듈화** (한 번에 하나씩)
   - PageViewer → hooks 분리
   - IntegratedProblemBankPage → components 분리

4. **백엔드 라우터 정리**
   - export.py → services 분리
   - hangul.py → 하위 라우터 분리

### 하지 말아야 할 것

- Big Bang 리팩토링 (전체 한 번에 변경)
- 50줄 미만으로 과도한 분리
- 테스트 없이 대규모 변경

---

## 9. 예상 효과

### Before
```
- Claude Code 수정 시 에러 빈발
- 파일 읽기에 컨텍스트 소모
- 버그 추적 어려움
- 기능 추가 시 충돌 위험
```

### After
```
- 작은 파일 = 정확한 수정
- 모듈별 독립 작업 가능
- 버그 격리 및 빠른 수정
- 새 기능 추가 용이
```

---

*작성: Claude Code*
*다음 단계: plan.md에 Phase 61-64 추가 후 순차적 진행*
