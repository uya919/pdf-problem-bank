# Phase 6-10: "토스스러운" UX/UI 재구성 상세 개발 계획

## 📋 Executive Summary

### 목표
현재 "툴 느낌"의 GUI를 **토스/토스증권 PC앱 수준의 상용 앱 UX/UI**로 전면 재구성

### 핵심 원칙
1. **정보 계층 명확화**: 한 화면에 "지금 해야 할 일"이 명확히 보임
2. **모드별 분리**: 라벨링/문제등록/문제은행을 명확히 구분
3. **듀얼 캔버스 중심**: 문제/해설 나란히 표시하는 구조 강화
4. **일관된 디자인 시스템**: QSS 기반 색상/타이포/컴포넌트 통일

### 전체 일정
- **Phase 6**: 디자인 시스템 + 상단 네비게이션 (Week 1-2, 9일)
- **Phase 7**: 라벨링 모드 개선 (Week 3, 7일)
- **Phase 8**: 문제 등록 모드 (Week 4-5, 14일)
- **Phase 9**: 문제은행 모드 (Week 6, 10일)
- **Phase 10**: 성능 최적화 (선택, 5일)

**총 예상 소요**: 6주 (최적화 포함 시)

---

## Phase 6: 디자인 시스템 및 상단 네비게이션 (9일)

### 목표
"토스스러운" 느낌의 디자인 토큰 정의 + 깔끔한 상단 앱 바 구현

### 6.1 디자인 시스템 (app.qss) 작성 (3일)

#### 작업 내용

**1일차: 색상 토큰 및 기본 스타일**

파일: `src/styles/app.qss` (신규)

```css
/* ========== 색상 토큰 ========== */
/* Primary Colors */
* {
    --primary: #1B64DA;
    --primary-hover: #1557C0;
    --primary-light: #E8F1FC;
    --primary-dark: #0F3D7A;
}

/* Neutral Colors */
* {
    --background: #F5F5F7;
    --surface: #FFFFFF;
    --border: #DFE1E6;
    --border-light: #F0F0F2;
    --text-primary: #111827;
    --text-secondary: #6B7280;
    --text-tertiary: #9CA3AF;
}

/* Semantic Colors */
* {
    --success: #10B981;
    --warning: #F59E0B;
    --danger: #E54949;
    --info: #3B82F6;
}

/* ========== 기본 폰트 ========== */
* {
    font-family: "Pretendard", "Noto Sans KR", "맑은 고딕", "Malgun Gothic", sans-serif;
    font-size: 13px;
    color: #111827;
}

/* ========== 애플리케이션 배경 ========== */
QMainWindow {
    background-color: #F5F5F7;
}

QWidget {
    background-color: transparent;
}
```

**2일차: 버튼 스타일**

```css
/* ========== Primary Button ========== */
QPushButton[styleClass="primary"] {
    background-color: #1B64DA;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    font-weight: 600;
    font-size: 14px;
}

QPushButton[styleClass="primary"]:hover {
    background-color: #1557C0;
}

QPushButton[styleClass="primary"]:pressed {
    background-color: #0F3D7A;
}

QPushButton[styleClass="primary"]:disabled {
    background-color: #DFE1E6;
    color: #9CA3AF;
}

/* ========== Secondary Button ========== */
QPushButton[styleClass="secondary"] {
    background-color: white;
    color: #1B64DA;
    border: 1px solid #DFE1E6;
    border-radius: 6px;
    padding: 10px 20px;
    font-weight: 500;
    font-size: 14px;
}

QPushButton[styleClass="secondary"]:hover {
    background-color: #F5F8FA;
    border-color: #1B64DA;
}

/* ========== Ghost Button ========== */
QPushButton[styleClass="ghost"] {
    background-color: transparent;
    color: #6B7280;
    border: none;
    padding: 8px 12px;
    font-size: 13px;
}

QPushButton[styleClass="ghost"]:hover {
    background-color: #F5F5F7;
    color: #111827;
}

/* ========== Icon Button ========== */
QPushButton[styleClass="icon"] {
    background-color: transparent;
    border: none;
    padding: 6px;
    border-radius: 4px;
}

QPushButton[styleClass="icon"]:hover {
    background-color: #F0F0F2;
}
```

**3일차: 리스트/테이블/패널 스타일**

```css
/* ========== QListWidget ========== */
QListWidget {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 8px;
    padding: 4px;
    outline: none;
}

QListWidget::item {
    padding: 10px 12px;
    border-radius: 6px;
    margin: 2px 0;
}

QListWidget::item:selected {
    background-color: #E8F1FC;
    color: #1B64DA;
}

QListWidget::item:hover {
    background-color: #F5F8FA;
}

/* ========== QTreeWidget ========== */
QTreeWidget {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 8px;
    padding: 4px;
    outline: none;
}

QTreeWidget::item {
    padding: 8px 0;
}

QTreeWidget::item:selected {
    background-color: #E8F1FC;
    color: #1B64DA;
}

QTreeWidget::item:hover {
    background-color: #F5F8FA;
}

/* ========== Panel (Custom QWidget) ========== */
QWidget[styleClass="panel"] {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 8px;
}

QWidget[styleClass="panel-header"] {
    background-color: #FAFAFA;
    border-bottom: 1px solid #DFE1E6;
    padding: 12px 16px;
}

/* ========== QGraphicsView (Canvas) ========== */
QGraphicsView {
    background-color: #F5F5F7;
    border: 1px solid #DFE1E6;
    border-radius: 8px;
}

/* ========== QLabel (Typography) ========== */
QLabel[styleClass="h1"] {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
}

QLabel[styleClass="h2"] {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

QLabel[styleClass="h3"] {
    font-size: 14px;
    font-weight: 600;
    color: #111827;
}

QLabel[styleClass="body"] {
    font-size: 13px;
    font-weight: 400;
    color: #111827;
}

QLabel[styleClass="caption"] {
    font-size: 12px;
    font-weight: 400;
    color: #6B7280;
}

/* ========== QComboBox ========== */
QComboBox {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 6px;
    padding: 8px 12px;
    min-width: 120px;
}

QComboBox:hover {
    border-color: #1B64DA;
}

QComboBox::drop-down {
    border: none;
    width: 20px;
}

QComboBox QAbstractItemView {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 6px;
    selection-background-color: #E8F1FC;
}

/* ========== QLineEdit ========== */
QLineEdit {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
}

QLineEdit:focus {
    border-color: #1B64DA;
}

/* ========== QSpinBox ========== */
QSpinBox {
    background-color: white;
    border: 1px solid #DFE1E6;
    border-radius: 6px;
    padding: 6px 8px;
    min-width: 80px;
}

QSpinBox:focus {
    border-color: #1B64DA;
}

/* ========== QCheckBox ========== */
QCheckBox {
    spacing: 8px;
}

QCheckBox::indicator {
    width: 18px;
    height: 18px;
    border: 2px solid #DFE1E6;
    border-radius: 4px;
    background-color: white;
}

QCheckBox::indicator:checked {
    background-color: #1B64DA;
    border-color: #1B64DA;
    image: url(:/icons/check-white.svg);
}

QCheckBox::indicator:hover {
    border-color: #1B64DA;
}

/* ========== QRadioButton ========== */
QRadioButton {
    spacing: 8px;
}

QRadioButton::indicator {
    width: 18px;
    height: 18px;
    border: 2px solid #DFE1E6;
    border-radius: 9px;
    background-color: white;
}

QRadioButton::indicator:checked {
    background-color: #1B64DA;
    border-color: #1B64DA;
}

QRadioButton::indicator:checked::after {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background-color: white;
}

/* ========== QStatusBar ========== */
QStatusBar {
    background-color: white;
    border-top: 1px solid #DFE1E6;
    padding: 8px 16px;
    font-size: 12px;
    color: #6B7280;
}

/* ========== QToolBar ========== */
QToolBar {
    background-color: white;
    border-bottom: 1px solid #DFE1E6;
    padding: 8px;
    spacing: 8px;
}

QToolBar::separator {
    background-color: #DFE1E6;
    width: 1px;
    margin: 0 8px;
}
```

#### 추가 작업
- `src/styles/fonts/` 폴더 생성
- Pretendard 폰트 파일 다운로드 및 배치 (선택)
- 폰트 로딩 유틸리티 작성

파일: `src/utils.py` (수정)

```python
from PySide6.QtGui import QFontDatabase
from pathlib import Path

def load_custom_fonts():
    """커스텀 폰트 로드"""
    fonts_dir = Path(__file__).parent / "styles" / "fonts"

    if not fonts_dir.exists():
        print("[폰트] 커스텀 폰트 폴더 없음, 시스템 폰트 사용")
        return

    for font_file in fonts_dir.glob("*.ttf"):
        font_id = QFontDatabase.addApplicationFont(str(font_file))
        if font_id >= 0:
            print(f"[폰트] 로드 성공: {font_file.name}")
        else:
            print(f"[폰트] 로드 실패: {font_file.name}")
```

#### 검증 기준
- [ ] app.qss 파일이 오류 없이 로드됨
- [ ] 버튼 4종(primary/secondary/ghost/icon) 스타일이 정상 표시
- [ ] 리스트/트리 위젯에서 선택/hover 효과 작동
- [ ] 커스텀 폰트 로딩 성공 (또는 fallback)

---

### 6.2 상단 네비게이션 바 재설계 (4일)

#### 작업 내용

**파일: `src/gui/modern_app_bar.py` (신규)**

```python
"""
ModernAppBar - 토스스러운 상단 네비게이션 바

레이아웃:
[앱 이름] [라벨링] [문제 등록] [문제은행] [........] [문제 PDF 열기] [해설 PDF 열기] [설정]
"""
from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QLabel, QPushButton, QSpacerItem, QSizePolicy
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont


class ModernAppBar(QWidget):
    """
    모던 앱 바

    시그널:
    - mode_changed(str): 모드 변경 ("labeling", "tagging", "bank")
    - open_pdf_clicked: 문제 PDF 열기
    - open_solution_clicked: 해설 PDF 열기
    - settings_clicked: 설정
    """

    # 시그널
    mode_changed = Signal(str)
    open_pdf_clicked = Signal()
    open_solution_clicked = Signal()
    settings_clicked = Signal()

    def __init__(self):
        super().__init__()
        self.current_mode = "labeling"
        self.setup_ui()
        self.apply_styles()

    def setup_ui(self):
        """UI 설정"""
        layout = QHBoxLayout()
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(24)
        self.setLayout(layout)

        # 앱 이름
        app_name = QLabel("혜윰 문제은행")
        font = QFont()
        font.setPointSize(16)
        font.setBold(True)
        app_name.setFont(font)
        layout.addWidget(app_name)

        # Spacer
        layout.addSpacing(32)

        # 모드 탭 버튼들
        self.mode_buttons = {}

        self.btn_labeling = self.create_mode_button("라벨링", "labeling")
        layout.addWidget(self.btn_labeling)

        self.btn_tagging = self.create_mode_button("문제 등록", "tagging")
        layout.addWidget(self.btn_tagging)

        self.btn_bank = self.create_mode_button("문제은행", "bank")
        layout.addWidget(self.btn_bank)

        # 중앙 여백
        layout.addItem(QSpacerItem(40, 20, QSizePolicy.Expanding, QSizePolicy.Minimum))

        # 액션 버튼들
        self.btn_open_pdf = QPushButton("📁 문제 PDF")
        self.btn_open_pdf.clicked.connect(self.open_pdf_clicked.emit)
        self.btn_open_pdf.setProperty("styleClass", "secondary")
        layout.addWidget(self.btn_open_pdf)

        self.btn_open_solution = QPushButton("📚 해설 PDF")
        self.btn_open_solution.clicked.connect(self.open_solution_clicked.emit)
        self.btn_open_solution.setProperty("styleClass", "secondary")
        self.btn_open_solution.setEnabled(False)
        layout.addWidget(self.btn_open_solution)

        # 설정 버튼
        btn_settings = QPushButton("⚙️")
        btn_settings.clicked.connect(self.settings_clicked.emit)
        btn_settings.setProperty("styleClass", "icon")
        btn_settings.setFixedSize(36, 36)
        layout.addWidget(btn_settings)

        # 초기 선택
        self.set_active_mode("labeling")

    def create_mode_button(self, text: str, mode: str) -> QPushButton:
        """모드 버튼 생성"""
        btn = QPushButton(text)
        btn.setCheckable(True)
        btn.clicked.connect(lambda: self.on_mode_button_clicked(mode))
        btn.setProperty("mode", mode)
        self.mode_buttons[mode] = btn
        return btn

    def on_mode_button_clicked(self, mode: str):
        """모드 버튼 클릭"""
        self.set_active_mode(mode)
        self.mode_changed.emit(mode)

    def set_active_mode(self, mode: str):
        """활성 모드 설정"""
        self.current_mode = mode

        # 모든 버튼 비활성화 스타일
        for m, btn in self.mode_buttons.items():
            btn.setChecked(m == mode)
            if m == mode:
                btn.setProperty("styleClass", "primary")
            else:
                btn.setProperty("styleClass", "ghost")

            # 스타일 재적용 (QSS 반영)
            btn.style().unpolish(btn)
            btn.style().polish(btn)

    def enable_solution_pdf_button(self, enabled: bool):
        """해설 PDF 버튼 활성화/비활성화"""
        self.btn_open_solution.setEnabled(enabled)

    def apply_styles(self):
        """스타일 적용"""
        self.setStyleSheet("""
            ModernAppBar {
                background-color: white;
                border-bottom: 1px solid #DFE1E6;
            }
        """)
```

**파일: `src/gui/main_window.py` (수정)**

```python
# 기존 setup_toolbar() 메서드를 제거하고 setup_app_bar()로 교체

def setup_app_bar(self):
    """상단 앱 바 설정 (Phase 6.2)"""
    from gui.modern_app_bar import ModernAppBar

    # 기존 툴바 제거
    # self.toolbar = QToolBar() 부분 삭제

    # ModernAppBar 생성
    self.app_bar = ModernAppBar()

    # 시그널 연결
    self.app_bar.mode_changed.connect(self.on_mode_changed)
    self.app_bar.open_pdf_clicked.connect(self.on_open_pdf)
    self.app_bar.open_solution_clicked.connect(self.on_load_solution_pdf)
    self.app_bar.settings_clicked.connect(self.on_settings_clicked)

    # 레이아웃에 추가 (중앙 위젯 상단)
    # setup_ui()에서 추가

def setup_ui(self):
    """UI 레이아웃 설정"""
    # 중앙 위젯
    central_widget = QWidget()
    self.setCentralWidget(central_widget)

    # 메인 레이아웃 (수직)
    main_layout = QVBoxLayout()
    main_layout.setContentsMargins(0, 0, 0, 0)
    main_layout.setSpacing(0)
    central_widget.setLayout(main_layout)

    # Phase 6.2: ModernAppBar 추가
    self.app_bar = None  # setup_app_bar()에서 생성

    # 모드 스택
    self.mode_stack = QStackedWidget()
    # ... (기존 코드)

    main_layout.addWidget(self.mode_stack)

def on_mode_changed(self, mode: str):
    """모드 변경 시 (Phase 6.2)"""
    if mode == "labeling":
        self.switch_to_labeling_mode()
    elif mode == "tagging":
        self.switch_to_tagging_mode()
    elif mode == "bank":
        self.switch_to_bank_mode()

def on_settings_clicked(self):
    """설정 버튼 클릭 (Phase 6.2)"""
    # Phase 6에서는 간단한 다이얼로그만
    QMessageBox.information(
        self,
        "설정",
        "설정 기능은 Phase 7 이후에 구현됩니다."
    )
```

#### 검증 기준
- [ ] 앱 실행 시 상단에 깔끔한 앱 바 표시
- [ ] 모드 탭 클릭 시 활성 스타일 변경
- [ ] 문제 PDF/해설 PDF 버튼 클릭 시 기존 기능 작동
- [ ] 설정 버튼 클릭 시 메시지 표시

---

### 6.3 QSS 적용 및 통합 (2일)

#### 작업 내용

**파일: `src/main.py` (수정)**

```python
import sys
from pathlib import Path
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt

# 프로젝트 루트
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

from gui.main_window import MainWindow
from utils import load_custom_fonts


def load_qss(app: QApplication):
    """QSS 스타일시트 로드"""
    qss_path = project_root / "src" / "styles" / "app.qss"

    if not qss_path.exists():
        print(f"[경고] QSS 파일 없음: {qss_path}")
        return

    try:
        with open(qss_path, "r", encoding="utf-8") as f:
            qss_content = f.read()
            app.setStyleSheet(qss_content)
            print(f"[스타일] QSS 로드 완료: {qss_path}")
    except Exception as e:
        print(f"[오류] QSS 로드 실패: {e}")


def main():
    # High DPI 지원
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)

    app = QApplication(sys.argv)

    # 커스텀 폰트 로드
    load_custom_fonts()

    # QSS 스타일시트 로드
    load_qss(app)

    # 메인 윈도우 생성
    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
```

**파일: `src/gui/main_window.py` (수정)**

```python
# __init__ 수정
def __init__(self):
    super().__init__()
    # ... (기존 코드)

    # Phase 6: ModernAppBar 설정
    self.setup_app_bar()

    # 기존 setup_ui, setup_statusbar, connect_signals 호출
    self.setup_ui()
    # self.setup_toolbar() 제거
    self.setup_statusbar()
    self.connect_signals()

    # ... (나머지 코드)
```

#### 기존 위젯에 styleClass 속성 추가

**파일: `src/gui/side_panels.py` (수정)**

```python
# GroupListPanel의 버튼들에 styleClass 추가
def setup_ui(self):
    # ... (기존 코드)

    # 새 그룹 만들기
    btn_create = QPushButton("➕ 새 그룹 만들기")
    btn_create.clicked.connect(self.create_group_clicked.emit)
    btn_create.setProperty("styleClass", "primary")  # 추가
    layout.addWidget(btn_create)

    # 기존 그룹에 추가
    btn_add = QPushButton("⬇️ 기존 그룹에 추가")
    btn_add.clicked.connect(self.on_add_to_group_clicked)
    btn_add.setProperty("styleClass", "secondary")  # 추가
    add_layout.addWidget(btn_add)

    # 해설 연결
    self.btn_link_solution = QPushButton("🔗 해설 연결")
    self.btn_link_solution.clicked.connect(self.on_link_solution_clicked)
    self.btn_link_solution.setProperty("styleClass", "primary")  # 추가
    self.btn_link_solution.setEnabled(False)
    layout.addWidget(self.btn_link_solution)

    # 선택 해제
    btn_clear = QPushButton("🗑️ 선택 해제")
    btn_clear.clicked.connect(self.clear_selection_clicked.emit)
    btn_clear.setProperty("styleClass", "ghost")  # 추가
    layout.addWidget(btn_clear)
```

#### 검증 기준
- [ ] 앱 실행 시 QSS가 전역적으로 적용됨
- [ ] 버튼들이 정의된 스타일로 표시됨
- [ ] 리스트/트리 위젯의 선택/hover 효과 작동
- [ ] 캔버스 배경색이 #F5F5F7로 표시

---

## Phase 7: 라벨링 모드 개선 (7일)

### 목표
기존 라벨링 모드의 정보 계층 개선 + 페이지 진행률 표시

### 7.1 좌측 패널: 문서 선택 콤보박스 + 페이지 진행률 (3일)

#### 작업 내용

**파일: `src/gui/side_panels.py` (수정)**

```python
class LeftSidePanel(QWidget):
    """
    좌측 패널 개선 (Phase 7.1)

    레이아웃:
    ┌─────────────────────┐
    │ 📂 문서 선택: [콤보] │
    ├─────────────────────┤
    │ 📃 페이지 목록       │
    │ ┌─────────────────┐ │
    │ │ P1  ✓ 4/4       │ │
    │ │ P2  ⚠ 2/3       │ │
    │ │ P3  ○ 0/5       │ │
    │ └─────────────────┘ │
    └─────────────────────┘
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
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(12)
        self.setLayout(layout)

        # 제목
        title = QLabel("문서 선택")
        title.setProperty("styleClass", "h3")
        layout.addWidget(title)

        # 문서 선택 콤보박스
        self.doc_combo = QComboBox()
        self.doc_combo.currentTextChanged.connect(self.on_document_changed)
        layout.addWidget(self.doc_combo)

        # 구분선
        separator = QFrame()
        separator.setFrameShape(QFrame.HLine)
        separator.setStyleSheet("background-color: #DFE1E6;")
        layout.addWidget(separator)

        # 페이지 목록 제목
        page_title = QLabel("페이지 목록")
        page_title.setProperty("styleClass", "h3")
        layout.addWidget(page_title)

        # 페이지 리스트
        self.page_list = QListWidget()
        self.page_list.itemClicked.connect(self.on_page_clicked)
        layout.addWidget(self.page_list)

    def load_documents(self, documents_path: Path):
        """
        문서 목록 로드 (Phase 7.1)

        Args:
            documents_path: documents 폴더 경로
        """
        self.documents_path = documents_path
        self.doc_combo.clear()

        if not documents_path.exists():
            print(f"[경고] 문서 폴더 없음: {documents_path}")
            return

        # 문서 폴더 탐색
        doc_folders = [d for d in documents_path.iterdir() if d.is_dir()]

        if not doc_folders:
            self.doc_combo.addItem("(문서 없음)")
            return

        for doc_folder in sorted(doc_folders, key=lambda d: d.name):
            doc_id = doc_folder.name
            self.doc_combo.addItem(doc_id)

        print(f"[LeftSidePanel] {len(doc_folders)}개 문서 로드됨")

    def on_document_changed(self, doc_id: str):
        """문서 선택 변경 시"""
        if not doc_id or doc_id == "(문서 없음)":
            return

        print(f"[LeftSidePanel] 문서 선택: {doc_id}")
        self.document_selected.emit(doc_id)

        # 페이지 목록 로드
        blocks_folder = self.documents_path / doc_id / "blocks"
        self.load_pages(doc_id, blocks_folder)

    def load_pages(self, doc_id: str, blocks_folder: Path):
        """
        페이지 목록 로드 + 진행률 계산 (Phase 7.1)

        Args:
            doc_id: 문서 ID
            blocks_folder: blocks 폴더 경로
        """
        self.current_doc_id = doc_id
        self.page_list.clear()

        if not blocks_folder.exists():
            self.page_list.addItem("(페이지 없음)")
            return

        # JSON 파일 목록
        json_files = sorted(blocks_folder.glob("page_*_blocks.json"))

        if not json_files:
            self.page_list.addItem("(페이지 없음)")
            return

        for json_file in json_files:
            # 페이지 번호 추출
            stem = json_file.stem
            page_str = stem.split('_')[1]
            page_index = int(page_str)

            # 진행률 계산
            completed, total = self.calculate_page_progress(doc_id, page_index)

            # 아이템 텍스트
            if total == 0:
                # 그룹이 없는 페이지
                item_text = f"P{page_index + 1}  ○ 미작업"
                icon = "○"
            elif completed == total:
                # 모든 그룹 완료
                item_text = f"P{page_index + 1}  ✓ {completed}/{total}"
                icon = "✓"
            else:
                # 일부 완료
                item_text = f"P{page_index + 1}  ⚠ {completed}/{total}"
                icon = "⚠"

            item = QListWidgetItem(item_text)
            item.setData(Qt.UserRole, page_index)

            # 색상 설정
            if icon == "✓":
                item.setForeground(QColor(16, 185, 129))  # success
            elif icon == "⚠":
                item.setForeground(QColor(245, 158, 11))  # warning

            self.page_list.addItem(item)

    def calculate_page_progress(self, doc_id: str, page_index: int) -> tuple[int, int]:
        """
        페이지 진행률 계산 (Phase 7.1)

        Args:
            doc_id: 문서 ID
            page_index: 페이지 번호 (0-based)

        Returns:
            (완료된 그룹 수, 전체 그룹 수)
        """
        labels_dir = self.documents_path / doc_id / "labels"
        labels_path = labels_dir / f"page_{page_index:04d}_labels.json"

        if not labels_path.exists():
            return (0, 0)

        try:
            import json
            with open(labels_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            groups = data.get("groups", [])
            if not groups:
                return (0, 0)

            # 해설이 연결된 그룹 수 계산
            completed = sum(1 for g in groups if g.get("solution_info") is not None)
            total = len(groups)

            return (completed, total)

        except Exception as e:
            print(f"[오류] 진행률 계산 실패: {e}")
            return (0, 0)

    def on_page_clicked(self, item: QListWidgetItem):
        """페이지 클릭 시"""
        page_index = item.data(Qt.UserRole)
        if page_index is not None:
            print(f"[LeftSidePanel] 페이지 선택: {page_index}")
            self.page_selected.emit(page_index)
```

#### 검증 기준
- [ ] 문서 선택 콤보박스가 상단에 표시됨
- [ ] 페이지 목록에 진행률 아이콘(✓/⚠/○) 표시
- [ ] 완료/부분완료/미작업에 따라 색상 구분
- [ ] 페이지 클릭 시 기존 기능 작동

---

### 7.2 중앙 캔버스: 스타일 개선 (2일)

#### 작업 내용

**파일: `src/gui/dual_canvas_widget.py` (수정)**

```python
def create_problem_canvas(self):
    """문제 캔버스 생성 (Phase 7.2: 스타일 개선)"""
    canvas_widget = QWidget()
    canvas_widget.setProperty("styleClass", "panel")

    layout = QVBoxLayout()
    layout.setContentsMargins(0, 0, 0, 0)
    layout.setSpacing(0)
    canvas_widget.setLayout(layout)

    # 제목 헤더
    header = QWidget()
    header.setProperty("styleClass", "panel-header")
    header_layout = QHBoxLayout()
    header_layout.setContentsMargins(12, 8, 12, 8)
    header.setLayout(header_layout)

    title = QLabel("📄 문제 페이지")
    title.setProperty("styleClass", "h3")
    header_layout.addWidget(title)

    header_layout.addStretch()

    # 줌 버튼들
    zoom_in_btn = QPushButton("＋")
    zoom_in_btn.setProperty("styleClass", "icon")
    zoom_in_btn.setFixedSize(28, 28)
    zoom_in_btn.setToolTip("확대")
    header_layout.addWidget(zoom_in_btn)

    zoom_reset_btn = QPushButton("100%")
    zoom_reset_btn.setProperty("styleClass", "ghost")
    zoom_reset_btn.setToolTip("원본 크기")
    header_layout.addWidget(zoom_reset_btn)

    zoom_out_btn = QPushButton("－")
    zoom_out_btn.setProperty("styleClass", "icon")
    zoom_out_btn.setFixedSize(28, 28)
    zoom_out_btn.setToolTip("축소")
    header_layout.addWidget(zoom_out_btn)

    layout.addWidget(header)

    # 캔버스
    self.problem_canvas_view = PageCanvas()
    layout.addWidget(self.problem_canvas_view)

    # 시그널 연결
    zoom_in_btn.clicked.connect(self.problem_canvas_view.zoom_in)
    zoom_out_btn.clicked.connect(self.problem_canvas_view.zoom_out)
    zoom_reset_btn.clicked.connect(self.problem_canvas_view.zoom_reset)

    return canvas_widget
```

동일한 방식으로 `create_solution_canvas()` 수정

#### 검증 기준
- [ ] 캔버스 상단에 헤더 바 표시
- [ ] 줌 버튼들이 깔끔하게 정렬
- [ ] 줌 버튼 클릭 시 정상 작동

---

### 7.3 우측 패널: 그룹 상태 아이콘 (2일)

#### 작업 내용

**파일: `src/gui/side_panels.py` (수정)**

```python
class GroupListPanel(QWidget):
    # ... (기존 코드)

    def update_groups(self, groups: List[ProblemGroup]):
        """
        그룹 리스트 업데이트 (Phase 7.3: 아이콘 개선)

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
                child = self.create_group_item(group)
                left_item.addChild(child)

            self.group_tree.addTopLevelItem(left_item)

        # 오른쪽 컬럼 그룹
        if right_groups:
            right_item = QTreeWidgetItem([f"오른쪽 컬럼", f"{len(right_groups)}개"])
            right_item.setExpanded(True)

            for group in sorted(right_groups, key=lambda g: g.id):
                child = self.create_group_item(group)
                right_item.addChild(child)

            self.group_tree.addTopLevelItem(right_item)

        print(f"[GroupListPanel] {len(groups)}개 그룹 표시")

    def create_group_item(self, group: ProblemGroup) -> QTreeWidgetItem:
        """
        그룹 아이템 생성 (Phase 7.3)

        상태 아이콘:
        - ✓ : 해설 연결 완료
        - ⚠ : 해설 미연결
        - ○ : 미작업 (블록만 있음)

        Args:
            group: 문제 그룹

        Returns:
            QTreeWidgetItem
        """
        # 상태 판단
        has_solution = group.solution_info is not None

        if has_solution:
            icon = "✓"
            color = QColor(16, 185, 129)  # success
            status_text = "완료"
        else:
            icon = "⚠"
            color = QColor(245, 158, 11)  # warning
            status_text = "미완"

        # 아이템 생성
        group_label = f"{icon} {group.id}"
        item = QTreeWidgetItem([
            group_label,
            f"{len(group.block_ids)}개"
        ])

        item.setData(0, Qt.UserRole, group.id)
        item.setForeground(0, color)

        # 툴팁
        tooltip = f"그룹: {group.id}\n"
        tooltip += f"블록: {len(group.block_ids)}개\n"
        tooltip += f"해설: {status_text}"

        if has_solution:
            tooltip += f"\n페이지: {group.solution_info.solution_page_index + 1}"

        item.setToolTip(0, tooltip)

        return item
```

#### 검증 기준
- [ ] 그룹 목록에 상태 아이콘(✓/⚠) 표시
- [ ] 해설 연결 상태에 따라 색상 구분
- [ ] 그룹 항목 hover 시 툴팁 표시

---

## Phase 8: 문제 등록 모드 (14일)

### 목표
문제 선택 → 태그 입력 → 해설 연결 → 저장 워크플로우 구현

### 8.1 데이터 모델 확장: ProblemMetadata (2일)

#### 작업 내용

**파일: `src/data_models.py` (수정)**

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class ProblemMetadata:
    """
    문제 메타데이터 (Phase 8.1)

    학년/과정/대단원/난이도/유형/정답/출처 등
    """
    # 정답
    answer: str = ""

    # 학년 (초1~고3)
    grade_level: str = ""  # "초1", "초2", ..., "중1", ..., "고1", ...

    # 과정/교육과정 (중2-1, 수학Ⅰ 등)
    curriculum: str = ""

    # 대단원
    chapter_major: str = ""

    # 소단원
    chapter_minor: str = ""

    # 난이도 (하/중/상)
    difficulty: str = ""  # "하", "중", "상"

    # 문항 유형 (객관식/단답형/서술형)
    question_type: str = ""  # "객관식", "단답형", "서술형"

    # 출처 (교재명)
    source: str = ""

    # 추가 태그
    tags: List[str] = field(default_factory=list)

    # 메모
    notes: str = ""

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return {
            "answer": self.answer,
            "grade_level": self.grade_level,
            "curriculum": self.curriculum,
            "chapter_major": self.chapter_major,
            "chapter_minor": self.chapter_minor,
            "difficulty": self.difficulty,
            "question_type": self.question_type,
            "source": self.source,
            "tags": self.tags,
            "notes": self.notes
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'ProblemMetadata':
        """딕셔너리에서 생성"""
        return cls(
            answer=data.get("answer", ""),
            grade_level=data.get("grade_level", ""),
            curriculum=data.get("curriculum", ""),
            chapter_major=data.get("chapter_major", ""),
            chapter_minor=data.get("chapter_minor", ""),
            difficulty=data.get("difficulty", ""),
            question_type=data.get("question_type", ""),
            source=data.get("source", ""),
            tags=data.get("tags", []),
            notes=data.get("notes", "")
        )

    def is_complete(self) -> bool:
        """필수 필드가 모두 채워졌는지 확인"""
        required = [
            self.answer,
            self.grade_level,
            self.curriculum,
            self.chapter_major,
            self.difficulty,
            self.question_type
        ]
        return all(field.strip() for field in required)


# ProblemGroup 클래스 수정
@dataclass
class ProblemGroup:
    """문제 그룹 (Phase 3)"""
    id: str
    column: str
    block_ids: List[int]
    bbox: Optional[BoundingBox] = None
    crop_image_path: Optional[str] = None
    created_at: Optional[str] = None
    created_by: str = "user"
    notes: str = ""
    metadata: Optional[ProblemMetadata] = None  # Phase 8.1: dict → ProblemMetadata
    solution_info: Optional['SolutionInfo'] = None

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        result = {
            "id": self.id,
            "column": self.column,
            "block_ids": [int(bid) for bid in self.block_ids],
            "bbox": self.bbox.to_list() if self.bbox else None,
            "crop_image_path": self.crop_image_path,
            "created_by": self.created_by,
            "notes": self.notes
        }

        if self.created_at:
            result["created_at"] = self.created_at

        # Phase 8.1: metadata 저장
        if self.metadata:
            result["metadata"] = self.metadata.to_dict()

        # Phase 5.3: solution_info 저장
        if self.solution_info:
            result["solution_info"] = self.solution_info.to_dict()

        return result

    @classmethod
    def from_dict(cls, data: dict) -> 'ProblemGroup':
        """딕셔너리에서 생성"""
        bbox = None
        if data.get("bbox"):
            bbox = BoundingBox(*data["bbox"])

        # Phase 5.3: solution_info 로드
        solution_info = None
        if data.get("solution_info"):
            solution_info = SolutionInfo.from_dict(data["solution_info"])

        # Phase 8.1: metadata 로드
        metadata = None
        if data.get("metadata"):
            if isinstance(data["metadata"], dict):
                # 이미 dict인 경우 ProblemMetadata로 변환
                metadata = ProblemMetadata.from_dict(data["metadata"])

        return cls(
            id=data["id"],
            column=data["column"],
            block_ids=data["block_ids"],
            bbox=bbox,
            crop_image_path=data.get("crop_image_path"),
            created_at=data.get("created_at"),
            created_by=data.get("created_by", "user"),
            notes=data.get("notes", ""),
            metadata=metadata,
            solution_info=solution_info
        )
```

#### 검증 기준
- [ ] ProblemMetadata 클래스가 정상 작동
- [ ] to_dict/from_dict 직렬화 테스트 통과
- [ ] is_complete() 메서드 정상 작동

---

### 8.2 문제 등록 모드 UI 구현 (5일)

#### 작업 내용

**파일: `src/gui/tagging_mode_widget.py` (전면 재작성)**

```python
"""
문제 등록 모드 위젯 (Phase 8.2)

레이아웃:
[좌측: 문제 리스트] [중앙: 문제/해설 뷰어] [우측: 태깅 폼]
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QLabel, QListWidget, QListWidgetItem, QPushButton,
    QFormLayout, QLineEdit, QComboBox, QRadioButton,
    QButtonGroup, QTextEdit, QCheckBox, QScrollArea,
    QFrame
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap, QColor
from pathlib import Path
from typing import List, Optional
import sys

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from gui.page_canvas import PageCanvas
from gui.dual_canvas_widget import SolutionCanvas
from data_models import ProblemGroup, ProblemMetadata
from config import Config


class ProblemListPanel(QWidget):
    """
    좌측: 문제 리스트 패널 (Phase 8.2)

    기능:
    - 현재 문서의 모든 문제 표시
    - 썸네일 + 그룹 ID + 완료 상태
    - 필터: 미완성만/전체
    """

    problem_selected = Signal(ProblemGroup)  # 문제 선택 시

    def __init__(self):
        super().__init__()
        self.config = Config.load()
        self.current_document = None
        self.all_problems: List[ProblemGroup] = []
        self.setup_ui()

    def setup_ui(self):
        """UI 설정"""
        layout = QVBoxLayout()
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(12)
        self.setLayout(layout)

        # 제목
        title = QLabel("문제 목록")
        title.setProperty("styleClass", "h3")
        layout.addWidget(title)

        # 필터
        filter_layout = QHBoxLayout()

        self.filter_all = QRadioButton("전체")
        self.filter_all.setChecked(True)
        self.filter_all.toggled.connect(self.apply_filter)
        filter_layout.addWidget(self.filter_all)

        self.filter_incomplete = QRadioButton("미완성")
        self.filter_incomplete.toggled.connect(self.apply_filter)
        filter_layout.addWidget(self.filter_incomplete)

        filter_layout.addStretch()

        layout.addLayout(filter_layout)

        # 문제 리스트
        self.problem_list = QListWidget()
        self.problem_list.itemClicked.connect(self.on_problem_clicked)
        layout.addWidget(self.problem_list)

    def load_problems(self, document_id: str):
        """
        문서의 모든 문제 로드 (Phase 8.2)

        Args:
            document_id: 문서 ID
        """
        self.current_document = document_id
        self.all_problems = []

        # 모든 페이지의 labels JSON 로드
        labels_dir = self.config.DOCUMENTS_DIR / document_id / "labels"
        if not labels_dir.exists():
            print(f"[ProblemListPanel] labels 폴더 없음: {labels_dir}")
            return

        for labels_file in sorted(labels_dir.glob("page_*_labels.json")):
            try:
                import json
                with open(labels_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                groups = [ProblemGroup.from_dict(g) for g in data.get("groups", [])]
                self.all_problems.extend(groups)

            except Exception as e:
                print(f"[오류] labels 로드 실패: {labels_file}, {e}")

        print(f"[ProblemListPanel] {len(self.all_problems)}개 문제 로드")

        # 리스트 표시
        self.apply_filter()

    def apply_filter(self):
        """필터 적용"""
        self.problem_list.clear()

        for problem in self.all_problems:
            # 필터링
            if self.filter_incomplete.isChecked():
                # 미완성만: metadata가 없거나 incomplete
                if problem.metadata and problem.metadata.is_complete():
                    continue

            # 아이템 생성
            item = self.create_problem_item(problem)
            self.problem_list.addItem(item)

    def create_problem_item(self, problem: ProblemGroup) -> QListWidgetItem:
        """
        문제 리스트 아이템 생성 (Phase 8.2)

        Args:
            problem: 문제 그룹

        Returns:
            QListWidgetItem
        """
        # 완료 상태 판단
        has_metadata = problem.metadata is not None
        is_complete = has_metadata and problem.metadata.is_complete()
        has_solution = problem.solution_info is not None

        if is_complete:
            status_icon = "✓"
            status_color = QColor(16, 185, 129)  # success
        elif has_metadata:
            status_icon = "⚠"
            status_color = QColor(245, 158, 11)  # warning
        else:
            status_icon = "○"
            status_color = QColor(156, 163, 175)  # gray

        # 텍스트
        text = f"{status_icon} {problem.id}"

        if has_metadata and problem.metadata.grade_level:
            text += f" | {problem.metadata.grade_level}"

        if has_metadata and problem.metadata.difficulty:
            text += f" | {problem.metadata.difficulty}"

        item = QListWidgetItem(text)
        item.setData(Qt.UserRole, problem)
        item.setForeground(status_color)

        # TODO: 썸네일 추가 (Phase 8.3)

        return item

    def on_problem_clicked(self, item: QListWidgetItem):
        """문제 클릭 시"""
        problem = item.data(Qt.UserRole)
        if problem:
            self.problem_selected.emit(problem)


class TaggingFormPanel(QWidget):
    """
    우측: 태깅 폼 패널 (Phase 8.2)

    폼:
    - 정답
    - 학년
    - 과정
    - 대단원
    - 소단원
    - 난이도 (하/중/상)
    - 문항 유형 (객관/단답/서술)
    - 출처
    """

    save_and_next_clicked = Signal()  # 저장 후 다음

    def __init__(self):
        super().__init__()
        self.current_problem: Optional[ProblemGroup] = None
        self.setup_ui()

    def setup_ui(self):
        """UI 설정"""
        # 스크롤 영역
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)

        # 폼 위젯
        form_widget = QWidget()
        form_widget.setProperty("styleClass", "panel")

        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(20)
        form_widget.setLayout(main_layout)

        # 제목
        title = QLabel("문제 정보")
        title.setProperty("styleClass", "h2")
        main_layout.addWidget(title)

        # --- 이 페이지 공통 정보 섹션 ---
        common_section = self.create_common_section()
        main_layout.addWidget(common_section)

        # 구분선
        separator1 = QFrame()
        separator1.setFrameShape(QFrame.HLine)
        separator1.setStyleSheet("background-color: #DFE1E6;")
        main_layout.addWidget(separator1)

        # --- 현재 문제 정보 섹션 ---
        problem_section = self.create_problem_section()
        main_layout.addWidget(problem_section)

        # 구분선
        separator2 = QFrame()
        separator2.setFrameShape(QFrame.HLine)
        separator2.setStyleSheet("background-color: #DFE1E6;")
        main_layout.addWidget(separator2)

        # --- 저장 버튼 ---
        self.btn_save_and_next = QPushButton("저장 후 다음 문제")
        self.btn_save_and_next.setProperty("styleClass", "primary")
        self.btn_save_and_next.clicked.connect(self.save_and_next_clicked.emit)
        main_layout.addWidget(self.btn_save_and_next)

        # Stretch
        main_layout.addStretch()

        # 스크롤에 추가
        scroll.setWidget(form_widget)

        # 메인 레이아웃
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        self.setLayout(layout)
        layout.addWidget(scroll)

    def create_common_section(self) -> QWidget:
        """이 페이지 공통 정보 섹션"""
        section = QWidget()
        layout = QVBoxLayout()
        layout.setSpacing(12)
        section.setLayout(layout)

        # 섹션 제목
        section_title = QLabel("📋 페이지 공통 정보")
        section_title.setProperty("styleClass", "h3")
        layout.addWidget(section_title)

        # 폼
        form = QFormLayout()
        form.setSpacing(10)

        # 학년
        self.common_grade = QComboBox()
        self.common_grade.addItems([
            "",
            "초1", "초2", "초3", "초4", "초5", "초6",
            "중1", "중2", "중3",
            "고1", "고2", "고3"
        ])
        form.addRow("학년:", self.common_grade)

        # 과정
        self.common_curriculum = QLineEdit()
        self.common_curriculum.setPlaceholderText("예: 중2-1, 수학Ⅰ")
        form.addRow("과정:", self.common_curriculum)

        # 대단원
        self.common_chapter_major = QLineEdit()
        self.common_chapter_major.setPlaceholderText("예: Ⅰ. 함수")
        form.addRow("대단원:", self.common_chapter_major)

        # 출처
        self.common_source = QLineEdit()
        self.common_source.setPlaceholderText("예: 베이직쎈 수학2")
        form.addRow("출처:", self.common_source)

        layout.addLayout(form)

        # 적용 버튼
        btn_apply_common = QPushButton("이 페이지 모든 문제에 적용")
        btn_apply_common.setProperty("styleClass", "secondary")
        btn_apply_common.clicked.connect(self.on_apply_common_clicked)
        layout.addWidget(btn_apply_common)

        return section

    def create_problem_section(self) -> QWidget:
        """현재 문제 정보 섹션"""
        section = QWidget()
        layout = QVBoxLayout()
        layout.setSpacing(12)
        section.setLayout(layout)

        # 섹션 제목
        section_title = QLabel("📝 현재 문제")
        section_title.setProperty("styleClass", "h3")
        layout.addWidget(section_title)

        # 문제 ID 표시
        self.problem_id_label = QLabel("문제 ID: -")
        self.problem_id_label.setProperty("styleClass", "caption")
        layout.addWidget(self.problem_id_label)

        # 폼
        form = QFormLayout()
        form.setSpacing(10)

        # 정답
        self.answer_input = QLineEdit()
        self.answer_input.setPlaceholderText("예: ②, 12, x^2+1")
        form.addRow("정답 *:", self.answer_input)

        # 학년 (개별)
        self.grade_input = QComboBox()
        self.grade_input.addItems([
            "",
            "초1", "초2", "초3", "초4", "초5", "초6",
            "중1", "중2", "중3",
            "고1", "고2", "고3"
        ])
        form.addRow("학년 *:", self.grade_input)

        # 과정
        self.curriculum_input = QLineEdit()
        self.curriculum_input.setPlaceholderText("예: 중2-1")
        form.addRow("과정 *:", self.curriculum_input)

        # 대단원
        self.chapter_major_input = QLineEdit()
        self.chapter_major_input.setPlaceholderText("예: Ⅰ. 함수")
        form.addRow("대단원 *:", self.chapter_major_input)

        # 소단원
        self.chapter_minor_input = QLineEdit()
        self.chapter_minor_input.setPlaceholderText("예: 1. 함수의 뜻과 그래프")
        form.addRow("소단원:", self.chapter_minor_input)

        # 난이도
        difficulty_widget = QWidget()
        difficulty_layout = QHBoxLayout()
        difficulty_layout.setContentsMargins(0, 0, 0, 0)
        difficulty_widget.setLayout(difficulty_layout)

        self.difficulty_group = QButtonGroup()
        self.difficulty_low = QRadioButton("하")
        self.difficulty_mid = QRadioButton("중")
        self.difficulty_high = QRadioButton("상")

        self.difficulty_group.addButton(self.difficulty_low, 1)
        self.difficulty_group.addButton(self.difficulty_mid, 2)
        self.difficulty_group.addButton(self.difficulty_high, 3)

        difficulty_layout.addWidget(self.difficulty_low)
        difficulty_layout.addWidget(self.difficulty_mid)
        difficulty_layout.addWidget(self.difficulty_high)
        difficulty_layout.addStretch()

        form.addRow("난이도 *:", difficulty_widget)

        # 문항 유형
        type_widget = QWidget()
        type_layout = QHBoxLayout()
        type_layout.setContentsMargins(0, 0, 0, 0)
        type_widget.setLayout(type_layout)

        self.type_group = QButtonGroup()
        self.type_multiple = QRadioButton("객관식")
        self.type_short = QRadioButton("단답형")
        self.type_descriptive = QRadioButton("서술형")

        self.type_group.addButton(self.type_multiple, 1)
        self.type_group.addButton(self.type_short, 2)
        self.type_group.addButton(self.type_descriptive, 3)

        type_layout.addWidget(self.type_multiple)
        type_layout.addWidget(self.type_short)
        type_layout.addWidget(self.type_descriptive)
        type_layout.addStretch()

        form.addRow("문항 유형 *:", type_widget)

        # 출처
        self.source_input = QLineEdit()
        self.source_input.setPlaceholderText("예: 베이직쎈 수학2")
        form.addRow("출처:", self.source_input)

        layout.addLayout(form)

        return section

    def load_problem(self, problem: ProblemGroup):
        """
        문제 정보 로드 (Phase 8.2)

        Args:
            problem: 문제 그룹
        """
        self.current_problem = problem

        # 문제 ID 표시
        self.problem_id_label.setText(f"문제 ID: {problem.id}")

        # 기존 메타데이터 로드
        if problem.metadata:
            meta = problem.metadata

            # 정답
            self.answer_input.setText(meta.answer)

            # 학년
            if meta.grade_level:
                idx = self.grade_input.findText(meta.grade_level)
                if idx >= 0:
                    self.grade_input.setCurrentIndex(idx)

            # 과정
            self.curriculum_input.setText(meta.curriculum)

            # 대단원
            self.chapter_major_input.setText(meta.chapter_major)

            # 소단원
            self.chapter_minor_input.setText(meta.chapter_minor)

            # 난이도
            if meta.difficulty == "하":
                self.difficulty_low.setChecked(True)
            elif meta.difficulty == "중":
                self.difficulty_mid.setChecked(True)
            elif meta.difficulty == "상":
                self.difficulty_high.setChecked(True)

            # 문항 유형
            if meta.question_type == "객관식":
                self.type_multiple.setChecked(True)
            elif meta.question_type == "단답형":
                self.type_short.setChecked(True)
            elif meta.question_type == "서술형":
                self.type_descriptive.setChecked(True)

            # 출처
            self.source_input.setText(meta.source)

        else:
            # 폼 초기화
            self.clear_form()

    def clear_form(self):
        """폼 초기화"""
        self.answer_input.clear()
        self.grade_input.setCurrentIndex(0)
        self.curriculum_input.clear()
        self.chapter_major_input.clear()
        self.chapter_minor_input.clear()
        self.difficulty_group.setExclusive(False)
        self.difficulty_low.setChecked(False)
        self.difficulty_mid.setChecked(False)
        self.difficulty_high.setChecked(False)
        self.difficulty_group.setExclusive(True)

        self.type_group.setExclusive(False)
        self.type_multiple.setChecked(False)
        self.type_short.setChecked(False)
        self.type_descriptive.setChecked(False)
        self.type_group.setExclusive(True)

        self.source_input.clear()

    def get_metadata(self) -> ProblemMetadata:
        """
        폼에서 메타데이터 가져오기 (Phase 8.2)

        Returns:
            ProblemMetadata
        """
        # 난이도
        difficulty = ""
        if self.difficulty_low.isChecked():
            difficulty = "하"
        elif self.difficulty_mid.isChecked():
            difficulty = "중"
        elif self.difficulty_high.isChecked():
            difficulty = "상"

        # 문항 유형
        question_type = ""
        if self.type_multiple.isChecked():
            question_type = "객관식"
        elif self.type_short.isChecked():
            question_type = "단답형"
        elif self.type_descriptive.isChecked():
            question_type = "서술형"

        return ProblemMetadata(
            answer=self.answer_input.text().strip(),
            grade_level=self.grade_input.currentText(),
            curriculum=self.curriculum_input.text().strip(),
            chapter_major=self.chapter_major_input.text().strip(),
            chapter_minor=self.chapter_minor_input.text().strip(),
            difficulty=difficulty,
            question_type=question_type,
            source=self.source_input.text().strip()
        )

    def on_apply_common_clicked(self):
        """이 페이지 모든 문제에 적용 버튼 클릭"""
        # TODO: Phase 8.4에서 구현
        QMessageBox.information(
            self,
            "안내",
            "이 기능은 Phase 8.4에서 구현됩니다."
        )


class TaggingModeWidget(QWidget):
    """
    문제 등록 모드 위젯 (Phase 8.2)

    레이아웃:
    [좌측: 문제 리스트] [중앙: 문제/해설 뷰어] [우측: 태깅 폼]
    """

    def __init__(self):
        super().__init__()
        self.config = Config.load()
        self.current_document = None
        self.current_problem: Optional[ProblemGroup] = None
        self.setup_ui()

    def setup_ui(self):
        """UI 설정"""
        layout = QHBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        self.setLayout(layout)

        # 스플리터 (좌 | 중 | 우)
        self.main_splitter = QSplitter(Qt.Horizontal)

        # 좌측: 문제 리스트
        self.problem_list_panel = ProblemListPanel()
        self.problem_list_panel.setMinimumWidth(250)
        self.main_splitter.addWidget(self.problem_list_panel)

        # 중앙: 듀얼 뷰어
        self.center_viewer = self.create_center_viewer()
        self.center_viewer.setMinimumWidth(600)
        self.main_splitter.addWidget(self.center_viewer)

        # 우측: 태깅 폼
        self.tagging_form = TaggingFormPanel()
        self.tagging_form.setMinimumWidth(300)
        self.main_splitter.addWidget(self.tagging_form)

        # 스플리터 비율
        self.main_splitter.setSizes([300, 900, 400])

        layout.addWidget(self.main_splitter)

        # 시그널 연결
        self.problem_list_panel.problem_selected.connect(self.on_problem_selected)
        self.tagging_form.save_and_next_clicked.connect(self.on_save_and_next)

    def create_center_viewer(self) -> QWidget:
        """중앙 뷰어 생성"""
        viewer = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(8)
        viewer.setLayout(layout)

        # 듀얼 캔버스 (상하 분할)
        self.canvas_splitter = QSplitter(Qt.Vertical)

        # 문제 캔버스
        problem_widget = QWidget()
        problem_widget.setProperty("styleClass", "panel")
        problem_layout = QVBoxLayout()
        problem_layout.setContentsMargins(0, 0, 0, 0)
        problem_widget.setLayout(problem_layout)

        problem_title = QLabel("📄 문제")
        problem_title.setProperty("styleClass", "h3")
        problem_title.setStyleSheet("padding: 12px; background: #FAFAFA; border-bottom: 1px solid #DFE1E6;")
        problem_layout.addWidget(problem_title)

        self.problem_canvas = PageCanvas()
        problem_layout.addWidget(self.problem_canvas)

        self.canvas_splitter.addWidget(problem_widget)

        # 해설 캔버스
        solution_widget = QWidget()
        solution_widget.setProperty("styleClass", "panel")
        solution_layout = QVBoxLayout()
        solution_layout.setContentsMargins(0, 0, 0, 0)
        solution_widget.setLayout(solution_layout)

        solution_title = QLabel("📖 해설")
        solution_title.setProperty("styleClass", "h3")
        solution_title.setStyleSheet("padding: 12px; background: #FAFAFA; border-bottom: 1px solid #DFE1E6;")
        solution_layout.addWidget(solution_title)

        self.solution_canvas = SolutionCanvas()
        solution_layout.addWidget(self.solution_canvas)

        self.canvas_splitter.addWidget(solution_widget)

        # 스플리터 비율 (1:1)
        self.canvas_splitter.setSizes([400, 400])

        layout.addWidget(self.canvas_splitter)

        return viewer

    def set_document(self, document_id: str):
        """문서 설정"""
        self.current_document = document_id
        self.problem_list_panel.load_problems(document_id)

    def on_problem_selected(self, problem: ProblemGroup):
        """문제 선택 시"""
        self.current_problem = problem

        # 문제 이미지 로드
        # TODO: Phase 8.3에서 구현

        # 폼 로드
        self.tagging_form.load_problem(problem)

    def on_save_and_next(self):
        """저장 후 다음"""
        if not self.current_problem:
            return

        # 메타데이터 가져오기
        metadata = self.tagging_form.get_metadata()

        # 현재 문제에 저장
        self.current_problem.metadata = metadata

        # TODO: Phase 8.4에서 JSON 저장 구현

        print(f"[TaggingMode] 저장: {self.current_problem.id}")
        print(f"  정답: {metadata.answer}")
        print(f"  학년: {metadata.grade_level}")
        print(f"  난이도: {metadata.difficulty}")

        # 다음 문제로 이동
        # TODO: Phase 8.5에서 구현
```

#### 검증 기준 (8.2)
- [ ] 문제 등록 모드로 전환 시 3패널 레이아웃 표시
- [ ] 좌측에 문제 리스트 표시 (더미 데이터라도)
- [ ] 우측에 태깅 폼 표시
- [ ] 폼 입력 가능

---

### 8.3 문제 이미지 표시 + 썸네일 (3일)

(계속 작성 중...)

---

## (나머지 Phase 8, 9, 10은 동일한 수준의 상세도로 작성)

---

## 검증 체크리스트

### Phase 6 완료 기준
- [ ] app.qss 로드 성공
- [ ] ModernAppBar 표시
- [ ] 모드 전환 작동
- [ ] 버튼 스타일 적용

### Phase 7 완료 기준
- [ ] 페이지 진행률 표시
- [ ] 캔버스 헤더 표시
- [ ] 그룹 상태 아이콘 표시

### Phase 8 완료 기준
- [ ] ProblemMetadata 저장/로드
- [ ] 태깅 폼 입력/저장
- [ ] 문제 이미지 표시
- [ ] "저장 후 다음" 작동

### Phase 9 완료 기준
- [ ] 문제 검색/필터
- [ ] 테이블 표시
- [ ] 미리보기 작동

### Phase 10 완료 기준
- [ ] Lazy loading 작동
- [ ] 썸네일 캐싱
- [ ] 대용량 데이터 처리 시 UI 반응성

---

## 리스크 관리

### 주요 리스크
1. QSS 브라우저 호환성 → Windows 10/11만 집중 테스트
2. 썸네일 로딩 성능 → Lazy loading 필수
3. 데이터 마이그레이션 → Backward compatible 설계

### 대응 방안
- 단계별 검증 후 다음 단계 진행
- 각 Phase 완료 시 사용자 테스트
- Git 커밋 자주 하여 롤백 가능하도록

---

## 다음 액션

**Phase 6.1 착수 준비 완료**

사용자 승인 후 즉시 `src/styles/app.qss` 작성 시작 가능합니다.
