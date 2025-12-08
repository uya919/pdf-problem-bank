"""
밀집도 기반 블록 검출 알고리즘
Priority 1: 투영 분석 통합
"""
from pathlib import Path
from typing import List
import cv2
import numpy as np
from config import Config
from data_models import Block, Column, BoundingBox
from projection_analyzer import ProjectionAnalyzer


class DensityAnalyzer:
    """밀집도 기반 블록 검출"""

    def __init__(self, config: Config, use_projection: bool = False, use_multiscale: bool = False):
        """
        Args:
            config: Config 인스턴스
            use_projection: 투영 분석 사용 여부 (Priority 1)
            use_multiscale: 다층 스케일 사용 여부 (False 권장, 단순 방식이 더 효과적)
        """
        self.config = config
        self.white_threshold = config.WHITE_THRESHOLD
        self.min_block_size = config.MIN_BLOCK_SIZE
        self.use_projection = use_projection
        self.use_multiscale = use_multiscale

        # Priority 1: 투영 분석기
        if use_projection:
            self.projection = ProjectionAnalyzer(
                min_line_height=10,
                min_peak_value=50
            )

        # 다층 스케일 분석기
        if use_multiscale:
            from multiscale_analyzer import MultiscaleAnalyzer
            self.multiscale = MultiscaleAnalyzer(config)

    def analyze_page(self, image: np.ndarray) -> List[Block]:
        """
        페이지 이미지를 분석하여 블록 리스트 반환

        Args:
            image: 페이지 이미지 (numpy array, BGR 형식)

        Returns:
            검출된 Block 리스트
        """
        height, width = image.shape[:2]

        # 1단계: 흰색 배경 제거
        mask = self._remove_white_background(image)

        # 2단계: 컬럼 검출
        columns = self._detect_columns(mask, width)

        # 3단계: 블록 검출 (다층 스케일 > 투영 분석 > 모폴로지)
        if self.use_multiscale:
            # 다층 스케일: 모든 크기의 블록을 빠짐없이 검출
            bboxes = self.multiscale.detect_all_blocks(image, mask, columns)
        elif self.use_projection:
            # Priority 1: 투영 기반 라인 검출 → 라인별 블록 검출
            bboxes = self._find_blocks_with_projection(mask, columns)
        else:
            # Priority 0.5: 모폴로지 기반 블록 검출
            bboxes = self._find_blocks(mask)

        # 4단계: Block 객체 생성 및 필터링
        blocks = []
        page_area = width * height

        for idx, bbox in enumerate(bboxes):
            block_area = bbox.area
            block_width = bbox.width
            block_height = bbox.height

            # 거대 블록 필터링 강화 (50% → 20%)
            if block_area > page_area * 0.20:
                print(f"  [필터링] 블록 {idx+1} 너무 큼: {block_area}px² (페이지의 {block_area/page_area*100:.1f}%)")
                continue

            # 종횡비 필터링 추가 (극단적인 종횡비 제거)
            if block_height > 0:
                aspect_ratio = block_width / block_height

                # 너무 가로로 긴 블록 또는 너무 세로로 긴 블록 제거
                # 0.03 → 0.01로 완화 (인테그랄 조각은 0.01~0.03 범위)
                if aspect_ratio < 0.01 or aspect_ratio > 30:
                    print(f"  [필터링] 블록 {idx+1} 비정상 종횡비: {aspect_ratio:.2f} ({block_width}×{block_height})")
                    continue

            # 밀집도 계산
            density = self._calculate_density(mask, bbox)

            # 저밀집도 블록 필터링 (밀집도 5% 미만)
            if density < 0.05:
                print(f"  [필터링] 블록 {idx+1} 밀집도 너무 낮음: {density:.3f}")
                continue

            # 컬럼 할당
            center_x = (bbox.x_min + bbox.x_max) // 2
            column_id = self._assign_column(center_x, columns)

            block = Block(
                block_id=len(blocks) + 1,  # 필터링 후 재번호
                column=column_id,
                bbox=bbox,
                pixel_density=density
            )
            blocks.append(block)

        return blocks

    def _remove_white_background(self, image: np.ndarray) -> np.ndarray:
        """
        흰색 배경 제거

        Args:
            image: 원본 이미지 (BGR)

        Returns:
            이진 마스크 (0 또는 255)
        """
        # BGR을 그레이스케일로 변환
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 임계값보다 어두운 픽셀만 선택 (흰색이 아닌 부분)
        _, mask = cv2.threshold(
            gray,
            self.white_threshold,
            255,
            cv2.THRESH_BINARY_INV
        )

        return mask

    def _detect_columns(self, mask: np.ndarray, width: int) -> List[Column]:
        """
        컬럼 경계 검출 (간단한 2단 분할)

        Args:
            mask: 이진 마스크
            width: 이미지 너비

        Returns:
            Column 리스트
        """
        # 수평 투영 (각 열의 검은 픽셀 개수)
        h_projection = np.sum(mask, axis=0)

        # 중간 지점 찾기 (2단 레이아웃 가정)
        mid_point = width // 2

        # 중간 근처에서 가장 적은 픽셀을 가진 지점 찾기
        search_range = width // 10  # ±10% 범위 내에서 검색
        start = max(0, mid_point - search_range)
        end = min(width, mid_point + search_range)

        min_idx = start + np.argmin(h_projection[start:end])

        # 컬럼 정의
        columns = [
            Column(id="L", x_min=0, x_max=min_idx),
            Column(id="R", x_min=min_idx, x_max=width)
        ]

        return columns

    def _find_blocks(self, mask: np.ndarray) -> List[BoundingBox]:
        """
        블록 바운딩 박스 검출 (단순 Connected Components 방식)

        Args:
            mask: 이진 마스크

        Returns:
            BoundingBox 리스트

        Note:
            테스트 스크립트와 동일한 방식 사용 (915개 검출)
            - 모폴로지 연산 없이 직접 Connected Components 사용
            - 작은 기호(-, =, 지수) 검출을 위해 단순화
        """
        # Connected Components Analysis (테스트 스크립트 방식)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            mask, connectivity=8
        )

        bboxes = []
        # 배경(label=0) 제외하고 처리
        for i in range(1, num_labels):
            x, y, w, h, area = stats[i]

            # 최소 크기 필터링 (AND 조건으로 변경)
            # 가로와 세로가 모두 작을 때만 노이즈로 간주하고 제거
            # 예: 빼기(-, 20x3)는 가로가 크므로 유지됨
            # 예: 점(., 3x3)은 둘 다 작으므로 제거됨
            if w < self.min_block_size and h < self.min_block_size:
                continue

            # 극단적으로 얇은 노이즈 제거 (1px 이하)
            if w <= 1 or h <= 1:
                continue

            bbox = BoundingBox(x, y, x + w, y + h)
            bboxes.append(bbox)

        # Y 좌표 기준으로 정렬 (위에서 아래로)
        bboxes.sort(key=lambda b: b.y_min)

        return bboxes

    def _find_blocks_with_projection(
        self,
        mask: np.ndarray,
        columns: List[Column]
    ) -> List[BoundingBox]:
        """
        투영 분석 기반 블록 검출 (Priority 1)

        Args:
            mask: 이진 마스크
            columns: 컬럼 리스트

        Returns:
            BoundingBox 리스트
        """
        all_blocks = []

        for column in columns:
            # 컬럼 영역을 BoundingBox로 변환
            column_bbox = BoundingBox(
                x_min=column.x_min,
                y_min=0,
                x_max=column.x_max,
                y_max=mask.shape[0]
            )

            # 텍스트 라인 검출
            lines = self.projection.detect_text_lines(mask, column_bbox)

            # 각 라인 내에서 블록 검출
            for line in lines:
                blocks = self.projection.detect_blocks_in_line(mask, line)
                all_blocks.extend(blocks)

        # Y 좌표 기준 정렬
        all_blocks.sort(key=lambda b: b.y_min)

        return all_blocks

    def _calculate_density(self, mask: np.ndarray, bbox: BoundingBox) -> float:
        """
        블록 내 픽셀 밀집도 계산

        Args:
            mask: 이진 마스크
            bbox: 바운딩 박스

        Returns:
            밀집도 (0.0 ~ 1.0)
        """
        # ROI 추출
        roi = mask[bbox.y_min:bbox.y_max, bbox.x_min:bbox.x_max]

        # 전체 픽셀 수
        total_pixels = bbox.area

        if total_pixels == 0:
            return 0.0

        # 검은 픽셀 수 (텍스트/이미지 부분)
        black_pixels = np.sum(roi > 0)

        # 밀집도 계산
        density = black_pixels / total_pixels

        return density

    def _assign_column(self, center_x: int, columns: List[Column]) -> str:
        """
        X 좌표에 따라 컬럼 할당

        Args:
            center_x: 블록의 중심 X 좌표
            columns: 컬럼 리스트

        Returns:
            컬럼 ID
        """
        for column in columns:
            if column.x_min <= center_x < column.x_max:
                return column.id

        # 기본값 (왼쪽)
        return columns[0].id if columns else "L"

    def visualize_blocks(
        self,
        image: np.ndarray,
        blocks: List[Block],
        output_path: Path
    ):
        """
        블록 검출 결과를 이미지에 그려서 저장

        Args:
            image: 원본 이미지
            blocks: 검출된 블록 리스트
            output_path: 저장 경로
        """
        result = image.copy()

        for block in blocks:
            bbox = block.bbox

            # 컬럼에 따라 색상 다르게
            color = (0, 255, 0) if block.column == "L" else (0, 0, 255)

            # 사각형 그리기
            cv2.rectangle(
                result,
                (bbox.x_min, bbox.y_min),
                (bbox.x_max, bbox.y_max),
                color,
                2
            )

            # 블록 ID 표시
            text = f"{block.block_id}"
            cv2.putText(
                result,
                text,
                (bbox.x_min, bbox.y_min - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 0, 0),
                1
            )

        # 저장
        cv2.imwrite(str(output_path), result)


# 직접 실행 시 테스트
if __name__ == "__main__":
    from config import Config

    config = Config.load()
    analyzer = DensityAnalyzer(config)

    # 테스트 이미지 경로
    test_image_path = config.DOCUMENTS_DIR / "test_doc" / "pages" / "page_0000.png"

    if test_image_path.exists():
        print(f"테스트 이미지 발견: {test_image_path}")

        # 이미지 로드
        image = cv2.imread(str(test_image_path))
        print(f"이미지 크기: {image.shape[1]} x {image.shape[0]}")

        # 블록 검출
        print("\n블록 검출 중...")
        blocks = analyzer.analyze_page(image)

        print(f"\n검출된 블록 개수: {len(blocks)}")
        for block in blocks[:5]:  # 처음 5개만 출력
            print(f"  Block {block.block_id}: column={block.column}, "
                  f"bbox={block.bbox.to_list()}, density={block.pixel_density:.3f}")

        if len(blocks) > 5:
            print(f"  ... 외 {len(blocks) - 5}개")

        # 시각화
        output_path = config.DATASET_ROOT / "test_blocks_visualization.png"
        analyzer.visualize_blocks(image, blocks, output_path)
        print(f"\n시각화 결과 저장: {output_path}")

    else:
        print(f"[!] 테스트 이미지가 없습니다: {test_image_path}")
        print(f"-> 먼저 pdf_processor.py를 실행하여 이미지를 생성하세요.")
        print("\n테스트를 건너뜁니다. (정상 동작)")
