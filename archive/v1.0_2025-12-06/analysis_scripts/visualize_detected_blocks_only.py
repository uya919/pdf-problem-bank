"""
선택한 3가지 방법의 Detected Blocks만 크게 시각화
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


def detect_blocks_method_1(mask: np.ndarray) -> List[dict]:
    """방법 1: 순수 밀집도 분석"""
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

    return blocks


def detect_blocks_method_2(mask: np.ndarray) -> List[dict]:
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
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

    return blocks


def detect_blocks_method_8(mask: np.ndarray) -> List[dict]:
    """방법 8: Contour 직접 검출"""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    blocks = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

    return blocks


def visualize_blocks_only(
    image: np.ndarray,
    blocks: List[dict],
    method_name: str,
    method_num: int,
    output_path: Path
):
    """검출된 블록만 시각화 (크고 선명하게)"""

    # Figure 생성
    fig, ax = plt.subplots(figsize=(16, 20))

    # 원본 이미지를 RGB로 변환
    if len(image.shape) == 2:
        display_image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    else:
        display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    ax.imshow(display_image)

    # 통계 계산
    total_blocks = len(blocks)
    integral_blocks = sum(1 for b in blocks if b['h'] > 0 and (b['w'] / b['h']) < 0.2 and b['h'] >= 40)

    # 모든 블록을 초록색 박스로 표시
    for block in blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=1.5,
                                 edgecolor='lime', facecolor='none', alpha=0.7)
        ax.add_patch(rect)

    # 인테그랄 후보는 빨간색으로 강조
    integral_count = 0
    for block in blocks:
        if block['h'] > 0:
            aspect = block['w'] / block['h']
            if aspect < 0.2 and block['h'] >= 40:
                x, y, w, h = block['x'], block['y'], block['w'], block['h']
                rect = patches.Rectangle((x, y), w, h, linewidth=3,
                                         edgecolor='red', facecolor='none', alpha=0.9)
                ax.add_patch(rect)
                integral_count += 1

                # 블록 크기 표시
                ax.text(x, y - 10, f"{w}x{h}", fontsize=8, color='red',
                       bbox=dict(boxstyle='round,pad=0.3', facecolor='yellow', alpha=0.7))

    # 제목
    title = f'Method {method_num}: {method_name}\n'
    title += f'Total Blocks: {total_blocks} | Integral Candidates (aspect<0.2, h>=40): {integral_count}'
    ax.set_title(title, fontsize=16, fontweight='bold', pad=20)

    ax.set_xlabel('X Position (pixels)', fontsize=12)
    ax.set_ylabel('Y Position (pixels)', fontsize=12)
    ax.grid(True, alpha=0.2, linewidth=0.5)

    # 범례
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], color='lime', linewidth=2, label=f'All Blocks ({total_blocks})'),
        Line2D([0], [0], color='red', linewidth=3, label=f'Integral Candidates ({integral_count})')
    ]
    ax.legend(handles=legend_elements, loc='upper right', fontsize=12)

    plt.tight_layout()
    plt.savefig(output_path, dpi=200, bbox_inches='tight')
    plt.close()

    print(f"[OK] {method_name}: {total_blocks}개 블록, {integral_count}개 인테그랄")


def main():
    """선택한 3가지 방법의 Detected Blocks만 시각화"""
    print("=" * 80)
    print("선택한 3가지 방법 - Detected Blocks 시각화")
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

    print("각 방법별 블록 검출 시각화 생성 중...")
    print()

    methods = [
        (1, "Pure Density", detect_blocks_method_1),
        (2, "v_kernel=12", detect_blocks_method_2),
        (8, "Contour Direct", detect_blocks_method_8)
    ]

    output_dir = config.DATASET_ROOT

    for method_num, name, detect_func in methods:
        print(f"방법 {method_num}: {name} 시각화 중...")

        # 블록 검출
        blocks = detect_func(mask)

        # 시각화
        filename = f"blocks_only_method_{method_num}_{name.replace(' ', '_').replace('=', '').lower()}.png"
        output_path = output_dir / filename

        visualize_blocks_only(image, blocks, name, method_num, output_path)

    print()
    print("=" * 80)
    print("시각화 완료")
    print("=" * 80)
    print()
    print(f"저장 위치: {output_dir}")
    print()
    print("생성된 파일:")
    for method_num, name, _ in methods:
        filename = f"blocks_only_method_{method_num}_{name.replace(' ', '_').replace('=', '').lower()}.png"
        print(f"  {method_num}. {filename}")

    print()
    print("=" * 80)


if __name__ == "__main__":
    main()
