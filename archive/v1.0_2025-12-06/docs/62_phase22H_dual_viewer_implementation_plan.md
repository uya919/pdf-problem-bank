# Phase 22-H: 듀얼 윈도우 뷰어 구현 계획

## 📋 개요

| 항목 | 내용 |
|------|------|
| **Phase** | 22-H |
| **목표** | `/viewer/:documentId` 라우트 및 ViewerPage 구현 |
| **선행 조건** | Phase 22-G 완료 (기존 문서 역할 지정) |
| **관련 에러** | docs/61_phase22G_dual_window_navigation_error_report.md |
| **예상 난이도** | 중간 |

---

## 🔍 현재 상태 분석

### 문제 상황

```
[useDualWindowLauncher.ts가 생성하는 URL]
/viewer/doc123?session=abc&role=problem
/viewer/doc456?session=abc&role=solution

[App.tsx에 정의된 라우트]
/                          → RegistrationPage
/labeling/:documentId      → LabelingPage
/bank                      → IntegratedProblemBankPage
/exam                      → ExamBuilderPage
/exam/:examId              → ExamEditorPage
/settings                  → SettingsPage
*                          → Navigate to "/"

❌ /viewer 라우트 없음!
```

### 기존 LabelingPage 구조

```typescript
// LabelingPage.tsx
function LabelingPage() {
  const { documentId } = useParams();  // ✓ documentId만 처리
  // ❌ session, role 파라미터 처리 없음

  return (
    <div>
      <header>헤더 (뒤로가기, 문서명, 단축키)</header>
      <main>
        <PageViewer documentId={...} totalPages={...} />
      </main>
    </div>
  );
}
```

**핵심 문제**: `LabelingPage`는 단일 문서 라벨링용으로 설계됨. 듀얼 윈도우 컨텍스트(세션, 역할)를 인식하지 못함.

---

## 🎯 설계 방향 결정

### 방안 비교

| 방안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 새 ViewerPage** | `/viewer` 전용 컴포넌트 생성 | 깔끔한 분리, 전용 UI | 새 컴포넌트 필요 |
| **B. LabelingPage 확장** | 기존 컴포넌트에 로직 추가 | 코드 재사용 | 복잡도 증가 |
| **C. 하이브리드** | ViewerPage + PageViewer 재사용 | 최적 균형 | 약간의 추가 작업 |

### ✅ 선택: 방안 C (하이브리드)

**이유**:
1. `PageViewer`는 이미 잘 동작하는 핵심 컴포넌트
2. 듀얼 윈도우 전용 UI (역할 배지, 세션 상태)는 분리가 적합
3. 향후 동기화 기능 추가 시 확장 용이

---

## 📐 아키텍처 설계

### 컴포넌트 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  Routes:                                                     │
│    /labeling/:documentId  →  LabelingPage (기존 유지)        │
│    /viewer/:documentId    →  ViewerPage (NEW)               │
└─────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      ViewerPage (NEW)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ViewerHeader                                            ││
│  │  - 역할 배지 (문제 PDF / 해설 PDF)                       ││
│  │  - 세션 상태 표시                                        ││
│  │  - 상대 창 연결 상태                                     ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ PageViewer (기존 컴포넌트 재사용)                        ││
│  │  - documentId, totalPages props                          ││
│  │  - 동일한 라벨링 기능                                    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ MatchingStatusBar (선택적)                               ││
│  │  - 매칭된 문제 수                                        ││
│  │  - 동기화 상태                                           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### URL 파라미터 구조

```
/viewer/:documentId?session=SESSION_ID&role=ROLE

- documentId: 문서 ID (path parameter)
- session: 매칭 세션 ID (query parameter)
- role: 'problem' | 'solution' (query parameter)
```

### 타입 정의 확장

```typescript
// types/matching.ts에 추가

/** 뷰어 페이지 파라미터 */
export interface ViewerParams {
  documentId: string;
}

/** 뷰어 쿼리 파라미터 */
export interface ViewerQueryParams {
  session?: string;
  role?: 'problem' | 'solution';
}

/** 뷰어 컨텍스트 */
export interface ViewerContext {
  documentId: string;
  sessionId: string | null;
  role: WindowRole | null;
  isDualMode: boolean;  // session && role이 모두 있으면 true
}
```

---

## 📋 구현 단계

### Phase 22-H-1: 기본 ViewerPage 생성

**목표**: 라우트 문제 해결, 기본 동작 확인

**파일**: `frontend/src/pages/ViewerPage.tsx`

```typescript
// ViewerPage.tsx 기본 구조
export function ViewerPage() {
  const { documentId } = useParams();
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session');
  const role = searchParams.get('role') as 'problem' | 'solution' | null;

  const isDualMode = !!(sessionId && role);

  // PageViewer 재사용
  return (
    <div className="h-full flex flex-col">
      <ViewerHeader
        documentId={documentId}
        role={role}
        sessionId={sessionId}
        isDualMode={isDualMode}
      />
      <main className="flex-1 overflow-auto p-6">
        <PageViewer documentId={documentId} totalPages={...} />
      </main>
    </div>
  );
}
```

**작업 항목**:
1. `ViewerPage.tsx` 파일 생성
2. URL 파라미터 파싱 로직
3. `useDocument` 훅으로 문서 정보 조회
4. 기본 레이아웃 구성

---

### Phase 22-H-2: App.tsx 라우트 추가

**목표**: `/viewer/:documentId` 라우트 등록

**파일**: `frontend/src/App.tsx`

```typescript
// App.tsx 수정
import { ViewerPage } from './pages/ViewerPage';

// Routes 내에 추가
<Route path="viewer/:documentId" element={<ViewerPage />} />
```

**작업 항목**:
1. ViewerPage import 추가
2. Route 정의 추가 (`/labeling` 아래에 배치)

**주의사항**:
- `MinimalLayout` 내부에 배치할지, 외부에 배치할지 결정 필요
- 듀얼 윈도우에서는 사이드바 불필요 → 별도 레이아웃 고려

---

### Phase 22-H-3: ViewerHeader 컴포넌트

**목표**: 역할 표시 및 세션 상태 UI

**파일**: `frontend/src/components/viewer/ViewerHeader.tsx`

```typescript
interface ViewerHeaderProps {
  documentId: string;
  documentName: string;
  totalPages: number;
  role: 'problem' | 'solution' | null;
  sessionId: string | null;
  isDualMode: boolean;
}

export function ViewerHeader({
  documentId,
  documentName,
  totalPages,
  role,
  sessionId,
  isDualMode,
}: ViewerHeaderProps) {
  return (
    <header className="flex-shrink-0 bg-white border-b border-grey-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 좌측: 역할 배지 + 문서명 */}
        <div className="flex items-center gap-4">
          {isDualMode && role && (
            <RoleBadge role={role} />
          )}
          <div>
            <h1 className="text-lg font-semibold text-grey-900">
              {documentName}
            </h1>
            <p className="text-sm text-grey-500">
              {totalPages}페이지 · {isDualMode ? '듀얼 매칭 모드' : '라벨링'}
            </p>
          </div>
        </div>

        {/* 우측: 세션 정보, 단축키 등 */}
        <div className="flex items-center gap-2">
          {isDualMode && sessionId && (
            <SessionStatus sessionId={sessionId} />
          )}
          {/* 단축키 버튼 */}
        </div>
      </div>
    </header>
  );
}
```

**작업 항목**:
1. `ViewerHeader.tsx` 파일 생성
2. `RoleBadge` 서브컴포넌트 (문제: 파랑, 해설: 보라)
3. `SessionStatus` 서브컴포넌트 (세션 ID 표시)
4. 스타일링 (토스 디자인 시스템 준수)

---

### Phase 22-H-4: 레이아웃 결정 및 적용

**목표**: 듀얼 윈도우에서 사이드바 없는 전체 화면 레이아웃

**두 가지 선택지**:

**A. MinimalLayout 외부 배치 (권장)**
```typescript
// App.tsx
<Routes>
  {/* 듀얼 뷰어 - 레이아웃 없음 */}
  <Route path="viewer/:documentId" element={<ViewerPage />} />

  {/* 기존 레이아웃 */}
  <Route path="/" element={<MinimalLayout />}>
    <Route index element={<RegistrationPage />} />
    <Route path="labeling/:documentId" element={<LabelingPage />} />
    ...
  </Route>
</Routes>
```

**B. 조건부 레이아웃**
```typescript
// ViewerPage 내에서 MinimalLayout 대신 직접 렌더링
```

**작업 항목**:
1. 라우트 구조 재배치
2. ViewerPage 전체 화면 레이아웃 적용
3. 사이드바 없이 독립적으로 동작 확인

---

### Phase 22-H-5: 통합 테스트 및 수정

**목표**: 전체 플로우 검증

**테스트 시나리오**:

```
[시나리오 1: 기본 듀얼 윈도우]
1. RegistrationPage에서 문제 PDF, 해설 PDF 선택
2. "듀얼 윈도우로 매칭 시작" 클릭
3. 두 개의 창이 열림 (문제/해설)
4. 각 창에 역할 배지 표시
5. PageViewer에서 라벨링 작업 가능

[시나리오 2: 팝업 차단]
1. 팝업 차단 시 안내 모달 표시
2. 단일 창 모드 안내

[시나리오 3: 직접 URL 접근]
1. /viewer/doc123?session=abc&role=problem 직접 접근
2. 정상적으로 뷰어 렌더링
3. 세션/역할 정보 없이 접근 시 일반 모드로 동작
```

**작업 항목**:
1. 전체 플로우 테스트
2. 발견된 버그 수정
3. 에지 케이스 처리
4. TypeScript 빌드 확인

---

### Phase 22-H-6: 문서화

**목표**: 구현 완료 문서화

**작업 항목**:
1. 완료 리포트 작성
2. CLAUDE.md 업데이트 (필요시)
3. 관련 문서 링크 정리

---

## 📁 파일 변경 목록

### 새로 생성

| 파일 | 설명 |
|------|------|
| `frontend/src/pages/ViewerPage.tsx` | 듀얼 뷰어 페이지 |
| `frontend/src/components/viewer/ViewerHeader.tsx` | 뷰어 헤더 (역할 배지, 세션 상태) |
| `frontend/src/components/viewer/index.ts` | 배럴 export |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.tsx` | `/viewer/:documentId` 라우트 추가 |
| `frontend/src/types/matching.ts` | ViewerParams, ViewerContext 타입 추가 |

### 변경 없음 (재사용)

| 파일 | 이유 |
|------|------|
| `frontend/src/pages/PageViewer.tsx` | 그대로 재사용 |
| `frontend/src/hooks/useDualWindowLauncher.ts` | URL 패턴 유지 |
| `frontend/src/components/matching/DualUploadCard.tsx` | 그대로 유지 |

---

## ⏱️ 구현 순서 요약

```
H-1: ViewerPage.tsx 기본 구조 생성
     ↓
H-2: App.tsx 라우트 추가
     ↓
     [중간 테스트: 라우팅 동작 확인]
     ↓
H-3: ViewerHeader 컴포넌트 구현
     ↓
H-4: 레이아웃 최적화 (사이드바 제거)
     ↓
H-5: 통합 테스트 및 버그 수정
     ↓
H-6: 문서화
```

---

## 🎨 UI 디자인 명세

### ViewerHeader 역할 배지

```
[문제 PDF 배지]
- 배경: bg-toss-blue
- 텍스트: white
- 아이콘: FileText
- 라벨: "문제 PDF"

[해설 PDF 배지]
- 배경: bg-purple-500
- 텍스트: white
- 아이콘: BookOpen
- 라벨: "해설 PDF"
```

### 전체 레이아웃

```
┌────────────────────────────────────────────┐
│ [배지] 문서명                    [단축키] │  ← ViewerHeader
│ 10페이지 · 듀얼 매칭 모드                  │
├────────────────────────────────────────────┤
│                                            │
│                                            │
│              PageViewer                    │  ← 기존 컴포넌트
│                                            │
│                                            │
└────────────────────────────────────────────┘
```

---

## ✅ 완료 기준

1. [ ] `/viewer/:documentId` URL로 접근 시 ViewerPage 렌더링
2. [ ] 쿼리 파라미터 (session, role) 정상 파싱
3. [ ] 역할 배지 정상 표시 (문제: 파랑, 해설: 보라)
4. [ ] PageViewer 라벨링 기능 정상 동작
5. [ ] 듀얼 윈도우 전체 플로우 동작 확인
6. [ ] TypeScript 빌드 성공
7. [ ] 사이드바 없는 전체 화면 레이아웃

---

## 🔮 향후 확장 (Phase 22-I 이후)

1. **창 간 동기화**: WebSocket을 통한 실시간 상태 공유
2. **매칭 UI**: 문제-해설 연결 인터페이스
3. **드래그 앤 드롭**: 문제 블록을 해설에 드래그하여 매칭

---

*작성: Claude Code (Opus)*
*작성일: 2025-12-02*
