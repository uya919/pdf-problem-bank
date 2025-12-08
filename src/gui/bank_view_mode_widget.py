"""
문제은행 뷰 모드 위젯

Phase 8에서 구현 예정
"""
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtCore import Qt


class BankViewModeWidget(QWidget):
    """
    문제은행 뷰 모드 위젯 (Phase 8)

    문제 검색/필터/조회
    """

    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        """UI 설정 (임시)"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # 임시 레이블
        label = QLabel("🗄️ 문제은행")
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("font-size: 24px; color: #666;")
        layout.addWidget(label)

        info_label = QLabel("Phase 8에서 구현 예정\n\n"
                           "기능:\n"
                           "- 문제 검색/필터\n"
                           "- 문제 카드 그리드 뷰\n"
                           "- CSV/JSON Export")
        info_label.setAlignment(Qt.AlignCenter)
        info_label.setStyleSheet("font-size: 14px; color: #999;")
        layout.addWidget(info_label)
