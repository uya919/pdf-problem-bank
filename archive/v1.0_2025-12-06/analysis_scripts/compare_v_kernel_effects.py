"""
v_kernel 30 vs 50 비교 분석

두 설정의 결과를 직접 비교하여 부작용 확인
"""
from pathlib import Path
import sys
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


def test_v_kernel(v_kernel: int):
    """특정 v_kernel로 검출 테스트"""
    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not image_path.exists():
        print(f"[오류] 이미지 없음: {image_path}")
        return None

    # 이미지 로드
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    # 모폴로지 연산
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    v_kernel_elem = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_kernel))

    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel_elem)

    # 연결 요소 분석
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        v_closed, connectivity=8
    )

    # 세로로 긴 블록 찾기
    vertical_blocks = []
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        if h > 0:
            aspect = w / h
            # vertical_tall 필터 조건
            if aspect < 0.5 and h >= 10 and w <= 30 and h <= 200:
                vertical_blocks.append({
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h,
                    'aspect': aspect,
                    'area': area
                })

    vertical_blocks.sort(key=lambda b: b['aspect'])

    return {
        'total_components': num_labels - 1,
        'vertical_blocks': vertical_blocks,
        'vertical_count': len(vertical_blocks),
        'mask': v_closed
    }


def compare_results():
    """v_kernel 30 vs 50 비교"""
    print("=" * 80)
    print("v_kernel 30 vs 50 비교 분석")
    print("=" * 80)
    print()

    # 두 설정으로 테스트
    print("v_kernel=30으로 검출 중...")
    result_30 = test_v_kernel(30)

    print("v_kernel=50으로 검출 중...")
    result_50 = test_v_kernel(50)

    if not result_30 or not result_50:
        print("[오류] 테스트 실패")
        return

    print()
    print("=" * 80)
    print("검출 결과 비교")
    print("=" * 80)
    print()

    print(f"{'항목':<30} {'v=30':>15} {'v=50':>15} {'차이':>15}")
    print("-" * 80)

    # 총 연결 요소
    total_30 = result_30['total_components']
    total_50 = result_50['total_components']
    diff_total = total_50 - total_30
    print(f"{'총 연결 요소 (전체)':<30} {total_30:>15} {total_50:>15} {diff_total:>15}")

    # 세로 블록
    vertical_30 = result_30['vertical_count']
    vertical_50 = result_50['vertical_count']
    diff_vertical = vertical_50 - vertical_30
    print(f"{'세로 블록 (필터 후)':<30} {vertical_30:>15} {vertical_50:>15} {diff_vertical:>15}")

    # 인테그랄 후보 (aspect < 0.2)
    integral_30 = len([b for b in result_30['vertical_blocks'] if b['aspect'] < 0.2])
    integral_50 = len([b for b in result_50['vertical_blocks'] if b['aspect'] < 0.2])
    diff_integral = integral_50 - integral_30
    print(f"{'인테그랄 후보 (aspect<0.2)':<30} {integral_30:>15} {integral_50:>15} {diff_integral:>15}")

    print()

    # 크기 분포 비교
    print("=" * 80)
    print("인테그랄 후보 크기 분포")
    print("=" * 80)
    print()

    integral_blocks_30 = [b for b in result_30['vertical_blocks'] if b['aspect'] < 0.2]
    integral_blocks_50 = [b for b in result_50['vertical_blocks'] if b['aspect'] < 0.2]

    if integral_blocks_30:
        heights_30 = [b['h'] for b in integral_blocks_30]
        print(f"v=30:")
        print(f"  높이 범위: {min(heights_30)} ~ {max(heights_30)}px")
        print(f"  평균 높이: {sum(heights_30)/len(heights_30):.1f}px")
        print()

    if integral_blocks_50:
        heights_50 = [b['h'] for b in integral_blocks_50]
        print(f"v=50:")
        print(f"  높이 범위: {min(heights_50)} ~ {max(heights_50)}px")
        print(f"  평균 높이: {sum(heights_50)/len(heights_50):.1f}px")
        print()

    # 상위 10개 인테그랄 비교
    print("=" * 80)
    print("가장 세로로 긴 인테그랄 TOP 10 비교")
    print("=" * 80)
    print()

    print("v=30:")
    print(f"  {'Width':>6} {'Height':>7} {'Aspect':>8}")
    print("  " + "-" * 25)
    for b in integral_blocks_30[:10]:
        print(f"  {b['w']:6d} {b['h']:7d} {b['aspect']:8.3f}")

    print()
    print("v=50:")
    print(f"  {'Width':>6} {'Height':>7} {'Aspect':>8}")
    print("  " + "-" * 25)
    for b in integral_blocks_50[:10]:
        print(f"  {b['w']:6d} {b['h']:7d} {b['aspect']:8.3f}")

    print()

    # 결론
    print("=" * 80)
    print("결론")
    print("=" * 80)
    print()

    if diff_vertical < 0:
        print(f"[경고] v=50으로 증가 시 세로 블록 {abs(diff_vertical)}개 감소!")
        print("       → v_kernel이 너무 크면 작은 세로 블록들이 병합/소실됨")
        print()

    if diff_integral > 0:
        print(f"[긍정] v=50으로 인테그랄 후보 {diff_integral}개 증가")
        print()
    elif diff_integral < 0:
        print(f"[부정] v=50으로 인테그랄 후보 {abs(diff_integral)}개 감소")
        print()

    if integral_blocks_50 and integral_blocks_30:
        max_h_30 = max(b['h'] for b in integral_blocks_30)
        max_h_50 = max(b['h'] for b in integral_blocks_50)

        if max_h_50 > max_h_30:
            print(f"[긍정] v=50으로 최대 인테그랄 높이 증가: {max_h_30}px → {max_h_50}px")
            print()

    # 권장 사항
    print("=" * 80)
    print("권장 사항")
    print("=" * 80)
    print()

    if diff_vertical < -5:  # 5개 이상 감소
        print("v_kernel=50은 과도함")
        print("  → 권장: v_kernel=35 (중간값) 시도")
        print()
    elif diff_integral > 2:  # 2개 이상 증가
        print("v_kernel=50이 인테그랄 검출에 효과적")
        print("  → 하지만 부작용 확인 필요")
        print()
    else:
        print("v_kernel=30과 v_kernel=50의 차이가 미미함")
        print("  → 현재 설정 유지 권장")
        print()

    print("=" * 80)


if __name__ == "__main__":
    compare_results()
