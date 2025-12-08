"""
블록 50 (병합된 인테그랄) 시각화

블록 50이 정확히 어디에 있고, 인테그랄 전체를 포함하는지 확인
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


def visualize_block_50():
    """블록 50과 주변 세로 블록들 시각화"""
    print("=" * 80)
    print("블록 50 (병합된 인테그랄) 시각화")
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
    vis = image.copy()

    # 1. 모든 세로로 긴 블록 찾기 (연한 색으로)
    vertical_blocks = []
    for block in blocks:
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox
        w = x_max - x_min
        h = y_max - y_min

        if h > 0:
            aspect = w / h
            if aspect < 0.5 and h >= 20:
                vertical_blocks.append({
                    'id': block['block_id'],
                    'bbox': bbox,
                    'width': w,
                    'height': h,
                    'aspect': aspect
                })

                # 연한 파란색으로 표시
                cv2.rectangle(vis, (x_min, y_min), (x_max, y_max), (255, 200, 200), 2)

                # 블록 ID 표시
                cv2.putText(vis, f"{block['block_id']}", (x_min, y_min - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 100, 100), 1)

    print(f"세로로 긴 블록: {len(vertical_blocks)}개")
    print()

    # 2. 블록 50 강조 표시 (빨간색, 굵게)
    block_50 = None
    for block in blocks:
        if block['block_id'] == 50:
            block_50 = block
            bbox = block['bbox']
            x_min, y_min, x_max, y_max = bbox
            w = x_max - x_min
            h = y_max - y_min

            print(f"블록 50 발견:")
            print(f"  위치: X [{x_min}, {x_max}], Y [{y_min}, {y_max}]")
            print(f"  크기: {w} x {h} px")
            print(f"  aspect ratio: {w/h:.3f}")
            print(f"  density: {block.get('pixel_density', 0):.3f}")
            print()

            # 빨간색 굵은 테두리
            cv2.rectangle(vis, (x_min, y_min), (x_max, y_max), (0, 0, 255), 4)

            # 레이블
            cv2.putText(vis, "Block 50 (Merged Integral)", (x_min, y_min - 15),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            break

    if not block_50:
        print("[경고] 블록 50을 찾을 수 없습니다!")
        return

    # 3. 블록 50 주변 확대 이미지 생성
    bbox = block_50['bbox']
    x_min, y_min, x_max, y_max = bbox

    # 주변 50px 확장
    margin = 80
    crop_x_min = max(0, x_min - margin)
    crop_y_min = max(0, y_min - margin)
    crop_x_max = min(image.shape[1], x_max + margin)
    crop_y_max = min(image.shape[0], y_max + margin)

    # 원본 이미지 크롭
    crop_original = image[crop_y_min:crop_y_max, crop_x_min:crop_x_max]

    # 시각화 이미지 크롭
    crop_vis = vis[crop_y_min:crop_y_max, crop_x_min:crop_x_max]

    # 4. 블록 50의 ROI에서 픽셀 분석
    roi = image[y_min:y_max, x_min:x_max]
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    # 이진화
    _, binary_roi = cv2.threshold(gray_roi, 240, 255, cv2.THRESH_BINARY_INV)

    print("블록 50 픽셀 분석:")
    print(f"  ROI 크기: {roi.shape[1]} x {roi.shape[0]}")
    print(f"  검은 픽셀 비율: {np.sum(binary_roi > 0) / binary_roi.size:.3f}")
    print()

    # 5. 블록 50 위/아래의 픽셀 확인 (확장 검사)
    # 위쪽 50px 영역
    if y_min >= 50:
        roi_above = image[y_min - 50:y_min, x_min:x_max]
        gray_above = cv2.cvtColor(roi_above, cv2.COLOR_BGR2GRAY)
        _, binary_above = cv2.threshold(gray_above, 240, 255, cv2.THRESH_BINARY_INV)
        pixels_above = np.sum(binary_above > 0)
        print(f"블록 50 위쪽 50px 영역의 검은 픽셀: {pixels_above}개")
    else:
        pixels_above = 0

    # 아래쪽 50px 영역
    if y_max + 50 <= image.shape[0]:
        roi_below = image[y_max:y_max + 50, x_min:x_max]
        gray_below = cv2.cvtColor(roi_below, cv2.COLOR_BGR2GRAY)
        _, binary_below = cv2.threshold(gray_below, 240, 255, cv2.THRESH_BINARY_INV)
        pixels_below = np.sum(binary_below > 0)
        print(f"블록 50 아래쪽 50px 영역의 검은 픽셀: {pixels_below}개")
    else:
        pixels_below = 0

    print()

    if pixels_above > 100 or pixels_below > 100:
        print("[!] 블록 50의 위 또는 아래에 추가 픽셀이 있습니다!")
        print("    → 인테그랄이 완전히 병합되지 않았을 가능성")
    else:
        print("[OK] 블록 50의 위/아래에 추가 픽셀이 거의 없습니다.")
        print("    → 인테그랄이 완전히 병합되었을 가능성")

    print()

    # 6. 저장
    output_dir = config.DATASET_ROOT
    full_vis_path = output_dir / "block_50_full_visualization.png"
    crop_original_path = output_dir / "block_50_crop_original.png"
    crop_vis_path = output_dir / "block_50_crop_visualization.png"
    roi_path = output_dir / "block_50_roi.png"

    imwrite_unicode(full_vis_path, vis)
    imwrite_unicode(crop_original_path, crop_original)
    imwrite_unicode(crop_vis_path, crop_vis)
    imwrite_unicode(roi_path, roi)

    print("시각화 결과 저장:")
    print(f"  전체 페이지: {full_vis_path}")
    print(f"  블록 50 주변 (원본): {crop_original_path}")
    print(f"  블록 50 주변 (시각화): {crop_vis_path}")
    print(f"  블록 50 ROI: {roi_path}")
    print()

    print("=" * 80)
    print("분석 완료")
    print("=" * 80)


if __name__ == "__main__":
    visualize_block_50()
