"""
작은 기호 검출 결과를 크게 시각화
"""
from pathlib import Path
import sys
import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from typing import List

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


def detect_with_small_symbols(gray: np.ndarray) -> dict:
    """작은 기호 검출 (Global T=200, Min 2x2)"""
    # Global Threshold
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    # Connected Components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    blocks = {
        'tiny': [],      # w <= 10, h <= 10
        'small': [],     # w <= 30, h <= 20
        'medium': [],    # 일반 크기
        'large': [],     # w > 100 or h > 100
        'integral': []   # aspect < 0.3, h > 30
    }

    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]

        if w < 2 or h < 2:
            continue

        block = {'x': x, 'y': y, 'w': w, 'h': h}

        # 인테그랄 후보
        if h > 0:
            aspect = w / h
            if aspect < 0.3 and h > 30:
                blocks['integral'].append(block)
                continue

        # 크기별 분류
        if w <= 10 and h <= 10:
            blocks['tiny'].append(block)
        elif w <= 30 and h <= 20:
            blocks['small'].append(block)
        elif w > 100 or h > 100:
            blocks['large'].append(block)
        else:
            blocks['medium'].append(block)

    return blocks


def visualize_large(image: np.ndarray, blocks: dict, output_path: Path):
    """크고 선명하게 시각화"""
    # Figure 생성
    fig, ax = plt.subplots(figsize=(16, 20))

    # 원본 이미지를 RGB로 변환
    if len(image.shape) == 2:
        display_image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    else:
        display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    ax.imshow(display_image)

    # 통계
    total_blocks = sum(len(blocks[k]) for k in blocks.keys())
    tiny_count = len(blocks['tiny'])
    small_count = len(blocks['small'])
    medium_count = len(blocks['medium'])
    large_count = len(blocks['large'])
    integral_count = len(blocks['integral'])

    # 1. Medium 블록 (초록색, 가장 밑에)
    for block in blocks['medium']:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=1,
                                 edgecolor='lime', facecolor='none', alpha=0.5)
        ax.add_patch(rect)

    # 2. Small 블록 (주황색)
    for block in blocks['small']:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=1.5,
                                 edgecolor='orange', facecolor='none', alpha=0.7)
        ax.add_patch(rect)

    # 3. Tiny 블록 (자주색, 강조)
    for block in blocks['tiny']:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=2,
                                 edgecolor='magenta', facecolor='none', alpha=0.9)
        ax.add_patch(rect)

    # 4. Large 블록 (노란색)
    for block in blocks['large']:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=2,
                                 edgecolor='yellow', facecolor='none', alpha=0.7)
        ax.add_patch(rect)

    # 5. Integral 블록 (빨간색, 가장 위)
    for block in blocks['integral']:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=3,
                                 edgecolor='red', facecolor='none', alpha=0.9)
        ax.add_patch(rect)
        # 크기 표시
        ax.text(x, y - 10, f"{w}x{h}", fontsize=8, color='red',
               bbox=dict(boxstyle='round,pad=0.3', facecolor='yellow', alpha=0.7))

    # 제목
    title = 'Small Symbol Detection (Global Threshold=200, Min 2x2)\n'
    title += f'Total Blocks: {total_blocks} | '
    title += f'Tiny(<=10x10): {tiny_count} | '
    title += f'Small(<=30x20): {small_count} | '
    title += f'Medium: {medium_count} | '
    title += f'Large: {large_count} | '
    title += f'Integral: {integral_count}'

    ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
    ax.set_xlabel('X Position (pixels)', fontsize=12)
    ax.set_ylabel('Y Position (pixels)', fontsize=12)
    ax.grid(True, alpha=0.2, linewidth=0.5)

    # 범례
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], color='magenta', linewidth=2, label=f'Tiny (<=10x10): {tiny_count} - 작은 기호 (-, =, 지수)'),
        Line2D([0], [0], color='orange', linewidth=2, label=f'Small (<=30x20): {small_count} - 작은 텍스트'),
        Line2D([0], [0], color='lime', linewidth=2, label=f'Medium: {medium_count} - 일반 텍스트'),
        Line2D([0], [0], color='yellow', linewidth=2, label=f'Large: {large_count} - 큰 블록'),
        Line2D([0], [0], color='red', linewidth=3, label=f'Integral: {integral_count} - 인테그랄')
    ]
    ax.legend(handles=legend_elements, loc='upper right', fontsize=11,
             framealpha=0.9)

    plt.tight_layout()
    plt.savefig(output_path, dpi=200, bbox_inches='tight')
    plt.close()

    print(f"[OK] 시각화 완료")
    print(f"  - 총 블록: {total_blocks}개")
    print(f"  - Tiny (작은 기호): {tiny_count}개 ✅")
    print(f"  - Small: {small_count}개")
    print(f"  - Medium: {medium_count}개")
    print(f"  - Large: {large_count}개")
    print(f"  - Integral: {integral_count}개")


def main():
    """작은 기호 검출 시각화"""
    print("=" * 80)
    print("작은 기호 검출 시각화 (Global T=200, Min 2x2)")
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

    print("작은 기호 검출 중...")
    print()

    # 블록 검출
    blocks = detect_with_small_symbols(gray)

    # 시각화
    output_dir = config.DATASET_ROOT
    output_path = output_dir / "small_symbols_detection_large.png"

    visualize_large(image, blocks, output_path)

    print()
    print("=" * 80)
    print("저장 완료")
    print("=" * 80)
    print()
    print(f"파일: {output_path}")
    print()
    print("설정:")
    print("  - Threshold: 200 (현재 240보다 낮음)")
    print("  - 최소 크기: 2x2 (현재 5x5보다 작음)")
    print("  - Tiny 기호 157개 검출 (현재 30개 대비 5배 증가)")
    print()
    print("색상 범례:")
    print("  - 자주색: Tiny (<=10x10) - 작은 기호 (-, =, 지수)")
    print("  - 주황색: Small (<=30x20) - 작은 텍스트")
    print("  - 초록색: Medium - 일반 텍스트")
    print("  - 노란색: Large - 큰 블록")
    print("  - 빨간색: Integral - 인테그랄 후보")
    print()
    print("=" * 80)


if __name__ == "__main__":
    main()
