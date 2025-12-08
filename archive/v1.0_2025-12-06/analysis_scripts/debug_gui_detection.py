"""
GUI 블록 검출 디버깅

테스트 스크립트(915개)와 GUI(693개)의 차이 원인 분석
"""
from pathlib import Path
import sys
import cv2
import numpy as np

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from density_analyzer import DensityAnalyzer


def imread_unicode(path: Path) -> np.ndarray:
    """한글 경로 이미지 읽기"""
    with open(path, 'rb') as f:
        arr = np.frombuffer(f.read(), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def test_simple_detection(gray: np.ndarray) -> int:
    """테스트 스크립트 방식: 단순 검출"""
    _, mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )

    count = 0
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w >= 2 and h >= 2:
            count += 1

    return count


def test_gui_detection(image: np.ndarray) -> tuple:
    """GUI 방식: DensityAnalyzer 사용"""
    config = Config.load()
    analyzer = DensityAnalyzer(config, use_projection=False, use_multiscale=True)

    blocks = analyzer.analyze_page(image)

    return len(blocks), blocks


def debug_multiscale_process():
    """MultiscaleAnalyzer 각 단계별 블록 수 추적"""
    print("=" * 80)
    print("GUI 블록 검출 디버깅 - 단계별 분석")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "pages" / "page_0000.png"

    if not image_path.exists():
        print(f"[오류] 이미지 없음: {image_path}")
        return

    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = image.shape[:2]

    print(f"이미지 크기: {width}x{height}")
    print()

    # 1단계: 테스트 스크립트 방식 (기준)
    print("=" * 80)
    print("1단계: 테스트 스크립트 방식 (Global T=200, Min 2x2)")
    print("=" * 80)
    simple_count = test_simple_detection(gray)
    print(f"검출 블록: {simple_count}개")
    print()

    # 2단계: GUI 방식 (DensityAnalyzer + MultiscaleAnalyzer)
    print("=" * 80)
    print("2단계: GUI 방식 (DensityAnalyzer + MultiscaleAnalyzer)")
    print("=" * 80)
    print()

    # GUI 검출 실행 (로그 출력됨)
    gui_count, gui_blocks = test_gui_detection(image)

    print()
    print(f"최종 블록: {gui_count}개")
    print()

    # 3단계: 차이 분석
    print("=" * 80)
    print("차이 분석")
    print("=" * 80)
    print()

    difference = simple_count - gui_count
    print(f"테스트 스크립트: {simple_count}개")
    print(f"GUI (최종):      {gui_count}개")
    print(f"차이:            {difference}개 ({difference/simple_count*100:.1f}%)")
    print()

    # 4단계: 필터링 분석
    print("=" * 80)
    print("필터링 원인 분석")
    print("=" * 80)
    print()

    print("가능한 원인:")
    print("1. NMS (Non-Maximum Suppression)")
    print("   - IoU >= 0.65인 블록들을 중복 제거")
    print("   - 작은 블록들이 큰 블록에 흡수됨")
    print()

    print("2. DensityAnalyzer 필터링")
    print("   - 거대 블록 필터: area > page_area * 0.20")
    print("   - Aspect ratio 필터: 0.01 < aspect < 30")
    print("   - 밀집도 필터: density >= 0.05")
    print()

    print("3. MultiscaleAnalyzer min_size 필터")
    print("   - large: min_size=400")
    print("   - medium: min_size=250")
    print("   - small: min_size=150")
    print("   - ultra_small: min_size=50")
    print("   - tiny_symbols: min_size=4")
    print("   - vertical_tall: min_size=100")
    print()

    # 5단계: 블록 크기 분포 분석
    print("=" * 80)
    print("GUI 검출 블록 크기 분포")
    print("=" * 80)
    print()

    tiny = sum(1 for b in gui_blocks if b.width <= 10 and b.height <= 10)
    small = sum(1 for b in gui_blocks if 10 < max(b.width, b.height) <= 30)
    medium = sum(1 for b in gui_blocks if 30 < max(b.width, b.height) <= 100)
    large = sum(1 for b in gui_blocks if max(b.width, b.height) > 100)

    print(f"Tiny (<=10x10):     {tiny}개")
    print(f"Small (10~30):      {small}개")
    print(f"Medium (30~100):    {medium}개")
    print(f"Large (>100):       {large}개")
    print()

    # 6단계: 권장 사항
    print("=" * 80)
    print("원인 추정 및 권장 사항")
    print("=" * 80)
    print()

    if difference > 200:
        print("[추정 원인]")
        print("1. NMS가 작은 블록들을 대량 제거")
        print("   - Tiny 기호들(-, =, 지수)이 근처 블록에 흡수됨")
        print()
        print("2. MultiscaleAnalyzer의 min_size 필터")
        print("   - tiny_symbols (min_size=4)가 너무 커서")
        print("   - 2x2, 3x3 블록들이 걸러짐")
        print()
        print("[해결 방안]")
        print("1. NMS IoU 임계값 높이기 (0.65 -> 0.80)")
        print("   - 겹침이 더 많을 때만 제거")
        print()
        print("2. tiny_symbols min_size 낮추기 (4 -> 2)")
        print("   - 2x2 블록도 검출")
        print()
        print("3. NMS에서 Tiny 블록 보호")
        print("   - 작은 블록은 NMS 제외")

    print()
    print("=" * 80)


if __name__ == "__main__":
    debug_multiscale_process()
