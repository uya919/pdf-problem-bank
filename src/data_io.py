"""
데이터 입출력 관리
JSON 파일로 데이터 저장 및 로드
"""
from pathlib import Path
import json
from typing import Optional
from datetime import datetime
from config import Config
from data_models import PageData, GroupData


class DataIO:
    """데이터 입출력 관리"""

    def __init__(self, config: Config):
        """
        Args:
            config: Config 인스턴스
        """
        self.config = config

    def save_page_data(
        self,
        page_data: PageData,
        document_id: str
    ) -> Path:
        """
        페이지 블록 데이터를 JSON으로 저장

        저장 경로: documents/{document_id}/blocks/page_XXXX_blocks.json

        Args:
            page_data: PageData 인스턴스
            document_id: 문서 ID

        Returns:
            저장된 파일 경로
        """
        # 저장 디렉토리 생성
        doc_dir = self.config.get_document_dir(document_id)
        blocks_dir = doc_dir / "blocks"
        blocks_dir.mkdir(parents=True, exist_ok=True)

        # 파일명
        filename = f"page_{page_data.page_index:04d}_blocks.json"
        file_path = blocks_dir / filename

        # JSON으로 변환 및 저장
        data = page_data.to_dict()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return file_path

    def load_page_data(
        self,
        document_id: str,
        page_index: int
    ) -> Optional[PageData]:
        """
        페이지 블록 데이터 로드

        Args:
            document_id: 문서 ID
            page_index: 페이지 인덱스

        Returns:
            PageData 인스턴스 또는 None (파일이 없는 경우)
        """
        # 파일 경로
        doc_dir = self.config.DOCUMENTS_DIR / document_id
        blocks_dir = doc_dir / "blocks"
        filename = f"page_{page_index:04d}_blocks.json"
        file_path = blocks_dir / filename

        if not file_path.exists():
            return None

        # JSON 로드
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # PageData로 변환
        page_data = PageData.from_dict(data)

        return page_data

    def save_group_data(
        self,
        group_data: GroupData,
        document_id: str
    ) -> Path:
        """
        그룹 데이터를 JSON으로 저장

        저장 경로: documents/{document_id}/groups/page_XXXX_groups.json

        Args:
            group_data: GroupData 인스턴스
            document_id: 문서 ID

        Returns:
            저장된 파일 경로
        """
        # 저장 디렉토리 생성
        doc_dir = self.config.get_document_dir(document_id)
        groups_dir = doc_dir / "groups"
        groups_dir.mkdir(parents=True, exist_ok=True)

        # 파일명
        filename = f"page_{group_data.page_index:04d}_groups.json"
        file_path = groups_dir / filename

        # JSON으로 변환 및 저장
        data = group_data.to_dict()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return file_path

    def load_group_data(
        self,
        document_id: str,
        page_index: int
    ) -> Optional[GroupData]:
        """
        그룹 데이터 로드

        Args:
            document_id: 문서 ID
            page_index: 페이지 인덱스

        Returns:
            GroupData 인스턴스 또는 None (파일이 없는 경우)
        """
        # 파일 경로
        doc_dir = self.config.DOCUMENTS_DIR / document_id
        groups_dir = doc_dir / "groups"
        filename = f"page_{page_index:04d}_groups.json"
        file_path = groups_dir / filename

        if not file_path.exists():
            return None

        # JSON 로드
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # GroupData로 변환
        group_data = GroupData.from_dict(data)

        return group_data


# 직접 실행 시 테스트
if __name__ == "__main__":
    from config import Config
    from data_models import Block, Column, BoundingBox

    config = Config.load()
    data_io = DataIO(config)

    # 테스트 데이터 생성
    print("=== PageData 저장/로드 테스트 ===")

    test_page = PageData(
        document_id="test_doc",
        page_index=0,
        width=2480,
        height=3508,
        columns=[
            Column(id="L", x_min=0, x_max=1240),
            Column(id="R", x_min=1240, x_max=2480)
        ],
        blocks=[
            Block(
                block_id=1,
                column="L",
                bbox=BoundingBox(100, 200, 400, 260),
                pixel_density=0.32
            ),
            Block(
                block_id=2,
                column="L",
                bbox=BoundingBox(100, 300, 450, 380),
                pixel_density=0.28
            ),
            Block(
                block_id=3,
                column="R",
                bbox=BoundingBox(1300, 200, 1800, 350),
                pixel_density=0.35
            )
        ],
        status="auto",
        created_at=datetime.now(),
        modified_at=datetime.now()
    )

    # 저장
    saved_path = data_io.save_page_data(test_page, "test_doc")
    print(f"저장됨: {saved_path}")

    # 로드
    loaded_page = data_io.load_page_data("test_doc", 0)
    if loaded_page:
        print(f"로드됨: {loaded_page.document_id}")
        print(f"  - 페이지: {loaded_page.page_index}")
        print(f"  - 크기: {loaded_page.width} x {loaded_page.height}")
        print(f"  - 컬럼 수: {len(loaded_page.columns)}")
        print(f"  - 블록 수: {len(loaded_page.blocks)}")
        print(f"  - 상태: {loaded_page.status}")

        # 블록 비교
        print("\n블록 정보:")
        for block in loaded_page.blocks[:3]:
            print(f"  Block {block.block_id}: {block.column}, "
                  f"bbox={block.bbox.to_list()}, density={block.pixel_density}")

        # 데이터 일치 확인
        if len(loaded_page.blocks) == len(test_page.blocks):
            print("\n[OK] 블록 개수 일치")
        else:
            print(f"\n[ERROR] 블록 개수 불일치: {len(loaded_page.blocks)} vs {len(test_page.blocks)}")

    else:
        print("[ERROR] 로드 실패")

    print("\n=== 테스트 완료 ===")
