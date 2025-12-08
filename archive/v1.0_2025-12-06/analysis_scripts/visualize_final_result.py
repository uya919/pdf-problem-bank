"""
최종 인테그랄 검출 결과 시각화

개선된 설정으로 처리된 결과를 시각화하여
인테그랄이 제대로 검출되었는지 확인
"""
from pathlib import Path
import sys
import json
import cv2
import numpy as np

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config


def imread_unicode(path: Path) -> np.ndarray:
    """한글 경로 이미지 읽기"""
    with open(path, 'rb') as f:
        arr = np.frombuffer(f.read(), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def imwrite_unicode(path: Path, image: np.ndarray):
    """한글 경로 이미지 저장"""
    ext = path.suffix
    success, encoded = cv2.imencode(ext, image)
    if success:
        with open(path, 'wb') as f:
            f.write(encoded)


def visualize_result():
    """최종 검출 결과 시각화"""
    print("=" * 80)
    print("최종 인테그랄 검출 결과 시각화")
    print("=" * 80)
    print()

    config = Config.load()

    # 파일 경로
    json_path = config.DOCUMENTS_DIR / "test" / "blocks" / "page_0000_blocks.json"
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not json_path.exists() or not image_path.exists():
        print(f"[오류] 파일 없음")
        return

    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']
    print(f"총 블록 수: {len(blocks)}")
    print()

    # 이미지 로드
    image = imread_unicode(image_path)
    vis = image.copy()

    # 1. 모든 블록 (회색, 얇게)
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        cv2.rectangle(vis, (x_min, y_min), (x_max, y_max), (200, 200, 200), 1)

    # 2. 세로로 긴 블록 강조 (초록색)
    vertical_blocks = []
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        w = x_max - x_min
        h = y_max - y_min

        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 40:  # 세로로 길고 높이 40 이상 (병합된 것들)
                vertical_blocks.append({
                    'id': block['block_id'],
                    'bbox': bbox,
                    'width': w,
                    'height': h,
                    'aspect': aspect
                })

                # 초록색 강조
                cv2.rectangle(vis, (x_min, y_min), (x_max, y_max), (0, 255, 0), 3)
                cv2.putText(vis, f"ID:{block['block_id']}", (x_min, y_min - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.putText(vis, f"{w}x{h}", (x_min, y_max + 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 0), 1)

    print(f"세로로 긴 블록 (aspect < 0.5, h >= 40): {len(vertical_blocks)}개")
    print()

    if vertical_blocks:
        print("병합된 인테그랄 후보 블록:")
        print(f"{'ID':>4} {'X_min':>6} {'Y_min':>6} {'Width':>6} {'Height':>7} {'Aspect':>8}")
        print("-" * 60)
        for vb in sorted(vertical_blocks, key=lambda b: b['aspect']):
            bbox = vb['bbox']
            print(f"{vb['id']:4d} {bbox[0]:6d} {bbox[1]:6d} "
                  f"{vb['width']:6d} {vb['height']:7d} {vb['aspect']:8.3f}")

    print()

    # 3. 매우 세로로 긴 블록 (aspect < 0.2, 인테그랄 가능성 높음)
    integral_blocks = [b for b in vertical_blocks if b['aspect'] < 0.2]
    print(f"매우 세로로 긴 블록 (aspect < 0.2): {len(integral_blocks)}개")

    if integral_blocks:
        for ib in integral_blocks:
            bbox = ib['bbox']
            x_min, y_min, x_max, y_max = bbox

            # 빨간색으로 다시 강조
            cv2.rectangle(vis, (x_min, y_min), (x_max, y_max), (0, 0, 255), 4)
            cv2.putText(vis, "INTEGRAL", (x_min, y_min - 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    print()

    # 4. 저장
    output_dir = config.DATASET_ROOT
    full_vis_path = output_dir / "final_integral_detection_full.png"
    imwrite_unicode(full_vis_path, vis)

    print(f"시각화 저장: {full_vis_path}")
    print()

    # 5. 세로 블록 크기 분포 분석
    if vertical_blocks:
        heights = [b['height'] for b in vertical_blocks]
        aspects = [b['aspect'] for b in vertical_blocks]

        print("세로 블록 크기 분포:")
        print(f"  높이 범위: {min(heights)} ~ {max(heights)}px")
        print(f"  평균 높이: {sum(heights)/len(heights):.1f}px")
        print(f"  aspect ratio 범위: {min(aspects):.3f} ~ {max(aspects):.3f}")
        print(f"  평균 aspect ratio: {sum(aspects)/len(aspects):.3f}")
        print()

    # 6. 결론
    print("=" * 80)
    print("분석 결과")
    print("=" * 80)
    print()

    if integral_blocks:
        print(f"[성공] {len(integral_blocks)}개의 인테그랄 블록이 검출되었습니다!")
        print()
        print("검출된 인테그랄:")
        for ib in integral_blocks:
            print(f"  - 블록 {ib['id']}: {ib['width']}×{ib['height']}px "
                  f"(aspect={ib['aspect']:.3f})")
    else:
        print("[경고] 매우 세로로 긴 블록(aspect < 0.2)이 없습니다.")
        print(f"       하지만 세로로 긴 블록(aspect < 0.5)은 {len(vertical_blocks)}개 있습니다.")

    print()
    print("=" * 80)


if __name__ == "__main__":
    visualize_result()
