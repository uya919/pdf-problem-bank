"""
작업 세션 라우터 (Phase 32 → Phase 33 → Phase 37-D)

Phase 33: 통합 워크플로우
- 세션 생성 시 문제+해설 문서 동시 지정
- 그룹 생성 시 자동 문제은행 등록

Phase 37-D: SyncManager 통합
- 링크 생성/삭제 시 groups.json과 자동 동기화
- full_sync 및 sync_status API 추가
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any

from app.config import config
from app.utils import load_json, save_json
from app.models.work_session import (
    WorkSession,
    WorkSessionCreate,
    WorkSessionUpdate,
    AddProblemRequest,
    CreateLinkRequest,
    ProblemReference,
    ProblemSolutionLink,
    WorkSessionStats,
    WorkSessionListResponse,
    WorkSessionDetailResponse,
)
from app.services.sync_manager import sync_manager

router = APIRouter()


def _get_session_path(session_id: str) -> Path:
    """세션 파일 경로 반환"""
    return config.get_work_session_path(session_id)


def _load_session(session_id: str) -> WorkSession:
    """세션 로드"""
    session_path = _get_session_path(session_id)
    if not session_path.exists():
        raise HTTPException(status_code=404, detail=f"세션 '{session_id}'을 찾을 수 없습니다")
    data = load_json(session_path)
    return WorkSession(**data)


def _save_session(session: WorkSession) -> None:
    """세션 저장"""
    session_path = _get_session_path(session.sessionId)
    session.updatedAt = int(datetime.now().timestamp() * 1000)
    save_json(session_path, session.model_dump())


def _calculate_stats(session: WorkSession) -> WorkSessionStats:
    """세션 통계 계산"""
    total = len(session.problems)
    linked = len(session.links)
    progress = int((linked / total) * 100) if total > 0 else 0
    return WorkSessionStats(
        totalProblems=total,
        linkedProblems=linked,
        progress=progress
    )


# === 세션 CRUD ===

@router.get("/", response_model=WorkSessionListResponse)
async def list_sessions(
    status: Optional[str] = None,
    problem_doc_id: Optional[str] = None
):
    """
    모든 작업 세션 목록 조회

    Args:
        status: 상태 필터 (active, completed, cancelled)
        problem_doc_id: 문제 문서 ID 필터
    """
    try:
        sessions: List[WorkSession] = []

        if config.WORK_SESSIONS_DIR.exists():
            for session_file in config.WORK_SESSIONS_DIR.glob("ws-*.json"):
                try:
                    data = load_json(session_file)
                    session = WorkSession(**data)

                    # 필터 적용
                    if status and session.status != status:
                        continue
                    if problem_doc_id and session.problemDocumentId != problem_doc_id:
                        continue

                    sessions.append(session)
                except Exception as e:
                    print(f"[Phase 32] 세션 로드 실패: {session_file} - {e}")
                    continue

        # 최신순 정렬
        sessions.sort(key=lambda s: s.updatedAt, reverse=True)

        return WorkSessionListResponse(items=sessions, total=len(sessions))

    except Exception as e:
        print(f"[API 오류] 세션 목록 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 목록 조회 실패: {str(e)}")


@router.post("/", response_model=WorkSession)
async def create_session(request: WorkSessionCreate):
    """
    새 작업 세션 생성 (Phase 33: 양쪽 문서 필수)

    Args:
        request: 세션 생성 요청 (problemDocumentId, solutionDocumentId 필수)
    """
    try:
        # 세션 생성 (Phase 33: 문제+해설 동시 지정)
        session = WorkSession(
            problemDocumentId=request.problemDocumentId,
            problemDocumentName=request.problemDocumentName or "",
            solutionDocumentId=request.solutionDocumentId,
            solutionDocumentName=request.solutionDocumentName or "",
            name=request.name or f"작업 세션 ({datetime.now().strftime('%Y-%m-%d %H:%M')})",
            step="labeling"
        )

        # 저장
        _save_session(session)
        print(f"[Phase 33] 새 세션 생성: {session.sessionId} (문제: {request.problemDocumentId}, 해설: {request.solutionDocumentId})")

        return session

    except Exception as e:
        print(f"[API 오류] 세션 생성 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 생성 실패: {str(e)}")


@router.get("/{session_id}", response_model=WorkSessionDetailResponse)
async def get_session(session_id: str):
    """
    특정 작업 세션 조회

    Args:
        session_id: 세션 ID
    """
    try:
        session = _load_session(session_id)
        stats = _calculate_stats(session)

        return WorkSessionDetailResponse(session=session, stats=stats)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 세션 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 조회 실패: {str(e)}")


@router.patch("/{session_id}", response_model=WorkSession)
async def update_session(session_id: str, request: WorkSessionUpdate):
    """
    작업 세션 업데이트

    Args:
        session_id: 세션 ID
        request: 업데이트 요청
    """
    try:
        session = _load_session(session_id)

        # 업데이트 적용
        if request.name is not None:
            session.name = request.name
        if request.solutionDocumentId is not None:
            session.solutionDocumentId = request.solutionDocumentId
        if request.solutionDocumentName is not None:
            session.solutionDocumentName = request.solutionDocumentName
        if request.step is not None:
            session.step = request.step
        if request.status is not None:
            session.status = request.status
        # Phase 48: 마지막 작업 페이지 저장
        if request.lastProblemPage is not None:
            session.lastProblemPage = request.lastProblemPage
        if request.lastSolutionPage is not None:
            session.lastSolutionPage = request.lastSolutionPage

        _save_session(session)
        print(f"[Phase 48] 세션 업데이트: {session_id}")

        return session

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 세션 업데이트 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 업데이트 실패: {str(e)}")


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """
    작업 세션 삭제

    Args:
        session_id: 세션 ID
    """
    try:
        session_path = _get_session_path(session_id)
        if not session_path.exists():
            raise HTTPException(status_code=404, detail=f"세션 '{session_id}'을 찾을 수 없습니다")

        session_path.unlink()
        print(f"[Phase 32] 세션 삭제: {session_id}")

        return {"message": f"세션 '{session_id}'이 삭제되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 세션 삭제 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 삭제 실패: {str(e)}")


# === 문제 관리 ===

@router.post("/{session_id}/problems", response_model=WorkSession)
async def add_problem(session_id: str, request: AddProblemRequest):
    """
    세션에 문제 추가 (Phase 43: Upsert 지원)

    - 새 그룹: 추가
    - 기존 그룹: 정보 업데이트 (다른 페이지에서 같은 ID로 재등록 허용)

    Args:
        session_id: 세션 ID
        request: 문제 추가 요청
    """
    try:
        session = _load_session(session_id)

        # Phase 43 + Phase 47: 중복 체크 → Upsert로 변경
        # Phase 47: groupId + pageIndex 모두 일치해야 같은 문제로 판단
        existing = next((
            p for p in session.problems
            if p.groupId == request.groupId and p.pageIndex == request.pageIndex
        ), None)
        if existing:
            # 기존 문제 업데이트 (problemNumber, displayName)
            existing.problemNumber = request.problemNumber
            # Phase 45-Fix: 파싱 가능한 형식으로 기본값 변경
            existing.displayName = request.displayName or f"{request.problemNumber}번"

            _save_session(session)
            print(f"[Phase 47] 문제 업데이트 (upsert): {session_id} - {request.groupId} @ page {request.pageIndex}")

            return session

        # 문제 추가
        problem = ProblemReference(
            groupId=request.groupId,
            documentId=session.problemDocumentId,
            pageIndex=request.pageIndex,
            problemNumber=request.problemNumber,
            # Phase 45-Fix: 파싱 가능한 형식으로 기본값 변경
            displayName=request.displayName or f"{request.problemNumber}번"
        )
        session.problems.append(problem)

        _save_session(session)
        print(f"[Phase 32] 문제 추가: {session_id} - {request.problemNumber}")

        return session

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문제 추가 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문제 추가 실패: {str(e)}")


@router.delete("/{session_id}/problems/{group_id}", response_model=WorkSession)
async def remove_problem(session_id: str, group_id: str):
    """
    Phase 54-B: 세션에서 문제 삭제 (groups.json + 이미지도 삭제)

    Args:
        session_id: 세션 ID
        group_id: 그룹 ID
    """
    try:
        session = _load_session(session_id)

        # 1. 문제 찾기
        problem = next((p for p in session.problems if p.groupId == group_id), None)
        if not problem:
            raise HTTPException(status_code=404, detail=f"그룹 '{group_id}'를 찾을 수 없습니다")

        # 2. 연결된 해설 링크 찾기
        link = next((l for l in session.links if l.problemGroupId == group_id), None)

        # 3. groups.json에서 그룹 삭제
        deleted_from_disk = sync_manager.delete_group_from_disk(
            document_id=session.problemDocumentId,
            page_index=problem.pageIndex,
            group_id=group_id
        )

        # 4. 해설 groups.json에서 link 제거 (있으면)
        if link:
            sync_manager.clear_link_from_group(
                document_id=link.solutionDocumentId,
                page_index=link.solutionPageIndex,
                group_id=link.solutionGroupId
            )

        # 5. 내보낸 이미지/JSON 삭제
        deleted_exports = sync_manager.delete_exported_problem(
            document_id=session.problemDocumentId,
            page_index=problem.pageIndex,
            group_id=group_id
        )

        # 6. 세션에서 삭제
        session.problems = [p for p in session.problems if p.groupId != group_id]
        session.links = [l for l in session.links if l.problemGroupId != group_id]

        _save_session(session)

        print(f"[Phase 54] 문제 삭제: {session_id} - {group_id}")
        print(f"  - groups.json: {deleted_from_disk}")
        print(f"  - exports: {deleted_exports}")

        return session

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문제 삭제 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문제 삭제 실패: {str(e)}")


# === 연결 관리 ===

@router.post("/{session_id}/links", response_model=WorkSession)
async def create_link(session_id: str, request: CreateLinkRequest):
    """
    문제-해설 연결 생성

    Args:
        session_id: 세션 ID
        request: 연결 생성 요청
    """
    try:
        session = _load_session(session_id)

        # 문제 존재 확인
        problem = next((p for p in session.problems if p.groupId == request.problemGroupId), None)
        if not problem:
            raise HTTPException(status_code=404, detail=f"문제 '{request.problemGroupId}'를 찾을 수 없습니다")

        # 기존 연결 제거 (한 문제에 하나의 해설만 연결)
        session.links = [l for l in session.links if l.problemGroupId != request.problemGroupId]

        # 새 연결 추가
        link = ProblemSolutionLink(
            problemGroupId=request.problemGroupId,
            solutionGroupId=request.solutionGroupId,
            solutionDocumentId=request.solutionDocumentId,
            solutionPageIndex=request.solutionPageIndex
        )
        session.links.append(link)

        _save_session(session)

        # Phase 37-D: groups.json에 링크 정보 동기화
        link_data = {
            "linkedGroupId": request.problemGroupId,
            "linkedDocumentId": session.problemDocumentId,
            "linkedPageIndex": problem.pageIndex,
            "linkedName": problem.displayName,
            "linkType": "solution",
            "linkedAt": link.linkedAt
        }
        sync_manager.sync_single_link_to_group(
            solution_document_id=request.solutionDocumentId,
            solution_group_id=request.solutionGroupId,
            solution_page_index=request.solutionPageIndex,
            link_data=link_data
        )
        print(f"[Phase 37-D] 연결 생성 + 동기화: {request.problemGroupId} → {request.solutionGroupId}")

        return session

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 연결 생성 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"연결 생성 실패: {str(e)}")


@router.delete("/{session_id}/links/{problem_group_id}", response_model=WorkSession)
async def remove_link(session_id: str, problem_group_id: str):
    """
    문제-해설 연결 삭제

    Args:
        session_id: 세션 ID
        problem_group_id: 문제 그룹 ID
    """
    try:
        session = _load_session(session_id)

        # 삭제할 링크 찾기 (groups.json 업데이트용)
        link_to_remove = next(
            (l for l in session.links if l.problemGroupId == problem_group_id),
            None
        )

        # 연결 삭제
        original_count = len(session.links)
        session.links = [l for l in session.links if l.problemGroupId != problem_group_id]

        if len(session.links) == original_count:
            raise HTTPException(status_code=404, detail=f"연결을 찾을 수 없습니다")

        _save_session(session)

        # Phase 37-D: groups.json에서 링크 정보 제거
        if link_to_remove:
            sync_manager.clear_link_from_group(
                document_id=link_to_remove.solutionDocumentId,
                group_id=link_to_remove.solutionGroupId,
                page_index=link_to_remove.solutionPageIndex
            )
        print(f"[Phase 37-D] 연결 삭제 + 동기화: {problem_group_id}")

        return session

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 연결 삭제 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"연결 삭제 실패: {str(e)}")


# === 세션 초기화 ===

@router.post("/{session_id}/reset")
async def reset_session(session_id: str):
    """
    Phase 55-B: 세션 완전 초기화

    모든 문제, 연결, groups.json 데이터 삭제
    (고아 데이터 정리용)

    Args:
        session_id: 세션 ID

    Returns:
        초기화 결과 및 업데이트된 세션
    """
    try:
        session = _load_session(session_id)

        # 세션 초기화
        result = sync_manager.reset_session(session)

        # 세션 저장
        _save_session(session)

        print(f"[Phase 55] 세션 초기화: {session_id}")
        print(f"  - 문제 삭제: {result['problems_removed']}개")
        print(f"  - 연결 삭제: {result['links_removed']}개")
        print(f"  - 그룹 삭제: {result['groups_removed']}개")

        return {
            "success": True,
            "result": result,
            "session": session
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 세션 초기화 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 초기화 실패: {str(e)}")


# === 벌크 작업 ===

@router.post("/{session_id}/sync-problems", response_model=WorkSession)
async def sync_problems_from_groups(session_id: str):
    """
    groups.json에서 문제 동기화

    문서의 모든 groups.json 파일을 스캔하여
    세션의 problems 목록을 업데이트

    Args:
        session_id: 세션 ID
    """
    try:
        session = _load_session(session_id)
        doc_dir = config.get_document_dir(session.problemDocumentId)
        groups_dir = doc_dir / "groups"

        new_problems: List[ProblemReference] = []
        existing_ids = {p.groupId for p in session.problems}

        if groups_dir.exists():
            for groups_file in sorted(groups_dir.glob("page_*_groups.json")):
                page_index = int(groups_file.stem.split("_")[1])
                data = load_json(groups_file)

                for group in data.get("groups", []):
                    group_id = group.get("id")
                    if not group_id:
                        continue

                    # 이미 존재하면 스킵
                    if group_id in existing_ids:
                        continue

                    problem_info = group.get("problemInfo", {})
                    problem_number = problem_info.get("problemNumber", "?")

                    # Phase 34-A: displayName 생성 (시리즈_과정_p페이지_문항번호번)
                    parts = []
                    if problem_info.get("bookName"):
                        parts.append(problem_info["bookName"])
                    if problem_info.get("course"):
                        parts.append(problem_info["course"])
                    if problem_info.get("page"):
                        parts.append(f"p{problem_info['page']}")
                    parts.append(f"{problem_number}번")
                    display_name = "_".join(parts) if len(parts) > 1 else f"{problem_number}번"

                    new_problems.append(ProblemReference(
                        groupId=group_id,
                        documentId=session.problemDocumentId,
                        pageIndex=page_index,
                        problemNumber=problem_number,
                        displayName=display_name
                    ))

        # 새 문제 추가
        session.problems.extend(new_problems)

        _save_session(session)
        print(f"[Phase 32] 문제 동기화: {session_id} - {len(new_problems)}개 추가")

        return session

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문제 동기화 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문제 동기화 실패: {str(e)}")


# === 세션 찾기 ===

@router.get("/by-document/{document_id}", response_model=WorkSessionListResponse)
async def find_sessions_by_document(document_id: str):
    """
    특정 문서와 관련된 세션 찾기

    Args:
        document_id: 문서 ID (문제 또는 해설)
    """
    try:
        sessions: List[WorkSession] = []

        if config.WORK_SESSIONS_DIR.exists():
            for session_file in config.WORK_SESSIONS_DIR.glob("ws-*.json"):
                try:
                    data = load_json(session_file)
                    session = WorkSession(**data)

                    # 문제 또는 해설 문서와 일치하는 세션
                    if session.problemDocumentId == document_id or session.solutionDocumentId == document_id:
                        sessions.append(session)
                except Exception:
                    continue

        # 최신순 정렬
        sessions.sort(key=lambda s: s.updatedAt, reverse=True)

        return WorkSessionListResponse(items=sessions, total=len(sessions))

    except Exception as e:
        print(f"[API 오류] 세션 검색 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"세션 검색 실패: {str(e)}")


# === Phase 37-D: 동기화 API ===

@router.post("/{session_id}/full-sync")
async def full_sync(session_id: str) -> Dict[str, Any]:
    """
    세션의 완전 양방향 동기화

    1. groups.json → session.problems (문제 목록 동기화)
    2. session.links → groups.json.link (링크 정보 동기화)

    Args:
        session_id: 세션 ID

    Returns:
        동기화 결과 (성공 여부, 추가/삭제/업데이트 수)
    """
    try:
        session = _load_session(session_id)

        # SyncManager로 양방향 동기화
        result = sync_manager.full_sync(session)

        # 변경된 세션 저장
        if result.success and (result.problems_added > 0 or result.problems_removed > 0):
            _save_session(session)

        print(f"[Phase 37-D] 완전 동기화: {session_id} - "
              f"추가 {result.problems_added}, 삭제 {result.problems_removed}, "
              f"업데이트 {result.problems_updated}, 링크 {result.links_synced}")

        # Phase 37-D Fix: snake_case 키 + session 객체 반환
        return {
            "success": result.success,
            "problems_added": result.problems_added,
            "problems_removed": result.problems_removed,
            "problems_updated": result.problems_updated,
            "links_synced": result.links_synced,
            "conflicts": result.conflicts,
            "error": result.error,
            "session": session.model_dump()
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 완전 동기화 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"완전 동기화 실패: {str(e)}")


@router.get("/{session_id}/sync-status")
async def get_sync_status(session_id: str) -> Dict[str, Any]:
    """
    세션의 동기화 상태 확인

    Args:
        session_id: 세션 ID

    Returns:
        status: "synced" | "pending" | "conflict" | "error"
        groupsCount: groups.json의 그룹 수
        sessionCount: session.problems의 문제 수
        linksCount: session.links의 연결 수
    """
    try:
        session = _load_session(session_id)
        status = sync_manager.get_sync_status(session)

        print(f"[Phase 37-D] 동기화 상태 조회: {session_id} - {status.get('status')}")

        return status

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 동기화 상태 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"동기화 상태 조회 실패: {str(e)}")


@router.post("/{session_id}/sync-parent-flags")
async def sync_parent_flags(session_id: str) -> Dict[str, Any]:
    """
    Phase 56-O: 세션의 모든 문제에 대해 isParent 필드 동기화

    groups.json에서 isParent 값을 읽어 session.problems의 isParent 필드 업데이트
    (기존 데이터에 isParent 필드가 없는 경우 사용)

    Args:
        session_id: 세션 ID

    Returns:
        updated: 업데이트된 문제 수
        session: 업데이트된 세션
    """
    try:
        session = _load_session(session_id)
        doc_dir = config.get_document_dir(session.problemDocumentId)
        groups_dir = doc_dir / "groups"

        updated_count = 0

        # 각 문제에 대해 groups.json에서 isParent 읽기
        for problem in session.problems:
            page_index = problem.pageIndex
            groups_file = groups_dir / f"page_{page_index:04d}_groups.json"

            if not groups_file.exists():
                continue

            data = load_json(groups_file)
            for group in data.get("groups", []):
                if group.get("id") != problem.groupId:
                    continue

                # isParent 값 동기화
                is_parent = group.get("isParent", False)
                if problem.isParent != is_parent:
                    problem.isParent = is_parent
                    updated_count += 1
                    print(f"[Phase 56-O] Updated isParent: {problem.groupId} -> {is_parent}")

                break

        # 변경사항 저장
        if updated_count > 0:
            _save_session(session)
            print(f"[Phase 56-O] isParent 동기화 완료: {session_id} - {updated_count}개 업데이트")

        return {
            "success": True,
            "updated": updated_count,
            "session": session
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] isParent 동기화 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"isParent 동기화 실패: {str(e)}")


@router.post("/{session_id}/validate-sync")
async def validate_sync(session_id: str) -> Dict[str, Any]:
    """
    Phase 59-B: groups.json과 session.problems 일치 여부 검증 및 수정

    session.problems에 있지만 groups.json에 없는 "orphan" 문제를 찾아서 삭제

    Returns:
        status: "ok" (문제 없음) | "fixed" (수정됨)
        issues_found: 발견된 문제 수
        issues_fixed: 수정된 문제 수
        details: 상세 내용
    """
    try:
        session = _load_session(session_id)
        issues = []
        orphan_problem_ids = set()

        # 각 문제에 대해 groups.json 존재 여부 확인
        for problem in session.problems:
            doc_id = problem.documentId
            page_idx = problem.pageIndex
            group_id = problem.groupId

            doc_dir = config.get_document_dir(doc_id)
            groups_file = doc_dir / "groups" / f"page_{page_idx:04d}_groups.json"

            if not groups_file.exists():
                issues.append({
                    "type": "missing_groups_file",
                    "problem": group_id,
                    "page": page_idx,
                    "documentId": doc_id,
                    "action": "will_remove"
                })
                orphan_problem_ids.add(group_id)
                continue

            groups_data = load_json(groups_file)
            group_exists = any(g.get("id") == group_id for g in groups_data.get("groups", []))

            if not group_exists:
                issues.append({
                    "type": "orphan_problem",
                    "problem": group_id,
                    "page": page_idx,
                    "documentId": doc_id,
                    "action": "will_remove"
                })
                orphan_problem_ids.add(group_id)

        # 자동 수정: orphan problems 및 관련 links 제거
        fixed_count = 0
        if orphan_problem_ids:
            original_problem_count = len(session.problems)
            original_link_count = len(session.links)

            # 문제 제거
            session.problems = [
                p for p in session.problems
                if p.groupId not in orphan_problem_ids
            ]

            # 관련 링크 제거 (문제 또는 해설이 orphan인 경우)
            session.links = [
                l for l in session.links
                if l.problemGroupId not in orphan_problem_ids
            ]

            fixed_count = original_problem_count - len(session.problems)
            removed_links = original_link_count - len(session.links)

            # 세션 저장
            _save_session(session)
            print(f"[Phase 59-B] validate-sync: {session_id} - {fixed_count}개 orphan 문제, {removed_links}개 링크 제거")

        return {
            "status": "fixed" if fixed_count > 0 else "ok",
            "issues_found": len(issues),
            "issues_fixed": fixed_count,
            "details": issues
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] validate-sync 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"validate-sync 실패: {str(e)}")


@router.post("/{session_id}/refresh-display-names")
async def refresh_display_names(session_id: str) -> Dict[str, Any]:
    """
    Phase 46-A: 모든 문제의 displayName 새로고침

    groups.json에서 problemInfo를 읽어 displayName 재생성
    기존 레거시 데이터("문제 L1")를 새 형식("베이직쎈_p10_3")으로 업그레이드

    Args:
        session_id: 세션 ID

    Returns:
        updated: 업데이트된 문제 수
        session: 업데이트된 세션
    """
    try:
        session = _load_session(session_id)
        doc_dir = config.get_document_dir(session.problemDocumentId)
        groups_dir = doc_dir / "groups"

        updated_count = 0

        # 문서명에서 기본 책이름 추출
        doc_store = config.DATASET_ROOT / "documents.json"
        default_book_name = "문제"
        if doc_store.exists():
            docs = load_json(doc_store)
            for doc in docs.get("documents", []):
                if doc.get("id") == session.problemDocumentId:
                    doc_name = doc.get("name", "")
                    # "고1 공통수학1 - 베이직쎈" → "베이직쎈"
                    if " - " in doc_name:
                        default_book_name = doc_name.split(" - ")[-1].strip()
                    elif "_" in doc_name:
                        default_book_name = doc_name.split("_")[0].strip()
                    else:
                        default_book_name = doc_name.strip() or "문제"
                    break

        # 각 문제에 대해 groups.json에서 정보 읽기
        for problem in session.problems:
            page_index = problem.pageIndex
            groups_file = groups_dir / f"page_{page_index:04d}_groups.json"

            if not groups_file.exists():
                continue

            data = load_json(groups_file)
            for group in data.get("groups", []):
                if group.get("id") != problem.groupId:
                    continue

                problem_info = group.get("problemInfo", {})
                problem_number = problem_info.get("problemNumber") or problem.problemNumber or "?"

                # displayName 재생성
                parts = []
                book_name = problem_info.get("bookName") or default_book_name
                parts.append(book_name)

                if problem_info.get("course"):
                    parts.append(problem_info["course"])

                page = problem_info.get("page") or str(page_index + 1)
                parts.append(f"p{page}")

                parts.append(problem_number)

                new_display_name = "_".join(parts)

                # 변경되었으면 업데이트
                if problem.displayName != new_display_name:
                    print(f"[Phase 46-A] Updating displayName: '{problem.displayName}' → '{new_display_name}'")
                    problem.displayName = new_display_name
                    problem.problemNumber = problem_number
                    updated_count += 1

                break

        # 변경사항 저장
        if updated_count > 0:
            _save_session(session)
            print(f"[Phase 46-A] displayName 새로고침 완료: {session_id} - {updated_count}개 업데이트")

        return {
            "success": True,
            "updated": updated_count,
            "session": session
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] displayName 새로고침 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"displayName 새로고침 실패: {str(e)}")
