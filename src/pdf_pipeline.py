"""
PDF 처리 파이프라인

PDF → 이미지 변환 → 블록 검출 → JSON 저장
"""
from pathlib import Path
from typing import List, Optional, Callable
import json
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from pdf_processor import PDFProcessor
from density_analyzer import DensityAnalyzer
from data_models import PageData, Column
from utils import imread_unicode
import cv2


class PDFPipeline:
    """
    PDF 처리 전체 파이프라인

    사용 예:
        pipeline = PDFPipeline(config)
        doc_id = pipeline.process_pdf(pdf_path, progress_callback=my_callback)
    """

    def __init__(self, config: Config):
        """
        Args:
            config: Config 인스턴스
        """
        self.config = config
        self.pdf_processor = PDFProcessor(config)
        self.analyzer = DensityAnalyzer(config, use_multiscale=False)

    def process_pdf(
        self,
        pdf_path: Path,
        document_id: Optional[str] = None,
        dpi: int = 150,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> str:
        """
        PDF 전체 처리 파이프라인 실행

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID (None이면 파일명에서 추출)
            dpi: 이미지 해상도
            progress_callback: 진행 상황 콜백 function(message, current, total)

        Returns:
            생성된 문서 ID
        """
        # 문서 ID 생성
        if document_id is None:
            document_id = pdf_path.stem  # 확장자 제외한 파일명

        print(f"=" * 70)
        print(f"PDF 처리 파이프라인 시작: {document_id}")
        print(f"=" * 70)

        # Step 1: PDF → 이미지 변환
        if progress_callback:
            progress_callback("PDF를 이미지로 변환 중...", 0, 3)

        print("\n[1/3] PDF → 이미지 변환...")
        image_paths = self.pdf_processor.convert_pdf_to_images(
            pdf_path=pdf_path,
            document_id=document_id,
            dpi=dpi
        )
        print(f"  → {len(image_paths)}개 페이지 이미지 생성 완료")

        # Step 2: 블록 검출
        if progress_callback:
            progress_callback("블록 검출 중...", 1, 3)

        print("\n[2/3] 블록 검출...")
        total_blocks = 0

        for page_index, image_path in enumerate(image_paths):
            # 이미지 로드 (한글 경로 지원)
            image = imread_unicode(image_path)
            if image is None:
                print(f"  [오류] 이미지 로드 실패: {image_path}")
                continue

            height, width = image.shape[:2]

            # 블록 검출
            blocks = self.analyzer.analyze_page(image)

            # 컬럼 정보 생성 (2단 구조 가정)
            columns = [
                Column(id="L", x_min=0, x_max=width // 2),
                Column(id="R", x_min=width // 2, x_max=width)
            ]

            # PageData 생성
            page_data = PageData(
                document_id=document_id,
                page_index=page_index,
                width=width,
                height=height,
                columns=columns,
                blocks=blocks
            )

            # JSON 저장
            self._save_blocks_json(page_data, document_id, page_index)

            total_blocks += len(blocks)
            print(f"  페이지 {page_index + 1}: {len(blocks)}개 블록")

        print(f"  → 총 {total_blocks}개 블록 검출 완료")

        # Step 3: 완료
        if progress_callback:
            progress_callback("처리 완료!", 3, 3)

        print("\n[3/3] 처리 완료")
        print(f"  문서 ID: {document_id}")
        print(f"  페이지 수: {len(image_paths)}")
        print(f"  총 블록 수: {total_blocks}")
        print(f"=" * 70)

        return document_id

    def _save_blocks_json(
        self,
        page_data: PageData,
        document_id: str,
        page_index: int
    ):
        """
        블록 데이터를 JSON으로 저장

        Args:
            page_data: PageData 인스턴스
            document_id: 문서 ID
            page_index: 페이지 번호
        """
        # blocks 폴더 생성
        doc_dir = self.config.get_document_dir(document_id)
        blocks_dir = doc_dir / "blocks"
        blocks_dir.mkdir(parents=True, exist_ok=True)

        # JSON 파일 경로
        json_filename = f"page_{page_index:04d}_blocks.json"
        json_path = blocks_dir / json_filename

        # JSON 저장
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(page_data.to_dict(), f, indent=2, ensure_ascii=False)

        print(f"    JSON 저장: {json_filename}")

    def _analyze_page_batch_progressive(
        self,
        document_id: str,
        image_paths: List[Path],
        page_offset: int
    ) -> int:
        """
        Phase 14-1 Bugfix: 점진적 배치 블록 분석 (오프셋 지원)

        기존 _analyze_page_batch와의 차이점:
        - image_paths는 현재 배치의 이미지만 포함 (인덱스 0부터)
        - page_offset을 사용하여 글로벌 페이지 번호 계산

        Args:
            document_id: 문서 ID
            image_paths: 현재 배치의 이미지 경로 리스트 (배치 내부 인덱스 0부터)
            page_offset: 글로벌 페이지 인덱스 오프셋 (예: 10이면 실제 11페이지부터)

        Returns:
            분석된 페이지 수
        """
        total_blocks = 0
        analyzed_count = 0

        for local_idx, image_path in enumerate(image_paths):
            global_page_idx = page_offset + local_idx

            # 이미지 로드
            image = imread_unicode(image_path)
            if image is None:
                print(f"  [오류] 이미지 로드 실패: {image_path}")
                continue

            height, width = image.shape[:2]

            # 블록 검출
            blocks = self.analyzer.analyze_page(image)

            # 컬럼 정보 생성 (2단 구조 가정)
            columns = [
                Column(id="L", x_min=0, x_max=width // 2),
                Column(id="R", x_min=width // 2, x_max=width)
            ]

            # PageData 생성 - 글로벌 페이지 인덱스 사용
            page_data = PageData(
                document_id=document_id,
                page_index=global_page_idx,
                width=width,
                height=height,
                columns=columns,
                blocks=blocks
            )

            # JSON 저장 - 글로벌 페이지 인덱스 사용
            self._save_blocks_json(page_data, document_id, global_page_idx)

            total_blocks += len(blocks)
            analyzed_count += 1
            print(f"  페이지 {global_page_idx + 1}: {len(blocks)}개 블록")

        print(f"  → 배치 분석 완료: {page_offset + 1}~{page_offset + len(image_paths)}페이지, 총 {total_blocks}개 블록")

        return analyzed_count

    # ========== Phase 0: Lazy Loading 메서드 ==========

    def process_pdf_lazy(
        self,
        pdf_path: Path,
        document_id: Optional[str] = None,
        initial_pages: int = 10,
        batch_size: int = 10,
        dpi: int = 150,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> dict:
        """
        Lazy Loading PDF 처리 (Phase 0)

        단계:
        1. PDF 전체를 이미지로만 변환 (빠름 - 약 30초)
        2. 처음 N페이지만 블록 분석 (약 3초)
        3. 나머지는 on-demand 분석

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID (None이면 파일명에서 추출)
            initial_pages: 초기 분석 페이지 수 (기본 10)
            batch_size: 배치 크기 (기본 10)
            dpi: 이미지 해상도
            progress_callback: 진행 상황 콜백 function(message, current, total)

        Returns:
            {
                "document_id": 문서 ID,
                "total_pages": 전체 페이지 수,
                "analyzed_pages": 분석 완료 페이지 수,
                "image_paths": 이미지 경로 리스트
            }
        """
        # 문서 ID 생성
        if document_id is None:
            document_id = pdf_path.stem

        print(f"=" * 70)
        print(f"Lazy Loading PDF 처리 시작: {document_id}")
        print(f"  초기 분석: {initial_pages}페이지")
        print(f"=" * 70)

        # Step 1: PDF → 이미지 변환 (전체)
        if progress_callback:
            progress_callback("PDF를 이미지로 변환 중...", 0, 100)

        print("\n[1/2] PDF → 이미지 변환 (전체)...")
        image_paths = self.pdf_processor.convert_pdf_to_images(
            pdf_path=pdf_path,
            document_id=document_id,
            dpi=dpi
        )

        total_pages = len(image_paths)
        print(f"  → {total_pages}개 페이지 이미지 생성 완료")

        # Step 2: 첫 N페이지만 블록 분석
        if progress_callback:
            progress_callback(f"첫 {initial_pages}페이지 분석 중...", 30, 100)

        print(f"\n[2/2] 첫 {initial_pages}페이지 블록 분석...")
        analyze_end = min(initial_pages, total_pages)

        analyzed_count = self._analyze_page_batch(
            document_id=document_id,
            image_paths=image_paths,
            start=0,
            end=analyze_end,
            progress_callback=progress_callback
        )

        if progress_callback:
            progress_callback("초기 분석 완료!", 100, 100)

        print(f"\n처리 완료")
        print(f"  문서 ID: {document_id}")
        print(f"  전체 페이지: {total_pages}")
        print(f"  분석 완료: {analyzed_count}페이지")
        print(f"  나머지 {total_pages - analyzed_count}페이지는 백그라운드에서 분석됩니다")
        print(f"=" * 70)

        return {
            "document_id": document_id,
            "total_pages": total_pages,
            "analyzed_pages": analyzed_count,
            "image_paths": [str(p) for p in image_paths]
        }

    def _analyze_page_batch(
        self,
        document_id: str,
        image_paths: List[Path],
        start: int,
        end: int,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> int:
        """
        페이지 배치 분석 (내부 헬퍼)

        Args:
            document_id: 문서 ID
            image_paths: 전체 이미지 경로 리스트
            start: 시작 인덱스 (inclusive)
            end: 끝 인덱스 (exclusive)
            progress_callback: 진행 상황 콜백

        Returns:
            분석된 페이지 수
        """
        total_blocks = 0
        analyzed_count = 0

        for i in range(start, end):
            if i >= len(image_paths):
                break

            image_path = image_paths[i]

            # 진행률 업데이트
            if progress_callback:
                progress = 30 + int(70 * (i - start) / (end - start))
                progress_callback(f"페이지 {i+1} 분석 중...", progress, 100)

            # 이미지 로드
            image = imread_unicode(image_path)
            if image is None:
                print(f"  [오류] 이미지 로드 실패: {image_path}")
                continue

            height, width = image.shape[:2]

            # 블록 검출
            blocks = self.analyzer.analyze_page(image)

            # 컬럼 정보 생성 (2단 구조 가정)
            columns = [
                Column(id="L", x_min=0, x_max=width // 2),
                Column(id="R", x_min=width // 2, x_max=width)
            ]

            # PageData 생성
            page_data = PageData(
                document_id=document_id,
                page_index=i,
                width=width,
                height=height,
                columns=columns,
                blocks=blocks
            )

            # JSON 저장
            self._save_blocks_json(page_data, document_id, i)

            total_blocks += len(blocks)
            analyzed_count += 1
            print(f"  페이지 {i + 1}: {len(blocks)}개 블록")

        print(f"  → 배치 분석 완료: {start+1}~{end}페이지, 총 {total_blocks}개 블록")

        return analyzed_count

    def analyze_next_batch(
        self,
        document_id: str,
        start_page: int,
        batch_size: int = 10,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> int:
        """
        다음 배치 분석 (백그라운드에서 호출)

        Args:
            document_id: 문서 ID
            start_page: 시작 페이지 인덱스 (0-based)
            batch_size: 배치 크기 (기본 10)
            progress_callback: 진행 상황 콜백

        Returns:
            분석된 페이지 수
        """
        # 이미지 경로 로드
        doc_dir = self.config.get_document_dir(document_id)
        pages_dir = doc_dir / "pages"

        if not pages_dir.exists():
            print(f"[오류] pages 폴더 없음: {pages_dir}")
            return 0

        image_paths = sorted(pages_dir.glob("page_*.png"))

        if start_page >= len(image_paths):
            print(f"[Info] 이미 모든 페이지 분석 완료")
            return 0

        end_page = min(start_page + batch_size, len(image_paths))

        print(f"\n[백그라운드] 다음 배치 분석: {start_page+1}~{end_page}페이지")

        analyzed_count = self._analyze_page_batch(
            document_id=document_id,
            image_paths=image_paths,
            start=start_page,
            end=end_page,
            progress_callback=progress_callback
        )

        return analyzed_count

    # ========== Phase 14-1: 점진적 변환 메서드 ==========

    def process_pdf_progressive(
        self,
        pdf_path: Path,
        document_id: Optional[str] = None,
        initial_pages: int = 10,
        dpi: int = 150,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> dict:
        """
        점진적 PDF 처리 (Phase 14-1)

        핵심 차이점: 첫 N페이지만 이미지 변환 + 블록 분석
        나머지 페이지는 On-Demand로 변환

        1단계: 메타데이터 추출 (즉시)
        2단계: 첫 N페이지 이미지 변환 + 블록 분석
        3단계: 나머지는 백그라운드에서 처리

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID (None이면 파일명에서 추출)
            initial_pages: 초기 처리 페이지 수 (기본 10)
            dpi: 이미지 해상도
            progress_callback: 진행 상황 콜백

        Returns:
            {
                "document_id": str,
                "total_pages": int,
                "converted_pages": int,
                "analyzed_pages": int,
                "status": "ready" | "processing",
                "remaining_pages": int
            }
        """
        import time

        if document_id is None:
            document_id = pdf_path.stem

        print(f"=" * 70)
        print(f"[Phase 14-1] 점진적 PDF 처리 시작: {document_id}")
        print(f"=" * 70)

        # Step 1: 메타데이터 추출 (즉시)
        if progress_callback:
            progress_callback("메타데이터 추출 중...", 0, 100)

        metadata = self.pdf_processor.get_pdf_metadata(pdf_path)
        total_pages = metadata["total_pages"]

        print(f"\n[1/3] 메타데이터 추출 완료")
        print(f"  총 페이지: {total_pages}")
        print(f"  파일 크기: {metadata['file_size_mb']} MB")

        # 메타데이터 저장 (pdf_path 포함)
        doc_dir = self.config.get_document_dir(document_id)
        doc_dir.mkdir(parents=True, exist_ok=True)

        meta = {
            "document_id": document_id,
            "total_pages": total_pages,
            "analyzed_pages": 0,
            "created_at": time.time(),
            "pdf_path": str(pdf_path),  # 원본 PDF 경로 저장
            "status": "processing"
        }
        meta_path = doc_dir / "meta.json"
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

        # Step 2: 첫 N페이지 이미지 변환
        if progress_callback:
            progress_callback(f"첫 {initial_pages}페이지 변환 중...", 10, 100)

        convert_end = min(initial_pages, total_pages)

        print(f"\n[2/3] 첫 {convert_end}페이지 이미지 변환...")
        image_paths = self.pdf_processor.convert_page_range(
            pdf_path, document_id,
            0, convert_end,
            dpi
        )

        # Step 3: 첫 N페이지 블록 분석
        if progress_callback:
            progress_callback(f"첫 {initial_pages}페이지 분석 중...", 50, 100)

        print(f"\n[3/3] 첫 {convert_end}페이지 블록 분석...")
        analyzed_count = self._analyze_page_batch(
            document_id=document_id,
            image_paths=image_paths,
            start=0,
            end=convert_end,
            progress_callback=progress_callback
        )

        # 메타데이터 업데이트
        meta["analyzed_pages"] = analyzed_count
        meta["status"] = "ready" if convert_end >= total_pages else "processing"
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

        if progress_callback:
            progress_callback("초기 처리 완료!", 100, 100)

        remaining = total_pages - convert_end

        print(f"\n처리 완료")
        print(f"  문서 ID: {document_id}")
        print(f"  변환 완료: {convert_end}페이지")
        print(f"  분석 완료: {analyzed_count}페이지")
        print(f"  남은 페이지: {remaining}페이지 (백그라운드 처리)")
        print(f"=" * 70)

        return {
            "document_id": document_id,
            "total_pages": total_pages,
            "converted_pages": convert_end,
            "analyzed_pages": analyzed_count,
            "status": "ready" if remaining == 0 else "processing",
            "remaining_pages": remaining
        }

    def process_next_batch_progressive(
        self,
        document_id: str,
        pdf_path: Path,
        start_page: int,
        batch_size: int = 10,
        dpi: int = 150
    ) -> dict:
        """
        다음 배치 점진적 처리 (이미지 변환 + 블록 분석)

        Phase 14-1: 이미지 변환과 블록 분석을 함께 수행

        Args:
            document_id: 문서 ID
            pdf_path: 원본 PDF 경로
            start_page: 시작 페이지 인덱스 (0-based)
            batch_size: 배치 크기 (기본 10)
            dpi: 이미지 해상도

        Returns:
            {
                "processed_pages": int,
                "remaining_pages": int,
                "status": "processing" | "completed"
            }
        """
        # 메타데이터 로드
        doc_dir = self.config.get_document_dir(document_id)
        meta_path = doc_dir / "meta.json"

        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        total_pages = meta["total_pages"]
        end_page = min(start_page + batch_size, total_pages)

        if start_page >= total_pages:
            return {
                "processed_pages": 0,
                "remaining_pages": 0,
                "status": "completed"
            }

        print(f"\n[백그라운드] 배치 처리: {start_page + 1}~{end_page}페이지")

        # 이미지 변환
        image_paths = self.pdf_processor.convert_page_range(
            pdf_path, document_id,
            start_page, end_page,
            dpi
        )

        # Phase 14-1 Bugfix: 오프셋 기반 블록 분석 사용
        analyzed = self._analyze_page_batch_progressive(
            document_id=document_id,
            image_paths=image_paths,
            page_offset=start_page  # 글로벌 페이지 오프셋
        )

        # 메타데이터 업데이트
        meta["analyzed_pages"] = end_page
        remaining = total_pages - end_page
        meta["status"] = "ready" if remaining == 0 else "processing"

        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

        return {
            "processed_pages": analyzed,
            "remaining_pages": remaining,
            "status": "completed" if remaining == 0 else "processing"
        }

    def get_document_info(self, document_id: str) -> dict:
        """
        문서 정보 조회

        Args:
            document_id: 문서 ID

        Returns:
            문서 정보 딕셔너리
        """
        doc_dir = self.config.get_document_dir(document_id)
        blocks_dir = doc_dir / "blocks"
        pages_dir = doc_dir / "pages"

        # 페이지 수
        num_pages = len(list(pages_dir.glob("page_*.png"))) if pages_dir.exists() else 0

        # 블록 수
        total_blocks = 0
        if blocks_dir.exists():
            for json_file in blocks_dir.glob("page_*_blocks.json"):
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    total_blocks += len(data.get('blocks', []))

        return {
            'document_id': document_id,
            'num_pages': num_pages,
            'total_blocks': total_blocks,
            'directory': str(doc_dir)
        }

    def process_solution_pdf(
        self,
        pdf_path: Path,
        document_id: str,
        dpi: int = 150,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> List[Path]:
        """
        해설 PDF 처리 파이프라인 (Phase 4.6)

        이미지 변환 + 블록 검출 + solution_blocks 폴더에 JSON 저장

        Args:
            pdf_path: 해설 PDF 파일 경로
            document_id: 문서 ID (문제 PDF의 document_id와 동일)
            dpi: 이미지 해상도
            progress_callback: 진행 상황 콜백 function(message, current, total)

        Returns:
            생성된 이미지 경로 리스트
        """
        print(f"=" * 70)
        print(f"해설 PDF 처리 시작: {document_id}")
        print(f"=" * 70)

        # Step 1: PDF → 이미지 변환
        if progress_callback:
            progress_callback("해설 PDF를 이미지로 변환 중...", 0, 2)

        print("\n[1/2] 해설 PDF → 이미지 변환...")
        image_paths = self.pdf_processor.convert_solution_pdf_to_images(
            pdf_path=pdf_path,
            document_id=document_id,
            dpi=dpi
        )
        print(f"  → {len(image_paths)}개 해설 페이지 이미지 생성 완료")

        # Step 2: 블록 검출
        if progress_callback:
            progress_callback("해설 블록 검출 중...", 1, 2)

        print("\n[2/2] 해설 블록 검출...")
        total_blocks = 0

        for page_index, image_path in enumerate(image_paths):
            # 이미지 로드 (한글 경로 지원)
            image = imread_unicode(image_path)
            if image is None:
                print(f"  [오류] 해설 이미지 로드 실패: {image_path}")
                continue

            height, width = image.shape[:2]

            # 블록 검출
            blocks = self.analyzer.analyze_page(image)

            # 컬럼 정보 생성 (해설은 단일 컬럼으로 가정)
            columns = [
                Column(id="FULL", x_min=0, x_max=width)
            ]

            # PageData 생성
            page_data = PageData(
                document_id=f"{document_id}_solution",
                page_index=page_index,
                width=width,
                height=height,
                columns=columns,
                blocks=blocks
            )

            # solution_blocks 폴더에 JSON 저장
            self._save_solution_blocks_json(page_data, document_id, page_index)

            total_blocks += len(blocks)
            print(f"  해설 페이지 {page_index + 1}: {len(blocks)}개 블록")

        print(f"  → 총 {total_blocks}개 해설 블록 검출 완료")

        # 완료
        if progress_callback:
            progress_callback("해설 처리 완료!", 2, 2)

        print("\n처리 완료")
        print(f"  문서 ID: {document_id}")
        print(f"  해설 페이지 수: {len(image_paths)}")
        print(f"  총 해설 블록 수: {total_blocks}")
        print(f"=" * 70)

        return image_paths

    def _save_solution_blocks_json(
        self,
        page_data: PageData,
        document_id: str,
        page_index: int
    ):
        """
        해설 블록 데이터를 JSON으로 저장 (Phase 4.6)

        Args:
            page_data: PageData 인스턴스
            document_id: 문서 ID
            page_index: 페이지 번호
        """
        # solution_blocks 폴더 생성
        doc_dir = self.config.get_document_dir(document_id)
        solution_blocks_dir = doc_dir / "solution_blocks"
        solution_blocks_dir.mkdir(parents=True, exist_ok=True)

        # JSON 파일 경로
        json_filename = f"solution_page_{page_index:04d}_blocks.json"
        json_path = solution_blocks_dir / json_filename

        # JSON 저장
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(page_data.to_dict(), f, indent=2, ensure_ascii=False)

        print(f"    JSON 저장: {json_filename}")

    # ========== Phase 0: Lazy Loading 메서드 ==========

    def process_pdf_lazy(
        self,
        pdf_path: Path,
        document_id: Optional[str] = None,
        initial_pages: int = 10,
        batch_size: int = 10,
        dpi: int = 150,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> dict:
        """
        Lazy Loading PDF 처리 (Phase 0)

        단계:
        1. PDF 전체를 이미지로만 변환 (빠름 - 약 30초)
        2. 처음 N페이지만 블록 분석 (약 3초)
        3. 나머지는 on-demand 분석

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID (None이면 파일명에서 추출)
            initial_pages: 초기 분석 페이지 수 (기본 10)
            batch_size: 배치 크기 (기본 10)
            dpi: 이미지 해상도
            progress_callback: 진행 상황 콜백 function(message, current, total)

        Returns:
            {
                "document_id": 문서 ID,
                "total_pages": 전체 페이지 수,
                "analyzed_pages": 분석 완료 페이지 수,
                "image_paths": 이미지 경로 리스트
            }
        """
        # 문서 ID 생성
        if document_id is None:
            document_id = pdf_path.stem

        print(f"=" * 70)
        print(f"Lazy Loading PDF 처리 시작: {document_id}")
        print(f"  초기 분석: {initial_pages}페이지")
        print(f"=" * 70)

        # Step 1: PDF → 이미지 변환 (전체)
        if progress_callback:
            progress_callback("PDF를 이미지로 변환 중...", 0, 100)

        print("\n[1/2] PDF → 이미지 변환 (전체)...")
        image_paths = self.pdf_processor.convert_pdf_to_images(
            pdf_path=pdf_path,
            document_id=document_id,
            dpi=dpi
        )

        total_pages = len(image_paths)
        print(f"  → {total_pages}개 페이지 이미지 생성 완료")

        # Step 2: 첫 N페이지만 블록 분석
        if progress_callback:
            progress_callback(f"첫 {initial_pages}페이지 분석 중...", 30, 100)

        print(f"\n[2/2] 첫 {initial_pages}페이지 블록 분석...")
        analyze_end = min(initial_pages, total_pages)

        analyzed_count = self._analyze_page_batch(
            document_id=document_id,
            image_paths=image_paths,
            start=0,
            end=analyze_end,
            progress_callback=progress_callback
        )

        if progress_callback:
            progress_callback("초기 분석 완료!", 100, 100)

        print(f"\n처리 완료")
        print(f"  문서 ID: {document_id}")
        print(f"  전체 페이지: {total_pages}")
        print(f"  분석 완료: {analyzed_count}페이지")
        print(f"  나머지 {total_pages - analyzed_count}페이지는 백그라운드에서 분석됩니다")
        print(f"=" * 70)

        return {
            "document_id": document_id,
            "total_pages": total_pages,
            "analyzed_pages": analyzed_count,
            "image_paths": [str(p) for p in image_paths]
        }

    def _analyze_page_batch(
        self,
        document_id: str,
        image_paths: List[Path],
        start: int,
        end: int,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> int:
        """
        페이지 배치 분석 (내부 헬퍼)

        Args:
            document_id: 문서 ID
            image_paths: 전체 이미지 경로 리스트
            start: 시작 인덱스 (inclusive)
            end: 끝 인덱스 (exclusive)
            progress_callback: 진행 상황 콜백

        Returns:
            분석된 페이지 수
        """
        total_blocks = 0
        analyzed_count = 0

        for i in range(start, end):
            if i >= len(image_paths):
                break

            image_path = image_paths[i]

            # 진행률 업데이트
            if progress_callback:
                progress = 30 + int(70 * (i - start) / (end - start))
                progress_callback(f"페이지 {i+1} 분석 중...", progress, 100)

            # 이미지 로드
            image = imread_unicode(image_path)
            if image is None:
                print(f"  [오류] 이미지 로드 실패: {image_path}")
                continue

            height, width = image.shape[:2]

            # 블록 검출
            blocks = self.analyzer.analyze_page(image)

            # 컬럼 정보 생성 (2단 구조 가정)
            columns = [
                Column(id="L", x_min=0, x_max=width // 2),
                Column(id="R", x_min=width // 2, x_max=width)
            ]

            # PageData 생성
            page_data = PageData(
                document_id=document_id,
                page_index=i,
                width=width,
                height=height,
                columns=columns,
                blocks=blocks
            )

            # JSON 저장
            self._save_blocks_json(page_data, document_id, i)

            total_blocks += len(blocks)
            analyzed_count += 1
            print(f"  페이지 {i + 1}: {len(blocks)}개 블록")

        print(f"  → 배치 분석 완료: {start+1}~{end}페이지, 총 {total_blocks}개 블록")

        return analyzed_count

    def analyze_next_batch(
        self,
        document_id: str,
        start_page: int,
        batch_size: int = 10,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> int:
        """
        다음 배치 분석 (백그라운드에서 호출)

        Args:
            document_id: 문서 ID
            start_page: 시작 페이지 인덱스 (0-based)
            batch_size: 배치 크기 (기본 10)
            progress_callback: 진행 상황 콜백

        Returns:
            분석된 페이지 수
        """
        # 이미지 경로 로드
        doc_dir = self.config.get_document_dir(document_id)
        pages_dir = doc_dir / "pages"

        if not pages_dir.exists():
            print(f"[오류] pages 폴더 없음: {pages_dir}")
            return 0

        image_paths = sorted(pages_dir.glob("page_*.png"))

        if start_page >= len(image_paths):
            print(f"[Info] 이미 모든 페이지 분석 완료")
            return 0

        end_page = min(start_page + batch_size, len(image_paths))

        print(f"\n[백그라운드] 다음 배치 분석: {start_page+1}~{end_page}페이지")

        analyzed_count = self._analyze_page_batch(
            document_id=document_id,
            image_paths=image_paths,
            start=start_page,
            end=end_page,
            progress_callback=progress_callback
        )

        return analyzed_count
