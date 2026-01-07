"""
Hyeyum Backoffice FastAPI 메인 애플리케이션

백오피스 전용 API:
- 사용자 관리 (admin_users)
- 학년 일괄 승급 (grade_promotion)
- NAS 교재 스트리밍 (nas)
- 메이크에듀 동기화 (sync)
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
import sys
import logging
import traceback
from datetime import datetime

# 로깅 설정 (B-4)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("hyeyum-backoffice-api")

# 프로젝트 루트를 sys.path에 추가 (src 모듈 import용)
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from app.config import config
from app.routers import sync, admin_users, grade_promotion, nas
from app.routers import config as config_router


# FastAPI 앱 생성
app = FastAPI(
    title="Hyeyum Backoffice API",
    description="혜윰학원 백오피스 API (사용자 관리, 학년 승급, NAS 교재, 동기화)",
    version="2.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 라우터 등록 (백오피스 전용)
app.include_router(config_router.router, prefix="/api/config", tags=["Config"])
app.include_router(sync.router)  # 메이크에듀 동기화 API
app.include_router(admin_users.router)  # 사용자 관리 API
app.include_router(grade_promotion.router)  # 학년 일괄 승급 API
app.include_router(nas.router)  # NAS 교재 API


@app.get("/")
async def root():
    """API 루트"""
    return {
        "message": "Hyeyum Backoffice API",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "api_version": "2.0.0"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    전역 예외 처리 (B-4: 에러 로깅 개선)

    - 상세 에러 로그 출력
    - 요청 정보 포함
    - 스택 트레이스 기록
    """
    # 에러 상세 로깅
    error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:17]
    logger.error(
        f"[{error_id}] Unhandled Exception\n"
        f"  URL: {request.method} {request.url}\n"
        f"  Type: {type(exc).__name__}\n"
        f"  Message: {str(exc)}\n"
        f"  Traceback:\n{traceback.format_exc()}"
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "error_id": error_id,
            "message": str(exc),
            "type": type(exc).__name__
        }
    )


@app.on_event("startup")
async def startup_event():
    """서버 시작 시 로깅"""
    logger.info("=" * 50)
    logger.info("Hyeyum Backoffice API 서버 시작")
    logger.info(f"CORS Origins: {config.CORS_ORIGINS}")
    logger.info("=" * 50)


if __name__ == "__main__":
    import uvicorn

    logger.info(f"Starting FastAPI server on {config.API_HOST}:{config.API_PORT}")
    logger.info(f"Docs: http://localhost:{config.API_PORT}/docs")

    uvicorn.run(
        "app.main:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True
    )
