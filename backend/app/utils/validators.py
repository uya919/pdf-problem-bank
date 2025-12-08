"""
Phase 12-2: 검증 유틸리티

문서/페이지 존재 검증
"""
from pathlib import Path
from fastapi import HTTPException
from app.config import config


def validate_document_exists(document_id: str) -> Path:
    """
    문서 디렉토리 존재 확인

    Args:
        document_id: 문서 ID

    Returns:
        문서 디렉토리 경로

    Raises:
        HTTPException(404): 문서가 없을 때
    """
    doc_dir = config.get_document_dir(document_id)
    if not doc_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"문서를 찾을 수 없습니다: {document_id}"
        )
    return doc_dir


def validate_page_exists(document_id: str, page_index: int) -> Path:
    """
    페이지 이미지 파일 존재 확인

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스

    Returns:
        페이지 이미지 경로

    Raises:
        HTTPException(404): 페이지가 없을 때
    """
    doc_dir = validate_document_exists(document_id)
    page_file = doc_dir / "pages" / f"page_{page_index:04d}.png"

    if not page_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"페이지를 찾을 수 없습니다: {page_index}"
        )
    return page_file


def validate_blocks_exist(document_id: str, page_index: int) -> Path:
    """
    블록 JSON 파일 존재 확인

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스

    Returns:
        블록 JSON 파일 경로

    Raises:
        HTTPException(404): 블록 데이터가 없을 때
    """
    doc_dir = validate_document_exists(document_id)
    blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"

    if not blocks_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"블록 데이터를 찾을 수 없습니다: 페이지 {page_index}"
        )
    return blocks_file


def validate_groups_exist(document_id: str, page_index: int) -> Path:
    """
    그룹 JSON 파일 존재 확인

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스

    Returns:
        그룹 JSON 파일 경로

    Raises:
        HTTPException(404): 그룹 데이터가 없을 때
    """
    doc_dir = validate_document_exists(document_id)
    groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"

    if not groups_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"그룹 데이터를 찾을 수 없습니다: 페이지 {page_index}"
        )
    return groups_file
