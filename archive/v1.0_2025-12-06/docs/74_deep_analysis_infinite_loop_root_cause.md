# workSessionStore 무한 루프 - 심층 근본 원인 분석

**작성일**: 2025-12-03
**심각도**: Critical (앱 완전 크래시)
**상태**: 근본 원인 분석 완료

---

## 1. 문제 요약

### 현상
- `UnifiedWorkPage` 진입 시 **무한 루프**로 앱 크래시
- `Maximum update depth exceeded` 에러 발생
- **이미 `shallow` 비교가 적용되어 있음에도** 문제 지속

### 핵심 에러 로그
```
[Phase 32] Session created: ws-1764759493630-2a3a4dc5
The result of getSnapshot should be cached to avoid an infinite loop  ← 핵심!
[Phase 33] Tab state reset
Error: Maximum update depth exceeded...
```

### 환경
- **Zustand**: 5.0.9
- **React**: 18.x (Concurrent Rendering + StrictMode)
- **문제 컴포넌트**: `UnifiedWorkPage`

---

## 2. 근본 원인 심층 분석

### 2.1 왜 `shallow` 비교가 충분하지 않은가?

#### 현재 코드 (수정된 버전임에도 문제)
```typescript
export function useUnlinkedProblems() {
  return useWorkSessionStore(
    (state) => state.getUnlinkedProblems(),  // ← 여기가 문제
    shallow
  );
}
```

#### React 18의 `useSyncExternalStore` 동작 원리

React 18에서 Zustand는 내부적으로 `useSyncExternalStore`를 사용합니다:

```
┌──────────────────────────────────────────────────────────────────┐
│  useSyncExternalStore의 getSnapshot 검증                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 첫 번째 getSnapshot() 호출 → [obj1, obj2] (새 배열)          │
│                                                                  │
│  2. 바로 다시 getSnapshot() 호출 (검증용)                        │
│     → [obj1, obj2] (또 다른 새 배열!)                            │
│                                                                  │
│  3. Object.is(첫번째, 두번째) → false (다른 참조!)               │
│                                                                  │
│  4. React 경고: "getSnapshot should be cached"                  │
│                                                                  │
│  5. 컴포넌트 리렌더링 트리거                                     │
│                                                                  │
│  6. 다시 1번으로 → 무한 루프!                                   │
└──────────────────────────────────────────────────────────────────┘
```

#### 핵심 문제: `shallow`는 **비교 함수**일 뿐

```typescript
// shallow는 "다음 렌더링 때 값이 같으면 리렌더링하지 않겠다"
// 하지만 React의 getSnapshot 검증은 다른 메커니즘!

// React의 검증 (react-dom_client.js:5734)
nextSnapshot = getSnapshot();
cachedSnapshot = getSnapshot();  // 바로 두 번째 호출!
if (!Object.is(nextSnapshot, cachedSnapshot)) {
  console.error("The result of getSnapshot should be cached...");
}
```

**결론**: `shallow`는 Zustand의 리렌더링 최적화에 사용되지만,
React의 `useSyncExternalStore` 내부 검증은 **`Object.is` (===)** 비교를 사용합니다.

### 2.2 getter 메서드가 근본 원인

```typescript
// workSessionStore.ts:337-342
getUnlinkedProblems: () => {
  const { currentSession } = get();
  if (!currentSession) return [];  // 매번 새 빈 배열 []
  const linkedIds = new Set(...);
  return currentSession.problems.filter(...);  // 매번 새 배열
},
```

`filter()`, `map()`, `[]`, `{}` 등은 **호출될 때마다 새 참조**를 생성합니다.
React의 `useSyncExternalStore`가 검증을 위해 `getSnapshot`을 두 번 호출하면,
두 결과가 다른 참조이므로 경고가 발생하고 무한 루프에 진입합니다.

### 2.3 타이밍 문제 (Race Condition)

에러 로그 순서를 분석하면:

```
1. Session created (169줄) → 세션 생성, 상태 업데이트
2. getSnapshot 경고        → React가 불일치 감지
3. Tab state reset (436줄) → cleanup 실행 (왜 여기서?)
4. Maximum update depth    → 무한 루프 감지
```

**StrictMode 영향**: React 18 StrictMode는 effects를 두 번 실행합니다.
이로 인해 `resetTabState()`가 예상치 못한 타이밍에 호출될 수 있습니다.

---

## 3. 영향받는 코드 전체 목록

### 3.1 직접적인 문제 코드

| 함수 | 위치 | 문제점 |
|------|------|--------|
| `useUnlinkedProblems()` | 455-460줄 | getter에서 `filter()` 호출 → 새 배열 |
| `useSessionProgress()` | 448-453줄 | getter에서 객체 리터럴 반환 → 새 객체 |

### 3.2 문제의 getter 메서드

| 메서드 | 위치 | 문제점 |
|--------|------|--------|
| `getUnlinkedProblems()` | 337-342줄 | `filter()` → 매번 새 배열 |
| `getProgress()` | 345-352줄 | `{ linked, total, percent }` → 매번 새 객체 |

### 3.3 잠재적 문제 코드

```typescript
// useTabState()도 잠재적 문제 있음 (463-482줄)
// 여러 상태를 개별 구독하지만, 반환 객체가 매번 새로 생성됨
return {
  activeTab,
  problemPage,
  // ...
  currentPage: activeTab === 'problem' ? problemPage : solutionPage,  // ← 파생값
  // ...
};
```

---

## 4. 해결 방안 비교

### 방안 A: 원시 상태 직접 구독 + useMemo (권장)

```typescript
import { useMemo } from 'react';

export function useUnlinkedProblems() {
  // 원시 상태 직접 구독 (참조 안정성 보장)
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  // useMemo로 파생 상태 계산 (불필요한 재계산 방지)
  return useMemo(() => {
    if (!problems) return EMPTY_ARRAY;  // 상수 참조
    const linkedIds = new Set((links || []).map((l) => l.problemGroupId));
    return problems.filter((p) => !linkedIds.has(p.groupId));
  }, [problems, links]);
}

export function useSessionProgress() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    const total = problems?.length ?? 0;
    const linked = links?.length ?? 0;
    const percent = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { linked, total, percent };
  }, [problems, links]);
}

// 상수 참조 (빈 배열용)
const EMPTY_ARRAY: ProblemReference[] = [];
```

**장점**:
- React의 `useSyncExternalStore` 검증 통과 (원시 상태는 참조 안정성 있음)
- `useMemo`가 불필요한 재계산 방지
- 코드 의도가 명확

**단점**:
- 약간의 코드 증가

### 방안 B: Zustand `subscribeWithSelector` 미들웨어

```typescript
import { subscribeWithSelector } from 'zustand/middleware';

const useWorkSessionStore = create<WorkSessionStore>()(
  subscribeWithSelector((set, get) => ({
    // ...
  }))
);
```

**장점**: 선택적 구독 최적화
**단점**: 근본적인 getSnapshot 문제는 해결 안 됨

### 방안 C: 스토어에 파생 상태 캐싱

```typescript
interface WorkSessionState {
  // 캐시된 파생 상태
  _cachedUnlinkedProblems: ProblemReference[];
  _cachedProgress: { linked: number; total: number; percent: number };

  // 캐시 업데이트 메서드
  _invalidateCache: () => void;
}

// 상태 변경 시 캐시도 함께 업데이트
set((state) => ({
  currentSession: updated,
  _cachedUnlinkedProblems: computeUnlinkedProblems(updated),
  _cachedProgress: computeProgress(updated),
}));
```

**장점**: 가장 효율적, getter에서 캐시 반환
**단점**: 상태 구조 복잡, 캐시 무효화 로직 필요

### 방안 비교표

| 방안 | 복잡도 | 안정성 | 성능 | 권장 |
|------|--------|--------|------|------|
| A: useMemo | 낮음 | 높음 | 좋음 | ✅ |
| B: subscribeWithSelector | 중간 | 중간 | 좋음 | |
| C: 캐시 저장 | 높음 | 높음 | 최고 | 대규모 시 |

---

## 5. 권장 해결 방안: 방안 A 상세

### 5.1 수정 파일
`frontend/src/stores/workSessionStore.ts`

### 5.2 수정 내용

```typescript
// === 파일 상단에 import 추가 ===
import { useMemo } from 'react';

// === 상수 정의 (빈 배열/객체 참조 안정성) ===
const EMPTY_PROBLEMS: ProblemReference[] = [];
const EMPTY_PROGRESS = { linked: 0, total: 0, percent: 0 } as const;

// === useSessionProgress 수정 (448-453줄 대체) ===
export function useSessionProgress() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    const total = problems?.length ?? 0;
    const linked = links?.length ?? 0;
    if (total === 0) return EMPTY_PROGRESS;
    const percent = Math.round((linked / total) * 100);
    return { linked, total, percent };
  }, [problems, links]);
}

// === useUnlinkedProblems 수정 (455-460줄 대체) ===
export function useUnlinkedProblems() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    if (!problems || problems.length === 0) return EMPTY_PROBLEMS;
    const linkedIds = new Set((links || []).map((l) => l.problemGroupId));
    return problems.filter((p) => !linkedIds.has(p.groupId));
  }, [problems, links]);
}

// === useTabState 수정 (463-482줄 대체) ===
export function useTabState() {
  const activeTab = useWorkSessionStore((state) => state.activeTab);
  const problemPage = useWorkSessionStore((state) => state.problemPage);
  const solutionPage = useWorkSessionStore((state) => state.solutionPage);
  const selectedProblemId = useWorkSessionStore((state) => state.selectedProblemId);
  const setActiveTab = useWorkSessionStore((state) => state.setActiveTab);
  const setCurrentPage = useWorkSessionStore((state) => state.setCurrentPage);
  const selectProblem = useWorkSessionStore((state) => state.selectProblem);

  // useMemo로 파생 상태 안정화
  return useMemo(() => ({
    activeTab,
    problemPage,
    solutionPage,
    selectedProblemId,
    currentPage: activeTab === 'problem' ? problemPage : solutionPage,
    setActiveTab,
    setCurrentPage,
    selectProblem,
  }), [activeTab, problemPage, solutionPage, selectedProblemId, setActiveTab, setCurrentPage, selectProblem]);
}
```

### 5.3 UnifiedWorkPage useEffect 수정

`resetTabState`가 cleanup에서 호출될 때 불필요한 타이밍 문제가 발생할 수 있습니다:

```typescript
// === UnifiedWorkPage.tsx useEffect 수정 ===
useEffect(() => {
  if (sessionId && !currentSession) {
    loadSession(sessionId);
  }
}, [sessionId, currentSession, loadSession]);

// cleanup은 별도 effect로 분리
useEffect(() => {
  return () => {
    resetTabState();
  };
}, [resetTabState]);
```

**또는 더 안전한 방식**:

```typescript
useEffect(() => {
  if (sessionId && !currentSession) {
    loadSession(sessionId);
  }

  // sessionId가 변경될 때만 리셋
  return () => {
    // 다른 세션으로 이동 시에만 리셋
    // (같은 세션 내 리렌더링에서는 리셋하지 않음)
  };
}, [sessionId]);  // currentSession, loadSession 제거
```

---

## 6. React 18 + Zustand 5 베스트 프랙티스

### 6.1 절대 하지 말 것

```typescript
// ❌ getter 메서드를 selector에서 호출
useWorkSessionStore((state) => state.getSomeComputed());

// ❌ selector에서 새 객체/배열 생성
useWorkSessionStore((state) => ({
  a: state.a,
  b: state.b,
}));

// ❌ selector에서 filter/map 사용
useWorkSessionStore((state) => state.items.filter(x => x.active));
```

### 6.2 올바른 패턴

```typescript
// ✅ 원시 상태 직접 구독
const a = useWorkSessionStore((state) => state.a);
const b = useWorkSessionStore((state) => state.b);

// ✅ 파생 상태는 useMemo로 계산
const computed = useMemo(() => {
  return items.filter(x => x.active);
}, [items]);

// ✅ 여러 원시 상태를 한번에 구독하려면 shallow 사용
const { a, b, c } = useWorkSessionStore(
  (state) => ({ a: state.a, b: state.b, c: state.c }),
  shallow
);
```

---

## 7. 테스트 계획

### 7.1 수정 후 확인 사항

1. **무한 루프 없음**: 콘솔에 `Maximum update depth exceeded` 없음
2. **getSnapshot 경고 없음**: `The result of getSnapshot should be cached` 없음
3. **정상 동작**:
   - 세션 생성 → 작업 페이지 진입 정상
   - 문제/해설 탭 전환 정상
   - 미연결 문제 표시 정상
   - 진행률 표시 정상

### 7.2 성능 확인

- React DevTools Profiler로 불필요한 리렌더링 확인
- 메모리 누수 없음 확인

---

## 8. 결론

### 근본 원인
React 18의 `useSyncExternalStore`는 `getSnapshot`이 **참조적으로 동일한 값**을 반환해야 합니다.
Zustand의 `shallow` 비교 함수는 이 요구사항을 충족시키지 못합니다.

### 해결책
**getter 메서드를 selector에서 호출하지 말고**,
원시 상태를 직접 구독한 후 `useMemo`로 파생 상태를 계산합니다.

### 교훈
1. Zustand + React 18에서 파생 상태는 스토어 외부에서 계산
2. `shallow`는 리렌더링 최적화용이지, getSnapshot 안정성 보장 아님
3. StrictMode의 이중 실행에 주의

---

*예상 수정 시간: 15분*
*우선순위: Critical - 즉시 수정 필요*
