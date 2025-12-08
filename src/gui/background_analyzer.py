"""
백그라운드 PDF 분석 스레드 (Phase 0)

PDF의 나머지 페이지를 백그라운드에서 분석
"""
from PySide6.QtCore import QThread, Signal
from pathlib import Path
from typing import Optional
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from pdf_pipeline import PDFPipeline
from config import Config


class BackgroundAnalyzer(QThread):
    """
    백그라운드에서 다음 페이지 배치를 분석하는 스레드

    Signals:
        batch_completed: 배치 분석 완료 (start_page, end_page)
        all_completed: 모든 페이지 분석 완료
        progress: 진행률 (current, total, message)
        error: 에러 발생 (error_message)
    """

    batch_completed = Signal(int, int)  # start_page, end_page
    all_completed = Signal()
    progress = Signal(int, int, str)  # current, total, message
    error = Signal(str)

    def __init__(self):
        super().__init__()
        self.config = Config.load()
        self.pipeline = PDFPipeline(self.config)

        self.document_id: Optional[str] = None
        self.current_page: int = 0
        self.total_pages: int = 0
        self.batch_size: int = 10
        self._stop_requested: bool = False

    def set_document(self, document_id: str, current_page: int, total_pages: int):
        """
        분석할 문서 설정

        Args:
            document_id: 문서 ID
            current_page: 현재 페이지 (0-based)
            total_pages: 전체 페이지 수
        """
        self.document_id = document_id
        self.current_page = current_page
        self.total_pages = total_pages

        print(f"[BackgroundAnalyzer] 문서 설정: {document_id}, {total_pages}페이지")

    def stop(self):
        """스레드 중지 요청"""
        self._stop_requested = True
        print(f"[BackgroundAnalyzer] 중지 요청됨")

    def run(self):
        """스레드 실행"""
        if not self.document_id:
            self.error.emit("문서 ID가 설정되지 않았습니다")
            return

        try:
            # 현재 페이지 기준으로 다음 배치 계산
            # 이미 분석된 첫 10페이지 이후부터 시작
            next_batch_start = ((self.current_page // self.batch_size) + 1) * self.batch_size

            while next_batch_start < self.total_pages and not self._stop_requested:
                # 이미 분석된 페이지인지 확인
                if self._is_batch_analyzed(next_batch_start):
                    print(f"[BackgroundAnalyzer] 배치 {next_batch_start}~{next_batch_start + self.batch_size} 이미 분석됨")
                    next_batch_start += self.batch_size
                    continue

                # 배치 분석
                batch_end = min(next_batch_start + self.batch_size, self.total_pages)

                self.progress.emit(
                    next_batch_start,
                    self.total_pages,
                    f"백그라운드 분석: {next_batch_start+1}~{batch_end}페이지"
                )

                print(f"[BackgroundAnalyzer] 배치 분석 시작: {next_batch_start+1}~{batch_end}페이지")

                analyzed_count = self.pipeline.analyze_next_batch(
                    self.document_id,
                    next_batch_start,
                    self.batch_size
                )

                if analyzed_count > 0:
                    self.batch_completed.emit(next_batch_start, next_batch_start + analyzed_count)
                    print(f"[BackgroundAnalyzer] 배치 완료: {analyzed_count}페이지")

                next_batch_start += self.batch_size

            if not self._stop_requested:
                self.all_completed.emit()
                print(f"[BackgroundAnalyzer] 모든 페이지 분석 완료!")

        except Exception as e:
            error_msg = f"백그라운드 분석 실패: {str(e)}"
            print(f"[오류] {error_msg}")
            import traceback
            traceback.print_exc()
            self.error.emit(error_msg)

    def _is_batch_analyzed(self, start_page: int) -> bool:
        """
        배치가 이미 분석되었는지 확인

        Args:
            start_page: 시작 페이지 인덱스 (0-based)

        Returns:
            True이면 이미 분석됨
        """
        doc_dir = self.config.get_document_dir(self.document_id)
        blocks_dir = doc_dir / "blocks"

        if not blocks_dir.exists():
            return False

        # 배치의 첫 페이지 blocks JSON이 존재하는지 확인
        first_page_blocks = blocks_dir / f"page_{start_page:04d}_blocks.json"
        return first_page_blocks.exists()


# ========== 테스트 코드 ==========
if __name__ == "__main__":
    from PySide6.QtWidgets import QApplication

    print("BackgroundAnalyzer 테스트")

    app = QApplication(sys.argv)

    analyzer = BackgroundAnalyzer()

    # 시그널 연결
    analyzer.batch_completed.connect(
        lambda start, end: print(f"[Signal] 배치 완료: {start+1}~{end}페이지")
    )
    analyzer.all_completed.connect(
        lambda: print(f"[Signal] 모든 페이지 분석 완료!")
    )
    analyzer.progress.connect(
        lambda current, total, msg: print(f"[Signal] 진행: {current}/{total} - {msg}")
    )
    analyzer.error.connect(
        lambda msg: print(f"[Signal] 오류: {msg}")
    )

    # 테스트 실행 (실제 문서 ID로 교체 필요)
    # analyzer.set_document("테스트문서", 0, 100)
    # analyzer.start()

    print("테스트 준비 완료 (실제 문서 ID로 set_document 호출 후 start)")
