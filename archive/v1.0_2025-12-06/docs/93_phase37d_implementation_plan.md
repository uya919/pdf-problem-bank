# Phase 37-D: 단일 저장소 통합 - 단계별 개발 계획

**작성일**: 2025-12-03
**근거 문서**: [92_phase37_unified_storage_architecture_research.md](92_phase37_unified_storage_architecture_research.md)
**예상 기간**: 2주 (30시간)

---

## Executive Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 37-D 개발 로드맵                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Week 1                                                          │
│  ├── D1: SyncManager 백엔드 구현 (Day 1-3)                      │
│  └── D2: API 수정 및 테스트 (Day 4-5)                           │
│                                                                  │
│  Week 2                                                          │
│  ├── D3: 프론트엔드 통합 (Day 1-3)                              │
│  ├── D4: UI/UX 피드백 (Day 4)                                   │
│  └── D5: 통합 테스트 및 마이그레이션 (Day 5)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 37-D1: SyncManager 백엔드 구현

### 목표
groups.json ↔ WorkSession 양방향 동기화를 담당하는 SyncManager 클래스 구현

### Step 1.1: SyncManager 기본 구조 생성

**파일**: `backend/app/services/sync_manager.py` (신규)

```python
"""
Phase 37-D1: 동기화 관리자

groups.json ↔ WorkSession 양방향 동기화
"""
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import json
import filelock

from app.config import get_settings
from app.models.work_session import (
    WorkSession,
    ProblemReference,
    ProblemSolutionLink
)


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    problems_added: int = 0
    problems_removed: int = 0
    links_synced: int = 0
    conflicts: List[Dict[str, Any]] = None
    error: Optional[str] = None

    @classmethod
    def merge(cls, *results: 'SyncResult') -> 'SyncResult':
        """여러 결과 병합"""
        return cls(
            success=all(r.success for r in results),
            problems_added=sum(r.problems_added for r in results),
            problems_removed=sum(r.problems_removed for r in results),
            links_synced=sum(r.links_synced for r in results),
            conflicts=[c for r in results for c in (r.conflicts or [])],
        )


class SyncManager:
    """
    groups.json ↔ WorkSession 동기화 관리자

    원칙:
    - groups.json: 그룹 정의의 원본 (Single Source of Truth)
    - session.links: 연결 정보의 원본 (Single Source of Truth)
    - session.problems: groups.json의 캐시
    - groups.json.link: session.links의 캐시
    """

    def __init__(self):
        self.config = get_settings()
        self.lock = filelock.FileLock(
            str(self.config.dataset_root / ".sync.lock"),
            timeout=10
        )

    # Step 1.2에서 구현
    async def sync_problems_to_session(self, session: WorkSession) -> SyncResult:
        """groups.json → session.problems 동기화"""
        pass

    # Step 1.3에서 구현
    async def sync_links_to_groups(self, session: WorkSession) -> SyncResult:
        """session.links → groups.json.link 동기화"""
        pass

    # Step 1.4에서 구현
    async def full_sync(self, session: WorkSession) -> SyncResult:
        """완전 양방향 동기화"""
        pass
```

**예상 시간**: 30분

---

### Step 1.2: sync_problems_to_session 구현

**groups.json에서 문제 목록을 읽어 session.problems에 동기화**

```python
async def sync_problems_to_session(self, session: WorkSession) -> SyncResult:
    """
    groups.json → session.problems 동기화

    1. 문서의 모든 groups.json 스캔
    2. 신규 그룹 → session.problems에 추가
    3. 삭제된 그룹 → session.problems에서 제거
    4. 변경된 그룹 → session.problems 업데이트
    """
    with self.lock:
        try:
            doc_dir = self.config.dataset_root / "documents" / session.problemDocumentId
            groups_dir = doc_dir / "groups"

            if not groups_dir.exists():
                return SyncResult(success=True)

            # 1. groups.json에서 모든 그룹 수집
            all_groups: Dict[str, Dict] = {}

            for groups_file in sorted(groups_dir.glob("page_*_groups.json")):
                page_index = int(groups_file.stem.split("_")[1])

                with open(groups_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                for group in data.get("groups", []):
                    group_id = group.get("id")
                    if group_id:
                        all_groups[group_id] = {
                            "group": group,
                            "pageIndex": page_index,
                            "documentId": session.problemDocumentId
                        }

            # 2. 기존 problems와 비교
            existing_ids = {p.groupId for p in session.problems}
            new_ids = set(all_groups.keys())

            added_count = 0
            removed_count = 0

            # 3. 신규 그룹 추가
            for group_id in (new_ids - existing_ids):
                group_data = all_groups[group_id]
                group = group_data["group"]
                problem_info = group.get("problemInfo", {})

                # displayName 생성
                problem_number = problem_info.get("problemNumber", "")
                book_name = problem_info.get("bookName", "")
                display_name = f"{book_name} {problem_number}".strip() or f"#{group_id[:8]}"

                session.problems.append(ProblemReference(
                    groupId=group_id,
                    documentId=group_data["documentId"],
                    pageIndex=group_data["pageIndex"],
                    problemNumber=problem_number,
                    displayName=display_name,
                    createdAt=int(datetime.now().timestamp() * 1000)
                ))
                added_count += 1

            # 4. 삭제된 그룹 제거
            session.problems = [
                p for p in session.problems
                if p.groupId in new_ids
            ]
            removed_count = len(existing_ids) - len(new_ids & existing_ids)

            return SyncResult(
                success=True,
                problems_added=added_count,
                problems_removed=removed_count
            )

        except Exception as e:
            return SyncResult(success=False, error=str(e))
```

**예상 시간**: 1시간

---

### Step 1.3: sync_links_to_groups 구현

**session.links를 groups.json의 link 필드에 동기화**

```python
async def sync_links_to_groups(self, session: WorkSession) -> SyncResult:
    """
    session.links → groups.json.link 동기화

    1. session.links 순회
    2. 해당 그룹의 groups.json 찾기
    3. link 필드 업데이트
    """
    with self.lock:
        try:
            synced_count = 0

            # 해설 문서의 groups 디렉토리
            solution_dir = self.config.dataset_root / "documents" / session.solutionDocumentId
            groups_dir = solution_dir / "groups"

            if not groups_dir.exists():
                return SyncResult(success=True)

            # 링크를 페이지별로 그룹화
            links_by_page: Dict[int, List[ProblemSolutionLink]] = {}
            for link in session.links:
                page = link.solutionPageIndex
                if page not in links_by_page:
                    links_by_page[page] = []
                links_by_page[page].append(link)

            # 각 페이지의 groups.json 업데이트
            for page_index, links in links_by_page.items():
                groups_file = groups_dir / f"page_{page_index:04d}_groups.json"

                if not groups_file.exists():
                    continue

                with open(groups_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # 링크 정보를 그룹에 추가
                link_map = {l.solutionGroupId: l for l in links}
                modified = False

                for group in data.get("groups", []):
                    group_id = group.get("id")
                    if group_id in link_map:
                        link = link_map[group_id]

                        # 문제 그룹 정보 조회
                        problem_ref = next(
                            (p for p in session.problems if p.groupId == link.problemGroupId),
                            None
                        )

                        group["link"] = {
                            "linkedGroupId": link.problemGroupId,
                            "linkedDocumentId": session.problemDocumentId,
                            "linkedPageIndex": problem_ref.pageIndex if problem_ref else 0,
                            "linkedName": problem_ref.displayName if problem_ref else "",
                            "linkType": "solution",
                            "linkedAt": link.linkedAt
                        }
                        modified = True
                        synced_count += 1

                if modified:
                    with open(groups_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)

            return SyncResult(success=True, links_synced=synced_count)

        except Exception as e:
            return SyncResult(success=False, error=str(e))
```

**예상 시간**: 1시간

---

### Step 1.4: full_sync 및 유틸리티 구현

```python
async def full_sync(self, session: WorkSession) -> SyncResult:
    """완전 양방향 동기화"""
    result1 = await self.sync_problems_to_session(session)
    result2 = await self.sync_links_to_groups(session)
    return SyncResult.merge(result1, result2)


async def sync_single_link_to_group(
    self,
    solution_document_id: str,
    solution_group_id: str,
    solution_page_index: int,
    link_data: Dict[str, Any]
) -> bool:
    """단일 링크를 groups.json에 즉시 동기화"""
    with self.lock:
        try:
            groups_file = (
                self.config.dataset_root / "documents" / solution_document_id /
                "groups" / f"page_{solution_page_index:04d}_groups.json"
            )

            if not groups_file.exists():
                return False

            with open(groups_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            for group in data.get("groups", []):
                if group.get("id") == solution_group_id:
                    group["link"] = link_data
                    break

            with open(groups_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            return True

        except Exception as e:
            print(f"[SyncManager] Error syncing link: {e}")
            return False


async def clear_link_from_group(
    self,
    document_id: str,
    group_id: str,
    page_index: int
) -> bool:
    """그룹에서 링크 정보 제거"""
    with self.lock:
        try:
            groups_file = (
                self.config.dataset_root / "documents" / document_id /
                "groups" / f"page_{page_index:04d}_groups.json"
            )

            if not groups_file.exists():
                return False

            with open(groups_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            for group in data.get("groups", []):
                if group.get("id") == group_id:
                    group.pop("link", None)
                    break

            with open(groups_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            return True

        except Exception as e:
            print(f"[SyncManager] Error clearing link: {e}")
            return False
```

**예상 시간**: 30분

---

### Step 1.5: 단위 테스트

**파일**: `backend/tests/test_sync_manager.py` (신규)

```python
"""
Phase 37-D1: SyncManager 단위 테스트
"""
import pytest
import json
import tempfile
from pathlib import Path
from app.services.sync_manager import SyncManager, SyncResult
from app.models.work_session import WorkSession, ProblemReference, ProblemSolutionLink


@pytest.fixture
def temp_dataset():
    """임시 데이터셋 디렉토리"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def sample_session():
    """샘플 세션"""
    return WorkSession(
        sessionId="test-session",
        problemDocumentId="problem-doc",
        solutionDocumentId="solution-doc",
        problems=[],
        links=[]
    )


class TestSyncProblemsToSession:
    """sync_problems_to_session 테스트"""

    async def test_새그룹_추가(self, temp_dataset, sample_session):
        """신규 그룹이 session.problems에 추가되어야 함"""
        # Given: groups.json에 그룹 1개 존재
        groups_dir = temp_dataset / "documents" / "problem-doc" / "groups"
        groups_dir.mkdir(parents=True)

        groups_data = {
            "groups": [{
                "id": "grp-001",
                "block_ids": [1, 2, 3],
                "problemInfo": {"problemNumber": "1"}
            }]
        }
        (groups_dir / "page_0000_groups.json").write_text(
            json.dumps(groups_data), encoding='utf-8'
        )

        # When
        manager = SyncManager()
        manager.config.dataset_root = temp_dataset
        result = await manager.sync_problems_to_session(sample_session)

        # Then
        assert result.success
        assert result.problems_added == 1
        assert len(sample_session.problems) == 1
        assert sample_session.problems[0].groupId == "grp-001"

    async def test_삭제된그룹_제거(self, temp_dataset, sample_session):
        """삭제된 그룹이 session.problems에서 제거되어야 함"""
        # Given: session에 그룹 있지만 groups.json에는 없음
        sample_session.problems.append(ProblemReference(
            groupId="grp-deleted",
            documentId="problem-doc",
            pageIndex=0,
            problemNumber="99"
        ))

        groups_dir = temp_dataset / "documents" / "problem-doc" / "groups"
        groups_dir.mkdir(parents=True)
        (groups_dir / "page_0000_groups.json").write_text(
            json.dumps({"groups": []}), encoding='utf-8'
        )

        # When
        manager = SyncManager()
        manager.config.dataset_root = temp_dataset
        result = await manager.sync_problems_to_session(sample_session)

        # Then
        assert result.success
        assert result.problems_removed == 1
        assert len(sample_session.problems) == 0


class TestSyncLinksToGroups:
    """sync_links_to_groups 테스트"""

    async def test_링크정보_동기화(self, temp_dataset, sample_session):
        """session.links가 groups.json에 동기화되어야 함"""
        # Given
        sample_session.problems.append(ProblemReference(
            groupId="problem-grp",
            documentId="problem-doc",
            pageIndex=0,
            problemNumber="1",
            displayName="1번"
        ))
        sample_session.links.append(ProblemSolutionLink(
            problemGroupId="problem-grp",
            solutionGroupId="solution-grp",
            solutionDocumentId="solution-doc",
            solutionPageIndex=5
        ))

        groups_dir = temp_dataset / "documents" / "solution-doc" / "groups"
        groups_dir.mkdir(parents=True)
        (groups_dir / "page_0005_groups.json").write_text(
            json.dumps({"groups": [{"id": "solution-grp", "block_ids": [1]}]}),
            encoding='utf-8'
        )

        # When
        manager = SyncManager()
        manager.config.dataset_root = temp_dataset
        result = await manager.sync_links_to_groups(sample_session)

        # Then
        assert result.success
        assert result.links_synced == 1

        # groups.json 확인
        with open(groups_dir / "page_0005_groups.json", 'r') as f:
            data = json.load(f)
        assert data["groups"][0]["link"]["linkedGroupId"] == "problem-grp"
```

**예상 시간**: 1시간

---

## Phase 37-D2: API 수정

### 목표
기존 WorkSession API에 동기화 로직 통합

### Step 2.1: work_sessions.py 수정 - create_link

**파일**: `backend/app/routers/work_sessions.py`

```python
# 상단에 import 추가
from app.services.sync_manager import SyncManager

# 모듈 레벨에 인스턴스 생성
sync_manager = SyncManager()


@router.post("/{session_id}/links", response_model=WorkSession)
async def create_link(session_id: str, request: CreateLinkRequest):
    """
    문제-해설 연결 생성 (Phase 37-D2 수정)

    1. session.links에 추가 (기존)
    2. ✨ 신규: groups.json.link 즉시 동기화
    """
    session = _load_session(session_id)

    # 문제 존재 확인
    problem = next(
        (p for p in session.problems if p.groupId == request.problemGroupId),
        None
    )
    if not problem:
        raise HTTPException(
            status_code=404,
            detail=f"Problem {request.problemGroupId} not found in session"
        )

    # 기존 연결 제거 (한 문제에 하나의 해설만)
    session.links = [
        l for l in session.links
        if l.problemGroupId != request.problemGroupId
    ]

    # 새 연결 추가
    link = ProblemSolutionLink(
        problemGroupId=request.problemGroupId,
        solutionGroupId=request.solutionGroupId,
        solutionDocumentId=request.solutionDocumentId,
        solutionPageIndex=request.solutionPageIndex,
        linkedAt=int(datetime.now().timestamp() * 1000)
    )
    session.links.append(link)

    # ✨ Phase 37-D2: groups.json에 즉시 동기화
    await sync_manager.sync_single_link_to_group(
        solution_document_id=request.solutionDocumentId,
        solution_group_id=request.solutionGroupId,
        solution_page_index=request.solutionPageIndex,
        link_data={
            "linkedGroupId": request.problemGroupId,
            "linkedDocumentId": session.problemDocumentId,
            "linkedPageIndex": problem.pageIndex,
            "linkedName": problem.displayName,
            "linkType": "solution",
            "linkedAt": link.linkedAt
        }
    )

    session.updatedAt = int(datetime.now().timestamp() * 1000)
    _save_session(session)

    return session
```

**예상 시간**: 30분

---

### Step 2.2: delete_link 수정

```python
@router.delete("/{session_id}/links/{problem_group_id}", response_model=WorkSession)
async def delete_link(session_id: str, problem_group_id: str):
    """
    문제-해설 연결 삭제 (Phase 37-D2 수정)
    """
    session = _load_session(session_id)

    # 삭제할 링크 찾기
    link_to_delete = next(
        (l for l in session.links if l.problemGroupId == problem_group_id),
        None
    )

    if not link_to_delete:
        raise HTTPException(
            status_code=404,
            detail=f"Link for problem {problem_group_id} not found"
        )

    # 세션에서 제거
    session.links = [
        l for l in session.links
        if l.problemGroupId != problem_group_id
    ]

    # ✨ Phase 37-D2: groups.json에서도 제거
    await sync_manager.clear_link_from_group(
        document_id=link_to_delete.solutionDocumentId,
        group_id=link_to_delete.solutionGroupId,
        page_index=link_to_delete.solutionPageIndex
    )

    session.updatedAt = int(datetime.now().timestamp() * 1000)
    _save_session(session)

    return session
```

**예상 시간**: 20분

---

### Step 2.3: 신규 API 추가 - full_sync

```python
@router.post("/{session_id}/full-sync")
async def full_sync(session_id: str):
    """
    완전 동기화 (Phase 37-D2 신규)

    groups.json ↔ session 양방향 동기화
    """
    session = _load_session(session_id)

    result = await sync_manager.full_sync(session)

    if result.success:
        _save_session(session)

    return {
        "status": "success" if result.success else "error",
        "problems_added": result.problems_added,
        "problems_removed": result.problems_removed,
        "links_synced": result.links_synced,
        "conflicts": result.conflicts or [],
        "error": result.error
    }


@router.get("/{session_id}/sync-status")
async def get_sync_status(session_id: str):
    """
    동기화 상태 확인 (Phase 37-D2 신규)
    """
    session = _load_session(session_id)

    # groups.json의 그룹 수 카운트
    doc_dir = config.get_document_dir(session.problemDocumentId)
    groups_dir = doc_dir / "groups"

    groups_count = 0
    if groups_dir.exists():
        for groups_file in groups_dir.glob("page_*_groups.json"):
            with open(groups_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            groups_count += len(data.get("groups", []))

    session_count = len(session.problems)

    # 상태 판단
    if groups_count == session_count:
        status = "synced"
    elif groups_count > session_count:
        status = "pending"  # 동기화 필요
    else:
        status = "conflict"  # 불일치

    return {
        "status": status,
        "groupsCount": groups_count,
        "sessionCount": session_count,
        "linksCount": len(session.links)
    }
```

**예상 시간**: 30분

---

### Step 2.4: sync_problems 기존 함수 연동

```python
@router.post("/{session_id}/sync-problems", response_model=WorkSession)
async def sync_problems_from_groups(session_id: str):
    """
    문제 동기화 (Phase 37-D2 수정: SyncManager 사용)
    """
    session = _load_session(session_id)

    # SyncManager 사용
    result = await sync_manager.sync_problems_to_session(session)

    if not result.success:
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {result.error}"
        )

    session.updatedAt = int(datetime.now().timestamp() * 1000)
    _save_session(session)

    return session
```

**예상 시간**: 20분

---

### Step 2.5: API 통합 테스트

**파일**: `backend/tests/test_work_sessions_sync.py` (신규)

```python
"""
Phase 37-D2: WorkSession API 동기화 테스트
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestCreateLinkWithSync:
    """create_link API 동기화 테스트"""

    def test_링크생성시_groups_json_업데이트(self):
        """링크 생성 시 groups.json에 link 필드가 추가되어야 함"""
        # Given: 세션과 그룹이 존재
        # When: POST /api/work-sessions/{id}/links
        # Then: groups.json의 해당 그룹에 link 필드 존재
        pass

    def test_링크삭제시_groups_json_정리(self):
        """링크 삭제 시 groups.json의 link 필드가 제거되어야 함"""
        pass


class TestFullSync:
    """full_sync API 테스트"""

    def test_완전동기화_성공(self):
        """full-sync 호출 시 양방향 동기화 성공"""
        pass

    def test_동기화상태_확인(self):
        """sync-status API가 올바른 상태 반환"""
        pass
```

**예상 시간**: 1시간

---

## Phase 37-D3: 프론트엔드 통합

### 목표
동기화 상태 관리 및 UI 피드백 구현

### Step 3.1: workSessionStore 확장

**파일**: `frontend/src/stores/workSessionStore.ts`

```typescript
// 타입 추가
interface SyncStatus {
  status: 'synced' | 'pending' | 'conflict' | 'unknown';
  groupsCount: number;
  sessionCount: number;
  linksCount: number;
  lastCheckedAt: number | null;
}

// 상태 추가
interface WorkSessionStore {
  // 기존 상태...

  // ✨ Phase 37-D3: 동기화 상태
  syncStatus: SyncStatus;
  isSyncing: boolean;

  // ✨ Phase 37-D3: 동기화 액션
  checkSyncStatus: () => Promise<void>;
  fullSync: () => Promise<void>;
}

// 초기값
const initialSyncStatus: SyncStatus = {
  status: 'unknown',
  groupsCount: 0,
  sessionCount: 0,
  linksCount: 0,
  lastCheckedAt: null,
};

// 액션 구현
checkSyncStatus: async () => {
  const { currentSession } = get();
  if (!currentSession) return;

  try {
    const response = await api.getSyncStatus(currentSession.sessionId);
    set({
      syncStatus: {
        ...response,
        lastCheckedAt: Date.now(),
      },
    });
  } catch (error) {
    console.error('[Phase 37-D3] Failed to check sync status:', error);
  }
},

fullSync: async () => {
  const { currentSession } = get();
  if (!currentSession) return;

  set({ isSyncing: true });

  try {
    const result = await api.fullSync(currentSession.sessionId);
    console.log('[Phase 37-D3] Full sync result:', result);

    // 세션 다시 로드
    await get().loadSession(currentSession.sessionId);

    // 상태 갱신
    await get().checkSyncStatus();
  } catch (error) {
    console.error('[Phase 37-D3] Full sync failed:', error);
  } finally {
    set({ isSyncing: false });
  }
},
```

**예상 시간**: 1시간

---

### Step 3.2: API 클라이언트 추가

**파일**: `frontend/src/api/client.ts`

```typescript
// ✨ Phase 37-D3: 동기화 API

export interface SyncStatusResponse {
  status: 'synced' | 'pending' | 'conflict';
  groupsCount: number;
  sessionCount: number;
  linksCount: number;
}

export interface FullSyncResponse {
  status: 'success' | 'error';
  problems_added: number;
  problems_removed: number;
  links_synced: number;
  conflicts: unknown[];
  error?: string;
}

export async function getSyncStatus(sessionId: string): Promise<SyncStatusResponse> {
  const response = await apiClient.get<SyncStatusResponse>(
    `/api/work-sessions/${sessionId}/sync-status`
  );
  return response.data;
}

export async function fullSync(sessionId: string): Promise<FullSyncResponse> {
  const response = await apiClient.post<FullSyncResponse>(
    `/api/work-sessions/${sessionId}/full-sync`
  );
  return response.data;
}
```

**예상 시간**: 20분

---

### Step 3.3: SyncIndicator 컴포넌트

**파일**: `frontend/src/components/SyncIndicator.tsx` (신규)

```tsx
/**
 * Phase 37-D3: 동기화 상태 표시 컴포넌트
 */
import { RefreshCw, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useWorkSessionStore } from '@/stores/workSessionStore';

export function SyncIndicator() {
  const { syncStatus, isSyncing, fullSync, checkSyncStatus } = useWorkSessionStore();

  // 상태별 UI
  const statusConfig = {
    synced: {
      icon: CheckCircle,
      color: 'text-green-500',
      label: '동기화됨',
    },
    pending: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      label: '동기화 필요',
    },
    conflict: {
      icon: AlertCircle,
      color: 'text-red-500',
      label: '충돌 발생',
    },
    unknown: {
      icon: RefreshCw,
      color: 'text-grey-400',
      label: '확인 중...',
    },
  };

  const config = statusConfig[syncStatus.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {/* 상태 표시 */}
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="text-xs">{config.label}</span>
      </div>

      {/* 동기화 버튼 (pending 또는 conflict 시) */}
      {(syncStatus.status === 'pending' || syncStatus.status === 'conflict') && (
        <button
          onClick={() => fullSync()}
          disabled={isSyncing}
          className="px-2 py-1 text-xs bg-toss-blue text-white rounded-md hover:bg-toss-blue/90 disabled:opacity-50"
        >
          {isSyncing ? '동기화 중...' : '동기화'}
        </button>
      )}

      {/* 수동 새로고침 */}
      <button
        onClick={() => checkSyncStatus()}
        disabled={isSyncing}
        className="p-1 hover:bg-grey-100 rounded"
        title="상태 확인"
      >
        <RefreshCw className={`w-3 h-3 text-grey-400 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
```

**예상 시간**: 30분

---

### Step 3.4: UnifiedWorkPage에 통합

**파일**: `frontend/src/pages/UnifiedWorkPage.tsx`

```tsx
// import 추가
import { SyncIndicator } from '@/components/SyncIndicator';

// 헤더에 SyncIndicator 추가
<div className="flex items-center gap-3">
  {/* ✨ Phase 37-D3: 동기화 상태 표시 */}
  <SyncIndicator />

  <span className="text-sm text-grey-500">
    {progress.linked}/{progress.total} 완료
  </span>
  {/* ... 기존 코드 ... */}
</div>
```

**예상 시간**: 15분

---

### Step 3.5: 자동 동기화 훅

**파일**: `frontend/src/hooks/useAutoSync.ts` (신규)

```typescript
/**
 * Phase 37-D3: 자동 동기화 훅
 */
import { useEffect } from 'react';
import { useWorkSessionStore } from '@/stores/workSessionStore';

export function useAutoSync(sessionId: string | undefined) {
  const { checkSyncStatus, syncStatus } = useWorkSessionStore();

  // 세션 변경 시 상태 확인
  useEffect(() => {
    if (sessionId) {
      checkSyncStatus();
    }
  }, [sessionId, checkSyncStatus]);

  // 주기적 상태 확인 (30초마다)
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      checkSyncStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [sessionId, checkSyncStatus]);

  // 동기화 필요 시 콘솔 로그
  useEffect(() => {
    if (syncStatus.status === 'pending') {
      console.log('[Phase 37-D3] Sync pending - new changes detected');
    } else if (syncStatus.status === 'conflict') {
      console.warn('[Phase 37-D3] Sync conflict detected');
    }
  }, [syncStatus.status]);

  return syncStatus;
}
```

**예상 시간**: 20분

---

## Phase 37-D4: UI/UX 피드백

### Step 4.1: 토스트 알림

**동기화 필요 시 토스트 알림 표시**

```tsx
// useAutoSync 훅 확장
import { toast } from '@/components/ui/toast';

useEffect(() => {
  if (syncStatus.status === 'pending') {
    toast({
      title: '새로운 변경사항',
      description: '동기화가 필요합니다',
      action: {
        label: '동기화',
        onClick: () => fullSync(),
      },
    });
  }
}, [syncStatus.status]);
```

### Step 4.2: 연결 성공 피드백

**연결 생성 시 즉시 UI 반영 (Optimistic UI)**

```tsx
// createLink 호출 시
const handleCreateLink = async (problemId: string, solutionId: string) => {
  // Optimistic: 즉시 UI 반영
  setOptimisticLinks(prev => [...prev, { problemId, solutionId }]);

  try {
    await createLink({ problemId, solutionId, ... });
  } catch (error) {
    // 롤백
    setOptimisticLinks(prev => prev.filter(l => l.problemId !== problemId));
    toast.error('연결 실패');
  }
};
```

**예상 시간**: 1시간

---

## Phase 37-D5: 통합 테스트 및 마이그레이션

### Step 5.1: E2E 테스트 시나리오

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E 테스트 시나리오                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  시나리오 1: 기본 워크플로우                                    │
│  ─────────────────────────────────────                          │
│  1. 세션 생성                                                   │
│  2. 문제 탭에서 그룹 5개 생성                                   │
│  3. 해설 탭 전환 → syncProblems 호출                            │
│  4. 미연결 바에 5개 표시 확인                                   │
│  5. 그룹 3개 연결                                               │
│  6. 새로고침                                                    │
│  7. ✅ 연결 정보 유지 확인 (session.links + groups.json.link)  │
│                                                                  │
│  시나리오 2: 충돌 해결                                          │
│  ─────────────────────────────────────                          │
│  1. 세션 A에서 문제 1 연결                                      │
│  2. 수동으로 groups.json 수정 (link 필드 변경)                  │
│  3. sync-status 확인 → conflict 표시                            │
│  4. full-sync 호출                                              │
│  5. ✅ session.links 기준으로 정규화                            │
│                                                                  │
│  시나리오 3: 대용량 문서                                        │
│  ─────────────────────────────────────                          │
│  1. 100페이지 문서로 테스트                                     │
│  2. 500개 그룹 동기화                                           │
│  3. ✅ 성능 확인 (동기화 < 3초)                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 5.2: 기존 데이터 마이그레이션 스크립트

**파일**: `backend/scripts/migrate_sync.py`

```python
"""
Phase 37-D5: 기존 세션 마이그레이션
"""
import json
from pathlib import Path
from app.config import get_settings
from app.services.sync_manager import SyncManager


async def migrate_all_sessions():
    """모든 세션을 동기화"""
    config = get_settings()
    sessions_dir = config.dataset_root / "work_sessions"
    sync_manager = SyncManager()

    results = []

    for session_file in sessions_dir.glob("ws-*.json"):
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)

            # WorkSession 객체로 변환
            session = WorkSession(**session_data)

            # 동기화
            result = await sync_manager.full_sync(session)

            if result.success:
                # 저장
                with open(session_file, 'w', encoding='utf-8') as f:
                    json.dump(session.dict(), f, ensure_ascii=False, indent=2)

            results.append({
                "session": session.sessionId,
                "status": "success" if result.success else "failed",
                "problems_synced": result.problems_added,
                "links_synced": result.links_synced,
            })

        except Exception as e:
            results.append({
                "session": session_file.name,
                "status": "error",
                "error": str(e),
            })

    return results


if __name__ == "__main__":
    import asyncio
    results = asyncio.run(migrate_all_sessions())
    print(json.dumps(results, indent=2, ensure_ascii=False))
```

**예상 시간**: 1시간

---

## 체크리스트

### Phase 37-D1: SyncManager

```
[x] Step 1.1: SyncManager 기본 구조 생성
[x] Step 1.2: sync_problems_to_session 구현
[x] Step 1.3: sync_links_to_groups 구현
[x] Step 1.4: full_sync 및 유틸리티 구현
[ ] Step 1.5: 단위 테스트
```

### Phase 37-D2: API 수정

```
[x] Step 2.1: create_link 수정
[x] Step 2.2: delete_link 수정
[x] Step 2.3: full_sync API 추가
[x] Step 2.4: sync_problems 수정 (기존 유지, SyncManager 내부 사용)
[ ] Step 2.5: API 통합 테스트
```

### Phase 37-D3: 프론트엔드

```
[x] Step 3.1: workSessionStore 확장
[x] Step 3.2: API 클라이언트 추가
[x] Step 3.3: SyncIndicator 컴포넌트
[x] Step 3.4: UnifiedWorkPage 통합
[x] Step 3.5: useAutoSync 훅
```

### Phase 37-D4: UI/UX

```
[x] Step 4.1: 토스트 알림 (SyncIndicator에 통합)
[x] Step 4.2: Optimistic UI (기존 createLink에서 즉시 반영)
```

### Phase 37-D5: 테스트/마이그레이션

```
[ ] Step 5.1: E2E 테스트 (선택사항)
[x] Step 5.2: 마이그레이션 스크립트 (backend/scripts/migrate_sync.py)
```

---

## 롤백 계획

### 긴급 롤백 (5분)

```python
# work_sessions.py에서 동기화 호출 주석 처리
@router.post("/{session_id}/links")
async def create_link(...):
    # ... 기존 로직 ...

    # ❌ 비활성화
    # await sync_manager.sync_single_link_to_group(...)
```

### 완전 롤백 (30분)

```
1. SyncManager import 제거
2. 신규 API 엔드포인트 삭제
3. 프론트엔드 SyncIndicator 제거
4. workSessionStore 원복
```

---

## 예상 일정

| 단계 | 예상 시간 | 담당 |
|------|----------|------|
| D1: SyncManager | 4시간 | 백엔드 |
| D2: API 수정 | 3시간 | 백엔드 |
| D3: 프론트엔드 | 4시간 | 프론트엔드 |
| D4: UI/UX | 2시간 | 프론트엔드 |
| D5: 테스트/마이그레이션 | 3시간 | 전체 |
| **총계** | **16시간** | |

---

**승인 시 "D1 진행해줘"로 SyncManager 구현 시작**
