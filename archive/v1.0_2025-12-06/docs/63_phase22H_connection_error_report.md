# Phase 22-H 듀얼 윈도우 연결 끊김 에러 리포트

## 📋 에러 요약

| 항목 | 내용 |
|------|------|
| **발생 시점** | 2025-12-02, Phase 22-H ViewerPage 구현 직후 |
| **증상** | 창은 열리지만 즉시 "문제창/해설창 연결 끊김" 표시 |
| **심각도** | 🟠 High - 듀얼 윈도우 기능 저하 |
| **근본 원인** | BroadcastChannel 타이밍 이슈 + 창 간 WINDOW_JOINED 동기화 실패 |

---

## 🔍 상세 분석

### 1. 에러 메시지 발생 위치

```typescript
// MatchingHeader.tsx:97-102
{isOtherWindowConnected ? (
  <div>...{connectedWindows}개 창 연결됨...</div>
) : (
  <div>
    <AlertTriangle />
    <span>{otherWindowName} 연결 끊김</span>  // ← 이 메시지
  </div>
)}
```

**조건**: `connectedWindows >= 2`이면 연결됨, 아니면 "연결 끊김" 표시

### 2. 연결 흐름 분석

```
┌─────────────────────────────────────────────────────────────────────┐
│                    듀얼 윈도우 연결 흐름                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [DualUploadCard]                                                   │
│       │                                                             │
│       ▼                                                             │
│  launchDualWindows() 클릭                                           │
│       │                                                             │
│       ├─────────────────────────────┐                               │
│       │                             │                               │
│       ▼                             ▼                               │
│  window.open(solutionUrl)    setTimeout(100ms) → window.location =  │
│  해설 창 열기                 problemUrl (문제 창)                   │
│       │                             │                               │
│       ▼                             ▼                               │
│  /viewer/솔루션DocId         /viewer/문제DocId                       │
│  ?session=ABC&role=solution  ?session=ABC&role=problem              │
│       │                             │                               │
│       ▼                             ▼                               │
│  ViewerPage 렌더링            ViewerPage 렌더링                      │
│       │                             │                               │
│       ▼                             ▼                               │
│  PageViewer 렌더링            PageViewer 렌더링                      │
│       │                             │                               │
│       ▼                             ▼                               │
│  useMatchingSession()         useMatchingSession()                  │
│  sessionId=ABC, role=solution sessionId=ABC, role=problem           │
│       │                             │                               │
│       ▼                             ▼                               │
│  useAutoMatching(ABC, solution)  useAutoMatching(ABC, problem)      │
│       │                             │                               │
│       ▼                             ▼                               │
│  useSyncChannel(ABC)          useSyncChannel(ABC)                   │
│       │                             │                               │
│       ▼                             ▼                               │
│  BroadcastChannel             BroadcastChannel                      │
│  "matching-ABC"               "matching-ABC"                        │
│  connectedWindows=1           connectedWindows=1                    │
│       │                             │                               │
│       ▼                             ▼                               │
│  WINDOW_JOINED 전송           WINDOW_JOINED 전송                    │
│       │                             │                               │
│       ├─────────────────────────────┤                               │
│       │      ⚠️ 타이밍 이슈!        │                               │
│       │                             │                               │
│       ▼                             ▼                               │
│  MatchingHeader               MatchingHeader                        │
│  connectedWindows=1           connectedWindows=1                    │
│  "해설 창 연결 끊김"          "문제 창 연결 끊김"                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. useSyncChannel 동작 분석

```typescript
// useSyncChannel.ts

// 초기 상태
const [connectedWindows, setConnectedWindows] = useState(1);  // 자신 포함 1

// 채널 연결 시
useEffect(() => {
  if (!sessionId) return;

  const channel = new BroadcastChannel(`matching-${sessionId}`);

  channel.onmessage = (event) => {
    const message = event.data;

    // 자기 메시지 무시
    if (message.windowId === windowIdRef.current) return;

    // WINDOW_JOINED 수신
    if (message.type === 'WINDOW_JOINED') {
      setConnectedWindows(prev => prev + 1);
      // 응답 전송
      channel.postMessage({
        type: 'WINDOW_JOINED',
        payload: { windowId: windowIdRef.current, isResponse: true },
        ...
      });
    }
  };

  // 참여 알림 전송
  channel.postMessage({
    type: 'WINDOW_JOINED',
    payload: { windowId: windowIdRef.current },
    ...
  });

  return () => { channel.close(); };
}, [sessionId]);
```

### 4. 타이밍 이슈 상세

**문제 시나리오**:

```
시간축 →

[해설 창]                          [문제 창]
t=0ms   ViewerPage 마운트
t=10ms  useMatchingSession 실행
t=20ms  sessionId="ABC" 파싱
t=30ms  useAutoMatching 호출
t=40ms  useSyncChannel 호출
t=50ms  BroadcastChannel 생성
t=60ms  WINDOW_JOINED 전송 ──────→ 아직 문제 창 없음! (메시지 유실)
t=70ms  connectedWindows=1
t=80ms  MatchingHeader 렌더링
        "문제 창 연결 끊김" 😭

        ─────────────────────────────────────────────

t=100ms                            문제 창 window.location 변경
t=120ms                            ViewerPage 마운트
t=130ms                            useMatchingSession 실행
t=140ms                            sessionId="ABC" 파싱
t=150ms                            useAutoMatching 호출
t=160ms                            useSyncChannel 호출
t=170ms                            BroadcastChannel 생성
t=180ms 메시지 수신 ←───────────── WINDOW_JOINED 전송
t=190ms connectedWindows=2 ✓
        응답 전송 ──────────────→ 메시지 수신
                                   connectedWindows=2 ✓

```

**실제로 일어나는 일**:
1. 해설 창이 먼저 열리고 `WINDOW_JOINED` 전송
2. 100ms 후 문제 창이 열림
3. **문제**: 해설 창의 첫 `WINDOW_JOINED`는 아무도 안 받음 (문제 창이 아직 없음)
4. 문제 창이 `WINDOW_JOINED` 전송
5. 해설 창이 받고 응답 전송 → **둘 다 connectedWindows=2**

**왜 연결 끊김이 표시되는가?**:
- 해설 창: `WINDOW_JOINED` 전송 직후 즉시 `MatchingHeader` 렌더링
- 이 시점에 `connectedWindows`는 아직 `1`
- 문제 창의 응답을 받기 전에 이미 UI가 렌더링됨

---

## 🔬 근본 원인

### 원인 1: 초기 렌더링 시 connectedWindows가 1

`useSyncChannel`의 `connectedWindows` 초기값이 `1`입니다. 다른 창의 응답을 받기 전까지는 "연결 끊김"으로 표시됩니다.

### 원인 2: 비동기 메시지 교환과 동기 렌더링의 불일치

- BroadcastChannel 메시지 교환은 **비동기**
- React 렌더링은 **동기**
- 메시지 응답을 받기 전에 UI가 먼저 렌더링됨

### 원인 3: 첫 번째 창의 WINDOW_JOINED 유실

해설 창이 먼저 열리면, 그 시점에 문제 창이 아직 없어서 첫 `WINDOW_JOINED` 메시지가 유실됩니다.

---

## 📊 영향 분석

| 영향 | 설명 |
|------|------|
| **사용자 경험** | "연결 끊김" 메시지가 잠깐 나타남 (실제로는 곧 연결됨) |
| **기능 동작** | 실제 동기화는 정상 동작할 수 있음 |
| **신뢰도** | 사용자가 기능 고장으로 오인 |

---

## 🛠️ 해결 방안

### 방안 A: 초기 연결 대기 시간 추가 (권장)

```typescript
// useSyncChannel.ts 수정
const [isInitializing, setIsInitializing] = useState(true);

useEffect(() => {
  // 채널 연결 후 1초 대기
  const timer = setTimeout(() => {
    setIsInitializing(false);
  }, 1000);

  return () => clearTimeout(timer);
}, [sessionId]);

// MatchingHeader에서
{isInitializing ? (
  <div>연결 중...</div>
) : isOtherWindowConnected ? (
  <div>연결됨</div>
) : (
  <div>연결 끊김</div>
)}
```

### 방안 B: Heartbeat 메커니즘

```typescript
// 주기적으로 PING 메시지 전송
useEffect(() => {
  const interval = setInterval(() => {
    send('PING', { windowId });
  }, 2000);

  return () => clearInterval(interval);
}, []);

// PING 수신 시 connectedWindows 업데이트
if (message.type === 'PING') {
  // 마지막 PING 시간 기록
  lastPingRef.current = Date.now();
}
```

### 방안 C: 연결 상태 재확인 (빠른 수정)

```typescript
// MatchingHeader에서 연결 상태 표시 조건 완화
const isOtherWindowConnected = connectedWindows >= 2;
const isInitialPhase = Date.now() - mountTimeRef.current < 3000;

// 초기 3초 동안은 "연결 중..." 표시
{isInitialPhase ? (
  <div>상대 창 연결 중...</div>
) : isOtherWindowConnected ? (
  <div>연결됨</div>
) : (
  <div>연결 끊김</div>
)}
```

### 방안 D: 재연결 자동 시도

```typescript
// useSyncChannel에서 주기적으로 WINDOW_JOINED 재전송
useEffect(() => {
  if (connectedWindows < 2) {
    const retryInterval = setInterval(() => {
      send('WINDOW_JOINED', { windowId, isRetry: true });
    }, 500);

    // 5초 후 중단
    const stopTimer = setTimeout(() => {
      clearInterval(retryInterval);
    }, 5000);

    return () => {
      clearInterval(retryInterval);
      clearTimeout(stopTimer);
    };
  }
}, [connectedWindows]);
```

---

## 📋 권장 수정 계획

### 즉시 수정 (방안 C 적용)

1. `MatchingHeader`에 초기 연결 대기 상태 추가
2. 마운트 후 3초 동안 "연결 중..." 표시
3. 3초 후에도 connectedWindows < 2이면 "연결 끊김" 표시

### 추후 개선 (방안 B 적용)

1. Heartbeat 메커니즘 구현
2. 실제 연결 상태를 정확히 감지
3. 자동 재연결 기능 추가

---

## ✅ 검증 방법

1. 듀얼 윈도우 실행
2. 두 창 모두 "연결 중..." → "2개 창 연결됨" 표시 확인
3. 한 창 닫기 → 다른 창에서 "연결 끊김" 확인
4. 재연결 버튼 동작 확인

---

## 🎯 결론

**근본 원인**: BroadcastChannel 메시지 교환이 비동기로 이루어지는 동안 React가 이미 UI를 렌더링하여, `connectedWindows=1` 상태에서 "연결 끊김" 메시지가 표시됨.

**권장 해결책**: 초기 연결 대기 시간을 추가하여, 마운트 직후 3초 동안은 "연결 중..." 상태로 표시. 이후 실제 연결 상태에 따라 표시.

---

*작성: Claude Code (Opus)*
*작성일: 2025-12-02*
