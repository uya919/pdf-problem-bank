"""
블록 선택 기능 테스트

Phase 3: PageCanvas 블록 선택 기능 검증
"""
import sys
import os
from pathlib import Path

# Windows 콘솔 UTF-8 인코딩 설정
if sys.platform == 'win32':
    os.system('chcp 65001 > nul')
    sys.stdout.reconfigure(encoding='utf-8')

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from gui.page_canvas import PageCanvas


def test_selection_state():
    """선택 상태 관리 테스트"""
    print("=== 블록 선택 상태 테스트 ===\n")

    app = QApplication.instance() or QApplication(sys.argv)
    canvas = PageCanvas()

    # 초기 상태
    assert len(canvas.selected_blocks) == 0, "초기 상태: 선택 없음"
    print("✓ 초기 상태: 선택된 블록 없음")

    # 단일 선택 시뮬레이션
    canvas.selected_blocks.add(1)
    assert 1 in canvas.selected_blocks
    print("✓ 블록 #1 선택")

    # 추가 선택 (Ctrl+클릭 시뮬레이션)
    canvas.selected_blocks.add(2)
    canvas.selected_blocks.add(3)
    assert len(canvas.selected_blocks) == 3
    print(f"✓ 다중 선택: {len(canvas.selected_blocks)}개 블록")

    # 토글 (선택 해제)
    canvas.selected_blocks.remove(2)
    assert 2 not in canvas.selected_blocks
    assert len(canvas.selected_blocks) == 2
    print("✓ 블록 #2 선택 해제")

    # 전체 해제
    canvas.selected_blocks.clear()
    assert len(canvas.selected_blocks) == 0
    print("✓ 전체 선택 해제")

    print("\n모든 테스트 통과! ✅")


def test_signals():
    """시그널 정의 테스트"""
    print("\n=== 시그널 정의 테스트 ===\n")

    app = QApplication.instance() or QApplication(sys.argv)
    canvas = PageCanvas()

    # 시그널 존재 확인
    assert hasattr(canvas, 'block_clicked'), "block_clicked 시그널 존재"
    assert hasattr(canvas, 'blocks_selected'), "blocks_selected 시그널 존재"
    print("✓ block_clicked 시그널 정의됨")
    print("✓ blocks_selected 시그널 정의됨")

    # 시그널 연결 테스트
    received = {'single': None, 'multi': None}

    def on_block_clicked(block_id):
        received['single'] = block_id

    def on_blocks_selected(block_ids):
        received['multi'] = block_ids

    canvas.block_clicked.connect(on_block_clicked)
    canvas.blocks_selected.connect(on_blocks_selected)

    # 시그널 발생 테스트
    canvas.block_clicked.emit(5)
    assert received['single'] == 5
    print("✓ block_clicked 시그널 발생 성공")

    canvas.blocks_selected.emit([1, 2, 3])
    assert received['multi'] == [1, 2, 3]
    print("✓ blocks_selected 시그널 발생 성공")

    print("\n모든 시그널 테스트 통과! ✅")


def test_methods():
    """메서드 존재 테스트"""
    print("\n=== 메서드 존재 테스트 ===\n")

    app = QApplication.instance() or QApplication(sys.argv)
    canvas = PageCanvas()

    # 필수 메서드 확인
    assert hasattr(canvas, 'update_block_styles'), "update_block_styles 메서드 존재"
    assert hasattr(canvas, 'clear_selection'), "clear_selection 메서드 존재"
    print("✓ update_block_styles() 메서드 정의됨")
    print("✓ clear_selection() 메서드 정의됨")

    # clear_selection 테스트
    canvas.selected_blocks.add(1)
    canvas.selected_blocks.add(2)
    assert len(canvas.selected_blocks) == 2

    canvas.clear_selection()
    assert len(canvas.selected_blocks) == 0
    print("✓ clear_selection() 정상 작동")

    print("\n모든 메서드 테스트 통과! ✅")


if __name__ == "__main__":
    print("=" * 60)
    print("Phase 3: 블록 선택 기능 테스트")
    print("=" * 60)

    test_selection_state()
    test_signals()
    test_methods()

    print("\n" + "=" * 60)
    print("✅ 모든 테스트 통과!")
    print("=" * 60)
