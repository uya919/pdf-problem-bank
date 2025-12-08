"""
Distance Transform 기반 인테그랄 블록 확장 테스트

v_kernel 증가 대신 distance transform을 사용하여
인테그랄 블록 주변의 가까운 픽셀들을 찾아 bbox 확장
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


def expand_bbox_with_distance_transform(
    mask: np.ndarray,
    bbox: tuple,
    max_distance: int = 20,
    min_pixel_density: float = 0.05
) -> tuple:
    """
    Distance Transform을 사용하여 bbox 확장

    Args:
        mask: 이진 마스크 (검은 픽셀 = 텍스트)
        bbox: (x_min, y_min, x_max, y_max)
        max_distance: 확장 최대 거리 (픽셀)
        min_pixel_density: 확장 영역의 최소 픽셀 밀도

    Returns:
        확장된 bbox (x_min, y_min, x_max, y_max)
    """
    x_min, y_min, x_max, y_max = bbox
    height, width = mask.shape

    # 원본 블록 영역의 마스크
    block_mask = np.zeros_like(mask)
    block_mask[y_min:y_max, x_min:x_max] = 255

    # Distance transform 계산 (블록에서 가까운 거리 계산)
    # 배경(0)에서 전경(255)까지의 거리를 계산
    dist_transform = cv2.distanceTransform(mask, cv2.DIST_L2, 5)

    # 확장 가능 영역 정의: 블록 위아래 max_distance 범위
    extend_top = max(0, y_min - max_distance)
    extend_bottom = min(height, y_max + max_distance)

    # 위쪽 확장 검사
    new_y_min = y_min
    if extend_top < y_min:
        roi = mask[extend_top:y_min, x_min:x_max]
        if roi.size > 0:
            # 검은 픽셀이 있는 행 찾기
            row_sums = np.sum(roi > 0, axis=1)
            # 아래에서 위로 스캔
            for i in range(len(row_sums) - 1, -1, -1):
                if row_sums[i] > 0:
                    # 픽셀 밀도 확인
                    density = row_sums[i] / roi.shape[1]
                    if density >= min_pixel_density:
                        new_y_min = extend_top + i
                        break

    # 아래쪽 확장 검사
    new_y_max = y_max
    if extend_bottom > y_max:
        roi = mask[y_max:extend_bottom, x_min:x_max]
        if roi.size > 0:
            # 검은 픽셀이 있는 행 찾기
            row_sums = np.sum(roi > 0, axis=1)
            # 위에서 아래로 스캔
            for i in range(len(row_sums)):
                if row_sums[i] > 0:
                    # 픽셀 밀도 확인
                    density = row_sums[i] / roi.shape[1]
                    if density >= min_pixel_density:
                        new_y_max = y_max + i + 1

    # X 방향도 약간 확장 (옵션)
    extend_left = max(0, x_min - 5)
    extend_right = min(width, x_max + 5)

    new_x_min = x_min
    if extend_left < x_min:
        roi = mask[new_y_min:new_y_max, extend_left:x_min]
        if roi.size > 0 and np.sum(roi > 0) > 0:
            col_sums = np.sum(roi > 0, axis=0)
            for i in range(len(col_sums) - 1, -1, -1):
                if col_sums[i] > 0:
                    new_x_min = extend_left + i
                    break

    new_x_max = x_max
    if extend_right > x_max:
        roi = mask[new_y_min:new_y_max, x_max:extend_right]
        if roi.size > 0 and np.sum(roi > 0) > 0:
            col_sums = np.sum(roi > 0, axis=0)
            for i in range(len(col_sums)):
                if col_sums[i] > 0:
                    new_x_max = x_max + i + 1

    return (new_x_min, new_y_min, new_x_max, new_y_max)


def test_distance_transform_expansion():
    """Distance Transform 기반 확장 테스트"""
    print("=" * 80)
    print("Distance Transform 기반 인테그랄 블록 확장 테스트")
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

    # 이미지 로드
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    # 인테그랄 후보 블록 찾기 (aspect < 0.2)
    integral_blocks = []
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        w = x_max - x_min
        h = y_max - y_min

        if h > 0:
            aspect = w / h
            if aspect < 0.2 and h >= 40:
                integral_blocks.append({
                    'id': block['block_id'],
                    'bbox': bbox,
                    'original_bbox': bbox,  # 원본 보관
                    'width': w,
                    'height': h,
                    'aspect': aspect
                })

    integral_blocks.sort(key=lambda b: b['id'])

    print(f"인테그랄 후보 블록: {len(integral_blocks)}개")
    print()

    if not integral_blocks:
        print("[경고] 인테그랄 블록이 없습니다!")
        return

    # Distance Transform 적용하여 확장
    print("=" * 80)
    print("Distance Transform 기반 확장")
    print("=" * 80)
    print()

    results = []

    for ib in integral_blocks:
        original_bbox = ib['original_bbox']

        # Distance Transform으로 확장
        expanded_bbox = expand_bbox_with_distance_transform(
            mask,
            original_bbox,
            max_distance=30,
            min_pixel_density=0.03
        )

        ox_min, oy_min, ox_max, oy_max = original_bbox
        ex_min, ey_min, ex_max, ey_max = expanded_bbox

        orig_w = ox_max - ox_min
        orig_h = oy_max - oy_min
        exp_w = ex_max - ex_min
        exp_h = ey_max - ey_min

        expand_top = oy_min - ey_min
        expand_bottom = ey_max - oy_max
        expand_left = ox_min - ex_min
        expand_right = ex_max - ox_max

        new_aspect = exp_w / exp_h if exp_h > 0 else 0

        print(f"블록 {ib['id']}:")
        print(f"  원본: {orig_w}x{orig_h}px (aspect={ib['aspect']:.3f})")
        print(f"  확장: {exp_w}x{exp_h}px (aspect={new_aspect:.3f})")
        print(f"  변화: 위{expand_top}px, 아래{expand_bottom}px, 좌{expand_left}px, 우{expand_right}px")

        total_expand = expand_top + expand_bottom + expand_left + expand_right
        if total_expand > 0:
            print(f"  -> 총 {total_expand}px 확장됨!")
        else:
            print(f"  -> 확장 없음")

        print()

        results.append({
            'id': ib['id'],
            'original_bbox': original_bbox,
            'expanded_bbox': expanded_bbox,
            'expand_top': expand_top,
            'expand_bottom': expand_bottom,
            'total_expand': total_expand,
            'new_aspect': new_aspect
        })

    # 시각화
    output_dir = config.DATASET_ROOT

    # 전체 비교 이미지
    vis_before = image.copy()
    vis_after = image.copy()

    for r in results:
        ox_min, oy_min, ox_max, oy_max = r['original_bbox']
        ex_min, ey_min, ex_max, ey_max = r['expanded_bbox']

        # Before: 원본 bbox (빨간색)
        cv2.rectangle(vis_before, (ox_min, oy_min), (ox_max, oy_max), (0, 0, 255), 3)
        cv2.putText(vis_before, f"ID:{r['id']}", (ox_min, oy_min - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        # After: 확장된 bbox (초록색)
        cv2.rectangle(vis_after, (ex_min, ey_min), (ex_max, ey_max), (0, 255, 0), 3)
        cv2.putText(vis_after, f"ID:{r['id']} (+{r['total_expand']}px)", (ex_min, ey_min - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # 원본도 점선으로 표시
        cv2.rectangle(vis_after, (ox_min, oy_min), (ox_max, oy_max), (0, 0, 255), 1)

    before_path = output_dir / "distance_transform_before.png"
    after_path = output_dir / "distance_transform_after.png"

    imwrite_unicode(before_path, vis_before)
    imwrite_unicode(after_path, vis_after)

    print("=" * 80)
    print("시각화 저장")
    print("=" * 80)
    print()
    print(f"Before: {before_path}")
    print(f"After:  {after_path}")
    print()

    # 통계
    print("=" * 80)
    print("확장 통계")
    print("=" * 80)
    print()

    total_expanded = sum(1 for r in results if r['total_expand'] > 0)
    avg_expand = sum(r['total_expand'] for r in results) / len(results) if results else 0
    max_expand = max((r['total_expand'] for r in results), default=0)

    print(f"확장된 블록: {total_expanded}/{len(integral_blocks)}개")
    print(f"평균 확장: {avg_expand:.1f}px")
    print(f"최대 확장: {max_expand}px")
    print()

    # aspect ratio 개선
    aspect_improved = sum(1 for r in results if r['new_aspect'] < 0.15)
    print(f"Aspect ratio < 0.15인 블록: {aspect_improved}개")
    print()

    print("=" * 80)
    print("결론")
    print("=" * 80)
    print()

    if total_expanded > len(integral_blocks) * 0.5:
        print(f"[성공] {total_expanded}개 블록이 확장되었습니다!")
        print(f"       평균 {avg_expand:.1f}px 확장으로 인테그랄 완전도 향상")
        print()
        print("[권장] 이 방법을 multiscale_analyzer.py 후처리에 통합")
    else:
        print(f"[제한적] {total_expanded}개 블록만 확장됨")
        print(f"        다른 방법과 함께 사용 권장")

    print()
    print("=" * 80)


if __name__ == "__main__":
    test_distance_transform_expansion()
