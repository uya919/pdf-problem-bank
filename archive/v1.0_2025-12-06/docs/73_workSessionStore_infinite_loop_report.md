# workSessionStore 무한 루프 에러 리포트

**작성일**: 2025-12-03
**심각도**: Critical (앱 크래시)
**상태**: 분석 완료

---

## 1. 에러 요약

### 증상
- 파일 선택 후 작업 페이지 진입 시 **무한 루프 발생**
- `Maximum update depth exceeded` 에러
- 앱 완전 크래시

### 에러 메시지
```
workSessionStore.ts:452 The result of getSnapshot should be cached to avoid an infinite loop

Error: Maximum update depth exceeded. This can happen when a component
repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
```

### 에러 위치
```
useUnlinkedProblems @ workSessionStore.ts:452
UnifiedWorkPage @ UnifiedWorkPage.tsx:55
```

---

## 2. 근본 원인 분석

### 문제 코드

**위치**: `frontend/src/stores/workSessionStore.ts:451-453`

```typescript
// ❌ 문제: selector가 매번 새 배열을 반환
export function useUnlinkedProblems() {
  return useWorkSessionStore((state) => state.getUnlinkedProblems());
}
```

**`getUnlinkedProblems` 함수** (줄 336-341):
```typescript
getUnlinkedProblems: () => {
  const { currentSession } = get();
  if (!currentSession) return [];  // ← 매번 새 빈 배열!
  const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));
  return currentSession.problems.filter((p) => !linkedIds.has(p.groupId));  // ← 매번 새 배열!
},
```

### 원인 설명

```
┌─────────────────────────────────────────────────────────────┐
│ Zustand selector 동작 방식                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. useWorkSessionStore((state) => state.getUnlinkedProblems())
│                                          │
│ 2. getUnlinkedProblems() 호출 → 새 배열 반환 [...]         │
│                                          │
│ 3. Zustand: "이전 값과 다름!" (참조 비교 실패)              │
│                                          │
│ 4. 리렌더링 트리거                                          │
│                                          │
│ 5. 다시 1번으로 → 무한 루프!                               │
└─────────────────────────────────────────────────────────────┘
```

**핵심**: `filter()`, `map()`, `[]` 등은 **매번 새로운 배열 참조**를 생성합니다.
Zustand의 기본 비교는 `===` (참조 비교)이므로, 내용이 같아도 다른 것으로 인식합니다.

### 동일한 패턴의 다른 문제 코드

```typescript
// ❌ 마찬가지로 문제
export function useSessionProgress() {
  return useWorkSessionStore((state) => state.getProgress());
  // getProgress()도 매번 새 객체 반환: { linked, total, percent }
}
```

---

## 3. 해결 방안

### 방안 A: `shallow` 비교 사용 (권장)

```typescript
import { shallow } from 'zustand/shallow';

export function useUnlinkedProblems() {
  return useWorkSessionStore(
    (state) => state.getUnlinkedProblems(),
    shallow  // 얕은 비교 (배열 내용 비교)
  );
}

export function useSessionProgress() {
  return useWorkSessionStore(
    (state) => state.getProgress(),
    shallow
  );
}
```

**장점**: 최소한의 변경으로 해결
**단점**: 배열 내부 객체까지는 비교 안 함 (대부분 충분)

### 방안 B: 원시 상태 직접 구독 + useMemo

```typescript
export function useUnlinkedProblems() {
  const problems = useWorkSessionStore((state) => state.currentSession?.problems ?? []);
  const links = useWorkSessionStore((state) => state.currentSession?.links ?? []);

  return useMemo(() => {
    const linkedIds = new Set(links.map((l) => l.problemGroupId));
    return problems.filter((p) => !linkedIds.has(p.groupId));
  }, [problems, links]);
}
```

**장점**: 완전한 제어, 정확한 의존성
**단점**: 코드 복잡도 증가

### 방안 C: 상태에 캐시 저장

```typescript
// 스토어 내부에 캐시된 값 유지
interface WorkSessionState {
  // ...
  _cachedUnlinkedProblems: ProblemReference[];
  _updateUnlinkedProblemsCache: () => void;
}
```

**장점**: 가장 효율적
**단점**: 상태 관리 복잡, 캐시 무효화 로직 필요

---

## 4. 권장 해결 방안: 방안 A

### 수정할 파일
`frontend/src/stores/workSessionStore.ts`

### 수정 내용

```typescript
// 상단에 import 추가
import { shallow } from 'zustand/shallow';

// useSessionProgress 수정 (줄 447-449)
export function useSessionProgress() {
  return useWorkSessionStore(
    (state) => state.getProgress(),
    shallow
  );
}

// useUnlinkedProblems 수정 (줄 451-453)
export function useUnlinkedProblems() {
  return useWorkSessionStore(
    (state) => state.getUnlinkedProblems(),
    shallow
  );
}
```

---

## 5. 추가 발견된 문제

### 업로드 후 진행률 표시 없음

**사용자 피드백**: "넣었을때 라벨링하는 시간이 걸리는데 차라리 진행률을 띄워주는게 어때?"

**현재 상태**:
- PDF 업로드 후 백그라운드에서 페이지 분석 진행
- 사용자에게 진행 상황 표시 없음
- 새로고침 시 오래 걸림

**제안 개선**:
1. 업로드 완료 후 토스트/모달로 "문서 분석 중..." 표시
2. 진행률 바 (10/191 페이지 분석 완료)
3. 분석 완료 시 알림

---

## 6. 수정 우선순위

| 순위 | 작업 | 긴급도 | 복잡도 |
|------|------|--------|--------|
| 1 | useUnlinkedProblems 수정 | Critical | 낮음 |
| 2 | useSessionProgress 수정 | Critical | 낮음 |
| 3 | 업로드 진행률 표시 | Medium | 중간 |

---

## 7. 테스트 계획

1. 수정 후 파일 선택 → 작업 페이지 진입 테스트
2. 무한 루프 없이 정상 렌더링 확인
3. 문제-해설 연결 기능 정상 동작 확인
4. 콘솔 에러 없음 확인

---

*예상 수정 시간: 10분*
