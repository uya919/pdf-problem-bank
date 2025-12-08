"""
v_kernel 30 vs 35 vs 50 세 가지 값 비교 분석

최적의 v_kernel 값을 찾기 위한 종합 비교
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


def compare_three_kernels():
    """v_kernel 30 vs 35 vs 50 비교"""
    print("=" * 80)
    print("v_kernel 30 vs 35 vs 50 종합 비교 분석")
    print("=" * 80)
    print()

    # 세 설정으로 테스트
    print("v_kernel=30으로 검출 중...")
    result_30 = test_v_kernel(30)

    print("v_kernel=35으로 검출 중...")
    result_35 = test_v_kernel(35)

    print("v_kernel=50으로 검출 중...")
    result_50 = test_v_kernel(50)

    if not result_30 or not result_35 or not result_50:
        print("[오류] 테스트 실패")
        return

    print()
    print("=" * 80)
    print("검출 결과 비교")
    print("=" * 80)
    print()

    print(f"{'항목':<30} {'v=30':>15} {'v=35':>15} {'v=50':>15}")
    print("-" * 85)

    # 총 연결 요소
    total_30 = result_30['total_components']
    total_35 = result_35['total_components']
    total_50 = result_50['total_components']
    print(f"{'총 연결 요소 (전체)':<30} {total_30:>15} {total_35:>15} {total_50:>15}")

    # 세로 블록
    vertical_30 = result_30['vertical_count']
    vertical_35 = result_35['vertical_count']
    vertical_50 = result_50['vertical_count']
    print(f"{'세로 블록 (필터 후)':<30} {vertical_30:>15} {vertical_35:>15} {vertical_50:>15}")

    # 인테그랄 후보 (aspect < 0.2)
    integral_30 = len([b for b in result_30['vertical_blocks'] if b['aspect'] < 0.2])
    integral_35 = len([b for b in result_35['vertical_blocks'] if b['aspect'] < 0.2])
    integral_50 = len([b for b in result_50['vertical_blocks'] if b['aspect'] < 0.2])
    print(f"{'인테그랄 후보 (aspect<0.2)':<30} {integral_30:>15} {integral_35:>15} {integral_50:>15}")

    print()

    # 변화율 계산 (v=30 기준)
    print("=" * 80)
    print("v=30 대비 변화율")
    print("=" * 80)
    print()

    total_change_35 = ((total_35 - total_30) / total_30 * 100) if total_30 > 0 else 0
    total_change_50 = ((total_50 - total_30) / total_30 * 100) if total_30 > 0 else 0

    vertical_change_35 = ((vertical_35 - vertical_30) / vertical_30 * 100) if vertical_30 > 0 else 0
    vertical_change_50 = ((vertical_50 - vertical_30) / vertical_30 * 100) if vertical_30 > 0 else 0

    integral_change_35 = ((integral_35 - integral_30) / integral_30 * 100) if integral_30 > 0 else 0
    integral_change_50 = ((integral_50 - integral_30) / integral_30 * 100) if integral_30 > 0 else 0

    print(f"{'항목':<30} {'v=35 변화율':>20} {'v=50 변화율':>20}")
    print("-" * 85)
    print(f"{'총 연결 요소':<30} {total_change_35:>18.1f}% {total_change_50:>18.1f}%")
    print(f"{'세로 블록':<30} {vertical_change_35:>18.1f}% {vertical_change_50:>18.1f}%")
    print(f"{'인테그랄 후보':<30} {integral_change_35:>18.1f}% {integral_change_50:>18.1f}%")

    print()

    # 인테그랄 후보 크기 분포
    print("=" * 80)
    print("인테그랄 후보 크기 분포 비교")
    print("=" * 80)
    print()

    integral_blocks_30 = [b for b in result_30['vertical_blocks'] if b['aspect'] < 0.2]
    integral_blocks_35 = [b for b in result_35['vertical_blocks'] if b['aspect'] < 0.2]
    integral_blocks_50 = [b for b in result_50['vertical_blocks'] if b['aspect'] < 0.2]

    for v_val, blocks, label in [(30, integral_blocks_30, "v=30"),
                                   (35, integral_blocks_35, "v=35"),
                                   (50, integral_blocks_50, "v=50")]:
        if blocks:
            heights = [b['h'] for b in blocks]
            widths = [b['w'] for b in blocks]
            print(f"{label}:")
            print(f"  개수: {len(blocks)}개")
            print(f"  높이 범위: {min(heights)} ~ {max(heights)}px")
            print(f"  평균 높이: {sum(heights)/len(heights):.1f}px")
            print(f"  너비 범위: {min(widths)} ~ {max(widths)}px")
            print(f"  평균 너비: {sum(widths)/len(widths):.1f}px")
            print()

    # 상위 10개 인테그랄 비교
    print("=" * 80)
    print("가장 세로로 긴 인테그랄 TOP 10 비교")
    print("=" * 80)
    print()

    for v_val, blocks, label in [(30, integral_blocks_30, "v=30"),
                                   (35, integral_blocks_35, "v=35"),
                                   (50, integral_blocks_50, "v=50")]:
        print(f"{label}:")
        print(f"  {'Width':>6} {'Height':>7} {'Aspect':>8}")
        print("  " + "-" * 25)
        for b in blocks[:10]:
            print(f"  {b['w']:6d} {b['h']:7d} {b['aspect']:8.3f}")
        print()

    # 결론
    print("=" * 80)
    print("종합 결론")
    print("=" * 80)
    print()

    # v=35 평가
    if abs(vertical_change_35) <= 10:
        print("[v=35 평가]")
        print(f"  세로 블록 변화: {vertical_change_35:+.1f}% (±10% 이내 - 안정적)")
        if abs(integral_change_35) <= 15:
            print(f"  인테그랄 후보 변화: {integral_change_35:+.1f}% (±15% 이내 - 양호)")
            print("  -> v=35는 안정적이며 부작용이 거의 없음 [OK]")
        else:
            print(f"  인테그랄 후보 변화: {integral_change_35:+.1f}% (±15% 초과)")
            if integral_change_35 > 0:
                print("  -> 인테그랄 검출 개선됨")
            else:
                print("  -> 인테그랄 검출 저하")
        print()
    else:
        print("[v=35 평가]")
        print(f"  세로 블록 변화: {vertical_change_35:+.1f}% (±10% 초과)")
        if vertical_change_35 < -10:
            print("  -> 과도한 병합 발생 (부작용)")
        else:
            print("  -> 블록 증가 (검출 개선 가능성)")
        print()

    # v=50 평가
    print("[v=50 평가]")
    print(f"  세로 블록 변화: {vertical_change_50:+.1f}%")
    print(f"  인테그랄 후보 변화: {integral_change_50:+.1f}%")
    if vertical_change_50 < -20:
        print("  -> 과도한 병합으로 인한 심각한 부작용 [X]")
    elif vertical_change_50 < -10:
        print("  -> 병합 부작용 존재")
    print()

    # 권장 사항
    print("=" * 80)
    print("최종 권장 사항")
    print("=" * 80)
    print()

    if abs(vertical_change_35) <= 10 and integral_35 >= integral_30:
        print("[OK] v_kernel=35 권장")
        print("  이유:")
        print("    - 세로 블록 수 안정적 유지")
        print(f"    - 인테그랄 후보 {integral_35}개 (v=30: {integral_30}개)")
        print("    - 부작용 거의 없음")
    elif integral_30 >= integral_35 and integral_30 >= integral_50:
        print("[OK] v_kernel=30 권장")
        print("  이유:")
        print(f"    - 인테그랄 후보 {integral_30}개로 가장 많음")
        print("    - 증가시켜도 개선 없거나 오히려 감소")
    else:
        print("[?] 추가 분석 필요")
        print("  현재 결과만으로는 최적값 판단 어려움")

    print()
    print("=" * 80)


if __name__ == "__main__":
    compare_three_kernels()
