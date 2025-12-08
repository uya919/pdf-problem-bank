"""
Phase 1 통합 테스트
PDF -> 이미지 -> 블록 검출 -> 저장 전체 파이프라인 테스트
"""
from pathlib import Path
import sys
import cv2

# src를 import 경로에 추가
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from config import Config
from pdf_processor import PDFProcessor
from density_analyzer import DensityAnalyzer
from data_io import DataIO
from data_models import PageData, Column


def main():
    print("=" * 60)
    print("Phase 1 통합 테스트 시작")
    print("=" * 60)

    # 1. 설정 로드
    print("\n[1/5] 설정 로드 중...")
    config = Config.load()
    print(f"  Dataset Root: {config.DATASET_ROOT}")

    # 2. 테스트 PDF 처리
    test_pdf = config.RAW_PDFS_DIR / "test.pdf"
    if not test_pdf.exists():
        print(f"  [!] 테스트 PDF가 없습니다: {test_pdf}")
        print(f"  -> 테스트 PDF를 {test_pdf.parent}에 넣어주세요.")
        print("\n" + "=" * 60)
        print("[!] 테스트 PDF가 없어서 건너뜁니다.")
        print("=" * 60)
        print("\n이것은 정상입니다. 테스트 PDF를 준비한 후 다시 실행하세요.")
        print("\n준비 방법:")
        print(f"  1. 수학 문제집 PDF를 준비")
        print(f"  2. {test_pdf.parent} 폴더에 'test.pdf'로 저장")
        print(f"  3. 다시 이 스크립트 실행: python tests/test_pipeline.py")
        return

    print(f"\n[2/5] PDF 변환 중... ({test_pdf.name})")
    processor = PDFProcessor(config)

    try:
        image_paths = processor.convert_pdf_to_images(test_pdf, "test_doc", dpi=150)
        print(f"  [OK] {len(image_paths)}개 페이지 변환 완료")
    except Exception as e:
        print(f"  [ERROR] PDF 변환 실패: {e}")
        return

    # 3. 첫 페이지 블록 검출
    print(f"\n[3/5] 블록 검출 중... (페이지 0)")
    analyzer = DensityAnalyzer(config)

    try:
        image = cv2.imread(str(image_paths[0]))
        if image is None:
            print(f"  [ERROR] 이미지 로드 실패: {image_paths[0]}")
            return

        blocks = analyzer.analyze_page(image)
        print(f"  [OK] {len(blocks)}개 블록 검출됨")

        # 블록 정보 출력
        if len(blocks) > 0:
            print(f"\n  첫 {min(5, len(blocks))}개 블록:")
            for block in blocks[:5]:
                print(f"    Block {block.block_id}: column={block.column}, "
                      f"bbox={block.bbox.to_list()}, density={block.pixel_density:.3f}")

            if len(blocks) > 5:
                print(f"    ... 외 {len(blocks) - 5}개")
        else:
            print("  [WARNING] 블록이 검출되지 않았습니다.")
            print("  -> WHITE_THRESHOLD 값을 조정해보세요 (.env 파일)")

    except Exception as e:
        print(f"  [ERROR] 블록 검출 실패: {e}")
        import traceback
        traceback.print_exc()
        return

    # 4. 시각화
    print(f"\n[4/5] 결과 시각화 중...")
    vis_path = config.DATASET_ROOT / "test_result_visualization.png"

    try:
        analyzer.visualize_blocks(image, blocks, vis_path)
        print(f"  [OK] 저장됨: {vis_path}")
    except Exception as e:
        print(f"  [ERROR] 시각화 실패: {e}")

    # 5. JSON 저장
    print(f"\n[5/5] 데이터 저장 중...")
    data_io = DataIO(config)

    try:
        # 컬럼 정보 (간단히 2단 분할)
        width = image.shape[1]
        height = image.shape[0]
        columns = [
            Column(id="L", x_min=0, x_max=width//2),
            Column(id="R", x_min=width//2, x_max=width)
        ]

        # 블록에 컬럼 할당 (이미 analyze_page에서 할당됨)

        # PageData 생성
        from datetime import datetime
        page_data = PageData(
            document_id="test_doc",
            page_index=0,
            width=width,
            height=height,
            columns=columns,
            blocks=blocks,
            status="auto",
            created_at=datetime.now(),
            modified_at=datetime.now()
        )

        saved_path = data_io.save_page_data(page_data, "test_doc")
        print(f"  [OK] JSON 저장됨: {saved_path}")

        # 저장 확인 (로드 테스트)
        loaded = data_io.load_page_data("test_doc", 0)
        if loaded and len(loaded.blocks) == len(blocks):
            print(f"  [OK] 저장/로드 검증 완료")
        else:
            print(f"  [WARNING] 저장/로드 검증 실패")

    except Exception as e:
        print(f"  [ERROR] 데이터 저장 실패: {e}")
        import traceback
        traceback.print_exc()
        return

    # 완료
    print("\n" + "=" * 60)
    print("[OK] Phase 1 테스트 완료!")
    print("=" * 60)
    print(f"\n다음 단계:")
    print(f"  1. 시각화 이미지 확인: {vis_path}")
    print(f"     -> 블록이 제대로 검출되었는지 확인")
    print(f"  2. JSON 파일 확인: {saved_path}")
    print(f"     -> 데이터가 올바르게 저장되었는지 확인")
    print(f"  3. 블록 검출 품질이 좋으면 Phase 2로 진행")
    print(f"     -> 품질이 낮으면 .env에서 WHITE_THRESHOLD, MIN_BLOCK_SIZE 조정")
    print("\nPhase 2를 시작하려면: '계속 진행해줘' 라고 말씀하세요!")


if __name__ == "__main__":
    main()
