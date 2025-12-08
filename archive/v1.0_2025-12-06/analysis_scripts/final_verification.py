"""
최종 검증: GUI 파이프라인이 915개 블록을 검출하는지 확인
"""
from pathlib import Path
import sys
import cv2
import numpy as np
import json

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from density_analyzer import DensityAnalyzer


def imread_unicode(path: Path) -> np.ndarray:
    """한글 경로 이미지 읽기"""
    with open(path, 'rb') as f:
        arr = np.frombuffer(f.read(), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def test_simple_method(gray: np.ndarray, config: Config) -> int:
    """테스트 스크립트 방식 (기준: 915개)"""
    _, mask = cv2.threshold(gray, config.WHITE_THRESHOLD, 255, cv2.THRESH_BINARY_INV)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    count = 0
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w >= config.MIN_BLOCK_SIZE and h >= config.MIN_BLOCK_SIZE:
            count += 1

    return count


def main():
    """최종 검증"""
    print("=" * 80)
    print("최종 검증: GUI 파이프라인 블록 검출")
    print("=" * 80)
    print()

    config = Config.load()

    print(f"[설정값]")
    print(f"  WHITE_THRESHOLD: {config.WHITE_THRESHOLD}")
    print(f"  MIN_BLOCK_SIZE: {config.MIN_BLOCK_SIZE}")
    print()

    image_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "pages" / "page_0000.png"
    json_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "blocks" / "page_0000_blocks.json"

    if not image_path.exists():
        print(f"[오류] 이미지 없음")
        return

    # JSON 파일 삭제 (재생성 강제)
    if json_path.exists():
        json_path.unlink()
        print("[INFO] 기존 JSON 삭제됨")
        print()

    # 1. 테스트 스크립트 방식
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    simple_count = test_simple_method(gray, config)

    print("=" * 80)
    print("1단계: 테스트 스크립트 방식 (기준)")
    print("=" * 80)
    print(f"검출 블록: {simple_count}개")
    print()

    # 2. GUI 방식 (DensityAnalyzer)
    print("=" * 80)
    print("2단계: GUI 방식 (DensityAnalyzer)")
    print("=" * 80)
    print()

    analyzer = DensityAnalyzer(config, use_projection=False, use_multiscale=False)
    blocks = analyzer.analyze_page(image)

    gui_count = len(blocks)

    print()
    print(f"검출 블록: {gui_count}개")
    print()

    # JSON 저장
    height, width = image.shape[:2]
    blocks_data = {
        "document_id": "베이직쎈 수학2 2022_본문",
        "page_index": 0,
        "width": width,
        "height": height,
        "columns": [
            {"id": "L", "x_min": 0, "x_max": width // 2},
            {"id": "R", "x_min": width // 2, "x_max": width}
        ],
        "blocks": [
            {
                "block_id": int(b.block_id),
                "column": b.column,
                "bbox": [int(b.bbox.x_min), int(b.bbox.y_min), int(b.bbox.x_max), int(b.bbox.y_max)],
                "pixel_density": float(b.pixel_density)
            }
            for b in blocks
        ]
    }

    json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(blocks_data, f, ensure_ascii=False, indent=2)

    print(f"[INFO] JSON 저장: {json_path}")
    print()

    # 3. 결과 비교
    print("=" * 80)
    print("최종 결과")
    print("=" * 80)
    print()

    difference = abs(gui_count - simple_count)
    pct = difference / simple_count * 100 if simple_count > 0 else 0

    print(f"테스트 스크립트: {simple_count}개")
    print(f"GUI 파이프라인:  {gui_count}개")
    print(f"차이:            {difference}개 ({pct:.1f}%)")
    print()

    if difference <= 5:
        print("[성공] 거의 일치! (오차 5개 이하)")
    elif difference <= 20:
        print("[양호] 약간의 차이 존재 (오차 20개 이하)")
    else:
        print("[주의] 차이가 큼 (오차 20개 초과)")

    print()
    print("=" * 80)


if __name__ == "__main__":
    main()
