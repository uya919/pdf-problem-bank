"""
Contour 기반 직접 검출 테스트

Morphology 없이 cv2.findContours()로 직접 윤곽을 찾고
aspect ratio로 필터링하여 인테그랄 검출
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


def merge_nearby_contours(contours: list, max_y_gap: int = 30, max_x_diff: int = 20) -> list:
    """
    Y 방향으로 가까운 contour들을 병합

    Args:
        contours: [(x, y, w, h), ...] 형식의 contour bbox 리스트
        max_y_gap: Y 방향 최대 간격
        max_x_diff: X 중심 좌표 최대 차이

    Returns:
        병합된 contour bbox 리스트
    """
    if not contours:
        return []

    # Y 좌표 기준 정렬
    sorted_contours = sorted(contours, key=lambda c: c[1])

    merged = []
    current_group = [sorted_contours[0]]

    for i in range(1, len(sorted_contours)):
        curr = sorted_contours[i]
        prev = current_group[-1]

        # 이전 contour의 아래 끝
        prev_bottom = prev[1] + prev[3]
        curr_top = curr[1]

        # X 중심 좌표 차이
        prev_center_x = prev[0] + prev[2] / 2
        curr_center_x = curr[0] + curr[2] / 2
        x_diff = abs(curr_center_x - prev_center_x)

        # 병합 조건: Y 간격이 가깝고 X 중심이 비슷
        if (curr_top - prev_bottom) <= max_y_gap and x_diff <= max_x_diff:
            current_group.append(curr)
        else:
            # 현재 그룹 병합하여 저장
            if current_group:
                merged.append(_merge_contour_group(current_group))
            # 새 그룹 시작
            current_group = [curr]

    # 마지막 그룹 병합
    if current_group:
        merged.append(_merge_contour_group(current_group))

    return merged


def _merge_contour_group(group: list) -> tuple:
    """
    Contour 그룹을 하나의 bbox로 병합

    Args:
        group: [(x, y, w, h), ...] 리스트

    Returns:
        병합된 bbox (x, y, w, h)
    """
    x_min = min(c[0] for c in group)
    y_min = min(c[1] for c in group)
    x_max = max(c[0] + c[2] for c in group)
    y_max = max(c[1] + c[3] for c in group)

    return (x_min, y_min, x_max - x_min, y_max - y_min)


def test_contour_detection():
    """Contour 기반 인테그랄 검출 테스트"""
    print("=" * 80)
    print("Contour 기반 직접 인테그랄 검출")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not image_path.exists():
        print(f"[오류] 이미지 없음")
        return

    # 이미지 로드
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    print("1단계: Contour 검출 (Morphology 없이)")
    print()

    # Contour 찾기
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    print(f"총 Contour 수: {len(contours)}개")
    print()

    # 각 contour의 bounding box 계산
    all_bboxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        all_bboxes.append((x, y, w, h))

    print("2단계: 세로로 긴 Contour 필터링")
    print()

    # 세로로 긴 contour 필터링
    vertical_contours = []
    for bbox in all_bboxes:
        x, y, w, h = bbox

        if h > 0:
            aspect = w / h

            # 매우 세로로 길고, 높이가 일정 이상
            if aspect < 0.5 and h >= 20 and w <= 50:
                vertical_contours.append(bbox)

    print(f"세로로 긴 Contour (aspect < 0.5, h >= 20, w <= 50): {len(vertical_contours)}개")
    print()

    print("3단계: Y 방향으로 가까운 Contour 병합")
    print()

    # 병합
    merged_bboxes = merge_nearby_contours(
        vertical_contours,
        max_y_gap=50,
        max_x_diff=20
    )

    print(f"병합 후 블록 수: {len(merged_bboxes)}개")
    print()

    # 인테그랄 후보 필터링 (aspect < 0.2, h >= 40)
    integral_candidates = []
    for bbox in merged_bboxes:
        x, y, w, h = bbox

        if h > 0:
            aspect = w / h

            if aspect < 0.3 and h >= 30:
                integral_candidates.append({
                    'bbox': (x, y, x + w, y + h),
                    'width': w,
                    'height': h,
                    'aspect': aspect
                })

    integral_candidates.sort(key=lambda c: c['aspect'])

    print(f"인테그랄 후보 (aspect < 0.3, h >= 30): {len(integral_candidates)}개")
    print()

    if integral_candidates:
        print("검출된 인테그랄 후보:")
        print(f"{'Width':>6} {'Height':>7} {'Aspect':>8} {'Y_min':>6}")
        print("-" * 40)
        for c in integral_candidates:
            x_min, y_min, x_max, y_max = c['bbox']
            print(f"{c['width']:6d} {c['height']:7d} {c['aspect']:8.3f} {y_min:6d}")
        print()

    # 시각화
    output_dir = config.DATASET_ROOT

    # Before: 원본 세로 contour (병합 전)
    vis_before = image.copy()
    for bbox in vertical_contours:
        x, y, w, h = bbox
        cv2.rectangle(vis_before, (x, y), (x + w, y + h), (255, 0, 0), 1)

    # After: 병합된 인테그랄 (병합 후)
    vis_after = image.copy()
    for c in integral_candidates:
        x_min, y_min, x_max, y_max = c['bbox']
        cv2.rectangle(vis_after, (x_min, y_min), (x_max, y_max), (0, 255, 0), 3)
        cv2.putText(vis_after, f"{c['width']}x{c['height']}", (x_min, y_min - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

    before_path = output_dir / "contour_before_merge.png"
    after_path = output_dir / "contour_after_merge.png"

    imwrite_unicode(before_path, vis_before)
    imwrite_unicode(after_path, vis_after)

    print("=" * 80)
    print("시각화 저장")
    print("=" * 80)
    print()
    print(f"병합 전: {before_path}")
    print(f"병합 후: {after_path}")
    print()

    # 통계
    print("=" * 80)
    print("검출 성능")
    print("=" * 80)
    print()

    if integral_candidates:
        heights = [c['height'] for c in integral_candidates]
        aspects = [c['aspect'] for c in integral_candidates]

        print(f"검출된 인테그랄: {len(integral_candidates)}개")
        print(f"평균 높이: {sum(heights)/len(heights):.1f}px")
        print(f"높이 범위: {min(heights)} ~ {max(heights)}px")
        print(f"평균 aspect ratio: {sum(aspects)/len(aspects):.3f}")
        print()

        very_thin = sum(1 for a in aspects if a < 0.15)
        print(f"매우 얇은 인테그랄 (aspect < 0.15): {very_thin}개")
        print()

    # 기존 방법과 비교
    print("=" * 80)
    print("결론")
    print("=" * 80)
    print()

    print("[Contour 기반 직접 검출 vs Morphology 기반]")
    print()
    print("장점:")
    print("  - Morphology 왜곡 없이 원본 픽셀 형태 그대로 검출")
    print("  - 더 많은 세로 조각 검출 가능")
    print("  - 경계가 더 정확함")
    print()
    print("단점:")
    print("  - 매우 작은 노이즈도 contour로 검출됨")
    print("  - 병합 로직의 파라미터 튜닝 필요")
    print()

    if len(integral_candidates) >= 7:
        print(f"[성공] {len(integral_candidates)}개 인테그랄 검출!")
        print("       Morphology 방법(7개)과 비슷하거나 더 많음")
        print()
        print("[권장] Contour 기반 방법을 후처리와 함께 사용")
    else:
        print(f"[제한적] {len(integral_candidates)}개 인테그랄 검출")
        print("        Morphology 방법(7개)보다 적음")
        print()
        print("[참고] max_y_gap, max_x_diff 파라미터 조정 필요")

    print()
    print("=" * 80)


if __name__ == "__main__":
    test_contour_detection()
