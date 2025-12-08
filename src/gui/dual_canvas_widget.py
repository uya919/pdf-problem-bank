"""
듀얼 캔버스 위젯

Phase 4: 문제 페이지(좌) + 해설 페이지(우) 동시 표시
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QSplitter, QLabel,
    QSpinBox, QCheckBox, QPushButton
)
from PySide6.QtCore import Qt, Signal
from pathlib import Path
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from gui.page_canvas import PageCanvas


class SolutionCanvas(PageCanvas):
    """
    해설 페이지 캔버스 (Phase 5: 영역 선택 기능)

    기능:
    - PageCanvas 상속 (이미지 + 블록 표시)
    - selection_mode=True일 때 마우스 드래그로 영역 선택
    - 선택된 영역은 초록색 테두리로 표시
    """

    region_selected = Signal(tuple)  # (x, y, w, h) - Scene 좌표

    def __init__(self):
        super().__init__()

        # Phase 5: 영역 선택 모드
        self.selection_mode = False
        self.solution_selection_start = None  # 드래그 시작 위치 (viewport 좌표)
        self.solution_is_selecting = False  # 영역 선택 중인지
        self.solution_selection_rect = None  # QRubberBand (선택 중)
        self.selected_region_item = None  # QGraphicsRectItem (선택 완료된 영역)
        self.selected_region_bbox = None  # (x, y, w, h) - Scene 좌표

    def set_selection_mode(self, enabled: bool):
        """
        영역 선택 모드 설정 (Phase 5.1)

        Args:
            enabled: True이면 드래그로 영역 선택 가능
        """
        self.selection_mode = enabled

        if enabled:
            # 선택 모드: 드래그 비활성화
            self.setDragMode(QGraphicsView.NoDrag)
            print("[SolutionCanvas] 영역 선택 모드 활성화")
        else:
            # 일반 모드: 스크롤 드래그 활성화
            self.setDragMode(QGraphicsView.ScrollHandDrag)
            print("[SolutionCanvas] 영역 선택 모드 비활성화")

    def clear_selected_region(self):
        """선택된 영역 제거 (Phase 5.1)"""
        if self.selected_region_item is not None:
            self.scene.removeItem(self.selected_region_item)
            self.selected_region_item = None

        self.selected_region_bbox = None
        print("[SolutionCanvas] 선택 영역 제거")

    def mousePressEvent(self, event):
        """
        마우스 클릭 이벤트 (Phase 5.1: 영역 선택)

        selection_mode=True일 때만 드래그로 영역 선택 시작
        """
        # 영역 선택 모드 & 좌클릭
        if self.selection_mode and event.button() == Qt.LeftButton:
            self.solution_selection_start = event.pos()
            self.solution_is_selecting = True

            # QRubberBand 생성 및 표시
            if self.solution_selection_rect is None:
                self.solution_selection_rect = QRubberBand(QRubberBand.Rectangle, self)
            self.solution_selection_rect.setGeometry(QRect(self.solution_selection_start, self.solution_selection_start))
            self.solution_selection_rect.show()

            print("[SolutionCanvas] 영역 선택 시작")
            return  # PageCanvas의 처리 스킵

        # 일반 모드: PageCanvas의 블록 선택 기능 사용
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event):
        """
        마우스 이동 이벤트 (Phase 5.1: 선택 영역 업데이트)
        """
        if self.solution_is_selecting and self.solution_selection_start is not None:
            # 현재 마우스 위치로 사각형 업데이트
            current_rect = QRect(self.solution_selection_start, event.pos()).normalized()
            self.solution_selection_rect.setGeometry(current_rect)
        else:
            # 일반 드래그 (스크롤 or PageCanvas 처리)
            super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        """
        마우스 릴리스 이벤트 (Phase 5.1: 영역 선택 완료)
        """
        if self.solution_is_selecting and event.button() == Qt.LeftButton:
            # 영역 선택 완료
            if self.solution_selection_rect is not None:
                # Viewport 좌표 → Scene 좌표 변환
                viewport_rect = self.solution_selection_rect.geometry()
                top_left = self.mapToScene(viewport_rect.topLeft())
                bottom_right = self.mapToScene(viewport_rect.bottomRight())

                # Scene 좌표로 bbox 계산
                x = min(top_left.x(), bottom_right.x())
                y = min(top_left.y(), bottom_right.y())
                w = abs(bottom_right.x() - top_left.x())
                h = abs(bottom_right.y() - top_left.y())

                # 최소 크기 체크 (너무 작은 영역은 무시)
                if w >= 10 and h >= 10:
                    self.selected_region_bbox = (x, y, w, h)

                    # 기존 선택 영역 제거
                    if self.selected_region_item is not None:
                        self.scene.removeItem(self.selected_region_item)

                    # 새 선택 영역 표시 (초록색 테두리)
                    from PySide6.QtWidgets import QGraphicsRectItem
                    from PySide6.QtGui import QPen, QBrush, QColor
                    from PySide6.QtCore import QRectF

                    self.selected_region_item = QGraphicsRectItem(QRectF(x, y, w, h))
                    pen = QPen(QColor(0, 200, 0), 3)  # 초록색, 3px
                    self.selected_region_item.setPen(pen)
                    brush = QBrush(QColor(0, 200, 0, 30))  # 반투명 초록
                    self.selected_region_item.setBrush(brush)
                    self.scene.addItem(self.selected_region_item)

                    # 시그널 발생
                    self.region_selected.emit(self.selected_region_bbox)

                    print(f"[SolutionCanvas] 영역 선택 완료: ({x:.0f}, {y:.0f}, {w:.0f}, {h:.0f})")
                else:
                    print("[SolutionCanvas] 영역이 너무 작아 무시됨")

                # QRubberBand 숨기기
                self.solution_selection_rect.hide()

            # 영역 선택 상태 리셋
            self.solution_is_selecting = False
            self.solution_selection_start = None
        else:
            # 일반 모드: PageCanvas 처리
            super().mouseReleaseEvent(event)


class DualCanvasWidget(QWidget):
    """
    듀얼 캔버스 위젯 (문제 + 해설)

    레이아웃:
        [문제 캔버스 | 해설 캔버스]
        [컨트롤: 해설 페이지 선택, 동기화 옵션]
    """

    # 시그널
    problem_page_changed = Signal(int)
    solution_page_changed = Signal(int)

    def __init__(self):
        super().__init__()
        self.solution_pdf_loaded = False
        self.solution_total_pages = 0
        self.scroll_sync_connected = False  # Phase 7: 스크롤 동기화 연결 상태 추적
        self.setup_ui()

    def setup_ui(self):
        """UI 설정"""
        layout = QVBoxLayout()
        self.setLayout(layout)

        # 메인 스플리터 (좌우)
        self.splitter = QSplitter(Qt.Horizontal)
        layout.addWidget(self.splitter)

        # 좌측: 문제 캔버스
        self.problem_canvas = self.create_problem_canvas()
        self.problem_canvas.setMinimumWidth(200)  # Phase 4.7.1: 최소 너비 설정
        self.splitter.addWidget(self.problem_canvas)

        # 우측: 해설 캔버스
        self.solution_canvas = self.create_solution_canvas()
        self.solution_canvas.setMinimumWidth(200)  # Phase 4.7.1: 최소 너비 설정
        self.splitter.addWidget(self.solution_canvas)

        # 스플리터 비율 (1:1)
        self.splitter.setSizes([600, 600])

        # 하단 컨트롤 패널
        control_panel = self.create_control_panel()
        layout.addWidget(control_panel)

    def create_canvas_header(self, title: str, is_problem: bool):
        """
        캔버스 헤더 생성 (Phase 7.2)

        Args:
            title: 헤더 제목
            is_problem: True면 문제 캔버스, False면 해설 캔버스

        Returns:
            헤더 위젯
        """
        header = QWidget()
        header.setProperty("styleClass", "canvasHeader")
        header_layout = QHBoxLayout()
        header_layout.setContentsMargins(12, 8, 12, 8)
        header.setLayout(header_layout)

        # 제목
        title_label = QLabel(title)
        title_label.setProperty("styleClass", "h3")
        header_layout.addWidget(title_label)

        header_layout.addStretch()

        # 줌 컨트롤
        zoom_out_btn = QPushButton("🔍➖")
        zoom_out_btn.setProperty("styleClass", "ghost")
        zoom_out_btn.setToolTip("축소")
        zoom_out_btn.setMaximumWidth(40)
        header_layout.addWidget(zoom_out_btn)

        zoom_label = QLabel("100%")
        zoom_label.setProperty("styleClass", "caption")
        zoom_label.setMinimumWidth(50)
        zoom_label.setAlignment(Qt.AlignCenter)
        header_layout.addWidget(zoom_label)

        zoom_in_btn = QPushButton("🔍➕")
        zoom_in_btn.setProperty("styleClass", "ghost")
        zoom_in_btn.setToolTip("확대")
        zoom_in_btn.setMaximumWidth(40)
        header_layout.addWidget(zoom_in_btn)

        zoom_reset_btn = QPushButton("100%")
        zoom_reset_btn.setProperty("styleClass", "ghost")
        zoom_reset_btn.setToolTip("원본 크기")
        zoom_reset_btn.setMaximumWidth(50)
        header_layout.addWidget(zoom_reset_btn)

        # 줌 버튼 이벤트 연결
        if is_problem:
            # 문제 캔버스 줌
            zoom_in_btn.clicked.connect(lambda: self._on_zoom_in_problem(zoom_label))
            zoom_out_btn.clicked.connect(lambda: self._on_zoom_out_problem(zoom_label))
            zoom_reset_btn.clicked.connect(lambda: self._on_zoom_reset_problem(zoom_label))
            self.problem_zoom_label = zoom_label  # 나중에 업데이트용으로 저장
        else:
            # 해설 캔버스 줌
            zoom_in_btn.clicked.connect(lambda: self._on_zoom_in_solution(zoom_label))
            zoom_out_btn.clicked.connect(lambda: self._on_zoom_out_solution(zoom_label))
            zoom_reset_btn.clicked.connect(lambda: self._on_zoom_reset_solution(zoom_label))
            self.solution_zoom_label = zoom_label

        return header

    def _on_zoom_in_problem(self, label):
        """문제 캔버스 확대"""
        self.problem_canvas_view.zoom_in()
        label.setText(f"{self.problem_canvas_view.zoom_level:.0%}")

    def _on_zoom_out_problem(self, label):
        """문제 캔버스 축소"""
        self.problem_canvas_view.zoom_out()
        label.setText(f"{self.problem_canvas_view.zoom_level:.0%}")

    def _on_zoom_reset_problem(self, label):
        """문제 캔버스 원본 크기"""
        self.problem_canvas_view.zoom_reset()
        label.setText(f"{self.problem_canvas_view.zoom_level:.0%}")

    def _on_zoom_in_solution(self, label):
        """해설 캔버스 확대"""
        self.solution_canvas_view.zoom_in()
        label.setText(f"{self.solution_canvas_view.zoom_level:.0%}")

    def _on_zoom_out_solution(self, label):
        """해설 캔버스 축소"""
        self.solution_canvas_view.zoom_out()
        label.setText(f"{self.solution_canvas_view.zoom_level:.0%}")

    def _on_zoom_reset_solution(self, label):
        """해설 캔버스 원본 크기"""
        self.solution_canvas_view.zoom_reset()
        label.setText(f"{self.solution_canvas_view.zoom_level:.0%}")

    def create_problem_canvas(self):
        """문제 캔버스 생성 (좌측) - Phase 7.2: 헤더 추가"""
        canvas_widget = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        canvas_widget.setLayout(layout)

        # Phase 7.2: 캔버스 헤더
        header = self.create_canvas_header("📄 문제 페이지", is_problem=True)
        layout.addWidget(header)

        # 캔버스
        self.problem_canvas_view = PageCanvas()
        layout.addWidget(self.problem_canvas_view)

        return canvas_widget

    def create_solution_canvas(self):
        """해설 캔버스 생성 (우측) - Phase 7.2: 헤더 추가"""
        canvas_widget = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        canvas_widget.setLayout(layout)

        # Phase 7.2: 캔버스 헤더
        header = self.create_canvas_header("📖 해설 페이지", is_problem=False)
        layout.addWidget(header)

        # 캔버스
        self.solution_canvas_view = SolutionCanvas()
        layout.addWidget(self.solution_canvas_view)

        # 해설 없음 안내
        self.no_solution_label = QLabel("해설 PDF가 로드되지 않았습니다")
        self.no_solution_label.setAlignment(Qt.AlignCenter)
        self.no_solution_label.setStyleSheet("color: #999; font-size: 14px;")
        layout.addWidget(self.no_solution_label)

        # 초기 상태: 해설 캔버스 숨김
        self.solution_canvas_view.hide()
        self.no_solution_label.show()

        return canvas_widget

    def create_control_panel(self):
        """하단 컨트롤 패널"""
        panel = QWidget()
        layout = QHBoxLayout()
        panel.setLayout(layout)

        # Phase 4.7.3: 해설 페이지 네비게이션
        layout.addWidget(QLabel("해설 페이지:"))

        # ◀ 이전 버튼
        self.solution_prev_button = QPushButton("◀")
        self.solution_prev_button.setMaximumWidth(40)
        self.solution_prev_button.setEnabled(False)
        self.solution_prev_button.clicked.connect(self.on_solution_prev_page)
        self.solution_prev_button.setToolTip("이전 해설 페이지")
        layout.addWidget(self.solution_prev_button)

        # 페이지 SpinBox
        self.solution_page_spinbox = QSpinBox()
        self.solution_page_spinbox.setMinimum(1)
        self.solution_page_spinbox.setMaximum(1)
        self.solution_page_spinbox.setEnabled(False)
        self.solution_page_spinbox.valueChanged.connect(self.on_solution_page_changed)
        layout.addWidget(self.solution_page_spinbox)

        # ▶ 다음 버튼
        self.solution_next_button = QPushButton("▶")
        self.solution_next_button.setMaximumWidth(40)
        self.solution_next_button.setEnabled(False)
        self.solution_next_button.clicked.connect(self.on_solution_next_page)
        self.solution_next_button.setToolTip("다음 해설 페이지")
        layout.addWidget(self.solution_next_button)

        layout.addSpacing(20)

        # Phase 5.1: 영역 선택 모드 (해설 캔버스)
        self.region_selection_checkbox = QCheckBox("🔍 영역 선택")
        self.region_selection_checkbox.setChecked(False)
        self.region_selection_checkbox.setEnabled(False)  # 해설 PDF 로드 후 활성화
        self.region_selection_checkbox.stateChanged.connect(self.on_region_selection_changed)
        self.region_selection_checkbox.setToolTip("해설 페이지에서 영역을 드래그하여 선택")
        layout.addWidget(self.region_selection_checkbox)

        layout.addSpacing(20)

        # 동기화 옵션 (Phase 4.4)
        self.sync_zoom_checkbox = QCheckBox("줌 동기화")
        self.sync_zoom_checkbox.setChecked(True)  # 기본값: 활성화
        self.sync_zoom_checkbox.stateChanged.connect(self.on_sync_zoom_changed)
        layout.addWidget(self.sync_zoom_checkbox)

        self.sync_scroll_checkbox = QCheckBox("스크롤 동기화")
        self.sync_scroll_checkbox.setChecked(True)  # 기본값: 활성화
        self.sync_scroll_checkbox.stateChanged.connect(self.on_sync_scroll_changed)
        layout.addWidget(self.sync_scroll_checkbox)

        layout.addStretch()

        return panel

    def load_problem_page(self, image_path: Path, blocks_path: Path):
        """
        문제 페이지 로드

        Args:
            image_path: 페이지 이미지 경로
            blocks_path: 블록 JSON 경로
        """
        self.problem_canvas_view.load_page(image_path, blocks_path)

    def load_solution_page(self, image_path: Path, blocks_path: Path = None):
        """
        해설 페이지 로드 (Phase 4.6.3: 블록 JSON 포함)

        Args:
            image_path: 해설 페이지 이미지 경로
            blocks_path: 해설 블록 JSON 경로 (None이면 블록 없이 이미지만 표시)
        """
        if not image_path.exists():
            print(f"[DualCanvas] 해설 이미지 없음: {image_path}")
            return

        # 해설 캔버스에 이미지 + 블록 로드
        self.solution_canvas_view.load_page(image_path, blocks_path)

        # UI 업데이트
        self.solution_canvas_view.show()
        self.no_solution_label.hide()

        block_status = "블록 있음" if blocks_path and blocks_path.exists() else "블록 없음"
        print(f"[DualCanvas] 해설 페이지 로드: {image_path.name} ({block_status})")

    def set_solution_pdf_info(self, total_pages: int):
        """
        해설 PDF 정보 설정

        Args:
            total_pages: 해설 PDF 총 페이지 수
        """
        self.solution_pdf_loaded = True
        self.solution_total_pages = total_pages

        # SpinBox 업데이트
        self.solution_page_spinbox.setMaximum(total_pages)
        self.solution_page_spinbox.setEnabled(True)

        # Phase 4.7.3: 네비게이션 버튼 활성화
        self.solution_prev_button.setEnabled(True)
        self.solution_next_button.setEnabled(True)

        # Phase 5.1: 영역 선택 체크박스 활성화
        self.region_selection_checkbox.setEnabled(True)

        # Phase 4.4: 스크롤 동기화 활성화 (기본값)
        if self.sync_scroll_checkbox.isChecked():
            self.on_sync_scroll_changed(2)  # Qt.Checked

        print(f"[DualCanvas] 해설 PDF 정보 설정: {total_pages}페이지")

    def set_solution_page_manual(self, page_index: int):
        """
        해설 페이지 수동 선택

        Args:
            page_index: 페이지 번호 (0-based)
        """
        # SpinBox 업데이트 (1-based)
        self.solution_page_spinbox.setValue(page_index + 1)

    def on_solution_page_changed(self, page_num: int):
        """해설 페이지 SpinBox 변경 시"""
        # 1-based → 0-based
        page_index = page_num - 1
        self.solution_page_changed.emit(page_index)

        # Phase 4.7.3: 버튼 활성화 상태 업데이트
        self.solution_prev_button.setEnabled(page_num > 1)
        self.solution_next_button.setEnabled(page_num < self.solution_total_pages)

        print(f"[DualCanvas] 해설 페이지 변경: {page_num}")

    def on_solution_prev_page(self):
        """이전 해설 페이지 (◀ 버튼) - Phase 4.7.3"""
        current_page = self.solution_page_spinbox.value()
        if current_page > 1:
            self.solution_page_spinbox.setValue(current_page - 1)

    def on_solution_next_page(self):
        """다음 해설 페이지 (▶ 버튼) - Phase 4.7.3"""
        current_page = self.solution_page_spinbox.value()
        max_page = self.solution_page_spinbox.maximum()
        if current_page < max_page:
            self.solution_page_spinbox.setValue(current_page + 1)

    def on_region_selection_changed(self, state):
        """영역 선택 모드 체크박스 변경 시 (Phase 5.1)"""
        enabled = (state == 2)  # Qt.Checked
        self.solution_canvas_view.set_selection_mode(enabled)

        if enabled:
            # 영역 선택 모드: 스크롤 동기화 비활성화 (간섭 방지)
            if self.sync_scroll_checkbox.isChecked():
                self.sync_scroll_checkbox.setChecked(False)
            print("[DualCanvas] 영역 선택 모드 활성화")
        else:
            print("[DualCanvas] 영역 선택 모드 비활성화")

    def on_sync_zoom_changed(self, state):
        """줌 동기화 체크박스 변경 시 (Phase 4.4)"""
        enabled = (state == 2)  # Qt.Checked
        if enabled and self.solution_pdf_loaded:
            # 현재 문제 캔버스의 줌 레벨로 해설 캔버스 동기화
            self.solution_canvas_view.zoom_level = self.problem_canvas_view.zoom_level
            self.solution_canvas_view.resetTransform()
            self.solution_canvas_view.scale(self.solution_canvas_view.zoom_level,
                                           self.solution_canvas_view.zoom_level)
            print(f"[DualCanvas] 줌 동기화 활성화: {self.problem_canvas_view.zoom_level:.0%}")
        else:
            print("[DualCanvas] 줌 동기화 비활성화")

    def on_sync_scroll_changed(self, state):
        """스크롤 동기화 체크박스 변경 시 (Phase 4.4)"""
        enabled = (state == 2)  # Qt.Checked

        if enabled and self.solution_pdf_loaded:
            # 이미 연결되어 있지 않은 경우에만 연결
            if not self.scroll_sync_connected:
                # 스크롤바 시그널 연결
                self.problem_canvas_view.horizontalScrollBar().valueChanged.connect(
                    self.sync_horizontal_scroll
                )
                self.problem_canvas_view.verticalScrollBar().valueChanged.connect(
                    self.sync_vertical_scroll
                )
                self.scroll_sync_connected = True

            # 현재 스크롤 위치 동기화
            self.sync_horizontal_scroll(self.problem_canvas_view.horizontalScrollBar().value())
            self.sync_vertical_scroll(self.problem_canvas_view.verticalScrollBar().value())

            print("[DualCanvas] 스크롤 동기화 활성화")
        else:
            # 연결되어 있는 경우에만 해제
            if self.scroll_sync_connected:
                try:
                    self.problem_canvas_view.horizontalScrollBar().valueChanged.disconnect(
                        self.sync_horizontal_scroll
                    )
                    self.problem_canvas_view.verticalScrollBar().valueChanged.disconnect(
                        self.sync_vertical_scroll
                    )
                    self.scroll_sync_connected = False
                except Exception as e:
                    print(f"[DualCanvas] 스크롤 동기화 해제 중 오류 (무시): {e}")

            print("[DualCanvas] 스크롤 동기화 비활성화")

    def sync_horizontal_scroll(self, value):
        """수평 스크롤 동기화 (Phase 4.4)"""
        if self.solution_pdf_loaded:
            self.solution_canvas_view.horizontalScrollBar().setValue(value)

    def sync_vertical_scroll(self, value):
        """수직 스크롤 동기화 (Phase 4.4)"""
        if self.solution_pdf_loaded:
            self.solution_canvas_view.verticalScrollBar().setValue(value)

    # ========== PageCanvas 인터페이스 호환성 (Phase 4) ==========
    # main_window.py에서 center_canvas에 접근하는 메서드들을 문제 캔버스로 위임

    def load_page(self, image_path: Path, blocks_path: Path = None):
        """페이지 로드 (문제 캔버스로 위임)"""
        self.problem_canvas_view.load_page(image_path, blocks_path)

    def clear(self):
        """캔버스 초기화"""
        self.problem_canvas_view.clear()
        self.solution_canvas_view.clear()

    def zoom_in(self):
        """확대 (Phase 4.4: 동기화 지원)"""
        self.problem_canvas_view.zoom_in()
        if self.sync_zoom_checkbox.isChecked() and self.solution_pdf_loaded:
            self.solution_canvas_view.zoom_in()

    def zoom_out(self):
        """축소 (Phase 4.4: 동기화 지원)"""
        self.problem_canvas_view.zoom_out()
        if self.sync_zoom_checkbox.isChecked() and self.solution_pdf_loaded:
            self.solution_canvas_view.zoom_out()

    def zoom_reset(self):
        """줌 리셋 (Phase 4.4: 동기화 지원)"""
        self.problem_canvas_view.zoom_reset()
        if self.sync_zoom_checkbox.isChecked() and self.solution_pdf_loaded:
            self.solution_canvas_view.zoom_reset()

    def clear_selection(self):
        """블록 선택 해제"""
        self.problem_canvas_view.clear_selection()

    def update_block_styles(self):
        """블록 스타일 업데이트"""
        self.problem_canvas_view.update_block_styles()

    # 시그널 위임
    @property
    def block_clicked(self):
        """블록 클릭 시그널"""
        return self.problem_canvas_view.block_clicked

    @property
    def blocks_selected(self):
        """블록 선택 시그널"""
        return self.problem_canvas_view.blocks_selected

    # 속성 위임
    @property
    def selected_blocks(self):
        """선택된 블록 ID 집합"""
        return self.problem_canvas_view.selected_blocks

    @selected_blocks.setter
    def selected_blocks(self, value):
        self.problem_canvas_view.selected_blocks = value

    @property
    def current_page_data(self):
        """현재 페이지 데이터"""
        return self.problem_canvas_view.current_page_data

    @property
    def zoom_level(self):
        """현재 줌 레벨"""
        return self.problem_canvas_view.zoom_level
