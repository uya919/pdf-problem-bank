"""
분류 체계 API 라우터

Phase 21+ A-1: 분류 체계 DB 구축

분류 트리 조회, 검색, 경로 조회 등의 엔드포인트 제공
"""

from fastapi import APIRouter, Query, Path, HTTPException
from typing import List, Optional

from ..models.classification import (
    ClassificationNode,
    ClassificationPath,
    ClassificationSearchResult,
    ClassificationTreeResponse,
)
from ..services.classification import ClassificationTreeService

router = APIRouter(prefix="/api/classification", tags=["classification"])


def get_service() -> ClassificationTreeService:
    """분류 서비스 인스턴스 반환"""
    return ClassificationTreeService()


@router.get(
    "/tree",
    response_model=ClassificationTreeResponse,
    summary="전체 분류 트리 조회",
    description="5단계 분류 체계의 전체 트리를 반환합니다."
)
async def get_classification_tree() -> ClassificationTreeResponse:
    """
    전체 분류 트리 조회

    Returns:
        버전, 총 노드 수, 트리 데이터
    """
    service = get_service()
    return service.get_tree()


@router.get(
    "/grades",
    response_model=List[ClassificationNode],
    summary="학년 목록 조회",
    description="Level 1 (학년) 노드 목록을 반환합니다."
)
async def get_grades() -> List[ClassificationNode]:
    """
    학년 목록 조회 (Level 1)

    Returns:
        학년 노드 목록 (중1-1, 중1-2, ..., 기하)
    """
    service = get_service()
    return service.get_grades()


@router.get(
    "/nodes/{node_id}",
    response_model=ClassificationNode,
    summary="특정 노드 조회",
    description="노드 ID로 특정 분류 노드를 조회합니다."
)
async def get_node(node_id: int) -> ClassificationNode:
    """
    특정 노드 조회

    Args:
        node_id: 노드 ID

    Returns:
        분류 노드 (자식 포함)
    """
    service = get_service()
    node = service.get_node(node_id)
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    return node


@router.get(
    "/nodes/{node_id}/children",
    response_model=List[ClassificationNode],
    summary="자식 노드 목록 조회",
    description="특정 노드의 자식 노드 목록을 반환합니다."
)
async def get_children(node_id: int) -> List[ClassificationNode]:
    """
    자식 노드 목록 조회

    Args:
        node_id: 부모 노드 ID

    Returns:
        자식 노드 목록
    """
    service = get_service()

    # 부모 노드 존재 확인
    parent = service.get_node(node_id)
    if not parent:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    return service.get_children(node_id)


@router.get(
    "/nodes/{node_id}/path",
    response_model=ClassificationPath,
    summary="노드 경로 조회",
    description="노드의 루트부터의 전체 경로를 반환합니다."
)
async def get_node_path(node_id: int) -> ClassificationPath:
    """
    노드의 전체 경로 조회

    Args:
        node_id: 노드 ID

    Returns:
        ClassificationPath (학년ID, 대단원ID, ... 및 전체 경로 텍스트)
    """
    service = get_service()
    path = service.get_path(node_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    return path


@router.get(
    "/search",
    response_model=List[ClassificationSearchResult],
    summary="분류 검색",
    description="분류명으로 검색합니다."
)
async def search_classification(
    q: str = Query(..., min_length=1, description="검색어"),
    level: Optional[int] = Query(None, ge=1, le=5, description="특정 레벨에서만 검색"),
    limit: int = Query(20, ge=1, le=100, description="최대 결과 수")
) -> List[ClassificationSearchResult]:
    """
    분류 검색

    Args:
        q: 검색어 (예: "이차방정식", "미분")
        level: 특정 레벨에서만 검색 (1-5)
        limit: 최대 결과 수

    Returns:
        검색 결과 목록 (관련도 순)
    """
    service = get_service()
    return service.search(q, level=level, limit=limit)


@router.get(
    "/by-level/{level}",
    response_model=List[ClassificationNode],
    summary="레벨별 노드 조회",
    description="특정 레벨의 모든 노드를 반환합니다."
)
async def get_nodes_by_level(
    level: int = Path(..., ge=1, le=5, description="레벨 (1-5)")
) -> List[ClassificationNode]:
    """
    레벨별 노드 조회

    Args:
        level: 레벨 (1=학년, 2=대단원, 3=중단원, 4=소단원, 5=유형)

    Returns:
        해당 레벨의 모든 노드
    """
    service = get_service()
    return service.get_nodes_by_level(level)


@router.get(
    "/stats",
    summary="분류 통계 조회",
    description="레벨별 노드 수 통계를 반환합니다."
)
async def get_classification_stats() -> dict:
    """
    분류 통계 조회

    Returns:
        레벨별 노드 수 및 총 노드 수
    """
    service = get_service()
    stats = service.get_stats_by_level()
    return {
        "total": service.count_nodes(),
        "byLevel": {
            "grade": stats.get(1, 0),
            "majorUnit": stats.get(2, 0),
            "middleUnit": stats.get(3, 0),
            "minorUnit": stats.get(4, 0),
            "type": stats.get(5, 0),
        },
        "levelNames": {
            1: "학년",
            2: "대단원",
            3: "중단원",
            4: "소단원",
            5: "유형",
        }
    }
