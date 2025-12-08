# Phase 22-I 듀얼 윈도우 연결 문제 에러 리포트

## 📋 에러 요약

| 항목 | 내용 |
|------|------|
| **발생 시점** | 2025-12-02, Phase 22-H-fix 직후 |
| **증상 1** | "연결 중..." → "연결 끊김" 으로 전환 (연결이 성립되지 않음) |
| **증상 2** | 재연결 버튼이 표시되지 않음 |
| **심각도** | 🔴 Critical - 듀얼 윈도우 기능 완전 실패 |

---

## 🔍 문제 1: 연결이 성립되지 않음

### 증상
- 두 창이 열리고 3초간 "연결 중..." 표시
- 3초 후 "연결 끊김" 표시
- `connectedWindows`가 2 이상으로 증가하지 않음

### 근본 원인: **windowId 중복**

```typescript
// useSyncChannel.ts:149-157
function generateWindowId(): string {
  // 문제: sessionStorage에서 가져옴
  const stored = sessionStorage.getItem('matching-window-id');
  if (stored) return stored;  // ← 기존 값이 있으면 재사용!

  const id = `win-${Date.now()}-${Math.random()...}`;
  sessionStorage.setItem('matching-window-id', id);
  return id;
}
```

**window.open() 동작**:
```
┌─────────────────────────────────────────────────────────────────────┐
│                    window.open()의 sessionStorage 상속              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [원본 창 - 해설 창]                                                 │
│  sessionStorage:                                                    │
│    matching-window-id = "win-abc123"                                │
│                                                                     │
│           │ window.open()                                           │
│           ▼                                                         │
│                                                                     │
│  [새 창 - 문제 창]                                                   │
│  sessionStorage:                                                    │
│    matching-window-id = "win-abc123"  ← 같은 값이 복사됨!            │
│                                                                     │
│  두 창이 같은 windowId를 가짐 → 메시지를 "자기 메시지"로 인식         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**결과**:
```typescript
// useSyncChannel.ts:66-68
channel.onmessage = (event) => {
  // 두 창의 windowId가 같으므로 모든 메시지가 무시됨!
  if (message.windowId === windowIdRef.current) {
    return;  // ← 항상 여기서 리턴
  }
  // 아래 코드 실행 안 됨
};
```

### 해결 방안

```typescript
// useSyncChannel.ts 수정
function generateWindowId(): string {
  // sessionStorage 사용하지 않고 매번 새로 생성
  // 또는 페이지 로드 시 무조건 새로 생성
  return `win-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
```

---

## 🔍 문제 2: 재연결 버튼이 표시되지 않음

### 증상
- "연결 끊김" 메시지는 표시되지만 재연결 버튼이 없음

### 근본 원인: **otherDocumentId prop 미전달**

```typescript
// PageViewer.tsx:446-454
<MatchingHeader
  role={role}
  sessionId={sessionId!}
  connectedWindows={connectedWindows}
  pendingCount={pendingCount}
  nextPendingNumber={nextPendingNumber}
  matchedCount={matchedCount}
  onEndSession={endSession}
  // ❌ otherDocumentId가 전달되지 않음!
/>
```

```typescript
// MatchingHeader.tsx:135
{otherDocumentId && (  // ← undefined이므로 재연결 버튼 렌더링 안 됨
  <button onClick={handleReconnect}>
    재연결
  </button>
)}
```

### 해결 방안

```typescript
// PageViewer.tsx에서 세션 정보를 조회하여 상대 문서 ID 전달
import { getSessionInfo } from '../hooks/useMatchingSession';

// 컴포넌트 내부
const sessionInfo = sessionId ? getSessionInfo(sessionId) : null;
const otherDocumentId = sessionInfo
  ? (role === 'problem'
      ? sessionInfo.solutionDocumentId
      : sessionInfo.problemDocumentId)
  : undefined;

// MatchingHeader에 전달
<MatchingHeader
  ...
  otherDocumentId={otherDocumentId}
/>
```

---

## 📊 영향 분석

| 영향 | 설명 |
|------|------|
| **듀얼 윈도우 매칭** | 완전 실패 - 두 창이 서로 인식 못함 |
| **재연결 기능** | 버튼이 표시되지 않아 재연결 불가 |
| **사용자 경험** | 듀얼 윈도우 기능 사용 불가 |

---

## 🛠️ 수정 계획

### Step 1: windowId 생성 로직 수정 (useSyncChannel.ts)

```typescript
function generateWindowId(): string {
  // 매번 새로운 고유 ID 생성 (sessionStorage 사용 안 함)
  return `win-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
```

### Step 2: otherDocumentId 전달 (PageViewer.tsx)

```typescript
// 세션 정보에서 상대 문서 ID 조회
const sessionInfo = sessionId ? getSessionInfo(sessionId) : null;
const otherDocumentId = useMemo(() => {
  if (!sessionInfo || !role) return undefined;
  return role === 'problem'
    ? sessionInfo.solutionDocumentId
    : sessionInfo.problemDocumentId;
}, [sessionInfo, role]);

// MatchingHeader에 전달
<MatchingHeader
  ...
  otherDocumentId={otherDocumentId}
/>
```

### Step 3: 응답 무한 루프 방지 (useSyncChannel.ts)

```typescript
// WINDOW_JOINED 처리 시 isResponse 체크
if (message.type === 'WINDOW_JOINED') {
  const payload = message.payload as { isResponse?: boolean };
  setConnectedWindows(prev => prev + 1);

  // 응답이 아닌 경우에만 응답 전송 (무한 루프 방지)
  if (!payload.isResponse) {
    channel.postMessage({
      type: 'WINDOW_JOINED',
      payload: { windowId: windowIdRef.current, isResponse: true },
      ...
    });
  }
}
```

---

## ✅ 검증 방법

1. 듀얼 윈도우 실행
2. 두 창 모두 "2개 창 연결됨" 표시 확인
3. 한 창 닫기 → 다른 창에서 "연결 끊김" + **재연결 버튼** 확인
4. 재연결 버튼 클릭 → 새 창 열림 확인
5. 다시 "2개 창 연결됨" 표시 확인

---

*작성: Claude Code (Opus)*
*작성일: 2025-12-02*
