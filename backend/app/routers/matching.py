"""
문제-해설 매칭 API 라우터

Phase 22-E: 문제-해설 매칭 시스템 백엔드

매칭 세션 CRUD 및 매칭 결과 저장/조회 API
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from pathlib import Path
import json
from datetime import datetime

from ..config import config
from ..models.matching import (
    MatchingSession,
    MatchingSessionCreate,
    MatchingSessionUpdate,
    MatchingSessionListResponse,
    MatchingSessionStats,
    ProblemSolutionMatch,
    SaveMatchRequest,
    PendingProblem,
)


router = APIRouter(prefix="/api/matching", tags=["matching"])


# 매칭 데이터 저장 경로
def get_matching_dir() -> Path:
    """매칭 데이터 저장 디렉토리"""
    matching_dir = config.DATASET_ROOT / "matching"
    matching_dir.mkdir(parents=True, exist_ok=True)
    return matching_dir


def get_session_path(session_id: str) -> Path:
    """세션 파일 경로"""
    return get_matching_dir() / f"{session_id}.json"


def load_session(session_id: str) -> Optional[MatchingSession]:
    """세션 로드"""
    path = get_session_path(session_id)
    if not path.exists():
        return None
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return MatchingSession(**data)
    except Exception as e:
        print(f"[Phase 22-E] Error loading session {session_id}: {e}")
        return None


def save_session(session: MatchingSession) -> None:
    """세션 저장"""
    path = get_session_path(session.sessionId)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(session.model_dump(), f, ensure_ascii=False, indent=2)


def list_all_sessions() -> List[MatchingSession]:
    """모든 세션 목록"""
    sessions = []
    matching_dir = get_matching_dir()
    for path in matching_dir.glob("session-*.json"):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            sessions.append(MatchingSession(**data))
        except Exception as e:
            print(f"[Phase 22-E] Error loading session from {path}: {e}")
    # 최신순 정렬
    sessions.sort(key=lambda s: s.createdAt, reverse=True)
    return sessions


# ========== 세션 관리 API ==========

@router.get("/sessions", response_model=MatchingSessionListResponse)
async def get_sessions(
    status: Optional[str] = Query(None, description="세션 상태 필터"),
    limit: int = Query(20, ge=1, le=100, description="조회 개수"),
):
    """
    매칭 세션 목록 조회
    """
    sessions = list_all_sessions()

    # 상태 필터
    if status:
        sessions = [s for s in sessions if s.status == status]

    # 제한
    sessions = sessions[:limit]

    return MatchingSessionListResponse(
        items=sessions,
        total=len(sessions)
    )


@router.get("/sessions/stats", response_model=MatchingSessionStats)
async def get_session_stats():
    """
    매칭 세션 통계
    """
    sessions = list_all_sessions()

    total_matches = sum(len(s.matchedPairs) for s in sessions)
    active = len([s for s in sessions if s.status == "active"])
    completed = len([s for s in sessions if s.status == "completed"])

    return MatchingSessionStats(
        totalSessions=len(sessions),
        activeSessions=active,
        completedSessions=completed,
        totalMatches=total_matches
    )


@router.post("/sessions", response_model=MatchingSession)
async def create_session(
    data: MatchingSessionCreate = Body(...)
):
    """
    새 매칭 세션 생성
    """
    session = MatchingSession(
        name=data.name,
        problemDocumentId=data.problemDocumentId,
        solutionDocumentId=data.solutionDocumentId,
    )

    save_session(session)
    print(f"[Phase 22-E] Created session: {session.sessionId}")

    return session


@router.get("/sessions/{session_id}", response_model=MatchingSession)
async def get_session(session_id: str):
    """
    매칭 세션 조회
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")
    return session


@router.patch("/sessions/{session_id}", response_model=MatchingSession)
async def update_session(
    session_id: str,
    data: MatchingSessionUpdate = Body(...)
):
    """
    매칭 세션 업데이트
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    # 업데이트
    if data.name is not None:
        session.name = data.name
    if data.status is not None:
        session.status = data.status

    session.updatedAt = int(datetime.now().timestamp() * 1000)
    save_session(session)

    return session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    매칭 세션 삭제
    """
    path = get_session_path(session_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    path.unlink()
    print(f"[Phase 22-E] Deleted session: {session_id}")

    return {"success": True, "message": "세션이 삭제되었습니다"}


# ========== 매칭 관리 API ==========

@router.post("/sessions/{session_id}/matches", response_model=ProblemSolutionMatch)
async def add_match(
    session_id: str,
    data: SaveMatchRequest = Body(...)
):
    """
    매칭 추가

    문제-해설 매칭을 세션에 저장합니다.
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    # 매칭 생성
    match = ProblemSolutionMatch(
        sessionId=session_id,
        problem=data.problem,
        solution=data.solution,
    )

    # 대기 목록에서 제거 (있다면)
    session.pendingProblems = [
        p for p in session.pendingProblems
        if p.groupId != data.problem.groupId
    ]

    # 매칭 목록에 추가
    session.matchedPairs.append(match)
    session.updatedAt = int(datetime.now().timestamp() * 1000)

    save_session(session)
    print(f"[Phase 22-E] Added match: {match.matchId} to session {session_id}")

    return match


@router.delete("/sessions/{session_id}/matches/{match_id}")
async def remove_match(
    session_id: str,
    match_id: str
):
    """
    매칭 취소

    매칭을 취소하고 문제를 대기 목록으로 복원합니다.
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    # 매칭 찾기
    match = next((m for m in session.matchedPairs if m.matchId == match_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="매칭을 찾을 수 없습니다")

    # 매칭 목록에서 제거
    session.matchedPairs = [m for m in session.matchedPairs if m.matchId != match_id]

    # 문제를 대기 목록에 다시 추가
    session.pendingProblems.append(match.problem)
    session.updatedAt = int(datetime.now().timestamp() * 1000)

    save_session(session)
    print(f"[Phase 22-E] Removed match: {match_id} from session {session_id}")

    return {"success": True, "message": "매칭이 취소되었습니다"}


@router.get("/sessions/{session_id}/matches", response_model=List[ProblemSolutionMatch])
async def get_matches(session_id: str):
    """
    세션의 모든 매칭 조회
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    return session.matchedPairs


# ========== 대기 문제 관리 API ==========

@router.post("/sessions/{session_id}/pending", response_model=PendingProblem)
async def add_pending(
    session_id: str,
    data: PendingProblem = Body(...)
):
    """
    대기 문제 추가
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    # 중복 체크
    existing = next((p for p in session.pendingProblems if p.groupId == data.groupId), None)
    if existing:
        return existing

    session.pendingProblems.append(data)
    session.updatedAt = int(datetime.now().timestamp() * 1000)

    save_session(session)

    return data


@router.delete("/sessions/{session_id}/pending/{group_id}")
async def remove_pending(
    session_id: str,
    group_id: str
):
    """
    대기 문제 제거
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    original_count = len(session.pendingProblems)
    session.pendingProblems = [p for p in session.pendingProblems if p.groupId != group_id]

    if len(session.pendingProblems) == original_count:
        raise HTTPException(status_code=404, detail="대기 문제를 찾을 수 없습니다")

    session.updatedAt = int(datetime.now().timestamp() * 1000)
    save_session(session)

    return {"success": True, "message": "대기 문제가 제거되었습니다"}


@router.get("/sessions/{session_id}/pending", response_model=List[PendingProblem])
async def get_pending(session_id: str):
    """
    세션의 대기 문제 목록
    """
    session = load_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다")

    return session.pendingProblems


# ========== 세션 상태 동기화 API ==========

@router.post("/sessions/{session_id}/sync")
async def sync_session_state(
    session_id: str,
    data: dict = Body(...)
):
    """
    세션 상태 동기화

    프론트엔드에서 전체 상태를 서버에 동기화합니다.
    """
    session = load_session(session_id)
    if not session:
        # 세션이 없으면 새로 생성
        session = MatchingSession(sessionId=session_id)

    # 상태 업데이트
    if "pendingProblems" in data:
        session.pendingProblems = [
            PendingProblem(**p) for p in data["pendingProblems"]
        ]

    if "matchedPairs" in data:
        session.matchedPairs = [
            ProblemSolutionMatch(**m) for m in data["matchedPairs"]
        ]

    session.updatedAt = int(datetime.now().timestamp() * 1000)
    save_session(session)

    return {"success": True, "message": "상태가 동기화되었습니다"}


@router.get("/sessions/{session_id}/state")
async def get_session_state(session_id: str):
    """
    세션 상태 조회

    프론트엔드에서 초기 상태를 로드할 때 사용합니다.
    """
    session = load_session(session_id)
    if not session:
        return {
            "sessionId": session_id,
            "pendingProblems": [],
            "matchedPairs": [],
            "exists": False
        }

    return {
        "sessionId": session.sessionId,
        "pendingProblems": [p.model_dump() for p in session.pendingProblems],
        "matchedPairs": [m.model_dump() for m in session.matchedPairs],
        "exists": True
    }


# ========== Phase 24-C: 해설 연결 정보 API ==========

@router.get("/linked-solutions")
async def get_linked_solutions():
    """
    Phase 24-C → Phase 57-G: 해설 연결 정보 조회

    모든 작업 세션(WorkSession)에서 문제-해설 연결 정보를 집계합니다.
    문제은행에서 해설이 연결된 문제를 표시하기 위해 사용됩니다.

    Phase 57-G: MatchingSession.matchedPairs 대신 WorkSession.links 사용

    Returns:
        {
            "links": {
                "documentId|pageIndex|groupId": {
                    "solutionDocumentId": str,
                    "solutionPageIndex": int,
                    "solutionGroupId": str,
                    "sessionId": str
                }
            },
            "total": int
        }
    """
    from ..config import config
    from ..utils.file_utils import load_json
    from ..models.work_session import WorkSession

    # 문제 키 -> 해설 정보 맵
    links = {}

    # Phase 57-G: WorkSession에서 links 읽기
    if config.WORK_SESSIONS_DIR.exists():
        for session_file in config.WORK_SESSIONS_DIR.glob("ws-*.json"):
            try:
                data = load_json(session_file)
                session = WorkSession(**data)

                # problems를 그룹 ID로 인덱싱
                problems_by_group = {p.groupId: p for p in session.problems}

                for link in session.links:
                    # 문제 정보 찾기
                    problem = problems_by_group.get(link.problemGroupId)
                    if not problem:
                        continue

                    # 문제 고유 키: documentId|pageIndex|groupId
                    key = f"{problem.documentId}|{problem.pageIndex}|{problem.groupId}"

                    # 이미 링크가 있으면 더 최신 것을 사용
                    if key not in links or link.linkedAt > links[key].get("matchedAt", 0):
                        links[key] = {
                            "solutionDocumentId": link.solutionDocumentId,
                            "solutionPageIndex": link.solutionPageIndex,
                            "solutionGroupId": link.solutionGroupId,
                            "sessionId": session.sessionId,
                            "matchedAt": link.linkedAt,
                            "problemNumber": problem.problemNumber
                        }
            except Exception as e:
                print(f"[linked-solutions] 세션 로드 실패: {session_file.name}, {e}")
                continue

    return {
        "links": links,
        "total": len(links)
    }
