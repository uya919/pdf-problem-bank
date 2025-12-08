"""
메인 윈도우

PDF 문제 크롭 앱의 메인 UI
"""
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QSplitter, QToolBar, QStatusBar, QFileDialog, QMessageBox,
    QProgressDialog, QComboBox, QPushButton, QLabel, QInputDialog
)
from PySide6.QtCore import Qt, Signal, QCoreApplication, QSettings
from PySide6.QtGui import QAction, QKeyEvent
from pathlib import Path
import sys

# 프로젝트 모듈 임포트 (상대 경로)
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from gui.side_panels import LeftSidePanel, GroupListPanel
from gui.page_canvas import PageCanvas
from gui.labeling_mode_widget import LabelingModeWidget  # Phase 4
from gui.tagging_mode_widget import TaggingModeWidget  # Phase 4
from gui.bank_view_mode_widget import BankViewModeWidget  # Phase 4
from gui.modern_app_bar import ModernAppBar  # Phase 6.2
from gui.background_analyzer import BackgroundAnalyzer  # Phase 0: Lazy Loading
from pdf_pipeline import PDFPipeline
from grouping import GroupingManager
from data_models import GroupData, ProblemGroup
from utils import imread_unicode
from datetime import datetime
from PySide6.QtWidgets import QStackedWidget  # Phase 4
from layout_manager import LayoutManager, LayoutPreset  # Phase 4.5


class MainWindow(QMainWindow):
    """
    메인 윈도우

    레이아웃:
        [툴바]
        [좌측 패널 | 중앙 캔버스 | 우측 패널]
        [상태바]
    """

    # 시그널
    pdf_opened = Signal(str)  # PDF 경로
    page_changed = Signal(int)  # 페이지 번호

    def __init__(self):
        super().__init__()
        self.config = Config.load()
        self.pipeline = PDFPipeline(self.config)
        self.grouping_manager = GroupingManager(self.config)  # Phase 3
        self.layout_manager = LayoutManager()  # Phase 4.5: 레이아웃 프리셋 관리자
        self.current_document = None
        self.current_page = 0
        self.total_pages = 0  # 현재 문서의 총 페이지 수
        self.analyzed_pages = 0  # Phase 0: Lazy Loading - 분석 완료된 페이지 수
        self.current_group_data = None  # Phase 3: 현재 페이지의 그룹 데이터

        # Phase 0: Lazy Loading - 백그라운드 분석 스레드
        self.background_analyzer = BackgroundAnalyzer()
        self.background_analyzer.batch_completed.connect(self.on_batch_analyzed)
        self.background_analyzer.all_completed.connect(self.on_all_analyzed)
        self.background_analyzer.progress.connect(self.on_background_progress)
        self.background_analyzer.error.connect(self.on_background_error)

        self.setup_ui()
        self.setup_toolbar()
        self.setup_statusbar()
        self.connect_signals()

        # 윈도우 설정
        self.setWindowTitle("PDF 문제 이미지 크롭 & 라벨링")
        self.setGeometry(100, 100, 1400, 900)

        # Phase 4.5.5: 마지막 사용한 레이아웃 프리셋 로드
        self.load_last_layout_preset()

        # 초기 문서 목록 로드
        self.load_initial_documents()

    def setup_ui(self):
        """
        UI 레이아웃 설정 (Phase 6: ModernAppBar 추가)
        """
        # 중앙 위젯
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # 메인 레이아웃 (수직: ModernAppBar → 모드 스택)
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        central_widget.setLayout(main_layout)

        # Phase 6.2: ModernAppBar 추가
        self.app_bar = ModernAppBar()
        main_layout.addWidget(self.app_bar)

        # Phase 4: QStackedWidget으로 3가지 모드 전환
        self.mode_stack = QStackedWidget()
        main_layout.addWidget(self.mode_stack)

        # 모드 1: 라벨링 모드 (기존 기능)
        self.labeling_widget = LabelingModeWidget()
        self.mode_stack.addWidget(self.labeling_widget)  # index 0

        # 모드 2: 태깅 모드 (Phase 7 구현)
        self.tagging_widget = TaggingModeWidget()
        self.mode_stack.addWidget(self.tagging_widget)  # index 1

        # 모드 3: 문제은행 모드 (Phase 8 구현)
        self.bank_widget = BankViewModeWidget()
        self.mode_stack.addWidget(self.bank_widget)  # index 2

        # 기본 모드: 라벨링
        self.mode_stack.setCurrentIndex(0)

        # Phase 4: 기존 패널들을 래핑한 위젯에서 접근
        # (하위 호환성을 위해 속성 유지)
        self.left_panel = self.labeling_widget.left_panel
        self.center_canvas = self.labeling_widget.center_canvas
        self.right_panel = self.labeling_widget.right_panel

    def create_left_panel(self):
        """좌측 패널 생성 (문서/페이지 리스트)"""
        panel = LeftSidePanel()
        return panel

    def create_center_canvas(self):
        """중앙 캔버스 생성 (페이지 이미지 + 블록)"""
        canvas = PageCanvas()
        return canvas

    def create_right_panel(self):
        """우측 패널 생성 (그룹 리스트, Phase 3)"""
        panel = GroupListPanel()
        # Phase 3: 활성화됨
        return panel

    def setup_toolbar(self):
        """툴바 설정 (Phase 4: 모드 전환 버튼 추가)"""
        toolbar = QToolBar("메인 툴바")
        toolbar.setMovable(False)
        self.addToolBar(toolbar)

        # ===== Phase 4: 모드 전환 버튼 =====
        self.action_labeling = QAction("📄 라벨링", self)
        self.action_labeling.setStatusTip("라벨링 모드 (블록 그룹핑)")
        self.action_labeling.setCheckable(True)
        self.action_labeling.setChecked(True)  # 기본 선택
        self.action_labeling.triggered.connect(self.switch_to_labeling_mode)
        toolbar.addAction(self.action_labeling)

        self.action_tagging = QAction("🏷️ 태깅", self)
        self.action_tagging.setStatusTip("태깅 모드 (메타데이터 입력)")
        self.action_tagging.setCheckable(True)
        self.action_tagging.triggered.connect(self.switch_to_tagging_mode)
        toolbar.addAction(self.action_tagging)

        self.action_bank = QAction("🗄️ 문제은행", self)
        self.action_bank.setStatusTip("문제은행 모드 (검색/조회)")
        self.action_bank.setCheckable(True)
        self.action_bank.triggered.connect(self.switch_to_bank_mode)
        toolbar.addAction(self.action_bank)

        toolbar.addSeparator()
        # ========================================

        # Open PDF 버튼
        action_open = QAction("📁 Open PDF", self)
        action_open.setStatusTip("문제 PDF 파일 열기")
        action_open.triggered.connect(self.on_open_pdf)
        toolbar.addAction(action_open)

        # Phase 4: Load Solution PDF 버튼
        self.action_load_solution = QAction("📚 Load Solution", self)
        self.action_load_solution.setStatusTip("해설 PDF 로드")
        self.action_load_solution.triggered.connect(self.on_load_solution_pdf)
        self.action_load_solution.setEnabled(False)  # 문서 선택 후 활성화
        toolbar.addAction(self.action_load_solution)

        toolbar.addSeparator()

        # 페이지 네비게이션
        action_prev = QAction("◀ 이전", self)
        action_prev.setStatusTip("이전 페이지")
        action_prev.triggered.connect(self.on_prev_page)
        toolbar.addAction(action_prev)

        action_next = QAction("다음 ▶", self)
        action_next.setStatusTip("다음 페이지")
        action_next.triggered.connect(self.on_next_page)
        toolbar.addAction(action_next)

        toolbar.addSeparator()

        # 줌 컨트롤
        action_zoom_out = QAction("🔍➖", self)
        action_zoom_out.setStatusTip("축소")
        action_zoom_out.triggered.connect(self.on_zoom_out)
        toolbar.addAction(action_zoom_out)

        action_zoom_reset = QAction("100%", self)
        action_zoom_reset.setStatusTip("원본 크기")
        action_zoom_reset.triggered.connect(self.on_zoom_reset)
        toolbar.addAction(action_zoom_reset)

        action_zoom_in = QAction("🔍➕", self)
        action_zoom_in.setStatusTip("확대")
        action_zoom_in.triggered.connect(self.on_zoom_in)
        toolbar.addAction(action_zoom_in)

        toolbar.addSeparator()

        # Export 버튼 (Phase 3)
        self.action_export = QAction("💾 Export", self)
        self.action_export.setStatusTip("문제 이미지 내보내기 (Phase 3)")
        self.action_export.triggered.connect(self.on_export_problems)
        toolbar.addAction(self.action_export)

        toolbar.addSeparator()

        # Phase 4.5: 레이아웃 프리셋
        toolbar.addWidget(QLabel("레이아웃: "))

        self.layout_combo = QComboBox()
        self.layout_combo.setMinimumWidth(120)
        self.layout_combo.addItems(self.layout_manager.get_all_preset_names())
        self.layout_combo.currentTextChanged.connect(self.on_layout_preset_changed)
        self.layout_combo.setStatusTip("레이아웃 프리셋 선택")
        toolbar.addWidget(self.layout_combo)

        self.action_save_layout = QAction("💾", self)
        self.action_save_layout.setStatusTip("현재 레이아웃을 프리셋으로 저장")
        self.action_save_layout.triggered.connect(self.on_save_layout_preset)
        toolbar.addAction(self.action_save_layout)

        # Phase 4.7.2: 프리셋 삭제 버튼
        self.action_delete_layout = QAction("🗑️", self)
        self.action_delete_layout.setStatusTip("선택한 프리셋 삭제")
        self.action_delete_layout.triggered.connect(self.on_delete_layout_preset)
        toolbar.addAction(self.action_delete_layout)

    def setup_statusbar(self):
        """상태바 설정"""
        self.statusbar = QStatusBar()
        self.setStatusBar(self.statusbar)
        self.statusbar.showMessage("준비됨")

    # ========== 이벤트 핸들러 ==========

    def on_open_pdf(self):
        """PDF 열기 및 처리 (Phase 0: Lazy Loading 적용)"""
        # 파일 선택 다이얼로그
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "PDF 파일 선택",
            str(self.config.RAW_PDFS_DIR),
            "PDF Files (*.pdf)"
        )

        if not file_path:
            return

        pdf_path = Path(file_path)
        print(f"[선택된 PDF] {pdf_path}")

        # 프로그레스 다이얼로그 생성
        progress = QProgressDialog(
            "PDF 처리 중...",
            "취소",
            0,
            100,  # Phase 0: 100 단계로 변경
            self
        )
        progress.setWindowTitle("PDF 처리 (Lazy Loading)")
        progress.setWindowModality(Qt.WindowModal)
        progress.setMinimumDuration(0)  # 즉시 표시
        progress.setValue(0)

        try:
            # 진행 상황 콜백
            def update_progress(message: str, current: int, total: int):
                progress.setLabelText(message)
                progress.setValue(current)
                QCoreApplication.processEvents()  # UI 업데이트
                if progress.wasCanceled():
                    raise InterruptedError("사용자가 취소했습니다")

            # Phase 0: Lazy Loading PDF 처리 파이프라인 실행
            progress.setLabelText("PDF Lazy Loading 처리 시작...")
            result = self.pipeline.process_pdf_lazy(
                pdf_path=pdf_path,
                initial_pages=10,  # 첫 10페이지만 분석
                progress_callback=update_progress
            )

            document_id = result["document_id"]
            self.total_pages = result["total_pages"]
            self.analyzed_pages = result["analyzed_pages"]

            progress.setValue(100)

            # 성공 메시지
            QMessageBox.information(
                self,
                "초기 분석 완료",
                f"PDF 초기 분석이 완료되었습니다!\n\n"
                f"문서 ID: {document_id}\n"
                f"전체 페이지: {self.total_pages}\n"
                f"분석 완료: {self.analyzed_pages}페이지\n\n"
                f"나머지 {self.total_pages - self.analyzed_pages}페이지는\n"
                f"백그라운드에서 자동으로 분석됩니다."
            )

            # GUI 새로고침
            self.refresh_documents()

            # 새 문서 자동 선택
            self.select_document(document_id)

            # Phase 0: 백그라운드 분석 시작
            if self.total_pages > self.analyzed_pages:
                self.background_analyzer.set_document(
                    document_id,
                    current_page=0,
                    total_pages=self.total_pages
                )
                self.background_analyzer.start()
                print(f"[백그라운드 분석] 시작: {self.analyzed_pages}/{self.total_pages}페이지 완료")

            self.statusbar.showMessage(
                f"처리 완료: {document_id} ({self.analyzed_pages}/{self.total_pages}페이지 분석됨)"
            )

        except InterruptedError as e:
            self.statusbar.showMessage(str(e))
            print(f"[취소됨] {e}")

        except Exception as e:
            progress.close()
            QMessageBox.critical(
                self,
                "오류",
                f"PDF 처리 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            self.statusbar.showMessage(f"오류: {str(e)}")
            print(f"[오류] {e}")
            import traceback
            traceback.print_exc()

        finally:
            progress.close()

    def on_prev_page(self):
        """이전 페이지"""
        if not self.current_document:
            self.statusbar.showMessage("문서를 먼저 선택하세요")
            return

        if self.current_page > 0:
            self.current_page -= 1
            self.load_page_to_canvas(self.current_document, self.current_page)
            self.page_changed.emit(self.current_page)
            print(f"[페이지 이동] {self.current_page + 1}/{self.total_pages}")

    def on_next_page(self):
        """다음 페이지"""
        if not self.current_document:
            self.statusbar.showMessage("문서를 먼저 선택하세요")
            return

        if self.current_page < self.total_pages - 1:
            self.current_page += 1
            self.load_page_to_canvas(self.current_document, self.current_page)
            self.page_changed.emit(self.current_page)
            print(f"[페이지 이동] {self.current_page + 1}/{self.total_pages}")
        else:
            self.statusbar.showMessage("마지막 페이지입니다")

    def on_zoom_out(self):
        """축소"""
        self.center_canvas.zoom_out()
        self.statusbar.showMessage(f"줌: {self.center_canvas.zoom_level:.0%}")

    def on_zoom_reset(self):
        """100% 크기"""
        self.center_canvas.zoom_reset()
        self.statusbar.showMessage("줌: 100%")

    def on_zoom_in(self):
        """확대"""
        self.center_canvas.zoom_in()
        self.statusbar.showMessage(f"줌: {self.center_canvas.zoom_level:.0%}")

    # ========== 시그널 연결 ==========

    def connect_signals(self):
        """시그널/슬롯 연결"""
        # Phase 6.2: ModernAppBar 시그널
        self.app_bar.mode_changed.connect(self.on_app_bar_mode_changed)
        self.app_bar.open_pdf_clicked.connect(self.on_open_pdf)
        self.app_bar.open_solution_clicked.connect(self.on_load_solution_pdf)

        # 좌측 패널 시그널
        self.left_panel.document_selected.connect(self.on_document_selected)
        self.left_panel.document_deleted.connect(self.on_document_deleted)
        self.left_panel.page_selected.connect(self.on_page_selected_from_list)

        # 캔버스 시그널
        self.center_canvas.block_clicked.connect(self.on_block_clicked)
        self.center_canvas.blocks_selected.connect(self.on_blocks_selected)  # Phase 3

        # Phase 4: 듀얼 캔버스 시그널
        self.center_canvas.solution_page_changed.connect(self.load_solution_page)

        # 우측 패널 시그널 (Phase 3)
        self.right_panel.create_group_clicked.connect(self.on_create_group)
        self.right_panel.add_to_group_clicked.connect(self.on_add_to_group)
        self.right_panel.delete_group_clicked.connect(self.on_delete_group)
        self.right_panel.clear_selection_clicked.connect(self.on_clear_selection)

        # Phase 5.2: 해설 연결 시그널
        self.right_panel.link_solution_clicked.connect(self.on_link_solution)
        self.center_canvas.solution_canvas_view.region_selected.connect(self.on_solution_region_selected)

    # ========== 문서/페이지 관리 ==========

    def load_initial_documents(self):
        """초기 문서 목록 로드"""
        documents_path = self.config.DOCUMENTS_DIR
        if documents_path.exists():
            self.left_panel.load_documents(documents_path)
            print(f"[문서 로드] {documents_path}")
        else:
            print(f"[경고] 문서 폴더 없음: {documents_path}")

    def on_document_selected(self, doc_id: str):
        """문서 선택 시"""
        print(f"[MainWindow] 문서 선택: {doc_id}")
        self.current_document = doc_id
        self.current_page = 0

        # 페이지 목록 로드
        blocks_folder = self.config.DOCUMENTS_DIR / doc_id / "blocks"
        self.left_panel.load_pages(doc_id, blocks_folder)

        # 총 페이지 수 업데이트
        if blocks_folder.exists():
            self.total_pages = len(list(blocks_folder.glob("page_*_blocks.json")))
        else:
            self.total_pages = 0

        # Phase 4 & 6: Load Solution 버튼 활성화
        self.action_load_solution.setEnabled(True)
        self.app_bar.enable_solution_button(True)  # Phase 6.2

        # Phase 4: 해설 PDF 존재 여부 확인
        self.check_solution_pdf_loaded(doc_id)

        self.statusbar.showMessage(f"문서: {doc_id} ({self.total_pages}페이지)")

    def on_document_deleted(self, doc_id: str):
        """문서 삭제 시"""
        print(f"[MainWindow] 문서 삭제됨: {doc_id}")

        # 삭제된 문서가 현재 선택된 문서인 경우 초기화
        if self.current_document == doc_id:
            self.current_document = None
            self.current_page = 0
            self.total_pages = 0

            # 캔버스 초기화
            self.center_canvas.clear()

            # 페이지 목록 초기화
            self.left_panel.page_panel.list_widget.clear()

            self.statusbar.showMessage(f"문서 '{doc_id}' 삭제됨")

    def on_page_selected_from_list(self, page_index: int):
        """페이지 리스트에서 선택 시"""
        print(f"[MainWindow] 페이지 선택: {page_index}")
        self.current_page = page_index
        self.statusbar.showMessage(f"페이지: {page_index + 1}")

        # 중앙 캔버스에 페이지 로드
        if self.current_document:
            self.load_page_to_canvas(self.current_document, page_index)

    def load_page_to_canvas(self, doc_id: str, page_index: int):
        """
        캔버스에 페이지 로드 (Phase 3: 그룹 데이터도 로드)

        Args:
            doc_id: 문서 ID
            page_index: 페이지 번호
        """
        # 경로 생성
        doc_folder = self.config.DOCUMENTS_DIR / doc_id
        image_path = doc_folder / "pages" / f"page_{page_index:04d}.png"
        json_path = doc_folder / "blocks" / f"page_{page_index:04d}_blocks.json"

        # 캔버스에 로드
        self.center_canvas.load_page(image_path, json_path)

        # Phase 3: 그룹 데이터 로드
        self.load_current_groups()

        # Phase 4.5.1: 해설 페이지는 독립적으로 제어 (자동 동기화 제거)

        # 상태바 업데이트
        if self.center_canvas.current_page_data:
            num_blocks = len(self.center_canvas.current_page_data.blocks)
            num_groups = len(self.current_group_data.groups) if self.current_group_data else 0
            self.statusbar.showMessage(
                f"문서: {doc_id} | 페이지: {page_index + 1} | 블록: {num_blocks}개 | 그룹: {num_groups}개"
            )

    def on_block_clicked(self, block_id: int):
        """블록 클릭 시"""
        print(f"[MainWindow] 블록 클릭: Block #{block_id}")
        # Phase 3: 블록 선택 기능 구현됨

    def refresh_documents(self):
        """문서 목록 새로고침"""
        print("[MainWindow] 문서 목록 새로고침")
        self.load_initial_documents()

    def select_document(self, doc_id: str):
        """
        특정 문서 선택 (프로그램적으로)

        Args:
            doc_id: 선택할 문서 ID
        """
        print(f"[MainWindow] 문서 자동 선택: {doc_id}")
        # 문서 선택 이벤트 발생시키기
        self.on_document_selected(doc_id)

    # ========== Phase 3: 그룹 관리 ==========

    def on_blocks_selected(self, block_ids: list):
        """
        블록 선택 시 (Phase 3)

        Args:
            block_ids: 선택된 블록 ID 목록
        """
        print(f"[MainWindow] 선택된 블록: {len(block_ids)}개")
        # 우측 패널 업데이트
        self.right_panel.update_selected_blocks(block_ids)

    def on_create_group(self):
        """새 그룹 만들기 (Phase 3)"""
        if not self.center_canvas.current_page_data:
            QMessageBox.warning(self, "페이지 없음", "먼저 페이지를 선택해주세요.")
            return

        selected_blocks = list(self.center_canvas.selected_blocks)
        if not selected_blocks:
            QMessageBox.warning(self, "블록 미선택", "먼저 그룹에 포함할 블록을 선택해주세요.")
            return

        try:
            # 컬럼 결정 (첫 번째 블록의 컬럼 사용)
            page_data = self.center_canvas.current_page_data
            first_block = next(b for b in page_data.blocks if b.block_id == selected_blocks[0])
            column = first_block.column

            # 그룹 생성 (기존 그룹 목록 전달하여 ID 중복 방지)
            existing_groups = self.current_group_data.groups if self.current_group_data else []
            new_group = self.grouping_manager.create_group(
                page_data=page_data,
                selected_block_ids=selected_blocks,
                column=column,
                existing_groups=existing_groups
            )

            # GroupData 업데이트
            if self.current_group_data is None:
                self.current_group_data = GroupData(
                    document_id=page_data.document_id,
                    page_index=page_data.page_index,
                    groups=[],
                    status="edited",
                    created_at=datetime.now()
                )

            self.current_group_data.groups.append(new_group)
            self.current_group_data.modified_at = datetime.now()

            # 그룹 저장
            self.save_current_groups()

            # UI 업데이트
            self.right_panel.update_groups(self.current_group_data.groups)

            # 선택 해제
            self.center_canvas.clear_selection()

            QMessageBox.information(
                self,
                "그룹 생성 완료",
                f"그룹 '{new_group.id}'가 생성되었습니다.\n블록 수: {len(new_group.block_ids)}개"
            )

            print(f"[MainWindow] 그룹 생성: {new_group.id}, {len(new_group.block_ids)}개 블록")

        except Exception as e:
            QMessageBox.critical(
                self,
                "오류",
                f"그룹 생성 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            print(f"[오류] 그룹 생성 실패: {e}")
            import traceback
            traceback.print_exc()

    def on_add_to_group(self, group_id: str):
        """기존 그룹에 블록 추가 (Phase 3)"""
        if not self.current_group_data:
            QMessageBox.warning(self, "그룹 없음", "추가할 그룹이 없습니다.")
            return

        selected_blocks = list(self.center_canvas.selected_blocks)
        if not selected_blocks:
            QMessageBox.warning(self, "블록 미선택", "먼저 추가할 블록을 선택해주세요.")
            return

        try:
            # 그룹 찾기
            group = next((g for g in self.current_group_data.groups if g.id == group_id), None)
            if not group:
                QMessageBox.warning(self, "그룹 없음", f"그룹 '{group_id}'를 찾을 수 없습니다.")
                return

            # 블록 추가
            updated_group = self.grouping_manager.add_blocks_to_group(
                group=group,
                page_data=self.center_canvas.current_page_data,
                new_block_ids=selected_blocks
            )

            # 그룹 교체
            idx = self.current_group_data.groups.index(group)
            self.current_group_data.groups[idx] = updated_group
            self.current_group_data.modified_at = datetime.now()

            # 저장 및 UI 업데이트
            self.save_current_groups()
            self.right_panel.update_groups(self.current_group_data.groups)
            self.center_canvas.clear_selection()

            QMessageBox.information(
                self,
                "블록 추가 완료",
                f"그룹 '{group_id}'에 블록이 추가되었습니다.\n현재 블록 수: {len(updated_group.block_ids)}개"
            )

            print(f"[MainWindow] 그룹 {group_id}에 블록 추가: {len(updated_group.block_ids)}개")

        except Exception as e:
            QMessageBox.critical(
                self,
                "오류",
                f"블록 추가 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            print(f"[오류] 블록 추가 실패: {e}")
            import traceback
            traceback.print_exc()

    def on_delete_group(self, group_id: str):
        """그룹 삭제 (Phase 3)"""
        if not self.current_group_data:
            return

        try:
            # 그룹 찾기
            group = next((g for g in self.current_group_data.groups if g.id == group_id), None)
            if not group:
                QMessageBox.warning(self, "그룹 없음", f"그룹 '{group_id}'를 찾을 수 없습니다.")
                return

            # 그룹 제거
            self.current_group_data.groups.remove(group)
            self.current_group_data.modified_at = datetime.now()

            # 저장 및 UI 업데이트
            self.save_current_groups()
            self.right_panel.update_groups(self.current_group_data.groups)

            print(f"[MainWindow] 그룹 삭제: {group_id}")
            self.statusbar.showMessage(f"그룹 '{group_id}' 삭제됨")

        except Exception as e:
            QMessageBox.critical(
                self,
                "오류",
                f"그룹 삭제 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            print(f"[오류] 그룹 삭제 실패: {e}")
            import traceback
            traceback.print_exc()

    def on_clear_selection(self):
        """선택 해제 (Phase 3)"""
        self.center_canvas.clear_selection()
        print("[MainWindow] 선택 해제")

    # ========== Phase 5.2: 해설 연결 ==========

    def on_link_solution(self, group_id: str):
        """
        해설 연결 버튼 클릭 (Phase 5.2)

        워크플로우:
        1. 해설 캔버스의 영역 선택 모드 활성화
        2. 사용자가 해설 페이지에서 영역 드래그
        3. region_selected 시그널 발생 → on_solution_region_selected 호출
        4. 선택된 영역을 그룹에 저장

        Args:
            group_id: 해설을 연결할 그룹 ID
        """
        # 연결 중인 그룹 ID 저장 (인스턴스 변수)
        if not hasattr(self, '_linking_group_id'):
            self._linking_group_id = None
        self._linking_group_id = group_id

        # 해설 캔버스 영역 선택 모드 활성화
        # (DualCanvasWidget의 체크박스를 프로그래밍 방식으로 체크)
        self.center_canvas.region_selection_checkbox.setChecked(True)

        # 사용자 안내 메시지
        self.statusbar.showMessage(f"해설 페이지에서 그룹 '{group_id}'에 연결할 영역을 드래그하세요")
        print(f"[MainWindow] 해설 연결 대기 중: {group_id}")

        # 메시지 박스로도 안내
        QMessageBox.information(
            self,
            "해설 영역 선택",
            f"그룹 '{group_id}'에 연결할 해설 영역을 선택해주세요.\n\n"
            f"1. 해설 페이지에서 원하는 영역을 드래그하세요\n"
            f"2. 선택이 완료되면 자동으로 연결됩니다"
        )

    def on_solution_region_selected(self, bbox: tuple):
        """
        해설 영역 선택 완료 (Phase 5.2)

        Args:
            bbox: (x, y, w, h) - Scene 좌표
        """
        # 연결 중인 그룹 확인
        if not hasattr(self, '_linking_group_id') or not self._linking_group_id:
            print("[MainWindow] 해설 연결 대기 중이 아님 - 무시")
            return

        group_id = self._linking_group_id
        self._linking_group_id = None  # 초기화

        # 영역 선택 모드 비활성화
        self.center_canvas.region_selection_checkbox.setChecked(False)

        # 현재 해설 페이지 번호 가져오기
        solution_page_index = self.center_canvas.solution_page_spinbox.value() - 1  # 0-based

        # Phase 5.3: 그룹에 해설 정보 저장
        if not self.current_group_data:
            QMessageBox.warning(
                self,
                "오류",
                "현재 그룹 데이터가 없습니다."
            )
            return

        # 그룹 찾기
        from data_models import SolutionInfo
        group = next((g for g in self.current_group_data.groups if g.id == group_id), None)
        if not group:
            QMessageBox.warning(
                self,
                "오류",
                f"그룹 '{group_id}'를 찾을 수 없습니다."
            )
            return

        # 해설 정보 생성 및 연결
        group.solution_info = SolutionInfo(
            solution_page_index=solution_page_index,
            solution_region=bbox
        )

        # 수정 시간 업데이트
        from datetime import datetime
        self.current_group_data.modified_at = datetime.now()

        # 저장
        self.save_current_groups()

        print(f"[MainWindow] 해설 연결 완료:")
        print(f"  그룹: {group_id}")
        print(f"  해설 페이지: {solution_page_index}")
        print(f"  영역: {bbox}")

        # 사용자 안내
        self.statusbar.showMessage(f"그룹 '{group_id}'에 해설 연결 완료 및 저장됨")

        QMessageBox.information(
            self,
            "해설 연결 완료",
            f"그룹 '{group_id}'에 해설이 연결되었습니다!\n\n"
            f"해설 페이지: {solution_page_index + 1}\n"
            f"영역: ({bbox[0]:.0f}, {bbox[1]:.0f}, {bbox[2]:.0f}x{bbox[3]:.0f})\n\n"
            f"✓ JSON 파일에 저장되었습니다"
        )

    def save_current_groups(self):
        """현재 그룹 데이터 저장 (Phase 3)"""
        if not self.current_group_data or not self.current_document:
            return

        try:
            # 저장 경로
            labels_dir = self.config.DOCUMENTS_DIR / self.current_document / "labels"
            labels_path = labels_dir / f"page_{self.current_page:04d}_labels.json"

            # 저장
            self.grouping_manager.save_labels(self.current_group_data, labels_path)
            print(f"[MainWindow] 그룹 저장: {labels_path}")

        except Exception as e:
            print(f"[오류] 그룹 저장 실패: {e}")
            import traceback
            traceback.print_exc()

    def load_current_groups(self):
        """현재 페이지의 그룹 데이터 로드 (Phase 3)"""
        if not self.current_document:
            return

        try:
            # 로드 경로
            labels_dir = self.config.DOCUMENTS_DIR / self.current_document / "labels"
            labels_path = labels_dir / f"page_{self.current_page:04d}_labels.json"

            # 로드
            if labels_path.exists():
                self.current_group_data = self.grouping_manager.load_labels(labels_path)
                if self.current_group_data:
                    self.right_panel.update_groups(self.current_group_data.groups)
                    print(f"[MainWindow] 그룹 로드: {len(self.current_group_data.groups)}개")
            else:
                self.current_group_data = None
                self.right_panel.update_groups([])
                print("[MainWindow] 그룹 데이터 없음")

        except Exception as e:
            print(f"[오류] 그룹 로드 실패: {e}")
            import traceback
            traceback.print_exc()
            self.current_group_data = None
            self.right_panel.update_groups([])

    def on_export_problems(self):
        """문제 이미지 내보내기 (Phase 3)"""
        if not self.current_document:
            QMessageBox.warning(self, "문서 없음", "먼저 문서를 선택해주세요.")
            return

        # 현재 페이지 또는 전체 문서 선택
        reply = QMessageBox.question(
            self,
            "내보내기 범위",
            "어떤 범위를 내보내시겠습니까?",
            QMessageBox.StandardButton.Save | QMessageBox.StandardButton.SaveAll | QMessageBox.StandardButton.Cancel,
            QMessageBox.StandardButton.SaveAll
        )

        if reply == QMessageBox.StandardButton.Cancel:
            return

        export_all = (reply == QMessageBox.StandardButton.SaveAll)

        try:
            # 내보낼 페이지 목록
            if export_all:
                pages_to_export = list(range(self.total_pages))
            else:
                pages_to_export = [self.current_page]

            # 그룹이 있는 페이지만 필터링
            pages_with_groups = []
            for page_idx in pages_to_export:
                labels_path = self.config.DOCUMENTS_DIR / self.current_document / "labels" / f"page_{page_idx:04d}_labels.json"
                if labels_path.exists():
                    pages_with_groups.append(page_idx)

            if not pages_with_groups:
                QMessageBox.warning(
                    self,
                    "그룹 없음",
                    "내보낼 그룹이 없습니다.\n먼저 문제 그룹을 만들어주세요."
                )
                return

            # 출력 디렉토리
            output_dir = self.config.DOCUMENTS_DIR / self.current_document / "problems"
            output_dir.mkdir(parents=True, exist_ok=True)

            # 프로그레스 다이얼로그
            total_groups = 0
            for page_idx in pages_with_groups:
                labels_path = self.config.DOCUMENTS_DIR / self.current_document / "labels" / f"page_{page_idx:04d}_labels.json"
                group_data = self.grouping_manager.load_labels(labels_path)
                if group_data:
                    total_groups += len(group_data.groups)

            progress = QProgressDialog(
                "문제 이미지 내보내기 중...",
                "취소",
                0,
                total_groups,
                self
            )
            progress.setWindowTitle("Export")
            progress.setWindowModality(Qt.WindowModal)
            progress.setMinimumDuration(0)

            exported_count = 0

            # 각 페이지의 그룹 처리
            for page_idx in pages_with_groups:
                # 페이지 이미지 로드 (한글 경로 지원)
                image_path = self.config.DOCUMENTS_DIR / self.current_document / "pages" / f"page_{page_idx:04d}.png"
                if not image_path.exists():
                    continue

                image = imread_unicode(image_path)
                if image is None:
                    continue

                # 그룹 데이터 로드
                labels_path = self.config.DOCUMENTS_DIR / self.current_document / "labels" / f"page_{page_idx:04d}_labels.json"
                group_data = self.grouping_manager.load_labels(labels_path)

                if not group_data:
                    continue

                # 각 그룹 크롭 및 저장
                for group in group_data.groups:
                    if progress.wasCanceled():
                        raise InterruptedError("사용자가 취소했습니다")

                    progress.setLabelText(f"페이지 {page_idx + 1}: 그룹 {group.id} 내보내기...")

                    # 이미지 크롭
                    cropped_path = self.grouping_manager.crop_group_image(
                        image=image,
                        group=group,
                        output_dir=output_dir,
                        document_id=self.current_document,
                        page_index=page_idx
                    )

                    exported_count += 1
                    progress.setValue(exported_count)

            progress.setValue(total_groups)

            # 성공 메시지
            QMessageBox.information(
                self,
                "내보내기 완료",
                f"{exported_count}개의 문제 이미지가 내보내졌습니다.\n\n"
                f"저장 위치:\n{output_dir}"
            )

            self.statusbar.showMessage(f"{exported_count}개 문제 이미지 내보냄")

        except InterruptedError as e:
            self.statusbar.showMessage(str(e))
            print(f"[취소됨] {e}")

        except Exception as e:
            QMessageBox.critical(
                self,
                "오류",
                f"내보내기 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            print(f"[오류] Export 실패: {e}")
            import traceback
            traceback.print_exc()

        finally:
            if 'progress' in locals():
                progress.close()

    # ========== Phase 4: 해설 PDF 관리 ==========

    def on_load_solution_pdf(self):
        """해설 PDF 로드 (Phase 4)"""
        if not self.current_document:
            QMessageBox.warning(self, "문서 없음", "먼저 문제 PDF 문서를 선택해주세요.")
            return

        # 파일 선택 다이얼로그
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "해설 PDF 파일 선택",
            str(self.config.RAW_PDFS_DIR),
            "PDF Files (*.pdf)"
        )

        if not file_path:
            return

        pdf_path = Path(file_path)
        print(f"[해설 PDF 선택] {pdf_path}")

        # 프로그레스 다이얼로그
        progress = QProgressDialog(
            "해설 PDF 처리 중...",
            "취소",
            0,
            100,
            self
        )
        progress.setWindowTitle("해설 PDF 처리")
        progress.setWindowModality(Qt.WindowModal)
        progress.setMinimumDuration(0)
        progress.setValue(0)

        try:
            # Phase 4.6.2: PDF → 이미지 변환 + 블록 분석
            def update_progress(message: str, current: int, total: int):
                progress.setLabelText(message)
                progress.setMaximum(total)
                progress.setValue(current)
                QCoreApplication.processEvents()

            image_paths = self.pipeline.process_solution_pdf(
                pdf_path=pdf_path,
                document_id=self.current_document,
                dpi=self.config.DEFAULT_DPI,
                progress_callback=update_progress
            )

            progress.setValue(progress.maximum())

            # 듀얼 캔버스에 해설 PDF 정보 설정
            total_solution_pages = len(image_paths)
            self.center_canvas.set_solution_pdf_info(total_solution_pages)

            # Phase 4.5.1: 해설 페이지는 항상 첫 페이지(0)로 시작
            if total_solution_pages > 0:
                self.load_solution_page(0)

            # Phase 4.6.2: 블록 분석 결과 표시
            solution_blocks_dir = self.config.DOCUMENTS_DIR / self.current_document / "solution_blocks"
            num_blocks_json = len(list(solution_blocks_dir.glob("*.json"))) if solution_blocks_dir.exists() else 0

            # Phase 5.2: 해설 연결 기능 활성화
            self.labeling_widget.right_panel.enable_solution_linking(True)

            QMessageBox.information(
                self,
                "해설 PDF 로드 완료",
                f"해설 PDF가 로드되었습니다!\n\n"
                f"총 페이지 수: {total_solution_pages}\n"
                f"블록 분석 완료: {num_blocks_json}페이지"
            )

            self.statusbar.showMessage(f"해설 PDF 로드 완료: {total_solution_pages}페이지 (블록 분석 완료)")

        except Exception as e:
            progress.close()
            QMessageBox.critical(
                self,
                "오류",
                f"해설 PDF 처리 중 오류가 발생했습니다:\n\n{str(e)}"
            )
            self.statusbar.showMessage(f"오류: {str(e)}")
            print(f"[오류] {e}")
            import traceback
            traceback.print_exc()

        finally:
            progress.close()

    def check_solution_pdf_loaded(self, doc_id: str):
        """해설 PDF 로드 여부 확인 및 자동 로드 (Phase 4)"""
        solution_pages_dir = self.config.DOCUMENTS_DIR / doc_id / "solution_pages"
        if solution_pages_dir.exists():
            solution_images = list(solution_pages_dir.glob("solution_page_*.png"))
            if solution_images:
                total_pages = len(solution_images)
                self.center_canvas.set_solution_pdf_info(total_pages)

                # Phase 5.2: 해설 연결 기능 활성화
                self.labeling_widget.right_panel.enable_solution_linking(True)

                print(f"[MainWindow] 기존 해설 PDF 발견: {total_pages}페이지")

    def load_solution_page(self, page_index: int):
        """해설 페이지 로드 (Phase 4.6: 블록 JSON 포함)"""
        if not self.current_document:
            return

        # 이미지 경로
        solution_pages_dir = self.config.DOCUMENTS_DIR / self.current_document / "solution_pages"
        image_path = solution_pages_dir / f"solution_page_{page_index:04d}.png"

        # Phase 4.6.3: 블록 JSON 경로
        solution_blocks_dir = self.config.DOCUMENTS_DIR / self.current_document / "solution_blocks"
        json_path = solution_blocks_dir / f"solution_page_{page_index:04d}_blocks.json"

        if image_path.exists():
            # 블록 JSON이 있으면 함께 전달, 없으면 None
            blocks_path = json_path if json_path.exists() else None
            self.center_canvas.load_solution_page(image_path, blocks_path)
            print(f"[MainWindow] 해설 페이지 로드: {page_index} (블록: {'있음' if blocks_path else '없음'})")
        else:
            print(f"[MainWindow] 해설 페이지 없음: {page_index}")

    # ========== Phase 4 & Phase 6: 모드 전환 메서드 ==========

    def on_app_bar_mode_changed(self, mode: str):
        """
        Phase 6.2: ModernAppBar에서 모드 변경 시

        Args:
            mode: "labeling", "registration", "bank"
        """
        if mode == "labeling":
            self.switch_to_labeling_mode()
        elif mode == "registration":
            self.switch_to_tagging_mode()
        elif mode == "bank":
            self.switch_to_bank_mode()

    def switch_to_labeling_mode(self):
        """라벨링 모드로 전환"""
        self.mode_stack.setCurrentIndex(0)
        self.action_labeling.setChecked(True)
        self.action_tagging.setChecked(False)
        self.action_bank.setChecked(False)
        # Phase 6.2: ModernAppBar 동기화
        self.app_bar.set_mode("labeling")
        self.statusbar.showMessage("라벨링 모드")
        print("[모드 전환] 라벨링 모드")

    def switch_to_tagging_mode(self):
        """태깅 모드로 전환"""
        self.mode_stack.setCurrentIndex(1)
        self.action_labeling.setChecked(False)
        self.action_tagging.setChecked(True)
        self.action_bank.setChecked(False)
        # Phase 6.2: ModernAppBar 동기화
        self.app_bar.set_mode("registration")
        self.statusbar.showMessage("태깅 모드 (Phase 8에서 구현 예정)")
        print("[모드 전환] 태깅 모드")

    def switch_to_bank_mode(self):
        """문제은행 모드로 전환"""
        self.mode_stack.setCurrentIndex(2)
        self.action_labeling.setChecked(False)
        self.action_tagging.setChecked(False)
        self.action_bank.setChecked(True)
        # Phase 6.2: ModernAppBar 동기화
        self.app_bar.set_mode("bank")
        self.statusbar.showMessage("문제은행 모드 (Phase 9에서 구현 예정)")
        print("[모드 전환] 문제은행 모드")

    # ========== Phase 4.5: 레이아웃 프리셋 관리 ==========

    def on_layout_preset_changed(self, preset_name: str):
        """
        레이아웃 프리셋 변경 시

        Args:
            preset_name: 선택한 프리셋 이름
        """
        if not preset_name:
            return

        preset = self.layout_manager.load_preset(preset_name)
        if preset:
            self.apply_layout_preset(preset)
            self.statusbar.showMessage(f"레이아웃 '{preset_name}' 적용됨")

            # Phase 4.5.5: 선택한 프리셋을 QSettings에 저장
            settings = QSettings("PDFCropApp", "MainWindow")
            settings.setValue("last_layout_preset", preset_name)

    def apply_layout_preset(self, preset: LayoutPreset):
        """
        레이아웃 프리셋 적용

        Args:
            preset: 적용할 프리셋
        """
        # 라벨링 모드 스플리터 크기 적용
        self.labeling_widget.main_splitter.setSizes(preset.labeling_mode_sizes)

        # 듀얼 캔버스 스플리터 크기 적용
        self.center_canvas.splitter.setSizes(preset.dual_canvas_sizes)

        print(f"[MainWindow] 레이아웃 적용: {preset.name}")
        print(f"  - Labeling: {preset.labeling_mode_sizes}")
        print(f"  - Dual Canvas: {preset.dual_canvas_sizes}")

    def on_save_layout_preset(self):
        """현재 레이아웃을 새 프리셋으로 저장"""
        # 프리셋 이름 입력 받기
        preset_name, ok = QInputDialog.getText(
            self,
            "레이아웃 저장",
            "프리셋 이름을 입력하세요:",
            text="내 레이아웃"
        )

        if not ok or not preset_name.strip():
            return

        # 현재 레이아웃 크기 가져오기
        labeling_sizes = self.labeling_widget.main_splitter.sizes()
        dual_canvas_sizes = self.center_canvas.splitter.sizes()

        # 새 프리셋 생성
        new_preset = LayoutPreset(
            name=preset_name.strip(),
            labeling_mode_sizes=labeling_sizes,
            dual_canvas_sizes=dual_canvas_sizes
        )

        # 저장
        if self.layout_manager.save_preset(new_preset):
            # 콤보박스 업데이트
            self.layout_combo.clear()
            self.layout_combo.addItems(self.layout_manager.get_all_preset_names())
            self.layout_combo.setCurrentText(preset_name.strip())

            QMessageBox.information(
                self,
                "저장 완료",
                f"레이아웃 프리셋 '{preset_name}'이(가) 저장되었습니다!"
            )
            self.statusbar.showMessage(f"레이아웃 '{preset_name}' 저장됨")
        else:
            QMessageBox.warning(
                self,
                "저장 실패",
                "레이아웃 프리셋 저장에 실패했습니다."
            )

    def load_last_layout_preset(self):
        """마지막 사용한 레이아웃 프리셋 로드 (Phase 4.5.5)"""
        settings = QSettings("PDFCropApp", "MainWindow")
        last_preset_name = settings.value("last_layout_preset", "균형 뷰")

        # 콤보박스에서 해당 프리셋 선택
        index = self.layout_combo.findText(last_preset_name)
        if index >= 0:
            self.layout_combo.setCurrentIndex(index)
            print(f"[MainWindow] 마지막 레이아웃 프리셋 로드: {last_preset_name}")
        else:
            # 프리셋이 없으면 첫 번째 항목 선택
            if self.layout_combo.count() > 0:
                self.layout_combo.setCurrentIndex(0)

    def on_delete_layout_preset(self):
        """선택한 프리셋 삭제 (Phase 4.7.2)"""
        current_preset_name = self.layout_combo.currentText()

        if not current_preset_name:
            return

        # 확인 다이얼로그
        reply = QMessageBox.question(
            self,
            "프리셋 삭제",
            f"'{current_preset_name}' 프리셋을 삭제하시겠습니까?\n\n"
            "(기본 프리셋은 삭제할 수 없습니다)",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            if self.layout_manager.delete_preset(current_preset_name):
                # 콤보박스 업데이트
                self.layout_combo.clear()
                self.layout_combo.addItems(self.layout_manager.get_all_preset_names())

                # 첫 번째 프리셋으로 전환
                if self.layout_combo.count() > 0:
                    self.layout_combo.setCurrentIndex(0)

                QMessageBox.information(
                    self,
                    "삭제 완료",
                    f"프리셋 '{current_preset_name}'이(가) 삭제되었습니다."
                )
                self.statusbar.showMessage(f"프리셋 '{current_preset_name}' 삭제됨")
            else:
                QMessageBox.warning(
                    self,
                    "삭제 실패",
                    f"'{current_preset_name}'은(는) 기본 프리셋이거나 삭제할 수 없습니다."
                )

    # ==============================================

    def keyPressEvent(self, event: QKeyEvent):
        """
        키보드 단축키 처리

        단축키 목록:
        - Ctrl+G: 선택된 블록으로 새 그룹 생성
        - Delete: 선택된 그룹 삭제
        - Esc: 블록 선택 해제
        - Ctrl+A: 현재 페이지의 모든 블록 선택
        - Page Up: 이전 페이지
        - Page Down: 다음 페이지
        - Home: 첫 페이지
        - End: 마지막 페이지
        """
        # Ctrl+G: 그룹 생성
        if event.key() == Qt.Key_G and (event.modifiers() & Qt.ControlModifier):
            if self.center_canvas.selected_blocks:
                self.on_create_group()
                print("[단축키] Ctrl+G: 그룹 생성")
            else:
                self.statusbar.showMessage("블록을 먼저 선택해 주세요")
            event.accept()
            return

        # Delete: 그룹 삭제
        elif event.key() == Qt.Key_Delete:
            # 우측 패널에서 선택된 그룹 확인
            selected_group_id = self.right_panel.get_selected_group()
            if selected_group_id:
                self.on_delete_group(selected_group_id)
                print(f"[단축키] Delete: 그룹 {selected_group_id} 삭제")
            else:
                self.statusbar.showMessage("삭제할 그룹을 먼저 선택해 주세요")
            event.accept()
            return

        # Esc: 선택 해제
        elif event.key() == Qt.Key_Escape:
            self.center_canvas.clear_selection()
            print("[단축키] Esc: 선택 해제")
            event.accept()
            return

        # Ctrl+A: 모든 블록 선택
        elif event.key() == Qt.Key_A and (event.modifiers() & Qt.ControlModifier):
            if self.center_canvas.current_page_data:
                all_block_ids = [b.block_id for b in self.center_canvas.current_page_data.blocks]
                self.center_canvas.selected_blocks = set(all_block_ids)
                self.center_canvas.update_block_styles()
                self.center_canvas.blocks_selected.emit(all_block_ids)
                print(f"[단축키] Ctrl+A: {len(all_block_ids)}개 블록 선택")
                self.statusbar.showMessage(f"{len(all_block_ids)}개 블록 선택됨")
            event.accept()
            return

        # Page Up: 이전 페이지
        elif event.key() == Qt.Key_PageUp:
            if self.current_page > 0:
                self.load_page(self.current_page - 1)
                print(f"[단축키] Page Up: 페이지 {self.current_page + 1}")
            event.accept()
            return

        # Page Down: 다음 페이지
        elif event.key() == Qt.Key_PageDown:
            if self.current_page < self.total_pages - 1:
                self.load_page(self.current_page + 1)
                print(f"[단축키] Page Down: 페이지 {self.current_page + 1}")
            event.accept()
            return

        # Home: 첫 페이지
        elif event.key() == Qt.Key_Home:
            if self.total_pages > 0:
                self.load_page(0)
                print(f"[단축키] Home: 첫 페이지")
            event.accept()
            return

        # End: 마지막 페이지
        elif event.key() == Qt.Key_End:
            if self.total_pages > 0:
                self.load_page(self.total_pages - 1)
                print(f"[단축키] End: 마지막 페이지")
            event.accept()
            return

        # 처리하지 않은 키는 부모 클래스로 전달
        super().keyPressEvent(event)

    # ========== Phase 0: Lazy Loading 백그라운드 분석 핸들러 ==========

    def on_batch_analyzed(self, start_page: int, end_page: int):
        """
        배치 분석 완료 핸들러 (Phase 0)

        Args:
            start_page: 시작 페이지 (0-based)
            end_page: 끝 페이지 (0-based, exclusive)
        """
        print(f"[MainWindow] 배치 분석 완료: {start_page+1}~{end_page}페이지")
        self.analyzed_pages = end_page

        # 상태바 업데이트
        self.statusbar.showMessage(
            f"백그라운드 분석 진행 중: {self.analyzed_pages}/{self.total_pages}페이지 완료"
        )

    def on_all_analyzed(self):
        """모든 페이지 분석 완료 핸들러 (Phase 0)"""
        print(f"[MainWindow] 모든 페이지 분석 완료!")
        self.statusbar.showMessage(
            f"분석 완료: {self.total_pages}페이지",
            5000  # 5초간 표시
        )

        QMessageBox.information(
            self,
            "백그라운드 분석 완료",
            f"모든 페이지 분석이 완료되었습니다!\n\n"
            f"문서: {self.current_document}\n"
            f"페이지 수: {self.total_pages}"
        )

    def on_background_progress(self, current: int, total: int, message: str):
        """
        백그라운드 진행률 핸들러 (Phase 0)

        Args:
            current: 현재 페이지
            total: 전체 페이지
            message: 진행 메시지
        """
        self.statusbar.showMessage(message)

    def on_background_error(self, error_message: str):
        """
        백그라운드 에러 핸들러 (Phase 0)

        Args:
            error_message: 에러 메시지
        """
        print(f"[MainWindow] 백그라운드 에러: {error_message}")
        QMessageBox.warning(
            self,
            "백그라운드 분석 오류",
            f"백그라운드 분석 중 오류가 발생했습니다:\n\n{error_message}\n\n"
            f"이미 분석된 페이지는 정상적으로 사용할 수 있습니다."
        )

    def closeEvent(self, event):
        """
        윈도우 종료 이벤트 (Phase 0: 백그라운드 스레드 정리)

        Args:
            event: QCloseEvent
        """
        # 백그라운드 분석 스레드 중지
        if self.background_analyzer.isRunning():
            print("[MainWindow] 백그라운드 분석 스레드 중지 중...")
            self.background_analyzer.stop()
            self.background_analyzer.wait(3000)  # 최대 3초 대기

        event.accept()
