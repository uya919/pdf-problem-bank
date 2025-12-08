"""
문서 설정 라우터 (Phase 8: 문항 이름 시스템)

Phase 12: utils 모듈 적용
Phase 34-A-2: document_id 파싱
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, Tuple
from pathlib import Path

from app.config import config
from app.utils import load_json, load_json_or_default, save_json


# Phase 34-A-2: document_id 파싱을 위한 유효값 목록
VALID_GRADES = ['고1', '고2', '고3', '중1', '중2', '중3']
VALID_TYPES = ['문제', '해설']


def parse_document_id(document_id: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Phase 34-A-2: document_id에서 시리즈와 과정을 추출합니다.

    document_id 형식: {학년}_{과정}_{시리즈}_{타입}
    예: "고1_공통수학1_베이직쎈_문제"

    Returns:
        (series, course) 튜플. 파싱 실패 시 (None, None)
    """
    if not document_id:
        return None, None

    parts = document_id.split('_')

    # 최소 4개 부분 필요: 학년_과정_시리즈_타입
    if len(parts) < 4:
        return None, None

    # 타입 검증 (마지막)
    doc_type = parts[-1]
    if doc_type not in VALID_TYPES:
        return None, None

    # 학년 검증 (첫번째)
    grade = parts[0]
    if grade not in VALID_GRADES:
        return None, None

    # 시리즈 (마지막에서 2번째)
    series = parts[-2]

    # 과정 (중간 부분들을 합침)
    course = '_'.join(parts[1:-2])

    return series, course


router = APIRouter()


class PageOffset(BaseModel):
    startPage: Optional[int] = None
    increment: Optional[int] = None


class DocumentSettingsUpdate(BaseModel):
    pageOffset: Optional[PageOffset] = None
    defaultBookName: Optional[str] = None
    defaultCourse: Optional[str] = None

    class Config:
        extra = "allow"  # 추가 필드 허용


@router.get("/documents/{document_id}/settings")
async def get_document_settings(document_id: str):
    """
    문서별 설정 조회

    Args:
        document_id: 문서 ID

    Returns:
        {
            "document_id": str,
            "pageOffset": {
                "startPage": int,
                "increment": int
            },
            "defaultBookName": str | null,
            "defaultCourse": str | null
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        if not doc_dir.exists():
            raise HTTPException(status_code=404, detail=f"문서를 찾을 수 없습니다: {document_id}")

        settings_file = doc_dir / "settings.json"

        # Phase 34-A-2: document_id에서 시리즈와 과정 파싱
        parsed_series, parsed_course = parse_document_id(document_id)

        # Phase 12: load_json_or_default 사용
        # Phase 34-A-2: 파싱된 값을 기본값으로 사용
        default_settings = {
            "document_id": document_id,
            "pageOffset": {
                "startPage": 1,
                "increment": 1
            },
            "defaultBookName": parsed_series,  # 파싱된 시리즈명 (예: "베이직쎈")
            "defaultCourse": parsed_course      # 파싱된 과정명 (예: "공통수학1")
        }
        settings = load_json_or_default(settings_file, default_settings)
        settings["document_id"] = document_id
        return settings

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문서 설정 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 설정 조회 실패: {str(e)}")


@router.put("/documents/{document_id}/settings")
async def save_document_settings(document_id: str, settings: DocumentSettingsUpdate):
    """
    문서별 설정 저장 (병합 방식)

    Args:
        document_id: 문서 ID
        settings: 저장할 설정 (기존 설정과 병합됨)

    Returns:
        {"message": "저장 완료"}
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        if not doc_dir.exists():
            raise HTTPException(status_code=404, detail=f"문서를 찾을 수 없습니다: {document_id}")

        settings_file = doc_dir / "settings.json"

        # Phase 12: load_json_or_default 사용
        existing = load_json_or_default(settings_file, {})

        # Pydantic 모델을 dict로 변환 (None 값 제외)
        settings_dict = settings.model_dump(exclude_none=True)

        # 병합 (새 값이 기존 값을 덮어씀)
        # pageOffset은 깊은 병합
        if "pageOffset" in settings_dict and "pageOffset" in existing:
            existing["pageOffset"] = {**existing["pageOffset"], **settings_dict["pageOffset"]}
            del settings_dict["pageOffset"]

        merged = {**existing, **settings_dict, "document_id": document_id}

        # Phase 12: save_json 사용
        save_json(settings_file, merged)

        return {"message": f"문서 '{document_id}'의 설정이 저장되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문서 설정 저장 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 설정 저장 실패: {str(e)}")
