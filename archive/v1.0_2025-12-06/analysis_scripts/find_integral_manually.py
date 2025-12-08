"""
수동으로 인테그랄 영역 찾기

페이지 이미지에서 실제 인테그랄 위치를 찾아서
해당 영역의 픽셀 분포와 모폴로지 연산 결과를 분석
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


def imwrite_unicode(path: Path, image: np.ndarray):
    """한글 경로 이미지 저장"""
    ext = path.suffix
    success, encoded = cv2.imencode(ext, image)
    if success:
        with open(path, 'wb') as f:
            f.write(encoded)


def analyze_integral_pixels():
    """
    인테그랄 영역의 픽셀 분석

    페이지 이미지를 보면 문제 01 옆에 인테그랄이 있음
    대략 X: 50-70, Y: 60-100 정도 위치로 추정
    """
    print("=" * 80)
    print("수동 인테그랄 영역 분석")
    print("=" * 80)
    print()

    config = Config.load()
    image_path = config.DOCUMENTS_DIR / "test" / "pages" / "page_0000.png"

    if not image_path.exists():
        print(f"[오류] 이미지 파일 없음: {image_path}")
        return

    # 이미지 로드
    image = imread_unicode(image_path)
    height, width = image.shape[:2]
    print(f"이미지 크기: {width} x {height}")
    print()

    # 흰색 배경 제거
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

    print("=" * 80)
    print("1. 페이지 전체에서 세로로 긴 연결 요소 찾기")
    print("=" * 80)
    print()

    # 연결 요소 분석 (레이블링)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)

    print(f"총 연결 요소: {num_labels - 1}개 (배경 제외)")
    print()

    # 세로로 긴 요소 찾기 (aspect ratio < 0.3)
    vertical_components = []
    for i in range(1, num_labels):  # 0은 배경
        x, y, w, h, area = stats[i]

        if h > 0:
            aspect = w / h

            if aspect < 0.3 and h >= 30:  # 매우 얇고 높이 30 이상
                vertical_components.append({
                    'label': i,
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h,
                    'aspect': aspect,
                    'area': area,
                    'center_x': centroids[i][0],
                    'center_y': centroids[i][1]
                })

    vertical_components.sort(key=lambda c: c['aspect'])  # aspect ratio 순 정렬

    print(f"매우 세로로 긴 연결 요소 (aspect < 0.3, h >= 30): {len(vertical_components)}개")
    print()

    if vertical_components:
        print("상위 20개:")
        print(f"{'Label':>6} {'X':>5} {'Y':>5} {'W':>5} {'H':>5} {'Aspect':>8} {'Area':>7}")
        print("-" * 60)
        for comp in vertical_components[:20]:
            print(f"{comp['label']:6d} {comp['x']:5d} {comp['y']:5d} "
                  f"{comp['w']:5d} {comp['h']:5d} {comp['aspect']:8.3f} {comp['area']:7d}")
        print()

    # 2. 모폴로지 연산 시뮬레이션
    print("=" * 80)
    print("2. 모폴로지 연산 시뮬레이션 (vertical_tall 스케일)")
    print("=" * 80)
    print()

    # vertical_tall: h=3, v=12
    print("현재 설정: h_kernel=3, v_kernel=12")
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 12))

    h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)
    v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel)

    # 연결 요소 재분석
    num_labels_v12, labels_v12, stats_v12, centroids_v12 = cv2.connectedComponentsWithStats(
        v_closed, connectivity=8
    )

    vertical_v12 = []
    for i in range(1, num_labels_v12):
        x, y, w, h, area = stats_v12[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.3 and h >= 30:
                vertical_v12.append({
                    'label': i,
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h,
                    'aspect': aspect,
                    'area': area
                })

    vertical_v12.sort(key=lambda c: c['aspect'])

    print(f"v_kernel=12 적용 후 세로 요소: {len(vertical_v12)}개")
    if vertical_v12:
        print("상위 10개:")
        print(f"{'Label':>6} {'X':>5} {'Y':>5} {'W':>5} {'H':>5} {'Aspect':>8} {'Area':>7}")
        print("-" * 60)
        for comp in vertical_v12[:10]:
            print(f"{comp['label']:6d} {comp['x']:5d} {comp['y']:5d} "
                  f"{comp['w']:5d} {comp['h']:5d} {comp['aspect']:8.3f} {comp['area']:7d}")
    print()

    # 3. v_kernel=20 시도
    print("v_kernel=20 시도:")
    v_kernel_20 = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 20))
    v_closed_20 = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel_20)

    num_labels_v20, labels_v20, stats_v20, centroids_v20 = cv2.connectedComponentsWithStats(
        v_closed_20, connectivity=8
    )

    vertical_v20 = []
    for i in range(1, num_labels_v20):
        x, y, w, h, area = stats_v20[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.3 and h >= 30:
                vertical_v20.append({
                    'label': i,
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h,
                    'aspect': aspect,
                    'area': area
                })

    vertical_v20.sort(key=lambda c: c['aspect'])

    print(f"v_kernel=20 적용 후 세로 요소: {len(vertical_v20)}개")
    if vertical_v20:
        print("상위 10개:")
        print(f"{'Label':>6} {'X':>5} {'Y':>5} {'W':>5} {'H':>5} {'Aspect':>8} {'Area':>7}")
        print("-" * 60)
        for comp in vertical_v20[:10]:
            print(f"{comp['label']:6d} {comp['x']:5d} {comp['y']:5d} "
                  f"{comp['w']:5d} {comp['h']:5d} {comp['aspect']:8.3f} {comp['area']:7d}")
    print()

    # 4. v_kernel=30 시도
    print("v_kernel=30 시도:")
    v_kernel_30 = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 30))
    v_closed_30 = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel_30)

    num_labels_v30, labels_v30, stats_v30, centroids_v30 = cv2.connectedComponentsWithStats(
        v_closed_30, connectivity=8
    )

    vertical_v30 = []
    for i in range(1, num_labels_v30):
        x, y, w, h, area = stats_v30[i]
        if h > 0:
            aspect = w / h
            if aspect < 0.3 and h >= 30:
                vertical_v30.append({
                    'label': i,
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h,
                    'aspect': aspect,
                    'area': area
                })

    vertical_v30.sort(key=lambda c: c['aspect'])

    print(f"v_kernel=30 적용 후 세로 요소: {len(vertical_v30)}개")
    if vertical_v30:
        print("상위 10개:")
        print(f"{'Label':>6} {'X':>5} {'Y':>5} {'W':>5} {'H':>5} {'Aspect':>8} {'Area':>7}")
        print("-" * 60)
        for comp in vertical_v30[:10]:
            print(f"{comp['label']:6d} {comp['x']:5d} {comp['y']:5d} "
                  f"{comp['w']:5d} {comp['h']:5d} {comp['aspect']:8.3f} {comp['area']:7d}")
    print()

    # 5. 시각화 저장
    output_dir = config.DATASET_ROOT

    # 원본 마스크
    imwrite_unicode(output_dir / "integral_mask_original.png", mask)

    # v=12 결과
    vis_v12 = image.copy()
    for comp in vertical_v12[:20]:  # 상위 20개만
        x, y, w, h = comp['x'], comp['y'], comp['w'], comp['h']
        cv2.rectangle(vis_v12, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(vis_v12, f"{comp['label']}", (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    imwrite_unicode(output_dir / "integral_detection_v12.png", vis_v12)

    # v=20 결과
    vis_v20 = image.copy()
    for comp in vertical_v20[:20]:
        x, y, w, h = comp['x'], comp['y'], comp['w'], comp['h']
        cv2.rectangle(vis_v20, (x, y), (x + w, y + h), (255, 0, 0), 2)
        cv2.putText(vis_v20, f"{comp['label']}", (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
    imwrite_unicode(output_dir / "integral_detection_v20.png", vis_v20)

    # v=30 결과
    vis_v30 = image.copy()
    for comp in vertical_v30[:20]:
        x, y, w, h = comp['x'], comp['y'], comp['w'], comp['h']
        cv2.rectangle(vis_v30, (x, y), (x + w, y + h), (0, 0, 255), 2)
        cv2.putText(vis_v30, f"{comp['label']}", (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
    imwrite_unicode(output_dir / "integral_detection_v30.png", vis_v30)

    print("시각화 저장:")
    print(f"  v_kernel=12: {output_dir / 'integral_detection_v12.png'}")
    print(f"  v_kernel=20: {output_dir / 'integral_detection_v20.png'}")
    print(f"  v_kernel=30: {output_dir / 'integral_detection_v30.png'}")
    print()

    # 6. 권장 사항
    print("=" * 80)
    print("권장 사항")
    print("=" * 80)
    print()

    improvement = len(vertical_v20) - len(vertical_v12)
    improvement_30 = len(vertical_v30) - len(vertical_v12)

    print(f"v_kernel 증가 효과:")
    print(f"  v=12: {len(vertical_v12)}개 세로 요소")
    print(f"  v=20: {len(vertical_v20)}개 세로 요소 ({improvement:+d})")
    print(f"  v=30: {len(vertical_v30)}개 세로 요소 ({improvement_30:+d})")
    print()

    if improvement > 0:
        print(f"[권장] v_kernel을 20으로 증가하면 {improvement}개 더 검출 가능")
    elif improvement_30 > 0:
        print(f"[권장] v_kernel을 30으로 증가하면 {improvement_30}개 더 검출 가능")
    else:
        print("[경고] v_kernel 증가만으로는 개선이 어려울 수 있음")
        print("       → 후처리 병합 로직 강화 필요")

    print()
    print("=" * 80)
    print("분석 완료")
    print("=" * 80)


if __name__ == "__main__":
    analyze_integral_pixels()
