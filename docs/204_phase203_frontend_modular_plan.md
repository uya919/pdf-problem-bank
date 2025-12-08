# Phase 203: Frontend 코드 모듈화 상세 계획

**문서 번호**: 204
**상위 문서**: [200_v2_master_plan.md](200_v2_master_plan.md)
**예상 시간**: 7시간
**위험도**: 중간 (기능 테스트 필수)

---

## 현재 상태

| 파일 | 줄 수 | 우선순위 |
|------|------|---------|
| IntegratedProblemBankPage.tsx | 1,493 | P0 |
| client.ts | 1,036 | P0 |
| PageViewer.tsx | 1,026 | P0 |
| ExamEditorPage.tsx | 845 | P1 |
| workSessionStore.ts | 769 | P1 |
| SolutionMatchingPage.tsx | 716 | P1 |

---

## 203-A: API 클라이언트 분리 (2시간)

### 현재
```
api/
└── client.ts (1,036줄) ← 모든 API가 여기에
```

### 목표
```
api/
├── client.ts (~50줄)        # axios 설정만
├── documents.ts (~100줄)    # 문서 API
├── blocks.ts (~80줄)        # 블록 API
├── groups.ts (~80줄)        # 그룹 API
├── sessions.ts (~150줄)     # 세션 API
├── matching.ts (~100줄)     # 매칭 API
├── export.ts (~100줄)       # 내보내기 API
├── problems.ts (~100줄)     # 문제은행 API
├── hangul.ts (~80줄)        # 한글 파일 API
├── classification.ts        # 분류 API (이미 분리됨)
└── index.ts                 # 배럴 export
```

### 분리 순서
1. client.ts에서 axios 설정만 남기기
2. 도메인별 함수 추출
3. 각 파일에서 client import
4. index.ts에서 모두 re-export
5. 사용처 import 경로 수정

### 테스트 체크리스트
- [ ] 문서 목록 조회 동작
- [ ] 블록 데이터 로드 동작
- [ ] 그룹 저장 동작
- [ ] 세션 생성/조회 동작

---

## 203-B: features/ 구조 생성 (1시간)

### 생성할 폴더 구조
```
frontend/src/features/
├── labeling/           # 라벨링 기능
│   ├── components/
│   ├── hooks/
│   └── types.ts
│
├── problemBank/        # 문제은행 기능
│   ├── components/
│   ├── hooks/
│   └── types.ts
│
├── matching/           # 매칭 기능
│   ├── components/
│   ├── hooks/
│   └── types.ts
│
└── exam/               # 시험지 기능
    ├── components/
    ├── hooks/
    └── types.ts
```

### 작업
1. 폴더 구조 생성
2. 각 feature의 index.ts 생성
3. 기존 components/에서 관련 파일 이동 준비

---

## 203-C: 대형 페이지 분리 (4시간)

### 203-C-1: PageViewer.tsx 분리 (1.5시간)

**현재**: 1,026줄 (모든 로직 포함)

**분리 후**:
```
features/labeling/
├── components/
│   ├── CanvasArea.tsx (~200줄)
│   ├── ToolBar.tsx (~100줄)
│   └── GroupSidebar.tsx (~150줄)
├── hooks/
│   ├── usePageGroups.ts (~150줄)
│   ├── useCanvasInteraction.ts (~150줄)
│   └── useKeyboardShortcuts.ts (~100줄)
└── types.ts (~50줄)

pages/
└── PageViewer.tsx (~200줄) ← 조합만
```

### 203-C-2: IntegratedProblemBankPage.tsx 분리 (1.5시간)

**현재**: 1,493줄

**분리 후**:
```
features/problemBank/
├── components/
│   ├── ProblemList.tsx (~200줄)
│   ├── FilterPanel.tsx (~150줄)
│   ├── StatsPanel.tsx (~100줄)
│   └── ActionBar.tsx (~100줄)
├── hooks/
│   ├── useProblemFilters.ts (~100줄)
│   └── useProblemActions.ts (~150줄)
└── types.ts (~50줄)

pages/
└── IntegratedProblemBankPage.tsx (~200줄)
```

### 203-C-3: 기타 페이지 분리 (1시간)

- ExamEditorPage.tsx → features/exam/
- SolutionMatchingPage.tsx → features/matching/

---

## 실행 순서 (위험 최소화)

```
1. 203-A (API 분리) ← 가장 안전, 먼저 진행
   ↓ 테스트 확인
2. 203-B (폴더 생성) ← 파일 이동 없음, 안전
   ↓
3. 203-C-1 (PageViewer) ← 핵심 기능, 신중히
   ↓ 테스트 확인
4. 203-C-2 (ProblemBank) ← 독립적
   ↓ 테스트 확인
5. 203-C-3 (기타)
```

---

## 롤백 계획

각 단계 전:
1. git stash 또는 백업 생성
2. 변경 후 즉시 브라우저 테스트
3. 문제 시 즉시 롤백

---

*승인 후 실행: "203-A 진행해줘" (권장: 하나씩)*
