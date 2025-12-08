"""
블록 데이터 조회 라우터 (Phase 1: On-Demand Loading)

Phase 12: utils 모듈 적용
Phase 14-1: On-Demand 이미지 변환 지원
Phase 14-2: WebP 포맷 지원 (WebP 우선, PNG 폴백)
Phase 14-3: 썸네일 지원 (quality 파라미터)
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import Literal
from pathlib import Path
import sys

from app.config import config
from app.utils import load_json, load_json_or_default, save_json

# Phase 14-1: PDF 처리 파이프라인 import
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "src"))
from pdf_pipeline import PDFPipeline

router = APIRouter()
_pipeline = None  # 지연 초기화


def get_pipeline() -> PDFPipeline:
    """Pipeline 싱글톤 반환"""
    global _pipeline
    if _pipeline is None:
        _pipeline = PDFPipeline(config)
    return _pipeline


@router.get("/documents/{document_id}/pages/{page_index}")
async def get_page_blocks(document_id: str, page_index: int):
    """
    특정 페이지의 블록 데이터 조회 (On-Demand)

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)

    Returns:
        {
            "document_id": str,
            "page_index": int,
            "width": int,
            "height": int,
            "columns": [...],
            "blocks": [...]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"

        if not blocks_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"페이지 {page_index}의 블록 데이터를 찾을 수 없습니다"
            )

        return load_json(blocks_file)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 블록 데이터 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"블록 데이터 조회 실패: {str(e)}")


@router.get("/documents/{document_id}/pages/{page_index}/image")
async def get_page_image(
    document_id: str,
    page_index: int,
    quality: Literal["full", "thumb"] = Query(default="full", description="이미지 품질: full(원본) 또는 thumb(썸네일)")
):
    """
    특정 페이지의 이미지 조회 (Phase 14-1: On-Demand 변환, Phase 14-2: WebP 지원, Phase 14-3: 썸네일)

    이미지가 없으면 원본 PDF에서 실시간 변환
    WebP 우선, PNG 폴백

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)
        quality: 이미지 품질 (full: 원본 150 DPI, thumb: 썸네일 50 DPI)

    Returns:
        WebP 또는 PNG 이미지 파일
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        # Phase 14-3: 썸네일 요청 처리
        if quality == "thumb":
            thumbs_dir = doc_dir / "thumbs"
            thumb_path = thumbs_dir / f"thumb_{page_index:04d}.webp"

            if thumb_path.exists():
                return FileResponse(
                    path=str(thumb_path),
                    media_type="image/webp",
                    filename=f"thumb_{page_index:04d}.webp"
                )

            # 썸네일이 없으면 On-Demand 생성
            meta_path = doc_dir / "meta.json"
            if meta_path.exists():
                meta = load_json(meta_path)
                pdf_path_str = meta.get("pdf_path")
                if pdf_path_str:
                    pdf_path = Path(pdf_path_str)
                    if pdf_path.exists():
                        pipeline = get_pipeline()
                        thumb_created = pipeline.pdf_processor.create_thumbnail(
                            pdf_path=pdf_path,
                            document_id=document_id,
                            page_index=page_index
                        )
                        if thumb_created and thumb_created.exists():
                            return FileResponse(
                                path=str(thumb_created),
                                media_type="image/webp",
                                filename=f"thumb_{page_index:04d}.webp"
                            )

            # 썸네일 생성 실패시 원본으로 폴백
            print(f"[Phase 14-3] 썸네일 생성 실패, 원본으로 폴백: {document_id} 페이지 {page_index}")

        # 원본 이미지 처리 (quality=full 또는 썸네일 폴백)
        pages_dir = doc_dir / "pages"

        # Phase 14-2: WebP 우선, PNG 폴백
        webp_path = pages_dir / f"page_{page_index:04d}.webp"
        png_path = pages_dir / f"page_{page_index:04d}.png"

        if webp_path.exists():
            return FileResponse(
                path=str(webp_path),
                media_type="image/webp",
                filename=f"page_{page_index:04d}.webp"
            )
        elif png_path.exists():
            return FileResponse(
                path=str(png_path),
                media_type="image/png",
                filename=f"page_{page_index:04d}.png"
            )

        # Phase 14-1: 이미지가 없으면 On-Demand 변환
        image_file = pages_dir / f"page_{page_index:04d}.png"  # 폴백용
        if not image_file.exists():
            # 원본 PDF 경로 확인
            meta_path = doc_dir / "meta.json"
            if not meta_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"문서 '{document_id}'를 찾을 수 없습니다"
                )

            meta = load_json(meta_path)
            pdf_path_str = meta.get("pdf_path")

            if not pdf_path_str:
                raise HTTPException(
                    status_code=404,
                    detail=f"원본 PDF 경로를 찾을 수 없습니다"
                )

            pdf_path = Path(pdf_path_str)
            if not pdf_path.exists():
                raise HTTPException(
                    status_code=404,
                    detail=f"원본 PDF 파일이 존재하지 않습니다"
                )

            # 페이지 범위 검증
            total_pages = meta.get("total_pages", 0)
            if page_index >= total_pages:
                raise HTTPException(
                    status_code=404,
                    detail=f"페이지 {page_index}는 범위를 벗어났습니다 (총 {total_pages}페이지)"
                )

            # On-Demand 이미지 변환 (Phase 14-2: WebP 지원)
            print(f"[Phase 14-1/14-2] On-Demand 변환: {document_id} 페이지 {page_index}")
            pipeline = get_pipeline()
            converted_path = pipeline.pdf_processor.convert_single_page(
                pdf_path=pdf_path,
                document_id=document_id,
                page_index=page_index,
                dpi=config.DEFAULT_DPI
            )

            if not converted_path or not converted_path.exists():
                raise HTTPException(
                    status_code=500,
                    detail=f"이미지 변환에 실패했습니다"
                )

            # Phase 14-2: 변환된 파일 형식에 따라 반환
            media_type = "image/webp" if str(converted_path).endswith(".webp") else "image/png"
            return FileResponse(
                path=str(converted_path),
                media_type=media_type,
                filename=converted_path.name
            )

        # 기존 PNG 파일이 있는 경우 (이 부분은 도달하지 않음)
        return FileResponse(
            path=str(image_file),
            media_type="image/png",
            filename=f"page_{page_index:04d}.png"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 이미지 조회 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"이미지 조회 실패: {str(e)}")


@router.get("/documents/{document_id}/groups/{page_index}")
async def get_page_groups(document_id: str, page_index: int):
    """
    특정 페이지의 문제 그룹 데이터 조회

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)

    Returns:
        {
            "document_id": str,
            "page_index": int,
            "groups": [...]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"

        # Phase 12: load_json_or_default 사용
        default_groups = {
            "document_id": document_id,
            "page_index": page_index,
            "groups": []
        }
        return load_json_or_default(groups_file, default_groups)

    except Exception as e:
        print(f"[API 오류] 그룹 데이터 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"그룹 데이터 조회 실패: {str(e)}")


@router.post("/documents/{document_id}/groups/{page_index}")
async def save_page_groups(document_id: str, page_index: int, groups_data: dict):
    """
    특정 페이지의 문제 그룹 데이터 저장

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)
        groups_data: 그룹 데이터

    Returns:
        {"message": "저장 완료"}
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"

        # Phase 12: save_json 사용 (자동 디렉토리 생성)
        save_json(groups_file, groups_data)

        return {"message": f"페이지 {page_index}의 그룹 데이터가 저장되었습니다"}

    except Exception as e:
        print(f"[API 오류] 그룹 데이터 저장 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"그룹 데이터 저장 실패: {str(e)}")


@router.get("/documents/{document_id}/pages/{page_index}/status")
async def get_page_status(document_id: str, page_index: int):
    """
    특정 페이지의 처리 상태 조회

    Returns:
        {
            "page_index": int,
            "has_blocks": bool,
            "has_groups": bool,
            "status": "not_analyzed" | "analyzed" | "labeled"
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        # 블록 파일 존재 여부
        blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"
        has_blocks = blocks_file.exists()

        # 그룹 파일 존재 여부
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"
        has_groups = groups_file.exists()

        # 상태 결정
        if not has_blocks:
            status = "not_analyzed"
        elif has_groups:
            status = "labeled"
        else:
            status = "analyzed"

        return {
            "page_index": page_index,
            "has_blocks": has_blocks,
            "has_groups": has_groups,
            "status": status
        }

    except Exception as e:
        print(f"[API 오류] 페이지 상태 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"페이지 상태 조회 실패: {str(e)}")


@router.patch("/documents/{document_id}/groups/{page_index}/{group_id}")
async def update_group_info(document_id: str, page_index: int, group_id: str, update_data: dict):
    """
    Phase 31-H-4: 특정 그룹의 problemInfo 업데이트

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)
        group_id: 그룹 ID
        update_data: 업데이트할 데이터 (problemInfo 필드들)

    Returns:
        {"message": "업데이트 완료", "group": 업데이트된 그룹}
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"

        if not groups_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"페이지 {page_index}의 그룹 데이터를 찾을 수 없습니다"
            )

        # 기존 데이터 로드
        data = load_json(groups_file)
        groups = data.get("groups", [])

        # 해당 그룹 찾기 및 업데이트
        updated_group = None
        for group in groups:
            if group.get("id") == group_id:
                # problemInfo 업데이트
                if "problemInfo" not in group:
                    group["problemInfo"] = {}

                problem_info = group["problemInfo"]
                if "problemNumber" in update_data:
                    problem_info["problemNumber"] = update_data["problemNumber"]
                if "bookName" in update_data:
                    problem_info["bookName"] = update_data["bookName"]
                if "course" in update_data:
                    problem_info["course"] = update_data["course"]
                if "page" in update_data:
                    problem_info["page"] = update_data["page"]

                group["updatedAt"] = __import__("datetime").datetime.now().isoformat()
                updated_group = group
                break

        if not updated_group:
            raise HTTPException(
                status_code=404,
                detail=f"그룹 '{group_id}'를 찾을 수 없습니다"
            )

        # 저장
        save_json(groups_file, data)

        print(f"[Phase 31-H-4] Group updated: {document_id}/{page_index}/{group_id}")
        return {"message": "그룹 정보가 업데이트되었습니다", "group": updated_group}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 그룹 업데이트 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"그룹 업데이트 실패: {str(e)}")


@router.get("/documents/{document_id}/all-groups")
async def get_all_groups(document_id: str):
    """
    Phase 32: 문서의 모든 페이지에서 그룹 데이터 조회

    작업 세션 복원 시 문서 전체의 라벨링된 문제를 한 번에 가져옴

    Returns:
        {
            "document_id": str,
            "total_groups": int,
            "pages": [
                {
                    "page_index": int,
                    "groups": [...]
                }
            ]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_dir = doc_dir / "groups"
        pages_data = []
        total_groups = 0

        if groups_dir.exists():
            # 모든 그룹 파일을 page_index 순서로 정렬
            groups_files = sorted(groups_dir.glob("page_*_groups.json"))

            for groups_file in groups_files:
                # 파일명에서 page_index 추출 (예: page_0007_groups.json -> 7)
                page_index = int(groups_file.stem.split("_")[1])

                data = load_json(groups_file)
                groups = data.get("groups", [])

                if groups:  # 그룹이 있는 페이지만 포함
                    pages_data.append({
                        "page_index": page_index,
                        "groups": groups
                    })
                    total_groups += len(groups)

        return {
            "document_id": document_id,
            "total_groups": total_groups,
            "pages": pages_data
        }

    except Exception as e:
        print(f"[API 오류] 전체 그룹 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"전체 그룹 조회 실패: {str(e)}")


@router.get("/documents/{document_id}/groups-summary")
async def get_groups_summary(document_id: str):
    """
    Phase 10-2: 문서 전체 그룹 요약 조회 (문항번호 연속성용)

    Returns:
        {
            "document_id": str,
            "pages": [
                {
                    "page_index": int,
                    "last_problem_number": str | null,
                    "group_count": int
                }
            ]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_dir = doc_dir / "groups"
        summaries = []

        if groups_dir.exists():
            # 모든 그룹 파일을 page_index 순서로 정렬
            groups_files = sorted(groups_dir.glob("page_*_groups.json"))

            for groups_file in groups_files:
                # 파일명에서 page_index 추출 (예: page_0007_groups.json -> 7)
                page_index = int(groups_file.stem.split("_")[1])

                # Phase 12: load_json 사용
                data = load_json(groups_file)
                groups = data.get("groups", [])

                # 마지막 문항번호 찾기 (역순으로 검색)
                last_number = None
                for g in reversed(groups):
                    problem_info = g.get("problemInfo")
                    if problem_info and problem_info.get("problemNumber"):
                        last_number = problem_info["problemNumber"]
                        break

                summaries.append({
                    "page_index": page_index,
                    "last_problem_number": last_number,
                    "group_count": len(groups)
                })

        return {
            "document_id": document_id,
            "pages": summaries
        }

    except Exception as e:
        print(f"[API 오류] 그룹 요약 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"그룹 요약 조회 실패: {str(e)}")


@router.post("/documents/{document_id}/groups/{page_index}/save-and-export")
async def save_group_and_export(
    document_id: str,
    page_index: int,
    request_data: dict
):
    """
    B-5: 그룹 저장 + 내보내기 통합 API (Race Condition 방지)

    단일 트랜잭션으로 그룹 저장과 이미지 내보내기를 수행합니다.
    프론트엔드에서 그룹 데이터를 직접 전달받아 타이밍 문제를 해결합니다.

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        request_data: {
            "group": 저장할 그룹 데이터,
            "all_groups": 페이지의 전체 그룹 배열 (optional),
            "export": true/false (내보내기 여부)
        }

    Returns:
        {
            "saved": true,
            "exported": {
                "success": bool,
                "image_path": str | null
            }
        }
    """
    from datetime import datetime
    from PIL import Image
    from app.utils.image_utils import calculate_bounding_box, add_padding, merge_images_vertically

    try:
        group = request_data.get("group")
        all_groups = request_data.get("all_groups")
        should_export = request_data.get("export", True)

        if not group:
            raise HTTPException(status_code=400, detail="그룹 데이터가 필요합니다")

        doc_dir = config.get_document_dir(document_id)
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"

        # 1. 그룹 저장
        if all_groups:
            # 전체 그룹 배열이 제공된 경우 그대로 저장
            groups_data = {
                "document_id": document_id,
                "page_index": page_index,
                "groups": all_groups
            }
        else:
            # 단일 그룹만 제공된 경우 기존 파일에서 업데이트
            groups_data = load_json_or_default(groups_file, {
                "document_id": document_id,
                "page_index": page_index,
                "groups": []
            })

            # 기존 그룹 찾아서 업데이트 또는 추가
            found = False
            for i, g in enumerate(groups_data.get("groups", [])):
                if g.get("id") == group.get("id"):
                    groups_data["groups"][i] = group
                    found = True
                    break

            if not found:
                groups_data["groups"].append(group)

        save_json(groups_file, groups_data)
        print(f"[B-5] Group saved: {document_id}/{page_index}/{group.get('id')}")

        # 2. 내보내기 (요청 시)
        export_result = {"success": False, "image_path": None}

        if should_export:
            try:
                group_id = group.get("id")
                block_ids = group.get("block_ids", [])

                # 블록 데이터 로드
                blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"
                if not blocks_file.exists():
                    raise Exception("블록 데이터 없음")

                blocks_data = load_json(blocks_file)

                # 페이지 이미지 로드
                image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
                if not image_file.exists():
                    image_file = doc_dir / "pages" / f"page_{page_index:04d}.webp"
                if not image_file.exists():
                    raise Exception("페이지 이미지 없음")

                page_image = Image.open(image_file)

                # 그룹 블록 필터링
                group_blocks = [
                    b for b in blocks_data["blocks"] if b["block_id"] in block_ids
                ]

                if not group_blocks:
                    raise Exception("그룹에 블록 없음")

                # 크롭 처리 (X, XP 컬럼 등 고려)
                if group.get("column") == "X" and group.get("segments"):
                    cropped_images = []
                    for segment in sorted(group["segments"], key=lambda s: s.get("order", 0)):
                        segment_blocks = [
                            b for b in blocks_data["blocks"] if b["block_id"] in segment["block_ids"]
                        ]
                        if segment_blocks:
                            seg_bbox = calculate_bounding_box(segment_blocks)
                            x1, y1, x2, y2 = add_padding(seg_bbox, 5, page_image.width, page_image.height)
                            cropped_images.append(page_image.crop((x1, y1, x2, y2)))

                    cropped = merge_images_vertically(cropped_images, padding=10)
                    bbox = calculate_bounding_box(group_blocks)
                    x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
                else:
                    bbox = calculate_bounding_box(group_blocks)
                    x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
                    cropped = page_image.crop((x1, y1, x2, y2))

                # 저장
                problems_dir = doc_dir / "problems"
                problems_dir.mkdir(parents=True, exist_ok=True)

                problem_filename = f"{document_id}_p{page_index:04d}_{group_id}.png"
                problem_path = problems_dir / problem_filename
                cropped.save(problem_path)

                # 메타데이터 저장
                meta_path = problems_dir / f"{document_id}_p{page_index:04d}_{group_id}.json"
                save_json(meta_path, {
                    "document_id": document_id,
                    "page_index": page_index,
                    "group_id": group_id,
                    "column": group.get("column", ""),
                    "block_ids": block_ids,
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "image_path": f"documents/{document_id}/problems/{problem_filename}",
                    "problem_info": group.get("problemInfo", {}),
                    "exported_at": datetime.now().isoformat()
                })

                export_result = {
                    "success": True,
                    "image_path": f"documents/{document_id}/problems/{problem_filename}"
                }
                print(f"[B-5] Exported: {problem_filename}")

            except Exception as export_error:
                print(f"[B-5] Export failed: {export_error}")
                export_result = {"success": False, "error": str(export_error)}

        return {
            "saved": True,
            "exported": export_result
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 그룹 저장+내보내기 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"그룹 저장+내보내기 실패: {str(e)}")
