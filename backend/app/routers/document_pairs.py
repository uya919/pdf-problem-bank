"""
문서 페어 API 라우터

Phase 22-L: 영구 페어링 시스템

문제-해설 문서 페어를 관리하는 REST API입니다.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from ..models.document_pair import (
    DocumentPair,
    CreatePairRequest,
    UpdatePairRequest,
    PairStats,
    DocumentPairList
)
from ..services.document_pair_service import document_pair_service

router = APIRouter(prefix="/api/document-pairs", tags=["document-pairs"])


@router.post("", response_model=DocumentPair)
async def create_pair(request: CreatePairRequest):
    """
    문서 페어 생성

    이미 동일한 페어가 있으면 기존 페어를 반환합니다.
    """
    return document_pair_service.create_pair(request)


@router.get("", response_model=DocumentPairList)
async def list_pairs(
    status: Optional[str] = Query(None, description="상태 필터 (active, archived)")
):
    """
    페어 목록 조회

    Args:
        status: 상태 필터 (선택)
    """
    pairs = document_pair_service.list_pairs(status)
    return DocumentPairList(items=pairs, total=len(pairs))


@router.get("/stats", response_model=PairStats)
async def get_stats():
    """페어 통계 조회"""
    return document_pair_service.get_stats()


@router.get("/by-document/{document_id}", response_model=List[DocumentPair])
async def get_pairs_for_document(document_id: str):
    """
    특정 문서가 포함된 모든 페어 조회

    문서가 문제 또는 해설로 포함된 모든 페어를 반환합니다.
    """
    return document_pair_service.get_pairs_for_document(document_id)


@router.get("/{pair_id}", response_model=DocumentPair)
async def get_pair(pair_id: str):
    """페어 조회"""
    pair = document_pair_service.get_pair(pair_id)
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return pair


@router.patch("/{pair_id}", response_model=DocumentPair)
async def update_pair(pair_id: str, request: UpdatePairRequest):
    """페어 업데이트"""
    pair = document_pair_service.update_pair(pair_id, request)
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return pair


@router.delete("/{pair_id}")
async def delete_pair(
    pair_id: str,
    hard_delete: bool = Query(False, description="완전 삭제 여부")
):
    """
    페어 삭제

    기본적으로 archived 상태로 변경됩니다.
    hard_delete=true로 설정하면 완전히 삭제됩니다.
    """
    success = document_pair_service.delete_pair(pair_id, hard_delete)
    if not success:
        raise HTTPException(status_code=404, detail="Pair not found")
    return {
        "success": True,
        "message": "Pair deleted" if hard_delete else "Pair archived"
    }


@router.post("/{pair_id}/increment-matched")
async def increment_matched_count(pair_id: str, count: int = Query(1, ge=1)):
    """매칭 수 증가"""
    pair = document_pair_service.increment_matched_count(pair_id, count)
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return pair
