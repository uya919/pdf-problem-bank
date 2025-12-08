# Phase 22-J~M: 문제-해설 영구 페어링 시스템 개발 계획

## 📋 개발 개요

| 항목 | 내용 |
|------|------|
| **목표** | 문제-해설 문서 영구 페어링 및 자동화된 듀얼 라벨링 시스템 |
| **예상 총 개발 시간** | 8-13시간 |
| **Phase 구성** | 22-J, 22-K, 22-L, 22-M (4단계) |

---

## 🎯 Phase 22-J: Quick Wins (즉시 구현)

### 예상 시간: 1시간

---

### J-1: 해설 창 사이드패널 숨김

**목표**: 해설 창에서는 GroupPanel(우측 사이드패널)을 숨기고, 문제창에서만 표시

**변경 파일**: `frontend/src/pages/PageViewer.tsx`

**구현 내용**:
```typescript
// PageViewer.tsx

// 1. 사이드패널 표시 여부 결정
const showGroupPanel = useMemo(() => {
  // 매칭 모드가 아니면 항상 표시
  if (!isMatchingMode) return true;
  // 매칭 모드에서는 문제창에서만 표시
  return role === 'problem';
}, [isMatchingMode, role]);

// 2. 레이아웃 조정
return (
  <div className="flex gap-6">
    {/* 메인 콘텐츠 - 사이드패널 없으면 전체 너비 */}
    <div className={showGroupPanel ? 'flex-1' : 'w-full'}>
      {/* PageCanvas, Navigation 등 */}
    </div>

    {/* 사이드패널 - 조건부 렌더링 */}
    {showGroupPanel && (
      <div className="w-80 shrink-0">
        <GroupPanel ... />
      </div>
    )}
  </div>
);
```

**테스트 항목**:
- [ ] 일반 모드: 사이드패널 표시됨
- [ ] 매칭 모드 + 문제창: 사이드패널 표시됨
- [ ] 매칭 모드 + 해설창: 사이드패널 숨겨짐
- [ ] 해설창에서 라벨링 가능 여부 확인

---

### J-2: 자동 명명 시스템 ("[해설]" 접미사)

**목표**: 해설 창에서 라벨링 시 문제명 + " [해설]" 자동 적용

**변경 파일**: `frontend/src/hooks/useAutoMatching.ts`

**구현 내용**:
```typescript
// useAutoMatching.ts

// onSolutionLabeled 함수 수정
const onSolutionLabeled = useCallback(async (group: ProblemGroup) => {
  if (role !== 'solution' || !sessionId) return;

  const oldestPending = pendingRef.current[0];
  if (!oldestPending) {
    showToast?.('매칭할 문제가 없습니다.', 'warning');
    return;
  }

  // Phase 22-J-2: 자동 명명 - 문제명 + " [해설]"
  const solutionName = `${oldestPending.problemNumber} [해설]`;

  // 그룹 정보 업데이트 (서버에 저장)
  try {
    await api.updateGroup(documentId, currentPage, group.id, {
      problemInfo: {
        ...group.problemInfo,
        problemNumber: solutionName
      }
    });
    console.log(`[Phase 22-J-2] Auto-named solution: ${solutionName}`);
  } catch (error) {
    console.error('[Phase 22-J-2] Failed to update solution name:', error);
  }

  // 매칭 생성
  const match: ProblemSolutionMatch = {
    matchId: `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sessionId,
    problem: oldestPending,
    solution: {
      groupId: group.id,
      documentId,
      pageIndex: currentPage,
      solutionName  // 새 필드 추가
    },
    matchedAt: Date.now()
  };

  // ... 나머지 로직
}, [role, sessionId, documentId, currentPage, send, showToast]);
```

**타입 확장** (`types/matching.ts`):
```typescript
export interface SolutionInfo {
  groupId: string;
  documentId: string;
  pageIndex: number;
  solutionName?: string;  // Phase 22-J-2: 해설 이름
}
```

**테스트 항목**:
- [ ] 문제 "1번" 라벨링 → 해설 라벨링 → 해설명 "1번 [해설]" 확인
- [ ] 문제 "수학 3-5" 라벨링 → 해설명 "수학 3-5 [해설]" 확인
- [ ] 서버에 해설 그룹 이름 저장 확인
- [ ] 새로고침 후에도 이름 유지 확인

---

## 🔗 Phase 22-K: 관계 시각화

### 예상 시간: 2-3시간

---

### K-1: 데이터 구조 확장

**목표**: 문제-해설 그룹 간 연결 정보 저장

**변경 파일**:
- `frontend/src/types/matching.ts`
- `frontend/src/api/client.ts`

**타입 확장**:
```typescript
// types/matching.ts

// 그룹 연결 정보
export interface GroupLink {
  linkedGroupId: string;      // 연결된 그룹 ID
  linkedDocumentId: string;   // 연결된 문서 ID
  linkedPageIndex: number;    // 연결된 페이지
  linkType: 'problem' | 'solution';  // 이 그룹이 문제인지 해설인지
  linkedAt: number;           // 연결 시간
}

// ProblemGroup 확장 (기존 타입에 추가)
export interface ProblemGroup {
  // ... 기존 필드
  link?: GroupLink;  // Phase 22-K: 연결 정보
}
```

**API 확장** (`api/client.ts`):
```typescript
// 그룹 연결 API
linkGroups: async (data: {
  problemDocId: string;
  problemPageIndex: number;
  problemGroupId: string;
  solutionDocId: string;
  solutionPageIndex: number;
  solutionGroupId: string;
}): Promise<{ success: boolean }> => {
  return apiClient.post('/api/groups/link', data);
},

unlinkGroup: async (documentId: string, pageIndex: number, groupId: string): Promise<{ success: boolean }> => {
  return apiClient.delete(`/api/documents/${documentId}/pages/${pageIndex}/groups/${groupId}/link`);
}
```

---

### K-2: LinkedBadge 컴포넌트

**목표**: 연결된 그룹임을 시각적으로 표시

**새 파일**: `frontend/src/components/matching/LinkedBadge.tsx`

```typescript
import { Link2, FileText, BookOpen } from 'lucide-react';

interface LinkedBadgeProps {
  linkType: 'problem' | 'solution';
  linkedName: string;
  onNavigate?: () => void;
  onUnlink?: () => void;
}

export function LinkedBadge({ linkType, linkedName, onNavigate, onUnlink }: LinkedBadgeProps) {
  const isProblem = linkType === 'problem';

  return (
    <div className={`
      flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
      ${isProblem ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}
    `}>
      <Link2 className="w-3 h-3" />
      {isProblem ? <BookOpen className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      <span className="font-medium">
        {isProblem ? '해설:' : '문제:'} {linkedName}
      </span>
      {onNavigate && (
        <button
          onClick={onNavigate}
          className="ml-1 hover:underline"
        >
          이동
        </button>
      )}
      {onUnlink && (
        <button
          onClick={onUnlink}
          className="ml-1 text-grey-400 hover:text-red-500"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

---

### K-3: GroupPanel 업데이트

**목표**: 그룹 카드에 연결 정보 표시

**변경 파일**: `frontend/src/components/GroupPanel.tsx`

```typescript
// GroupPanel.tsx 내 그룹 카드 렌더링 부분

{group.link && (
  <LinkedBadge
    linkType={group.link.linkType}
    linkedName={group.link.linkedName}
    onNavigate={() => {
      // 연결된 문서/페이지로 이동 (새 창 또는 탭)
      window.open(
        `/viewer/${group.link.linkedDocumentId}?page=${group.link.linkedPageIndex}`,
        '_blank'
      );
    }}
    onUnlink={() => {
      // 연결 해제 확인
      if (confirm('연결을 해제하시겠습니까?')) {
        api.unlinkGroup(documentId, currentPage, group.id);
      }
    }}
  />
)}
```

**테스트 항목**:
- [ ] 문제 그룹에 "해설: 1번 [해설]" 배지 표시
- [ ] 해설 그룹에 "문제: 1번" 배지 표시
- [ ] "이동" 클릭 시 연결된 문서로 이동
- [ ] "×" 클릭 시 연결 해제

---

## 💾 Phase 22-L: 영구 페어링 시스템 (백엔드)

### 예상 시간: 4-6시간

---

### L-1: 백엔드 - 데이터 모델

**새 파일**: `backend/app/models/document_pair.py`

```python
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class DocumentPair(BaseModel):
    """문서 페어 모델"""
    id: str
    problem_document_id: str
    solution_document_id: str
    created_at: datetime
    status: str = "active"  # active, archived
    last_session_id: Optional[str] = None
    matched_count: int = 0  # 매칭된 문제 수


class CreatePairRequest(BaseModel):
    """페어 생성 요청"""
    problem_document_id: str
    solution_document_id: str


class PairStats(BaseModel):
    """페어 통계"""
    total_pairs: int
    active_pairs: int
    total_matched: int
```

---

### L-2: 백엔드 - 저장소

**새 파일**: `backend/app/services/document_pair_service.py`

```python
import json
import os
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from ..config import get_settings
from ..models.document_pair import DocumentPair, CreatePairRequest

class DocumentPairService:
    """문서 페어 관리 서비스"""

    def __init__(self):
        self.settings = get_settings()
        self.pairs_file = os.path.join(
            self.settings.dataset_root,
            '_system',
            'document_pairs.json'
        )
        self._ensure_file()

    def _ensure_file(self):
        """파일 및 디렉토리 생성"""
        os.makedirs(os.path.dirname(self.pairs_file), exist_ok=True)
        if not os.path.exists(self.pairs_file):
            with open(self.pairs_file, 'w', encoding='utf-8') as f:
                json.dump([], f)

    def _load_pairs(self) -> List[dict]:
        """페어 목록 로드"""
        with open(self.pairs_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_pairs(self, pairs: List[dict]):
        """페어 목록 저장"""
        with open(self.pairs_file, 'w', encoding='utf-8') as f:
            json.dump(pairs, f, ensure_ascii=False, indent=2, default=str)

    def create_pair(self, request: CreatePairRequest) -> DocumentPair:
        """페어 생성"""
        pairs = self._load_pairs()

        # 중복 체크
        for p in pairs:
            if (p['problem_document_id'] == request.problem_document_id and
                p['solution_document_id'] == request.solution_document_id):
                return DocumentPair(**p)

        pair = DocumentPair(
            id=str(uuid4())[:8],
            problem_document_id=request.problem_document_id,
            solution_document_id=request.solution_document_id,
            created_at=datetime.now(),
            status="active"
        )

        pairs.append(pair.dict())
        self._save_pairs(pairs)

        return pair

    def list_pairs(self, status: str = "active") -> List[DocumentPair]:
        """페어 목록 조회"""
        pairs = self._load_pairs()
        return [
            DocumentPair(**p) for p in pairs
            if p.get('status', 'active') == status
        ]

    def get_pair(self, pair_id: str) -> Optional[DocumentPair]:
        """페어 조회"""
        pairs = self._load_pairs()
        for p in pairs:
            if p['id'] == pair_id:
                return DocumentPair(**p)
        return None

    def get_pair_by_documents(
        self,
        problem_doc_id: str,
        solution_doc_id: str
    ) -> Optional[DocumentPair]:
        """문서 ID로 페어 조회"""
        pairs = self._load_pairs()
        for p in pairs:
            if (p['problem_document_id'] == problem_doc_id and
                p['solution_document_id'] == solution_doc_id):
                return DocumentPair(**p)
        return None

    def delete_pair(self, pair_id: str) -> bool:
        """페어 삭제 (또는 archived로 변경)"""
        pairs = self._load_pairs()
        for i, p in enumerate(pairs):
            if p['id'] == pair_id:
                pairs[i]['status'] = 'archived'
                self._save_pairs(pairs)
                return True
        return False

    def update_matched_count(self, pair_id: str, increment: int = 1):
        """매칭 수 업데이트"""
        pairs = self._load_pairs()
        for i, p in enumerate(pairs):
            if p['id'] == pair_id:
                pairs[i]['matched_count'] = p.get('matched_count', 0) + increment
                self._save_pairs(pairs)
                return
```

---

### L-3: 백엔드 - API 라우터

**새 파일**: `backend/app/routers/document_pairs.py`

```python
from fastapi import APIRouter, HTTPException
from typing import List

from ..models.document_pair import (
    DocumentPair,
    CreatePairRequest,
    PairStats
)
from ..services.document_pair_service import DocumentPairService

router = APIRouter(prefix="/api/document-pairs", tags=["document-pairs"])
service = DocumentPairService()


@router.post("", response_model=DocumentPair)
async def create_pair(request: CreatePairRequest):
    """문서 페어 생성"""
    return service.create_pair(request)


@router.get("", response_model=List[DocumentPair])
async def list_pairs(status: str = "active"):
    """페어 목록 조회"""
    return service.list_pairs(status)


@router.get("/stats", response_model=PairStats)
async def get_stats():
    """페어 통계"""
    all_pairs = service.list_pairs("active")
    archived = service.list_pairs("archived")
    return PairStats(
        total_pairs=len(all_pairs) + len(archived),
        active_pairs=len(all_pairs),
        total_matched=sum(p.matched_count for p in all_pairs)
    )


@router.get("/{pair_id}", response_model=DocumentPair)
async def get_pair(pair_id: str):
    """페어 조회"""
    pair = service.get_pair(pair_id)
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return pair


@router.delete("/{pair_id}")
async def delete_pair(pair_id: str):
    """페어 삭제"""
    if service.delete_pair(pair_id):
        return {"success": True, "message": "Pair deleted"}
    raise HTTPException(status_code=404, detail="Pair not found")
```

**main.py 등록**:
```python
from .routers import document_pairs

app.include_router(document_pairs.router)
```

---

### L-4: 프론트엔드 - useDocumentPairs 훅

**새 파일**: `frontend/src/hooks/useDocumentPairs.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export interface DocumentPair {
  id: string;
  problem_document_id: string;
  solution_document_id: string;
  created_at: string;
  status: 'active' | 'archived';
  matched_count: number;
}

export function useDocumentPairs() {
  const queryClient = useQueryClient();

  // 페어 목록 조회
  const {
    data: pairs = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['document-pairs'],
    queryFn: () => api.getDocumentPairs()
  });

  // 페어 생성
  const createPair = useMutation({
    mutationFn: (data: { problemDocId: string; solutionDocId: string }) =>
      api.createDocumentPair(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-pairs'] });
    }
  });

  // 페어 삭제
  const deletePair = useMutation({
    mutationFn: (pairId: string) => api.deleteDocumentPair(pairId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-pairs'] });
    }
  });

  return {
    pairs,
    isLoading,
    error,
    createPair,
    deletePair
  };
}
```

**테스트 항목**:
- [ ] POST /api/document-pairs - 페어 생성
- [ ] GET /api/document-pairs - 목록 조회
- [ ] DELETE /api/document-pairs/{id} - 페어 삭제
- [ ] 중복 생성 시 기존 페어 반환

---

## 🚀 Phase 22-M: 원클릭 듀얼 실행

### 예상 시간: 1-2시간

---

### M-1: DocumentPairCard 컴포넌트

**새 파일**: `frontend/src/components/DocumentPairCard.tsx`

```typescript
import { FileText, BookOpen, Play, Unlink, Calendar, Hash } from 'lucide-react';
import { Button } from './ui';
import type { DocumentPair } from '../hooks/useDocumentPairs';
import { useDualWindowLauncher } from '../hooks/useDualWindowLauncher';

interface DocumentPairCardProps {
  pair: DocumentPair;
  problemName?: string;
  solutionName?: string;
  onUnlink: () => void;
}

export function DocumentPairCard({
  pair,
  problemName,
  solutionName,
  onUnlink
}: DocumentPairCardProps) {
  const { launchDualWindows, isLaunching } = useDualWindowLauncher();

  const handleLaunch = () => {
    launchDualWindows({
      problemDocId: pair.problem_document_id,
      solutionDocId: pair.solution_document_id,
      mode: 'dual'
    });
  };

  return (
    <div className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-medium text-grey-900">
              {problemName || pair.problem_document_id}
            </div>
            <div className="text-xs text-grey-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(pair.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        <button
          onClick={onUnlink}
          className="p-1.5 text-grey-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="페어링 해제"
        >
          <Unlink className="w-4 h-4" />
        </button>
      </div>

      {/* 연결 표시 */}
      <div className="flex items-center gap-2 mb-3 pl-10">
        <div className="w-0.5 h-4 bg-grey-200" />
        <span className="text-xs text-grey-400">↔</span>
        <div className="flex items-center gap-1.5 text-sm text-grey-600">
          <BookOpen className="w-4 h-4 text-green-500" />
          {solutionName || pair.solution_document_id}
        </div>
      </div>

      {/* 통계 */}
      <div className="flex items-center gap-4 mb-4 pl-10 text-xs text-grey-500">
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          매칭 {pair.matched_count}개
        </span>
      </div>

      {/* 실행 버튼 */}
      <Button
        variant="solid"
        size="lg"
        className="w-full"
        onClick={handleLaunch}
        disabled={isLaunching}
      >
        <Play className="w-4 h-4 mr-2" />
        듀얼 라벨링 시작
      </Button>
    </div>
  );
}
```

---

### M-2: RegistrationPage 업데이트

**변경 파일**: `frontend/src/pages/RegistrationPage.tsx`

```typescript
// 새 섹션 추가: 페어링된 문서

import { useDocumentPairs } from '../hooks/useDocumentPairs';
import { DocumentPairCard } from '../components/DocumentPairCard';

export function RegistrationPage() {
  const { pairs, deletePair } = useDocumentPairs();

  return (
    <div className="space-y-8">
      {/* 기존 업로드 섹션 */}
      <section>
        <h2>문서 업로드</h2>
        {/* ... */}
      </section>

      {/* Phase 22-M: 페어링된 문서 섹션 */}
      {pairs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey-900">
              페어링된 문서
            </h2>
            <span className="text-sm text-grey-500">
              {pairs.length}개의 페어
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pairs.map(pair => (
              <DocumentPairCard
                key={pair.id}
                pair={pair}
                onUnlink={() => {
                  if (confirm('페어링을 해제하시겠습니까?')) {
                    deletePair.mutate(pair.id);
                  }
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* 기존 문서 목록 섹션 */}
      <section>
        <h2>등록된 문서</h2>
        {/* ... */}
      </section>
    </div>
  );
}
```

**테스트 항목**:
- [ ] 페어링된 문서 섹션 표시
- [ ] "듀얼 라벨링 시작" 클릭 → 두 창 열림
- [ ] "페어링 해제" 클릭 → 목록에서 제거
- [ ] 페어가 없을 때 섹션 숨김

---

## 📊 전체 구현 순서 요약

```
Week 1: Phase 22-J (Quick Wins)
├── Day 1 AM: J-1 해설창 사이드패널 숨김
├── Day 1 PM: J-2 자동 명명 시스템
└── Day 1 PM: 테스트 및 버그 수정

Week 1: Phase 22-K (관계 시각화)
├── Day 2 AM: K-1 데이터 구조 확장
├── Day 2 PM: K-2 LinkedBadge 컴포넌트
└── Day 2 PM: K-3 GroupPanel 업데이트

Week 2: Phase 22-L (영구 페어링 - 백엔드)
├── Day 3 AM: L-1 데이터 모델
├── Day 3 PM: L-2 서비스 레이어
├── Day 4 AM: L-3 API 라우터
└── Day 4 PM: L-4 프론트엔드 훅

Week 2: Phase 22-M (원클릭 실행)
├── Day 5 AM: M-1 DocumentPairCard
└── Day 5 PM: M-2 RegistrationPage 업데이트
```

---

## ✅ 완료 기준

### Phase 22-J
- [ ] 해설 창에서 사이드패널 숨겨짐
- [ ] 해설 라벨링 시 자동으로 "[해설]" 접미사 추가
- [ ] TypeScript 빌드 통과

### Phase 22-K
- [ ] 문제-해설 연결 정보 저장됨
- [ ] LinkedBadge로 연결 관계 표시됨
- [ ] "이동" 버튼으로 연결된 문서로 이동 가능

### Phase 22-L
- [ ] document_pairs.json에 페어 정보 저장됨
- [ ] CRUD API 정상 동작
- [ ] 프론트엔드에서 페어 목록 조회 가능

### Phase 22-M
- [ ] 페어링된 문서가 RegistrationPage에 표시됨
- [ ] "듀얼 라벨링 시작" 클릭으로 즉시 두 창 열림
- [ ] 페어링 해제 가능

---

*작성: Claude Code (Opus)*
*작성일: 2025-12-02*
