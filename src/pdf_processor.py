"""
PDF 처리 클래스
PDF를 페이지별 이미지로 변환

Phase 14-1: 점진적 변환 지원 추가
Phase 14-2: WebP 포맷 지원 추가
Phase 14-3: 썸네일 생성 지원 추가
"""
from pathlib import Path
from typing import List, Dict, Optional
import fitz  # PyMuPDF
import numpy as np
from PIL import Image  # Phase 14-2: WebP 변환용
from config import Config


class PDFProcessor:
    """PDF 처리 클래스 (Phase 14-1: 점진적 변환, Phase 14-2: WebP 지원, Phase 14-3: 썸네일)"""

    def __init__(self, config: Config):
        """
        Args:
            config: Config 인스턴스
        """
        self.config = config
        self._pdf_cache: Dict[str, fitz.Document] = {}  # Phase 14-1: PDF 캐시

    # ========== Phase 14-1: 점진적 변환 메서드 ==========

    def get_pdf_metadata(self, pdf_path: Path) -> dict:
        """
        PDF 메타데이터만 빠르게 추출 (이미지 변환 없이)

        Args:
            pdf_path: PDF 파일 경로

        Returns:
            {
                "total_pages": int,
                "page_sizes": [(width, height), ...],
                "file_size_mb": float
            }
        """
        pdf = fitz.open(pdf_path)
        total_pages = len(pdf)

        # 처음 5페이지만 샘플링하여 크기 확인
        page_sizes = []
        for i in range(min(5, total_pages)):
            page = pdf[i]
            rect = page.rect
            page_sizes.append((int(rect.width), int(rect.height)))

        file_size_mb = pdf_path.stat().st_size / (1024 * 1024)

        pdf.close()

        return {
            "total_pages": total_pages,
            "page_sizes": page_sizes,
            "file_size_mb": round(file_size_mb, 2)
        }

    def convert_page_range(
        self,
        pdf_path: Path,
        document_id: str,
        start_page: int,
        end_page: int,
        dpi: int = 150,
        image_format: str = None,  # Phase 14-2: webp | png
        webp_quality: int = None   # Phase 14-2: WebP 품질
    ) -> List[Path]:
        """
        특정 페이지 범위만 이미지로 변환 (Phase 14-1, 14-2: WebP 지원)

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            start_page: 시작 페이지 (0-based, inclusive)
            end_page: 끝 페이지 (exclusive)
            dpi: 해상도
            image_format: 이미지 포맷 (webp | png, None이면 config에서 가져옴)
            webp_quality: WebP 품질 (0-100, None이면 config에서 가져옴)

        Returns:
            생성된 이미지 경로 리스트
        """
        # Phase 14-2: 포맷 설정
        if image_format is None:
            image_format = getattr(self.config, 'IMAGE_FORMAT', 'png')
        if webp_quality is None:
            webp_quality = getattr(self.config, 'WEBP_QUALITY', 90)

        # 확장자 결정
        ext = ".webp" if image_format == "webp" else ".png"

        # 디렉토리 준비
        doc_dir = self.config.get_document_dir(document_id)
        pages_dir = doc_dir / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)

        # PDF 열기 (캐싱)
        pdf = self._get_or_open_pdf(pdf_path)
        total_pages = len(pdf)

        # 범위 검증
        start_page = max(0, start_page)
        end_page = min(end_page, total_pages)

        image_paths = []
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        for page_num in range(start_page, end_page):
            image_path = pages_dir / f"page_{page_num:04d}{ext}"

            # 이미 존재하면 스킵 (WebP 또는 PNG 모두 확인)
            webp_exists = (pages_dir / f"page_{page_num:04d}.webp").exists()
            png_exists = (pages_dir / f"page_{page_num:04d}.png").exists()

            if webp_exists or png_exists:
                # 기존 파일 우선 사용
                if webp_exists:
                    image_paths.append(pages_dir / f"page_{page_num:04d}.webp")
                else:
                    image_paths.append(pages_dir / f"page_{page_num:04d}.png")
                continue

            # 페이지 렌더링
            page = pdf[page_num]
            pix = page.get_pixmap(matrix=mat)

            if image_format == "webp":
                # Phase 14-2: WebP 저장
                self._save_as_webp(pix, image_path, webp_quality)
            else:
                # 기존 PNG 저장
                pix.save(str(image_path))

            image_paths.append(image_path)
            print(f"  페이지 {page_num + 1}/{total_pages} 변환 완료 ({ext})")

        return image_paths

    def _save_as_webp(
        self,
        pix: fitz.Pixmap,
        path: Path,
        quality: int = 90
    ):
        """
        Phase 14-2: PyMuPDF pixmap을 WebP로 저장

        Args:
            pix: PyMuPDF Pixmap 객체
            path: 저장 경로
            quality: WebP 품질 (0-100)
        """
        # pixmap → PIL Image
        if pix.n == 4:  # RGBA
            img = Image.frombytes("RGBA", [pix.width, pix.height], pix.samples)
            img = img.convert("RGB")  # WebP는 RGB 권장
        else:
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # WebP로 저장
        img.save(str(path), "WEBP", quality=quality)

    # ========== Phase 14-3: 썸네일 생성 메서드 ==========

    def create_thumbnail(
        self,
        pdf_path: Path,
        document_id: str,
        page_index: int,
        thumb_dpi: int = None,
        thumb_quality: int = None
    ) -> Optional[Path]:
        """
        Phase 14-3: 단일 페이지 썸네일 생성

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            page_index: 페이지 인덱스 (0-based)
            thumb_dpi: 썸네일 DPI (None이면 config에서 가져옴)
            thumb_quality: 썸네일 품질 (None이면 config에서 가져옴)

        Returns:
            생성된 썸네일 경로 또는 None
        """
        # 설정 가져오기
        if thumb_dpi is None:
            thumb_dpi = getattr(self.config, 'THUMB_DPI', 50)
        if thumb_quality is None:
            thumb_quality = getattr(self.config, 'THUMB_QUALITY', 80)

        # 디렉토리 준비
        doc_dir = self.config.get_document_dir(document_id)
        thumbs_dir = doc_dir / "thumbs"
        thumbs_dir.mkdir(parents=True, exist_ok=True)

        # 썸네일 경로
        thumb_path = thumbs_dir / f"thumb_{page_index:04d}.webp"

        # 이미 존재하면 반환
        if thumb_path.exists():
            return thumb_path

        # PDF 열기
        pdf = self._get_or_open_pdf(pdf_path)
        total_pages = len(pdf)

        if page_index >= total_pages:
            return None

        # 페이지 렌더링 (낮은 DPI)
        zoom = thumb_dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        page = pdf[page_index]
        pix = page.get_pixmap(matrix=mat)

        # WebP로 저장
        self._save_as_webp(pix, thumb_path, thumb_quality)
        print(f"  [Thumbnail] 페이지 {page_index + 1} 썸네일 생성 완료")

        return thumb_path

    def create_thumbnails_batch(
        self,
        pdf_path: Path,
        document_id: str,
        start_page: int = 0,
        end_page: int = None,
        thumb_dpi: int = None,
        thumb_quality: int = None
    ) -> List[Path]:
        """
        Phase 14-3: 다중 페이지 썸네일 일괄 생성

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            start_page: 시작 페이지 (0-based, inclusive)
            end_page: 끝 페이지 (exclusive, None이면 전체)
            thumb_dpi: 썸네일 DPI
            thumb_quality: 썸네일 품질

        Returns:
            생성된 썸네일 경로 리스트
        """
        # 설정 가져오기
        if thumb_dpi is None:
            thumb_dpi = getattr(self.config, 'THUMB_DPI', 50)
        if thumb_quality is None:
            thumb_quality = getattr(self.config, 'THUMB_QUALITY', 80)

        # PDF 열기
        pdf = self._get_or_open_pdf(pdf_path)
        total_pages = len(pdf)

        # 범위 설정
        start_page = max(0, start_page)
        if end_page is None:
            end_page = total_pages
        end_page = min(end_page, total_pages)

        # 디렉토리 준비
        doc_dir = self.config.get_document_dir(document_id)
        thumbs_dir = doc_dir / "thumbs"
        thumbs_dir.mkdir(parents=True, exist_ok=True)

        thumb_paths = []
        zoom = thumb_dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        print(f"[Phase 14-3] 썸네일 생성: {start_page + 1}~{end_page}페이지 (DPI={thumb_dpi})")

        for page_num in range(start_page, end_page):
            thumb_path = thumbs_dir / f"thumb_{page_num:04d}.webp"

            # 이미 존재하면 스킵
            if thumb_path.exists():
                thumb_paths.append(thumb_path)
                continue

            # 페이지 렌더링
            page = pdf[page_num]
            pix = page.get_pixmap(matrix=mat)

            # WebP로 저장
            self._save_as_webp(pix, thumb_path, thumb_quality)
            thumb_paths.append(thumb_path)

            if (page_num + 1) % 10 == 0:
                print(f"  썸네일 {page_num + 1}/{end_page} 생성 완료")

        print(f"[Phase 14-3] 썸네일 생성 완료: {len(thumb_paths)}개")
        return thumb_paths

    def is_thumbnail_exists(self, document_id: str, page_index: int) -> bool:
        """Phase 14-3: 썸네일 존재 여부 확인"""
        doc_dir = self.config.get_document_dir(document_id)
        thumb_path = doc_dir / "thumbs" / f"thumb_{page_index:04d}.webp"
        return thumb_path.exists()

    def convert_single_page(
        self,
        pdf_path: Path,
        document_id: str,
        page_index: int,
        dpi: int = 150
    ) -> Optional[Path]:
        """
        단일 페이지 On-Demand 변환 (Phase 14-1)

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            page_index: 페이지 인덱스 (0-based)
            dpi: 해상도

        Returns:
            생성된 이미지 경로 또는 None
        """
        paths = self.convert_page_range(
            pdf_path, document_id,
            page_index, page_index + 1,
            dpi
        )
        return paths[0] if paths else None

    def is_page_converted(self, document_id: str, page_index: int) -> bool:
        """페이지 이미지가 이미 존재하는지 확인"""
        doc_dir = self.config.get_document_dir(document_id)
        image_path = doc_dir / "pages" / f"page_{page_index:04d}.png"
        return image_path.exists()

    def _get_or_open_pdf(self, pdf_path: Path) -> fitz.Document:
        """PDF 캐싱 (반복 열기 방지)"""
        key = str(pdf_path)
        if key not in self._pdf_cache:
            self._pdf_cache[key] = fitz.open(pdf_path)
        return self._pdf_cache[key]

    def close_pdf_cache(self, pdf_path: Path = None):
        """PDF 캐시 해제"""
        if pdf_path:
            key = str(pdf_path)
            if key in self._pdf_cache:
                self._pdf_cache[key].close()
                del self._pdf_cache[key]
        else:
            for pdf in self._pdf_cache.values():
                pdf.close()
            self._pdf_cache.clear()

    # ========== 기존 메서드 ==========

    def convert_pdf_to_images(
        self,
        pdf_path: Path,
        document_id: str,
        dpi: int = 150
    ) -> List[Path]:
        """
        PDF를 페이지별 이미지로 변환하여 저장

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            dpi: 이미지 해상도 (기본값: 150)

        Returns:
            생성된 이미지 파일 경로 리스트
        """
        # 문서 디렉토리 생성
        doc_dir = self.config.get_document_dir(document_id)
        pages_dir = doc_dir / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)

        # PDF 열기
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)

        print(f"PDF 변환 시작: {pdf_path.name} ({total_pages} 페이지)")

        image_paths = []

        # 각 페이지 처리
        for page_num in range(total_pages):
            # 페이지 로드
            page = pdf_document[page_num]

            # DPI에 따른 확대 비율 계산 (기본 72 DPI)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            # 페이지를 이미지로 렌더링
            pix = page.get_pixmap(matrix=mat)

            # 이미지 저장 경로
            image_filename = f"page_{page_num:04d}.png"
            image_path = pages_dir / image_filename

            # PNG로 저장
            pix.save(str(image_path))

            image_paths.append(image_path)

            print(f"  페이지 {page_num + 1}/{total_pages} 변환 완료")

        # PDF 닫기
        pdf_document.close()

        print(f"PDF 변환 완료: {len(image_paths)}개 이미지 생성")

        return image_paths

    def convert_solution_pdf_to_images(
        self,
        pdf_path: Path,
        document_id: str,
        dpi: int = 150
    ) -> List[Path]:
        """
        해설 PDF를 페이지별 이미지로 변환하여 저장 (Phase 4)

        Args:
            pdf_path: 해설 PDF 파일 경로
            document_id: 문서 ID (문제 PDF와 동일한 ID 사용)
            dpi: 이미지 해상도 (기본값: 150)

        Returns:
            생성된 해설 이미지 파일 경로 리스트
        """
        # 문서 디렉토리 생성
        doc_dir = self.config.get_document_dir(document_id)
        solution_pages_dir = doc_dir / "solution_pages"
        solution_pages_dir.mkdir(parents=True, exist_ok=True)

        # PDF 열기
        pdf_document = fitz.open(pdf_path)
        total_pages = len(pdf_document)

        print(f"[해설 PDF] 변환 시작: {pdf_path.name} ({total_pages} 페이지)")

        image_paths = []

        # 각 페이지 처리
        for page_num in range(total_pages):
            # 페이지 로드
            page = pdf_document[page_num]

            # DPI에 따른 확대 비율 계산 (기본 72 DPI)
            zoom = dpi / 72.0
            mat = fitz.Matrix(zoom, zoom)

            # 페이지를 이미지로 렌더링
            pix = page.get_pixmap(matrix=mat)

            # 이미지 저장 경로
            image_filename = f"solution_page_{page_num:04d}.png"
            image_path = solution_pages_dir / image_filename

            # PNG로 저장
            pix.save(str(image_path))

            image_paths.append(image_path)

            print(f"  [해설] 페이지 {page_num + 1}/{total_pages} 변환 완료")

        # PDF 닫기
        pdf_document.close()

        print(f"[해설 PDF] 변환 완료: {len(image_paths)}개 이미지 생성")

        return image_paths

    def get_page_image(
        self,
        pdf_path: Path,
        page_index: int,
        dpi: int = 150
    ) -> np.ndarray:
        """
        특정 페이지를 numpy 배열로 반환

        Args:
            pdf_path: PDF 파일 경로
            page_index: 페이지 인덱스 (0부터 시작)
            dpi: 이미지 해상도

        Returns:
            페이지 이미지 (numpy array, RGB)
        """
        # PDF 열기
        pdf_document = fitz.open(pdf_path)

        if page_index >= len(pdf_document):
            raise ValueError(f"페이지 인덱스 {page_index}가 범위를 벗어났습니다. 총 페이지: {len(pdf_document)}")

        # 페이지 로드
        page = pdf_document[page_index]

        # DPI에 따른 확대 비율
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        # 이미지로 렌더링
        pix = page.get_pixmap(matrix=mat)

        # numpy 배열로 변환
        img_data = np.frombuffer(pix.samples, dtype=np.uint8)
        img_data = img_data.reshape(pix.height, pix.width, pix.n)

        # RGB로 변환 (RGBA인 경우)
        if pix.n == 4:
            img_data = img_data[:, :, :3]

        # PDF 닫기
        pdf_document.close()

        return img_data

    def get_page_count(self, pdf_path: Path) -> int:
        """
        PDF의 총 페이지 수 반환

        Args:
            pdf_path: PDF 파일 경로

        Returns:
            페이지 수
        """
        pdf_document = fitz.open(pdf_path)
        count = len(pdf_document)
        pdf_document.close()
        return count


# 직접 실행 시 테스트
if __name__ == "__main__":
    from config import Config

    config = Config.load()
    processor = PDFProcessor(config)

    # 테스트 PDF 경로
    test_pdf = config.RAW_PDFS_DIR / "test.pdf"

    if test_pdf.exists():
        print(f"테스트 PDF 발견: {test_pdf}")

        # 페이지 수 확인
        page_count = processor.get_page_count(test_pdf)
        print(f"총 페이지 수: {page_count}")

        # 이미지 변환
        images = processor.convert_pdf_to_images(
            test_pdf,
            "test_doc",
            dpi=150
        )
        print(f"\n생성된 이미지: {len(images)}개")
        for img_path in images[:3]:  # 처음 3개만 출력
            print(f"  - {img_path}")

        if len(images) > 3:
            print(f"  ... 외 {len(images) - 3}개")

    else:
        print(f"[!] 테스트 PDF가 없습니다: {test_pdf}")
        print(f"-> 테스트 PDF를 {test_pdf.parent}에 넣어주세요.")
        print("\n테스트를 건너뜁니다. (정상 동작)")
