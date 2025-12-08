"""
병합 과정 상세 분석

NMS 과정에서 어떤 블록들이 제거되는지 분석
"""
import sys
from pathlib import Path
import cv2
import numpy as np
from typing import List, Dict

# 프로젝트 루트를 path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from data_models import BoundingBox

def analyze_merge():
    """병합 과정 분석"""

    config = Config()

    # 이미지 로드
    image_path = Path("C:/MYCLAUDE_PROJECT/pdf/dataset_root/documents/test_doc/pages/page_0000.png")
    image = cv2.imread(str(image_path))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 흰색 배경 제거
    _, binary = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY_INV)

    # 노이즈 제거
    kernel_small = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    mask = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small)

    print("=" * 80)
    print("병합 과정 상세 분석")
    print("=" * 80)
    print()

    # 각 스케일에서 검출
    scales = [
        {"name": "ultra_small", "h": 4, "v": 1, "min": 50},
        {"name": "small", "h": 6, "v": 1, "min": 150},
        {"name": "medium", "h": 10, "v": 2, "min": 250},
    ]

    all_blocks_by_scale = {}

    for scale in scales:
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (scale["h"], 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, scale["v"]))

        h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
        v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

        contours, _ = cv2.findContours(v_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        blocks = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h

            if area < scale["min"]:
                continue

            blocks.append({
                "bbox": BoundingBox(x, y, x + w, y + h),
                "area": area,
                "scale": scale["name"]
            })

        all_blocks_by_scale[scale["name"]] = blocks
        print(f"{scale['name']} (h={scale['h']}): {len(blocks)}개 검출")

    print()

    # IoU 계산 함수
    def calc_iou(bbox1: BoundingBox, bbox2: BoundingBox) -> float:
        x_min = max(bbox1.x_min, bbox2.x_min)
        y_min = max(bbox1.y_min, bbox2.y_min)
        x_max = min(bbox1.x_max, bbox2.x_max)
        y_max = min(bbox1.y_max, bbox2.y_max)

        if x_max < x_min or y_max < y_min:
            return 0.0

        intersection = (x_max - x_min) * (y_max - y_min)
        area1 = bbox1.area
        area2 = bbox2.area
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0.0

    # 다양한 IoU 임계값으로 테스트
    print("-" * 80)
    print("IoU 임계값별 병합 결과")
    print("-" * 80)

    iou_thresholds = [0.20, 0.30, 0.40, 0.50, 0.60]

    for iou_threshold in iou_thresholds:
        # 모든 블록 수집
        all_blocks = []
        for scale_name in ["ultra_small", "small", "medium"]:
            if scale_name in all_blocks_by_scale:
                for block in all_blocks_by_scale[scale_name]:
                    all_blocks.append(block)

        # 면적 기준 정렬
        all_blocks.sort(key=lambda x: x["area"])

        # NMS
        unique_blocks = []
        removed_count = 0

        for block_info in all_blocks:
            bbox = block_info["bbox"]
            should_add = True

            for existing_info in unique_blocks:
                existing_bbox = existing_info["bbox"]
                iou = calc_iou(bbox, existing_bbox)

                if iou > iou_threshold:
                    should_add = False
                    removed_count += 1
                    break

            if should_add:
                unique_blocks.append(block_info)

        print(f"  IoU={iou_threshold:.2f}: {len(all_blocks)}개 → {len(unique_blocks)}개 (제거: {removed_count})")

    print()

    # 특정 영역의 블록 충돌 분석
    print("-" * 80)
    print("작은 블록 충돌 분석 (ultra_small vs small/medium)")
    print("-" * 80)

    ultra_small_blocks = all_blocks_by_scale.get("ultra_small", [])
    small_blocks = all_blocks_by_scale.get("small", [])
    medium_blocks = all_blocks_by_scale.get("medium", [])

    conflicts = []

    # ultra_small 블록 중 small/medium과 겹치는 것 찾기
    for us_block in ultra_small_blocks:
        us_bbox = us_block["bbox"]

        for s_block in small_blocks + medium_blocks:
            s_bbox = s_block["bbox"]
            iou = calc_iou(us_bbox, s_bbox)

            if iou > 0.4:  # 현재 임계값
                conflicts.append({
                    "ultra_small": us_block,
                    "other": s_block,
                    "iou": iou
                })

    print(f"총 {len(conflicts)}개의 충돌 발견 (IoU > 0.4)")
    print()

    if conflicts:
        # IoU가 높은 순으로 정렬
        conflicts.sort(key=lambda c: c["iou"], reverse=True)

        print("상위 10개 충돌:")
        for i, conflict in enumerate(conflicts[:10], 1):
            us = conflict["ultra_small"]
            other = conflict["other"]
            iou = conflict["iou"]

            print(f"  {i}. IoU={iou:.3f}")
            print(f"     ultra_small: {us['area']}px² at ({us['bbox'].x_min},{us['bbox'].y_min})")
            print(f"     {other['scale']}: {other['area']}px² at ({other['bbox'].x_min},{other['bbox'].y_min})")
            print()

    # 권장사항
    print("=" * 80)
    print("권장사항")
    print("=" * 80)
    print()

    if len(conflicts) > 100:
        print("1. 충돌이 많습니다 (>100개)")
        print("   → ultra_small 스케일이 small/medium과 너무 많이 겹침")
        print("   → IoU 임계값을 0.50-0.60으로 높이거나")
        print("   → ultra_small의 h_kernel을 3으로 줄이기")
        print()
    elif len(conflicts) > 50:
        print("1. 충돌이 있습니다 (50-100개)")
        print("   → 일부 ultra_small 블록이 제거됨")
        print("   → IoU 임계값을 0.50으로 높이기 권장")
        print()
    else:
        print("1. 충돌이 적습니다 (<50개)")
        print("   → 현재 설정이 적절함")
        print()

    print("2. 테스트 권장 파라미터:")
    print("   A. IoU=0.30: 세밀한 검출 (많은 블록)")
    print("   B. IoU=0.40: 현재 설정 (균형)")
    print("   C. IoU=0.50: 보수적 병합 (적은 블록)")
    print()


if __name__ == "__main__":
    analyze_merge()
