"""
그룹 관리 로직 (Phase 3)

문제 그룹 생성, 수정, 삭제 및 이미지 크롭 기능
"""
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import json
import cv2
import numpy as np

from data_models import (
    BoundingBox, Block, ProblemGroup, GroupData, PageData
)
from utils import imwrite_unicode


class GroupingManager:
    """문제 그룹 관리 클래스"""

    def __init__(self, config):
        """
        Args:
            config: Config 인스턴스
        """
        self.config = config
        self.current_groups = {}  # page_key -> GroupData

    def create_group(
        self,
        page_data: PageData,
        selected_block_ids: List[int],
        column: str,
        existing_groups: Optional[List[ProblemGroup]] = None
    ) -> ProblemGroup:
        """
        새 그룹 생성

        Args:
            page_data: 페이지 데이터
            selected_block_ids: 선택된 블록 ID 목록
            column: 컬럼 ("L" or "R")
            existing_groups: 현재 페이지의 기존 그룹 목록 (ID 중복 방지용)

        Returns:
            생성된 그룹

        Raises:
            ValueError: 블록이 선택되지 않았거나 유효하지 않은 경우
        """
        if not selected_block_ids:
            raise ValueError("선택된 블록이 없습니다")

        # 그룹 ID 생성
        group_id = self._generate_group_id(column, existing_groups or [])

        # 전체 BBox 계산
        bbox = self._calculate_group_bbox(page_data, selected_block_ids)

        # 그룹 생성
        group = ProblemGroup(
            id=group_id,
            column=column,
            block_ids=selected_block_ids.copy(),
            bbox=bbox,
            created_at=datetime.now().isoformat(),
            created_by="user"
        )

        print(f"[GroupingManager] 새 그룹 생성: {group_id}, {len(selected_block_ids)}개 블록")

        return group

    def add_blocks_to_group(
        self,
        group: ProblemGroup,
        page_data: PageData,
        new_block_ids: List[int]
    ) -> ProblemGroup:
        """
        기존 그룹에 블록 추가

        Args:
            group: 기존 그룹
            page_data: 페이지 데이터
            new_block_ids: 추가할 블록 ID 목록

        Returns:
            업데이트된 그룹
        """
        # 중복 제거하고 추가
        all_block_ids = list(set(group.block_ids + new_block_ids))

        # BBox 재계산
        bbox = self._calculate_group_bbox(page_data, all_block_ids)

        # 새 그룹 생성 (불변성 유지)
        updated_group = ProblemGroup(
            id=group.id,
            column=group.column,
            block_ids=all_block_ids,
            bbox=bbox,
            created_at=group.created_at,
            created_by=group.created_by,
            notes=group.notes,
            crop_image_path=group.crop_image_path,
            metadata=group.metadata
        )

        print(f"[GroupingManager] 그룹 업데이트: {group.id}, {len(all_block_ids)}개 블록")

        return updated_group

    def remove_blocks_from_group(
        self,
        group: ProblemGroup,
        page_data: PageData,
        remove_block_ids: List[int]
    ) -> Optional[ProblemGroup]:
        """
        그룹에서 블록 제거

        Args:
            group: 기존 그룹
            page_data: 페이지 데이터
            remove_block_ids: 제거할 블록 ID 목록

        Returns:
            업데이트된 그룹 (블록이 하나도 남지 않으면 None)
        """
        remaining_ids = [bid for bid in group.block_ids if bid not in remove_block_ids]

        if not remaining_ids:
            print(f"[GroupingManager] 그룹 {group.id}의 모든 블록 제거됨")
            return None

        # BBox 재계산
        bbox = self._calculate_group_bbox(page_data, remaining_ids)

        updated_group = ProblemGroup(
            id=group.id,
            column=group.column,
            block_ids=remaining_ids,
            bbox=bbox,
            created_at=group.created_at,
            created_by=group.created_by,
            notes=group.notes,
            crop_image_path=group.crop_image_path,
            metadata=group.metadata
        )

        print(f"[GroupingManager] 그룹 업데이트: {group.id}, {len(remaining_ids)}개 블록 남음")

        return updated_group

    def crop_group_image(
        self,
        image: np.ndarray,
        group: ProblemGroup,
        output_dir: Path,
        document_id: str,
        page_index: int
    ) -> Path:
        """
        그룹 영역을 이미지로 크롭하여 저장

        Args:
            image: 원본 페이지 이미지
            group: 문제 그룹
            output_dir: 저장 디렉토리
            document_id: 문서 ID
            page_index: 페이지 번호

        Returns:
            저장된 이미지 경로

        Raises:
            ValueError: bbox가 None인 경우
        """
        if group.bbox is None:
            raise ValueError(f"그룹 {group.id}의 BBox가 없습니다")

        # BBox 영역 크롭
        bbox = group.bbox
        cropped = image[
            bbox.y_min:bbox.y_max,
            bbox.x_min:bbox.x_max
        ]

        # 파일명: {doc_id}_page{num}_{group_id}.png
        filename = f"{document_id}_page{page_index:04d}_{group.id}.png"
        output_path = output_dir / filename

        # 디렉토리 생성
        output_dir.mkdir(parents=True, exist_ok=True)

        # 이미지 저장 (한글 경로 지원)
        success = imwrite_unicode(output_path, cropped)

        if not success:
            raise IOError(f"이미지 저장 실패: {output_path}")

        print(f"[GroupingManager] 이미지 저장: {output_path}")

        return output_path

    def save_labels(
        self,
        group_data: GroupData,
        output_path: Path
    ) -> None:
        """
        라벨 JSON 저장

        Args:
            group_data: 그룹 데이터
            output_path: 저장 경로
        """
        # 디렉토리 생성
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # JSON 저장
        data = group_data.to_dict()

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"[GroupingManager] 라벨 저장: {output_path}")

    def load_labels(self, labels_path: Path) -> Optional[GroupData]:
        """
        라벨 JSON 로드

        Args:
            labels_path: JSON 파일 경로

        Returns:
            그룹 데이터 (파일이 없으면 None)
        """
        if not labels_path.exists():
            return None

        with open(labels_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        group_data = GroupData.from_dict(data)

        print(f"[GroupingManager] 라벨 로드: {labels_path}, {len(group_data.groups)}개 그룹")

        return group_data

    def _generate_group_id(self, column: str, existing_groups: List[ProblemGroup]) -> str:
        """
        컬럼 내 다음 그룹 ID 생성 (L1, L2, R1, R2 등)

        Args:
            column: 컬럼 ("L" or "R")
            existing_groups: 현재 페이지의 기존 그룹 목록

        Returns:
            그룹 ID
        """
        if not existing_groups:
            # 첫 그룹
            return f"{column}1"

        # 같은 컬럼의 기존 그룹 ID 확인
        existing_ids = [
            g.id for g in existing_groups
            if g.column == column
        ]

        # 다음 번호 계산
        max_num = 0
        for gid in existing_ids:
            # "L1" -> 1, "R2" -> 2
            num_str = gid[1:]
            if num_str.isdigit():
                max_num = max(max_num, int(num_str))

        next_num = max_num + 1
        return f"{column}{next_num}"

    def _calculate_group_bbox(
        self,
        page_data: PageData,
        block_ids: List[int]
    ) -> BoundingBox:
        """
        여러 블록을 포함하는 최소 BBox 계산

        Args:
            page_data: 페이지 데이터
            block_ids: 블록 ID 목록

        Returns:
            통합 BBox

        Raises:
            ValueError: 블록을 찾을 수 없는 경우
        """
        blocks = [b for b in page_data.blocks if b.block_id in block_ids]

        if not blocks:
            raise ValueError(f"블록을 찾을 수 없습니다: {block_ids}")

        x_min = min(b.bbox.x_min for b in blocks)
        y_min = min(b.bbox.y_min for b in blocks)
        x_max = max(b.bbox.x_max for b in blocks)
        y_max = max(b.bbox.y_max for b in blocks)

        return BoundingBox(x_min, y_min, x_max, y_max)

    def get_group_data(
        self,
        document_id: str,
        page_index: int
    ) -> Optional[GroupData]:
        """
        현재 캐시된 그룹 데이터 가져오기

        Args:
            document_id: 문서 ID
            page_index: 페이지 번호

        Returns:
            그룹 데이터 (없으면 None)
        """
        page_key = f"{document_id}_{page_index}"
        return self.current_groups.get(page_key)

    def set_group_data(
        self,
        document_id: str,
        page_index: int,
        group_data: GroupData
    ) -> None:
        """
        그룹 데이터 캐시에 저장

        Args:
            document_id: 문서 ID
            page_index: 페이지 번호
            group_data: 그룹 데이터
        """
        page_key = f"{document_id}_{page_index}"
        self.current_groups[page_key] = group_data


# 직접 실행 시 테스트
if __name__ == "__main__":
    from config import Config

    print("=== GroupingManager 테스트 ===")

    config = Config.load()
    manager = GroupingManager(config)

    # 테스트용 페이지 데이터
    test_page = PageData(
        document_id="test_doc",
        page_index=0,
        width=1320,
        height=1764,
        columns=[],
        blocks=[
            Block(
                block_id=1,
                column="L",
                bbox=BoundingBox(100, 100, 200, 150),
                pixel_density=0.5
            ),
            Block(
                block_id=2,
                column="L",
                bbox=BoundingBox(100, 160, 200, 210),
                pixel_density=0.5
            ),
            Block(
                block_id=3,
                column="R",
                bbox=BoundingBox(700, 100, 800, 150),
                pixel_density=0.5
            ),
        ]
    )

    # 그룹 생성 테스트
    group1 = manager.create_group(test_page, [1, 2], "L")
    print(f"\n생성된 그룹: {group1.id}")
    print(f"블록 IDs: {group1.block_ids}")
    print(f"BBox: {group1.bbox.to_list() if group1.bbox else None}")

    # GroupData 생성
    group_data = GroupData(
        document_id="test_doc",
        page_index=0,
        groups=[group1],
        status="edited",
        created_at=datetime.now()
    )

    # 캐시에 저장
    manager.set_group_data("test_doc", 0, group_data)

    # 다음 그룹 생성 (L2가 되어야 함)
    group2 = manager.create_group(test_page, [3], "R")
    print(f"\n생성된 그룹 2: {group2.id}")

    print("\nGroupingManager 테스트 완료!")
