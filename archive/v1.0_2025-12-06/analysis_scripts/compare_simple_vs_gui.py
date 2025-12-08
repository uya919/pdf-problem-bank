"""
테스트 스크립트(915개) vs GUI(1413개) 비교 분석

마음에 드는 버전(915개)과 GUI 버전의 차이 원인 분석
"""
from pathlib import Path
import sys
import cv2
import numpy as np
import json

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config


def imread_unicode(path: Path) -> np.ndarray:
    """한글 경로 이미지 읽기"""
    with open(path, 'rb') as f:
        arr = np.frombuffer(f.read(), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def analyze_simple_method(gray: np.ndarray) -> dict:
    """테스트 스크립트 방식 분석 (단순, 915개)"""
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w >= 2 and h >= 2:
            blocks.append({
                'x': x, 'y': y, 'w': w, 'h': h, 'area': area
            })

    # 크기별 분류
    tiny = [b for b in blocks if b['w'] <= 10 and b['h'] <= 10]
    small = [b for b in blocks if 10 < max(b['w'], b['h']) <= 30]
    medium = [b for b in blocks if 30 < max(b['w'], b['h']) <= 100]
    large = [b for b in blocks if max(b['w'], b['h']) > 100]

    return {
        'method': 'Simple (Test Script)',
        'total': len(blocks),
        'tiny': len(tiny),
        'small': len(small),
        'medium': len(medium),
        'large': len(large),
        'blocks': blocks
    }


def analyze_gui_method(json_path: Path) -> dict:
    """GUI 방식 분석 (MultiscaleAnalyzer, 1413개)"""
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']

    # 크기별 분류
    tiny = []
    small = []
    medium = []
    large = []

    for b in blocks:
        bbox = b['bbox']
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]

        if w <= 10 and h <= 10:
            tiny.append(b)
        elif max(w, h) <= 30:
            small.append(b)
        elif max(w, h) <= 100:
            medium.append(b)
        else:
            large.append(b)

    return {
        'method': 'GUI (MultiscaleAnalyzer)',
        'total': len(blocks),
        'tiny': len(tiny),
        'small': len(small),
        'medium': len(medium),
        'large': len(large),
        'blocks': blocks
    }


def main():
    """비교 분석"""
    print("=" * 80)
    print("테스트 스크립트(915개) vs GUI(1413개) 비교")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "pages" / "page_0000.png"
    json_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "blocks" / "page_0000_blocks.json"

    if not image_path.exists() or not json_path.exists():
        print(f"[오류] 파일 없음")
        return

    # 이미지 로드
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # 1. 테스트 스크립트 방식
    simple_result = analyze_simple_method(gray)

    # 2. GUI 방식
    gui_result = analyze_gui_method(json_path)

    # 비교 출력
    print(f"{'Method':<30} {'Total':>7} {'Tiny':>7} {'Small':>7} {'Medium':>7} {'Large':>7}")
    print("=" * 80)

    for result in [simple_result, gui_result]:
        print(f"{result['method']:<30} {result['total']:7d} {result['tiny']:7d} "
              f"{result['small']:7d} {result['medium']:7d} {result['large']:7d}")

    print()
    print("=" * 80)
    print("차이 분석")
    print("=" * 80)
    print()

    diff_total = gui_result['total'] - simple_result['total']
    diff_tiny = gui_result['tiny'] - simple_result['tiny']
    diff_small = gui_result['small'] - simple_result['small']
    diff_medium = gui_result['medium'] - simple_result['medium']
    diff_large = gui_result['large'] - simple_result['large']

    pct_total = diff_total/simple_result['total']*100
    pct_tiny = diff_tiny/simple_result['tiny']*100 if simple_result['tiny'] > 0 else 0
    pct_small = diff_small/simple_result['small']*100 if simple_result['small'] > 0 else 0
    pct_medium = diff_medium/simple_result['medium']*100 if simple_result['medium'] > 0 else 0
    pct_large = diff_large/simple_result['large']*100 if simple_result['large'] > 0 else 0

    print(f"총 블록:    {diff_total:+5d} ({pct_total:+.1f}%)")
    print(f"Tiny:       {diff_tiny:+5d} ({pct_tiny:+.1f}%)")
    print(f"Small:      {diff_small:+5d} ({pct_small:+.1f}%)")
    print(f"Medium:     {diff_medium:+5d} ({pct_medium:+.1f}%)")
    print(f"Large:      {diff_large:+5d} ({pct_large:+.1f}%)")
    print()

    # 원인 분석
    print("=" * 80)
    print("원인 분석")
    print("=" * 80)
    print()

    if diff_total > 400:
        print("[문제] GUI가 과도하게 검출 (+498개, +54%)")
        print()
        print("[가능한 원인]")
        print()

        if diff_tiny > 300:
            print("1. Tiny 블록 과다 검출")
            print(f"   - Simple: {simple_result['tiny']}개")
            print(f"   - GUI:    {gui_result['tiny']}개")
            print(f"   - 차이:   +{diff_tiny}개")
            print()

        if diff_small > 100:
            print("2. Small 블록 과다 검출")
            print(f"   - Simple: {simple_result['small']}개")
            print(f"   - GUI:    {gui_result['small']}개")
            print(f"   - 차이:   +{diff_small}개")
            print()

        print("3. MultiscaleAnalyzer가 중복 생성")
        print("   - 6개 스케일에서 각각 검출")
        print("   - NMS IoU=0.80이 너무 느슨함")
        print("   - 작은 블록들이 충분히 제거 안됨")
        print()

        print("[해결 방안]")
        print()
        print("옵션 1: GUI에서 MultiscaleAnalyzer 대신 단순 방식 사용")
        print("  - use_multiscale=False")
        print("  - 테스트 스크립트와 동일한 결과")
        print()

        print("옵션 2: NMS IoU threshold 낮추기")
        print("  - 0.80 -> 0.50")
        print("  - 중복 제거 강화")
        print()

        print("옵션 3: tiny_symbols 스케일 제거 또는 min_size 증가")
        print("  - min_size: 4 -> 10")
        print("  - Tiny 블록 감소")
        print()

        print("옵션 4: 단순 방식 + 인테그랄 병합만 사용")
        print("  - 테스트 스크립트 + Distance Transform")
        print("  - 915개 + 인테그랄 검출")

    print()
    print("=" * 80)
    print("권장 사항")
    print("=" * 80)
    print()

    print("[권장] 옵션 4 - 단순 방식 + 인테그랄 병합")
    print()
    print("이유:")
    print("  - 테스트 스크립트(915개)가 마음에 듦")
    print("  - 단순하고 명확함")
    print("  - MultiscaleAnalyzer는 과도하게 복잡")
    print()
    print("구현:")
    print("  1. DensityAnalyzer에서 use_multiscale=False")
    print("  2. 단순 Connected Components 사용")
    print("  3. 인테그랄 후보만 Distance Transform으로 확장")
    print()

    print("=" * 80)


if __name__ == "__main__":
    main()
