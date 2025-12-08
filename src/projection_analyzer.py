"""
투영 기반 분석 모듈
수평/수직 투영을 통한 텍스트 라인 검출
"""
from pathlib import Path
from typing import List, Tuple, Dict
import numpy as np
import cv2
from data_models import BoundingBox


class ProjectionAnalyzer:
    """투영 기반 텍스트 라인 분석"""

    def __init__(self, min_line_height: int = 10, min_peak_value: int = 50):
        """
        Args:
            min_line_height: 최소 라인 높이 (픽셀)
            min_peak_value: 피크로 인식할 최소 픽셀 합계
        """
        self.min_line_height = min_line_height
        self.min_peak_value = min_peak_value

    def analyze_horizontal_projection(
        self,
        mask: np.ndarray,
        column_bbox: BoundingBox = None
    ) -> np.ndarray:
        """
        수평 투영 계산 (각 행의 검은 픽셀 합계)

        Args:
            mask: 이진 마스크
            column_bbox: 분석할 영역 (None이면 전체)

        Returns:
            수평 투영 배열 (높이 크기)
        """
        if column_bbox:
            # 특정 영역만 추출
            roi = mask[
                column_bbox.y_min:column_bbox.y_max,
                column_bbox.x_min:column_bbox.x_max
            ]
        else:
            roi = mask

        # 각 행의 검은 픽셀 수 계산
        h_projection = np.sum(roi > 0, axis=1)

        return h_projection

    def detect_text_lines(
        self,
        mask: np.ndarray,
        column_bbox: BoundingBox = None
    ) -> List[Dict]:
        """
        투영 분석으로 텍스트 라인 검출

        Args:
            mask: 이진 마스크
            column_bbox: 분석할 컬럼 영역

        Returns:
            라인 정보 리스트 [{'y_min': int, 'y_max': int, 'intensity': float}, ...]
        """
        # 수평 투영 계산
        h_projection = self.analyze_horizontal_projection(mask, column_bbox)

        # 오프셋 계산 (column_bbox가 있는 경우)
        y_offset = column_bbox.y_min if column_bbox else 0
        x_min = column_bbox.x_min if column_bbox else 0
        x_max = column_bbox.x_max if column_bbox else mask.shape[1]

        # 피크 검출 (간단한 방법)
        lines = self._find_text_line_regions(h_projection, y_offset, x_min, x_max)

        return lines

    def _find_text_line_regions(
        self,
        projection: np.ndarray,
        y_offset: int,
        x_min: int,
        x_max: int
    ) -> List[Dict]:
        """
        투영 배열에서 텍스트 라인 영역 찾기

        Args:
            projection: 수평 투영 배열
            y_offset: Y축 오프셋
            x_min: X 시작 좌표
            x_max: X 끝 좌표

        Returns:
            라인 영역 리스트
        """
        lines = []
        in_line = False
        line_start = 0
        line_peak_value = 0

        for y, value in enumerate(projection):
            # 라인 시작 조건
            if value > self.min_peak_value and not in_line:
                line_start = y
                line_peak_value = value
                in_line = True

            # 라인 내부에서 피크 값 갱신
            elif value > self.min_peak_value and in_line:
                line_peak_value = max(line_peak_value, value)

            # 라인 끝 조건
            elif value <= self.min_peak_value and in_line:
                # 최소 높이 체크
                line_height = y - line_start
                if line_height >= self.min_line_height:
                    # 라인 위아래로 약간 확장 (여백 포함)
                    y_start = max(0, line_start - 2)
                    y_end = min(len(projection), y + 2)

                    lines.append({
                        'y_min': y_start + y_offset,
                        'y_max': y_end + y_offset,
                        'x_min': x_min,
                        'x_max': x_max,
                        'intensity': float(line_peak_value),
                        'height': y_end - y_start
                    })

                in_line = False
                line_peak_value = 0

        # 마지막 라인 처리
        if in_line:
            line_height = len(projection) - line_start
            if line_height >= self.min_line_height:
                y_start = max(0, line_start - 2)
                y_end = len(projection)

                lines.append({
                    'y_min': y_start + y_offset,
                    'y_max': y_end + y_offset,
                    'x_min': x_min,
                    'x_max': x_max,
                    'intensity': float(line_peak_value),
                    'height': y_end - y_start
                })

        return lines

    def detect_blocks_in_line(
        self,
        mask: np.ndarray,
        line_region: Dict
    ) -> List[BoundingBox]:
        """
        라인 내에서 블록 검출 (수직 투영 기반)

        Args:
            mask: 이진 마스크
            line_region: 라인 영역 정보

        Returns:
            블록 바운딩 박스 리스트
        """
        # 라인 영역 추출
        line_mask = mask[
            line_region['y_min']:line_region['y_max'],
            line_region['x_min']:line_region['x_max']
        ]

        # 수직 투영 (각 열의 검은 픽셀 수)
        v_projection = np.sum(line_mask > 0, axis=0)

        # 연속된 비어있지 않은 구간 찾기
        blocks = []
        in_block = False
        block_start = 0
        min_gap = 5  # 최소 간격 (픽셀)

        for x, value in enumerate(v_projection):
            # 블록 시작
            if value > 0 and not in_block:
                block_start = x
                in_block = True

            # 블록 끝 (간격이 min_gap 이상)
            elif value == 0 and in_block:
                # 연속된 빈 구간 확인
                gap_count = 0
                for check_x in range(x, min(x + min_gap, len(v_projection))):
                    if v_projection[check_x] == 0:
                        gap_count += 1
                    else:
                        break

                if gap_count >= min_gap or x >= len(v_projection) - 1:
                    # 블록 확정
                    bbox = BoundingBox(
                        x_min=line_region['x_min'] + block_start,
                        y_min=line_region['y_min'],
                        x_max=line_region['x_min'] + x,
                        y_max=line_region['y_max']
                    )
                    blocks.append(bbox)
                    in_block = False

        # 마지막 블록 처리
        if in_block:
            bbox = BoundingBox(
                x_min=line_region['x_min'] + block_start,
                y_min=line_region['y_min'],
                x_max=line_region['x_max'],
                y_max=line_region['y_max']
            )
            blocks.append(bbox)

        return blocks

    def visualize_projection(
        self,
        projection: np.ndarray,
        output_path: Path,
        title: str = "Horizontal Projection"
    ):
        """
        투영 결과 시각화

        Args:
            projection: 투영 배열
            output_path: 저장 경로
            title: 그래프 제목
        """
        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 8))
        plt.plot(projection, range(len(projection)), linewidth=1)
        plt.gca().invert_yaxis()
        plt.xlabel('Pixel Count')
        plt.ylabel('Y Position (px)')
        plt.title(title)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(str(output_path), dpi=150)
        plt.close()


# 직접 실행 시 테스트
if __name__ == "__main__":
    from config import Config
    import cv2

    config = Config.load()
    analyzer = ProjectionAnalyzer()

    # 테스트 이미지 로드
    test_image_path = config.DOCUMENTS_DIR / "test_doc" / "pages" / "page_0000.png"

    if test_image_path.exists():
        print(f"테스트 이미지: {test_image_path}")

        # 이미지 로드
        image = cv2.imread(str(test_image_path))
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 이진화
        _, mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)

        print(f"이미지 크기: {image.shape[1]} x {image.shape[0]}")

        # 수평 투영 계산
        h_projection = analyzer.analyze_horizontal_projection(mask)
        print(f"\n수평 투영 계산 완료: {len(h_projection)}개 행")

        # 텍스트 라인 검출
        lines = analyzer.detect_text_lines(mask)
        print(f"\n검출된 라인: {len(lines)}개")

        for i, line in enumerate(lines[:5]):
            print(f"  Line {i+1}: Y={line['y_min']}-{line['y_max']}, "
                  f"높이={line['height']}px, intensity={line['intensity']:.0f}")

        if len(lines) > 5:
            print(f"  ... 외 {len(lines) - 5}개")

        # 투영 시각화
        output_path = config.DATASET_ROOT / "test_projection.png"
        analyzer.visualize_projection(h_projection, output_path)
        print(f"\n투영 시각화 저장: {output_path}")

    else:
        print(f"[!] 테스트 이미지가 없습니다: {test_image_path}")
        print("\n테스트를 건너뜁니다. (정상 동작)")
