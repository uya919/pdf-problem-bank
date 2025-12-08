"""
누락된 블록 진단 스크립트

사용자가 지적한 번호 블록(325, 326, 324 등)이 왜 검출되지 않는지 분석
"""
import sys
from pathlib import Path
import json
import cv2
import numpy as np

# 프로젝트 루트를 path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from data_models import PageData, BoundingBox

def diagnose_missing_blocks():
    """누락된 블록 진단"""

    config = Config()

    # 이미지와 JSON 로드
    image_path = Path("C:/MYCLAUDE_PROJECT/pdf/dataset_root/documents/test_doc/pages/page_0000.png")
    json_path = Path("C:/MYCLAUDE_PROJECT/pdf/dataset_root/documents/test_doc/blocks/page_0000_blocks.json")

    if not image_path.exists():
        print(f"[ERROR] 이미지 파일 없음: {image_path}")
        return

    if not json_path.exists():
        print(f"[ERROR] JSON 파일 없음: {json_path}")
        return

    # 이미지 로드
    image = cv2.imread(str(image_path))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    page_data = PageData.from_dict(data)

    print("=" * 80)
    print("누락 블록 진단 분석")
    print("=" * 80)
    print()
    print(f"현재 검출된 블록 수: {len(page_data.blocks)}개")
    print()

    # 1. 아주 작은 블록도 검출해보기 (min_size를 매우 낮춤)
    print("-" * 80)
    print("1. 초소형 블록 검출 테스트 (min_size=50px²)")
    print("-" * 80)

    # 흰색 배경 제거
    _, binary = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY_INV)

    # 노이즈 제거
    kernel_small = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    mask = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small)

    # 다양한 커널로 검출
    test_configs = [
        {"name": "ultra_small", "h": 4, "v": 1, "min": 50},
        {"name": "tiny", "h": 5, "v": 1, "min": 80},
        {"name": "small", "h": 6, "v": 1, "min": 150},
    ]

    all_tiny_blocks = {}

    for cfg in test_configs:
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (cfg["h"], 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, cfg["v"]))

        h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
        v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

        contours, _ = cv2.findContours(v_closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        tiny_blocks = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            area = w * h

            if area < cfg["min"]:
                continue

            tiny_blocks.append({
                "bbox": (x, y, w, h),
                "area": area,
                "aspect": w / h if h > 0 else 0
            })

        all_tiny_blocks[cfg["name"]] = tiny_blocks
        print(f"  {cfg['name']} (h={cfg['h']}, min={cfg['min']}px²): {len(tiny_blocks)}개 검출")

    print()

    # 2. 초소형 블록 중 정사각형에 가까운 것들 (번호 동그라미 후보)
    print("-" * 80)
    print("2. 번호 동그라미 후보 분석 (정사각형 + 소형)")
    print("-" * 80)

    circle_candidates = []
    for scale, blocks in all_tiny_blocks.items():
        for block in blocks:
            x, y, w, h = block["bbox"]
            aspect = block["aspect"]
            area = block["area"]

            # 정사각형에 가까운 작은 블록 (번호 동그라미 특징)
            # 종횡비 0.7~1.3, 면적 50~400px²
            if 0.7 <= aspect <= 1.3 and 50 <= area <= 400:
                circle_candidates.append({
                    "scale": scale,
                    "bbox": (x, y, w, h),
                    "area": area,
                    "aspect": aspect
                })

    print(f"  발견된 동그라미 후보: {len(circle_candidates)}개")
    print()

    if circle_candidates:
        # 면적 기준 정렬
        circle_candidates.sort(key=lambda b: b["area"])

        print(f"  가장 작은 10개:")
        for i, block in enumerate(circle_candidates[:10], 1):
            x, y, w, h = block["bbox"]
            print(f"    {i}. {w}×{h} = {block['area']}px², 종횡비={block['aspect']:.2f}, scale={block['scale']}")
            print(f"       위치: ({x}, {y})")
        print()

    # 3. 현재 검출된 블록과 비교
    print("-" * 80)
    print("3. 현재 검출 블록과 초소형 블록 비교")
    print("-" * 80)

    # 현재 검출된 블록의 좌표 세트
    detected_boxes = set()
    for block in page_data.blocks:
        bbox = block.bbox
        # 좌표를 반올림해서 세트에 추가
        detected_boxes.add((
            round(bbox.x_min / 5) * 5,  # 5px 단위로 반올림
            round(bbox.y_min / 5) * 5,
            round(bbox.x_max / 5) * 5,
            round(bbox.y_max / 5) * 5
        ))

    # 초소형 블록 중 현재 검출되지 않은 것들
    missing_candidates = []
    for candidate in circle_candidates:
        x, y, w, h = candidate["bbox"]
        rounded_box = (
            round(x / 5) * 5,
            round(y / 5) * 5,
            round((x + w) / 5) * 5,
            round((y + h) / 5) * 5
        )

        # 현재 검출된 블록과 겹치는지 확인
        is_new = True
        for det_box in detected_boxes:
            # IoU 계산
            x_min = max(rounded_box[0], det_box[0])
            y_min = max(rounded_box[1], det_box[1])
            x_max = min(rounded_box[2], det_box[2])
            y_max = min(rounded_box[3], det_box[3])

            if x_max > x_min and y_max > y_min:
                intersection = (x_max - x_min) * (y_max - y_min)
                area1 = (rounded_box[2] - rounded_box[0]) * (rounded_box[3] - rounded_box[1])
                area2 = (det_box[2] - det_box[0]) * (det_box[3] - det_box[1])
                union = area1 + area2 - intersection

                iou = intersection / union if union > 0 else 0

                if iou > 0.3:  # 30% 이상 겹치면 이미 검출된 것으로 간주
                    is_new = False
                    break

        if is_new:
            missing_candidates.append(candidate)

    print(f"  현재 검출되지 않은 초소형 블록: {len(missing_candidates)}개")
    print()

    if missing_candidates:
        print(f"  누락된 블록 상위 20개:")
        missing_candidates.sort(key=lambda b: b["area"], reverse=True)
        for i, block in enumerate(missing_candidates[:20], 1):
            x, y, w, h = block["bbox"]
            print(f"    {i}. {w}×{h} = {block['area']}px², 위치=({x},{y}), scale={block['scale']}")
        print()

    # 4. 시각화 저장
    print("-" * 80)
    print("4. 시각화 이미지 생성")
    print("-" * 80)

    output_dir = Path("C:/MYCLAUDE_PROJECT/pdf/dataset_root/documents/test_doc/diagnosis")
    output_dir.mkdir(exist_ok=True)

    # 현재 검출된 블록 시각화
    vis_current = image.copy()
    for block in page_data.blocks:
        bbox = block.bbox
        cv2.rectangle(vis_current,
                     (bbox.x_min, bbox.y_min),
                     (bbox.x_max, bbox.y_max),
                     (0, 255, 0), 2)

    # 누락된 블록 시각화
    vis_missing = image.copy()

    # 현재 검출된 블록 (초록색)
    for block in page_data.blocks:
        bbox = block.bbox
        cv2.rectangle(vis_missing,
                     (bbox.x_min, bbox.y_min),
                     (bbox.x_max, bbox.y_max),
                     (0, 255, 0), 1)

    # 누락된 블록 (빨간색)
    for block in missing_candidates[:50]:  # 상위 50개만
        x, y, w, h = block["bbox"]
        cv2.rectangle(vis_missing, (x, y), (x + w, y + h), (0, 0, 255), 2)

    # 저장
    cv2.imwrite(str(output_dir / "current_detection.png"), vis_current)
    cv2.imwrite(str(output_dir / "missing_blocks.png"), vis_missing)

    print(f"  저장 완료:")
    print(f"    - current_detection.png: 현재 검출된 블록")
    print(f"    - missing_blocks.png: 현재 검출 (초록) + 누락된 블록 (빨강)")
    print()

    # 5. 결론 및 권장사항
    print("=" * 80)
    print("진단 결과 및 권장사항")
    print("=" * 80)
    print()

    if len(missing_candidates) > 0:
        avg_missing_size = np.mean([b["area"] for b in missing_candidates])
        print(f"1. [발견] {len(missing_candidates)}개의 초소형 블록이 누락되었습니다")
        print(f"   평균 크기: {avg_missing_size:.0f}px²")
        print()
        print(f"2. [원인 분석]")
        print(f"   - 현재 min_size 임계값: 150px²")
        print(f"   - 누락된 블록 중 150px² 이하: {len([b for b in missing_candidates if b['area'] < 150])}개")
        print()
        print(f"3. [해결 방안]")
        print(f"   A. min_size 임계값을 50-80px²로 낮추기")
        print(f"      → ultra_small 스케일 추가 (h_kernel=4, min_size=50)")
        print(f"   B. 작은 커널로 추가 검출 후 병합")
        print(f"      → 번호 동그라미 전용 검출 패스 추가")
        print()
    else:
        print("누락된 초소형 블록이 없습니다.")
        print("다른 원인을 조사해야 합니다:")
        print("  - 블록이 너무 크게 병합되었을 가능성")
        print("  - IoU 임계값 조정 필요")
        print()


if __name__ == "__main__":
    diagnose_missing_blocks()
