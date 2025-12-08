"""
데이터 모델 정의
"""
from dataclasses import dataclass, field
from typing import List, Optional, Literal
from datetime import datetime


@dataclass
class BoundingBox:
    """바운딩 박스 [x_min, y_min, x_max, y_max]"""
    x_min: int
    y_min: int
    x_max: int
    y_max: int

    @property
    def width(self) -> int:
        """박스의 너비"""
        return self.x_max - self.x_min

    @property
    def height(self) -> int:
        """박스의 높이"""
        return self.y_max - self.y_min

    @property
    def area(self) -> int:
        """박스의 면적"""
        return self.width * self.height

    def to_list(self) -> List[int]:
        """리스트 형태로 변환"""
        return [int(self.x_min), int(self.y_min), int(self.x_max), int(self.y_max)]

    def intersects(self, other: 'BoundingBox') -> bool:
        """
        다른 박스와 교차하는지 확인

        Args:
            other: 비교할 다른 BoundingBox

        Returns:
            교차 여부
        """
        return not (
            self.x_max < other.x_min or
            self.x_min > other.x_max or
            self.y_max < other.y_min or
            self.y_min > other.y_max
        )


@dataclass
class Column:
    """페이지 컬럼 정보"""
    id: str  # "L", "R", "C" 등
    x_min: int
    x_max: int

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "x_min": int(self.x_min),
            "x_max": int(self.x_max)
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Column':
        """딕셔너리에서 생성"""
        return cls(
            id=data["id"],
            x_min=data["x_min"],
            x_max=data["x_max"]
        )


@dataclass
class Block:
    """텍스트 블록"""
    block_id: int
    column: str
    bbox: BoundingBox
    pixel_density: float
    scale: Optional[str] = None  # "large", "medium", "small", "tiny" (다층 스케일용)
    parent_id: Optional[int] = None  # 부모 블록 ID (계층 구조용)
    children_ids: List[int] = field(default_factory=list)  # 자식 블록 IDs

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        result = {
            "block_id": int(self.block_id),
            "column": self.column,
            "bbox": self.bbox.to_list(),
            "pixel_density": float(self.pixel_density)
        }
        # 선택적 필드는 None이 아닐 때만 포함
        if self.scale is not None:
            result["scale"] = self.scale
        if self.parent_id is not None:
            result["parent_id"] = int(self.parent_id)
        if self.children_ids:
            result["children_ids"] = [int(cid) for cid in self.children_ids]
        return result

    @classmethod
    def from_dict(cls, data: dict) -> 'Block':
        """딕셔너리에서 생성"""
        return cls(
            block_id=data["block_id"],
            column=data["column"],
            bbox=BoundingBox(*data["bbox"]),
            pixel_density=data["pixel_density"],
            scale=data.get("scale"),
            parent_id=data.get("parent_id"),
            children_ids=data.get("children_ids", [])
        )


@dataclass
class SolutionInfo:
    """
    해설 정보 (Phase 5.3)

    문제 그룹에 연결된 해설 페이지의 영역 정보
    """
    solution_page_index: int  # 해설 페이지 번호 (0-based)
    solution_region: tuple  # (x, y, w, h) - Scene 좌표

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "solution_page_index": self.solution_page_index,
            "solution_region": list(self.solution_region)  # tuple → list
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'SolutionInfo':
        """딕셔너리에서 생성"""
        return cls(
            solution_page_index=data["solution_page_index"],
            solution_region=tuple(data["solution_region"])  # list → tuple
        )


@dataclass
class ProblemGroup:
    """문제 그룹 (Phase 3)"""
    id: str  # "L1", "R2" 등
    column: str
    block_ids: List[int]
    bbox: Optional[BoundingBox] = None
    crop_image_path: Optional[str] = None
    created_at: Optional[str] = None  # ISO 8601 형식
    created_by: str = "user"  # "user" 또는 "auto" (ML)
    notes: str = ""  # 사용자 메모
    metadata: dict = field(default_factory=dict)  # 추가 정보
    solution_info: Optional['SolutionInfo'] = None  # Phase 5.3: 해설 연결 정보

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        result = {
            "id": self.id,
            "column": self.column,
            "block_ids": [int(bid) for bid in self.block_ids],
            "bbox": self.bbox.to_list() if self.bbox else None,
            "crop_image_path": self.crop_image_path,
            "created_by": self.created_by,
            "notes": self.notes,
            "metadata": self.metadata
        }
        if self.created_at:
            result["created_at"] = self.created_at
        # Phase 5.3: 해설 정보 추가
        if self.solution_info:
            result["solution_info"] = self.solution_info.to_dict()
        return result

    @classmethod
    def from_dict(cls, data: dict) -> 'ProblemGroup':
        """딕셔너리에서 생성"""
        bbox = None
        if data.get("bbox"):
            bbox = BoundingBox(*data["bbox"])

        # Phase 5.3: 해설 정보 로드
        solution_info = None
        if data.get("solution_info"):
            solution_info = SolutionInfo.from_dict(data["solution_info"])

        return cls(
            id=data["id"],
            column=data["column"],
            block_ids=data["block_ids"],
            bbox=bbox,
            crop_image_path=data.get("crop_image_path"),
            created_at=data.get("created_at"),
            created_by=data.get("created_by", "user"),
            notes=data.get("notes", ""),
            metadata=data.get("metadata", {}),
            solution_info=solution_info
        )


@dataclass
class PageData:
    """페이지 데이터"""
    document_id: str
    page_index: int
    width: int
    height: int
    columns: List[Column]
    blocks: List[Block]
    status: Literal["todo", "auto", "edited"] = "todo"
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "version": "1.0",
            "document_id": self.document_id,
            "page_index": self.page_index,
            "width": self.width,
            "height": self.height,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "modified_at": self.modified_at.isoformat() if self.modified_at else None,
            "columns": [col.to_dict() for col in self.columns],
            "blocks": [block.to_dict() for block in self.blocks]
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'PageData':
        """딕셔너리에서 생성"""
        created_at = None
        if data.get("created_at"):
            created_at = datetime.fromisoformat(data["created_at"])

        modified_at = None
        if data.get("modified_at"):
            modified_at = datetime.fromisoformat(data["modified_at"])

        return cls(
            document_id=data["document_id"],
            page_index=data["page_index"],
            width=data["width"],
            height=data["height"],
            columns=[Column.from_dict(col) for col in data["columns"]],
            blocks=[Block.from_dict(block) for block in data["blocks"]],
            status=data.get("status", "todo"),
            created_at=created_at,
            modified_at=modified_at
        )


@dataclass
class GroupData:
    """그룹 데이터"""
    document_id: str
    page_index: int
    groups: List[ProblemGroup]
    status: Literal["todo", "auto", "edited"] = "todo"
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "version": "1.0",
            "document_id": self.document_id,
            "page_index": self.page_index,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "modified_at": self.modified_at.isoformat() if self.modified_at else None,
            "groups": [group.to_dict() for group in self.groups]
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'GroupData':
        """딕셔너리에서 생성"""
        created_at = None
        if data.get("created_at"):
            created_at = datetime.fromisoformat(data["created_at"])

        modified_at = None
        if data.get("modified_at"):
            modified_at = datetime.fromisoformat(data["modified_at"])

        return cls(
            document_id=data["document_id"],
            page_index=data["page_index"],
            groups=[ProblemGroup.from_dict(g) for g in data["groups"]],
            status=data.get("status", "todo"),
            created_at=created_at,
            modified_at=modified_at
        )


# 직접 실행 시 테스트
if __name__ == "__main__":
    # 테스트 코드
    print("=== BoundingBox 테스트 ===")
    bbox = BoundingBox(100, 200, 400, 600)
    print(f"Width: {bbox.width}, Height: {bbox.height}, Area: {bbox.area}")
    print(f"List: {bbox.to_list()}")

    print("\n=== Block 테스트 ===")
    block = Block(
        block_id=1,
        column="L",
        bbox=bbox,
        pixel_density=0.32
    )
    print(f"Block: {block}")
    print(f"Block dict: {block.to_dict()}")

    # 직렬화/역직렬화 테스트
    block_dict = block.to_dict()
    block_restored = Block.from_dict(block_dict)
    print(f"Restored block: {block_restored}")

    print("\n=== PageData 테스트 ===")
    page = PageData(
        document_id="test_doc",
        page_index=0,
        width=2480,
        height=3508,
        columns=[Column(id="L", x_min=0, x_max=1240)],
        blocks=[block],
        status="auto",
        created_at=datetime.now()
    )
    print(f"Page: {page.document_id}, {len(page.blocks)} blocks")

    # 직렬화/역직렬화 테스트
    page_dict = page.to_dict()
    page_restored = PageData.from_dict(page_dict)
    print(f"Restored page: {page_restored.document_id}, {len(page_restored.blocks)} blocks")

    print("\nAll data models tested successfully!")
