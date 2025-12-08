"""
인테그랄 위아래 잘림 문제 심층 진단

검출된 인테그랄 블록의 위/아래에 추가 픽셀이 있는지,
왜 병합되지 않았는지 분석
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


def diagnose_truncation():
    """인테그랄 잘림 문제 진단"""
    print("=" * 80)
    print("인테그랄 위아래 잘림 문제 심층 진단")
    print("=" * 80)
    print()

    config = Config.load()

    # 파일 경로
    json_path = config.DOCUMENTS_DIR / "test" / "blocks" / "page_0000_blocks.json"
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not json_path.exists() or not image_path.exists():
        print(f"[오류] 파일 없음")
        return

    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']

    # 이미지 로드
    image = imread_unicode(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    # 인테그랄 후보 블록 찾기 (aspect < 0.2)
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
                    'aspect': aspect,
                    'density': block.get('pixel_density', 0)
                })

    integral_blocks.sort(key=lambda b: b['id'])

    print(f"인테그랄 후보 블록 (aspect < 0.2, h >= 40): {len(integral_blocks)}개")
    print()

    if not integral_blocks:
        print("[경고] 인테그랄 블록이 없습니다!")
        return

    # 각 인테그랄 블록에 대해 분석
    print("=" * 80)
    print("각 인테그랄 블록의 위/아래 영역 분석")
    print("=" * 80)
    print()

    output_dir = config.DATASET_ROOT
    results = []

    for i, ib in enumerate(integral_blocks):
        print(f"\n블록 {ib['id']}: {ib['width']}×{ib['height']}px (aspect={ib['aspect']:.3f})")
        print(f"  위치: X [{ib['x_min']}, {ib['x_max']}], Y [{ib['y_min']}, {ib['y_max']}]")
        print()

        # 1. 위쪽 확장 검사 (최대 100px)
        extend_above = 0
        max_extend = 100

        for extend in range(1, max_extend + 1):
            new_y_min = ib['y_min'] - extend

            if new_y_min < 0:
                break

            # 해당 행의 픽셀 확인
            row_pixels = mask[new_y_min, ib['x_min']:ib['x_max']]
            black_count = np.sum(row_pixels > 0)

            # 검은 픽셀이 있으면 확장 가능
            if black_count > 0:
                extend_above = extend
            else:
                # 연속 5행 이상 빈 행이면 중단
                if extend_above > 0 and extend - extend_above >= 5:
                    break

        # 2. 아래쪽 확장 검사 (최대 100px)
        extend_below = 0

        for extend in range(1, max_extend + 1):
            new_y_max = ib['y_max'] + extend

            if new_y_max >= image.shape[0]:
                break

            # 해당 행의 픽셀 확인
            row_pixels = mask[new_y_max, ib['x_min']:ib['x_max']]
            black_count = np.sum(row_pixels > 0)

            # 검은 픽셀이 있으면 확장 가능
            if black_count > 0:
                extend_below = extend
            else:
                # 연속 5행 이상 빈 행이면 중단
                if extend_below > 0 and extend - extend_below >= 5:
                    break

        print(f"  확장 가능:")
        print(f"    위쪽: {extend_above}px")
        print(f"    아래쪽: {extend_below}px")

        # 3. 확장된 영역의 실제 픽셀 수 계산
        if extend_above > 0:
            roi_above = mask[ib['y_min'] - extend_above:ib['y_min'], ib['x_min']:ib['x_max']]
            pixels_above = np.sum(roi_above > 0)
            print(f"    위쪽 영역 검은 픽셀: {pixels_above}개")
        else:
            pixels_above = 0

        if extend_below > 0:
            roi_below = mask[ib['y_max']:ib['y_max'] + extend_below, ib['x_min']:ib['x_max']]
            pixels_below = np.sum(roi_below > 0)
            print(f"    아래쪽 영역 검은 픽셀: {pixels_below}개")
        else:
            pixels_below = 0

        # 4. 확장 후 새로운 크기
        new_height = ib['height'] + extend_above + extend_below
        new_aspect = ib['width'] / new_height if new_height > 0 else 0

        print(f"  확장 후:")
        print(f"    새 높이: {new_height}px (+{extend_above + extend_below})")
        print(f"    새 aspect ratio: {new_aspect:.3f}")
        print()

        # 5. 위/아래에 별도 블록이 있는지 확인
        nearby_blocks_above = []
        nearby_blocks_below = []

        for block in blocks:
            if block['block_id'] == ib['id']:
                continue

            bbox = block['bbox']
            bx_min, by_min, bx_max, by_max = bbox

            # X 겹침 확인
            x_overlap = not (bx_max < ib['x_min'] or bx_min > ib['x_max'])
            if not x_overlap:
                continue

            # 위쪽 근처
            if by_max <= ib['y_min'] and ib['y_min'] - by_max <= 100:
                nearby_blocks_above.append({
                    'id': block['block_id'],
                    'bbox': bbox,
                    'y_gap': ib['y_min'] - by_max,
                    'height': by_max - by_min
                })

            # 아래쪽 근처
            if by_min >= ib['y_max'] and by_min - ib['y_max'] <= 100:
                nearby_blocks_below.append({
                    'id': block['block_id'],
                    'bbox': bbox,
                    'y_gap': by_min - ib['y_max'],
                    'height': by_max - by_min
                })

        if nearby_blocks_above:
            print(f"  위쪽 근처 블록 ({len(nearby_blocks_above)}개):")
            for nb in sorted(nearby_blocks_above, key=lambda b: b['y_gap']):
                print(f"    블록 {nb['id']}: Y_gap={nb['y_gap']}px, height={nb['height']}px")

        if nearby_blocks_below:
            print(f"  아래쪽 근처 블록 ({len(nearby_blocks_below)}개):")
            for nb in sorted(nearby_blocks_below, key=lambda b: b['y_gap']):
                print(f"    블록 {nb['id']}: Y_gap={nb['y_gap']}px, height={nb['height']}px")

        print()

        # 6. 시각화 저장
        # 원본 + 확장 영역
        vis = image.copy()

        # 현재 블록 (빨간색)
        cv2.rectangle(vis, (ib['x_min'], ib['y_min']), (ib['x_max'], ib['y_max']), (0, 0, 255), 3)

        # 확장 영역 (노란색 점선)
        if extend_above > 0:
            new_y_min = ib['y_min'] - extend_above
            cv2.rectangle(vis, (ib['x_min'], new_y_min), (ib['x_max'], ib['y_min']), (0, 255, 255), 2)
            cv2.putText(vis, f"Above: +{extend_above}px", (ib['x_min'], new_y_min - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        if extend_below > 0:
            new_y_max = ib['y_max'] + extend_below
            cv2.rectangle(vis, (ib['x_min'], ib['y_max']), (ib['x_max'], new_y_max), (0, 255, 255), 2)
            cv2.putText(vis, f"Below: +{extend_below}px", (ib['x_min'], new_y_max + 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        # 근처 블록 (초록색)
        for nb in nearby_blocks_above + nearby_blocks_below:
            bbox = nb['bbox']
            cv2.rectangle(vis, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            cv2.putText(vis, f"ID:{nb['id']}", (bbox[0], bbox[1] - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)

        # 저장
        vis_path = output_dir / f"integral_block_{ib['id']}_truncation.png"
        imwrite_unicode(vis_path, vis)

        results.append({
            'id': ib['id'],
            'extend_above': extend_above,
            'extend_below': extend_below,
            'pixels_above': pixels_above,
            'pixels_below': pixels_below,
            'nearby_above': len(nearby_blocks_above),
            'nearby_below': len(nearby_blocks_below)
        })

    # 요약
    print("=" * 80)
    print("요약")
    print("=" * 80)
    print()

    total_truncated = sum(1 for r in results if r['extend_above'] > 0 or r['extend_below'] > 0)
    print(f"잘린 인테그랄: {total_truncated}/{len(integral_blocks)}개")
    print()

    if total_truncated > 0:
        print("잘린 블록 상세:")
        print(f"{'ID':>4} {'Ext_Above':>10} {'Ext_Below':>10} {'Nearby_Above':>13} {'Nearby_Below':>13}")
        print("-" * 70)

        for r in results:
            if r['extend_above'] > 0 or r['extend_below'] > 0:
                print(f"{r['id']:4d} {r['extend_above']:10d}px {r['extend_below']:10d}px "
                      f"{r['nearby_above']:13d} {r['nearby_below']:13d}")

    print()

    # 문제 원인 및 해결 방안
    print("=" * 80)
    print("문제 원인 및 해결 방안")
    print("=" * 80)
    print()

    print("【원인 분석】")
    print()

    if any(r['nearby_above'] > 0 or r['nearby_below'] > 0 for r in results):
        print("1. 인테그랄 조각이 별도 블록으로 검출되었으나 병합되지 않음")
        print("   - max_gap=50이지만 실제 간격이 더 클 수 있음")
        print("   - X 좌표 조건(center_x <= 20px)이 맞지 않을 수 있음")
        print()

    if any(r['extend_above'] > 0 or r['extend_below'] > 0 for r in results):
        print("2. 인테그랄 조각이 아예 검출되지 않음")
        print("   - v_kernel=30으로도 부족")
        print("   - 작은 조각이 필터링됨 (height < 20 또는 aspect 조건)")
        print()

    print("【해결 방안】")
    print()

    max_extend_above = max((r['extend_above'] for r in results), default=0)
    max_extend_below = max((r['extend_below'] for r in results), default=0)

    if max_extend_above > 30 or max_extend_below > 30:
        print(f"A. v_kernel 추가 증가: 30 → {max(50, max_extend_above + max_extend_below + 10)}")
        print(f"   - 최대 확장: 위 {max_extend_above}px, 아래 {max_extend_below}px")
        print()

    if any(r['nearby_above'] > 0 or r['nearby_below'] > 0 for r in results):
        print("B. max_gap 증가: 50 → 80px")
        print("   - 조각 간 간격이 50px 이상일 수 있음")
        print()

        print("C. X 좌표 조건 완화: center_x <= 20px → 30px")
        print("   - 인테그랄 상/하단 곡선의 X 차이가 클 수 있음")
        print()

    print("D. 필터 조건 완화")
    print("   - height >= 20 → height >= 10")
    print("   - 매우 작은 조각도 포함")
    print()

    print("=" * 80)
    print("진단 완료")
    print("=" * 80)


if __name__ == "__main__":
    diagnose_truncation()
