"""
메이크에듀 동기화 API 라우터 (Phase 6-D, 6-G)

Railway Worker로 프록시하여 동기화 작업 처리
"""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.config import config

router = APIRouter(prefix="/api/sync", tags=["Sync"])

# Railway Worker URL (config에서 로드)
RAILWAY_WORKER_URL = config.RAILWAY_WORKER_URL

# httpx 클라이언트 설정
client = httpx.AsyncClient(timeout=120.0)  # 2분 타임아웃


# =====================================================
# Request/Response Models
# =====================================================

class SyncTriggerRequest(BaseModel):
    """동기화 시작 요청"""
    preview: bool = True


class SyncTriggerResponse(BaseModel):
    """동기화 시작 응답"""
    jobId: str


class SyncStatusResponse(BaseModel):
    """작업 상태 응답"""
    status: str  # started, scraping, syncing, completed, failed
    progress: int
    message: str
    preview: Optional[bool] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class WorkerHealthResponse(BaseModel):
    """Worker 헬스체크 응답"""
    status: str
    timestamp: str
    jobs_count: int
    env_check: dict


# =====================================================
# API Endpoints
# =====================================================

@router.get("/health")
async def sync_health():
    """
    동기화 서비스 헬스체크

    Railway Worker의 상태를 확인합니다.
    """
    try:
        response = await client.get(f"{RAILWAY_WORKER_URL}/health")
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Railway Worker 연결 실패: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Railway Worker 에러: {e.response.text}"
        )


@router.post("/makeedu/trigger", response_model=SyncTriggerResponse)
async def trigger_sync(request: SyncTriggerRequest):
    """
    메이크에듀 동기화 시작

    Args:
        request.preview: True면 미리보기, False면 실제 동기화

    Returns:
        jobId: 작업 ID (상태 조회용)
    """
    try:
        endpoint = "/sync/preview" if request.preview else "/sync/execute"
        response = await client.post(f"{RAILWAY_WORKER_URL}{endpoint}")
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Railway Worker 연결 실패: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"동기화 시작 실패: {e.response.text}"
        )


@router.get("/makeedu/status/{job_id}", response_model=SyncStatusResponse)
async def get_sync_status(job_id: str):
    """
    동기화 작업 상태 조회

    Args:
        job_id: 작업 ID

    Returns:
        작업 상태 (status, progress, message, result 등)
    """
    try:
        response = await client.get(f"{RAILWAY_WORKER_URL}/sync/status/{job_id}")
        response.raise_for_status()
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Railway Worker 연결 실패: {str(e)}"
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="작업을 찾을 수 없습니다"
            )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"상태 조회 실패: {e.response.text}"
        )


@router.get("/config")
async def get_sync_config():
    """
    동기화 설정 조회

    Railway Worker URL 및 설정 확인용
    """
    return {
        "railway_worker_url": RAILWAY_WORKER_URL,
        "timeout_seconds": 120,
        "endpoints": {
            "health": f"{RAILWAY_WORKER_URL}/health",
            "preview": f"{RAILWAY_WORKER_URL}/sync/preview",
            "execute": f"{RAILWAY_WORKER_URL}/sync/execute",
            "status": f"{RAILWAY_WORKER_URL}/sync/status/<job_id>",
        }
    }
