"""
문제 내보내기 라우터 (Phase 4)

Phase 12: utils 모듈 적용
"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Optional
from PIL import Image

from app.config import config
from app.utils import load_json, save_json
from app.utils.image_utils import calculate_bounding_box, add_padding, merge_images_vertically


router = APIRouter()


@router.post("/documents/{document_id}/pages/{page_index}/export")
async def export_page_problems(
    document_id: str,
    page_index: int,
    metadata: Optional[dict] = None
):
    """
    특정 페이지의 그룹을 문제 이미지로 내보내기

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        metadata: 선택적 메타데이터

    Returns:
        {
            "exported_count": int,
            "problems": [
                {
                    "group_id": str,
                    "image_path": str,
                    "bbox": [x1, y1, x2, y2]
                }
            ]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)

        # Phase 12: load_json 사용
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"
        if not groups_file.exists():
            return {"exported_count": 0, "problems": []}

        groups_data = load_json(groups_file)

        # 블록 데이터 로드
        blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"
        if not blocks_file.exists():
            raise HTTPException(status_code=404, detail="블록 데이터를 찾을 수 없습니다")

        blocks_data = load_json(blocks_file)

        # 페이지 이미지 로드 - Phase 14-2 Bugfix: PNG와 WebP 모두 지원
        image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
        if not image_file.exists():
            # WebP 파일도 확인
            image_file = doc_dir / "pages" / f"page_{page_index:04d}.webp"
            if not image_file.exists():
                raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")

        page_image = Image.open(image_file)

        # problems 디렉토리 생성
        problems_dir = doc_dir / "problems"
        problems_dir.mkdir(parents=True, exist_ok=True)

        exported_problems = []

        # 각 그룹별로 이미지 크롭
        for group in groups_data.get("groups", []):
            group_id = group["id"]
            block_ids = group["block_ids"]

            # 그룹에 속한 블록들의 bbox 계산
            group_blocks = [
                b for b in blocks_data["blocks"] if b["block_id"] in block_ids
            ]

            if not group_blocks:
                continue

            # Phase 50: 크로스 페이지 그룹 처리
            if group.get("column") == "XP" and group.get("crossPageSegments"):
                cropped_images = []
                all_bboxes = []

                for segment in sorted(group["crossPageSegments"], key=lambda s: s.get("order", 0)):
                    seg_page_index = segment["page"]

                    # 해당 페이지 이미지 로드
                    seg_image_file = doc_dir / "pages" / f"page_{seg_page_index:04d}.png"
                    if not seg_image_file.exists():
                        seg_image_file = doc_dir / "pages" / f"page_{seg_page_index:04d}.webp"
                        if not seg_image_file.exists():
                            print(f"[Phase 50] 페이지 이미지 없음: {seg_page_index}")
                            continue

                    seg_page_image = Image.open(seg_image_file)

                    # 해당 페이지 블록 데이터 로드
                    seg_blocks_file = doc_dir / "blocks" / f"page_{seg_page_index:04d}_blocks.json"
                    if not seg_blocks_file.exists():
                        print(f"[Phase 50] 블록 데이터 없음: {seg_page_index}")
                        continue

                    seg_blocks_data = load_json(seg_blocks_file)

                    # 세그먼트 블록들 필터링
                    segment_blocks = [
                        b for b in seg_blocks_data["blocks"]
                        if b["block_id"] in segment["block_ids"]
                    ]

                    if not segment_blocks:
                        continue

                    # 세그먼트 크롭
                    seg_bbox = calculate_bounding_box(segment_blocks)
                    seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                        seg_bbox, 5, seg_page_image.width, seg_page_image.height
                    )
                    seg_cropped = seg_page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
                    cropped_images.append(seg_cropped)
                    all_bboxes.append([seg_x1, seg_y1, seg_x2, seg_y2])

                # 세로 합성
                cropped = merge_images_vertically(cropped_images, padding=10)
                if cropped is None:
                    continue

                # 첫 세그먼트의 bbox를 대표값으로 사용
                x1, y1, x2, y2 = all_bboxes[0] if all_bboxes else [0, 0, 0, 0]

                print(f"[Phase 50] XP 그룹 세로 합성: {group_id} ({len(cropped_images)}개 페이지)")

            # Phase 53-Fix-D: 크로스 컬럼 그룹 처리
            elif group.get("column") == "X" and group.get("segments"):
                # 세그먼트 순서대로 각 영역 크롭 후 합성
                cropped_images = []
                for segment in sorted(group["segments"], key=lambda s: s.get("order", 0)):
                    segment_blocks = [
                        b for b in blocks_data["blocks"] if b["block_id"] in segment["block_ids"]
                    ]
                    if not segment_blocks:
                        continue
                    seg_bbox = calculate_bounding_box(segment_blocks)
                    seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                        seg_bbox, 5, page_image.width, page_image.height
                    )
                    seg_cropped = page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
                    cropped_images.append(seg_cropped)

                # 세로 합성: L 위, R 아래 (한국어 읽기 순서)
                cropped = merge_images_vertically(cropped_images, padding=10)
                if cropped is None:
                    continue

                # 전체 bbox (메타데이터용)
                bbox = calculate_bounding_box(group_blocks)
                x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)

                print(f"[Phase 53-Fix-D] X 그룹 세로 합성: {group_id} ({len(cropped_images)}개 세그먼트)")
            else:
                # 기존 로직: 단일 bbox 크롭
                bbox = calculate_bounding_box(group_blocks)
                x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
                cropped = page_image.crop((x1, y1, x2, y2))

            # Phase 56: 모문제 컨텍스트 합성
            # Phase 58-A: XP 그룹의 경우 다른 페이지 모문제도 검색
            parent_group_id = group.get("parentGroupId")
            if parent_group_id:
                # 1. 현재 페이지에서 모문제 그룹 찾기
                parent_group = None
                parent_page_index = page_index
                parent_blocks_data = blocks_data
                parent_page_image = page_image

                for g in groups_data.get("groups", []):
                    if g["id"] == parent_group_id:
                        parent_group = g
                        break

                # 2. 없으면 이전 페이지들 검색 (XP 그룹의 경우)
                if not parent_group and group.get("column") == "XP":
                    for other_page in range(page_index - 1, -1, -1):
                        other_groups_file = doc_dir / "groups" / f"page_{other_page:04d}_groups.json"
                        if other_groups_file.exists():
                            other_groups = load_json(other_groups_file)
                            for g in other_groups.get("groups", []):
                                if g["id"] == parent_group_id:
                                    parent_group = g
                                    parent_page_index = other_page
                                    # 해당 페이지의 블록 데이터와 이미지 로드
                                    parent_blocks_file = doc_dir / "blocks" / f"page_{other_page:04d}_blocks.json"
                                    if parent_blocks_file.exists():
                                        parent_blocks_data = load_json(parent_blocks_file)
                                    parent_image_file = doc_dir / "pages" / f"page_{other_page:04d}.png"
                                    if not parent_image_file.exists():
                                        parent_image_file = doc_dir / "pages" / f"page_{other_page:04d}.webp"
                                    if parent_image_file.exists():
                                        parent_page_image = Image.open(parent_image_file)
                                    print(f"[Phase 58-A] 다른 페이지에서 모문제 발견: page {other_page}")
                                    break
                            if parent_group:
                                break

                if parent_group:
                    # 모문제 블록들 가져오기 (올바른 페이지의 블록 데이터 사용)
                    parent_block_ids = parent_group.get("block_ids", [])
                    parent_blocks = [
                        b for b in parent_blocks_data["blocks"] if b["block_id"] in parent_block_ids
                    ]

                    if parent_blocks:
                        # 모문제 영역 크롭 (올바른 페이지 이미지 사용)
                        parent_bbox = calculate_bounding_box(parent_blocks)
                        px1, py1, px2, py2 = add_padding(
                            parent_bbox, 5, parent_page_image.width, parent_page_image.height
                        )
                        parent_cropped = parent_page_image.crop((px1, py1, px2, py2))

                        # 모문제(위) + 하위문제(아래) 합성
                        cropped = merge_images_vertically([parent_cropped, cropped], padding=15)
                        print(f"[Phase 56] 모문제 합성: {group_id} <- {parent_group_id} (page {parent_page_index})")

            # 파일명 생성
            problem_filename = f"{document_id}_p{page_index:04d}_{group_id}.png"
            problem_path = problems_dir / problem_filename

            # 이미지 저장
            cropped.save(problem_path)

            # 메타데이터 저장
            # Phase 24-A: groups의 problemInfo를 problem_info로 복사
            problem_info = group.get("problemInfo", {})

            problem_meta = {
                "document_id": document_id,
                "page_index": page_index,
                "group_id": group_id,
                "column": group["column"],
                "block_ids": block_ids,
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "image_path": str(problem_path.relative_to(config.DATASET_ROOT)),
                "problem_info": problem_info,  # Phase 24-A
                "segments": group.get("segments"),  # Phase 53: X 그룹용
                "crossPageSegments": group.get("crossPageSegments"),  # Phase 50-B: XP 그룹용
                "parentGroupId": group.get("parentGroupId"),  # Phase 56: 모문제 연결
                "isParent": group.get("isParent", False),  # Phase 56: 모문제 여부
                "metadata": metadata or {}
            }

            # Phase 12: save_json 사용
            meta_path = problems_dir / f"{document_id}_p{page_index:04d}_{group_id}.json"
            save_json(meta_path, problem_meta)

            exported_problems.append({
                "group_id": group_id,
                "image_path": str(problem_path.relative_to(config.DATASET_ROOT)),
                "bbox": [int(x1), int(y1), int(x2), int(y2)]
            })

        return {
            "exported_count": len(exported_problems),
            "problems": exported_problems
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문제 내보내기 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"문제 내보내기 실패: {str(e)}")


@router.post("/documents/{document_id}/pages/{page_index}/groups/{group_id}/export")
async def export_single_group(
    document_id: str,
    page_index: int,
    group_id: str
):
    """
    Phase 23: 단일 그룹 내보내기 (확정 시 호출)

    그룹을 확정할 때 호출하여 해당 그룹만 이미지로 내보내고
    그룹 상태를 'confirmed'로 업데이트합니다.

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID

    Returns:
        {
            "success": bool,
            "image_path": str,
            "exported_at": str
        }
    """
    from datetime import datetime

    try:
        doc_dir = config.get_document_dir(document_id)

        # 그룹 파일 로드
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"
        if not groups_file.exists():
            raise HTTPException(status_code=404, detail="그룹 파일을 찾을 수 없습니다")

        groups_data = load_json(groups_file)

        # 해당 그룹 찾기
        target_group = None
        target_index = -1
        for i, group in enumerate(groups_data.get("groups", [])):
            if group["id"] == group_id:
                target_group = group
                target_index = i
                break

        if target_group is None:
            raise HTTPException(status_code=404, detail=f"그룹 '{group_id}'를 찾을 수 없습니다")

        # 블록 데이터 로드
        blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"
        if not blocks_file.exists():
            raise HTTPException(status_code=404, detail="블록 데이터를 찾을 수 없습니다")

        blocks_data = load_json(blocks_file)

        # 페이지 이미지 로드
        image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
        if not image_file.exists():
            image_file = doc_dir / "pages" / f"page_{page_index:04d}.webp"
            if not image_file.exists():
                raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")

        page_image = Image.open(image_file)

        # problems 디렉토리 생성
        problems_dir = doc_dir / "problems"
        problems_dir.mkdir(parents=True, exist_ok=True)

        # 그룹에 속한 블록들의 bbox 계산
        block_ids = target_group["block_ids"]
        group_blocks = [
            b for b in blocks_data["blocks"] if b["block_id"] in block_ids
        ]

        if not group_blocks:
            raise HTTPException(status_code=400, detail="그룹에 블록이 없습니다")

        # Phase 50-B: 크로스 페이지 그룹 처리
        if target_group.get("column") == "XP" and target_group.get("crossPageSegments"):
            cropped_images = []
            all_bboxes = []

            for segment in sorted(target_group["crossPageSegments"], key=lambda s: s.get("order", 0)):
                seg_page_index = segment["page"]

                # 해당 페이지 이미지 로드
                seg_image_file = doc_dir / "pages" / f"page_{seg_page_index:04d}.png"
                if not seg_image_file.exists():
                    seg_image_file = doc_dir / "pages" / f"page_{seg_page_index:04d}.webp"
                    if not seg_image_file.exists():
                        print(f"[Phase 50-B] 페이지 이미지 없음: {seg_page_index}")
                        continue

                seg_page_image = Image.open(seg_image_file)

                # 해당 페이지 블록 데이터 로드
                seg_blocks_file = doc_dir / "blocks" / f"page_{seg_page_index:04d}_blocks.json"
                if not seg_blocks_file.exists():
                    print(f"[Phase 50-B] 블록 데이터 없음: {seg_page_index}")
                    continue

                seg_blocks_data = load_json(seg_blocks_file)

                # 세그먼트 블록들 필터링
                segment_blocks = [
                    b for b in seg_blocks_data["blocks"]
                    if b["block_id"] in segment["block_ids"]
                ]

                if not segment_blocks:
                    continue

                # 세그먼트 크롭
                seg_bbox = calculate_bounding_box(segment_blocks)
                seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                    seg_bbox, 5, seg_page_image.width, seg_page_image.height
                )
                seg_cropped = seg_page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
                cropped_images.append(seg_cropped)
                all_bboxes.append([seg_x1, seg_y1, seg_x2, seg_y2])

            # 세로 합성
            cropped = merge_images_vertically(cropped_images, padding=10)
            if cropped is None:
                raise HTTPException(status_code=400, detail="크로스 페이지 합성 실패")

            # 첫 세그먼트의 bbox를 대표값으로 사용
            x1, y1, x2, y2 = all_bboxes[0] if all_bboxes else [0, 0, 0, 0]

            print(f"[Phase 50-B] XP 그룹 세로 합성: {group_id} ({len(cropped_images)}개 페이지)")

        # Phase 53-D: 크로스 컬럼 그룹 처리
        elif target_group.get("column") == "X" and target_group.get("segments"):
            # 세그먼트 순서대로 각 영역 크롭 후 합성
            cropped_images = []
            for segment in sorted(target_group["segments"], key=lambda s: s.get("order", 0)):
                segment_blocks = [
                    b for b in blocks_data["blocks"] if b["block_id"] in segment["block_ids"]
                ]
                if not segment_blocks:
                    continue
                seg_bbox = calculate_bounding_box(segment_blocks)
                seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                    seg_bbox, 5, page_image.width, page_image.height
                )
                seg_cropped = page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
                cropped_images.append(seg_cropped)

            # 세로 합성: L 위, R 아래 (한국어 읽기 순서)
            cropped = merge_images_vertically(cropped_images, padding=10)
            if cropped is None:
                raise HTTPException(status_code=400, detail="크로스 컬럼 합성 실패")

            # 합성된 이미지의 bbox (전체)
            bbox = calculate_bounding_box(group_blocks)
            x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
        else:
            # 기존 로직: 단일 bbox 크롭
            bbox = calculate_bounding_box(group_blocks)
            x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
            cropped = page_image.crop((x1, y1, x2, y2))

        # Phase 56: 모문제 컨텍스트 합성
        # Phase 58-A: XP 그룹의 경우 다른 페이지 모문제도 검색
        parent_group_id = target_group.get("parentGroupId")
        if parent_group_id:
            # 1. 현재 페이지에서 모문제 그룹 찾기
            parent_group = None
            parent_page_index = page_index
            parent_blocks_data = blocks_data
            parent_page_image = page_image

            for g in groups_data.get("groups", []):
                if g["id"] == parent_group_id:
                    parent_group = g
                    break

            # 2. 없으면 이전 페이지들 검색 (XP 그룹의 경우)
            if not parent_group and target_group.get("column") == "XP":
                for other_page in range(page_index - 1, -1, -1):
                    other_groups_file = doc_dir / "groups" / f"page_{other_page:04d}_groups.json"
                    if other_groups_file.exists():
                        other_groups = load_json(other_groups_file)
                        for g in other_groups.get("groups", []):
                            if g["id"] == parent_group_id:
                                parent_group = g
                                parent_page_index = other_page
                                # 해당 페이지의 블록 데이터와 이미지 로드
                                parent_blocks_file = doc_dir / "blocks" / f"page_{other_page:04d}_blocks.json"
                                if parent_blocks_file.exists():
                                    parent_blocks_data = load_json(parent_blocks_file)
                                parent_image_file = doc_dir / "pages" / f"page_{other_page:04d}.png"
                                if not parent_image_file.exists():
                                    parent_image_file = doc_dir / "pages" / f"page_{other_page:04d}.webp"
                                if parent_image_file.exists():
                                    parent_page_image = Image.open(parent_image_file)
                                print(f"[Phase 58-A] 다른 페이지에서 모문제 발견: page {other_page}")
                                break
                        if parent_group:
                            break

            if parent_group:
                # 모문제 블록들 가져오기 (올바른 페이지의 블록 데이터 사용)
                parent_block_ids = parent_group.get("block_ids", [])
                parent_blocks = [
                    b for b in parent_blocks_data["blocks"] if b["block_id"] in parent_block_ids
                ]

                if parent_blocks:
                    # 모문제 영역 크롭 (올바른 페이지 이미지 사용)
                    parent_bbox = calculate_bounding_box(parent_blocks)
                    px1, py1, px2, py2 = add_padding(
                        parent_bbox, 5, parent_page_image.width, parent_page_image.height
                    )
                    parent_cropped = parent_page_image.crop((px1, py1, px2, py2))

                    # 모문제(위) + 하위문제(아래) 합성
                    cropped = merge_images_vertically([parent_cropped, cropped], padding=15)
                    print(f"[Phase 56] 모문제 합성: {group_id} <- {parent_group_id} (page {parent_page_index})")

        # 파일명 생성
        problem_filename = f"{document_id}_p{page_index:04d}_{group_id}.png"
        problem_path = problems_dir / problem_filename

        # 이미지 저장
        cropped.save(problem_path)

        # 현재 시간
        exported_at = datetime.now().isoformat()

        # 메타데이터 저장
        problem_meta = {
            "document_id": document_id,
            "page_index": page_index,
            "group_id": group_id,
            "column": target_group.get("column", ""),
            "block_ids": block_ids,
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "image_path": str(problem_path.relative_to(config.DATASET_ROOT)),
            "problem_info": target_group.get("problemInfo", {}),
            "segments": target_group.get("segments"),  # Phase 53: X 그룹용
            "crossPageSegments": target_group.get("crossPageSegments"),  # Phase 50-B: XP 그룹용
            "parentGroupId": target_group.get("parentGroupId"),  # Phase 56: 모문제 연결
            "isParent": target_group.get("isParent", False),  # Phase 56: 모문제 여부
            "exported_at": exported_at
        }

        meta_path = problems_dir / f"{document_id}_p{page_index:04d}_{group_id}.json"
        save_json(meta_path, problem_meta)

        # 그룹 상태 업데이트 (confirmed)
        groups_data["groups"][target_index]["status"] = "confirmed"
        groups_data["groups"][target_index]["exportedAt"] = exported_at
        save_json(groups_file, groups_data)

        return {
            "success": True,
            "image_path": str(problem_path.relative_to(config.DATASET_ROOT)),
            "exported_at": exported_at
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 단일 그룹 내보내기 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"그룹 내보내기 실패: {str(e)}")


@router.post("/documents/{document_id}/pages/{page_index}/groups/{group_id}/export-with-data")
async def export_group_with_data(
    document_id: str,
    page_index: int,
    group_id: str,
    group_data: dict
):
    """
    Phase 53-Fix-A: 그룹 데이터를 직접 받아서 export

    segments 필드가 포함된 그룹 데이터를 직접 전달받아
    저장 타이밍 문제를 우회합니다.

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID
        group_data: 프론트엔드에서 전달받은 그룹 데이터 (segments 포함)

    Returns:
        {
            "success": bool,
            "image_path": str,
            "exported_at": str
        }
    """
    from datetime import datetime

    try:
        doc_dir = config.get_document_dir(document_id)

        # 블록 데이터 로드
        blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"
        if not blocks_file.exists():
            raise HTTPException(status_code=404, detail="블록 데이터를 찾을 수 없습니다")

        blocks_data = load_json(blocks_file)

        # 페이지 이미지 로드
        image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
        if not image_file.exists():
            image_file = doc_dir / "pages" / f"page_{page_index:04d}.webp"
            if not image_file.exists():
                raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")

        page_image = Image.open(image_file)

        # problems 디렉토리 생성
        problems_dir = doc_dir / "problems"
        problems_dir.mkdir(parents=True, exist_ok=True)

        # 그룹에 속한 블록들의 bbox 계산
        block_ids = group_data.get("block_ids", [])
        group_blocks = [
            b for b in blocks_data["blocks"] if b["block_id"] in block_ids
        ]

        if not group_blocks:
            raise HTTPException(status_code=400, detail="그룹에 블록이 없습니다")

        # Phase 50-B: 크로스 페이지 그룹 처리 (group_data에서 직접)
        if group_data.get("column") == "XP" and group_data.get("crossPageSegments"):
            cropped_images = []
            all_bboxes = []

            for segment in sorted(group_data["crossPageSegments"], key=lambda s: s.get("order", 0)):
                seg_page_index = segment["page"]

                # 해당 페이지 이미지 로드
                seg_image_file = doc_dir / "pages" / f"page_{seg_page_index:04d}.png"
                if not seg_image_file.exists():
                    seg_image_file = doc_dir / "pages" / f"page_{seg_page_index:04d}.webp"
                    if not seg_image_file.exists():
                        print(f"[Phase 50-B] 페이지 이미지 없음: {seg_page_index}")
                        continue

                seg_page_image = Image.open(seg_image_file)

                # 해당 페이지 블록 데이터 로드
                seg_blocks_file = doc_dir / "blocks" / f"page_{seg_page_index:04d}_blocks.json"
                if not seg_blocks_file.exists():
                    print(f"[Phase 50-B] 블록 데이터 없음: {seg_page_index}")
                    continue

                seg_blocks_data = load_json(seg_blocks_file)

                # 세그먼트 블록들 필터링
                segment_blocks = [
                    b for b in seg_blocks_data["blocks"]
                    if b["block_id"] in segment["block_ids"]
                ]

                if not segment_blocks:
                    continue

                # 세그먼트 크롭
                seg_bbox = calculate_bounding_box(segment_blocks)
                seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                    seg_bbox, 5, seg_page_image.width, seg_page_image.height
                )
                seg_cropped = seg_page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
                cropped_images.append(seg_cropped)
                all_bboxes.append([seg_x1, seg_y1, seg_x2, seg_y2])

            # 세로 합성
            cropped = merge_images_vertically(cropped_images, padding=10)
            if cropped is None:
                raise HTTPException(status_code=400, detail="크로스 페이지 합성 실패")

            # 첫 세그먼트의 bbox를 대표값으로 사용
            x1, y1, x2, y2 = all_bboxes[0] if all_bboxes else [0, 0, 0, 0]

            print(f"[Phase 50-B] XP 그룹 세로 합성 완료: {len(cropped_images)}개 페이지")

        # Phase 53-Fix-A: 전달받은 group_data에서 segments 사용
        elif group_data.get("column") == "X" and group_data.get("segments"):
            # 세그먼트 순서대로 각 영역 크롭 후 합성
            cropped_images = []
            for segment in sorted(group_data["segments"], key=lambda s: s.get("order", 0)):
                segment_blocks = [
                    b for b in blocks_data["blocks"] if b["block_id"] in segment["block_ids"]
                ]
                if not segment_blocks:
                    continue
                seg_bbox = calculate_bounding_box(segment_blocks)
                seg_x1, seg_y1, seg_x2, seg_y2 = add_padding(
                    seg_bbox, 5, page_image.width, page_image.height
                )
                seg_cropped = page_image.crop((seg_x1, seg_y1, seg_x2, seg_y2))
                cropped_images.append(seg_cropped)

            # 세로 합성: L 위, R 아래 (한국어 읽기 순서)
            cropped = merge_images_vertically(cropped_images, padding=10)
            if cropped is None:
                raise HTTPException(status_code=400, detail="크로스 컬럼 합성 실패")

            # 합성된 이미지의 bbox (전체)
            bbox = calculate_bounding_box(group_blocks)
            x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)

            print(f"[Phase 53-Fix-A] X 그룹 세로 합성 완료: {len(cropped_images)}개 세그먼트")
        else:
            # 기존 로직: 단일 bbox 크롭
            bbox = calculate_bounding_box(group_blocks)
            x1, y1, x2, y2 = add_padding(bbox, 5, page_image.width, page_image.height)
            cropped = page_image.crop((x1, y1, x2, y2))

        # 파일명 생성
        problem_filename = f"{document_id}_p{page_index:04d}_{group_id}.png"
        problem_path = problems_dir / problem_filename

        # 이미지 저장
        cropped.save(problem_path)

        # 현재 시간
        exported_at = datetime.now().isoformat()

        # 메타데이터 저장 (segments/crossPageSegments 포함)
        problem_meta = {
            "document_id": document_id,
            "page_index": page_index,
            "group_id": group_id,
            "column": group_data.get("column", ""),
            "block_ids": block_ids,
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "image_path": str(problem_path.relative_to(config.DATASET_ROOT)),
            "problem_info": group_data.get("problemInfo", {}),
            "segments": group_data.get("segments"),  # Phase 53: X 그룹용
            "crossPageSegments": group_data.get("crossPageSegments"),  # Phase 50-B: XP 그룹용
            "exported_at": exported_at
        }

        meta_path = problems_dir / f"{document_id}_p{page_index:04d}_{group_id}.json"
        save_json(meta_path, problem_meta)

        # 그룹 파일 업데이트 (상태 + segments/crossPageSegments)
        groups_file = doc_dir / "groups" / f"page_{page_index:04d}_groups.json"
        if groups_file.exists():
            groups_data = load_json(groups_file)
            for i, group in enumerate(groups_data.get("groups", [])):
                if group["id"] == group_id:
                    groups_data["groups"][i]["status"] = "confirmed"
                    groups_data["groups"][i]["exportedAt"] = exported_at
                    # segments 업데이트 (누락되었을 경우)
                    if group_data.get("segments"):
                        groups_data["groups"][i]["segments"] = group_data["segments"]
                    # Phase 50-B: crossPageSegments 업데이트
                    if group_data.get("crossPageSegments"):
                        groups_data["groups"][i]["crossPageSegments"] = group_data["crossPageSegments"]
                    break
            save_json(groups_file, groups_data)

        return {
            "success": True,
            "image_path": str(problem_path.relative_to(config.DATASET_ROOT)),
            "exported_at": exported_at
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 그룹 데이터 직접 내보내기 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"그룹 내보내기 실패: {str(e)}")


@router.get("/documents/{document_id}/problems")
async def list_exported_problems(document_id: str):
    """
    문서의 모든 내보낸 문제 목록 조회

    Returns:
        [
            {
                "group_id": str,
                "page_index": int,
                "image_path": str,
                "metadata": dict
            }
        ]
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        problems_dir = doc_dir / "problems"

        if not problems_dir.exists():
            return []

        problems = []

        # Phase 12: load_json 사용
        for meta_file in problems_dir.glob("*_*.json"):
            problem_data = load_json(meta_file)
            problems.append(problem_data)

        # 페이지 순서로 정렬
        problems.sort(key=lambda x: (x["page_index"], x["group_id"]))

        return problems

    except Exception as e:
        print(f"[API 오류] 문제 목록 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문제 목록 조회 실패: {str(e)}")


@router.get("/documents/{document_id}/problems/image")
async def get_problem_image(document_id: str, image_path: str):
    """
    문제 이미지 조회

    Args:
        document_id: 문서 ID
        image_path: 이미지 상대 경로

    Returns:
        PNG 이미지
    """
    from fastapi.responses import FileResponse

    try:
        full_path = config.DATASET_ROOT / image_path

        if not full_path.exists():
            raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다")

        return FileResponse(
            path=str(full_path),
            media_type="image/png"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 이미지 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이미지 조회 실패: {str(e)}")


@router.post("/documents/{document_id}/export-all")
async def export_all_problems(document_id: str, metadata: Optional[dict] = None):
    """
    문서의 모든 페이지 문제 일괄 내보내기 (Phase 5)

    Args:
        document_id: 문서 ID
        metadata: 선택적 메타데이터

    Returns:
        {
            "total_pages": int,
            "exported_pages": int,
            "total_problems": int
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        groups_dir = doc_dir / "groups"

        if not groups_dir.exists():
            return {"total_pages": 0, "exported_pages": 0, "total_problems": 0}

        # 모든 그룹 파일 찾기
        group_files = sorted(groups_dir.glob("page_*_groups.json"))

        total_pages = 0
        exported_pages = 0
        total_problems = 0

        for group_file in group_files:
            # 파일명에서 페이지 인덱스 추출
            filename = group_file.stem  # page_0000_groups
            parts = filename.split('_')
            if len(parts) >= 2:
                try:
                    page_index = int(parts[1])

                    # 해당 페이지 내보내기
                    result = await export_page_problems(document_id, page_index, metadata)

                    total_pages += 1
                    if result["exported_count"] > 0:
                        exported_pages += 1
                        total_problems += result["exported_count"]

                except (ValueError, IndexError):
                    continue

        return {
            "total_pages": total_pages,
            "exported_pages": exported_pages,
            "total_problems": total_problems
        }

    except Exception as e:
        print(f"[API 오류] 일괄 내보내기 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"일괄 내보내기 실패: {str(e)}")


@router.delete("/documents/{document_id}/problems/{page_index}/{group_id}")
async def delete_problem(document_id: str, page_index: int, group_id: str):
    """
    특정 문제 삭제 (Phase 5)

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID

    Returns:
        {"message": "success"}
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        problems_dir = doc_dir / "problems"

        if not problems_dir.exists():
            raise HTTPException(status_code=404, detail="문제 디렉토리를 찾을 수 없습니다")

        # 파일명 패턴
        base_name = f"{document_id}_p{page_index:04d}_{group_id}"

        # 이미지 파일 삭제
        image_file = problems_dir / f"{base_name}.png"
        if image_file.exists():
            image_file.unlink()

        # 메타데이터 파일 삭제
        meta_file = problems_dir / f"{base_name}.json"
        if meta_file.exists():
            meta_file.unlink()

        return {"message": "success"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 문제 삭제 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"문제 삭제 실패: {str(e)}")


# Phase 24-B: 일괄 삭제 API
from pydantic import BaseModel
from typing import List

class ProblemIdentifier(BaseModel):
    document_id: str
    page_index: int
    group_id: str

class BulkDeleteRequest(BaseModel):
    problems: List[ProblemIdentifier]

class BulkDeleteResponse(BaseModel):
    success: bool
    deleted_count: int
    failed_count: int
    errors: List[str]

@router.post("/problems/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_problems(request: BulkDeleteRequest):
    """
    Phase 24-B: 여러 문제 일괄 삭제

    Args:
        request: 삭제할 문제 목록

    Returns:
        삭제 결과 (삭제된 개수, 실패한 개수, 에러 목록)
    """
    deleted = 0
    failed = 0
    errors = []

    for problem in request.problems:
        try:
            doc_dir = config.get_document_dir(problem.document_id)
            problems_dir = doc_dir / "problems"

            if not problems_dir.exists():
                failed += 1
                errors.append(f"{problem.document_id}/{problem.group_id}: 디렉토리 없음")
                continue

            base_name = f"{problem.document_id}_p{problem.page_index:04d}_{problem.group_id}"

            # PNG 삭제
            image_file = problems_dir / f"{base_name}.png"
            if image_file.exists():
                image_file.unlink()

            # JSON 삭제
            meta_file = problems_dir / f"{base_name}.json"
            if meta_file.exists():
                meta_file.unlink()

            deleted += 1
        except Exception as e:
            failed += 1
            errors.append(f"{problem.document_id}/{problem.group_id}: {str(e)}")

    return BulkDeleteResponse(
        success=failed == 0,
        deleted_count=deleted,
        failed_count=failed,
        errors=errors
    )


@router.get("/all-problems")
async def list_all_exported_problems(
    search: Optional[str] = None,
    document_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Phase 23-C: 모든 문서의 내보내기된 문제 조회

    모든 문서의 problems 폴더를 스캔하여 확정된 문제 목록 반환

    Args:
        search: 검색어 (문제번호, 교재명 등)
        document_id: 특정 문서 필터
        limit: 최대 반환 개수
        offset: 페이징 오프셋

    Returns:
        {
            "problems": [...],
            "total": int,
            "has_more": bool
        }
    """
    try:
        all_problems = []

        # Phase 23-E: documents 폴더 내의 문서만 스캔 (problem_bank 등 제외)
        documents_dir = config.DATASET_ROOT / "documents"

        if document_id:
            # 특정 문서만 (documents 폴더 내)
            doc_dirs = [documents_dir / document_id]
        else:
            # documents 폴더 내 모든 문서
            if documents_dir.exists():
                doc_dirs = [d for d in documents_dir.iterdir() if d.is_dir()]
            else:
                doc_dirs = []

        for doc_dir in doc_dirs:
            # Phase 57-F-1: 해설 문서 필터링 (문제은행에서 해설 이미지 제외)
            doc_name = doc_dir.name
            if "해설" in doc_name or "_sol" in doc_name.lower() or "solution" in doc_name.lower():
                continue

            problems_dir = doc_dir / "problems"
            if not problems_dir.exists():
                continue

            # JSON 메타데이터 파일 읽기
            for meta_file in problems_dir.glob("*.json"):
                try:
                    problem_data = load_json(meta_file)

                    # Phase 23-E: 크롭 문제 필수 필드 검증
                    if "document_id" not in problem_data or "image_path" not in problem_data:
                        continue  # 크롭 문제가 아닌 데이터 스킵

                    # Phase 57-F-3: 모문제(isParent=true) 필터링
                    # 모문제는 컨텍스트 제공자이므로 문제은행에서 제외
                    if problem_data.get("isParent", False):
                        continue

                    # 검색 필터 적용
                    if search:
                        search_lower = search.lower()
                        searchable_text = (
                            f"{problem_data.get('group_id', '')} "
                            f"{problem_data.get('problem_info', {}).get('problemNumber', '')} "
                            f"{problem_data.get('problem_info', {}).get('bookName', '')} "
                            f"{problem_data.get('problem_info', {}).get('course', '')}"
                        ).lower()
                        if search_lower not in searchable_text:
                            continue

                    all_problems.append(problem_data)
                except Exception as e:
                    print(f"[경고] 메타데이터 읽기 실패: {meta_file}, {str(e)}")
                    continue

        # 정렬: 문서ID, 페이지, 그룹ID 순
        all_problems.sort(key=lambda x: (
            x.get("document_id", ""),
            x.get("page_index", 0),
            x.get("group_id", "")
        ))

        # 전체 개수
        total = len(all_problems)

        # 페이징 적용
        paginated = all_problems[offset:offset + limit]

        return {
            "problems": paginated,
            "total": total,
            "has_more": offset + limit < total
        }

    except Exception as e:
        print(f"[API 오류] 전체 문제 조회 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"전체 문제 조회 실패: {str(e)}")


@router.post("/migrate-problem-info")
async def migrate_problem_info():
    """
    Phase 24-A: 기존 문제 파일에 problem_info 추가

    groups 폴더의 problemInfo를 problems 폴더의 JSON 파일에 복사합니다.
    이미 problem_info가 있는 파일은 건너뜁니다.

    Returns:
        {
            "migrated": int,
            "skipped": int,
            "errors": int
        }
    """
    try:
        migrated = 0
        skipped = 0
        errors = 0

        # documents 폴더 내 모든 문서
        documents_dir = config.DATASET_ROOT / "documents"
        if not documents_dir.exists():
            return {"migrated": 0, "skipped": 0, "errors": 0}

        for doc_dir in documents_dir.iterdir():
            if not doc_dir.is_dir():
                continue

            problems_dir = doc_dir / "problems"
            groups_dir = doc_dir / "groups"

            if not problems_dir.exists() or not groups_dir.exists():
                continue

            # 각 문제 JSON 파일 처리
            for problem_file in problems_dir.glob("*.json"):
                try:
                    problem_data = load_json(problem_file)

                    # 이미 problem_info가 있고 비어있지 않으면 스킵
                    if problem_data.get("problem_info") and problem_data["problem_info"]:
                        skipped += 1
                        continue

                    # groups 파일에서 problemInfo 가져오기
                    page_index = problem_data.get("page_index")
                    group_id = problem_data.get("group_id")

                    if page_index is None or not group_id:
                        errors += 1
                        continue

                    groups_file = groups_dir / f"page_{page_index:04d}_groups.json"
                    if not groups_file.exists():
                        errors += 1
                        continue

                    groups_data = load_json(groups_file)

                    # 해당 그룹 찾기
                    target_group = None
                    for group in groups_data.get("groups", []):
                        if group["id"] == group_id:
                            target_group = group
                            break

                    if not target_group:
                        errors += 1
                        continue

                    # problemInfo 복사
                    problem_info = target_group.get("problemInfo", {})
                    if problem_info:
                        problem_data["problem_info"] = problem_info
                        save_json(problem_file, problem_data)
                        migrated += 1
                    else:
                        skipped += 1

                except Exception as e:
                    print(f"[마이그레이션 오류] {problem_file}: {str(e)}")
                    errors += 1
                    continue

        return {
            "migrated": migrated,
            "skipped": skipped,
            "errors": errors
        }

    except Exception as e:
        print(f"[API 오류] 마이그레이션 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"마이그레이션 실패: {str(e)}")


# Phase 57-C: 문제-해설 연결 정보 조회 API
@router.get("/problems/{document_id}/{page_index}/{group_id}/solution")
async def get_problem_solution_link(document_id: str, page_index: int, group_id: str):
    """
    Phase 57-C: 문제에 연결된 해설 정보 조회

    세션의 links 데이터에서 해당 문제의 해설 연결 정보를 찾아 반환

    Args:
        document_id: 문제 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID

    Returns:
        {
            "has_solution": bool,
            "solution": {
                "document_id": str,
                "page_index": int,
                "group_id": str,
                "image_path": str | null
            } | null
        }
    """
    from fastapi.responses import FileResponse

    try:
        # 모든 세션 파일 스캔
        sessions_dir = config.DATASET_ROOT / "work_sessions"
        if not sessions_dir.exists():
            return {"has_solution": False, "solution": None}

        # 세션 파일들 검색
        for session_file in sessions_dir.glob("*.json"):
            try:
                session_data = load_json(session_file)
                if not session_data:
                    continue

                # 해당 문제를 포함하는 세션인지 확인
                if session_data.get("problemDocumentId") != document_id:
                    continue

                # links에서 해당 문제의 연결 찾기
                links = session_data.get("links", [])
                for link in links:
                    if link.get("problemGroupId") == group_id:
                        solution_doc_id = link.get("solutionDocumentId")
                        solution_page_idx = link.get("solutionPageIndex")
                        solution_group_id = link.get("solutionGroupId")

                        # 해설 이미지 경로 찾기
                        solution_image_path = None
                        if solution_doc_id and solution_group_id is not None:
                            solution_doc_dir = config.get_document_dir(solution_doc_id)
                            problems_dir = solution_doc_dir / "problems"

                            # 파일 패턴으로 찾기
                            pattern = f"{solution_doc_id}_p{solution_page_idx:04d}_{solution_group_id}.png"
                            image_file = problems_dir / pattern

                            if image_file.exists():
                                solution_image_path = f"documents/{solution_doc_id}/problems/{pattern}"

                        return {
                            "has_solution": True,
                            "solution": {
                                "document_id": solution_doc_id,
                                "page_index": solution_page_idx,
                                "group_id": solution_group_id,
                                "image_path": solution_image_path
                            }
                        }

            except Exception as e:
                print(f"[Phase 57-C] 세션 파일 읽기 오류: {session_file}: {str(e)}")
                continue

        return {"has_solution": False, "solution": None}

    except Exception as e:
        print(f"[API 오류] 해설 연결 조회 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"해설 연결 조회 실패: {str(e)}")
