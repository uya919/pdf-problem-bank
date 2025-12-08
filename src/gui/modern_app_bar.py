"""
Modern App Bar Component
토스 스타일의 상단 내비게이션 바
"""
from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QLabel, QPushButton, QButtonGroup
)
from PySide6.QtCore import Signal, Qt


class ModernAppBar(QWidget):
    """
    모던한 앱 바 컴포넌트

    레이아웃:
    [앱 이름] [라벨링] [문제 등록] [문제은행] [...] [PDF 열기] [해설 열기]

    Signals:
        mode_changed: 모드가 변경되었을 때 (mode: str)
        open_pdf_clicked: PDF 열기 버튼 클릭
        open_solution_clicked: 해설 열기 버튼 클릭
    """

    mode_changed = Signal(str)  # "labeling", "registration", "bank"
    open_pdf_clicked = Signal()
    open_solution_clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_mode = "labeling"  # 기본 모드
        self.setup_ui()

    def setup_ui(self):
        """UI 구성"""
        self.setObjectName("modernAppBar")
        self.setFixedHeight(60)

        # 메인 레이아웃
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 0, 16, 0)
        layout.setSpacing(0)

        # ========== 좌측: 앱 이름 ==========
        app_name_label = QLabel("📚 문제 라벨링 도구")
        app_name_label.setProperty("styleClass", "h2")
        app_name_label.setStyleSheet("font-weight: bold; color: #191F28; padding-right: 32px;")
        layout.addWidget(app_name_label)

        # ========== 중앙: 모드 탭 ==========
        # ButtonGroup으로 라디오 버튼처럼 동작하도록 설정
        self.mode_button_group = QButtonGroup(self)
        self.mode_button_group.setExclusive(True)

        # 라벨링 모드 탭
        self.btn_labeling = QPushButton("📝 라벨링")
        self.btn_labeling.setProperty("styleClass", "modeTab")
        self.btn_labeling.setCheckable(True)
        self.btn_labeling.setChecked(True)  # 기본 선택
        self.btn_labeling.clicked.connect(lambda: self.on_mode_changed("labeling"))
        self.mode_button_group.addButton(self.btn_labeling, 0)
        layout.addWidget(self.btn_labeling)

        # 문제 등록 모드 탭
        self.btn_registration = QPushButton("🏷️ 문제 등록")
        self.btn_registration.setProperty("styleClass", "modeTab")
        self.btn_registration.setCheckable(True)
        self.btn_registration.clicked.connect(lambda: self.on_mode_changed("registration"))
        self.mode_button_group.addButton(self.btn_registration, 1)
        layout.addWidget(self.btn_registration)

        # 문제은행 모드 탭
        self.btn_bank = QPushButton("🏦 문제은행")
        self.btn_bank.setProperty("styleClass", "modeTab")
        self.btn_bank.setCheckable(True)
        self.btn_bank.clicked.connect(lambda: self.on_mode_changed("bank"))
        self.mode_button_group.addButton(self.btn_bank, 2)
        layout.addWidget(self.btn_bank)

        # ========== 우측: Spacer + 액션 버튼 ==========
        layout.addStretch()

        # PDF 열기 버튼
        self.btn_open_pdf = QPushButton("📄 PDF 열기")
        self.btn_open_pdf.setProperty("styleClass", "secondary")
        self.btn_open_pdf.clicked.connect(self.open_pdf_clicked.emit)
        self.btn_open_pdf.setToolTip("문제 PDF 파일을 엽니다")
        layout.addWidget(self.btn_open_pdf)

        layout.addSpacing(8)

        # 해설 열기 버튼
        self.btn_open_solution = QPushButton("📘 해설 열기")
        self.btn_open_solution.setProperty("styleClass", "secondary")
        self.btn_open_solution.clicked.connect(self.open_solution_clicked.emit)
        self.btn_open_solution.setToolTip("해설 PDF 파일을 엽니다")
        self.btn_open_solution.setEnabled(False)  # 문제 PDF 로드 전에는 비활성화
        layout.addWidget(self.btn_open_solution)

    def on_mode_changed(self, mode: str):
        """
        모드 변경 핸들러

        Args:
            mode: "labeling", "registration", "bank"
        """
        if self.current_mode != mode:
            self.current_mode = mode
            self.mode_changed.emit(mode)

    def get_current_mode(self) -> str:
        """
        현재 모드 반환

        Returns:
            현재 활성화된 모드 ("labeling", "registration", "bank")
        """
        return self.current_mode

    def set_mode(self, mode: str):
        """
        프로그래밍 방식으로 모드 설정

        Args:
            mode: "labeling", "registration", "bank"
        """
        if mode == "labeling":
            self.btn_labeling.setChecked(True)
        elif mode == "registration":
            self.btn_registration.setChecked(True)
        elif mode == "bank":
            self.btn_bank.setChecked(True)

        self.current_mode = mode

    def enable_solution_button(self, enabled: bool):
        """
        해설 열기 버튼 활성화/비활성화

        Args:
            enabled: True면 활성화, False면 비활성화
        """
        self.btn_open_solution.setEnabled(enabled)


# ========== 테스트 코드 ==========
if __name__ == "__main__":
    import sys
    from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout

    app = QApplication(sys.argv)

    # QSS 로드 (테스트용)
    qss_path = "../styles/app.qss"
    try:
        with open(qss_path, "r", encoding="utf-8") as f:
            app.setStyleSheet(f.read())
    except FileNotFoundError:
        print(f"Warning: {qss_path} not found. Running without styles.")

    # 테스트 윈도우
    window = QMainWindow()
    window.setWindowTitle("ModernAppBar Test")
    window.resize(1200, 100)

    # ModernAppBar 추가
    app_bar = ModernAppBar()

    # 시그널 연결 (테스트)
    app_bar.mode_changed.connect(lambda mode: print(f"Mode changed to: {mode}"))
    app_bar.open_pdf_clicked.connect(lambda: print("Open PDF clicked"))
    app_bar.open_solution_clicked.connect(lambda: print("Open Solution clicked"))

    # PDF 로드 후 해설 버튼 활성화 테스트 (3초 후)
    from PySide6.QtCore import QTimer
    QTimer.singleShot(3000, lambda: app_bar.enable_solution_button(True))

    # 중앙 위젯 설정
    central_widget = QWidget()
    central_layout = QVBoxLayout(central_widget)
    central_layout.setContentsMargins(0, 0, 0, 0)
    central_layout.setSpacing(0)
    central_layout.addWidget(app_bar)
    central_layout.addStretch()

    window.setCentralWidget(central_widget)
    window.show()

    print("ModernAppBar test running...")
    print("- Click mode tabs to switch modes")
    print("- Click PDF/Solution buttons to test signals")
    print("- Solution button will be enabled after 3 seconds")

    sys.exit(app.exec())
