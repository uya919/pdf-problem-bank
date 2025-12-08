"""
각 방법별 종합 블록 검출 분석

레퍼런스 이미지(pixel_block_analysis_1.png) 형식으로
8가지 방법의 전체 블록 검출 성능을 시각화
"""
from pathlib import Path
import sys
import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
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


def detect_blocks_method_1(mask: np.ndarray) -> List[dict]:
    """방법 1: 순수 밀집도 분석 (Morphology 없음)"""
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w > 5 and h > 5:  # 최소 크기
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


def detect_blocks_method_3(mask: np.ndarray) -> List[dict]:
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
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

    return blocks


def detect_blocks_method_4(mask: np.ndarray) -> List[dict]:
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
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

    return blocks


def detect_blocks_method_5(mask: np.ndarray) -> List[dict]:
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
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

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


def detect_blocks_method_6(mask: np.ndarray) -> List[dict]:
    """방법 6: v_kernel=30 + Distance Transform"""
    base_blocks = detect_blocks_method_3(mask)

    expanded_blocks = []
    for block in base_blocks:
        bbox = (block['x'], block['y'], block['w'], block['h'])
        ex, ey, ex_max, ey_max = expand_bbox_distance(mask, bbox)
        expanded_blocks.append({
            'x': ex,
            'y': ey,
            'w': ex_max - ex,
            'h': ey_max - ey
        })

    return expanded_blocks


def detect_blocks_method_7(mask: np.ndarray) -> List[dict]:
    """방법 7: Vertical Projection"""
    base_blocks = detect_blocks_method_3(mask)

    expanded_blocks = []
    for block in base_blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']

        extend_range = 100
        search_y_min = max(0, y - extend_range)
        search_y_max = min(mask.shape[0], y + h + extend_range)

        projection = np.sum(mask[:, x:x+w] > 0, axis=1)

        new_y_min = y
        for yi in range(y - 1, search_y_min - 1, -1):
            if yi < 0 or yi >= len(projection):
                break
            if projection[yi] > 0:
                density = projection[yi] / w if w > 0 else 0
                if density >= 0.03:
                    new_y_min = yi

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
            'h': new_y_max - new_y_min
        })

    return expanded_blocks


def detect_blocks_method_8(mask: np.ndarray) -> List[dict]:
    """방법 8: Contour 직접 검출"""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    blocks = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w > 5 and h > 5:
            blocks.append({'x': x, 'y': y, 'w': w, 'h': h})

    return blocks


def compute_density_profiles(mask: np.ndarray) -> dict:
    """픽셀 밀도 프로파일 계산"""
    height, width = mask.shape

    # 세로 프로파일 (각 행의 픽셀 합)
    vertical_profile = np.sum(mask > 0, axis=1) / width

    # 가로 프로파일 (각 열의 픽셀 합)
    horizontal_profile = np.sum(mask > 0, axis=0) / height

    return {
        'vertical': vertical_profile,
        'horizontal': horizontal_profile
    }


def compute_cumulative_density(mask: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """누적 밀도 곡선 계산"""
    total_pixels = mask.size
    black_pixels = np.sum(mask > 0)

    # 픽셀 값 정렬
    sorted_pixels = np.sort(mask.flatten())

    # 누적 비율
    cumulative = np.arange(1, len(sorted_pixels) + 1) / len(sorted_pixels)

    return sorted_pixels, cumulative


def create_comprehensive_analysis(
    image: np.ndarray,
    mask: np.ndarray,
    blocks: List[dict],
    method_name: str,
    method_num: int,
    output_path: Path
):
    """종합 분석 이미지 생성 (레퍼런스 형식)"""

    # Figure 생성 (3행 3열 레이아웃)
    fig = plt.figure(figsize=(18, 12))

    # 밀도 프로파일 계산
    profiles = compute_density_profiles(mask)

    # 1. 왼쪽 위: 세로 밀도 프로파일 (Y축)
    ax1 = plt.subplot(3, 3, 1)
    y_coords = np.arange(len(profiles['vertical']))
    ax1.plot(profiles['vertical'], y_coords, 'b-', linewidth=1)
    ax1.set_xlabel('Pixel Density')
    ax1.set_ylabel('Y Coordinate')
    ax1.set_title('Vertical Density Profile')
    ax1.invert_yaxis()
    ax1.grid(True, alpha=0.3)

    # 2. 왼쪽 가운데: 가로 밀도 프로파일 (X축)
    ax2 = plt.subplot(3, 3, 4)
    x_coords = np.arange(len(profiles['horizontal']))
    ax2.plot(x_coords, profiles['horizontal'], 'r-', linewidth=1)
    ax2.set_xlabel('X Coordinate')
    ax2.set_ylabel('Pixel Density')
    ax2.set_title('Horizontal Density Profile')
    ax2.grid(True, alpha=0.3)

    # 3. 왼쪽 아래: 블록 통계 텍스트
    ax3 = plt.subplot(3, 3, 7)
    ax3.axis('off')

    total_blocks = len(blocks)
    integral_blocks = sum(1 for b in blocks if b['h'] > 0 and (b['w'] / b['h']) < 0.2 and b['h'] >= 40)
    avg_width = np.mean([b['w'] for b in blocks]) if blocks else 0
    avg_height = np.mean([b['h'] for b in blocks]) if blocks else 0

    stats_text = f"""Method #{method_num}: {method_name}

Total Blocks: {total_blocks}
Integral Candidates: {integral_blocks}

Average Width: {avg_width:.1f}px
Average Height: {avg_height:.1f}px

Image Size: {mask.shape[1]}x{mask.shape[0]}px
"""
    ax3.text(0.1, 0.5, stats_text, fontsize=11, family='monospace',
             verticalalignment='center')

    # 4. 중앙 위: 상세 블록 분석 텍스트
    ax4 = plt.subplot(3, 3, 2)
    ax4.axis('off')
    ax4.set_title('Detailed Block-level Analysis')

    # 상위 10개 블록 표시
    sorted_blocks = sorted(blocks, key=lambda b: b['w'] * b['h'], reverse=True)[:10]
    details_text = "Top 10 Largest Blocks:\n\n"
    details_text += f"{'ID':<4} {'X':<6} {'Y':<6} {'W':<6} {'H':<6} {'Area':<8}\n"
    details_text += "-" * 42 + "\n"

    for i, b in enumerate(sorted_blocks, 1):
        area = b['w'] * b['h']
        details_text += f"{i:<4} {b['x']:<6} {b['y']:<6} {b['w']:<6} {b['h']:<6} {area:<8}\n"

    ax4.text(0.05, 0.95, details_text, fontsize=9, family='monospace',
             verticalalignment='top', transform=ax4.transAxes)

    # 5. 중앙 중간: 히트맵
    ax5 = plt.subplot(3, 3, 5)

    # 마스크를 히트맵으로 변환 (블록 영역 강조)
    heatmap = np.zeros_like(mask, dtype=float)
    for block in blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        heatmap[y:y+h, x:x+w] += 1.0

    im = ax5.imshow(heatmap, cmap='viridis', aspect='auto')
    ax5.set_title(f'High Resolution Heatmap')
    ax5.set_xlabel('X Position (pixels)')
    ax5.set_ylabel('Y Position (pixels)')
    plt.colorbar(im, ax=ax5, label='Block Density')

    # 6. 중앙 아래: 빈 공간 (레이아웃 조정용)
    ax6 = plt.subplot(3, 3, 8)
    ax6.axis('off')

    # 7. 오른쪽 위: 누적 밀도 곡선
    ax7 = plt.subplot(3, 3, 3)
    sorted_vals, cumulative = compute_cumulative_density(mask)

    # 샘플링 (전체 표시하면 너무 많음)
    sample_rate = len(sorted_vals) // 1000
    if sample_rate < 1:
        sample_rate = 1

    ax7.plot(sorted_vals[::sample_rate], cumulative[::sample_rate], 'r-', linewidth=1.5, label='Cumulative')
    ax7.set_xlabel('Pixel Value')
    ax7.set_ylabel('Cumulative Ratio')
    ax7.set_title('Cumulative Density Curve')
    ax7.grid(True, alpha=0.3)
    ax7.legend()

    # 8. 오른쪽 중간: 빈 공간
    ax8 = plt.subplot(3, 3, 6)
    ax8.axis('off')

    # 9. 오른쪽 아래: 검출된 블록 시각화
    ax9 = plt.subplot(3, 3, 9)

    # 원본 이미지를 RGB로 변환
    if len(image.shape) == 2:
        display_image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    else:
        display_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    ax9.imshow(display_image)

    # 모든 블록을 초록색 박스로 표시
    for block in blocks:
        x, y, w, h = block['x'], block['y'], block['w'], block['h']
        rect = patches.Rectangle((x, y), w, h, linewidth=1,
                                 edgecolor='lime', facecolor='none', alpha=0.7)
        ax9.add_patch(rect)

    # 인테그랄 후보는 빨간색으로 강조
    for block in blocks:
        if block['h'] > 0:
            aspect = block['w'] / block['h']
            if aspect < 0.2 and block['h'] >= 40:
                x, y, w, h = block['x'], block['y'], block['w'], block['h']
                rect = patches.Rectangle((x, y), w, h, linewidth=2,
                                         edgecolor='red', facecolor='none', alpha=0.9)
                ax9.add_patch(rect)

    ax9.set_title(f'Detected Blocks ({total_blocks} regions)')
    ax9.set_xlabel('X Position (pixels)')
    ax9.set_ylabel('Y Position (pixels)')
    ax9.axis('on')

    # 전체 제목
    fig.suptitle(f'Comprehensive Block Detection Analysis - Method {method_num}: {method_name}',
                 fontsize=16, fontweight='bold', y=0.98)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()

    print(f"[OK] {method_name}: {total_blocks}개 블록, {integral_blocks}개 인테그랄")


def main():
    """모든 방법 종합 분석"""
    print("=" * 80)
    print("8가지 방법 종합 블록 검출 분석")
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

    print("각 방법별 종합 분석 생성 중...")
    print()

    methods = [
        ("Pure Density", detect_blocks_method_1),
        ("v_kernel=12", detect_blocks_method_2),
        ("v_kernel=30", detect_blocks_method_3),
        ("v_kernel=35", detect_blocks_method_4),
        ("v_kernel=50", detect_blocks_method_5),
        ("v=30 + Distance", detect_blocks_method_6),
        ("Vertical Projection", detect_blocks_method_7),
        ("Contour Direct", detect_blocks_method_8)
    ]

    output_dir = config.DATASET_ROOT

    for i, (name, detect_func) in enumerate(methods, 1):
        print(f"방법 {i}/{len(methods)}: {name} 분석 중...")

        # 블록 검출
        blocks = detect_func(mask)

        # 종합 분석 이미지 생성
        filename = f"comprehensive_analysis_method_{i}_{name.replace(' ', '_').replace('=', '').lower()}.png"
        output_path = output_dir / filename

        create_comprehensive_analysis(image, mask, blocks, name, i, output_path)

    print()
    print("=" * 80)
    print("종합 분석 완료")
    print("=" * 80)
    print()
    print(f"저장 위치: {output_dir}")
    print()
    print("생성된 파일:")
    for i, (name, _) in enumerate(methods, 1):
        filename = f"comprehensive_analysis_method_{i}_{name.replace(' ', '_').replace('=', '').lower()}.png"
        print(f"  {i}. {filename}")

    print()
    print("=" * 80)
    print("다음 단계")
    print("=" * 80)
    print()
    print("1. 각 이미지를 확인하고 가장 효과적인 방법 선택")
    print("2. 전체 블록 검출 품질 비교:")
    print("   - 총 블록 수")
    print("   - 인테그랄 검출 수")
    print("   - 블록 경계 정확도")
    print("   - 과도 병합/분리 여부")
    print()
    print("=" * 80)


if __name__ == "__main__":
    main()
