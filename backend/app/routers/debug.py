# -*- coding: utf-8 -*-
"""
Phase 20-B: 디버그 API 엔드포인트

개발 환경에서 컨버터 상태 확인 및 디버깅을 위한 API
프로덕션 환경에서는 일부 기능이 비활성화됩니다.

엔드포인트:
- GET /debug/status: 컨버터 및 환경 상태 조회
- POST /debug/test-convert: 테스트 변환 (상세 정보 포함)
- POST /debug/reload-converter: 컨버터 강제 리로드 (개발 환경 전용)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import time

from app.utils import get_env_info, is_development, is_production
from app.services.hangul import hwp_latex_converter


router = APIRouter(prefix="/api/debug", tags=["Debug"])


class TestConvertRequest(BaseModel):
    """테스트 변환 요청"""
    hwp_equation: str


class TestConvertResponse(BaseModel):
    """테스트 변환 응답"""
    input: str
    output: str
    conversion_time_ms: float
    converter_info: dict
    environment: dict


class StatusResponse(BaseModel):
    """상태 응답"""
    converter: dict
    environment: dict
    features: dict


class ReloadResponse(BaseModel):
    """리로드 응답"""
    success: bool
    message: str
    old_instance_id: Optional[int]
    new_instance_id: Optional[int]


@router.get("/status", response_model=StatusResponse)
async def get_debug_status():
    """
    Phase 20-B: 디버그 상태 조회

    컨버터 인스턴스 정보, 환경 설정, 활성화된 기능 등을 반환합니다.
    """
    converter_info = hwp_latex_converter.get_converter_info()
    env_info = get_env_info()

    # 활성화된 기능 목록
    features = {
        "singleton_with_mtime_check": True,
        "auto_reload_on_change": is_development(),
        "debug_endpoints_enabled": True,
        "force_reload_available": is_development(),
    }

    return StatusResponse(
        converter=converter_info,
        environment=env_info,
        features=features,
    )


@router.post("/test-convert", response_model=TestConvertResponse)
async def test_convert(request: TestConvertRequest):
    """
    Phase 20-B: 테스트 변환

    HWP 수식을 LaTeX으로 변환하고 상세 정보를 반환합니다.
    디버깅 목적으로 변환 시간, 컨버터 상태 등을 포함합니다.
    """
    # 변환 전 정보
    pre_info = hwp_latex_converter.get_converter_info()

    # 변환 실행 및 시간 측정
    start_time = time.perf_counter()
    result = hwp_latex_converter.hwp_to_latex(request.hwp_equation)
    end_time = time.perf_counter()

    conversion_time_ms = (end_time - start_time) * 1000

    # 변환 후 정보
    post_info = hwp_latex_converter.get_converter_info()

    # 인스턴스가 변경되었는지 확인
    instance_changed = pre_info['instance_id'] != post_info['instance_id']
    if instance_changed:
        post_info['note'] = 'Instance was recreated during this call'

    return TestConvertResponse(
        input=request.hwp_equation,
        output=result,
        conversion_time_ms=round(conversion_time_ms, 3),
        converter_info=post_info,
        environment=get_env_info(),
    )


@router.post("/reload-converter", response_model=ReloadResponse)
async def reload_converter():
    """
    Phase 20-B: 컨버터 강제 리로드 (개발 환경 전용)

    개발 환경에서만 사용 가능합니다.
    컨버터 인스턴스를 강제로 재생성합니다.
    """
    if is_production():
        raise HTTPException(
            status_code=403,
            detail="Reload is not available in production environment"
        )

    # 기존 인스턴스 정보
    old_info = hwp_latex_converter.get_converter_info()
    old_instance_id = old_info['instance_id']

    # 강제 리셋
    hwp_latex_converter._converter = None
    hwp_latex_converter._converter_file_mtime = 0

    # 새 인스턴스 생성 (다음 호출 시 lazy 생성)
    hwp_latex_converter.hwp_to_latex("test")

    # 새 인스턴스 정보
    new_info = hwp_latex_converter.get_converter_info()
    new_instance_id = new_info['instance_id']

    return ReloadResponse(
        success=True,
        message="Converter reloaded successfully",
        old_instance_id=old_instance_id,
        new_instance_id=new_instance_id,
    )


@router.get("/patterns")
async def get_patterns():
    """
    Phase 20-B: 등록된 패턴 목록 조회

    현재 컨버터에 등록된 변환 패턴 수를 반환합니다.
    """
    # 컨버터 인스턴스 가져오기 (lazy 생성)
    converter = hwp_latex_converter._get_converter()

    pattern_info = {
        "total_patterns": len(converter.patterns) if hasattr(converter, 'patterns') else 0,
        "converter_class": type(converter).__name__,
        "instance_id": id(converter),
    }

    # 패턴 카테고리별 수 (있는 경우)
    if hasattr(converter, 'patterns'):
        pattern_info["pattern_preview"] = [
            str(p[0].pattern)[:50] + "..." if len(str(p[0].pattern)) > 50 else str(p[0].pattern)
            for p in converter.patterns[:5]  # 처음 5개만
        ]

    return pattern_info
