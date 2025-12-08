# Phase 33-G: 무한 루프 버그 수정 계획

**작성일**: 2025-12-03
**근거 문서**: [74_deep_analysis_infinite_loop_root_cause.md](74_deep_analysis_infinite_loop_root_cause.md)
**목표**: React 18 + Zustand 5 호환성 문제 해결

---

## 1. 개요

### 문제
- `UnifiedWorkPage` 진입 시 무한 루프로 앱 크래시
- `shallow` 비교가 적용되어 있음에도 문제 지속

### 근본 원인
- Zustand의 getter 메서드가 매번 새 참조 반환
- React 18의 `useSyncExternalStore`가 참조 동일성 요구

### 해결 전략
- getter 메서드 호출 대신 원시 상태 직접 구독
- `useMemo`로 파생 상태 계산하여 참조 안정성 확보

---

## 2. 단계별 실행 계획

### Step 1: 상수 및 타입 정의
**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
// 파일 상단에 추가
import { useMemo } from 'react';

// 상수 정의 (빈 배열/객체의 참조 안정성)
const EMPTY_PROBLEMS: ProblemReference[] = [];
const EMPTY_PROGRESS = { linked: 0, total: 0, percent: 0 } as const;
```

**목적**: 빈 배열/객체가 매번 새로 생성되는 것을 방지

---

### Step 2: useSessionProgress 수정
**위치**: 448-453줄

**현재 코드** (문제):
```typescript
export function useSessionProgress() {
  return useWorkSessionStore(
    (state) => state.getProgress(),
    shallow
  );
}
```

**수정 코드**:
```typescript
export function useSessionProgress() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    const total = problems?.length ?? 0;
    const linked = links?.length ?? 0;
    if (total === 0 && linked === 0) return EMPTY_PROGRESS;
    const percent = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { linked, total, percent };
  }, [problems, links]);
}
```

**변경 사항**:
- [x] getter 호출 제거
- [x] 원시 상태 직접 구독
- [x] useMemo로 파생 상태 계산
- [x] 빈 상태에서 상수 반환

---

### Step 3: useUnlinkedProblems 수정
**위치**: 455-460줄

**현재 코드** (문제):
```typescript
export function useUnlinkedProblems() {
  return useWorkSessionStore(
    (state) => state.getUnlinkedProblems(),
    shallow
  );
}
```

**수정 코드**:
```typescript
export function useUnlinkedProblems() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems);
  const links = useWorkSessionStore((state) => state.currentSession?.links);

  return useMemo(() => {
    if (!problems || problems.length === 0) return EMPTY_PROBLEMS;
    const linkedIds = new Set((links ?? []).map((l) => l.problemGroupId));
    return problems.filter((p) => !linkedIds.has(p.groupId));
  }, [problems, links]);
}
```

**변경 사항**:
- [x] getter 호출 제거
- [x] 원시 상태 직접 구독
- [x] useMemo로 필터링 결과 캐시
- [x] 빈 상태에서 상수 반환

---

### Step 4: useTabState 수정
**위치**: 463-482줄

**현재 코드** (잠재적 문제):
```typescript
export function useTabState() {
  const activeTab = useWorkSessionStore((state) => state.activeTab);
  // ... 개별 구독 ...

  return {
    activeTab,
    // ... (매번 새 객체 생성)
    currentPage: activeTab === 'problem' ? problemPage : solutionPage,
  };
}
```

**수정 코드**:
```typescript
export function useTabState() {
  const activeTab = useWorkSessionStore((state) => state.activeTab);
  const problemPage = useWorkSessionStore((state) => state.problemPage);
  const solutionPage = useWorkSessionStore((state) => state.solutionPage);
  const selectedProblemId = useWorkSessionStore((state) => state.selectedProblemId);
  const setActiveTab = useWorkSessionStore((state) => state.setActiveTab);
  const setCurrentPage = useWorkSessionStore((state) => state.setCurrentPage);
  const selectProblem = useWorkSessionStore((state) => state.selectProblem);

  return useMemo(() => ({
    activeTab,
    problemPage,
    solutionPage,
    selectedProblemId,
    currentPage: activeTab === 'problem' ? problemPage : solutionPage,
    setActiveTab,
    setCurrentPage,
    selectProblem,
  }), [
    activeTab,
    problemPage,
    solutionPage,
    selectedProblemId,
    setActiveTab,
    setCurrentPage,
    selectProblem,
  ]);
}
```

**변경 사항**:
- [x] useMemo로 반환 객체 안정화
- [x] 파생 상태(currentPage)도 메모이제이션 내부에서 계산

---

### Step 5: UnifiedWorkPage useEffect 안정화
**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`
**위치**: 59-68줄

**현재 코드** (문제):
```typescript
useEffect(() => {
  if (sessionId && !currentSession) {
    loadSession(sessionId);
  }

  return () => {
    resetTabState();
  };
}, [sessionId, currentSession, loadSession, resetTabState]);
```

**문제점**:
- `currentSession`이 의존성에 있어서 세션 로드 후 effect 재실행
- cleanup의 `resetTabState`가 의존성에 있어서 불필요한 재실행 가능
- StrictMode에서 cleanup이 예상치 못한 타이밍에 실행

**수정 코드**:
```typescript
// 세션 로드 effect
useEffect(() => {
  if (sessionId) {
    loadSession(sessionId);
  }
}, [sessionId, loadSession]);

// cleanup effect (별도 분리)
useEffect(() => {
  // 컴포넌트 언마운트 시에만 리셋
  return () => {
    resetTabState();
  };
}, []);  // 빈 의존성 - 마운트/언마운트 시에만 실행
```

**변경 사항**:
- [x] 세션 로드와 cleanup을 분리
- [x] cleanup의 의존성 배열 비움 (언마운트 시에만 실행)
- [x] `currentSession` 조건 제거 (이미 로드된 세션이면 API가 캐시 반환)

---

### Step 6: shallow import 제거 (선택)
더 이상 사용하지 않으면 import 정리:

```typescript
// 변경 전
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

// 변경 후 (shallow 사용 없으면 제거)
import { create } from 'zustand';
// shallow import 제거
```

**참고**: 다른 곳에서 shallow를 사용한다면 유지

---

## 3. 수정 순서 및 체크리스트

```
[ ] Step 1: 상수 정의 추가
[ ] Step 2: useSessionProgress 수정
[ ] Step 3: useUnlinkedProblems 수정
[ ] Step 4: useTabState 수정
[ ] Step 5: UnifiedWorkPage useEffect 수정
[ ] Step 6: 불필요한 import 정리
[ ] Step 7: 테스트
```

---

## 4. 테스트 계획

### 4.1 필수 테스트
| 테스트 | 예상 결과 |
|--------|----------|
| 세션 생성 후 작업 페이지 진입 | 무한 루프 없이 정상 진입 |
| 콘솔 에러 확인 | "Maximum update depth exceeded" 없음 |
| getSnapshot 경고 확인 | "getSnapshot should be cached" 없음 |
| 탭 전환 (문제 ↔ 해설) | 정상 동작 |
| 미연결 문제 표시 | 정상 표시 |
| 진행률 표시 | 정상 표시 |

### 4.2 회귀 테스트
| 기능 | 확인 사항 |
|------|----------|
| 문제 그룹 생성 | 세션에 문제 추가 정상 |
| 문제-해설 연결 | 연결 생성/삭제 정상 |
| 페이지 네비게이션 | 페이지 이동 정상 |
| 키보드 단축키 | 1, 2, Tab, 화살표키 정상 |

### 4.3 성능 확인
- React DevTools Profiler로 리렌더링 확인
- 불필요한 리렌더링 없어야 함

---

## 5. 롤백 계획

문제 발생 시:
1. Git에서 이전 버전으로 복원
2. 또는 수정 사항 개별 되돌리기

---

## 6. 예상 소요 시간

| 단계 | 예상 시간 |
|------|----------|
| Step 1-4: 훅 수정 | 10분 |
| Step 5: useEffect 수정 | 5분 |
| Step 6: 정리 | 2분 |
| 테스트 | 10분 |
| **합계** | **약 30분** |

---

## 7. 향후 고려사항

### 7.1 추가 최적화 (선택)
- 대규모 데이터 시 스토어 내부 캐싱 검토
- `subscribeWithSelector` 미들웨어 도입 검토

### 7.2 코드 리뷰 포인트
- 다른 커스텀 훅에서 비슷한 패턴 있는지 확인
- getter 메서드를 selector에서 호출하는 곳 없는지 점검

---

*승인 후 "진행해줘"로 실행*
