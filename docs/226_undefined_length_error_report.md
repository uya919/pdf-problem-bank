# TypeError: Cannot read properties of undefined (reading 'length') 에러 분석

**문서 번호**: 226
**작성일**: 2025-12-07
**에러 위치**: UnifiedWorkPage.tsx

---

## 1. 에러 정보

### 에러 메시지
```
TypeError: Cannot read properties of undefined (reading 'length')
```

### 컴포넌트 스택
```
at UnifiedWorkPage (http://localhost:5173/src/pages/UnifiedWorkPage.tsx?t=1765065416676:35:25)
at RenderedRoute ...
```

---

## 2. 분석 결과

### 2.1 `.length` 사용 위치 (UnifiedWorkPage.tsx)

| 라인 | 코드 | Null 체크 |
|------|------|-----------|
| 154 | `currentSession?.problems.length` | ⚠️ 부분적 |
| 155 | `currentSession?.links.length` | ⚠️ 부분적 |
| 195 | `unlinkedProblems && unlinkedProblems.length` | ✅ 있음 |
| 369 | `unlinkedProblems.length` | ❌ 없음 |
| 374 | `unlinkedProblems.length` | ❌ 없음 |
| 379 | `unlinkedProblems.length` | ❌ 없음 |
| 384 | `unlinkedProblems.length` | ❌ 없음 |
| **454** | `currentSession.problems.length` | ❌ **없음** |
| **519** | `currentSession.problems.length` | ❌ **없음** |
| 616 | `unlinkedProblems.length` | ❌ 없음 |

### 2.2 잠재적 원인

#### 원인 1: `currentSession.problems` undefined (가장 가능성 높음)

**상황**:
```typescript
// Line 412: currentSession이 존재해도 problems가 undefined일 수 있음
if (error || !currentSession) { ... }

// Line 454: problems 존재 여부 체크 없이 접근
{currentSession.problems.length}개 문제
```

**시나리오**:
1. 백엔드에서 `problems` 필드 없이 응답
2. 세션 로드 중 부분적인 상태
3. HMR 핫 리로드 시 상태 불일치

#### 원인 2: `useUnlinkedProblems()` 반환값 이상

**훅 구현**:
```typescript
export function useUnlinkedProblems() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    if (!problems || problems.length === 0) return EMPTY_PROBLEMS;
    // ...
  }, [problems, links]);
}
```

- `EMPTY_PROBLEMS`는 `[]`로 정의됨
- 정상적으로는 항상 배열 반환
- 하지만 초기 마운트 시점에 문제 발생 가능

#### 원인 3: 렌더링 타이밍 (Race Condition)

```
1. 컴포넌트 마운트
2. useWorkSessionStore 구독 시작
3. loadSession() 호출
4. 세션 로드 중 (isLoading=true)
5. 세션 로드 완료 → 상태 업데이트
6. 리렌더링 → problems 접근

문제 지점:
- 5번에서 6번 사이 타이밍에
- currentSession은 있지만 problems가 아직 없는 상태?
```

---

## 3. WorkSession 타입 확인

### client.ts 정의
```typescript
export interface WorkSession {
  sessionId: string;
  name: string;
  problemDocumentId: string;
  problems: ProblemReference[];  // required
  links: ProblemSolutionLink[];  // required
  // ...
}
```

- `problems`와 `links`는 필수 필드로 정의됨
- 하지만 런타임에서 undefined 발생 → API 응답 불일치?

---

## 4. 수정 방안

### Option A: 방어적 코딩 (권장)

**UnifiedWorkPage.tsx 수정**:

```typescript
// Line 454 수정
{(currentSession.problems?.length ?? 0)}개 문제

// Line 519 수정
문제 ({currentSession.problems?.length ?? 0})
```

또는 조기 반환 조건 강화:

```typescript
// Line 412 수정
if (error || !currentSession || !currentSession.problems) {
  return <ErrorPage />;
}
```

### Option B: unlinkedProblems 체크 추가

```typescript
// Line 369, 374, 379, 384 영역
if (unlinkedProblems && unlinkedProblems.length > 0) {
  // ...
}
```

### Option C: 타입 가드 함수

```typescript
function isValidSession(session: WorkSession | null): session is WorkSession {
  return session !== null &&
         Array.isArray(session.problems) &&
         Array.isArray(session.links);
}

// 사용
if (!isValidSession(currentSession)) {
  return <ErrorPage />;
}
```

---

## 5. 권장 수정 우선순위

| 우선순위 | 위치 | 수정 | 이유 |
|---------|------|------|------|
| 1 | Line 412 | 조건 강화 | 근본 원인 차단 |
| 2 | Line 454, 519 | Optional chaining | 안전한 접근 |
| 3 | unlinkedProblems 사용처 | 체크 추가 | 방어적 코딩 |

---

## 6. 구현 코드

### Phase 56-S: 방어적 코딩 추가

```typescript
// UnifiedWorkPage.tsx

// 1. 조기 반환 조건 강화 (Line 412)
if (error || !currentSession || !currentSession.problems || !currentSession.links) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center max-w-md">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-grey-900 mb-2">
          세션을 찾을 수 없습니다
        </h2>
        <p className="text-grey-600 mb-6">{error || '세션 데이터가 유효하지 않습니다'}</p>
        <Button variant="solid" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}

// 2. 안전한 접근 (Line 454)
{currentSession.problems.length}개 문제  // 이제 안전 (위에서 체크함)
```

---

## 7. 다음 단계

**수정 요청**: `Phase 56-S 진행해줘`

---

*작성: Claude Code*
