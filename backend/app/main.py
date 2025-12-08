"""
FastAPI 메인 애플리케이션 (Phase 1)

B-4: 에러 로깅 개선 (2025-12-07)
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
logger = logging.getLogger("pdf-labeling-api")

# 프로젝트 루트를 sys.path에 추가 (src 모듈 import용)
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from app.config import config
from app.routers import pdf, blocks, export, stats, documents, hangul, debug, classification, problems, exam_papers, matching, document_pairs, work_sessions
from app.routers import config as config_router


# FastAPI 앱 생성
app = FastAPI(
    title="PDF Labeling API",
    description="수학 문제집 PDF 분석 및 라벨링 API (Phase 1: Lazy Loading)",
    version="1.0.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 라우터 등록
app.include_router(pdf.router, prefix="/api/pdf", tags=["PDF"])
app.include_router(blocks.router, prefix="/api/blocks", tags=["Blocks"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(stats.router)  # stats 라우터는 이미 prefix="/api/stats"를 포함
app.include_router(documents.router, prefix="/api", tags=["Documents"])
app.include_router(hangul.router, prefix="/api/hangul", tags=["Hangul"])  # Phase 16: 한글 파일 지원
app.include_router(debug.router)  # Phase 20-B: 디버그 API (prefix 포함)
app.include_router(classification.router)  # Phase 21+: 분류 체계 API
app.include_router(problems.router)  # Phase 21+ A-2: 문제 API
app.include_router(exam_papers.router)  # Phase 21+ D-1: 시험지 API
app.include_router(matching.router)  # Phase 22: 문제-해설 매칭 API
app.include_router(document_pairs.router)  # Phase 22-L: 문서 페어링 API
app.include_router(work_sessions.router, prefix="/api/work-sessions", tags=["WorkSessions"])  # Phase 32: 작업 세션 API
app.include_router(config_router.router, prefix="/api/config", tags=["Config"])  # Phase 34-C: 설정 관리 API


@app.get("/")
async def root():
    """API 루트"""
    return {
        "message": "PDF Labeling API",
        "version": "1.0.0",
        "phase": "Phase 1: Lazy Loading",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "dataset_root": str(config.DATASET_ROOT),
        "api_version": "1.0.0"
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
    """서버 시작 시 로깅 (B-4)"""
    logger.info("=" * 50)
    logger.info("PDF Labeling API 서버 시작")
    logger.info(f"Dataset Root: {config.DATASET_ROOT}")
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
