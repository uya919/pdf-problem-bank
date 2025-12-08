# Phase 44-B 무한 루프 심층 분석 리포트

**작성일**: 2025-12-04
**상태**: 분석 완료, 수정 진행 중
**심각도**: Critical (앱 사용 불가)

---

## 1. 문제 현상

브라우저 콘솔에서 다음 로그가 무한 반복됨:

```
05:24:05.217 [SyncStore] Status: pending
05:24:05.217 [SyncStore] Auto-resolving pending...
05:24:05.264 [Phase 37-D] Full sync completed
05:24:05.310 [SyncStore] Status: pending  ← 다시 pending?!
05:24:05.310 [SyncStore] Resolved: synced
05:24:05.310 [PageViewer] Page 0 initialized with 0 groups
05:24:05.310 [SyncStore] Status: pending  ← 무한 반복!
...
```

---

## 2. 관련 파일 및 코드 위치

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `SyncIndicator.tsx` | 동기화 상태 UI | L44-87 (checkStatus), L117-121 (useEffect) |
| `workSessionStore.ts` | Zustand 상태 관리 | L393-428 (getSyncStatus), L356-388 (fullSync) |
| `UnifiedWorkPage.tsx` | 부모 컴포넌트 | L410 (SyncIndicator 렌더링) |

---

## 3. 근본 원인 분석

### 3.1 React의 useCallback 의존성 문제

**SyncIndicator.tsx L44-87:**
```typescript
const checkStatus = useCallback(async () => {
  if (!currentSession) {        // ← currentSession을 클로저로 캡처
    setStatus('unknown');
    return;
  }

  const result = await getSyncStatus();  // ← 스토어 함수 호출
  // ...
}, [currentSession, getSyncStatus, showToast]);  // ← currentSession 의존!
```

**SyncIndicator.tsx L117-121:**
```typescript
useEffect(() => {
  if (currentSession) {
    checkStatus();  // ← checkStatus 호출
  }
}, [currentSession?.sessionId, checkStatus]);  // ← checkStatus 의존!
```

### 3.2 fullSync가 currentSession을 변경

**workSessionStore.ts L366-370:**
```typescript
fullSync: async () => {
  // ...
  if (result.session) {
    set({ currentSession: result.session, isLoading: false });  // ← 새 객체!
  }
  // ...
}
```

### 3.3 무한 루프 메커니즘

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. SyncIndicator 마운트                                                 │
│     ↓                                                                    │
│  2. useEffect 실행 → checkStatus() 호출                                  │
│     ↓                                                                    │
│  3. checkStatus() → getSyncStatus() 호출                                │
│     ↓                                                                    │
│  4. getSyncStatus()가 'pending' 감지 → fullSync() 호출                   │
│     ↓                                                                    │
│  5. fullSync() 완료 → set({ currentSession: NEW_SESSION_OBJECT })        │
│     ↓                                                                    │
│  6. currentSession 참조 변경 (새 객체!)                                   │
│     ↓                                                                    │
│  7. SyncIndicator 리렌더링                                               │
│     ↓                                                                    │
│  8. checkStatus useCallback 재생성 (currentSession 의존성 때문)           │
│     ↓                                                                    │
│  9. useEffect 재실행 (checkStatus가 새 함수이므로)                        │
│     ↓                                                                    │
│  10. → 2번으로 돌아감... 무한 루프!                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 왜 내 첫 번째 수정이 실패했는가?

### 4.1 첫 번째 시도 (Phase 44-B-FIX)

```typescript
// workSessionStore.ts에서
if (status.status === 'pending') {
  const syncResult = await fullSync();
  return { ...status, status: 'synced' };  // API 재호출 안함
}
```

**문제**: 이 수정은 `getSyncStatus()` 내부의 재귀 호출을 막았지만,
**근본 원인은 다른 곳**에 있었음 - `SyncIndicator`의 useEffect가
`checkStatus`의 참조 변경을 감지하고 다시 호출하는 것이 문제!

### 4.2 두 가지 루프 경로

1. **내부 루프 (수정됨)**: `getSyncStatus()` → `fullSync()` → `api.getSyncStatus()` → 반복
2. **외부 루프 (미수정)**: `useEffect` → `checkStatus()` → state 변경 → 리렌더 → useEffect 재실행

---

## 5. 올바른 해결 방법

### 5.1 Option A: checkStatus 의존성에서 currentSession 제거

```typescript
// SyncIndicator.tsx
const checkStatus = useCallback(async () => {
  // 클로저 대신 스토어에서 직접 접근
  const session = useWorkSessionStore.getState().currentSession;
  if (!session) {
    setStatus('unknown');
    return;
  }

  const result = await getSyncStatus();
  // ...
}, [getSyncStatus, showToast]);  // currentSession 제거!
```

**장점**: 간단한 수정
**단점**: React 패턴과 약간 어긋남 (getState 직접 사용)

### 5.2 Option B: useEffect에서 checkStatus를 ref로 감싸기

```typescript
// SyncIndicator.tsx
const checkStatusRef = useRef(checkStatus);
checkStatusRef.current = checkStatus;

useEffect(() => {
  if (currentSession) {
    checkStatusRef.current();  // ref를 통해 호출
  }
}, [currentSession?.sessionId]);  // checkStatus 제거!
```

**장점**: React 패턴 준수
**단점**: 추가 코드 필요

### 5.3 Option C: 자동 동기화 기능 제거

```typescript
// workSessionStore.ts
getSyncStatus: async () => {
  const status = await api.getSyncStatus(sessionId);
  return status;  // 자동 fullSync 제거!
}
```

**장점**: 가장 안전, 부작용 없음
**단점**: Phase 44-B 기능 제거

---

## 6. 권장 해결 방안

**Option B (ref 패턴)** + **Option C (자동 동기화 제거)** 조합 권장

### 이유:
1. `getSyncStatus()`는 순수하게 상태만 확인해야 함
2. 자동 동기화는 `SyncIndicator`에서 처리하는 것이 더 적합
3. React 의존성 패턴 준수

---

## 7. 수정 계획

### 7.1 workSessionStore.ts
- `getSyncStatus()`에서 자동 `fullSync()` 호출 제거
- 순수하게 상태만 반환

### 7.2 SyncIndicator.tsx
- `checkStatus`를 ref로 감싸서 useEffect 의존성에서 제거
- 또는 pending/conflict 상태에서 자동으로 `handleSync()` 호출

---

## 8. 추가 고려사항

### 8.1 PageViewer 무한 루프 가능성

PageViewer에서도 비슷한 패턴이 있을 수 있음:
- Line 93-95: `initialPage` 변경 시 `setCurrentPage`
- Line 222-253: `currentPage` 변경 시 저장 로직

현재는 문제없어 보이지만 모니터링 필요.

### 8.2 Zustand 셀렉터 최적화

```typescript
// 현재 (전체 객체 구독)
const { currentSession, getSyncStatus } = useWorkSessionStore();

// 권장 (필요한 값만 구독)
const sessionId = useWorkSessionStore(state => state.currentSession?.sessionId);
const getSyncStatus = useWorkSessionStore(state => state.getSyncStatus);
```

---

## 9. 결론

**근본 원인**: React useCallback/useEffect의 의존성 배열과 Zustand 상태 업데이트의 상호작용

**해결책**:
1. `getSyncStatus()`에서 자동 동기화 제거 (순수 함수로)
2. `SyncIndicator`에서 ref 패턴 사용하여 불필요한 재실행 방지

---

*작성자: Claude Code*
*Phase: 44-B-FIX-2*
