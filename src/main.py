"""
PDF 문제 이미지 크롭 & 라벨링 앱

진입점
"""
import sys
from pathlib import Path
from PySide6.QtWidgets import QApplication

# 프로젝트 루트를 path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from gui.main_window import MainWindow


def main():
    """앱 실행"""
    print("=" * 70)
    print("PDF 문제 이미지 크롭 & 라벨링 앱")
    print("=" * 70)
    print()
    print("Phase 6: Modern UX Redesign 진행 중...")
    print()

    # Qt Application 생성
    app = QApplication(sys.argv)

    # ========== Phase 6.1: QSS 디자인 시스템 로드 ==========
    qss_path = project_root / "src" / "styles" / "app.qss"
    if qss_path.exists():
        try:
            with open(qss_path, "r", encoding="utf-8") as f:
                app.setStyleSheet(f.read())
            print(f"[OK] QSS 스타일 로드 완료: {qss_path}")
        except Exception as e:
            print(f"[WARNING] QSS 로드 실패: {e}")
    else:
        print(f"[WARNING] QSS 파일 없음: {qss_path}")

    # 메인 윈도우 생성
    window = MainWindow()
    window.show()

    print("[OK] GUI 윈도우 생성 완료")
    print()
    print("사용 방법:")
    print("  1. 'Open PDF' 버튼을 클릭하여 PDF 선택")
    print("  2. 페이지 네비게이션 버튼으로 이동")
    print("  3. 줌 버튼으로 확대/축소")
    print()

    # 이벤트 루프 시작
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
