"""
페이지 캔버스

페이지 이미지 + 블록 박스 표시
"""
from PySide6.QtWidgets import QGraphicsView, QGraphicsScene, QGraphicsPixmapItem, QGraphicsRectItem, QRubberBand
from PySide6.QtCore import Qt, Signal, QRectF, QRect
from PySide6.QtGui import QPixmap, QPen, QBrush, QColor, QPainter, QImage
from pathlib import Path
from typing import List, Optional
import json
import sys
import cv2
import numpy as np

# 프로젝트 루트
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from data_models import PageData, Block
from utils import imread_unicode


class PageCanvas(QGraphicsView):
    """
    페이지 캔버스

    QGraphicsView를 사용:
    - 페이지 이미지 표시
    - 블록 박스 오버레이
    - 줌 in/out
    - 스크롤
    - 블록 선택 (Phase 3)
    """

    # 시그널
    block_clicked = Signal(int)  # block_id (단일 선택)
    blocks_selected = Signal(list)  # [block_id, ...] (다중 선택)

    def __init__(self):
        super().__init__()

        # Scene 생성
        self.scene = QGraphicsScene()
        self.setScene(self.scene)

        # 현재 데이터
        self.current_page_data: Optional[PageData] = None
        self.current_image_item: Optional[QGraphicsPixmapItem] = None
        self.block_items: dict = {}  # block_id -> QGraphicsRectItem

        # 선택 상태 (Phase 3)
        self.selected_blocks: set = set()  # 선택된 블록 ID 집합

        # 영역 선택 (Phase 3 - Shift+Drag)
        self.selection_start_pos = None  # 드래그 시작 위치 (viewport 좌표)
        self.selection_rect = None  # QRubberBand (선택 사각형)
        self.is_selecting = False  # 영역 선택 중인지

        # 줌 레벨
        self.zoom_level = 1.0
        self.min_zoom = 0.25
        self.max_zoom = 4.0

        # UI 설정
        self.setup_view()

    def setup_view(self):
        """UI 설정"""
        # 렌더링 옵션
        self.setRenderHint(QPainter.Antialiasing)
        self.setRenderHint(QPainter.SmoothPixmapTransform)

        # 드래그 모드 (중 마우스로 스크롤)
        self.setDragMode(QGraphicsView.ScrollHandDrag)

        # 배경 색상
        self.setBackgroundBrush(QBrush(QColor(240, 240, 240)))

        # 스크롤바
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)

    def load_page(self, image_path: Path, json_path: Optional[Path] = None):
        """
        페이지 표시 (이미지 + 블록 데이터)

        Args:
            image_path: 페이지 이미지 경로 (.png)
            json_path: 블록 JSON 경로 (None이면 블록 없이 이미지만 표시, Phase 4)
        """
        print(f"[PageCanvas] 페이지 표시: {image_path.name}")

        # Scene 초기화
        self.scene.clear()
        self.current_image_item = None
        self.block_items.clear()

        # 이미지 표시 (한글 경로 지원)
        if not image_path.exists():
            print(f"[오류] 이미지 없음: {image_path}")
            return

        # imread_unicode로 한글 경로 지원
        image_bgr = imread_unicode(image_path)
        if image_bgr is None:
            print(f"[오류] 이미지 로드 실패: {image_path}")
            return

        # BGR → RGB 변환
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        height, width, channels = image_rgb.shape

        # numpy → QImage → QPixmap
        bytes_per_line = channels * width
        q_image = QImage(image_rgb.data, width, height, bytes_per_line, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(q_image)

        # 이미지 아이템 추가
        self.current_image_item = QGraphicsPixmapItem(pixmap)
        self.scene.addItem(self.current_image_item)

        # Scene 크기 설정
        self.scene.setSceneRect(0, 0, width, height)

        # JSON 표시 (Phase 4: None일 수 있음)
        if json_path is not None and json_path.exists():
            self.load_blocks(json_path)
        elif json_path is not None:
            print(f"[경고] JSON 없음: {json_path}")

        # 화면 맞춤
        self.fit_in_view()

    def load_blocks(self, json_path: Path):
        """
        블록 데이터 표시 및 오버레이

        Args:
            json_path: 블록 JSON 경로
        """
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # PageData 모델 생성
            self.current_page_data = PageData.from_dict(data)

            print(f"[PageCanvas] {len(self.current_page_data.blocks)}개 블록 표시")

            # 블록 박스 렌더링
            self.draw_blocks()

        except Exception as e:
            print(f"[오류] JSON 로드 실패: {e}")

    def draw_blocks(self):
        """블록 박스 렌더링"""
        if not self.current_page_data:
            return

        # 색상 정의
        colors = {
            'L': QColor(0, 255, 0, 80),    # 좌측: 초록색 (반투명)
            'R': QColor(0, 0, 255, 80),    # 우측: 파란색 (반투명)
        }

        for block in self.current_page_data.blocks:
            # 사각형 생성
            rect = QRectF(
                block.bbox.x_min,
                block.bbox.y_min,
                block.bbox.width,
                block.bbox.height
            )

            # 색상 선택
            color = colors.get(block.column, QColor(128, 128, 128, 80))

            # 박스 아이템 생성
            rect_item = QGraphicsRectItem(rect)
            rect_item.setPen(QPen(color.darker(), 2))
            rect_item.setBrush(QBrush(color))

            # 데이터 저장 (block_id)
            rect_item.setData(0, block.block_id)

            # Scene에 추가
            self.scene.addItem(rect_item)

            # 딕셔너리에 저장
            self.block_items[block.block_id] = rect_item

        print(f"[PageCanvas] {len(self.block_items)}개 블록 박스 렌더링 완료")

    def fit_in_view(self):
        """화면 맞춤"""
        if self.current_image_item:
            self.fitInView(self.scene.sceneRect(), Qt.KeepAspectRatio)
            self.zoom_level = 1.0

    def zoom_in(self):
        """확대"""
        if self.zoom_level < self.max_zoom:
            factor = 1.25
            self.scale(factor, factor)
            self.zoom_level *= factor
            print(f"[줌] {self.zoom_level:.2f}x")

    def zoom_out(self):
        """축소"""
        if self.zoom_level > self.min_zoom:
            factor = 0.8
            self.scale(factor, factor)
            self.zoom_level *= factor
            print(f"[줌] {self.zoom_level:.2f}x")

    def zoom_reset(self):
        """100% 크기"""
        # 현재 변환 초기화
        self.resetTransform()
        self.zoom_level = 1.0
        print(f"[줌] 100%")

    def wheelEvent(self, event):
        """마우스 휠 이벤트 (줌)"""
        # Ctrl + 휠 = 줌
        if event.modifiers() & Qt.ControlModifier:
            if event.angleDelta().y() > 0:
                self.zoom_in()
            else:
                self.zoom_out()
        else:
            # 일반 휠 = 스크롤
            super().wheelEvent(event)

    def mousePressEvent(self, event):
        """
        마우스 클릭 이벤트 (Phase 3: 블록 선택)

        - 일반 클릭: 단일 선택
        - Ctrl+클릭: 토글 선택 (추가/제거)
        - Shift+드래그: 영역 선택
        """
        # Shift+좌클릭: 영역 선택 시작
        if event.button() == Qt.LeftButton and (event.modifiers() & Qt.ShiftModifier):
            self.selection_start_pos = event.pos()
            self.is_selecting = True

            # 임시로 드래그 모드 비활성화 (영역 선택 중)
            self.setDragMode(QGraphicsView.NoDrag)

            # QRubberBand 생성 및 표시
            if self.selection_rect is None:
                self.selection_rect = QRubberBand(QRubberBand.Rectangle, self)
            self.selection_rect.setGeometry(QRect(self.selection_start_pos, self.selection_start_pos))
            self.selection_rect.show()

            print("[영역 선택 시작]")
            return  # 다른 처리 스킵

        # 클릭한 아이템 확인
        item = self.itemAt(event.pos())

        if isinstance(item, QGraphicsRectItem):
            # 블록 박스 클릭
            block_id = item.data(0)
            if block_id is not None:
                # Ctrl 키 확인
                ctrl_pressed = event.modifiers() & Qt.ControlModifier

                if ctrl_pressed:
                    # Ctrl+클릭: 토글 선택
                    if block_id in self.selected_blocks:
                        self.selected_blocks.remove(block_id)
                        print(f"[선택 해제] Block #{block_id}")
                    else:
                        self.selected_blocks.add(block_id)
                        print(f"[선택 추가] Block #{block_id}")
                else:
                    # 일반 클릭: 단일 선택
                    self.selected_blocks = {block_id}
                    print(f"[단일 선택] Block #{block_id}")

                # 시각화 업데이트
                self.update_block_styles()

                # 시그널 발생
                self.block_clicked.emit(block_id)
                self.blocks_selected.emit(list(self.selected_blocks))

        else:
            # 빈 공간 클릭: 선택 해제
            if not (event.modifiers() & Qt.ControlModifier):
                if self.selected_blocks:
                    self.selected_blocks.clear()
                    self.update_block_styles()
                    self.blocks_selected.emit([])
                    print("[선택 해제] 모든 블록")

        super().mousePressEvent(event)

    def mouseMoveEvent(self, event):
        """
        마우스 이동 이벤트 (Phase 3: 영역 선택 시 사각형 업데이트)
        """
        if self.is_selecting and self.selection_start_pos is not None:
            # 현재 마우스 위치로 사각형 업데이트
            current_rect = QRect(self.selection_start_pos, event.pos()).normalized()
            self.selection_rect.setGeometry(current_rect)
        else:
            # 일반 드래그 (스크롤)
            super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        """
        마우스 릴리스 이벤트 (Phase 3: 영역 선택 완료)
        """
        if self.is_selecting and event.button() == Qt.LeftButton:
            # 영역 선택 완료
            if self.selection_rect is not None:
                # Viewport 좌표 → Scene 좌표 변환
                viewport_rect = self.selection_rect.geometry()
                top_left = self.mapToScene(viewport_rect.topLeft())
                bottom_right = self.mapToScene(viewport_rect.bottomRight())
                scene_rect = QRectF(top_left, bottom_right)

                # 영역 안의 블록 찾기
                selected_block_ids = self._find_blocks_in_rect(scene_rect)

                # Ctrl+Shift: 기존 선택에 추가
                # Shift만: 새로 선택
                if event.modifiers() & Qt.ControlModifier:
                    # 기존 선택에 추가/제거 (토글)
                    for block_id in selected_block_ids:
                        if block_id in self.selected_blocks:
                            self.selected_blocks.remove(block_id)
                        else:
                            self.selected_blocks.add(block_id)
                else:
                    # 새로 선택
                    self.selected_blocks = set(selected_block_ids)

                # 시각화 업데이트
                self.update_block_styles()

                # 시그널 발생
                self.blocks_selected.emit(list(self.selected_blocks))

                print(f"[영역 선택 완료] {len(selected_block_ids)}개 블록 선택됨")

                # QRubberBand 숨기기
                self.selection_rect.hide()

            # 영역 선택 상태 리셋
            self.is_selecting = False
            self.selection_start_pos = None

            # 드래그 모드 복원
            self.setDragMode(QGraphicsView.ScrollHandDrag)
        else:
            super().mouseReleaseEvent(event)

    def _find_blocks_in_rect(self, scene_rect: QRectF) -> list:
        """
        선택 영역 안의 블록 찾기 (Phase 3)

        Args:
            scene_rect: Scene 좌표계의 선택 사각형

        Returns:
            선택된 블록 ID 리스트
        """
        if not self.current_page_data:
            return []

        selected_ids = []

        for block in self.current_page_data.blocks:
            # 블록 BBox
            block_rect = QRectF(
                block.bbox.x_min,
                block.bbox.y_min,
                block.bbox.width,
                block.bbox.height
            )

            # 교차 확인 (일부라도 겹치면 선택)
            if scene_rect.intersects(block_rect):
                selected_ids.append(block.block_id)

        return selected_ids

    def update_block_styles(self):
        """
        선택 상태에 따라 블록 스타일 업데이트 (Phase 3)

        - 일반 블록: 반투명 초록/파랑 (컬럼별)
        - 선택된 블록: 진한 파랑 + 굵은 테두리
        """
        if not self.current_page_data:
            return

        # 컬럼별 기본 색상
        normal_colors = {
            'L': QColor(0, 255, 0, 60),    # 좌측: 초록색 (반투명)
            'R': QColor(0, 0, 255, 60),    # 우측: 파란색 (반투명)
        }

        # 선택된 블록 색상
        selected_color = QColor(0, 100, 255, 120)  # 진한 파랑

        for block in self.current_page_data.blocks:
            block_id = block.block_id
            if block_id not in self.block_items:
                continue

            rect_item = self.block_items[block_id]

            if block_id in self.selected_blocks:
                # 선택된 블록: 굵은 파랑 테두리
                rect_item.setPen(QPen(QColor(0, 0, 255), 3))
                rect_item.setBrush(QBrush(selected_color))
            else:
                # 일반 블록: 컬럼별 색상
                color = normal_colors.get(block.column, QColor(128, 128, 128, 60))
                rect_item.setPen(QPen(color.darker(), 2))
                rect_item.setBrush(QBrush(color))

    def clear_selection(self):
        """선택 해제 (Phase 3)"""
        if self.selected_blocks:
            self.selected_blocks.clear()
            self.update_block_styles()
            self.blocks_selected.emit([])
            print("[선택 해제] 모든 블록")

    def clear(self):
        """캔버스 초기화"""
        self.scene.clear()
        self.current_image_item = None
        self.current_page_data = None
        self.block_items.clear()
        self.selected_blocks.clear()
        self.zoom_level = 1.0

        # 영역 선택 정리
        if self.selection_rect is not None:
            self.selection_rect.hide()
        self.is_selecting = False
        self.selection_start_pos = None
