# Phase 22-G 듀얼 윈도우 네비게이션 에러 리포트

## 📋 에러 요약

| 항목 | 내용 |
|------|------|
| **발생 시점** | 2025-12-02, Phase 22-G 구현 직후 |
| **증상** | "듀얼 윈도우로 매칭 시작" 클릭 시 RegistrationPage로 리다이렉트 |
| **심각도** | 🔴 Critical - 핵심 기능 완전 불능 |
| **근본 원인** | `/viewer/:documentId` 라우트 미존재 |
| **영향 범위** | 모든 듀얼 윈도우 매칭 기능 |

---

## 🔍 상세 분석

### 1. 사용자 경험 흐름

```
[정상 기대 흐름]
1. 문제 PDF와 해설 PDF 선택/업로드
2. "듀얼 윈도우로 매칭 시작" 클릭
3. 새 창: 해설 뷰어 열림
4. 현재 창: 문제 뷰어로 전환
5. 두 창에서 동시에 라벨링 작업

[실제 발생 흐름]
1. 문제 PDF와 해설 PDF 선택/업로드
2. "듀얼 윈도우로 매칭 시작" 클릭
3. 새 창: 열리지만 RegistrationPage로 리다이렉트
4. 현재 창: RegistrationPage로 리다이렉트
5. ❌ 매칭 작업 불가
```

### 2. 코드 흐름 추적

#### 2.1 트리거 포인트: DualUploadCard.tsx

```typescript
// frontend/src/components/matching/DualUploadCard.tsx:289-306
<Button
  onClick={launchDualWindows}  // ← 클릭 시 호출
  disabled={!canStartMatching}
  ...
>
  듀얼 윈도우로 매칭 시작
</Button>
```

#### 2.2 핵심 로직: useDualWindowLauncher.ts

```typescript
// frontend/src/hooks/useDualWindowLauncher.ts

export function useDualWindowLauncher({
  problemDocId,
  solutionDocId,
  onPopupBlocked,
}: UseDualWindowLauncherOptions) {

  const launchDualWindows = useCallback(async () => {
    // 1단계: 세션 생성 API 호출
    const session = await api.createMatchingSession({
      problem_document_id: problemDocId,
      solution_document_id: solutionDocId,
    });

    // 2단계: URL 생성 ⚠️ 문제 발생 지점
    const baseUrl = window.location.origin;

    // ❌ 존재하지 않는 라우트 사용
    const problemUrl = `${baseUrl}/viewer/${encodeURIComponent(problemDocId)}?session=${session.sessionId}&role=problem`;
    const solutionUrl = `${baseUrl}/viewer/${encodeURIComponent(solutionDocId)}?session=${session.sessionId}&role=solution`;

    // 3단계: 새 창 열기 (해설)
    const solutionWindow = window.open(solutionUrl, '_blank');

    // 4단계: 현재 창 전환 (문제)
    window.location.href = problemUrl;  // ← 여기서 리다이렉트 발생
  }, [problemDocId, solutionDocId]);
}
```

#### 2.3 라우트 설정: App.tsx

```typescript
// frontend/src/App.tsx

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<RegistrationPage />} />

        {/* 라벨링 페이지 - 기존 단일 문서용 */}
        <Route path="labeling/:documentId" element={<LabelingPage />} />

        {/* ❌ /viewer 라우트 없음! */}

        {/* Catch-all: 모든 미정의 경로 → 메인으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. 에러 발생 메커니즘

```
┌─────────────────────────────────────────────────────────────┐
│                    에러 발생 시퀀스                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Button Click]                                             │
│       │                                                     │
│       ▼                                                     │
│  launchDualWindows() 호출                                   │
│       │                                                     │
│       ▼                                                     │
│  api.createMatchingSession() - 백엔드 세션 생성             │
│       │                                                     │
│       ▼                                                     │
│  URL 생성: /viewer/doc123?session=xxx&role=problem          │
│       │                                                     │
│       ├──────────────────────────────────────┐              │
│       │                                      │              │
│       ▼                                      ▼              │
│  window.open(solutionUrl)           window.location.href    │
│  새 창 열기                          현재 창 이동           │
│       │                                      │              │
│       ▼                                      ▼              │
│  React Router 매칭 시도              React Router 매칭 시도 │
│       │                                      │              │
│       ▼                                      ▼              │
│  "/" - NO                            "/" - NO               │
│  "/labeling/:id" - NO                "/labeling/:id" - NO   │
│  "/viewer/:id" - ❌ 없음!            "/viewer/:id" - ❌ 없음!│
│  "*" - ✓ 매칭                        "*" - ✓ 매칭           │
│       │                                      │              │
│       ▼                                      ▼              │
│  Navigate to="/"                     Navigate to="/"        │
│       │                                      │              │
│       ▼                                      ▼              │
│  RegistrationPage 렌더링             RegistrationPage 렌더링│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 영향 분석

### 1. 기능적 영향

| 기능 | 상태 | 설명 |
|------|------|------|
| 듀얼 윈도우 매칭 | ❌ 완전 불능 | 핵심 기능 사용 불가 |
| 세션 기반 동기화 | ⚠️ 고아 세션 생성 | 세션은 생성되나 사용 불가 |
| 문제-해설 연결 | ❌ 불가 | 두 문서 동시 작업 불가 |

### 2. 데이터 영향

```
[백엔드 상태]
- 매칭 세션이 생성됨 (api.createMatchingSession 호출됨)
- 세션 데이터가 orphan 상태로 남음
- 정리되지 않은 세션 누적 가능

[프론트엔드 상태]
- 라우팅 실패로 모든 상태 초기화
- 사용자의 선택/업로드 정보 유실
```

### 3. 사용자 영향

- 핵심 워크플로우 완전 차단
- 반복적인 실패 경험으로 신뢰도 저하
- 문제-해설 매칭 작업을 수동으로 해야 함

---

## 🔬 근본 원인 (Root Cause)

### 원인 1: 라우트 미구현

**문제**: `useDualWindowLauncher.ts`가 `/viewer/:documentId` 경로를 사용하지만, `App.tsx`에 해당 라우트가 정의되어 있지 않음.

**코드 증거**:
```typescript
// useDualWindowLauncher.ts - 사용하는 경로
const problemUrl = `${baseUrl}/viewer/${encodeURIComponent(problemDocId)}...`;

// App.tsx - 정의된 라우트
<Route path="labeling/:documentId" element={<LabelingPage />} />
// "/viewer" 라우트 없음!
```

### 원인 2: 설계-구현 불일치

Phase 22-F에서 듀얼 윈도우 기능을 구현할 때:
- **설계 의도**: 별도의 Viewer 컴포넌트/페이지 생성
- **실제 구현**: URL 생성 로직만 작성, 라우트/페이지 미구현

### 원인 3: 통합 테스트 부재

- 개별 컴포넌트(DualUploadCard, useDualWindowLauncher)는 정상
- 전체 흐름(라우팅 포함) 테스트 누락
- TypeScript 빌드 성공 ≠ 런타임 정상

---

## 🛠️ 해결 방안

### 방안 A: 새 ViewerPage 컴포넌트 생성 (권장)

```typescript
// 1. frontend/src/pages/ViewerPage.tsx 생성
function ViewerPage() {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const role = searchParams.get('role') as 'problem' | 'solution';

  // 세션 정보와 함께 LabelingPage 기능 + 동기화 기능
  return <DualViewerLayout documentId={documentId} sessionId={sessionId} role={role} />;
}

// 2. App.tsx에 라우트 추가
<Route path="viewer/:documentId" element={<ViewerPage />} />
```

**장점**:
- 설계 의도에 맞는 구현
- 듀얼 윈도우 전용 UI 가능
- 역할(문제/해설) 표시 가능
- 세션 기반 동기화 구현 가능

**단점**:
- 새 컴포넌트 개발 필요
- 개발 시간 더 소요

### 방안 B: 기존 LabelingPage 재사용 (빠른 수정)

```typescript
// useDualWindowLauncher.ts 수정
// Before
const problemUrl = `${baseUrl}/viewer/${encodeURIComponent(problemDocId)}...`;

// After
const problemUrl = `${baseUrl}/labeling/${encodeURIComponent(problemDocId)}?session=${session.sessionId}&role=problem`;
```

**장점**:
- 최소한의 코드 변경
- 즉시 작동

**단점**:
- 듀얼 윈도우 전용 기능 제한
- 역할 표시 UI 별도 구현 필요
- 기존 LabelingPage 수정 필요

### 방안 C: 하이브리드 접근

1. **즉시**: 방안 B로 빠른 수정
2. **이후**: 방안 A로 전용 ViewerPage 구현

---

## 📋 수정 계획

### 권장 수정 순서 (방안 A)

```
Phase 22-H: 듀얼 윈도우 뷰어 구현

H-1: ViewerPage 컴포넌트 생성
     - 파일: frontend/src/pages/ViewerPage.tsx
     - 세션 ID, 역할 파라미터 처리
     - 기본 뷰어 레이아웃

H-2: App.tsx 라우트 추가
     - /viewer/:documentId 라우트 등록

H-3: 역할 표시 UI
     - 상단에 "문제 PDF" / "해설 PDF" 배지
     - 세션 정보 표시

H-4: LabelingPage 기능 통합
     - 기존 라벨링 기능 재사용
     - 또는 공통 컴포넌트 추출

H-5: 통합 테스트
     - 전체 플로우 검증
```

---

## 📌 교훈 및 재발 방지

### 1. 체크리스트 추가

```markdown
[ ] 새 URL 패턴 사용 시 App.tsx 라우트 확인
[ ] window.location.href 사용 시 라우트 존재 확인
[ ] 새 페이지 참조 시 해당 컴포넌트 존재 확인
```

### 2. 통합 테스트 필수화

- 개별 컴포넌트 테스트 후 반드시 전체 흐름 테스트
- 라우팅을 포함한 E2E 시나리오 검증

### 3. URL 패턴 중앙화

```typescript
// frontend/src/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  LABELING: (docId: string) => `/labeling/${docId}`,
  VIEWER: (docId: string) => `/viewer/${docId}`,  // 추가
};

// 사용
import { ROUTES } from '@/constants/routes';
const url = ROUTES.VIEWER(problemDocId);
```

---

## 🎯 결론

**근본 원인**: `useDualWindowLauncher.ts`가 `/viewer/:documentId` 경로로 네비게이션하지만, `App.tsx`에 해당 라우트가 정의되어 있지 않음. React Router의 catch-all 규칙(`path="*"`)에 의해 모든 `/viewer/*` 요청이 `/`로 리다이렉트됨.

**권장 해결책**: ViewerPage 컴포넌트와 `/viewer/:documentId` 라우트를 새로 생성 (Phase 22-H)

**예상 작업량**: 중간 규모 (새 컴포넌트 1개 + 라우트 1개 + 통합 작업)

---

*작성: Claude Code (Opus)*
*작성일: 2025-12-02*
