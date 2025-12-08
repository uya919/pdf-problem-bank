# workSessionStore 무한 루프 버그 수정 계획

**작성일**: 2025-12-03
**목표**: Zustand selector 무한 루프 해결

---

## 수정 대상

| # | 훅 | 문제 | 해결 |
|---|-----|------|------|
| 1 | `useUnlinkedProblems` | 매번 새 배열 반환 | `shallow` 비교 |
| 2 | `useSessionProgress` | 매번 새 객체 반환 | `shallow` 비교 |

---

## 단계별 개발 계획

### Step 1: shallow import 추가
**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
// 기존
import { create } from 'zustand';

// 변경
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
```

---

### Step 2: useSessionProgress 수정
**위치**: 줄 447-449

```typescript
// 기존
export function useSessionProgress() {
  return useWorkSessionStore((state) => state.getProgress());
}

// 변경
export function useSessionProgress() {
  return useWorkSessionStore(
    (state) => state.getProgress(),
    shallow
  );
}
```

---

### Step 3: useUnlinkedProblems 수정
**위치**: 줄 451-453

```typescript
// 기존
export function useUnlinkedProblems() {
  return useWorkSessionStore((state) => state.getUnlinkedProblems());
}

// 변경
export function useUnlinkedProblems() {
  return useWorkSessionStore(
    (state) => state.getUnlinkedProblems(),
    shallow
  );
}
```

---

### Step 4: 테스트
1. 브라우저 새로고침
2. 문서 선택 → 작업 페이지 진입
3. 무한 루프 없이 정상 동작 확인
4. 콘솔 에러 없음 확인

---

### Step 5: 디버그 로그 정리 (선택)
Phase 35에서 추가한 디버그 로그 제거

---

## 체크리스트

- [ ] Step 1: shallow import 추가
- [ ] Step 2: useSessionProgress 수정
- [ ] Step 3: useUnlinkedProblems 수정
- [ ] Step 4: 테스트
- [ ] Step 5: 디버그 로그 정리

---

## 예상 소요 시간

| 단계 | 복잡도 |
|------|--------|
| Step 1-3 | 5분 |
| Step 4 | 3분 |
| Step 5 | 2분 |

**총 예상**: 10분
