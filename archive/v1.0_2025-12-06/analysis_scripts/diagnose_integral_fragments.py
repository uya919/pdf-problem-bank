"""
인테그랄 조각 검출 심층 진단

각 처리 단계별로 인테그랄 영역의 블록들을 추적하여
왜 병합되지 않는지 정확히 파악
"""
from pathlib import Path
import sys
import json
import cv2
import numpy as np

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from data_models import BoundingBox


def imread_unicode(path: Path) -> np.ndarray:
    """한글 경로 이미지 읽기"""
    with open(path, 'rb') as f:
        arr = np.frombuffer(f.read(), dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def analyze_integral_region():
    """
    인테그랄 영역(사용자 제공 이미지 기준)의 블록들을 분석

    이미지로 보면 왼쪽 상단 부근에 세로로 긴 초록색 인테그랄이 있음
    """
    print("=" * 80)
    print("인테그랄 조각 검출 심층 진단")
    print("=" * 80)
    print()

    config = Config.load()

    # 파일 경로
    json_path = config.DOCUMENTS_DIR / "test" / "blocks" / "page_0000_blocks.json"
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not json_path.exists():
        print(f"[오류] JSON 파일 없음: {json_path}")
        return

    if not image_path.exists():
        print(f"[오류] 이미지 파일 없음: {image_path}")
        return

    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']
    print(f"총 블록 수: {len(blocks)}")
    print()

    # 이미지 로드
    image = imread_unicode(image_path)
    height, width = image.shape[:2]
    print(f"이미지 크기: {width} x {height}")
    print()

    # 1. 세로로 긴 블록 찾기 (aspect ratio < 0.5)
    print("=" * 80)
    print("1. 세로로 긴 블록 분석 (인테그랄 후보)")
    print("=" * 80)
    print()

    vertical_blocks = []
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        w = x_max - x_min
        h = y_max - y_min

        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:  # 세로로 길고 높이 20 이상
                vertical_blocks.append({
                    'id': block['block_id'],
                    'column': block['column'],
                    'bbox': bbox,
                    'x_min': x_min,
                    'y_min': y_min,
                    'x_max': x_max,
                    'y_max': y_max,
                    'width': w,
                    'height': h,
                    'aspect': aspect,
                    'density': block.get('pixel_density', 0),
                    'center_x': (x_min + x_max) // 2,
                    'center_y': (y_min + y_max) // 2
                })

    print(f"세로로 긴 블록: {len(vertical_blocks)}개")
    print()

    if not vertical_blocks:
        print("[경고] 세로로 긴 블록이 없습니다!")
        return

    # Y 좌표 기준 정렬
    vertical_blocks.sort(key=lambda b: b['y_min'])

    # 2. 각 블록의 Y 좌표와 간격 분석
    print("=" * 80)
    print("2. 세로로 긴 블록들의 Y 좌표 및 간격 분석")
    print("=" * 80)
    print()

    print(f"{'ID':>4} {'Col':>3} {'X_min':>6} {'X_max':>6} {'Y_min':>6} {'Y_max':>6} "
          f"{'Width':>6} {'Height':>7} {'Aspect':>8} {'Y_gap':>7}")
    print("-" * 90)

    for i, block in enumerate(vertical_blocks):
        # 이전 블록과의 Y 간격 계산
        if i > 0:
            prev = vertical_blocks[i - 1]
            y_gap = block['y_min'] - prev['y_max']
        else:
            y_gap = 0

        print(f"{block['id']:4d} {block['column']:>3} "
              f"{block['x_min']:6d} {block['x_max']:6d} "
              f"{block['y_min']:6d} {block['y_max']:6d} "
              f"{block['width']:6d} {block['height']:7d} "
              f"{block['aspect']:8.3f} {y_gap:7d}")

    print()

    # 3. X 좌표 겹침 분석 (같은 수직선상에 있는지)
    print("=" * 80)
    print("3. X 좌표 겹침 분석 (병합 가능한 블록 그룹)")
    print("=" * 80)
    print()

    # 각 블록 쌍의 X 겹침 확인
    print("블록 쌍별 X 겹침 여부 (max_gap=30, max_gap=50, max_gap=80 기준):")
    print(f"{'Pair':>10} {'X_overlap':>10} {'Y_gap':>7} {'Gap<=30':>9} {'Gap<=50':>9} {'Gap<=80':>9}")
    print("-" * 80)

    mergeable_pairs_30 = []
    mergeable_pairs_50 = []
    mergeable_pairs_80 = []

    for i in range(len(vertical_blocks) - 1):
        curr = vertical_blocks[i]
        next_block = vertical_blocks[i + 1]

        # X 겹침 확인
        x_overlap = not (next_block['x_max'] < curr['x_min'] or
                        next_block['x_min'] > curr['x_max'])

        # Y 간격
        y_gap = next_block['y_min'] - curr['y_max']

        # 병합 가능 여부
        can_merge_30 = x_overlap and y_gap <= 30
        can_merge_50 = x_overlap and y_gap <= 50
        can_merge_80 = x_overlap and y_gap <= 80

        if can_merge_30:
            mergeable_pairs_30.append((curr['id'], next_block['id']))
        if can_merge_50:
            mergeable_pairs_50.append((curr['id'], next_block['id']))
        if can_merge_80:
            mergeable_pairs_80.append((curr['id'], next_block['id']))

        pair_name = f"{curr['id']}-{next_block['id']}"
        print(f"{pair_name:>10} {str(x_overlap):>10} {y_gap:7d} "
              f"{str(can_merge_30):>9} {str(can_merge_50):>9} {str(can_merge_80):>9}")

    print()
    print(f"병합 가능한 쌍 (max_gap=30): {len(mergeable_pairs_30)}개")
    print(f"병합 가능한 쌍 (max_gap=50): {len(mergeable_pairs_50)}개")
    print(f"병합 가능한 쌍 (max_gap=80): {len(mergeable_pairs_80)}개")
    print()

    # 4. 인테그랄 후보 그룹 찾기 (연결된 쌍들을 그룹화)
    print("=" * 80)
    print("4. 인테그랄 후보 그룹 (연결된 블록들)")
    print("=" * 80)
    print()

    def find_groups(pairs):
        """연결된 쌍들을 그룹으로 변환"""
        if not pairs:
            return []

        groups = []
        used = set()

        for pair in pairs:
            id1, id2 = pair
            if id1 in used or id2 in used:
                # 이미 사용된 ID가 있으면 해당 그룹에 추가
                for group in groups:
                    if id1 in group or id2 in group:
                        group.add(id1)
                        group.add(id2)
                        break
            else:
                # 새 그룹 생성
                groups.append({id1, id2})

            used.add(id1)
            used.add(id2)

        # 겹치는 그룹 병합
        merged = True
        while merged:
            merged = False
            new_groups = []
            skip = set()

            for i, g1 in enumerate(groups):
                if i in skip:
                    continue

                merged_group = g1.copy()
                for j, g2 in enumerate(groups[i+1:], i+1):
                    if g1 & g2:  # 교집합이 있으면
                        merged_group |= g2
                        skip.add(j)
                        merged = True

                new_groups.append(merged_group)

            groups = new_groups

        return groups

    groups_30 = find_groups(mergeable_pairs_30)
    groups_50 = find_groups(mergeable_pairs_50)
    groups_80 = find_groups(mergeable_pairs_80)

    print(f"max_gap=30: {len(groups_30)}개 그룹")
    for i, group in enumerate(groups_30, 1):
        block_ids = sorted(group)
        print(f"  그룹 {i}: 블록 {block_ids} ({len(block_ids)}개)")
    print()

    print(f"max_gap=50: {len(groups_50)}개 그룹")
    for i, group in enumerate(groups_50, 1):
        block_ids = sorted(group)
        print(f"  그룹 {i}: 블록 {block_ids} ({len(block_ids)}개)")
    print()

    print(f"max_gap=80: {len(groups_80)}개 그룹")
    for i, group in enumerate(groups_80, 1):
        block_ids = sorted(group)
        print(f"  그룹 {i}: 블록 {block_ids} ({len(block_ids)}개)")
    print()

    # 5. Euclidean distance 기반 클러스터링 시뮬레이션
    print("=" * 80)
    print("5. Euclidean Distance 기반 클러스터링 (DBSCAN 방식)")
    print("=" * 80)
    print()

    # 블록 중심점들의 거리 계산
    print("블록 중심점 간 거리 매트릭스 (가까운 쌍만 표시):")
    print()

    from scipy.spatial.distance import euclidean

    for i in range(len(vertical_blocks)):
        for j in range(i + 1, len(vertical_blocks)):
            b1 = vertical_blocks[i]
            b2 = vertical_blocks[j]

            # 중심점 거리
            dist = euclidean(
                (b1['center_x'], b1['center_y']),
                (b2['center_x'], b2['center_y'])
            )

            # 거리가 100 이하인 것만 출력
            if dist <= 100:
                print(f"  블록 {b1['id']:3d} <-> {b2['id']:3d}: {dist:6.1f}px")

    print()

    # 6. 권장 사항
    print("=" * 80)
    print("6. 진단 결과 및 권장 사항")
    print("=" * 80)
    print()

    print("【현재 병합 알고리즘 문제점】")
    print()
    print("1. X 좌표 겹침 조건이 너무 엄격")
    print("   - 인테그랄의 상단/하단 곡선은 X 좌표가 약간 다를 수 있음")
    print("   - 현재: 완전 겹침만 허용")
    print("   - 개선: 중심 X 좌표 차이가 일정 범위 내면 허용")
    print()

    print("2. Y 간격 제한이 너무 작음")
    print(f"   - max_gap=30: {len(mergeable_pairs_30)}개 쌍만 병합 가능")
    print(f"   - max_gap=50: {len(mergeable_pairs_50)}개 쌍 병합 가능")
    print(f"   - max_gap=80: {len(mergeable_pairs_80)}개 쌍 병합 가능")
    print("   - 인테그랄 높이가 큰 경우 조각 간 간격도 클 수 있음")
    print()

    print("【권장 해결 방안】")
    print()
    print("A. X 좌표 조건 완화 (Euclidean distance 기반)")
    print("   - 조건: X 겹침 OR center_x 차이 <= 20px")
    print("   - Euclidean distance <= 100px도 고려")
    print()

    print("B. max_gap 증가")
    print("   - 현재: 30px")
    print("   - 권장: 50-80px (인테그랄 크기에 따라)")
    print()

    print("C. 다단계 병합")
    print("   - 1단계: gap <= 20px인 가까운 조각 병합")
    print("   - 2단계: gap <= 50px인 중간 거리 조각 병합")
    print("   - 3단계: gap <= 80px인 먼 조각 병합")
    print("   - 각 단계마다 병합 후 재평가")
    print()

    print("D. 밀집도 기반 필터링 추가")
    print("   - 병합 후 세로 밀집도 확인")
    print("   - 너무 빈 영역이 많으면 병합 취소")
    print()

    print("=" * 80)
    print("진단 완료")
    print("=" * 80)


if __name__ == "__main__":
    analyze_integral_region()
