"""
test.pdf 블록 검출 결과 시각화
개선된 v_kernel 결과 확인용
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
from utils import imread_unicode, imwrite_unicode


def visualize_blocks(
    image_path: Path,
    json_path: Path,
    output_path: Path
):
    """
    블록 검출 결과 시각화

    Args:
        image_path: 원본 이미지 경로
        json_path: 블록 JSON 경로
        output_path: 출력 이미지 경로
    """
    # 이미지 로드
    image = imread_unicode(image_path)
    if image is None:
        print(f"[오류] 이미지 로드 실패: {image_path}")
        return

    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    blocks = data['blocks']
    print(f"총 {len(blocks)}개 블록 시각화")

    # 시각화 이미지 생성 (원본 복사)
    vis_image = image.copy()

    # 색상 정의 (BGR)
    colors = {
        'L': (0, 255, 0),      # 좌측: 초록색
        'R': (0, 0, 255),      # 우측: 빨간색
    }

    # 블록 그리기
    for block in blocks:
        block_id = block['block_id']
        column = block['column']
        bbox = block['bbox']
        x_min, y_min, x_max, y_max = bbox

        # 색상 선택
        color = colors.get(column, (128, 128, 128))

        # 박스 그리기
        cv2.rectangle(
            vis_image,
            (x_min, y_min),
            (x_max, y_max),
            color,
            2
        )

        # 블록 번호 텍스트
        label = f"{block_id}"

        # 텍스트 배경 (가독성 향상)
        (text_w, text_h), baseline = cv2.getTextSize(
            label,
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            1
        )

        # 텍스트 위치 (좌상단)
        text_x = x_min + 2
        text_y = y_min + text_h + 2

        # 배경 사각형
        cv2.rectangle(
            vis_image,
            (text_x - 2, text_y - text_h - 2),
            (text_x + text_w + 2, text_y + baseline),
            (255, 255, 255),
            -1
        )

        # 텍스트
        cv2.putText(
            vis_image,
            label,
            (text_x, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1,
            cv2.LINE_AA
        )

    # 저장
    success = imwrite_unicode(output_path, vis_image)

    if success:
        print(f"[완료] 시각화 이미지 저장: {output_path}")
    else:
        print(f"[오류] 저장 실패: {output_path}")


def main():
    print("=" * 70)
    print("test.pdf 블록 검출 결과 시각화")
    print("=" * 70)
    print()

    # Config 로드
    config = Config.load()

    # 경로 설정
    doc_id = "test"
    image_path = config.DOCUMENTS_DIR / doc_id / "pages" / "page_0000.png"
    json_path = config.DOCUMENTS_DIR / doc_id / "blocks" / "page_0000_blocks.json"
    output_path = config.DATASET_ROOT / "test_result_visualization_v_kernel_improved.png"

    # 파일 존재 확인
    if not image_path.exists():
        print(f"[오류] 이미지가 없습니다: {image_path}")
        return

    if not json_path.exists():
        print(f"[오류] JSON이 없습니다: {json_path}")
        return

    print(f"이미지: {image_path}")
    print(f"JSON: {json_path}")
    print(f"출력: {output_path}")
    print()

    # 시각화
    visualize_blocks(image_path, json_path, output_path)

    print()
    print("=" * 70)
    print("완료!")
    print("=" * 70)


if __name__ == "__main__":
    main()
