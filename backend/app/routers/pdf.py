"""
PDF 업로드 및 처리 라우터 (Phase 1: Lazy Loading, Phase 14-1: 점진적 변환)
Phase 34-B: 메타데이터 구조화
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from pathlib import Path
from typing import Optional
import shutil
import sys
import json

# 프로젝트 루트 추가
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from app.config import config
from pdf_pipeline import PDFPipeline
from app.services.task_queue import BackgroundTaskQueue


router = APIRouter()
pipeline = PDFPipeline(config)
task_queue = BackgroundTaskQueue()


@router.post("/upload")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    PDF 업로드 및 점진적 처리 (Phase 14-1, Phase 35: 커스텀 document_id)

    개선점:
    - 첫 10페이지만 이미지 변환 + 블록 분석 (즉시)
    - 나머지 페이지는 백그라운드에서 이미지 변환 + 블록 분석

    효과:
    - 400페이지 PDF: 60초 → 10초 초기 응답

    Returns:
        {
            "document_id": str,
            "total_pages": int,
            "analyzed_pages": int,
            "status": "processing" | "completed"
        }
    """
    # 파일 검증
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다")

    if file.size > config.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"파일 크기가 너무 큽니다 (최대 {config.MAX_UPLOAD_SIZE / 1024 / 1024}MB)"
        )

    try:
        # Phase 35: Request.form()으로 document_id 직접 추출
        form_data = await request.form()
        custom_document_id = form_data.get("document_id")
        print(f"[API] custom_document_id from form: {custom_document_id}")

        # Phase 34-B: 메타데이터 추출
        meta_grade = form_data.get("grade")
        meta_course = form_data.get("course")
        meta_series = form_data.get("series")
        meta_type = form_data.get("doc_type")
        print(f"[API] metadata: grade={meta_grade}, course={meta_course}, series={meta_series}, type={meta_type}")

        # 커스텀 document_id 사용, 없으면 파일명에서 추출
        final_document_id = custom_document_id if custom_document_id else Path(file.filename).stem
        print(f"[API] final_document_id: {final_document_id}")
        upload_path = config.UPLOADS_DIR / file.filename

        with upload_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # raw_pdfs로 이동
        pdf_path = config.RAW_PDFS_DIR / file.filename
        shutil.move(str(upload_path), str(pdf_path))

        print(f"[API] PDF 업로드 완료: {pdf_path}")

        # Phase 14-1: 점진적 처리 (첫 N페이지만 이미지 변환 + 블록 분석)
        result = pipeline.process_pdf_progressive(
            pdf_path=pdf_path,
            document_id=final_document_id,  # Phase 35: 커스텀 ID 사용
            initial_pages=config.INITIAL_PAGES,
            dpi=config.DEFAULT_DPI
        )

        # Phase 34-B: 메타데이터를 meta.json에 추가 저장
        if any([meta_grade, meta_course, meta_series, meta_type]):
            doc_dir = config.get_document_dir(result["document_id"])
            meta_path = doc_dir / "meta.json"
            if meta_path.exists():
                with open(meta_path, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                meta["metadata"] = {
                    "grade": meta_grade,
                    "course": meta_course,
                    "series": meta_series,
                    "type": meta_type
                }
                with open(meta_path, 'w', encoding='utf-8') as f:
                    json.dump(meta, f, indent=2, ensure_ascii=False)
                print(f"[API] metadata saved to meta.json: {meta['metadata']}")

        # 백그라운드 작업 등록 (나머지 페이지 이미지 변환 + 분석)
        if result["remaining_pages"] > 0:
            task_id = task_queue.add_progressive_task(
                document_id=result["document_id"],
                pdf_path=str(pdf_path),
                start_page=result["converted_pages"],
                total_pages=result["total_pages"],
                batch_size=config.BATCH_SIZE
            )

            # 백그라운드에서 나머지 페이지 처리
            background_tasks.add_task(
                task_queue.process_progressive_task,
                task_id,
                pipeline
            )

            return {
                "document_id": result["document_id"],
                "total_pages": result["total_pages"],
                "analyzed_pages": result["analyzed_pages"],
                "status": "processing",
                "task_id": task_id,
                "message": f"첫 {config.INITIAL_PAGES}페이지 처리 완료. 나머지 {result['remaining_pages']}페이지는 백그라운드에서 처리 중입니다."
            }
        else:
            return {
                "document_id": result["document_id"],
                "total_pages": result["total_pages"],
                "analyzed_pages": result["analyzed_pages"],
                "status": "completed",
                "message": "모든 페이지 처리 완료"
            }

    except Exception as e:
        print(f"[API 오류] PDF 업로드 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF 처리 실패: {str(e)}")


@router.get("/documents")
async def list_documents():
    """
    분석된 문서 목록 조회

    Returns:
        [
            {
                "document_id": str,
                "total_pages": int,
                "analyzed_pages": int,
                "created_at": str
            }
        ]
    """
    try:
        documents = []

        for doc_dir in config.DOCUMENTS_DIR.iterdir():
            if not doc_dir.is_dir():
                continue

            document_id = doc_dir.name

            # pages 디렉토리에서 전체 페이지 수 계산
            pages_dir = doc_dir / "pages"
            if not pages_dir.exists():
                continue

            # Phase 14-2 Bugfix: PNG와 WebP 모두 지원
            png_count = len(list(pages_dir.glob("page_*.png")))
            webp_count = len(list(pages_dir.glob("page_*.webp")))
            total_pages = png_count + webp_count

            if total_pages == 0:
                continue

            # blocks 디렉토리에서 분석 완료 페이지 수 계산
            blocks_dir = doc_dir / "blocks"
            analyzed_pages = 0
            if blocks_dir.exists():
                analyzed_pages = len(list(blocks_dir.glob("page_*_blocks.json")))

            # 생성 시간
            created_at = doc_dir.stat().st_ctime

            documents.append({
                "document_id": document_id,
                "total_pages": total_pages,
                "analyzed_pages": analyzed_pages,
                "created_at": created_at
            })

        # 최신순 정렬
        documents.sort(key=lambda x: x["created_at"], reverse=True)

        return documents

    except Exception as e:
        print(f"[API 오류] 문서 목록 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 목록 조회 실패: {str(e)}")


@router.get("/documents/{document_id}")
async def get_document_info(document_id: str):
    """
    특정 문서 정보 조회

    Returns:
        {
            "document_id": str,
            "total_pages": int,
            "analyzed_pages": int,
            "status": "processing" | "completed"
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        if not doc_dir.exists():
            raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

        # pages 디렉토리에서 전체 페이지 수
        pages_dir = doc_dir / "pages"

        # Phase 14-2 Bugfix: PNG와 WebP 모두 지원
        png_count = len(list(pages_dir.glob("page_*.png")))
        webp_count = len(list(pages_dir.glob("page_*.webp")))
        total_pages = png_count + webp_count

        # blocks 디렉토리에서 분석 완료 페이지 수
        blocks_dir = doc_dir / "blocks"
        analyzed_pages = 0
        if blocks_dir.exists():
            analyzed_pages = len(list(blocks_dir.glob("page_*_blocks.json")))

        return {
            "document_id": document_id,
            "total_pages": total_pages,
            "analyzed_pages": analyzed_pages,
            "status": "completed" if analyzed_pages == total_pages else "processing"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문서 정보 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 정보 조회 실패: {str(e)}")


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    """
    문서 삭제

    Returns:
        {"message": "문서가 삭제되었습니다"}
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        if not doc_dir.exists():
            raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

        # 디렉토리 전체 삭제
        shutil.rmtree(doc_dir)

        return {"message": f"문서 '{document_id}'가 삭제되었습니다"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문서 삭제 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문서 삭제 실패: {str(e)}")


@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str):
    """
    백그라운드 작업 상태 조회

    Returns:
        {
            "task_id": str,
            "document_id": str,
            "status": "pending" | "processing" | "completed" | "failed",
            "progress": int,
            "total_pages": int,
            "created_at": str,
            "completed_at": str | null,
            "error": str | null
        }
    """
    task_status = task_queue.get_task_status(task_id)

    if not task_status:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

    return task_status


@router.get("/tasks")
async def list_tasks(document_id: Optional[str] = None):
    """
    백그라운드 작업 목록 조회

    Args:
        document_id: 특정 문서의 작업만 조회 (선택)

    Returns:
        [
            {
                "task_id": str,
                "document_id": str,
                "status": str,
                "progress": int,
                "total_pages": int,
                "created_at": str
            }
        ]
    """
    return task_queue.list_tasks(document_id=document_id)
