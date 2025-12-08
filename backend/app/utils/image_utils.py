"""
Phase 12-2: 이미지 처리 유틸리티

바운딩 박스 계산, 패딩 처리 등
Phase 53-D: 세로 이미지 합성 추가
"""
from typing import List, Tuple, Dict, Any, Optional
from PIL import Image


def calculate_bounding_box(blocks: List[Dict[str, Any]]) -> Tuple[int, int, int, int]:
    """
    블록들의 통합 바운딩 박스 계산

    Args:
        blocks: 블록 리스트 (각 블록은 "bbox" 키 필요)
                bbox는 [x1, y1, x2, y2] 형식

    Returns:
        (x1, y1, x2, y2) 튜플

    Raises:
        ValueError: 블록이 비어있을 때

    Examples:
        >>> blocks = [{"bbox": [0, 0, 100, 50]}, {"bbox": [50, 30, 150, 80]}]
        >>> calculate_bounding_box(blocks)
        (0, 0, 150, 80)
    """
    if not blocks:
        raise ValueError("블록 리스트가 비어있습니다")

    x1 = min(b["bbox"][0] for b in blocks)
    y1 = min(b["bbox"][1] for b in blocks)
    x2 = max(b["bbox"][2] for b in blocks)
    y2 = max(b["bbox"][3] for b in blocks)

    return (x1, y1, x2, y2)


def add_padding(
    bbox: Tuple[int, int, int, int],
    padding: int,
    max_width: int,
    max_height: int
) -> Tuple[int, int, int, int]:
    """
    바운딩 박스에 패딩 추가 (이미지 경계 고려)

    Args:
        bbox: (x1, y1, x2, y2) 원본 바운딩 박스
        padding: 패딩 픽셀
        max_width: 이미지 최대 너비
        max_height: 이미지 최대 높이

    Returns:
        패딩이 적용된 (x1, y1, x2, y2)

    Examples:
        >>> add_padding((10, 10, 100, 100), 5, 200, 200)
        (5, 5, 105, 105)
        >>> add_padding((0, 0, 100, 100), 10, 200, 200)
        (0, 0, 110, 110)  # 경계 처리
    """
    x1, y1, x2, y2 = bbox

    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(max_width, x2 + padding)
    y2 = min(max_height, y2 + padding)

    return (x1, y1, x2, y2)


def get_bbox_dimensions(bbox: Tuple[int, int, int, int]) -> Tuple[int, int]:
    """
    바운딩 박스의 너비와 높이 계산

    Args:
        bbox: (x1, y1, x2, y2)

    Returns:
        (width, height) 튜플

    Examples:
        >>> get_bbox_dimensions((10, 20, 110, 120))
        (100, 100)
    """
    x1, y1, x2, y2 = bbox
    return (x2 - x1, y2 - y1)


def get_bbox_center(bbox: Tuple[int, int, int, int]) -> Tuple[float, float]:
    """
    바운딩 박스의 중심점 계산

    Args:
        bbox: (x1, y1, x2, y2)

    Returns:
        (center_x, center_y) 튜플

    Examples:
        >>> get_bbox_center((0, 0, 100, 100))
        (50.0, 50.0)
    """
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, (y1 + y2) / 2)


def merge_images_vertically(images: List[Image.Image], padding: int = 10) -> Optional[Image.Image]:
    """
    Phase 53-D: 여러 이미지를 세로로 합성

    한국어 책 읽기 순서에 따라 L(왼쪽) → R(오른쪽) 순서로 이미지를 세로 합성합니다.

    Args:
        images: PIL Image 리스트 (순서대로 합성됨)
        padding: 이미지 사이 간격 (픽셀), 기본 10px

    Returns:
        합성된 이미지. 빈 리스트면 None, 1개면 그대로 반환.

    Examples:
        >>> img1 = Image.new("RGB", (100, 50), "white")
        >>> img2 = Image.new("RGB", (80, 60), "white")
        >>> result = merge_images_vertically([img1, img2])
        >>> result.size
        (100, 120)  # max_width, total_height + padding
    """
    if not images:
        return None

    if len(images) == 1:
        return images[0]

    # 최대 너비와 총 높이 계산
    max_width = max(img.width for img in images)
    total_height = sum(img.height for img in images) + padding * (len(images) - 1)

    # 흰색 배경 생성
    result = Image.new("RGB", (max_width, total_height), "white")

    # 각 이미지 붙이기 (왼쪽 정렬 - Phase 53-C)
    y_offset = 0
    for img in images:
        x_offset = 0  # 왼쪽 정렬 (수학 해설의 자연스러운 표기)
        result.paste(img, (x_offset, y_offset))
        y_offset += img.height + padding

    return result
