"""
test.pdf 처리 스크립트
개선된 v_kernel 설정으로 인테그랄 블록 검출 테스트
"""
from pathlib import Path
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from pdf_pipeline import PDFPipeline


def main():
    print("=" * 70)
    print("test.pdf 처리 시작 (개선된 v_kernel)")
    print("=" * 70)
    print()

    # Config 로드
    config = Config.load()

    # PDF 경로
    pdf_path = config.DATASET_ROOT / "raw_pdfs" / "test.pdf"

    if not pdf_path.exists():
        print(f"[오류] PDF 파일이 없습니다: {pdf_path}")
        return

    print(f"PDF 경로: {pdf_path}")
    print()

    # 파이프라인 생성
    pipeline = PDFPipeline(config)

    # 진행 상황 콜백
    def progress_callback(message: str, current: int, total: int):
        print(f"[{current}/{total}] {message}")

    # PDF 처리
    try:
        document_id = pipeline.process_pdf(
            pdf_path=pdf_path,
            document_id="test",
            dpi=150,
            progress_callback=progress_callback
        )

        print()
        print("=" * 70)
        print(f"처리 완료! 문서 ID: {document_id}")
        print("=" * 70)
        print()
        print("결과 확인:")
        print(f"  이미지: {config.DOCUMENTS_DIR / document_id / 'pages'}")
        print(f"  블록 JSON: {config.DOCUMENTS_DIR / document_id / 'blocks'}")
        print()
        print("GUI에서 확인하려면:")
        print("  python src/main.py")
        print(f"  → 문서 '{document_id}' 선택")

    except Exception as e:
        print(f"[오류] 처리 실패: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
