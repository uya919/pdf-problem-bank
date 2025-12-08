# 문제-해설 매칭 시스템 연구 리포트

**Phase 22 Research**
**작성일**: 2025-12-02
**작성자**: Claude Code (Opus)

---

## 1. 개요

### 1.1 현재 상황
- PDF 문제집에서 문제 이미지 크롭 및 라벨링 기능 완성
- 문제와 해설이 별도 PDF로 분리되어 있는 경우가 많음
- 문제 라벨링과 해설 매칭을 동시에 진행하면 효율적

### 1.2 사용자 요구사항
```
"듀얼 모니터를 활용해서 웹페이지 2개를 띄워서
두 개를 한번에 문제-해설로 연결 저장하고 싶다"
```

### 1.3 핵심 과제
| 과제 | 설명 |
|------|------|
| **듀얼 윈도우 동기화** | 두 개의 브라우저 창이 실시간으로 통신 |
| **문제-해설 연결** | 선택한 문제와 해설을 매칭하여 저장 |
| **직관적 UX** | 최소 클릭으로 빠르게 작업 |

---

## 2. 기술적 구현 방안 분석

### 2.1 방안 비교표

| 방안 | 복잡도 | 실시간성 | 오프라인 | 확장성 |
|------|--------|----------|----------|--------|
| **A. BroadcastChannel API** | 낮음 | 높음 | 가능 | 낮음 |
| **B. WebSocket (백엔드)** | 중간 | 높음 | 불가 | 높음 |
| **C. localStorage 이벤트** | 낮음 | 중간 | 가능 | 낮음 |
| **D. SharedWorker** | 높음 | 높음 | 가능 | 중간 |

---

### 2.2 방안 A: BroadcastChannel API (권장)

**개념**: 같은 origin의 브라우저 탭/창 간 메시지 전달

```typescript
// 채널 생성 (모든 탭에서 동일한 채널명 사용)
const channel = new BroadcastChannel('problem-solution-matching');

// 메시지 전송
channel.postMessage({
  type: 'PROBLEM_SELECTED',
  payload: {
    documentId: 'doc_123',
    pageIndex: 5,
    groupId: 'group_1',
    problemNumber: '3'
  }
});

// 메시지 수신
channel.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === 'PROBLEM_SELECTED') {
    // 해설 창에서 해당 문제에 매칭할 준비
    highlightMatchingTarget(payload);
  }
};
```

**장점**:
- 브라우저 내장 API (추가 서버 불필요)
- 실시간 양방향 통신
- 간단한 구현

**단점**:
- 같은 브라우저, 같은 origin에서만 동작
- 다른 기기 간 동기화 불가

**브라우저 지원**: Chrome 54+, Firefox 38+, Edge 79+ (IE 미지원)

---

### 2.3 방안 B: WebSocket 백엔드 중계

**개념**: FastAPI WebSocket으로 실시간 동기화

```python
# backend/app/routers/sync.py
from fastapi import WebSocket, WebSocketDisconnect

class MatchingSession:
    def __init__(self):
        self.connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.connections:
            self.connections[session_id] = []
        self.connections[session_id].append(websocket)

    async def broadcast(self, session_id: str, message: dict):
        for ws in self.connections.get(session_id, []):
            await ws.send_json(message)

manager = MatchingSession()

@router.websocket("/ws/matching/{session_id}")
async def matching_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast(session_id, data)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
```

**장점**:
- 다른 기기, 다른 네트워크에서도 동기화 가능
- 협업 기능 확장 가능
- 세션 상태 서버에서 관리

**단점**:
- 서버 리소스 사용
- 네트워크 지연 존재
- 구현 복잡도 증가

---

### 2.4 방안 C: localStorage 이벤트

**개념**: localStorage 변경 시 다른 탭에 이벤트 발생

```typescript
// 문제 창에서 선택
const selectProblem = (problem: ProblemGroup) => {
  localStorage.setItem('selectedProblem', JSON.stringify({
    ...problem,
    timestamp: Date.now()
  }));
};

// 해설 창에서 감지
window.addEventListener('storage', (event) => {
  if (event.key === 'selectedProblem' && event.newValue) {
    const problem = JSON.parse(event.newValue);
    highlightMatchingTarget(problem);
  }
});
```

**장점**:
- 가장 간단한 구현
- 모든 브라우저 지원

**단점**:
- 같은 탭에서는 이벤트 미발생 (다른 탭에서만)
- 데이터 크기 제한 (5MB)
- 타이밍 이슈 가능

---

### 2.5 방안 D: SharedWorker

**개념**: 여러 탭이 공유하는 백그라운드 워커

```typescript
// shared-worker.ts
const connections: MessagePort[] = [];

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  connections.push(port);

  port.onmessage = (event) => {
    // 모든 연결된 탭에 브로드캐스트
    connections.forEach(p => p.postMessage(event.data));
  };
};

// 사용
const worker = new SharedWorker('/shared-worker.js');
worker.port.onmessage = handleMessage;
worker.port.postMessage({ type: 'PROBLEM_SELECTED', ... });
```

**장점**:
- 탭 간 상태 공유 용이
- BroadcastChannel보다 더 복잡한 로직 가능

**단점**:
- 구현 복잡
- Safari 미지원 (2024년 기준)
- 디버깅 어려움

---

## 3. 토스 스타일 UX 분석

### 3.1 토스 디자인 원칙

| 원칙 | 적용 방안 |
|------|-----------|
| **한 화면 = 한 액션** | 문제 창: 문제 선택만, 해설 창: 해설 선택만 |
| **최소 클릭** | 클릭 한 번으로 선택, 한 번 더 클릭으로 매칭 완료 |
| **명확한 피드백** | 선택 시 즉각적 시각 변화, 매칭 완료 시 토스트 |
| **실수 방지** | 매칭 전 미리보기, 실행취소 기능 |

### 3.2 토스라면 이렇게 했을 것

#### 핵심 UX 흐름

```
[문제 창]                          [해설 창]
    ▼                                  ▼
문제 클릭                          해설 클릭
    │                                  │
    ▼                                  ▼
  ┌─────────────────────────────────────┐
  │  "3번 문제 ↔ 3번 해설"              │
  │  매칭하시겠습니까?                   │
  │                                     │
  │  [취소]            [매칭하기 ✓]     │
  └─────────────────────────────────────┘
                   │
                   ▼
              토스트: "매칭 완료!"
              다음 문제 자동 포커스
```

#### 토스 스타일 디자인 요소

**1. 선택 상태 시각화**
```css
/* 선택된 문제/해설 하이라이트 */
.selected-problem {
  border: 2px solid #3182F6;  /* 토스 블루 */
  background: rgba(49, 130, 246, 0.05);
  box-shadow: 0 0 0 4px rgba(49, 130, 246, 0.1);
}

/* 매칭 대기 중인 항목 */
.waiting-match {
  animation: pulse 2s infinite;
  border-color: #F97316;  /* 오렌지 */
}
```

**2. 연결선 시각화 (토스 송금 UX 참고)**
```
┌─────────────┐       ┌─────────────┐
│  3번 문제   │ ───── │  3번 해설   │  ← 점선으로 연결 표시
│  [선택됨]   │       │  [매칭완료] │
└─────────────┘       └─────────────┘
```

**3. 진행 상황 표시 (토스 머니 흐름 참고)**
```
문제 매칭 진행률
━━━━━━━━━━━━━━━━━━━━━━━━━ 15/20
■■■■■■■■■■■■■■■□□□□□    75%
```

**4. 키보드 단축키 (파워 유저용)**
| 단축키 | 동작 |
|--------|------|
| `1-9` | 해당 번호 문제 선택 |
| `Enter` | 매칭 확정 |
| `Esc` | 선택 취소 |
| `Tab` | 다음 미매칭 문제로 이동 |
| `Ctrl+Z` | 마지막 매칭 취소 |

---

## 4. 추천 구현 방안

### 4.1 Phase 분할

| Phase | 내용 | 예상 작업량 |
|-------|------|-------------|
| **22-A** | BroadcastChannel 기반 듀얼 윈도우 동기화 | 2-3시간 |
| **22-B** | 문제-해설 매칭 UI (토스 스타일) | 3-4시간 |
| **22-C** | 매칭 데이터 저장 API | 1-2시간 |
| **22-D** | 매칭 현황 대시보드 | 2시간 |

### 4.2 권장 기술 스택

```
┌─────────────────────────────────────────────┐
│                 Frontend                     │
│  ┌─────────────┐     ┌─────────────┐        │
│  │  문제 창    │ ←→  │  해설 창    │        │
│  │ (React)     │     │ (React)     │        │
│  └──────┬──────┘     └──────┬──────┘        │
│         │ BroadcastChannel  │               │
│         └─────────┬─────────┘               │
│                   │                          │
│  ┌────────────────▼────────────────┐        │
│  │   useSyncChannel() 커스텀 훅    │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
                    │ HTTP/REST
                    ▼
┌─────────────────────────────────────────────┐
│                 Backend                      │
│  ┌─────────────────────────────────┐        │
│  │  POST /api/matching/save        │        │
│  │  GET  /api/matching/{doc_id}    │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

---

## 5. 데이터 구조 설계

### 5.1 문제-해설 매칭 모델

```typescript
// frontend/src/types/matching.ts

/** 매칭 세션 (작업 단위) */
interface MatchingSession {
  sessionId: string;           // UUID
  problemDocumentId: string;   // 문제 PDF 문서 ID
  solutionDocumentId: string;  // 해설 PDF 문서 ID
  createdAt: string;
  status: 'in_progress' | 'completed';
}

/** 개별 매칭 */
interface ProblemSolutionMatch {
  matchId: string;             // UUID
  sessionId: string;

  // 문제 정보
  problem: {
    documentId: string;
    pageIndex: number;
    groupId: string;
    problemNumber: string;
    imageUrl: string;
  };

  // 해설 정보
  solution: {
    documentId: string;
    pageIndex: number;
    groupId: string;
    imageUrl: string;
  };

  createdAt: string;
  createdBy: string;
}

/** 동기화 메시지 */
type SyncMessage =
  | { type: 'PROBLEM_SELECTED'; payload: ProblemSelection }
  | { type: 'SOLUTION_SELECTED'; payload: SolutionSelection }
  | { type: 'MATCH_CONFIRMED'; payload: ProblemSolutionMatch }
  | { type: 'MATCH_CANCELLED'; payload: { matchId: string } }
  | { type: 'WINDOW_ROLE_SET'; payload: { role: 'problem' | 'solution' } };
```

### 5.2 백엔드 저장 구조

```
dataset_root/{document_id}/
├── matchings/
│   ├── session_{session_id}.json    # 세션 정보
│   └── matches.json                 # 매칭 목록
```

```python
# backend/app/models/matching.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MatchingSession(BaseModel):
    session_id: str
    problem_document_id: str
    solution_document_id: str
    created_at: datetime
    status: str = "in_progress"

class ProblemSolutionMatch(BaseModel):
    match_id: str
    session_id: str

    problem_document_id: str
    problem_page_index: int
    problem_group_id: str
    problem_number: str

    solution_document_id: str
    solution_page_index: int
    solution_group_id: str

    created_at: datetime
```

---

## 6. UI 와이어프레임

### 6.1 듀얼 윈도우 레이아웃

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [모니터 1: 문제 창]                │  [모니터 2: 해설 창]                  │
│                                     │                                       │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────────┐ │
│  │ 📄 수학의바이블_문제.pdf      │   │  │ 📄 수학의바이블_해설.pdf          │ │
│  │ 페이지: ◀ 15 ▶  (총 200)    │   │  │ 페이지: ◀ 42 ▶  (총 150)        │ │
│  └─────────────────────────────┘   │  └─────────────────────────────────┘ │
│                                     │                                       │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────────┐ │
│  │                             │   │  │                                 │ │
│  │   [3번 문제] ← 선택됨 🔵    │   │  │   [3번 해설] ← 매칭 대기 🟠    │ │
│  │   ━━━━━━━━━━━━━━━━━━━━━━━   │   │  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │ │
│  │                             │   │  │                                 │ │
│  │   [4번 문제] ← 미선택       │   │  │   [4번 해설]                    │ │
│  │   ━━━━━━━━━━━━━━━━━━━━━━━   │   │  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━   │ │
│  │                             │   │  │                                 │ │
│  └─────────────────────────────┘   │  └─────────────────────────────────┘ │
│                                     │                                       │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────────────┐ │
│  │ 매칭 현황: 15/20 완료       │   │  │ [매칭하기] 버튼                  │ │
│  │ ■■■■■■■■■■■■■■■□□□□□ 75%   │   │  │ "3번 문제 ↔ 3번 해설"           │ │
│  └─────────────────────────────┘   │  └─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 매칭 확인 모달 (토스 스타일)

```
┌─────────────────────────────────────────────┐
│                                             │
│        문제와 해설을 매칭합니다              │
│                                             │
│  ┌─────────────┐      ┌─────────────┐      │
│  │ 📝 3번 문제 │  ──▶ │ 📖 3번 해설 │      │
│  │ 15페이지    │      │ 42페이지    │      │
│  └─────────────┘      └─────────────┘      │
│                                             │
│  ───────────────────────────────────────── │
│                                             │
│   [이전으로]                    [매칭 ✓]   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 7. 핵심 구현 코드 미리보기

### 7.1 useSyncChannel 훅

```typescript
// frontend/src/hooks/useSyncChannel.ts

import { useEffect, useRef, useCallback, useState } from 'react';

type WindowRole = 'problem' | 'solution' | null;

interface SyncState {
  role: WindowRole;
  selectedProblem: ProblemSelection | null;
  selectedSolution: SolutionSelection | null;
  isConnected: boolean;
}

export function useSyncChannel(sessionId: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [state, setState] = useState<SyncState>({
    role: null,
    selectedProblem: null,
    selectedSolution: null,
    isConnected: false,
  });

  useEffect(() => {
    // 채널 생성
    const channel = new BroadcastChannel(`matching-${sessionId}`);
    channelRef.current = channel;

    // 메시지 핸들러
    channel.onmessage = (event) => {
      const message = event.data as SyncMessage;

      switch (message.type) {
        case 'PROBLEM_SELECTED':
          setState(prev => ({
            ...prev,
            selectedProblem: message.payload
          }));
          break;
        case 'SOLUTION_SELECTED':
          setState(prev => ({
            ...prev,
            selectedSolution: message.payload
          }));
          break;
        case 'MATCH_CONFIRMED':
          // 매칭 완료 처리
          handleMatchConfirmed(message.payload);
          break;
      }
    };

    setState(prev => ({ ...prev, isConnected: true }));

    return () => {
      channel.close();
    };
  }, [sessionId]);

  // 메시지 전송 함수
  const send = useCallback((message: SyncMessage) => {
    channelRef.current?.postMessage(message);
  }, []);

  // 문제 선택
  const selectProblem = useCallback((problem: ProblemSelection) => {
    send({ type: 'PROBLEM_SELECTED', payload: problem });
    setState(prev => ({ ...prev, selectedProblem: problem }));
  }, [send]);

  // 해설 선택
  const selectSolution = useCallback((solution: SolutionSelection) => {
    send({ type: 'SOLUTION_SELECTED', payload: solution });
    setState(prev => ({ ...prev, selectedSolution: solution }));
  }, [send]);

  // 매칭 확정
  const confirmMatch = useCallback(async () => {
    if (!state.selectedProblem || !state.selectedSolution) return;

    const match = createMatch(state.selectedProblem, state.selectedSolution);

    // 서버에 저장
    await api.saveMatch(sessionId, match);

    // 다른 창에 알림
    send({ type: 'MATCH_CONFIRMED', payload: match });

    // 상태 초기화
    setState(prev => ({
      ...prev,
      selectedProblem: null,
      selectedSolution: null
    }));
  }, [state, sessionId, send]);

  return {
    ...state,
    selectProblem,
    selectSolution,
    confirmMatch,
  };
}
```

### 7.2 창 역할 설정 컴포넌트

```tsx
// frontend/src/components/WindowRoleSelector.tsx

export function WindowRoleSelector({
  sessionId,
  onRoleSelected
}: {
  sessionId: string;
  onRoleSelected: (role: 'problem' | 'solution') => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold text-center mb-6">
          이 창의 역할을 선택하세요
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onRoleSelected('problem')}
            className="p-6 border-2 rounded-xl hover:border-blue-500
                       hover:bg-blue-50 transition-all group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              📝
            </div>
            <div className="font-medium">문제 창</div>
            <div className="text-sm text-grey-500 mt-1">
              문제를 선택합니다
            </div>
          </button>

          <button
            onClick={() => onRoleSelected('solution')}
            className="p-6 border-2 rounded-xl hover:border-green-500
                       hover:bg-green-50 transition-all group"
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
              📖
            </div>
            <div className="font-medium">해설 창</div>
            <div className="text-sm text-grey-500 mt-1">
              해설을 선택합니다
            </div>
          </button>
        </div>

        <p className="text-center text-grey-500 text-sm mt-6">
          듀얼 모니터에서 각 창에 다른 역할을 지정하세요
        </p>
      </div>
    </div>
  );
}
```

---

## 8. 워크플로우 시나리오

### 8.1 기본 워크플로우

```
1. 사용자가 "문제-해설 매칭" 모드 진입
   └─▶ 세션 ID 생성 (예: matching-abc123)

2. 첫 번째 브라우저 창 열림
   └─▶ "이 창은 문제 창입니다" 역할 선택
   └─▶ 문제 PDF 문서 선택

3. 두 번째 브라우저 창 열기 (새 탭 또는 Ctrl+클릭)
   └─▶ "이 창은 해설 창입니다" 역할 선택
   └─▶ 해설 PDF 문서 선택
   └─▶ 두 창이 BroadcastChannel로 연결됨

4. 매칭 작업 시작
   [문제 창] 1번 문제 클릭 → 파란색 하이라이트
   [해설 창] 자동으로 "매칭 대기 중" 표시

5. 매칭 확정
   [해설 창] 1번 해설 클릭 → 매칭 확인 모달
   [확인] 클릭 → 양쪽 창에 "매칭 완료!" 토스트

6. 다음 문제로 자동 이동
   [문제 창] 2번 문제 자동 포커스
   [해설 창] 스크롤 자동 조정 (선택적)

7. 반복...

8. 완료
   └─▶ 매칭 결과 저장됨
   └─▶ 내보내기 시 문제+해설 함께 출력 가능
```

### 8.2 실수 복구 시나리오

```
1. 잘못된 매칭 발견
   └─▶ 매칭 목록에서 해당 항목 찾기
   └─▶ "삭제" 버튼 클릭
   └─▶ 다시 매칭

2. 창 새로고침
   └─▶ 세션 ID가 URL에 포함되어 있음
   └─▶ 자동으로 세션 복구
   └─▶ 이미 완료된 매칭 목록 유지
```

---

## 9. 대안 접근법: 단일 창 Split View

듀얼 모니터가 없는 경우를 위한 대안

```
┌──────────────────────────────────────────────────────────┐
│  [문제-해설 매칭] 수학의바이블                            │
├─────────────────────────┬────────────────────────────────┤
│  📝 문제 (15/200)       │  📖 해설 (42/150)              │
│                         │                                │
│  ┌───────────────────┐  │  ┌────────────────────────┐   │
│  │ 3번 문제 [선택됨] │  │  │ 3번 해설               │   │
│  │                   │  │  │                        │   │
│  └───────────────────┘  │  └────────────────────────┘   │
│                         │                                │
│  ┌───────────────────┐  │  [◀ 이전] [매칭 ✓] [다음 ▶]  │
│  │ 4번 문제          │  │                                │
│  └───────────────────┘  │  진행: 15/20 (75%)            │
├─────────────────────────┴────────────────────────────────┤
│  드래그로 분할 비율 조절 가능 ═══════════════════════════ │
└──────────────────────────────────────────────────────────┘
```

**장점**:
- 싱글 모니터에서도 사용 가능
- 구현이 더 간단
- 동기화 이슈 없음

**단점**:
- 화면 공간 제약
- 듀얼 모니터의 장점 활용 불가

---

## 10. 구현 로드맵

### Phase 22-A: 기반 인프라 (2-3시간)
- [ ] BroadcastChannel 기반 useSyncChannel 훅
- [ ] 세션 관리 (생성, 복구)
- [ ] 창 역할 선택 UI

### Phase 22-B: 매칭 UI (3-4시간)
- [ ] 문제/해설 선택 하이라이트
- [ ] 매칭 확인 모달
- [ ] 매칭 완료 토스트
- [ ] 진행 상황 표시

### Phase 22-C: 백엔드 API (1-2시간)
- [ ] 매칭 저장 API
- [ ] 매칭 조회 API
- [ ] 매칭 삭제 API

### Phase 22-D: 고급 기능 (2시간)
- [ ] 키보드 단축키
- [ ] 자동 스크롤/포커스
- [ ] 매칭 현황 대시보드
- [ ] 내보내기 통합

---

## 11. 결론 및 권장사항

### 11.1 권장 접근법

**BroadcastChannel API + 토스 스타일 UX**를 권장합니다.

이유:
1. 추가 서버 인프라 불필요
2. 실시간 양방향 통신 가능
3. 구현 복잡도 낮음
4. 토스 스타일 UX로 직관적 사용성

### 11.2 구현 우선순위

```
1순위: 듀얼 윈도우 동기화 (핵심 기능)
2순위: 토스 스타일 매칭 UI
3순위: 단일 창 Split View (대안)
4순위: 협업 기능 (WebSocket, 선택적)
```

### 11.3 예상 결과

- **작업 효율**: 문제/해설 각각 라벨링 → 한 번에 매칭으로 50% 시간 절약
- **실수 감소**: 시각적 연결 표시로 오매칭 방지
- **사용성**: 토스 스타일 UX로 학습 곡선 최소화

---

*Phase 22 Research Report*
*작성: Claude Code (Opus)*
