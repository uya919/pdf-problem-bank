# Phase 33: 통합 캔버스 워크플로우 재설계

> **요청**: 문제와 해설을 처음부터 지정하고, 한 캔버스에서 탭으로 전환하며 작업
> **분석일**: 2025-12-03
> **상태**: 설계 제안

---

## 1. 현재 vs 요청 워크플로우 비교

### 현재 구현 (Phase 32)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Step 1        │ ──► │   Step 2        │ ──► │   Step 3        │
│  문제 라벨링     │     │  해설 문서 선택   │     │  매칭 작업       │
│                 │     │                 │     │                 │
│ [문제 캔버스]    │     │ [문서 목록]      │     │ [해설 캔버스]    │
│                 │     │                 │     │ + 문제 목록     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     별도 페이지             별도 페이지            별도 페이지
```

**문제점**:
- 3개의 분리된 페이지 간 이동 필요
- 문제 라벨링 시 해설을 볼 수 없음
- 매칭 시 문제 원본을 바로 볼 수 없음
- 컨텍스트 스위칭 비용 발생

### 요청된 워크플로우

```
┌──────────────────────────────────────────────────────────────────┐
│  [세션 이름]                              [진행률: 5/20]  [완료]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐ ┌──────────┐                                     │
│   │ 📄 문제  │ │ 📝 해설  │    ◄── 탭 전환                       │
│   └──────────┘ └──────────┘                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │                     현재 탭의 캔버스                        │ │
│  │                                                            │ │
│  │  [블록 선택] → [G키] → [그룹 생성]                          │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────┬─────────────┬─────────────────────────────────┐ │
│  │ ◄ prev     │  p.3 / 20   │                      next ►     │ │
│  └─────────────┴─────────────┴─────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [미연결 문제]  1번(p.1)  2번(p.1)  3번(p.2) ...                 │
└──────────────────────────────────────────────────────────────────┘
```

**장점**:
- 한 화면에서 모든 작업 완료
- 탭 전환으로 즉시 문맥 확인
- 문제 ↔ 해설 비교가 쉬움
- 더 직관적인 UX

---

## 2. 핵심 설계 원칙

### 2.1 시작 시 양쪽 문서 지정

```
┌─────────────────────────────────────────────────────────────────┐
│                      새 작업 세션 시작                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   📄 문제 문서                    📝 해설 문서                   │
│   ┌─────────────────┐            ┌─────────────────┐           │
│   │ math_bible.pdf  │            │ solutions.pdf   │           │
│   │ ● 선택됨         │            │ ● 선택됨         │           │
│   │                 │            │                 │           │
│   │ (또는 드래그)    │            │ (또는 드래그)    │           │
│   └─────────────────┘            └─────────────────┘           │
│                                                                 │
│                        [시작하기]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 탭 기반 캔버스

| 탭 | 역할 | 작업 |
|----|------|------|
| **문제 탭** | 문제 문서 표시 | 블록 선택 → 그룹 생성 → 문제 등록 |
| **해설 탭** | 해설 문서 표시 | 블록 선택 → 그룹 생성 → 문제에 연결 |

### 2.3 상태 표시 바

```
┌─────────────────────────────────────────────────────────────────┐
│ 미연결 문제:                                                     │
│                                                                 │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                   │
│  │ 1번 │  │ 2번 │  │ 3번 │  │ 4번 │  │ 5번 │  ...              │
│  │ p.1 │  │ p.1 │  │ p.2 │  │ p.2 │  │ p.3 │                   │
│  │ ⚪  │  │ ⚪  │  │ 🟢  │  │ ⚪  │  │ ⚪  │  ◄── 선택 상태     │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘                   │
│                     ▲                                           │
│                  현재 선택                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 상세 워크플로우

### 3.1 세션 생성

```
1. 사용자: "새 세션 시작" 클릭
2. 모달: 문제 문서 선택 (필수)
3. 모달: 해설 문서 선택 (필수)    ◄── 이 부분이 다름!
4. 시스템: 세션 생성 + 통합 캔버스로 이동
```

### 3.2 문제 라벨링 (문제 탭)

```
1. "문제" 탭 활성화 상태
2. 페이지 탐색 (← →)
3. 블록 선택 (클릭/드래그)
4. 그룹 생성 (G키)
5. 문제번호 입력 → 자동으로 "미연결 문제" 목록에 추가
6. 반복...
```

### 3.3 해설 연결 (해설 탭)

```
1. "미연결 문제" 목록에서 문제 선택 (예: "3번")
2. "해설" 탭으로 전환
3. 해당 문제의 해설이 있는 페이지로 이동
4. 해설 블록 선택 → G키로 그룹 생성
5. 자동으로 선택된 문제(3번)에 연결됨
6. "3번"이 "미연결 문제"에서 사라지고 "연결됨" 상태로 변경
7. 다음 미연결 문제 자동 선택
```

### 3.4 키보드 단축키

| 키 | 동작 |
|----|------|
| `Tab` 또는 `1`/`2` | 문제 탭 ↔ 해설 탭 전환 |
| `←` `→` | 이전/다음 페이지 |
| `↑` `↓` | 이전/다음 미연결 문제 선택 |
| `G` | 선택된 블록으로 그룹 생성 |
| `Escape` | 선택 해제 |
| `Enter` | 현재 문제에 해설 연결 확정 |

---

## 4. UI 컴포넌트 구조

```
UnifiedWorkSessionPage
├── Header
│   ├── BackButton (대시보드로)
│   ├── SessionName
│   ├── ProgressBar (5/20 연결됨)
│   └── CompleteButton
│
├── TabBar
│   ├── ProblemTab (📄 문제)
│   └── SolutionTab (📝 해설)
│
├── MainCanvas
│   ├── PageImage
│   ├── BlockOverlays
│   └── GroupHighlights
│
├── PageNavigation
│   └── (현재 페이지 / 전체 페이지)
│
└── BottomStatusBar
    ├── UnlinkedProblemList (스크롤 가능한 문제 칩들)
    └── CurrentSelectionInfo
```

---

## 5. 데이터 흐름

### 5.1 세션 상태

```typescript
interface UnifiedWorkSession {
  sessionId: string;
  name: string;

  // 양쪽 문서 (시작 시 모두 지정)
  problemDocument: {
    id: string;
    name: string;
    totalPages: number;
  };
  solutionDocument: {
    id: string;
    name: string;
    totalPages: number;
  };

  // 현재 UI 상태
  activeTab: 'problem' | 'solution';
  problemPageIndex: number;
  solutionPageIndex: number;
  selectedProblemId: string | null;

  // 문제 및 연결
  problems: ProblemReference[];
  links: ProblemSolutionLink[];

  // 메타
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'completed';
}
```

### 5.2 그룹 생성 시 자동 연결 로직

```typescript
// 해설 탭에서 그룹 생성 시
function handleSolutionGroupCreate(blockIds: number[]) {
  const selectedProblemId = session.selectedProblemId;

  if (!selectedProblemId) {
    showToast('먼저 연결할 문제를 선택하세요', 'warning');
    return;
  }

  // 1. 해설 그룹 생성
  const solutionGroup = createGroup(blockIds, solutionPageIndex);

  // 2. 자동 연결
  createLink({
    problemGroupId: selectedProblemId,
    solutionGroupId: solutionGroup.id,
    solutionDocumentId: solutionDocument.id,
    solutionPageIndex: solutionPageIndex,
  });

  // 3. 다음 미연결 문제 자동 선택
  selectNextUnlinkedProblem();

  showToast(`${problemNumber}번 해설 연결 완료!`, 'success');
}
```

---

## 6. 마이그레이션 전략

### 6.1 기존 Phase 32 코드 활용

| 기존 컴포넌트 | 재사용 | 변경 |
|--------------|--------|------|
| `WorkSessionDashboard` | ✅ | 세션 생성 모달 수정 |
| `WorkSessionLabelingPage` | ❌ | 통합 페이지로 대체 |
| `WorkSessionSetupPage` | ❌ | 제거 (시작 시 지정) |
| `WorkSessionMatchingPage` | 부분 | 로직 재사용, UI 변경 |
| `workSessionStore` | ✅ | 탭 상태 추가 |
| `PageCanvas` | ✅ | 그대로 사용 |
| `PageNavigation` | ✅ | 그대로 사용 |

### 6.2 새로운 컴포넌트

```
src/pages/
  UnifiedWorkSessionPage.tsx    ◄── 통합 페이지 (새로 생성)

src/components/
  DocumentTabBar.tsx            ◄── 탭 UI
  UnlinkedProblemBar.tsx        ◄── 하단 문제 목록
```

### 6.3 라우트 변경

```typescript
// Before (Phase 32)
<Route path="work/:sessionId/labeling" element={<WorkSessionLabelingPage />} />
<Route path="work/:sessionId/setup" element={<WorkSessionSetupPage />} />
<Route path="work/:sessionId/matching" element={<WorkSessionMatchingPage />} />

// After (Phase 33)
<Route path="work/:sessionId" element={<UnifiedWorkSessionPage />} />
```

---

## 7. 예상 구현 일정

| 단계 | 작업 | 복잡도 |
|------|------|--------|
| 1 | 세션 생성 모달 수정 (양쪽 문서 선택) | 낮음 |
| 2 | `UnifiedWorkSessionPage` 기본 레이아웃 | 중간 |
| 3 | `DocumentTabBar` 구현 | 낮음 |
| 4 | 탭 전환 + 페이지 상태 관리 | 중간 |
| 5 | `UnlinkedProblemBar` 구현 | 중간 |
| 6 | 해설 그룹 생성 시 자동 연결 | 낮음 |
| 7 | 키보드 단축키 통합 | 낮음 |
| 8 | 테스트 및 버그 수정 | 중간 |

---

## 8. 결론

### 요청된 워크플로우의 이점

1. **단일 화면**: 페이지 이동 없이 모든 작업 완료
2. **즉시 비교**: 탭 전환으로 문제 ↔ 해설 즉시 확인
3. **명확한 진행률**: 하단 바에서 미연결 문제 한눈에 파악
4. **효율적 키보드 워크플로우**: 탭 전환 + 페이지 이동 + 그룹 생성

### 권장 조치

**Phase 33으로 진행**하여:
1. 기존 3페이지 워크플로우를 1페이지 통합 캔버스로 대체
2. 세션 생성 시 양쪽 문서 동시 지정
3. 탭 기반 문서 전환 구현

---

*리포트 작성: Claude Code (Opus)*
*마지막 업데이트: 2025-12-03*
