"""
다층 스케일 블록 검출기

여러 커널 크기로 검출한 결과를 병합하여
모든 크기의 블록을 빠짐없이 검출
"""
import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional

from config import Config
from data_models import BoundingBox, Block, Column


class MultiscaleAnalyzer:
    """다층 스케일 블록 검출기"""

    def __init__(self, config: Config):
        """
        Args:
            config: Config 인스턴스
        """
        self.config = config

        # 5단계 스케일 정의 (정밀 모드 + 세로 기호 전용)
        # ultra_small 스케일로 번호 동그라미, 작은 답지 박스 등 검출
        # v_kernel 원복: 일반 텍스트는 원래대로, 특수 케이스만 별도 처리
        self.scales = [
            # 일반 텍스트/수식 블록 (v_kernel 원복)
            {"name": "large", "h_kernel": 15, "v_kernel": 2, "min_size": 400},       # v: 원복 6→2
            {"name": "medium", "h_kernel": 10, "v_kernel": 2, "min_size": 250},     # v: 원복 4→2
            {"name": "small", "h_kernel": 6, "v_kernel": 1, "min_size": 150},       # v: 원복 3→1
            {"name": "ultra_small", "h_kernel": 4, "v_kernel": 1, "min_size": 50},  # v: 원복 2→1

            # 작은 기호 전용 스케일 (-, =, 지수 등)
            # Threshold=200, min_size=4 (2x2)로 157개 tiny 기호 검출
            {"name": "tiny_symbols", "h_kernel": 3, "v_kernel": 1, "min_size": 4},  # 매우 작은 기호

            # 세로로 긴 기호 전용 스케일 (인테그랄 ∫, 시그마 Σ, 파이 Π 등)
            # v_kernel=30 (최적값: 인테그랄 7개 검출, 부작용 없음)
            # v=35/50 테스트 결과 오히려 검출 감소 + 과도 병합 발생 (상세: docs/v_kernel_final_analysis.md)
            {"name": "vertical_tall", "h_kernel": 3, "v_kernel": 30, "min_size": 100},  # h작게, v크게
        ]

    def detect_all_blocks(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        columns: List[Column]
    ) -> List[BoundingBox]:
        """
        모든 스케일에서 블록 검출 후 병합 (후처리 포함)

        Args:
            image: 원본 이미지
            mask: 이진 마스크 (흰색 배경 제거 완료)
            columns: 컬럼 정보

        Returns:
            병합된 BoundingBox 리스트
        """
        print("\n[다층 스케일 분석 시작]")

        blocks_by_scale = {}

        # 각 스케일에서 블록 검출
        for scale in self.scales:
            scale_name = scale["name"]
            h_kernel = scale["h_kernel"]
            v_kernel = scale["v_kernel"]
            min_size = scale["min_size"]

            print(f"  스케일 '{scale_name}' (h={h_kernel}, v={v_kernel}) 검출 중...")

            blocks = self._detect_at_scale(
                mask,
                h_kernel,
                v_kernel,
                min_size,
                scale_name  # 스케일 이름 전달
            )

            blocks_by_scale[scale_name] = blocks
            print(f"    → {len(blocks)}개 블록 검출")

        # NMS 병합
        print(f"\n  블록 병합 중...")
        merged_blocks = self._merge_with_hierarchy(blocks_by_scale)
        print(f"    → NMS 병합 후: {len(merged_blocks)}개 블록")

        # 후처리: 세로 조각 병합 (인테그랄 등)
        print(f"\n  세로 조각 병합 중...")
        final_blocks = self._merge_vertical_fragments(
            merged_blocks,
            mask=mask,
            max_gap=100,  # 50 -> 100으로 증가 (실제 조각 간격 최대 99px)
            max_width=30
        )
        print(f"    → 최종: {len(final_blocks)}개 블록")

        return final_blocks

    def _detect_at_scale(
        self,
        mask: np.ndarray,
        h_kernel: int,
        v_kernel: int,
        min_size: int,
        scale_name: str = ""
    ) -> List[BoundingBox]:
        """
        특정 스케일에서 블록 검출

        Args:
            mask: 이진 마스크
            h_kernel: 수평 커널 크기
            v_kernel: 수직 커널 크기
            min_size: 최소 블록 크기
            scale_name: 스케일 이름 (특별 처리용)

        Returns:
            BoundingBox 리스트
        """
        # 1. 수평 연결
        h_kernel_mat = cv2.getStructuringElement(cv2.MORPH_RECT, (h_kernel, 1))
        h_closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel_mat)

        # 2. 수직 연결
        v_kernel_mat = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_kernel))
        v_closed = cv2.morphologyEx(h_closed, cv2.MORPH_CLOSE, v_kernel_mat)

        # 3. 노이즈 제거
        final_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        mask_cleaned = cv2.morphologyEx(v_closed, cv2.MORPH_OPEN, final_kernel)

        # 4. 컴포넌트 검출
        contours, _ = cv2.findContours(
            mask_cleaned,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        # 5. BoundingBox 추출
        bboxes = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)

            # 최소 크기 필터
            if w * h < min_size:
                continue

            bbox = BoundingBox(x, y, x + w, y + h)
            bboxes.append(bbox)

        # vertical_tall 스케일 특별 처리: 세로로 긴 블록만 유지
        if scale_name == "vertical_tall":
            bboxes = self._filter_vertical_tall_blocks(bboxes)

        return bboxes

    def _filter_vertical_tall_blocks(self, bboxes: List[BoundingBox]) -> List[BoundingBox]:
        """
        vertical_tall 스케일에서 검출된 블록 중
        실제로 세로로 긴 블록만 유지

        기준:
        - aspect ratio < 0.5 (높이가 너비의 2배 이상)
        - 높이 >= 20px (완화됨: 인테그랄 조각 포함)
        - 너비 <= 30px
        - 페이지 구분선 제외 (너무 긴 것)

        Args:
            bboxes: 검출된 BoundingBox 리스트

        Returns:
            필터링된 BoundingBox 리스트
        """
        filtered = []
        filtered_out_count = 0

        for bbox in bboxes:
            width = bbox.width
            height = bbox.height

            if height == 0:
                continue

            aspect_ratio = width / height

            # 세로로 긴 블록만 유지
            # 조건: aspect ratio < 0.5, 높이 >= 10px (추가 완화), 너비 <= 30px, 높이 <= 200px
            if (aspect_ratio < 0.5 and
                height >= 10 and  # 20 → 10으로 추가 완화
                width <= 30 and
                height <= 200):  # 페이지 구분선 제외
                filtered.append(bbox)
            else:
                filtered_out_count += 1

        if filtered_out_count > 0:
            print(f"      [vertical_tall 필터] {filtered_out_count}개 제외, {len(filtered)}개 유지")

        return filtered

    def _calculate_iou(
        self,
        bbox1: BoundingBox,
        bbox2: BoundingBox
    ) -> float:
        """
        두 박스의 IoU (Intersection over Union) 계산

        Args:
            bbox1: 첫 번째 BoundingBox
            bbox2: 두 번째 BoundingBox

        Returns:
            IoU 값 (0.0 ~ 1.0)
        """
        # 교집합 영역
        x_min = max(bbox1.x_min, bbox2.x_min)
        y_min = max(bbox1.y_min, bbox2.y_min)
        x_max = min(bbox1.x_max, bbox2.x_max)
        y_max = min(bbox1.y_max, bbox2.y_max)

        if x_max < x_min or y_max < y_min:
            return 0.0  # 겹치지 않음

        intersection = (x_max - x_min) * (y_max - y_min)

        # 합집합 영역
        area1 = bbox1.area
        area2 = bbox2.area
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0.0

    def _is_duplicate(
        self,
        bbox1: BoundingBox,
        bbox2: BoundingBox,
        iou_threshold: float = 0.85
    ) -> bool:
        """
        두 블록이 중복인지 판단

        Args:
            bbox1: 첫 번째 BoundingBox
            bbox2: 두 번째 BoundingBox
            iou_threshold: IoU 임계값 (기본 0.85)

        Returns:
            중복 여부
        """
        iou = self._calculate_iou(bbox1, bbox2)
        return iou > iou_threshold

    def _merge_with_hierarchy(
        self,
        blocks_by_scale: Dict[str, List[BoundingBox]],
        iou_threshold: float = 0.80
    ) -> List[BoundingBox]:
        """
        계층 구조를 고려한 블록 병합 (NMS 방식)

        전략:
        1. 작은 스케일부터 수집 (tiny_symbols → ultra_small → small → medium → large → vertical_tall)
        2. 면적 기준 정렬 (작은 것부터)
        3. NMS로 중복 제거 (IoU > iou_threshold, 0.80으로 상향)

        Args:
            blocks_by_scale: 스케일별 블록 딕셔너리
            iou_threshold: 중복 판단 IoU 임계값 (기본 0.80, 작은 기호 보호)

        Returns:
            병합된 BoundingBox 리스트
        """
        all_blocks = []

        # 1. 작은 스케일부터 수집 (세밀한 블록 우선, tiny_symbols 추가)
        for scale_name in ["tiny_symbols", "ultra_small", "small", "medium", "large", "vertical_tall"]:
            if scale_name not in blocks_by_scale:
                continue

            for bbox in blocks_by_scale[scale_name]:
                all_blocks.append({
                    "bbox": bbox,
                    "scale": scale_name,
                    "area": bbox.area
                })

        # 2. 면적 기준 정렬 (작은 것부터 - 세밀한 블록 우선)
        all_blocks.sort(key=lambda x: x["area"])

        # 3. NMS (Non-Maximum Suppression) 방식 중복 제거
        unique_blocks = []

        for block_info in all_blocks:
            bbox = block_info["bbox"]

            # 이미 추가된 블록들과 비교
            should_add = True

            for existing_info in unique_blocks:
                existing_bbox = existing_info["bbox"]
                iou = self._calculate_iou(bbox, existing_bbox)

                # 중복 판단: IoU가 높으면 제거
                if iou > iou_threshold:
                    should_add = False
                    break

            if should_add:
                unique_blocks.append(block_info)

        # 4. BoundingBox만 추출 후 Y 좌표 기준 정렬
        result = [b["bbox"] for b in unique_blocks]
        result.sort(key=lambda b: b.y_min)

        print(f"    병합 전: {len(all_blocks)}개 → 병합 후: {len(result)}개 (IoU threshold={iou_threshold})")

        return result

    def _merge_bboxes(self, bboxes: List[BoundingBox]) -> BoundingBox:
        """
        여러 BoundingBox를 하나로 병합

        Args:
            bboxes: 병합할 BoundingBox 리스트

        Returns:
            병합된 BoundingBox (모든 박스를 포함하는 최소 사각형)
        """
        x_min = min(b.x_min for b in bboxes)
        y_min = min(b.y_min for b in bboxes)
        x_max = max(b.x_max for b in bboxes)
        y_max = max(b.y_max for b in bboxes)

        return BoundingBox(x_min, y_min, x_max, y_max)

    def _merge_vertical_fragments(
        self,
        blocks: List[BoundingBox],
        mask: np.ndarray,
        max_gap: int = 100,  # 50 -> 100으로 증가 (실제 조각 간격 최대 99px)
        max_width: int = 30
    ) -> List[BoundingBox]:
        """
        세로로 가까운 얇은 블록들을 병합 (인테그랄 조각 연결)

        인테그랄 ∫ 기호는 상단 곡선 + 중간 수직선 + 하단 곡선으로 구성되며,
        각 부분 사이에 빈 공간이 있어 모폴로지 연산으로는 연결되지 않음.
        이 메서드는 세로로 인접한 얇은 블록들을 후처리로 병합함.

        Args:
            blocks: 블록 리스트
            mask: 이진 마스크 (검증용)
            max_gap: 최대 Y 간격 (픽셀)
            max_width: 최대 너비 (픽셀, 이보다 얇은 블록만 대상)

        Returns:
            병합된 블록 리스트
        """
        # 1. 후보 블록 필터링 (얇고 세로로 긴 블록)
        candidates = []
        non_candidates = []

        for bbox in blocks:
            width = bbox.width
            height = bbox.height

            if height == 0:
                non_candidates.append(bbox)
                continue

            aspect_ratio = width / height

            # 조건: 얇고 세로로 긴 블록 (height >= 10으로 완화)
            if width <= max_width and aspect_ratio < 0.5 and height >= 10:
                candidates.append(bbox)
            else:
                non_candidates.append(bbox)

        if not candidates:
            return blocks

        print(f"    후보 블록: {len(candidates)}개 (얇고 세로로 긴 블록)")

        # 2. Y 좌표 기준 정렬
        candidates.sort(key=lambda b: b.y_min)

        # 3. 연속된 블록 그룹핑
        groups = []
        current_group = [candidates[0]]

        for i in range(1, len(candidates)):
            prev = current_group[-1]
            curr = candidates[i]

            # X 범위 겹침 확인 (같은 수직선상)
            x_overlap = not (curr.x_max < prev.x_min or curr.x_min > prev.x_max)

            # 중심 X 좌표 차이 확인 (인테그랄 상/하단 곡선은 X가 약간 다를 수 있음)
            prev_center_x = (prev.x_min + prev.x_max) / 2
            curr_center_x = (curr.x_min + curr.x_max) / 2
            center_x_diff = abs(curr_center_x - prev_center_x)
            x_near = center_x_diff <= 30  # 중심 X가 30px 이내 (20 -> 30)

            # Y 간격 확인 (음수 = 겹침, 양수 = 간격)
            y_gap = curr.y_min - prev.y_max

            # 조건: (X 겹침 OR X 근접) + Y 간격 허용
            if (x_overlap or x_near) and y_gap <= max_gap:
                # 같은 그룹에 추가 (겹치는 경우도 포함)
                current_group.append(curr)
            else:
                # 현재 그룹 저장하고 새 그룹 시작
                groups.append(current_group)
                current_group = [curr]

        # 마지막 그룹 저장
        groups.append(current_group)

        # 4. 그룹 병합 (2개 이상 조각만)
        merged_fragments = []
        standalone_fragments = []

        for group in groups:
            if len(group) >= 2:
                # 병합
                merged_bbox = self._merge_bboxes(group)

                # 병합 후 검증: 세로로 긴지 확인
                merged_width = merged_bbox.width
                merged_height = merged_bbox.height

                if merged_height > 0:
                    merged_aspect = merged_width / merged_height

                    if merged_aspect < 0.5 and merged_height >= 40:
                        merged_fragments.append(merged_bbox)
                        print(f"      [OK] 병합: {len(group)}개 조각 -> "
                              f"{merged_width}x{merged_height}px (aspect={merged_aspect:.3f})")
                    else:
                        # 병합 결과가 조건 불만족 → 원본 유지
                        standalone_fragments.extend(group)
            else:
                standalone_fragments.extend(group)

        # 5. 최종 결과: 병합된 블록 + 독립 조각 + 비후보 블록
        result = non_candidates + merged_fragments + standalone_fragments
        result.sort(key=lambda b: b.y_min)

        if merged_fragments:
            print(f"    → {len(merged_fragments)}개 인테그랄 블록 생성!")

        # 6. Distance Transform 기반 BBox 확장 (후처리)
        print(f"    Distance Transform 기반 확장 적용 중...")
        expanded_result = self._apply_distance_transform_expansion(result, mask)

        return expanded_result

    def _apply_distance_transform_expansion(
        self,
        blocks: List[BoundingBox],
        mask: np.ndarray,
        max_distance: int = 60,
        min_pixel_density: float = 0.01
    ) -> List[BoundingBox]:
        """
        Distance Transform을 사용하여 세로 블록 bbox 확장 (후처리)

        Args:
            blocks: 블록 리스트
            mask: 이진 마스크
            max_distance: 확장 최대 거리 (픽셀)
            min_pixel_density: 확장 영역의 최소 픽셀 밀도

        Returns:
            확장된 블록 리스트
        """
        expanded_blocks = []
        expand_count = 0

        for block in blocks:
            # 세로로 긴 블록만 확장 대상 (aspect < 0.5)
            if block.height > 0:
                aspect = block.width / block.height

                if aspect < 0.5 and block.height >= 40:
                    # 확장 시도
                    expanded_bbox = self._expand_bbox_distance_transform(
                        mask,
                        (block.x_min, block.y_min, block.x_max, block.y_max),
                        max_distance,
                        min_pixel_density
                    )

                    ex_min, ey_min, ex_max, ey_max = expanded_bbox

                    # 확장이 발생했는지 확인
                    if (ey_min < block.y_min or ey_max > block.y_max):
                        expand_count += 1

                    # 새 블록 생성
                    expanded_blocks.append(BoundingBox(
                        x_min=ex_min,
                        y_min=ey_min,
                        x_max=ex_max,
                        y_max=ey_max
                    ))
                else:
                    # 확장 대상 아님, 원본 유지
                    expanded_blocks.append(block)
            else:
                expanded_blocks.append(block)

        if expand_count > 0:
            print(f"      -> {expand_count}개 블록 확장 완료 (Distance Transform)")

        return expanded_blocks

    def _expand_bbox_distance_transform(
        self,
        mask: np.ndarray,
        bbox: tuple,
        max_distance: int,
        min_pixel_density: float
    ) -> tuple:
        """
        Distance Transform을 사용하여 단일 bbox 확장

        Args:
            mask: 이진 마스크
            bbox: (x_min, y_min, x_max, y_max)
            max_distance: 확장 최대 거리
            min_pixel_density: 최소 픽셀 밀도

        Returns:
            확장된 bbox (x_min, y_min, x_max, y_max)
        """
        x_min, y_min, x_max, y_max = bbox
        height, width = mask.shape
        bbox_width = x_max - x_min

        # 확장 범위
        extend_top = max(0, y_min - max_distance)
        extend_bottom = min(height, y_max + max_distance)

        # 위쪽 확장 (연속 빈 행을 만날 때까지)
        new_y_min = y_min
        if extend_top < y_min:
            roi = mask[extend_top:y_min, x_min:x_max]
            if roi.size > 0:
                row_sums = np.sum(roi > 0, axis=1)
                # 아래에서 위로 스캔
                consecutive_empty = 0
                for i in range(len(row_sums) - 1, -1, -1):
                    if row_sums[i] > 0:
                        density = row_sums[i] / bbox_width if bbox_width > 0 else 0
                        if density >= min_pixel_density:
                            new_y_min = extend_top + i
                            consecutive_empty = 0  # 리셋
                        else:
                            consecutive_empty += 1
                    else:
                        consecutive_empty += 1

                    # 연속 15행 이상 빈 행이면 중단 (인테그랄은 sparse함)
                    if consecutive_empty >= 15:
                        break

        # 아래쪽 확장 (연속 빈 행을 만날 때까지)
        new_y_max = y_max
        if extend_bottom > y_max:
            roi = mask[y_max:extend_bottom, x_min:x_max]
            if roi.size > 0:
                row_sums = np.sum(roi > 0, axis=1)
                # 위에서 아래로 스캔
                consecutive_empty = 0
                for i in range(len(row_sums)):
                    if row_sums[i] > 0:
                        density = row_sums[i] / bbox_width if bbox_width > 0 else 0
                        if density >= min_pixel_density:
                            new_y_max = y_max + i + 1
                            consecutive_empty = 0  # 리셋
                        else:
                            consecutive_empty += 1
                    else:
                        consecutive_empty += 1

                    # 연속 15행 이상 빈 행이면 중단
                    if consecutive_empty >= 15:
                        break

        # X 방향은 최소한만 확장 (5px 이내)
        extend_left = max(0, x_min - 5)
        extend_right = min(width, x_max + 5)

        new_x_min = x_min
        if extend_left < x_min:
            roi = mask[new_y_min:new_y_max, extend_left:x_min]
            if roi.size > 0 and np.sum(roi > 0) > 0:
                col_sums = np.sum(roi > 0, axis=0)
                for i in range(len(col_sums) - 1, -1, -1):
                    if col_sums[i] > 0:
                        new_x_min = extend_left + i
                        break

        new_x_max = x_max
        if extend_right > x_max:
            roi = mask[new_y_min:new_y_max, x_max:extend_right]
            if roi.size > 0 and np.sum(roi > 0) > 0:
                col_sums = np.sum(roi > 0, axis=0)
                for i in range(len(col_sums)):
                    if col_sums[i] > 0:
                        new_x_max = x_max + i + 1

        return (new_x_min, new_y_min, new_x_max, new_y_max)
