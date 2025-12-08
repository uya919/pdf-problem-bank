"""
좌측/우측 패널

- DocumentListPanel: 문서 리스트
- PageListPanel: 페이지 리스트
- GroupListPanel: 그룹 리스트 (Phase 3)
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QListWidget, QListWidgetItem,
    QHBoxLayout, QPushButton, QSplitter, QMessageBox, QTreeWidget,
    QTreeWidgetItem, QComboBox  # Phase 7.1
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont, QColor
from pathlib import Path
from typing import List, Optional
import shutil
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from data_models import ProblemGroup


class DocumentListPanel(QWidget):
    """
    문서 리스트 패널

    dataset_root/documents/ 폴더의 문서들을 표시
    """

    # 시그널
    document_selected = Signal(str)  # document_id
    document_deleted = Signal(str)  # document_id (삭제된 문서)

    def __init__(self):
        super().__init__()
        self.documents_path: Optional[Path] = None
        self.setup_ui()

    def setup_ui(self):
        """UI 설정 (Phase 7.1: ComboBox로 변경)"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # 제목
        title = QLabel("📄 문서")
        title.setProperty("styleClass", "h3")  # QSS 스타일 적용
        layout.addWidget(title)

        # Phase 7.1: 문서 콤보박스
        self.document_combo = QComboBox()
        self.document_combo.setProperty("styleClass", "document-selector")
        self.document_combo.currentIndexChanged.connect(self.on_document_changed)
        self.document_combo.setPlaceholderText("문서를 선택하세요")
        layout.addWidget(self.document_combo)

        # 버튼 레이아웃 (가로로 배치)
        btn_layout = QHBoxLayout()

        # 삭제 버튼
        delete_btn = QPushButton("🗑️")
        delete_btn.setProperty("styleClass", "ghost")
        delete_btn.clicked.connect(self.delete_selected_document)
        delete_btn.setToolTip("선택한 문서 삭제")
        btn_layout.addWidget(delete_btn)

        # 새로고침 버튼
        refresh_btn = QPushButton("🔄")
        refresh_btn.setProperty("styleClass", "ghost")
        refresh_btn.clicked.connect(self.refresh)
        refresh_btn.setToolTip("문서 목록 새로고침")
        btn_layout.addWidget(refresh_btn)

        btn_layout.addStretch()

        layout.addLayout(btn_layout)

    def load_documents(self, documents_path: Path):
        """
        문서 목록 로드 (Phase 7.1: ComboBox로 변경)

        Args:
            documents_path: documents 폴더 경로
        """
        # 경로 저장 (삭제/새로고침 시 사용)
        self.documents_path = documents_path

        # 현재 선택된 문서 저장
        current_doc = self.document_combo.currentData(Qt.UserRole)

        self.document_combo.clear()

        if not documents_path.exists():
            print(f"[경고] 문서 폴더 없음: {documents_path}")
            return

        # 문서 폴더 탐색
        doc_folders = [d for d in documents_path.iterdir() if d.is_dir()]

        if not doc_folders:
            self.document_combo.addItem("(분석된 문서 없음)", None)
            return

        for doc_folder in sorted(doc_folders, key=lambda d: d.name):
            doc_id = doc_folder.name

            # 페이지 수 확인 (blocks 폴더의 JSON 파일 개수)
            blocks_folder = doc_folder / "blocks"
            if blocks_folder.exists():
                num_pages = len(list(blocks_folder.glob("page_*_blocks.json")))
            else:
                num_pages = 0

            # 콤보박스 아이템 추가
            item_text = f"{doc_id} ({num_pages}페이지)"
            self.document_combo.addItem(item_text, doc_id)  # UserRole에 doc_id 저장

        # 이전 선택 복원
        if current_doc:
            index = self.document_combo.findData(current_doc, Qt.UserRole)
            if index >= 0:
                self.document_combo.setCurrentIndex(index)

        print(f"[DocumentListPanel] {len(doc_folders)}개 문서 로드됨")

    def on_document_changed(self, index: int):
        """Phase 7.1: 콤보박스 문서 선택 시"""
        if index < 0:
            return

        doc_id = self.document_combo.itemData(index, Qt.UserRole)
        if doc_id:
            print(f"[DocumentListPanel] 문서 선택: {doc_id}")
            self.document_selected.emit(doc_id)

    def refresh(self):
        """새로고침"""
        print("[DocumentListPanel] 새로고침")
        if self.documents_path:
            self.load_documents(self.documents_path)

    def delete_selected_document(self):
        """선택된 문서 삭제 (Phase 7.1: ComboBox 버전)"""
        # 선택된 문서 확인
        current_index = self.document_combo.currentIndex()
        if current_index < 0:
            QMessageBox.warning(
                self,
                "문서 미선택",
                "삭제할 문서를 선택해주세요."
            )
            return

        doc_id = self.document_combo.itemData(current_index, Qt.UserRole)
        if not doc_id:
            return

        # 삭제 확인
        reply = QMessageBox.question(
            self,
            "문서 삭제 확인",
            f"문서 '{doc_id}'를 삭제하시겠습니까?\n\n"
            f"다음 데이터가 모두 삭제됩니다:\n"
            f"- 페이지 이미지\n"
            f"- 블록 JSON 파일\n"
            f"- 그룹/라벨 정보 (있는 경우)\n\n"
            f"이 작업은 되돌릴 수 없습니다.",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )

        if reply != QMessageBox.Yes:
            print(f"[DocumentListPanel] 삭제 취소: {doc_id}")
            return

        # 문서 폴더 삭제
        try:
            doc_folder = self.documents_path / doc_id
            if doc_folder.exists():
                shutil.rmtree(doc_folder)
                print(f"[DocumentListPanel] 문서 삭제 완료: {doc_id}")

                # 성공 메시지
                QMessageBox.information(
                    self,
                    "삭제 완료",
                    f"문서 '{doc_id}'가 삭제되었습니다."
                )

                # 시그널 발생
                self.document_deleted.emit(doc_id)

                # 목록 새로고침
                self.refresh()
            else:
                QMessageBox.warning(
                    self,
                    "오류",
                    f"문서 폴더를 찾을 수 없습니다:\n{doc_folder}"
                )

        except Exception as e:
            QMessageBox.critical(
                self,
                "삭제 실패",
                f"문서 삭제 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            print(f"[오류] 문서 삭제 실패: {e}")
            import traceback
            traceback.print_exc()


class PageListPanel(QWidget):
    """
    페이지 리스트 패널 (Phase 7.1: 상태 아이콘 추가)

    선택된 문서의 페이지 목록 표시
    - ✓ (완료): 그룹이 있고 작업 완료
    - ⚠ (진행 중): 일부만 그룹핑됨
    - ○ (미작업): 그룹 없음
    """

    # 시그널
    page_selected = Signal(int)  # page_index

    def __init__(self):
        super().__init__()
        self.current_doc_id: Optional[str] = None
        self.documents_dir: Optional[Path] = None  # Phase 7.1
        self.setup_ui()

    def setup_ui(self):
        """UI 설정 (Phase 7.1: 스타일 개선)"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # 제목
        self.title = QLabel("📃 페이지")
        self.title.setProperty("styleClass", "h3")
        layout.addWidget(self.title)

        # 페이지 리스트
        self.list_widget = QListWidget()
        self.list_widget.itemClicked.connect(self.on_item_clicked)
        layout.addWidget(self.list_widget)

    def load_pages(self, doc_id: str, blocks_folder: Path):
        """
        페이지 목록 로드 (Phase 7.1: 상태 아이콘 추가)

        Args:
            doc_id: 문서 ID
            blocks_folder: blocks 폴더 경로
        """
        self.current_doc_id = doc_id
        self.documents_dir = blocks_folder.parent  # documents/doc_id
        self.list_widget.clear()

        # 제목 업데이트
        self.title.setText(f"📃 페이지")

        if not blocks_folder.exists():
            self.list_widget.addItem("(페이지 없음)")
            return

        # JSON 파일 목록
        json_files = sorted(blocks_folder.glob("page_*_blocks.json"))

        if not json_files:
            self.list_widget.addItem("(페이지 없음)")
            return

        # labels 폴더 경로 (그룹 정보 확인용)
        labels_folder = self.documents_dir / "labels"

        for json_file in json_files:
            # 페이지 번호 추출 (page_0001_blocks.json -> 1)
            stem = json_file.stem  # page_0001_blocks
            page_str = stem.split('_')[1]  # 0001
            page_index = int(page_str)

            # Phase 7.1: 페이지 상태 확인
            status_icon = self._get_page_status_icon(page_index, labels_folder)

            # 아이템 텍스트 생성
            item_text = f"{status_icon} 페이지 {page_index + 1}"

            item = QListWidgetItem(item_text)
            item.setData(Qt.UserRole, page_index)  # page_index 저장

            self.list_widget.addItem(item)

        print(f"[PageListPanel] {len(json_files)}개 페이지 로드됨")

    def _get_page_status_icon(self, page_index: int, labels_folder: Path) -> str:
        """
        페이지 상태 아이콘 반환 (Phase 7.1)

        Args:
            page_index: 페이지 번호 (0-based)
            labels_folder: labels 폴더 경로

        Returns:
            상태 아이콘 (✓/⚠/○)
        """
        if not labels_folder or not labels_folder.exists():
            return "○"  # 미작업

        # labels JSON 파일 확인
        labels_file = labels_folder / f"page_{page_index:04d}_labels.json"

        if not labels_file.exists():
            return "○"  # 미작업 (그룹 없음)

        try:
            import json
            with open(labels_file, 'r', encoding='utf-8') as f:
                labels_data = json.load(f)

            groups = labels_data.get("groups", [])

            if not groups:
                return "○"  # 미작업 (그룹 없음)

            # 간단한 로직: 그룹이 있으면 완료로 표시
            # TODO: 향후 블록 개수와 그룹핑된 블록 개수를 비교하여 정확한 상태 판단
            return "✓"  # 완료

        except Exception as e:
            print(f"[경고] 라벨 파일 읽기 실패: {labels_file}, {e}")
            return "⚠"  # 진행 중 (오류)

    def on_item_clicked(self, item: QListWidgetItem):
        """아이템 클릭 시"""
        page_index = item.data(Qt.UserRole)
        if page_index is not None:
            print(f"[PageListPanel] 페이지 선택: {page_index}")
            self.page_selected.emit(page_index)


class LeftSidePanel(QWidget):
    """
    좌측 패널 (문서 + 페이지 리스트)

    위: 문서 리스트
    아래: 페이지 리스트
    """

    # 시그널 전달
    document_selected = Signal(str)
    document_deleted = Signal(str)
    page_selected = Signal(int)

    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        """UI 설정"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # Splitter로 상하 분할
        splitter = QSplitter(Qt.Vertical)
        layout.addWidget(splitter)

        # 문서 리스트
        self.doc_panel = DocumentListPanel()
        splitter.addWidget(self.doc_panel)

        # 페이지 리스트
        self.page_panel = PageListPanel()
        splitter.addWidget(self.page_panel)

        # 크기 비율 (1:1)
        splitter.setSizes([300, 300])

        # 시그널 연결
        self.doc_panel.document_selected.connect(self.document_selected.emit)
        self.doc_panel.document_deleted.connect(self.document_deleted.emit)
        self.page_panel.page_selected.connect(self.page_selected.emit)

    def load_documents(self, documents_path: Path):
        """문서 목록 로드"""
        self.doc_panel.load_documents(documents_path)

    def load_pages(self, doc_id: str, blocks_folder: Path):
        """페이지 목록 로드"""
        self.page_panel.load_pages(doc_id, blocks_folder)


class GroupListPanel(QWidget):
    """
    우측 패널 (문제 그룹 리스트)

    Phase 3: 그룹 관리 UI
    - 그룹 트리 (컬럼별)
    - 선택된 블록 표시
    - 그룹 생성/삭제 버튼

    Phase 5: 해설 연결 UI
    - 해설 연결 버튼
    - 그룹별 해설 연결 상태 표시
    """

    # 시그널
    create_group_clicked = Signal()  # 새 그룹 만들기
    add_to_group_clicked = Signal(str)  # group_id (기존 그룹에 추가)
    delete_group_clicked = Signal(str)  # group_id (그룹 삭제)
    clear_selection_clicked = Signal()  # 선택 해제
    link_solution_clicked = Signal(str)  # group_id (해설 연결) - Phase 5.2

    def __init__(self):
        super().__init__()
        self.current_groups: List[ProblemGroup] = []
        self.selected_block_count = 0
        self.setup_ui()

    def setup_ui(self):
        """UI 설정 (Phase 7: 스타일 개선)"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # 제목
        title = QLabel("📦 문제 그룹")
        title.setProperty("styleClass", "h3")
        layout.addWidget(title)

        # 그룹 트리 위젯
        self.group_tree = QTreeWidget()
        self.group_tree.setHeaderLabels(["그룹", "블록 수"])
        self.group_tree.setColumnWidth(0, 120)
        self.group_tree.itemDoubleClicked.connect(self.on_group_double_clicked)
        layout.addWidget(self.group_tree)

        # 선택된 블록 표시
        self.selected_label = QLabel("선택된 블록: 0개")
        self.selected_label.setStyleSheet("padding: 5px; background: #f0f0f0;")
        layout.addWidget(self.selected_label)

        # 버튼들
        # 새 그룹 만들기
        btn_create = QPushButton("➕ 새 그룹 만들기")
        btn_create.clicked.connect(self.create_group_clicked.emit)
        btn_create.setStyleSheet("background: #4CAF50; color: white; font-weight: bold; padding: 8px;")
        layout.addWidget(btn_create)

        # 기존 그룹에 추가 (드롭다운 + 버튼)
        add_layout = QHBoxLayout()
        btn_add = QPushButton("⬇️ 기존 그룹에 추가")
        btn_add.clicked.connect(self.on_add_to_group_clicked)
        add_layout.addWidget(btn_add)
        layout.addLayout(add_layout)

        # Phase 5.2: 해설 연결 버튼
        self.btn_link_solution = QPushButton("🔗 해설 연결")
        self.btn_link_solution.clicked.connect(self.on_link_solution_clicked)
        self.btn_link_solution.setStyleSheet("background: #2196F3; color: white; font-weight: bold; padding: 8px;")
        self.btn_link_solution.setEnabled(False)  # 해설 PDF 로드 후 활성화
        self.btn_link_solution.setToolTip("선택한 그룹에 해설 페이지의 영역을 연결합니다")
        layout.addWidget(self.btn_link_solution)

        # 선택 해제
        btn_clear = QPushButton("🗑️ 선택 해제")
        btn_clear.clicked.connect(self.clear_selection_clicked.emit)
        layout.addWidget(btn_clear)

        layout.addStretch()

    def update_groups(self, groups: List[ProblemGroup]):
        """
        그룹 리스트 업데이트

        Args:
            groups: 현재 페이지의 문제 그룹 목록
        """
        self.current_groups = groups
        self.group_tree.clear()

        if not groups:
            return

        # 컬럼별로 그룹화
        left_groups = [g for g in groups if g.column == "L"]
        right_groups = [g for g in groups if g.column == "R"]

        # 왼쪽 컬럼 그룹
        if left_groups:
            left_item = QTreeWidgetItem([f"왼쪽 컬럼", f"{len(left_groups)}개"])
            left_item.setExpanded(True)
            for group in sorted(left_groups, key=lambda g: g.id):
                # Phase 7.3: 그룹 상태 아이콘
                status_icons = []

                # 크롭 이미지 생성 여부
                if group.crop_image_path:
                    status_icons.append("📄")

                # 해설 연결 여부
                if group.solution_info:
                    status_icons.append("🔗")

                # 그룹 라벨 생성
                icon_str = " ".join(status_icons) if status_icons else ""
                group_label = f"{icon_str} {group.id}".strip()

                child = QTreeWidgetItem([
                    group_label,
                    f"{len(group.block_ids)}개"
                ])
                child.setData(0, Qt.UserRole, group.id)  # group_id 저장

                # Phase 5.4 & 7.3: 해설 연결된 그룹은 파란색으로 표시
                if group.solution_info:
                    child.setForeground(0, QColor(33, 150, 243))  # 파란색

                left_item.addChild(child)

            self.group_tree.addTopLevelItem(left_item)

        # 오른쪽 컬럼 그룹
        if right_groups:
            right_item = QTreeWidgetItem([f"오른쪽 컬럼", f"{len(right_groups)}개"])
            right_item.setExpanded(True)
            for group in sorted(right_groups, key=lambda g: g.id):
                # Phase 7.3: 그룹 상태 아이콘
                status_icons = []

                # 크롭 이미지 생성 여부
                if group.crop_image_path:
                    status_icons.append("📄")

                # 해설 연결 여부
                if group.solution_info:
                    status_icons.append("🔗")

                # 그룹 라벨 생성
                icon_str = " ".join(status_icons) if status_icons else ""
                group_label = f"{icon_str} {group.id}".strip()

                child = QTreeWidgetItem([
                    group_label,
                    f"{len(group.block_ids)}개"
                ])
                child.setData(0, Qt.UserRole, group.id)  # group_id 저장

                # Phase 5.4 & 7.3: 해설 연결된 그룹은 파란색으로 표시
                if group.solution_info:
                    child.setForeground(0, QColor(33, 150, 243))  # 파란색

                right_item.addChild(child)

            self.group_tree.addTopLevelItem(right_item)

        print(f"[GroupListPanel] {len(groups)}개 그룹 표시")

    def update_selected_blocks(self, block_ids: List[int]):
        """
        선택된 블록 표시 업데이트

        Args:
            block_ids: 선택된 블록 ID 목록
        """
        self.selected_block_count = len(block_ids)

        if block_ids:
            # 블록 ID 표시 (최대 10개까지)
            if len(block_ids) <= 10:
                ids_str = ", ".join(f"#{bid}" for bid in sorted(block_ids))
            else:
                first_ids = sorted(block_ids)[:10]
                ids_str = ", ".join(f"#{bid}" for bid in first_ids) + ", ..."

            self.selected_label.setText(f"선택된 블록: {len(block_ids)}개\n{ids_str}")
        else:
            self.selected_label.setText("선택된 블록: 0개")

    def on_group_double_clicked(self, item: QTreeWidgetItem, column: int):
        """
        그룹 더블클릭 시 삭제 확인

        Args:
            item: 클릭된 아이템
            column: 컬럼 번호
        """
        group_id = item.data(0, Qt.UserRole)
        if not group_id:
            return

        # 삭제 확인
        reply = QMessageBox.question(
            self,
            "그룹 삭제",
            f"그룹 '{group_id}'를 삭제하시겠습니까?",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            print(f"[GroupListPanel] 그룹 삭제 요청: {group_id}")
            self.delete_group_clicked.emit(group_id)

    def on_add_to_group_clicked(self):
        """기존 그룹에 추가 버튼 클릭"""
        # 선택된 블록이 없으면 경고
        if self.selected_block_count == 0:
            QMessageBox.warning(
                self,
                "블록 미선택",
                "먼저 추가할 블록을 선택해주세요."
            )
            return

        # 그룹이 없으면 경고
        if not self.current_groups:
            QMessageBox.warning(
                self,
                "그룹 없음",
                "추가할 그룹이 없습니다.\n먼저 새 그룹을 만들어주세요."
            )
            return

        # 선택된 그룹 확인
        current_item = self.group_tree.currentItem()
        if not current_item:
            QMessageBox.warning(
                self,
                "그룹 미선택",
                "추가할 그룹을 선택해주세요."
            )
            return

        group_id = current_item.data(0, Qt.UserRole)
        if not group_id:
            QMessageBox.warning(
                self,
                "그룹 미선택",
                "추가할 그룹을 선택해주세요.\n(컬럼 항목이 아닌 그룹을 선택해야 합니다)"
            )
            return

        # 시그널 발생
        print(f"[GroupListPanel] 그룹 {group_id}에 블록 추가 요청")
        self.add_to_group_clicked.emit(group_id)

    def get_selected_group(self) -> Optional[str]:
        """
        현재 선택된 그룹 ID 반환

        Returns:
            선택된 그룹 ID 또는 None
        """
        current_item = self.group_tree.currentItem()
        if not current_item:
            return None

        group_id = current_item.data(0, Qt.UserRole)
        return group_id

    def on_link_solution_clicked(self):
        """
        해설 연결 버튼 클릭 (Phase 5.2)

        선택된 그룹에 해설 페이지의 영역을 연결
        """
        # 선택된 그룹 확인
        group_id = self.get_selected_group()
        if not group_id:
            QMessageBox.warning(
                self,
                "그룹 미선택",
                "먼저 해설을 연결할 그룹을 선택해주세요."
            )
            return

        # 시그널 발생
        print(f"[GroupListPanel] 그룹 {group_id}에 해설 연결 요청")
        self.link_solution_clicked.emit(group_id)

    def enable_solution_linking(self, enabled: bool):
        """
        해설 연결 기능 활성화/비활성화 (Phase 5.2)

        Args:
            enabled: True이면 해설 연결 버튼 활성화
        """
        self.btn_link_solution.setEnabled(enabled)
        status = "활성화" if enabled else "비활성화"
        print(f"[GroupListPanel] 해설 연결 기능 {status}")
