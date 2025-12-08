"""
89개 과소 검출 진단

테스트 스크립트(915개) vs GUI(89개) 차이 원인 분석
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
from density_analyzer import DensityAnalyzer


def imread_unicode(path: Path) -> np.ndarray:
    """한글 경로 이미지 읽기"""
    with open(path, 'rb') as f:
        arr = np.frombuffer(f.read(), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def test_step_by_step():
    """각 단계별 블록 수 추적"""
    print("=" * 80)
    print("89개 과소 검출 진단 - 단계별 추적")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "pages" / "page_0000.png"
    json_path = config.DOCUMENTS_DIR / "베이직쎈 수학2 2022_본문" / "blocks" / "page_0000_blocks.json"

    if not image_path.exists():
        print(f"[오류] 이미지 없음")
        return

    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = image.shape[:2]
    page_area = width * height

    print(f"이미지 크기: {width}x{height} (page_area={page_area})")
    print()

    # Step 1: Threshold
    print("=" * 80)
    print("Step 1: Threshold 적용")
    print("=" * 80)
    print()

    print(f"WHITE_THRESHOLD = {config.WHITE_THRESHOLD}")
    _, mask = cv2.threshold(gray, config.WHITE_THRESHOLD, 255, cv2.THRESH_BINARY_INV)
    print(f"검은 픽셀 수: {np.sum(mask > 0)}")
    print()

    # Step 2: Connected Components
    print("=" * 80)
    print("Step 2: Connected Components")
    print("=" * 80)
    print()

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        mask, connectivity=8
    )
    print(f"총 컴포넌트: {num_labels - 1}개 (배경 제외)")
    print()

    # Step 3: Min Size Filter
    print("=" * 80)
    print("Step 3: Min Size Filter (MIN_BLOCK_SIZE)")
    print("=" * 80)
    print()

    print(f"MIN_BLOCK_SIZE = {config.MIN_BLOCK_SIZE}")

    before_filter = 0
    after_filter = 0

    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        before_filter += 1

        if w >= config.MIN_BLOCK_SIZE and h >= config.MIN_BLOCK_SIZE:
            after_filter += 1

    print(f"필터 전: {before_filter}개")
    print(f"필터 후: {after_filter}개")
    print(f"제거됨: {before_filter - after_filter}개")
    print()

    # Step 4: DensityAnalyzer 실행
    print("=" * 80)
    print("Step 4: DensityAnalyzer.analyze_page() 실행")
    print("=" * 80)
    print()

    analyzer = DensityAnalyzer(config, use_projection=False, use_multiscale=False)
    blocks = analyzer.analyze_page(image)

    print(f"최종 블록 수: {len(blocks)}개")
    print()

    # Step 5: GUI JSON 확인
    if json_path.exists():
        print("=" * 80)
        print("Step 5: GUI에 저장된 JSON")
        print("=" * 80)
        print()

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print(f"JSON 블록 수: {len(data['blocks'])}개")
        print()

    # Step 6: 필터링 원인 분석
    print("=" * 80)
    print("Step 6: 필터링 원인 분석")
    print("=" * 80)
    print()

    # DensityAnalyzer 내부 필터링 추적
    print("[DensityAnalyzer 필터링]")
    print()

    filtered_large = 0
    filtered_aspect = 0
    filtered_density = 0
    passed = 0

    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]

        if w < config.MIN_BLOCK_SIZE or h < config.MIN_BLOCK_SIZE:
            continue

        # 거대 블록 필터
        if area > page_area * 0.20:
            filtered_large += 1
            continue

        # Aspect ratio 필터
        if h > 0:
            aspect_ratio = w / h
            if aspect_ratio < 0.01 or aspect_ratio > 30:
                filtered_aspect += 1
                continue

        # 밀집도 필터
        bbox_mask = mask[y:y+h, x:x+w]
        if bbox_mask.size > 0:
            density = np.sum(bbox_mask > 0) / bbox_mask.size
            if density < 0.05:
                filtered_density += 1
                continue

        passed += 1

    print(f"1. 거대 블록 필터 (area > {page_area * 0.20:.0f}): {filtered_large}개 제거")
    print(f"2. Aspect ratio 필터 (0.01~30): {filtered_aspect}개 제거")
    print(f"3. 밀집도 필터 (>= 0.05): {filtered_density}개 제거")
    print(f"4. 통과: {passed}개")
    print()

    # Step 7: 테스트 스크립트와 비교
    print("=" * 80)
    print("Step 7: 테스트 스크립트 방식 (915개)")
    print("=" * 80)
    print()

    simple_count = 0
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if w >= 2 and h >= 2:
            simple_count += 1

    print(f"테스트 스크립트 (단순 방식): {simple_count}개")
    print(f"GUI (DensityAnalyzer):        {len(blocks)}개")
    print(f"차이:                         {simple_count - len(blocks)}개")
    print()

    # Step 8: 문제 진단
    print("=" * 80)
    print("Step 8: 문제 진단")
    print("=" * 80)
    print()

    if len(blocks) < 100:
        print("[심각한 과소 검출]")
        print()
        print("가능한 원인:")
        print()

        if filtered_density > 500:
            print(f"1. 밀집도 필터가 너무 엄격 ({filtered_density}개 제거)")
            print("   - density >= 0.05 조건")
            print("   - 작은 기호들이 대부분 제거됨")
            print()

        if filtered_aspect > 200:
            print(f"2. Aspect ratio 필터 문제 ({filtered_aspect}개 제거)")
            print("   - aspect < 0.01 or > 30 조건")
            print()

        if filtered_large > 10:
            print(f"3. 거대 블록 필터 ({filtered_large}개 제거)")
            print()

        print("[해결 방안]")
        print()
        print("옵션 1: 밀집도 필터 완화")
        print("  - 0.05 -> 0.01")
        print()
        print("옵션 2: 밀집도 필터 제거")
        print("  - 테스트 스크립트에는 없음")
        print()
        print("옵션 3: DensityAnalyzer 필터링 모두 제거")
        print("  - 단순 Connected Components만 사용")
        print("  - 테스트 스크립트와 동일하게")

    print()
    print("=" * 80)


if __name__ == "__main__":
    test_step_by_step()
