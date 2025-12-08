# Phase 22: 문제-해설 자동 매칭 시스템

**개발 계획서**
**작성일**: 2025-12-02
**핵심 컨셉**: 라벨링 = 매칭 (Labeling is Matching)

---

## 1. 핵심 아이디어

### 기존 방식 (3단계)
```
1️⃣ 문제 PDF 전체 라벨링
2️⃣ 해설 PDF 전체 라벨링
3️⃣ 매칭 모드에서 하나씩 연결
```

### 새로운 방식 (1단계)
```
🔄 문제 라벨링 → 해설 라벨링 → 자동 매칭! (반복)
```

**"해설 창에서 라벨링하면 직전에 문제 창에서 라벨링한 것과 자동 매칭"**

---

## 2. 사용자 워크플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                        듀얼 모니터 작업 흐름                          │
├──────────────────────────────┬──────────────────────────────────────┤
│      [모니터 1: 문제 창]      │       [모니터 2: 해설 창]             │
├──────────────────────────────┼──────────────────────────────────────┤
│                              │                                      │
│  1️⃣ 3번 문제 드래그 선택     │                                      │
│     → 그룹 생성              │                                      │
│     → "3번" 자동 번호 부여    │  ← ─ ─ "3번 문제 대기중" 표시        │
│                              │                                      │
│                              │  2️⃣ 3번 해설 드래그 선택             │
│                              │     → 그룹 생성                      │
│  ✅ 3번 매칭 완료!  ─ ─ ─ ─ ▶│     → 자동으로 3번 문제와 매칭       │
│                              │     ✅ 3번 매칭 완료!                 │
│                              │                                      │
│  3️⃣ 4번 문제 드래그 선택     │                                      │
│     → 그룹 생성              │                                      │
│     → "4번" 자동 번호 부여    │  ← ─ ─ "4번 문제 대기중" 표시        │
│                              │                                      │
│         ... 반복 ...         │         ... 반복 ...                 │
│                              │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

---

## 3. 개발 단계

### Phase 22-A: 듀얼 윈도우 인프라 (2시간)

#### 목표
- BroadcastChannel 기반 창 간 통신
- 매칭 세션 생성 및 관리

#### 구현 내용

**1. useSyncChannel 훅**
```typescript
// frontend/src/hooks/useSyncChannel.ts

interface SyncMessage {
  type: 'WINDOW_JOINED' | 'PROBLEM_LABELED' | 'SOLUTION_LABELED' | 'MATCH_CREATED';
  payload: any;
  timestamp: number;
  windowId: string;
}

export function useSyncChannel(sessionId: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowId = useRef(crypto.randomUUID());

  // 채널 연결
  useEffect(() => {
    const channel = new BroadcastChannel(`matching-${sessionId}`);
    channelRef.current = channel;

    // 참여 알림
    channel.postMessage({
      type: 'WINDOW_JOINED',
      payload: { windowId: windowId.current },
      timestamp: Date.now()
    });

    return () => channel.close();
  }, [sessionId]);

  const send = (type: string, payload: any) => {
    channelRef.current?.postMessage({
      type,
      payload,
      timestamp: Date.now(),
      windowId: windowId.current
    });
  };

  return { send, windowId: windowId.current };
}
```

**2. 세션 URL 구조**
```
/labeling/{documentId}?session={sessionId}&role={problem|solution}

예시:
- 문제 창: /labeling/math_bible?session=abc123&role=problem
- 해설 창: /labeling/math_bible_answer?session=abc123&role=solution
```

#### 파일 목록
- [ ] `frontend/src/hooks/useSyncChannel.ts` - 신규
- [ ] `frontend/src/hooks/useMatchingSession.ts` - 신규
- [ ] `frontend/src/types/matching.ts` - 신규

---

### Phase 22-B: 창 역할 시스템 (2시간)

#### 목표
- 문제 창 / 해설 창 역할 구분
- 역할 선택 UI
- 역할에 따른 UI 차별화

#### 구현 내용

**1. 역할 선택 모달**
```tsx
// frontend/src/components/matching/RoleSelector.tsx

export function RoleSelector({ sessionId, onRoleSelected }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg">
        <h2 className="text-xl font-bold text-center mb-2">
          창 역할 선택
        </h2>
        <p className="text-grey-500 text-center mb-6">
          듀얼 모니터에서 각 창의 역할을 지정하세요
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onRoleSelected('problem')}
            className="p-6 border-2 rounded-xl hover:border-blue-500
                       hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-4xl mb-2">📝</div>
            <div className="font-semibold">문제 창</div>
            <div className="text-sm text-grey-500 mt-1">
              문제 PDF를 라벨링합니다
            </div>
          </button>

          <button
            onClick={() => onRoleSelected('solution')}
            className="p-6 border-2 rounded-xl hover:border-green-500
                       hover:bg-green-50 transition-all text-center"
          >
            <div className="text-4xl mb-2">📖</div>
            <div className="font-semibold">해설 창</div>
            <div className="text-sm text-grey-500 mt-1">
              해설 PDF를 라벨링합니다
            </div>
          </button>
        </div>

        <div className="mt-6 p-4 bg-grey-50 rounded-lg">
          <p className="text-sm text-grey-600">
            <strong>세션 ID:</strong> {sessionId}
          </p>
          <p className="text-xs text-grey-400 mt-1">
            다른 창에서 같은 세션 ID로 접속하면 자동 연결됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
```

**2. 역할별 UI 표시**
```tsx
// 문제 창 헤더
<header className="bg-blue-600 text-white px-4 py-2">
  📝 문제 창 | 세션: {sessionId}
</header>

// 해설 창 헤더
<header className="bg-green-600 text-white px-4 py-2">
  📖 해설 창 | 세션: {sessionId} | 대기중: 3번 문제
</header>
```

#### 파일 목록
- [ ] `frontend/src/components/matching/RoleSelector.tsx` - 신규
- [ ] `frontend/src/components/matching/MatchingHeader.tsx` - 신규
- [ ] `frontend/src/pages/PageViewer.tsx` - 수정 (역할 시스템 통합)

---

### Phase 22-C: 자동 매칭 로직 (3시간) ⭐ 핵심

#### 목표
- 문제 라벨링 시 "대기 상태" 생성
- 해설 라벨링 시 자동으로 대기 중인 문제와 매칭
- 매칭 완료 알림

#### 구현 내용

**1. 매칭 상태 관리**
```typescript
// frontend/src/hooks/useAutoMatching.ts

interface PendingProblem {
  problemNumber: string;
  groupId: string;
  documentId: string;
  pageIndex: number;
  createdAt: number;
}

interface MatchedPair {
  matchId: string;
  problem: PendingProblem;
  solution: {
    groupId: string;
    documentId: string;
    pageIndex: number;
  };
  matchedAt: number;
}

export function useAutoMatching(sessionId: string, role: 'problem' | 'solution') {
  const [pendingProblems, setPendingProblems] = useState<PendingProblem[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<MatchedPair[]>([]);
  const { send, subscribe } = useSyncChannel(sessionId);

  // 문제 창: 그룹 생성 시 호출
  const onProblemLabeled = useCallback((group: ProblemGroup) => {
    if (role !== 'problem') return;

    const pending: PendingProblem = {
      problemNumber: group.problemInfo?.problemNumber || '',
      groupId: group.id,
      documentId: currentDocumentId,
      pageIndex: currentPage,
      createdAt: Date.now()
    };

    // 로컬 상태 업데이트
    setPendingProblems(prev => [...prev, pending]);

    // 다른 창에 알림
    send('PROBLEM_LABELED', pending);
  }, [role, send]);

  // 해설 창: 그룹 생성 시 호출
  const onSolutionLabeled = useCallback((group: ProblemGroup) => {
    if (role !== 'solution') return;

    // 가장 오래된 대기 중인 문제와 매칭
    const oldestPending = pendingProblems[0];
    if (!oldestPending) {
      // 대기 중인 문제 없음 - 경고 표시
      showToast('매칭할 문제가 없습니다. 문제 창에서 먼저 라벨링하세요.', 'warning');
      return;
    }

    const match: MatchedPair = {
      matchId: crypto.randomUUID(),
      problem: oldestPending,
      solution: {
        groupId: group.id,
        documentId: currentDocumentId,
        pageIndex: currentPage
      },
      matchedAt: Date.now()
    };

    // 상태 업데이트
    setPendingProblems(prev => prev.slice(1));  // 첫 번째 제거
    setMatchedPairs(prev => [...prev, match]);

    // 다른 창에 알림
    send('MATCH_CREATED', match);

    // 토스트 표시
    showToast(`${oldestPending.problemNumber}번 문제-해설 매칭 완료!`, 'success');
  }, [role, pendingProblems, send]);

  // 다른 창에서 온 메시지 처리
  useEffect(() => {
    return subscribe((message) => {
      switch (message.type) {
        case 'PROBLEM_LABELED':
          // 해설 창에서 대기 목록에 추가
          if (role === 'solution') {
            setPendingProblems(prev => [...prev, message.payload]);
          }
          break;

        case 'MATCH_CREATED':
          // 문제 창에서 매칭 결과 반영
          if (role === 'problem') {
            setPendingProblems(prev =>
              prev.filter(p => p.groupId !== message.payload.problem.groupId)
            );
            setMatchedPairs(prev => [...prev, message.payload]);
          }
          break;
      }
    });
  }, [role, subscribe]);

  return {
    pendingProblems,
    matchedPairs,
    onProblemLabeled,
    onSolutionLabeled,
    nextPendingNumber: pendingProblems[0]?.problemNumber || null
  };
}
```

**2. PageViewer 통합**
```tsx
// frontend/src/pages/PageViewer.tsx (수정)

export function PageViewer() {
  const { sessionId, role } = useMatchingSession();
  const {
    pendingProblems,
    onProblemLabeled,
    onSolutionLabeled,
    nextPendingNumber
  } = useAutoMatching(sessionId, role);

  // 기존 handleCreateGroup 수정
  const handleCreateGroup = useCallback(() => {
    // ... 기존 그룹 생성 로직 ...

    const newGroup = createGroup(selectedBlocks);

    // 역할에 따라 매칭 로직 실행
    if (role === 'problem') {
      onProblemLabeled(newGroup);
    } else if (role === 'solution') {
      onSolutionLabeled(newGroup);
    }
  }, [role, onProblemLabeled, onSolutionLabeled]);

  return (
    <div>
      {/* 매칭 모드 헤더 */}
      {sessionId && (
        <MatchingHeader
          role={role}
          sessionId={sessionId}
          pendingCount={pendingProblems.length}
          nextPendingNumber={nextPendingNumber}
        />
      )}

      {/* 기존 라벨링 UI */}
      ...
    </div>
  );
}
```

#### 파일 목록
- [ ] `frontend/src/hooks/useAutoMatching.ts` - 신규
- [ ] `frontend/src/pages/PageViewer.tsx` - 수정
- [ ] `frontend/src/components/GroupPanel.tsx` - 수정 (매칭 상태 표시)

---

### Phase 22-D: 매칭 시각화 및 관리 (2시간)

#### 목표
- 대기 중인 문제 표시
- 매칭 완료 목록
- 매칭 취소/수정 기능

#### 구현 내용

**1. 매칭 상태 패널**
```tsx
// frontend/src/components/matching/MatchingStatusPanel.tsx

export function MatchingStatusPanel({
  role,
  pendingProblems,
  matchedPairs,
  onCancelMatch
}) {
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-xl shadow-lg
                    border overflow-hidden">
      {/* 헤더 */}
      <div className={`px-4 py-3 ${
        role === 'problem' ? 'bg-blue-600' : 'bg-green-600'
      } text-white`}>
        <h3 className="font-semibold">
          {role === 'problem' ? '📝 문제 창' : '📖 해설 창'}
        </h3>
      </div>

      {/* 대기 중인 문제 (해설 창에서만) */}
      {role === 'solution' && pendingProblems.length > 0 && (
        <div className="p-3 bg-orange-50 border-b">
          <div className="text-sm font-medium text-orange-700">
            대기 중인 문제
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {pendingProblems.map(p => (
              <span
                key={p.groupId}
                className="px-2 py-1 bg-orange-200 text-orange-800
                           rounded text-sm font-mono"
              >
                {p.problemNumber}번
              </span>
            ))}
          </div>
          <div className="text-xs text-orange-600 mt-2">
            → 해설을 라벨링하면 <strong>{pendingProblems[0].problemNumber}번</strong>과 매칭됩니다
          </div>
        </div>
      )}

      {/* 매칭 완료 목록 */}
      <div className="p-3 max-h-48 overflow-y-auto">
        <div className="text-sm font-medium text-grey-600 mb-2">
          매칭 완료 ({matchedPairs.length}개)
        </div>
        {matchedPairs.length === 0 ? (
          <div className="text-sm text-grey-400 text-center py-4">
            아직 매칭된 항목이 없습니다
          </div>
        ) : (
          <div className="space-y-1">
            {matchedPairs.map(pair => (
              <div
                key={pair.matchId}
                className="flex items-center justify-between p-2
                           bg-green-50 rounded text-sm"
              >
                <span className="text-green-700">
                  ✅ {pair.problem.problemNumber}번 문제-해설
                </span>
                <button
                  onClick={() => onCancelMatch(pair.matchId)}
                  className="text-grey-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 진행률 */}
      <div className="px-3 py-2 bg-grey-50 border-t">
        <div className="flex justify-between text-xs text-grey-500">
          <span>진행률</span>
          <span>{matchedPairs.length}개 완료</span>
        </div>
        <div className="mt-1 h-1.5 bg-grey-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(matchedPairs.length / 20) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**2. 그룹 패널에 매칭 상태 표시**
```tsx
// GroupPanel의 각 그룹 아이템에 매칭 상태 표시

<div className="flex items-center gap-2">
  <span>{group.problemInfo?.problemNumber}번</span>
  {matchedPairs.some(m => m.problem.groupId === group.id) && (
    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
      해설 연결됨
    </span>
  )}
</div>
```

#### 파일 목록
- [ ] `frontend/src/components/matching/MatchingStatusPanel.tsx` - 신규
- [ ] `frontend/src/components/GroupPanel.tsx` - 수정

---

### Phase 22-E: 백엔드 API 및 저장 (2시간)

#### 목표
- 매칭 데이터 저장 API
- 매칭 조회/삭제 API
- 데이터 영속성

#### 구현 내용

**1. 데이터 모델**
```python
# backend/app/models/matching.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MatchingSession(BaseModel):
    """매칭 세션"""
    session_id: str
    problem_document_id: str
    solution_document_id: str
    created_at: datetime
    status: str = "in_progress"  # in_progress, completed

class ProblemSolutionMatch(BaseModel):
    """문제-해설 매칭"""
    match_id: str
    session_id: str

    # 문제 정보
    problem_document_id: str
    problem_page_index: int
    problem_group_id: str
    problem_number: str

    # 해설 정보
    solution_document_id: str
    solution_page_index: int
    solution_group_id: str

    created_at: datetime

class MatchingSessionDetail(BaseModel):
    """세션 상세 정보"""
    session: MatchingSession
    matches: List[ProblemSolutionMatch]
    total_matches: int
```

**2. API 라우터**
```python
# backend/app/routers/matching.py

from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/matching", tags=["matching"])

@router.post("/sessions")
async def create_session(
    problem_document_id: str,
    solution_document_id: str
) -> dict:
    """새 매칭 세션 생성"""
    session_id = str(uuid.uuid4())[:8]
    session = MatchingSession(
        session_id=session_id,
        problem_document_id=problem_document_id,
        solution_document_id=solution_document_id,
        created_at=datetime.now()
    )
    # 저장
    save_session(session)
    return {"session_id": session_id, "message": "세션 생성됨"}

@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> MatchingSessionDetail:
    """세션 상세 조회"""
    session = load_session(session_id)
    if not session:
        raise HTTPException(404, "세션을 찾을 수 없습니다")
    matches = load_matches(session_id)
    return MatchingSessionDetail(
        session=session,
        matches=matches,
        total_matches=len(matches)
    )

@router.post("/sessions/{session_id}/matches")
async def create_match(
    session_id: str,
    match_data: ProblemSolutionMatch
) -> dict:
    """매칭 생성"""
    match_data.session_id = session_id
    match_data.match_id = str(uuid.uuid4())
    match_data.created_at = datetime.now()
    save_match(match_data)
    return {"match_id": match_data.match_id, "message": "매칭 저장됨"}

@router.delete("/sessions/{session_id}/matches/{match_id}")
async def delete_match(session_id: str, match_id: str) -> dict:
    """매칭 삭제"""
    delete_match_by_id(session_id, match_id)
    return {"message": "매칭 삭제됨"}

@router.get("/sessions/{session_id}/export")
async def export_matches(session_id: str) -> dict:
    """매칭된 문제-해설 내보내기"""
    matches = load_matches(session_id)
    # 각 매칭에 대해 문제+해설 이미지 결합
    exported = []
    for match in matches:
        exported.append({
            "problem_number": match.problem_number,
            "problem_image": get_group_image(
                match.problem_document_id,
                match.problem_page_index,
                match.problem_group_id
            ),
            "solution_image": get_group_image(
                match.solution_document_id,
                match.solution_page_index,
                match.solution_group_id
            )
        })
    return {"matches": exported, "total": len(exported)}
```

**3. 저장 구조**
```
dataset_root/
├── matching_sessions/
│   ├── {session_id}/
│   │   ├── session.json        # 세션 정보
│   │   └── matches.json        # 매칭 목록
```

#### 파일 목록
- [ ] `backend/app/models/matching.py` - 신규
- [ ] `backend/app/routers/matching.py` - 신규
- [ ] `backend/app/main.py` - 수정 (라우터 등록)
- [ ] `frontend/src/api/client.ts` - 수정 (API 함수 추가)

---

## 4. UI/UX 상세 설계

### 4.1 매칭 모드 진입 플로우

```
┌─────────────────────────────────────────────────────────────────┐
│                        등록 페이지                               │
│                                                                 │
│   [일반 라벨링]              [문제-해설 매칭 모드] ← 새 버튼     │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ 클릭
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     매칭 세션 설정 모달                          │
│                                                                 │
│   문제 PDF 선택: [수학의바이블_문제편 ▼]                         │
│   해설 PDF 선택: [수학의바이블_해설편 ▼]                         │
│                                                                 │
│   세션 ID: abc123 (자동 생성)                                   │
│                                                                 │
│           [취소]                    [시작하기]                   │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ 시작
                                ▼
┌──────────────────────┐       ┌──────────────────────┐
│  새 창 1: 문제 창     │       │  새 창 2: 해설 창     │
│  자동으로 열림        │       │  자동으로 열림        │
└──────────────────────┘       └──────────────────────┘
```

### 4.2 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Enter` | 선택한 블록으로 그룹 생성 (매칭 트리거) |
| `Esc` | 선택 취소 |
| `Ctrl+Z` | 마지막 매칭 취소 |
| `Tab` | 다음 문제로 포커스 이동 |

### 4.3 토스트 메시지

```typescript
const toasts = {
  problemLabeled: (num: string) =>
    `📝 ${num}번 문제 라벨링 완료! 해설 창에서 계속하세요.`,

  solutionMatched: (num: string) =>
    `✅ ${num}번 문제-해설 매칭 완료!`,

  noWaitingProblem:
    `⚠️ 대기 중인 문제가 없습니다. 문제 창에서 먼저 라벨링하세요.`,

  matchCancelled: (num: string) =>
    `${num}번 매칭이 취소되었습니다.`
};
```

---

## 5. 예상 일정

| Phase | 내용 | 예상 시간 | 의존성 |
|-------|------|-----------|--------|
| 22-A | 듀얼 윈도우 인프라 | 2시간 | 없음 |
| 22-B | 창 역할 시스템 | 2시간 | 22-A |
| 22-C | 자동 매칭 로직 | 3시간 | 22-A, 22-B |
| 22-D | 매칭 시각화 | 2시간 | 22-C |
| 22-E | 백엔드 API | 2시간 | 22-C |

**총 예상 시간: 11시간**

---

## 6. 테스트 시나리오

### 시나리오 1: 기본 매칭 플로우
```
1. 매칭 모드 시작 (문제 PDF, 해설 PDF 선택)
2. 문제 창, 해설 창 두 개 열림 확인
3. 문제 창에서 1번 문제 라벨링
4. 해설 창에 "1번 대기중" 표시 확인
5. 해설 창에서 1번 해설 라벨링
6. 양쪽 창에 "1번 매칭 완료" 토스트 확인
7. 매칭 패널에 완료 목록 표시 확인
```

### 시나리오 2: 순서 건너뛰기
```
1. 문제 창에서 1번, 2번, 3번 연속 라벨링
2. 해설 창에 "1번, 2번, 3번 대기중" 표시
3. 해설 창에서 1번 해설 라벨링 → 1번 매칭
4. 해설 창에서 2번 해설 라벨링 → 2번 매칭
5. FIFO 순서대로 매칭 확인
```

### 시나리오 3: 매칭 취소
```
1. 3번 문제-해설 매칭 완료 상태
2. 매칭 패널에서 3번 매칭 삭제 클릭
3. 3번 문제가 다시 "대기 중" 상태로
4. 다시 해설 라벨링 가능
```

---

## 7. 향후 확장 가능성

### 7.1 수동 매칭 모드
순서대로가 아닌 수동으로 매칭 (예: 문제 3번 ↔ 해설 5번)

### 7.2 일괄 매칭
문제 전체 라벨링 완료 후, 해설 전체 라벨링 완료 후 자동 번호 매칭

### 7.3 AI 자동 매칭 제안
OCR로 문제 번호 인식 → 자동 매칭 제안

---

*Phase 22 Development Plan*
*작성: Claude Code (Opus)*
