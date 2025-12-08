"""
모든 인테그랄 검출 방법 시각적 비교

8가지 방법을 동일한 이미지에 적용하여 시각적으로 비교
사용자가 가장 효과적인 방법을 선택할 수 있도록 지원
"""
from pathlib import Path
import sys
import cv2
import numpy as np
from typing import List, Tuple

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


def method_1_pure_density(mask: np.ndarray) -> List[dict]:
    """방법 1: 순수 밀집도 분석 (Morphology 없음)"""
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:  # 세로로 길고 최소 크기
                blocks.append({'x': x, 'y': y, 'w': w, 'h': h, 'aspect': aspect})

    return blocks


def method_2_v12(mask: np.ndarray) -> List[dict]:
    """방법 2: v_kernel=12"""
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 12))

    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        v_closed, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:
                blocks.append({'x': x, 'y': y, 'w': w, 'h': h, 'aspect': aspect})

    return blocks


def method_3_v30(mask: np.ndarray) -> List[dict]:
    """방법 3: v_kernel=30"""
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 30))

    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        v_closed, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:
                blocks.append({'x': x, 'y': y, 'w': w, 'h': h, 'aspect': aspect})

    return blocks


def method_4_v35(mask: np.ndarray) -> List[dict]:
    """방법 4: v_kernel=35"""
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 35))

    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        v_closed, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:
                blocks.append({'x': x, 'y': y, 'w': w, 'h': h, 'aspect': aspect})

    return blocks


def method_5_v50(mask: np.ndarray) -> List[dict]:
    """방법 5: v_kernel=50"""
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 50))

    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        v_closed, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:
                blocks.append({'x': x, 'y': y, 'w': w, 'h': h, 'aspect': aspect})

    return blocks


def expand_bbox_distance(mask: np.ndarray, bbox: Tuple[int, int, int, int]) -> Tuple[int, int, int, int]:
    """Distance Transform 기반 bbox 확장"""
    x, y, w, h = bbox
    x_max = x + w
    y_max = y + h
    height, width = mask.shape

    max_distance = 60
    min_density = 0.01

    # 위쪽 확장
    extend_top = max(0, y - max_distance)
    new_y_min = y
    if extend_top < y:
        roi = mask[extend_top:y, x:x_max]
        if roi.size > 0:
            row_sums = np.sum(roi > 0, axis=1)
            consecutive_empty = 0
            for i in range(len(row_sums) - 1, -1, -1):
                if row_sums[i] > 0:
                    density = row_sums[i] / w if w > 0 else 0
                    if density >= min_density:
                        new_y_min = extend_top + i
                        consecutive_empty = 0
                    else:
                        consecutive_empty += 1
                else:
                    consecutive_empty += 1
                if consecutive_empty >= 15:
                    break

    # 아래쪽 확장
    extend_bottom = min(height, y_max + max_distance)
    new_y_max = y_max
    if extend_bottom > y_max:
        roi = mask[y_max:extend_bottom, x:x_max]
        if roi.size > 0:
            row_sums = np.sum(roi > 0, axis=1)
            consecutive_empty = 0
            for i in range(len(row_sums)):
                if row_sums[i] > 0:
                    density = row_sums[i] / w if w > 0 else 0
                    if density >= min_density:
                        new_y_max = y_max + i + 1
                        consecutive_empty = 0
                    else:
                        consecutive_empty += 1
                else:
                    consecutive_empty += 1
                if consecutive_empty >= 15:
                    break

    return (x, new_y_min, x + w, new_y_max)


def method_6_v30_distance(mask: np.ndarray) -> List[dict]:
    """방법 6: v_kernel=30 + Distance Transform"""
    # v=30으로 기본 검출
    base_blocks = method_3_v30(mask)

    # Distance Transform으로 확장
    expanded_blocks = []
    for block in base_blocks:
        bbox = (block['x'], block['y'], block['w'], block['h'])
        ex, ey, ex_max, ey_max = expand_bbox_distance(mask, bbox)
        expanded_blocks.append({
            'x': ex,
            'y': ey,
            'w': ex_max - ex,
            'h': ey_max - ey,
            'aspect': (ex_max - ex) / (ey_max - ey) if (ey_max - ey) > 0 else 0
        })

    return expanded_blocks


def method_7_projection(mask: np.ndarray) -> List[dict]:
    """방법 7: Vertical Projection Profile"""
    # v=30 기본 검출 후 Projection으로 확장
    base_blocks = method_3_v30(mask)

    expanded_blocks = []
    for block in base_blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']

        # Projection 계산
        extend_range = 100
        search_y_min = max(0, y - extend_range)
        search_y_max = min(mask.shape[0], y + h + extend_range)

        projection = np.sum(mask[:, x:x+w] > 0, axis=1)

        # 위쪽 경계
        new_y_min = y
        for yi in range(y - 1, search_y_min - 1, -1):
            if yi < 0 or yi >= len(projection):
                break
            if projection[yi] > 0:
                density = projection[yi] / w if w > 0 else 0
                if density >= 0.03:
                    new_y_min = yi

        # 아래쪽 경계
        new_y_max = y + h
        for yi in range(y + h, search_y_max):
            if yi >= len(projection):
                break
            if projection[yi] > 0:
                density = projection[yi] / w if w > 0 else 0
                if density >= 0.03:
                    new_y_max = yi + 1

        expanded_blocks.append({
            'x': x,
            'y': new_y_min,
            'w': w,
            'h': new_y_max - new_y_min,
            'aspect': w / (new_y_max - new_y_min) if (new_y_max - new_y_min) > 0 else 0
        })

    return expanded_blocks


def method_8_contour(mask: np.ndarray) -> List[dict]:
    """방법 8: Contour 직접 검출"""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    vertical_contours = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20 and w <= 50:
                vertical_contours.append({'x': x, 'y': y, 'w': w, 'h': h, 'aspect': aspect})

    # 간단한 Y 방향 병합 (생략 - 복잡하므로 원본 반환)
    return vertical_contours


def visualize_method(image: np.ndarray, blocks: List[dict], method_name: str, method_num: int) -> np.ndarray:
    """단일 방법 시각화"""
    vis = image.copy()

    # 인테그랄 후보 (aspect < 0.2)
    integral_blocks = [b for b in blocks if b['aspect'] < 0.2 and b['h'] >= 40]

    # 모든 세로 블록 (회색)
    for block in blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        cv2.rectangle(vis, (x, y), (x + w, y + h), (150, 150, 150), 1)

    # 인테그랄 블록 (빨간색 강조)
    for block in integral_blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 0, 255), 3)
        cv2.putText(vis, f"{w}x{h}", (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)

    # 상단에 방법 이름과 검출 수 표시
    text = f"#{method_num}: {method_name}"
    count_text = f"Integrals: {len(integral_blocks)}"

    cv2.putText(vis, text, (10, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 3)
    cv2.putText(vis, text, (10, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 1)

    cv2.putText(vis, count_text, (10, 60),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 3)
    cv2.putText(vis, count_text, (10, 60),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 1)

    return vis


def compare_all_methods():
    """모든 방법 비교"""
    print("=" * 80)
    print("인테그랄 검출 방법 시각적 비교")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not image_path.exists():
        print(f"[오류] 이미지 없음: {image_path}")
        return

    # 이미지 로드
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    print("각 방법 적용 중...")
    print()

    methods = [
        ("Pure Density", method_1_pure_density(mask)),
        ("v_kernel=12", method_2_v12(mask)),
        ("v_kernel=30", method_3_v30(mask)),
        ("v_kernel=35", method_4_v35(mask)),
        ("v_kernel=50", method_5_v50(mask)),
        ("v=30 + Distance", method_6_v30_distance(mask)),
        ("Vertical Projection", method_7_projection(mask)),
        ("Contour Direct", method_8_contour(mask))
    ]

    output_dir = config.DATASET_ROOT

    # 각 방법별 개별 이미지 저장
    for i, (name, blocks) in enumerate(methods, 1):
        integral_count = len([b for b in blocks if b['aspect'] < 0.2 and b['h'] >= 40])
        print(f"방법 {i}: {name:<25} - {len(blocks):3d}개 세로 블록, {integral_count:2d}개 인테그랄")

        vis = visualize_method(image, blocks, name, i)
        filename = f"comparison_method_{i}_{name.replace(' ', '_').replace('=', '').lower()}.png"
        imwrite_unicode(output_dir / filename, vis)

    print()
    print("=" * 80)
    print("시각화 저장 완료")
    print("=" * 80)
    print()
    print(f"저장 위치: {output_dir}")
    print()
    print("생성된 파일:")
    for i, (name, _) in enumerate(methods, 1):
        filename = f"comparison_method_{i}_{name.replace(' ', '_').replace('=', '').lower()}.png"
        print(f"  {i}. {filename}")

    print()
    print("=" * 80)
    print("다음 단계")
    print("=" * 80)
    print()
    print("1. explorer 명령으로 폴더 열기:")
    print(f"   explorer {output_dir}")
    print()
    print("2. 각 이미지를 확인하고 가장 효과적인 방법 선택")
    print()
    print("3. 리포트 참고:")
    print("   docs/visual_comparison_report.md")
    print()
    print("=" * 80)


if __name__ == "__main__":
    compare_all_methods()
