"""
Vertical Projection Profile 기반 인테그랄 검출 테스트

각 세로 영역의 픽셀 분포를 분석하여
인테그랄 기호의 시작/끝 위치를 정확히 찾음
"""
from pathlib import Path
import sys
import json
import cv2
import numpy as np
import matplotlib.pyplot as plt

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


def compute_vertical_projection(mask: np.ndarray, x_min: int, x_max: int) -> np.ndarray:
    """
    지정된 X 범위에서 세로 방향 픽셀 투영 계산

    Args:
        mask: 이진 마스크
        x_min, x_max: X 범위

    Returns:
        각 Y 좌표의 픽셀 합 (1D array)
    """
    roi = mask[:, x_min:x_max]
    # 각 행(Y)의 검은 픽셀 개수 합산
    projection = np.sum(roi > 0, axis=1)
    return projection


def find_integral_bounds_by_projection(
    mask: np.ndarray,
    bbox: tuple,
    extend_range: int = 100,
    min_density: float = 0.05
) -> tuple:
    """
    Vertical Projection을 사용하여 인테그랄의 실제 경계 찾기

    Args:
        mask: 이진 마스크
        bbox: 초기 bbox (x_min, y_min, x_max, y_max)
        extend_range: 위아래로 확장할 최대 범위
        min_density: 유효한 행으로 간주할 최소 픽셀 밀도

    Returns:
        확장된 bbox (x_min, y_min, x_max, y_max)
    """
    x_min, y_min, x_max, y_max = bbox
    height, width = mask.shape
    bbox_width = x_max - x_min

    # 확장 범위 설정
    search_y_min = max(0, y_min - extend_range)
    search_y_max = min(height, y_max + extend_range)

    # 세로 투영 계산
    projection = compute_vertical_projection(mask, x_min, x_max)

    # 위쪽 경계 찾기 (y_min에서 위로)
    new_y_min = y_min
    for y in range(y_min - 1, search_y_min - 1, -1):
        if y < 0 or y >= len(projection):
            break

        pixel_count = projection[y]
        density = pixel_count / bbox_width if bbox_width > 0 else 0

        if density >= min_density:
            new_y_min = y
        else:
            # 연속 5행 이상 빈 행이면 중단
            gap_count = 0
            for gap_y in range(y, max(search_y_min - 1, y - 10), -1):
                if gap_y < 0 or gap_y >= len(projection):
                    break
                gap_density = projection[gap_y] / bbox_width if bbox_width > 0 else 0
                if gap_density < min_density:
                    gap_count += 1
                else:
                    break

            if gap_count >= 5:
                break

    # 아래쪽 경계 찾기 (y_max에서 아래로)
    new_y_max = y_max
    for y in range(y_max, search_y_max):
        if y >= len(projection):
            break

        pixel_count = projection[y]
        density = pixel_count / bbox_width if bbox_width > 0 else 0

        if density >= min_density:
            new_y_max = y + 1
        else:
            # 연속 5행 이상 빈 행이면 중단
            gap_count = 0
            for gap_y in range(y, min(search_y_max, y + 10)):
                if gap_y >= len(projection):
                    break
                gap_density = projection[gap_y] / bbox_width if bbox_width > 0 else 0
                if gap_density < min_density:
                    gap_count += 1
                else:
                    break

            if gap_count >= 5:
                break

    return (x_min, new_y_min, x_max, new_y_max)


def test_vertical_projection():
    """Vertical Projection Profile 테스트"""
    print("=" * 80)
    print("Vertical Projection Profile 기반 인테그랄 경계 검출")
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

    # 인테그랄 후보 블록 찾기
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

    # Vertical Projection으로 경계 재검출
    print("=" * 80)
    print("Vertical Projection 기반 경계 재검출")
    print("=" * 80)
    print()

    results = []

    for ib in integral_blocks:
        original_bbox = ib['bbox']

        # Projection으로 새 경계 찾기
        new_bbox = find_integral_bounds_by_projection(
            mask,
            original_bbox,
            extend_range=100,
            min_density=0.03
        )

        ox_min, oy_min, ox_max, oy_max = original_bbox
        nx_min, ny_min, nx_max, ny_max = new_bbox

        orig_h = oy_max - oy_min
        new_h = ny_max - ny_min

        expand_top = oy_min - ny_min
        expand_bottom = ny_max - oy_max

        new_aspect = (nx_max - nx_min) / new_h if new_h > 0 else 0

        print(f"블록 {ib['id']}:")
        print(f"  원본 높이: {orig_h}px (aspect={ib['aspect']:.3f})")
        print(f"  새 높이: {new_h}px (aspect={new_aspect:.3f})")
        print(f"  확장: 위{expand_top}px, 아래{expand_bottom}px")

        total_expand = expand_top + expand_bottom
        if total_expand > 0:
            print(f"  -> 총 {total_expand}px 확장!")
        else:
            print(f"  -> 확장 없음")

        print()

        results.append({
            'id': ib['id'],
            'original_bbox': original_bbox,
            'new_bbox': new_bbox,
            'expand_top': expand_top,
            'expand_bottom': expand_bottom,
            'total_expand': total_expand,
            'new_height': new_h,
            'new_aspect': new_aspect
        })

        # 개별 블록 투영 프로파일 시각화 (처음 3개만)
        if len(results) <= 3:
            x_min, y_min, x_max, y_max = original_bbox

            # 확장 범위에서 투영 계산
            search_y_min = max(0, y_min - 100)
            search_y_max = min(mask.shape[0], y_max + 100)

            projection = compute_vertical_projection(mask, x_min, x_max)[search_y_min:search_y_max]

            # 시각화 저장
            fig, ax = plt.subplots(figsize=(10, 6))
            y_coords = range(search_y_min, search_y_max)
            ax.plot(y_coords, projection)
            ax.axvline(y_min, color='r', linestyle='--', label=f'Original Top (y={y_min})')
            ax.axvline(y_max, color='r', linestyle='--', label=f'Original Bottom (y={y_max})')
            ax.axvline(ny_min, color='g', linestyle='-', label=f'New Top (y={ny_min})')
            ax.axvline(ny_max, color='g', linestyle='-', label=f'New Bottom (y={ny_max})')
            ax.set_xlabel('Y Coordinate')
            ax.set_ylabel('Pixel Count')
            ax.set_title(f'Vertical Projection Profile - Block {ib["id"]}')
            ax.legend()
            ax.grid(True, alpha=0.3)

            output_path = config.DATASET_ROOT / f"projection_profile_block_{ib['id']}.png"
            plt.savefig(output_path, dpi=100, bbox_inches='tight')
            plt.close()

    # 시각화
    output_dir = config.DATASET_ROOT

    vis = image.copy()

    for r in results:
        ox_min, oy_min, ox_max, oy_max = r['original_bbox']
        nx_min, ny_min, nx_max, ny_max = r['new_bbox']

        # 원본 bbox (빨간색 점선)
        cv2.rectangle(vis, (ox_min, oy_min), (ox_max, oy_max), (0, 0, 255), 2)

        # 새 bbox (초록색 실선)
        cv2.rectangle(vis, (nx_min, ny_min), (nx_max, ny_max), (0, 255, 0), 3)

        # 확장 영역 표시
        if r['expand_top'] > 0:
            cv2.line(vis, (ox_min, ny_min), (ox_max, ny_min), (0, 255, 255), 2)
            cv2.putText(vis, f"+{r['expand_top']}px", (ox_min, ny_min - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        if r['expand_bottom'] > 0:
            cv2.line(vis, (ox_min, ny_max), (ox_max, ny_max), (0, 255, 255), 2)
            cv2.putText(vis, f"+{r['expand_bottom']}px", (ox_min, ny_max + 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        cv2.putText(vis, f"ID:{r['id']}", (nx_min, ny_min - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    vis_path = output_dir / "vertical_projection_result.png"
    imwrite_unicode(vis_path, vis)

    print("=" * 80)
    print("시각화 저장")
    print("=" * 80)
    print()
    print(f"전체 결과: {vis_path}")
    print()

    # 통계
    print("=" * 80)
    print("확장 통계")
    print("=" * 80)
    print()

    total_expanded = sum(1 for r in results if r['total_expand'] > 0)
    avg_expand = sum(r['total_expand'] for r in results) / len(results) if results else 0
    max_expand = max((r['total_expand'] for r in results), default=0)
    avg_height = sum(r['new_height'] for r in results) / len(results) if results else 0

    print(f"확장된 블록: {total_expanded}/{len(integral_blocks)}개")
    print(f"평균 확장: {avg_expand:.1f}px")
    print(f"최대 확장: {max_expand}px")
    print(f"평균 높이: {avg_height:.1f}px")
    print()

    # aspect ratio < 0.15
    very_thin = sum(1 for r in results if r['new_aspect'] < 0.15)
    print(f"Aspect ratio < 0.15: {very_thin}개")
    print()

    print("=" * 80)
    print("결론")
    print("=" * 80)
    print()

    if avg_expand > 15:
        print(f"[매우 효과적] 평균 {avg_expand:.1f}px 확장!")
        print(f"               최대 {max_expand}px 확장")
        print()
        print("[권장] Vertical Projection 방법을 메인 후처리로 사용")
    elif avg_expand > 5:
        print(f"[효과적] 평균 {avg_expand:.1f}px 확장")
        print()
        print("[권장] Distance Transform과 함께 사용")
    else:
        print(f"[제한적] 평균 {avg_expand:.1f}px 확장")
        print()
        print("[참고] min_density 파라미터 조정 필요")

    print()
    print("=" * 80)


if __name__ == "__main__":
    test_vertical_projection()
