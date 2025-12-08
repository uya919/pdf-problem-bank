"""
작은 기호 검출 연구

-, =, 지수(작은 숫자) 등 작은 기호를 검출하기 위한
다양한 방법 비교 연구
"""
from pathlib import Path
import sys
import cv2
import numpy as np
import matplotlib.pyplot as plt
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


def detect_blocks_with_params(
    gray: np.ndarray,
    threshold_value: int,
    min_width: int,
    min_height: int,
    use_adaptive: bool = False
) -> Tuple[np.ndarray, List[dict]]:
    """
    다양한 파라미터로 블록 검출

    Args:
        gray: 그레이스케일 이미지
        threshold_value: 임계값 (global threshold 사용시)
        min_width: 최소 너비
        min_height: 최소 높이
        use_adaptive: Adaptive threshold 사용 여부

    Returns:
        (mask, blocks)
    """
    if use_adaptive:
        # Adaptive Threshold (지역 기반)
        mask = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=11,
            C=2
        )
    else:
        # Global Threshold
        _, mask = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY_INV)

    # Connected Components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w >= min_width and h >= min_height:
            blocks.append({
                'x': x, 'y': y, 'w': w, 'h': h,
                'area': area
            })

    return mask, blocks


def categorize_blocks(blocks: List[dict]) -> dict:
    """
    블록을 크기별로 분류

    Returns:
        {
            'tiny': [...],      # 매우 작은 기호 (-, =, 지수 등)
            'small': [...],     # 작은 텍스트
            'medium': [...],    # 일반 텍스트
            'large': [...],     # 큰 블록
            'integral': [...]   # 인테그랄 후보
        }
    """
    categorized = {
        'tiny': [],      # w <= 10, h <= 10
        'small': [],     # w <= 30, h <= 20
        'medium': [],    # 일반 크기
        'large': [],     # w > 100 or h > 100
        'integral': []   # aspect < 0.3, h > 30
    }

    for block in blocks:
        w, h = block['w'], block['h']

        # 인테그랄 후보
        if h > 0:
            aspect = w / h
            if aspect < 0.3 and h > 30:
                categorized['integral'].append(block)
                continue

        # 크기별 분류
        if w <= 10 and h <= 10:
            categorized['tiny'].append(block)
        elif w <= 30 and h <= 20:
            categorized['small'].append(block)
        elif w > 100 or h > 100:
            categorized['large'].append(block)
        else:
            categorized['medium'].append(block)

    return categorized


def analyze_threshold_effect():
    """다양한 threshold 값의 효과 분석"""
    print("=" * 80)
    print("작은 기호 검출 연구 - Threshold 효과 분석")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not image_path.exists():
        print(f"[오류] 이미지 없음")
        return

    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    print("1단계: 다양한 threshold 값 테스트")
    print()

    threshold_values = [200, 220, 240, 250]  # 다양한 임계값
    min_sizes = [(2, 2), (5, 5), (10, 10)]   # 다양한 최소 크기

    results = []

    # Global Threshold 테스트
    for thresh in threshold_values:
        for min_w, min_h in min_sizes:
            mask, blocks = detect_blocks_with_params(gray, thresh, min_w, min_h, use_adaptive=False)
            categorized = categorize_blocks(blocks)

            results.append({
                'method': f'Global_T{thresh}_Min{min_w}x{min_h}',
                'threshold': thresh,
                'min_size': (min_w, min_h),
                'adaptive': False,
                'mask': mask,
                'blocks': blocks,
                'categorized': categorized,
                'total': len(blocks),
                'tiny': len(categorized['tiny']),
                'small': len(categorized['small']),
                'medium': len(categorized['medium']),
                'large': len(categorized['large']),
                'integral': len(categorized['integral'])
            })

    # Adaptive Threshold 테스트
    for min_w, min_h in min_sizes:
        mask, blocks = detect_blocks_with_params(gray, 0, min_w, min_h, use_adaptive=True)
        categorized = categorize_blocks(blocks)

        results.append({
            'method': f'Adaptive_Min{min_w}x{min_h}',
            'threshold': 'adaptive',
            'min_size': (min_w, min_h),
            'adaptive': True,
            'mask': mask,
            'blocks': blocks,
            'categorized': categorized,
            'total': len(blocks),
            'tiny': len(categorized['tiny']),
            'small': len(categorized['small']),
            'medium': len(categorized['medium']),
            'large': len(categorized['large']),
            'integral': len(categorized['integral'])
        })

    # 결과 출력
    print(f"{'Method':<30} {'Total':>6} {'Tiny':>6} {'Small':>6} {'Med':>6} {'Large':>6} {'Int':>5}")
    print("-" * 80)

    for r in results:
        print(f"{r['method']:<30} {r['total']:6d} {r['tiny']:6d} {r['small']:6d} "
              f"{r['medium']:6d} {r['large']:6d} {r['integral']:5d}")

    print()

    # 작은 기호 검출에 가장 효과적인 설정 찾기
    print("=" * 80)
    print("작은 기호 검출 분석")
    print("=" * 80)
    print()

    # Tiny 블록 가장 많이 검출한 방법
    best_tiny = max(results, key=lambda r: r['tiny'])
    print(f"[Tiny 기호 최다 검출] {best_tiny['method']}")
    print(f"  - Tiny 블록: {best_tiny['tiny']}개")
    print(f"  - 총 블록: {best_tiny['total']}개")
    print()

    # Small 블록 가장 많이 검출한 방법
    best_small = max(results, key=lambda r: r['small'])
    print(f"[Small 블록 최다 검출] {best_small['method']}")
    print(f"  - Small 블록: {best_small['small']}개")
    print(f"  - 총 블록: {best_small['total']}개")
    print()

    # 균형잡힌 검출 (Tiny + Small이 많으면서 Total은 너무 많지 않음)
    def balance_score(r):
        return (r['tiny'] + r['small']) / max(r['total'], 1) * 1000

    best_balance = max(results, key=balance_score)
    print(f"[균형잡힌 검출] {best_balance['method']}")
    print(f"  - Tiny: {best_balance['tiny']}개")
    print(f"  - Small: {best_balance['small']}개")
    print(f"  - 총 블록: {best_balance['total']}개")
    print(f"  - 균형 점수: {balance_score(best_balance):.1f}")
    print()

    # 시각화: 상위 3개 방법
    output_dir = config.DATASET_ROOT

    top_methods = [
        best_tiny,
        best_small,
        best_balance
    ]

    for r in top_methods:
        vis = image.copy()

        # 카테고리별로 다른 색상
        for block in r['categorized']['tiny']:
            x, y, w, h = block['x'], block['y'], block['w'], block['h']
            cv2.rectangle(vis, (x, y), (x + w, y + h), (255, 0, 255), 1)  # 자주색: Tiny

        for block in r['categorized']['small']:
            x, y, w, h = block['x'], block['y'], block['w'], block['h']
            cv2.rectangle(vis, (x, y), (x + w, y + h), (255, 165, 0), 1)  # 주황색: Small

        for block in r['categorized']['medium']:
            x, y, w, h = block['x'], block['y'], block['w'], block['h']
            cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 255, 0), 1)  # 초록색: Medium

        for block in r['categorized']['large']:
            x, y, w, h = block['x'], block['y'], block['w'], block['h']
            cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 255, 255), 2)  # 노란색: Large

        for block in r['categorized']['integral']:
            x, y, w, h = block['x'], block['y'], block['w'], block['h']
            cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 0, 255), 3)  # 빨간색: Integral

        # 범례 추가
        cv2.putText(vis, f"{r['method']}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 3)
        cv2.putText(vis, f"{r['method']}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 1)

        legend_y = 60
        cv2.putText(vis, f"Tiny(<=10x10): {r['tiny']}", (10, legend_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
        legend_y += 25
        cv2.putText(vis, f"Small(<=30x20): {r['small']}", (10, legend_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 165, 0), 2)
        legend_y += 25
        cv2.putText(vis, f"Medium: {r['medium']}", (10, legend_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        legend_y += 25
        cv2.putText(vis, f"Large: {r['large']}", (10, legend_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        legend_y += 25
        cv2.putText(vis, f"Integral: {r['integral']}", (10, legend_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        filename = f"small_symbols_{r['method']}.png"
        imwrite_unicode(output_dir / filename, vis)
        print(f"[저장] {filename}")

    print()
    print("=" * 80)
    print("시각화 완료")
    print("=" * 80)
    print()
    print(f"저장 위치: {output_dir}")
    print()
    print("생성된 파일:")
    for r in top_methods:
        print(f"  - small_symbols_{r['method']}.png")
    print()

    # 권장 사항
    print("=" * 80)
    print("권장 사항")
    print("=" * 80)
    print()

    if best_balance['adaptive']:
        print("[권장] Adaptive Threshold 사용")
        print(f"  - 최소 크기: {best_balance['min_size'][0]}x{best_balance['min_size'][1]}")
        print(f"  - Tiny 기호 {best_balance['tiny']}개 검출")
        print(f"  - 지역 기반 임계값으로 조명 변화에 강함")
    else:
        print(f"[권장] Global Threshold = {best_balance['threshold']}")
        print(f"  - 최소 크기: {best_balance['min_size'][0]}x{best_balance['min_size'][1]}")
        print(f"  - Tiny 기호 {best_balance['tiny']}개 검출")
        print(f"  - 단순하고 빠름")

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
    analyze_threshold_effect()
