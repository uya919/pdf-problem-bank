"""
라벨링 모드 위젯

Phase 4: 기존 라벨링 UI를 모드 위젯으로 래핑
"""
from PySide6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QSplitter
from PySide6.QtCore import Qt, Signal
from pathlib import Path
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from gui.side_panels import LeftSidePanel, GroupListPanel
from gui.page_canvas import PageCanvas
from gui.dual_canvas_widget import DualCanvasWidget  # Phase 4


class LabelingModeWidget(QWidget):
    """
    라벨링 모드 위젯 (Phase 1-3 기존 기능)

    레이아웃:
        [좌측 패널] [중앙 캔버스] [우측 패널]
    """

    # 시그널
    document_selected = Signal(str)
    page_selected = Signal(int)

    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        """UI 설정"""
        layout = QHBoxLayout()
        self.setLayout(layout)

        # 스플리터 (좌측 | 중앙 | 우측)
        self.main_splitter = QSplitter(Qt.Horizontal)

        # 좌측 패널 (문서/페이지 리스트)
        self.left_panel = LeftSidePanel()
        self.left_panel.setMinimumWidth(150)  # Phase 4.7.1: 최소 너비 설정
        self.main_splitter.addWidget(self.left_panel)

        # 중앙 캔버스 (Phase 4: 듀얼 캔버스로 변경)
        self.center_canvas = DualCanvasWidget()
        self.center_canvas.setMinimumWidth(400)  # Phase 4.7.1: 최소 너비 설정 (듀얼 뷰)
        self.main_splitter.addWidget(self.center_canvas)

        # 우측 패널 (그룹 리스트)
        self.right_panel = GroupListPanel()
        self.right_panel.setMinimumWidth(150)  # Phase 4.7.1: 최소 너비 설정
        self.main_splitter.addWidget(self.right_panel)

        # 스플리터 비율 설정 (Phase 4: 중앙 영역 확대)
        self.main_splitter.setSizes([200, 1200, 200])

        layout.addWidget(self.main_splitter)

        # 시그널 연결
        self.connect_signals()

    def connect_signals(self):
        """시그널/슬롯 연결"""
        # 좌측 패널 → 외부로 전달
        self.left_panel.document_selected.connect(self.document_selected.emit)
        self.left_panel.page_selected.connect(self.page_selected.emit)
