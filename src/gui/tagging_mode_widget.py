"""
태깅 모드 위젯

Phase 7에서 구현 예정
"""
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel
from PySide6.QtCore import Qt


class TaggingModeWidget(QWidget):
    """
    태깅 모드 위젯 (Phase 7)

    문제별 메타데이터 입력 + 해설 영역 매칭
    """

    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        """UI 설정 (임시)"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # 임시 레이블
        label = QLabel("🏷️ 태깅 모드")
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("font-size: 24px; color: #666;")
        layout.addWidget(label)

        info_label = QLabel("Phase 7에서 구현 예정\n\n"
                           "기능:\n"
                           "- 문제별 메타데이터 입력\n"
                           "- 해설 영역 선택\n"
                           "- 학년/과정/단원/난이도 태깅")
        info_label.setAlignment(Qt.AlignCenter)
        info_label.setStyleSheet("font-size: 14px; color: #999;")
        layout.addWidget(info_label)
