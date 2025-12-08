"""
근처 블록 상세 진단

왜 근처 블록들이 병합되지 않는지 정확히 분석
"""
from pathlib import Path
import sys
import json

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config


def diagnose_nearby():
    """근처 블록 상세 분석"""
    print("=" * 80)
    print("근처 블록 상세 진단")
    print("=" * 80)
    print()

    config = Config.load()
    json_path = config.DOCUMENTS_DIR / "test" / "blocks" / "page_0000_blocks.json"

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']

    # 인테그랄 블록
    integral_blocks = []
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        w = x_max - x_min
        h = y_max - y_min

        if h > 0:
            aspect = w / h
            if aspect < 0.2 and h >= 40:
                integral_blocks.append({
                    'id': block['block_id'],
                    'bbox': bbox,
                    'x_min': x_min,
                    'y_min': y_min,
                    'x_max': x_max,
                    'y_max': y_max,
                    'width': w,
                    'height': h,
                    'aspect': aspect
                })

    integral_blocks.sort(key=lambda b: b['id'])

    # 블록 668을 예시로 분석 (위쪽에 7개 블록이 있음)
    target = next((b for b in integral_blocks if b['id'] == 668), None)

    if not target:
        print("[오류] 블록 668을 찾을 수 없습니다")
        return

    print(f"타겟 블록: {target['id']}")
    print(f"  크기: {target['width']}×{target['height']}px (aspect={target['aspect']:.3f})")
    print(f"  위치: X [{target['x_min']}, {target['x_max']}], Y [{target['y_min']}, {target['y_max']}]")
    print()

    # 근처 블록 찾기
    nearby_blocks = []

    for block in blocks:
        if block['block_id'] == target['id']:
            continue

        bbox = block['bbox']
        bx_min, by_min, bx_max, by_max = bbox
        bw = bx_max - bx_min
        bh = by_max - by_min

        # X 겹침 확인
        x_overlap = not (bx_max < target['x_min'] or bx_min > target['x_max'])
        if not x_overlap:
            continue

        # 위쪽 근처 (max_gap=100)
        if by_max <= target['y_min'] and target['y_min'] - by_max <= 100:
            nearby_blocks.append({
                'id': block['block_id'],
                'bbox': bbox,
                'x_min': bx_min,
                'y_min': by_min,
                'x_max': bx_max,
                'y_max': by_max,
                'width': bw,
                'height': bh,
                'aspect': bw / bh if bh > 0 else 999,
                'y_gap': target['y_min'] - by_max,
                'density': block.get('pixel_density', 0)
            })

    nearby_blocks.sort(key=lambda b: b['y_gap'])

    print(f"위쪽 근처 블록 ({len(nearby_blocks)}개):")
    print()

    print(f"{'ID':>4} {'Width':>6} {'Height':>7} {'Aspect':>8} {'Y_gap':>7} {'Density':>8} {'후보?':>6}")
    print("-" * 75)

    for nb in nearby_blocks:
        # 후보 조건 확인
        is_candidate = (nb['width'] <= 30 and
                       nb['aspect'] < 0.5 and
                       nb['height'] >= 10)

        candidate_str = "O" if is_candidate else "X"

        print(f"{nb['id']:4d} {nb['width']:6d} {nb['height']:7d} {nb['aspect']:8.3f} "
              f"{nb['y_gap']:7d} {nb['density']:8.3f} {candidate_str:>6}")

    print()

    # 후보 조건 불만족 원인 분석
    print("=" * 80)
    print("후보 조건 불만족 원인 분석")
    print("=" * 80)
    print()

    print("후보 조건:")
    print("  - width <= 30")
    print("  - aspect < 0.5")
    print("  - height >= 10")
    print()

    fail_width = [b for b in nearby_blocks if b['width'] > 30]
    fail_aspect = [b for b in nearby_blocks if b['aspect'] >= 0.5]
    fail_height = [b for b in nearby_blocks if b['height'] < 10]

    print(f"조건 불만족 블록:")
    print(f"  width > 30: {len(fail_width)}개")
    print(f"  aspect >= 0.5: {len(fail_aspect)}개")
    print(f"  height < 10: {len(fail_height)}개")
    print()

    if fail_width:
        print("  width > 30 블록:")
        for b in fail_width[:5]:
            print(f"    블록 {b['id']}: width={b['width']}, height={b['height']}")

    if fail_aspect:
        print(f"\n  aspect >= 0.5 블록:")
        for b in fail_aspect[:5]:
            print(f"    블록 {b['id']}: aspect={b['aspect']:.3f}, size={b['width']}×{b['height']}")

    print()

    # 해결 방안
    print("=" * 80)
    print("해결 방안")
    print("=" * 80)
    print()

    max_width_nearby = max((b['width'] for b in nearby_blocks), default=0)
    max_aspect_nearby = max((b['aspect'] for b in nearby_blocks if b['aspect'] < 1), default=0)

    print(f"근처 블록 최대 너비: {max_width_nearby}px")
    print(f"근처 블록 최대 aspect ratio: {max_aspect_nearby:.3f}")
    print()

    if max_width_nearby > 30:
        print(f"A. max_width 증가: 30 → {max_width_nearby + 5}px")

    if max_aspect_nearby > 0.5:
        print(f"B. aspect ratio 조건 완화: < 0.5 → < {min(max_aspect_nearby + 0.1, 0.8):.1f}")

    print()
    print("=" * 80)


if __name__ == "__main__":
    diagnose_nearby()
