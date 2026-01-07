"""
NAS 교재 API (Stage 47)

엔드포인트:
- GET /api/nas/folders - 폴더 목록
- GET /api/nas/files - PDF 파일 목록
- GET /api/nas/pdf/{path} - PDF 스트리밍
- GET /api/nas/test - 연결 테스트
"""
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse, JSONResponse
from typing import List, Optional
from pydantic import BaseModel
from urllib.parse import unquote

from app.services.nas_client import get_nas_client, NasFile
from app.config import settings


router = APIRouter(prefix="/api/nas", tags=["NAS"])


# ==================== Response Models ====================

class NasFileResponse(BaseModel):
    """NAS 파일 응답"""
    name: str
    path: str
    size: int
    isDir: bool
    modified: str


class NasFolderResponse(BaseModel):
    """NAS 폴더 목록 응답"""
    path: str
    files: List[NasFileResponse]


class NasTestResponse(BaseModel):
    """연결 테스트 응답"""
    success: bool
    message: str
    baseUrl: str
    textbookPath: str


# ==================== Helper Functions ====================

def nas_file_to_response(f: NasFile) -> NasFileResponse:
    """NasFile → Response 변환"""
    return NasFileResponse(
        name=f.name,
        path=f.path,
        size=f.size,
        isDir=f.is_dir,
        modified=f.modified
    )


# ==================== Endpoints ====================

@router.get("/test", response_model=NasTestResponse)
async def test_connection():
    """
    NAS 연결 테스트

    Returns:
        연결 상태 및 설정 정보
    """
    try:
        client = get_nas_client()
        # 루트 폴더 접근 테스트
        files = await client.list_folder("/")

        return NasTestResponse(
            success=True,
            message=f"연결 성공 - {len(files)}개 폴더/파일 발견",
            baseUrl=settings.NAS_WEBDAV_URL,
            textbookPath=settings.NAS_TEXTBOOK_PATH
        )
    except PermissionError:
        return NasTestResponse(
            success=False,
            message="인증 실패 - 사용자명/비밀번호 확인 필요",
            baseUrl=settings.NAS_WEBDAV_URL,
            textbookPath=settings.NAS_TEXTBOOK_PATH
        )
    except Exception as e:
        return NasTestResponse(
            success=False,
            message=f"연결 실패: {str(e)}",
            baseUrl=settings.NAS_WEBDAV_URL,
            textbookPath=settings.NAS_TEXTBOOK_PATH
        )


@router.get("/folders", response_model=NasFolderResponse)
async def list_folders(
    path: str = Query(default=None, description="폴더 경로 (기본: 교재 루트)")
):
    """
    폴더 내 파일/폴더 목록 조회

    Args:
        path: 폴더 경로 (기본값: NAS_TEXTBOOK_PATH)

    Returns:
        폴더 내 파일/폴더 목록
    """
    try:
        client = get_nas_client()

        # 기본 경로: 교재 폴더
        folder_path = path if path else settings.NAS_TEXTBOOK_PATH

        files = await client.list_folder(folder_path)

        return NasFolderResponse(
            path=folder_path,
            files=[nas_file_to_response(f) for f in files]
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"폴더를 찾을 수 없음: {path}")
    except PermissionError:
        raise HTTPException(status_code=401, detail="NAS 인증 실패")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files")
async def list_pdf_files(
    path: str = Query(default=None, description="폴더 경로"),
    recursive: bool = Query(default=False, description="하위 폴더 포함")
):
    """
    PDF 파일 목록 조회

    Args:
        path: 폴더 경로 (기본값: NAS_TEXTBOOK_PATH)
        recursive: 하위 폴더 재귀 탐색 여부

    Returns:
        PDF 파일 목록
    """
    try:
        client = get_nas_client()

        folder_path = path if path else settings.NAS_TEXTBOOK_PATH

        pdf_files = await client.list_pdf_files(folder_path, recursive=recursive)

        return {
            "path": folder_path,
            "recursive": recursive,
            "count": len(pdf_files),
            "files": [nas_file_to_response(f) for f in pdf_files]
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"폴더를 찾을 수 없음: {path}")
    except PermissionError:
        raise HTTPException(status_code=401, detail="NAS 인증 실패")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pdf/{file_path:path}")
async def stream_pdf(
    file_path: str,
    request: Request
):
    """
    PDF 파일 스트리밍 (Range 요청 지원)

    Args:
        file_path: 파일 경로 (URL 인코딩)
        request: FastAPI Request (Range 헤더 추출용)

    Returns:
        PDF 파일 스트림
    """
    try:
        client = get_nas_client()

        # URL 디코딩
        decoded_path = unquote(file_path)

        # 파일 정보 조회
        file_info = await client.get_file_info(decoded_path)
        if file_info is None:
            raise HTTPException(status_code=404, detail=f"파일을 찾을 수 없음: {decoded_path}")

        if file_info.is_dir:
            raise HTTPException(status_code=400, detail="폴더는 다운로드할 수 없습니다")

        file_size = file_info.size

        # Range 헤더 파싱
        range_header = request.headers.get("range")
        range_start = None
        range_end = None

        if range_header:
            # "bytes=0-1023" 형식 파싱
            range_spec = range_header.replace("bytes=", "")
            if "-" in range_spec:
                parts = range_spec.split("-")
                range_start = int(parts[0]) if parts[0] else None
                range_end = int(parts[1]) if parts[1] else None

        # 스트리밍 응답 생성
        async def generate():
            async for chunk in client.get_file_stream(decoded_path, range_start, range_end):
                yield chunk

        # Content-Range 헤더 설정
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{file_info.name}"',
        }

        if range_start is not None:
            # 206 Partial Content
            end = range_end if range_end else file_size - 1
            headers["Content-Range"] = f"bytes {range_start}-{end}/{file_size}"
            headers["Content-Length"] = str(end - range_start + 1)

            return StreamingResponse(
                generate(),
                status_code=206,
                media_type="application/pdf",
                headers=headers
            )
        else:
            # 200 OK (전체 파일)
            headers["Content-Length"] = str(file_size)

            return StreamingResponse(
                generate(),
                status_code=200,
                media_type="application/pdf",
                headers=headers
            )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"파일을 찾을 수 없음: {file_path}")
    except PermissionError:
        raise HTTPException(status_code=401, detail="NAS 인증 실패")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info/{file_path:path}")
async def get_file_info(file_path: str):
    """
    파일 정보 조회

    Args:
        file_path: 파일 경로

    Returns:
        파일 메타데이터
    """
    try:
        client = get_nas_client()
        decoded_path = unquote(file_path)

        file_info = await client.get_file_info(decoded_path)
        if file_info is None:
            raise HTTPException(status_code=404, detail=f"파일을 찾을 수 없음: {decoded_path}")

        return nas_file_to_response(file_info)

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"파일을 찾을 수 없음: {file_path}")
    except PermissionError:
        raise HTTPException(status_code=401, detail="NAS 인증 실패")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
