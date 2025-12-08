# Phase 22-J: 문제-해설 영구 페어링 시스템 분석

## 📋 요청 기능 요약

| 번호 | 기능 | 설명 |
|------|------|------|
| 1 | **영구 페어링** | 문제-해설 문서를 한번 묶으면 풀기 전까지 계속 연결 |
| 2 | **원클릭 듀얼 실행** | 페어링된 문서 클릭 시 바로 듀얼 윈도우로 라벨링 |
| 3 | **문제창 전용 사이드패널** | 문제창에만 오른쪽 사이드패널 표시 |
| 4 | **자동 명명** | 해설 라벨링 시 문제명 + "[해설]" 자동 적용 |
| 5 | **관계 표시** | 매칭된 문제-해설 쌍의 관계를 시각적으로 표시 |

---

## 🔍 현재 상태 분석

### 현재 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                        현재 듀얼 윈도우 시스템                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [DualUploadCard]                                                   │
│       │                                                             │
│       ├── 문제 PDF 선택 (업로드 또는 기존)                            │
│       ├── 해설 PDF 선택 (업로드 또는 기존)                            │
│       └── "듀얼 윈도우로 매칭 시작" 클릭                              │
│              │                                                      │
│              ▼                                                      │
│  [세션 생성] - localStorage에 임시 저장                              │
│              │                                                      │
│              ├───────────────────────┐                              │
│              ▼                       ▼                              │
│  [문제 창 - ViewerPage]      [해설 창 - ViewerPage]                  │
│  - PageViewer                - PageViewer                           │
│  - GroupPanel (사이드)       - GroupPanel (사이드)  ← 둘 다 있음     │
│  - MatchingHeader            - MatchingHeader                       │
│              │                       │                              │
│              └───────────────────────┘                              │
│                         │                                           │
│                         ▼                                           │
│  [BroadcastChannel 통신] - WINDOW_JOINED, PROBLEM_LABELED 등        │
│                                                                     │
│  ⚠️ 문제점:                                                         │
│  - 세션은 임시 (브라우저 닫으면 사라짐)                              │
│  - 매번 두 문서를 다시 선택해야 함                                   │
│  - 관계 정보가 영구 저장되지 않음                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 관련 파일

| 파일 | 역할 |
|------|------|
| `useDualWindowLauncher.ts` | 듀얼 윈도우 실행 로직 |
| `useMatchingSession.ts` | 세션 관리 (localStorage) |
| `useSyncChannel.ts` | 창 간 통신 |
| `useAutoMatching.ts` | 문제-해설 매칭 로직 |
| `PageViewer.tsx` | 페이지 뷰어 (GroupPanel 포함) |
| `GroupPanel.tsx` | 우측 사이드패널 |

---

## 🎯 기능별 구현 가능성 분석

### 1. 영구 페어링 (High Feasibility, Medium Effort)

#### 필요한 변경

**백엔드 (데이터베이스)**:
```python
# 새 테이블: document_pairs
class DocumentPair(Base):
    __tablename__ = "document_pairs"

    id = Column(String, primary_key=True)
    problem_document_id = Column(String, ForeignKey("documents.document_id"))
    solution_document_id = Column(String, ForeignKey("documents.document_id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")  # active, archived

    # 관계
    problem_document = relationship("Document", foreign_keys=[problem_document_id])
    solution_document = relationship("Document", foreign_keys=[solution_document_id])
```

**백엔드 (API)**:
```python
# routers/document_pairs.py
@router.post("/pairs")
async def create_pair(data: CreatePairRequest) -> DocumentPair:
    """문서 페어 생성"""

@router.get("/pairs")
async def list_pairs(status: str = "active") -> List[DocumentPair]:
    """페어 목록 조회"""

@router.delete("/pairs/{pair_id}")
async def unlink_pair(pair_id: str) -> dict:
    """페어 해제"""
```

**프론트엔드**:
```typescript
// hooks/useDocumentPairs.ts
export function useDocumentPairs() {
  // 페어 목록 조회
  const { data: pairs } = useQuery(['document-pairs'], api.listPairs);

  // 페어 생성
  const createPair = useMutation(api.createPair);

  // 페어 해제
  const unlinkPair = useMutation(api.unlinkPair);

  return { pairs, createPair, unlinkPair };
}
```

#### 복잡도: ⭐⭐⭐ (Medium)

- 데이터베이스 마이그레이션 필요
- 새 API 엔드포인트 3개
- 새 React 훅 1개

---

### 2. 원클릭 듀얼 실행 (High Feasibility, Low Effort)

#### 필요한 변경

**UI 컴포넌트**:
```typescript
// components/DocumentPairCard.tsx
interface DocumentPairCardProps {
  pair: DocumentPair;
  onLaunch: () => void;
  onUnlink: () => void;
}

export function DocumentPairCard({ pair, onLaunch, onUnlink }: DocumentPairCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <div className="font-medium">{pair.problem_document.name}</div>
        <div className="text-sm text-grey-500">↔ {pair.solution_document.name}</div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onLaunch}>
          <Play className="w-4 h-4 mr-1" />
          듀얼 라벨링
        </Button>
        <Button variant="ghost" onClick={onUnlink}>
          <Unlink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

**실행 로직 (기존 활용)**:
```typescript
// 기존 launchDualWindows 재사용
const handleLaunch = () => {
  launchDualWindows({
    problemDocId: pair.problem_document_id,
    solutionDocId: pair.solution_document_id,
    mode: 'dual'
  });
};
```

#### 복잡도: ⭐⭐ (Low)

- 기존 `launchDualWindows` 로직 재사용
- 새 UI 컴포넌트 1개
- RegistrationPage에 섹션 추가

---

### 3. 문제창 전용 사이드패널 (High Feasibility, Low Effort)

#### 필요한 변경

```typescript
// PageViewer.tsx 수정
export function PageViewer({ documentId, totalPages }: PageViewerProps) {
  const { role } = useMatchingSession();

  // Phase 22-J: 해설 창에서는 사이드패널 숨김
  const showSidePanel = !isMatchingMode || role === 'problem';

  return (
    <div className="flex">
      {/* 메인 콘텐츠 */}
      <div className={showSidePanel ? 'flex-1' : 'w-full'}>
        <PageCanvas ... />
      </div>

      {/* 사이드패널 - 문제창에서만 표시 */}
      {showSidePanel && (
        <div className="w-80 border-l">
          <GroupPanel ... />
        </div>
      )}
    </div>
  );
}
```

#### 복잡도: ⭐ (Very Low)

- PageViewer.tsx에 조건부 렌더링 추가
- 기존 role 정보 활용
- 변경 최소화

---

### 4. 자동 명명 (High Feasibility, Low Effort)

#### 필요한 변경

```typescript
// useAutoMatching.ts 수정
const onSolutionLabeled = useCallback((group: ProblemGroup) => {
  if (role !== 'solution' || !sessionId) return;

  const oldestPending = pendingRef.current[0];
  if (!oldestPending) {
    showToast?.('매칭할 문제가 없습니다.', 'warning');
    return;
  }

  // Phase 22-J: 자동 명명 - 문제명 + "[해설]"
  const solutionName = `${oldestPending.problemNumber} [해설]`;

  // 그룹 정보 업데이트 API 호출
  await api.updateGroup(documentId, group.id, {
    problemInfo: {
      ...group.problemInfo,
      problemNumber: solutionName
    }
  });

  // 매칭 생성
  const match: ProblemSolutionMatch = {
    matchId: `match-${Date.now()}`,
    sessionId,
    problem: oldestPending,
    solution: {
      groupId: group.id,
      documentId,
      pageIndex: currentPage,
      problemNumber: solutionName  // 새 필드
    },
    matchedAt: Date.now()
  };

  // ... 나머지 로직
}, [role, sessionId, documentId, currentPage, send, showToast]);
```

#### 복잡도: ⭐ (Very Low)

- 문자열 조합만 필요
- 기존 API 활용 (updateGroup)
- 변경 최소화

---

### 5. 관계 표시 (High Feasibility, Medium Effort)

#### 필요한 변경

**데이터 구조 확장**:
```typescript
// types/matching.ts 확장
interface ProblemGroup {
  // ... 기존 필드
  linkedSolutionGroupId?: string;  // 연결된 해설 그룹 ID
  linkedProblemGroupId?: string;   // 연결된 문제 그룹 ID (해설에서)
}
```

**UI 컴포넌트**:
```typescript
// components/LinkedBadge.tsx
export function LinkedBadge({ type, linkedName }: { type: 'problem' | 'solution', linkedName: string }) {
  return (
    <div className={`text-xs px-2 py-0.5 rounded ${
      type === 'problem' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
    }`}>
      <Link2 className="w-3 h-3 inline mr-1" />
      {type === 'problem' ? '해설:' : '문제:'} {linkedName}
    </div>
  );
}

// GroupPanel.tsx에서 사용
{group.linkedSolutionGroupId && (
  <LinkedBadge type="problem" linkedName={group.linkedSolutionName} />
)}
```

**시각적 표현 옵션**:

```
옵션 A: 배지 표시
┌──────────────────────────────┐
│ 1번 문제                      │
│ ┌─────────────────────────┐  │
│ │ 🔗 해설: 1번 [해설]      │  │
│ └─────────────────────────┘  │
└──────────────────────────────┘

옵션 B: 색상 구분 + 아이콘
┌──────────────────────────────┐
│ 🔵 1번 문제          🔗 연결 │
└──────────────────────────────┘
┌──────────────────────────────┐
│ 🟢 1번 [해설]        🔗 연결 │
└──────────────────────────────┘

옵션 C: 그룹화 표시
┌──────────────────────────────┐
│ 매칭 #1                       │
│ ├─ 🔵 1번 문제               │
│ └─ 🟢 1번 [해설]             │
└──────────────────────────────┘
```

#### 복잡도: ⭐⭐⭐ (Medium)

- 데이터 구조 확장
- 새 UI 컴포넌트
- GroupPanel 수정

---

## 📊 종합 분석

### 구현 우선순위 권장

| 순위 | 기능 | 노력 | 영향도 | 의존성 |
|------|------|------|--------|--------|
| 1 | 문제창 전용 사이드패널 | ⭐ | 높음 | 없음 |
| 2 | 자동 명명 | ⭐ | 높음 | 없음 |
| 3 | 관계 표시 | ⭐⭐⭐ | 중간 | 자동 명명 |
| 4 | 영구 페어링 | ⭐⭐⭐ | 높음 | 없음 |
| 5 | 원클릭 듀얼 실행 | ⭐⭐ | 높음 | 영구 페어링 |

### 구현 Phase 제안

```
Phase 22-J: Quick Wins (즉시 구현 가능)
├── J-1: 문제창 전용 사이드패널
└── J-2: 자동 명명 ([해설] 접미사)

Phase 22-K: 관계 시각화
├── K-1: 데이터 구조 확장 (linkedGroupId)
├── K-2: LinkedBadge 컴포넌트
└── K-3: GroupPanel 업데이트

Phase 22-L: 영구 페어링 시스템
├── L-1: 백엔드 - document_pairs 테이블
├── L-2: 백엔드 - API 엔드포인트
├── L-3: 프론트엔드 - useDocumentPairs 훅
└── L-4: 프론트엔드 - DocumentPairCard UI

Phase 22-M: 원클릭 듀얼 실행
├── M-1: RegistrationPage에 "페어링된 문서" 섹션
└── M-2: 원클릭 실행 버튼 연결
```

### 예상 개발 시간

| Phase | 예상 시간 | 비고 |
|-------|----------|------|
| 22-J | 1-2시간 | 프론트엔드만 |
| 22-K | 2-3시간 | 프론트엔드 + 타입 |
| 22-L | 4-6시간 | 백엔드 + 프론트엔드 |
| 22-M | 1-2시간 | 프론트엔드만 |
| **총계** | **8-13시간** | |

---

## ⚠️ 고려사항 및 리스크

### 1. 데이터 일관성

```
문제 상황:
- 페어링된 문서 중 하나가 삭제되면?
- 매칭된 그룹이 수정되면?
- 세션 중 연결이 끊기면?

해결 방안:
- 문서 삭제 시 페어 자동 해제 (CASCADE)
- 그룹 수정 시 연결된 그룹도 알림
- 세션 복구 메커니즘 (이미 구현됨)
```

### 2. UI/UX 복잡도

```
현재: 단순한 듀얼 윈도우
제안: 페어링 + 관계 + 자동화

권장:
- 점진적 기능 추가
- 사용자 피드백 수집
- 필요 시 설정으로 끄기 가능하게
```

### 3. 기존 데이터 마이그레이션

```
기존 사용자가 이미 라벨링한 문서들:
- 자동 페어링 제안 기능?
- 수동 페어링 UI 제공
```

---

## ✅ 결론

**모든 요청 기능이 구현 가능합니다.**

| 기능 | 구현 가능성 | 권장 순위 |
|------|------------|----------|
| 영구 페어링 | ✅ High | 4 |
| 원클릭 듀얼 실행 | ✅ High | 5 |
| 문제창 전용 사이드패널 | ✅ High | 1 (가장 쉬움) |
| 자동 명명 | ✅ High | 2 (가장 쉬움) |
| 관계 표시 | ✅ High | 3 |

**권장 접근법**:
1. Phase 22-J에서 즉시 구현 가능한 것들 먼저 (사이드패널, 자동 명명)
2. 사용자 피드백 후 영구 페어링 시스템 구현
3. 점진적으로 기능 확장

---

*작성: Claude Code (Opus)*
*작성일: 2025-12-02*
