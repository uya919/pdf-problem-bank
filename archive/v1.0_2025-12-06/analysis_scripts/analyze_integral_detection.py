"""
인테그랄 검출 문제 심층 분석

사용자 보고: 인테그랄 기호가 여전히 일부분만 검출됨
목표: 왜 vertical_tall 스케일이 제대로 작동하지 않는지 분석
"""
from pathlib import Path
import sys
import json

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config


def analyze_blocks_for_integral():
    """
    블록 검출 결과에서 인테그랄 관련 블록 분석
    """
    print("=" * 80)
    print("인테그랄 검출 문제 심층 분석")
    print("=" * 80)
    print()

    config = Config.load()
    json_path = config.DOCUMENTS_DIR / "test" / "blocks" / "page_0000_blocks.json"

    if not json_path.exists():
        print(f"[오류] JSON 파일 없음: {json_path}")
        return

    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']
    print(f"총 블록 수: {len(blocks)}")
    print()

    # 1. 세로로 긴 블록 찾기 (인테그랄 후보)
    print("=" * 80)
    print("1. 세로로 긴 블록 분석 (aspect ratio < 0.5)")
    print("=" * 80)

    vertical_blocks = []
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        width = x_max - x_min
        height = y_max - y_min

        if height > 0:
            aspect_ratio = width / height

            # 세로로 긴 블록 (aspect ratio < 0.5)
            if aspect_ratio < 0.5:
                vertical_blocks.append({
                    'block_id': block['block_id'],
                    'column': block['column'],
                    'bbox': bbox,
                    'width': width,
                    'height': height,
                    'aspect_ratio': aspect_ratio,
                    'density': block.get('pixel_density', 0)
                })

    print(f"세로로 긴 블록 (aspect < 0.5): {len(vertical_blocks)}개")
    print()

    # aspect ratio 기준 정렬 (가장 세로로 긴 것부터)
    vertical_blocks.sort(key=lambda b: b['aspect_ratio'])

    # 상위 20개 출력
    print("가장 세로로 긴 블록 TOP 20:")
    print(f"{'ID':>4} {'Column':>6} {'Width':>6} {'Height':>7} {'Aspect':>8} {'Density':>8} {'BBox'}")
    print("-" * 80)

    for i, block in enumerate(vertical_blocks[:20]):
        print(f"{block['block_id']:4d} {block['column']:>6} "
              f"{block['width']:6d} {block['height']:7d} "
              f"{block['aspect_ratio']:8.3f} {block['density']:8.3f} "
              f"{block['bbox']}")

    print()

    # 2. 매우 세로로 긴 블록 (aspect < 0.2, 인테그랄 가능성 높음)
    print("=" * 80)
    print("2. 매우 세로로 긴 블록 (aspect < 0.2, 인테그랄 가능성 높음)")
    print("=" * 80)

    integral_candidates = [b for b in vertical_blocks if b['aspect_ratio'] < 0.2]
    print(f"인테그랄 후보 (aspect < 0.2): {len(integral_candidates)}개")
    print()

    # 위치별 그룹핑 (Y 좌표 기준)
    print("위치별 분포 (Y 좌표 기준):")
    print(f"{'ID':>4} {'Column':>6} {'Y_min':>6} {'Y_max':>7} {'Width':>6} {'Height':>7} {'Aspect':>8}")
    print("-" * 80)

    for block in integral_candidates:
        y_min = block['bbox'][1]
        y_max = block['bbox'][3]
        print(f"{block['block_id']:4d} {block['column']:>6} "
              f"{y_min:6d} {y_max:7d} "
              f"{block['width']:6d} {block['height']:7d} "
              f"{block['aspect_ratio']:8.3f}")

    print()

    # 3. vertical_tall 스케일이 검출했어야 할 블록 분석
    print("=" * 80)
    print("3. vertical_tall 필터 조건 분석")
    print("=" * 80)
    print("현재 vertical_tall 필터 조건:")
    print("  - aspect_ratio < 0.5")
    print("  - height >= 40")
    print("  - width <= 30")
    print("  - height <= 200")
    print()

    # 필터 조건별 통과/실패 분석
    filter_pass = []
    filter_fail_aspect = []
    filter_fail_height_low = []
    filter_fail_width = []
    filter_fail_height_high = []

    for block in vertical_blocks:
        aspect_ok = block['aspect_ratio'] < 0.5
        height_low_ok = block['height'] >= 40
        width_ok = block['width'] <= 30
        height_high_ok = block['height'] <= 200

        if aspect_ok and height_low_ok and width_ok and height_high_ok:
            filter_pass.append(block)
        else:
            if not aspect_ok:
                filter_fail_aspect.append(block)
            if not height_low_ok:
                filter_fail_height_low.append(block)
            if not width_ok:
                filter_fail_width.append(block)
            if not height_high_ok:
                filter_fail_height_high.append(block)

    print(f"필터 통과: {len(filter_pass)}개")
    print(f"필터 실패 (aspect >= 0.5): {len(filter_fail_aspect)}개")
    print(f"필터 실패 (height < 40): {len(filter_fail_height_low)}개")
    print(f"필터 실패 (width > 30): {len(filter_fail_width)}개")
    print(f"필터 실패 (height > 200): {len(filter_fail_height_high)}개")
    print()

    # 필터 통과 블록 상세 출력
    if filter_pass:
        print("필터 통과 블록 (vertical_tall이 유지했어야 할 블록):")
        print(f"{'ID':>4} {'Column':>6} {'Width':>6} {'Height':>7} {'Aspect':>8} {'BBox'}")
        print("-" * 80)
        for block in filter_pass:
            print(f"{block['block_id']:4d} {block['column']:>6} "
                  f"{block['width']:6d} {block['height']:7d} "
                  f"{block['aspect_ratio']:8.3f} "
                  f"{block['bbox']}")
        print()

    # width > 30으로 실패한 블록 중 인테그랄일 가능성
    if filter_fail_width:
        print("Width 조건 실패 블록 (width > 30, 인테그랄일 가능성):")
        print(f"{'ID':>4} {'Column':>6} {'Width':>6} {'Height':>7} {'Aspect':>8}")
        print("-" * 80)
        for block in sorted(filter_fail_width, key=lambda b: b['aspect_ratio'])[:10]:
            print(f"{block['block_id']:4d} {block['column']:>6} "
                  f"{block['width']:6d} {block['height']:7d} "
                  f"{block['aspect_ratio']:8.3f}")
        print()

    # 4. 핵심 문제 진단
    print("=" * 80)
    print("4. 핵심 문제 진단")
    print("=" * 80)
    print()

    # 인테그랄 후보 블록의 크기 분포
    if integral_candidates:
        widths = [b['width'] for b in integral_candidates]
        heights = [b['height'] for b in integral_candidates]

        print("인테그랄 후보 블록 크기 분포:")
        print(f"  Width 범위: {min(widths)} ~ {max(widths)} (평균: {sum(widths)/len(widths):.1f})")
        print(f"  Height 범위: {min(heights)} ~ {max(heights)} (평균: {sum(heights)/len(heights):.1f})")
        print()

        # width > 30인 블록 개수
        wide_integral_blocks = [b for b in integral_candidates if b['width'] > 30]
        print(f"  Width > 30인 인테그랄 후보: {len(wide_integral_blocks)}개")
        print(f"    → 현재 vertical_tall 필터에서 제외됨!")
        print()

    # 5. 제안 사항
    print("=" * 80)
    print("5. 문제 원인 및 해결 방안")
    print("=" * 80)
    print()

    print("【문제 원인】")
    print()

    # 원인 1: width 제한이 너무 엄격
    if filter_fail_width:
        print("1. width <= 30 조건이 너무 엄격함")
        print(f"   - {len(filter_fail_width)}개 블록이 이 조건 때문에 제외됨")
        print(f"   - 인테그랄이 실제로는 width 30 이상일 수 있음")
        print()

    # 원인 2: vertical_tall이 검출했지만 다른 스케일과 병합 시 제거됨
    print("2. vertical_tall 스케일이 365개 후보를 검출했지만 2개만 유지")
    print("   - 필터가 너무 엄격하거나")
    print("   - NMS 병합 시 다른 블록에 의해 제거됨")
    print()

    # 원인 3: 인테그랄이 애초에 vertical_tall로 검출되지 않음
    print("3. v_kernel=12로도 인테그랄의 상하 곡선 부분을 연결하지 못함")
    print("   - 인테그랄 ∫ 형태의 상단 곡선과 하단 곡선 사이가 너무 멈")
    print("   - 모폴로지 연산으로는 한계가 있을 수 있음")
    print()

    print("【해결 방안 제안】")
    print()
    print("A. width 제한 완화")
    print("   - width <= 30 → width <= 50으로 변경")
    print(f"   - 효과: {len([b for b in integral_candidates if 30 < b['width'] <= 50])}개 블록 추가 포함")
    print()

    print("B. v_kernel 더 증가")
    print("   - vertical_tall v_kernel: 12 → 20으로 증가")
    print("   - 인테그랄 높이가 60-100px이므로 더 큰 커널 필요")
    print()

    print("C. 다단계 필터링")
    print("   - 1단계: v_kernel=12로 일부 검출")
    print("   - 2단계: v_kernel=20로 더 큰 인테그랄 검출")
    print("   - 두 결과 병합")
    print()

    print("D. NMS IoU threshold 조정")
    print("   - 현재 0.65 → 0.70으로 증가")
    print("   - vertical_tall 블록이 다른 블록에 흡수되지 않도록")
    print()

    print("=" * 80)
    print("분석 완료")
    print("=" * 80)


if __name__ == "__main__":
    analyze_blocks_for_integral()
