"""
PySide6 Hello World 테스트

GUI가 제대로 동작하는지 확인
"""
import sys
from pathlib import Path

# 프로젝트 루트를 path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from PySide6.QtWidgets import QApplication, QMainWindow, QLabel, QPushButton, QVBoxLayout, QWidget
from PySide6.QtCore import Qt

class HelloWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PDF 문제 크롭 - Hello World")
        self.setGeometry(100, 100, 400, 200)

        # 중앙 위젯
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # 레이아웃
        layout = QVBoxLayout()
        central_widget.setLayout(layout)

        # 라벨
        label = QLabel("PySide6가 정상적으로 작동합니다!")
        label.setAlignment(Qt.AlignCenter)
        layout.addWidget(label)

        # 버튼
        button = QPushButton("Phase 2 시작!")
        button.clicked.connect(self.on_button_click)
        layout.addWidget(button)

    def on_button_click(self):
        print("[✓] 버튼 클릭 성공!")
        print("[✓] PySide6 이벤트 처리 정상 작동")
        self.close()

if __name__ == "__main__":
    print("=" * 60)
    print("PySide6 Hello World 테스트")
    print("=" * 60)
    print()

    app = QApplication(sys.argv)
    window = HelloWindow()
    window.show()

    print("[✓] GUI 윈도우 생성 성공")
    print()
    print("창을 닫거나 버튼을 클릭하여 종료하세요...")
    print()

    sys.exit(app.exec())
