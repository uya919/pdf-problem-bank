# Phase 14: 대용량 PDF 최적화 개발 계획

**Phase**: 14 (대용량 최적화)
**작성일**: 2025-11-26
**기반 문서**: `docs/24_large_pdf_optimization_research_report.md`

---

## 목차

1. [개요](#1-개요)
2. [Phase 14-1: 점진적 변환](#2-phase-14-1-점진적-변환)
3. [Phase 14-2: WebP 포맷 전환](#3-phase-14-2-webp-포맷-전환)
4. [Phase 14-3: 썸네일 시스템](#4-phase-14-3-썸네일-시스템)
5. [Phase 14-4: Prefetch 시스템](#5-phase-14-4-prefetch-시스템)
6. [테스트 계획](#6-테스트-계획)
7. [롤백 계획](#7-롤백-계획)

---

## 1. 개요

### 1.1 목표

| 목표 | 현재 | 목표치 | 측정 방법 |
|------|------|--------|-----------|
| 초기 응답 시간 | 60초 (400p) | 10초 | 업로드 → 첫 페이지 표시 |
| 저장 용량 | 100MB (400p) | 60MB | 디스크 사용량 |
| 페이지 로딩 | 257KB | 20KB (썸네일) | 네트워크 전송량 |

### 1.2 기술 스택 추가

```
현재:
- PyMuPDF (fitz): PDF → 이미지

추가:
- Pillow: WebP 변환, 썸네일 생성
```

### 1.3 영향 범위

| 구성 요소 | 변경 수준 | 파일 |
|-----------|-----------|------|
| PDF Processor | 대규모 | `src/pdf_processor.py` |
| PDF Pipeline | 중규모 | `src/pdf_pipeline.py` |
| Config | 소규모 | `backend/app/config.py`, `.env` |
| API Router | 중규모 | `backend/app/routers/pdf.py`, `blocks.py` |
| Frontend API | 소규모 | `frontend/src/api/client.ts` |
| PageCanvas | 소규모 | `frontend/src/components/PageCanvas.tsx` |

---

## 2. Phase 14-1: 점진적 변환

### 2.1 목표

**"400페이지 PDF 업로드 시 60초 → 10초 응답"**

### 2.2 설계

```
현재 흐름:
┌─────────────────────────────────────────────────────┐
│ PDF 업로드                                           │
│      ↓                                              │
│ [전체 400페이지 PNG 변환] ← 60초 블로킹              │
│      ↓                                              │
│ 첫 10페이지 블록 분석                                │
│      ↓                                              │
│ 응답 반환                                            │
└─────────────────────────────────────────────────────┘

개선 흐름:
┌─────────────────────────────────────────────────────┐
│ PDF 업로드                                           │
│      ↓                                              │
│ 메타데이터 추출 (페이지 수, 크기) ← 즉시 (1초)        │
│      ↓                                              │
│ [첫 10페이지만 이미지 변환] ← 5초                    │
│      ↓                                              │
│ 첫 10페이지 블록 분석 ← 5초                          │
│      ↓                                              │
│ 응답 반환 (총 10초)                                  │
│      ↓ (백그라운드)                                  │
│ 나머지 390페이지 순차 변환 + 분석                    │
└─────────────────────────────────────────────────────┘
```

### 2.3 파일 변경 상세

#### A. `src/pdf_processor.py` 수정

```python
# 기존 메서드 유지 + 새 메서드 추가

class PDFProcessor:
    """PDF 처리 클래스 (Phase 14-1: 점진적 변환 지원)"""

    def __init__(self, config: Config):
        self.config = config
        self._pdf_cache: Dict[str, fitz.Document] = {}  # PDF 캐시

    # ========== Phase 14-1: 새 메서드 ==========

    def get_pdf_metadata(self, pdf_path: Path) -> dict:
        """
        PDF 메타데이터만 빠르게 추출 (이미지 변환 없이)

        Returns:
            {
                "total_pages": int,
                "page_sizes": [(width, height), ...],  # 각 페이지 크기
                "file_size_mb": float
            }
        """
        pdf = fitz.open(pdf_path)
        total_pages = len(pdf)

        page_sizes = []
        for i in range(min(5, total_pages)):  # 처음 5페이지만 샘플링
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
        dpi: int = 150
    ) -> List[Path]:
        """
        특정 페이지 범위만 이미지로 변환

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            start_page: 시작 페이지 (0-based, inclusive)
            end_page: 끝 페이지 (exclusive)
            dpi: 해상도

        Returns:
            생성된 이미지 경로 리스트
        """
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
            image_path = pages_dir / f"page_{page_num:04d}.png"

            # 이미 존재하면 스킵
            if image_path.exists():
                image_paths.append(image_path)
                continue

            # 페이지 렌더링
            page = pdf[page_num]
            pix = page.get_pixmap(matrix=mat)
            pix.save(str(image_path))

            image_paths.append(image_path)
            print(f"  페이지 {page_num + 1}/{total_pages} 변환 완료")

        return image_paths

    def convert_single_page(
        self,
        pdf_path: Path,
        document_id: str,
        page_index: int,
        dpi: int = 150
    ) -> Path:
        """
        단일 페이지 On-Demand 변환

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            page_index: 페이지 인덱스 (0-based)
            dpi: 해상도

        Returns:
            생성된 이미지 경로
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
```

#### B. `src/pdf_pipeline.py` 수정

```python
class PDFPipeline:
    """PDF 처리 파이프라인 (Phase 14-1: 점진적 변환)"""

    def process_pdf_progressive(
        self,
        pdf_path: Path,
        document_id: Optional[str] = None,
        initial_pages: int = 10,
        dpi: int = 150,
        progress_callback: Optional[Callable] = None
    ) -> dict:
        """
        점진적 PDF 처리 (Phase 14-1)

        1단계: 메타데이터 추출 (즉시)
        2단계: 첫 N페이지 이미지 변환 + 블록 분석
        3단계: 나머지는 백그라운드에서 처리

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

        # 메타데이터 저장
        self._save_metadata(document_id, total_pages, pdf_path)

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
            "status": "processing" if remaining > 0 else "ready",
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

        with open(meta_path, 'r') as f:
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

        # 블록 분석
        analyzed = self._analyze_page_batch(
            document_id=document_id,
            image_paths=image_paths,
            start=start_page,
            end=end_page
        )

        # 메타데이터 업데이트
        meta["analyzed_pages"] = end_page
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)

        remaining = total_pages - end_page

        return {
            "processed_pages": analyzed,
            "remaining_pages": remaining,
            "status": "completed" if remaining == 0 else "processing"
        }

    def _save_metadata(self, document_id: str, total_pages: int, pdf_path: Path):
        """문서 메타데이터 저장"""
        import time

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
```

#### C. `backend/app/routers/pdf.py` 수정

```python
@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    PDF 업로드 및 점진적 처리 (Phase 14-1)

    1. 파일 저장
    2. 첫 10페이지 즉시 처리
    3. 나머지 백그라운드 처리
    """
    # ... 파일 저장 로직 ...

    # Phase 14-1: 점진적 처리
    result = pipeline.process_pdf_progressive(
        pdf_path=pdf_path,
        document_id=document_id,
        initial_pages=config.INITIAL_PAGES,
        dpi=config.DEFAULT_DPI
    )

    # 나머지 페이지 백그라운드 처리
    if result["remaining_pages"] > 0:
        task_id = task_queue.add_progressive_task(
            document_id=result["document_id"],
            pdf_path=str(pdf_path),
            start_page=result["converted_pages"],
            total_pages=result["total_pages"]
        )

        background_tasks.add_task(
            process_remaining_pages_background,
            task_id
        )

    return {
        "document_id": result["document_id"],
        "total_pages": result["total_pages"],
        "analyzed_pages": result["analyzed_pages"],
        "status": result["status"],
        "message": f"처리 완료: {result['analyzed_pages']}페이지 준비됨"
    }
```

#### D. `backend/app/routers/blocks.py` 수정 (On-Demand 변환)

```python
@router.get("/documents/{document_id}/pages/{page_index}/image")
async def get_page_image(document_id: str, page_index: int):
    """
    페이지 이미지 조회 (Phase 14-1: On-Demand 변환 지원)

    이미지가 없으면 실시간 변환 후 반환
    """
    doc_dir = config.get_document_dir(document_id)
    image_path = doc_dir / "pages" / f"page_{page_index:04d}.png"

    # 이미지가 없으면 On-Demand 변환
    if not image_path.exists():
        # 원본 PDF 경로 확인
        meta_path = doc_dir / "meta.json"
        if not meta_path.exists():
            raise HTTPException(404, "문서를 찾을 수 없습니다")

        with open(meta_path, 'r') as f:
            meta = json.load(f)

        pdf_path = Path(meta.get("pdf_path", ""))
        if not pdf_path.exists():
            raise HTTPException(404, "원본 PDF를 찾을 수 없습니다")

        # 실시간 변환
        pipeline = PDFPipeline(config)
        image_path = pipeline.pdf_processor.convert_single_page(
            pdf_path, document_id, page_index, config.DEFAULT_DPI
        )

        if not image_path or not image_path.exists():
            raise HTTPException(500, "이미지 변환 실패")

    return FileResponse(
        path=str(image_path),
        media_type="image/png"
    )
```

### 2.4 구현 순서

```
Step 1: pdf_processor.py 수정 (30분)
    - get_pdf_metadata() 추가
    - convert_page_range() 추가
    - convert_single_page() 추가
    - PDF 캐싱 로직 추가

Step 2: pdf_pipeline.py 수정 (30분)
    - process_pdf_progressive() 추가
    - process_next_batch_progressive() 추가
    - _save_metadata() 수정 (pdf_path 저장)

Step 3: pdf.py 라우터 수정 (20분)
    - upload_pdf 엔드포인트 수정
    - 백그라운드 태스크 연동

Step 4: blocks.py 라우터 수정 (20분)
    - get_page_image에 On-Demand 변환 추가

Step 5: 테스트 (20분)
    - 400페이지 PDF 업로드 테스트
    - 초기 응답 시간 측정
```

---

## 3. Phase 14-2: WebP 포맷 전환

### 3.1 목표

**"저장 용량 40% 감소 (100MB → 60MB)"**

### 3.2 설계

```
현재:
PDF → PNG (257KB/페이지)

개선:
PDF → WebP (154KB/페이지, quality=90)
     ↳ PNG 호환 옵션 유지 (설정으로 전환 가능)
```

### 3.3 파일 변경 상세

#### A. `.env` 추가

```env
# Phase 14-2: 이미지 포맷 설정
IMAGE_FORMAT=webp        # png | webp
WEBP_QUALITY=90          # 0-100 (90 권장)
```

#### B. `backend/app/config.py` 수정

```python
class Config:
    # ... 기존 설정 ...

    # Phase 14-2: 이미지 포맷 설정
    IMAGE_FORMAT: str = os.getenv("IMAGE_FORMAT", "webp")
    WEBP_QUALITY: int = int(os.getenv("WEBP_QUALITY", "90"))

    def get_image_extension(self) -> str:
        """이미지 확장자 반환"""
        return ".webp" if self.IMAGE_FORMAT == "webp" else ".png"
```

#### C. `src/pdf_processor.py` 수정

```python
from PIL import Image

class PDFProcessor:
    def convert_page_range(
        self,
        pdf_path: Path,
        document_id: str,
        start_page: int,
        end_page: int,
        dpi: int = 150,
        image_format: str = "webp",      # Phase 14-2
        webp_quality: int = 90           # Phase 14-2
    ) -> List[Path]:
        """페이지 범위 변환 (WebP 지원)"""
        doc_dir = self.config.get_document_dir(document_id)
        pages_dir = doc_dir / "pages"
        pages_dir.mkdir(parents=True, exist_ok=True)

        pdf = self._get_or_open_pdf(pdf_path)
        total_pages = len(pdf)

        start_page = max(0, start_page)
        end_page = min(end_page, total_pages)

        image_paths = []
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        # 확장자 결정
        ext = ".webp" if image_format == "webp" else ".png"

        for page_num in range(start_page, end_page):
            image_path = pages_dir / f"page_{page_num:04d}{ext}"

            if image_path.exists():
                image_paths.append(image_path)
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
```

#### D. `backend/app/routers/blocks.py` 수정

```python
@router.get("/documents/{document_id}/pages/{page_index}/image")
async def get_page_image(document_id: str, page_index: int):
    """페이지 이미지 조회 (Phase 14-2: WebP 우선)"""
    doc_dir = config.get_document_dir(document_id)
    pages_dir = doc_dir / "pages"

    # WebP 우선, PNG 폴백
    webp_path = pages_dir / f"page_{page_index:04d}.webp"
    png_path = pages_dir / f"page_{page_index:04d}.png"

    if webp_path.exists():
        return FileResponse(path=str(webp_path), media_type="image/webp")
    elif png_path.exists():
        return FileResponse(path=str(png_path), media_type="image/png")
    else:
        # On-Demand 변환 (14-1과 연동)
        # ...
```

### 3.4 기존 문서 마이그레이션 (선택)

```python
# 마이그레이션 스크립트 (필요시)
def migrate_png_to_webp(document_id: str, quality: int = 90):
    """기존 PNG를 WebP로 변환"""
    doc_dir = config.get_document_dir(document_id)
    pages_dir = doc_dir / "pages"

    for png_file in pages_dir.glob("page_*.png"):
        webp_file = png_file.with_suffix(".webp")

        if webp_file.exists():
            continue

        img = Image.open(png_file)
        img.save(str(webp_file), "WEBP", quality=quality)
        print(f"변환: {png_file.name} → {webp_file.name}")

        # 원본 PNG 삭제 (선택)
        # png_file.unlink()
```

### 3.5 구현 순서

```
Step 1: .env, config.py 수정 (10분)
    - IMAGE_FORMAT, WEBP_QUALITY 설정 추가

Step 2: pdf_processor.py 수정 (20분)
    - _save_as_webp() 메서드 추가
    - convert_page_range()에 포맷 옵션 추가

Step 3: blocks.py 수정 (10분)
    - get_page_image에 WebP 우선 로직 추가

Step 4: 테스트 (20분)
    - 새 문서 업로드 테스트
    - 용량 비교 측정
```

---

## 4. Phase 14-3: 썸네일 시스템

### 4.1 목표

**"페이지 목록에서 네트워크 사용량 92% 감소"**

### 4.2 설계

```
pages/
├── page_0000.webp          # 원본 (150 DPI, ~154 KB)
├── page_0000_thumb.webp    # 썸네일 (50 DPI, ~20 KB)
```

```
프론트엔드 로딩 전략:
1. 페이지 목록: 썸네일 사용
2. 라벨링 뷰: 원본 사용
3. 줌 아웃 시: 썸네일로 전환
```

### 4.3 파일 변경 상세

#### A. `.env` 추가

```env
# Phase 14-3: 썸네일 설정
THUMB_DPI=50              # 썸네일 해상도
THUMB_QUALITY=80          # 썸네일 품질
```

#### B. `src/pdf_processor.py` 추가

```python
class PDFProcessor:
    def create_thumbnail(
        self,
        source_path: Path,
        thumb_dpi: int = 50,
        thumb_quality: int = 80
    ) -> Path:
        """
        Phase 14-3: 썸네일 생성

        Args:
            source_path: 원본 이미지 경로
            thumb_dpi: 썸네일 DPI (기본 50, 원본의 1/3)
            thumb_quality: 썸네일 품질

        Returns:
            썸네일 경로
        """
        # 썸네일 경로 생성
        thumb_path = source_path.with_name(
            source_path.stem + "_thumb" + source_path.suffix
        )

        if thumb_path.exists():
            return thumb_path

        # 원본 로드
        img = Image.open(source_path)

        # 리사이즈 (1/3 크기)
        ratio = thumb_dpi / 150  # 원본 150 DPI 기준
        new_size = (int(img.width * ratio), int(img.height * ratio))
        thumb = img.resize(new_size, Image.LANCZOS)

        # 저장
        if source_path.suffix == ".webp":
            thumb.save(str(thumb_path), "WEBP", quality=thumb_quality)
        else:
            thumb.save(str(thumb_path))

        return thumb_path

    def create_thumbnails_batch(
        self,
        document_id: str,
        start_page: int = 0,
        end_page: int = None
    ) -> List[Path]:
        """배치 썸네일 생성"""
        doc_dir = self.config.get_document_dir(document_id)
        pages_dir = doc_dir / "pages"

        # 원본 이미지 목록
        originals = sorted(pages_dir.glob("page_*.webp"))
        # PNG 폴백
        if not originals:
            originals = sorted(pages_dir.glob("page_*.png"))

        # _thumb 제외
        originals = [p for p in originals if "_thumb" not in p.stem]

        if end_page is None:
            end_page = len(originals)

        thumb_paths = []
        for i, original in enumerate(originals[start_page:end_page], start_page):
            thumb = self.create_thumbnail(original)
            thumb_paths.append(thumb)
            print(f"  썸네일 {i + 1} 생성 완료")

        return thumb_paths
```

#### C. `backend/app/routers/blocks.py` 수정

```python
@router.get("/documents/{document_id}/pages/{page_index}/image")
async def get_page_image(
    document_id: str,
    page_index: int,
    quality: str = "full"  # Phase 14-3: full | thumb
):
    """
    페이지 이미지 조회

    Query Params:
        quality: "full" (원본) 또는 "thumb" (썸네일)
    """
    doc_dir = config.get_document_dir(document_id)
    pages_dir = doc_dir / "pages"

    # 파일명 결정
    suffix = "_thumb" if quality == "thumb" else ""

    # WebP 우선
    webp_path = pages_dir / f"page_{page_index:04d}{suffix}.webp"
    png_path = pages_dir / f"page_{page_index:04d}{suffix}.png"

    if webp_path.exists():
        return FileResponse(path=str(webp_path), media_type="image/webp")
    elif png_path.exists():
        return FileResponse(path=str(png_path), media_type="image/png")
    elif quality == "thumb":
        # 썸네일 없으면 원본 폴백
        return await get_page_image(document_id, page_index, "full")
    else:
        # On-Demand 변환
        raise HTTPException(404, "이미지를 찾을 수 없습니다")
```

#### D. `frontend/src/api/client.ts` 수정

```typescript
export const api = {
  // ...

  // Phase 14-3: 썸네일 지원
  getPageImageUrl: (
    documentId: string,
    pageIndex: number,
    quality: 'full' | 'thumb' = 'full'
  ): string => {
    return `${API_BASE_URL}/api/blocks/documents/${encodeURIComponent(documentId)}/pages/${pageIndex}/image?quality=${quality}`;
  },
};
```

#### E. `frontend/src/components/PageCanvas.tsx` 수정

```typescript
// Phase 14-3: 썸네일 + 원본 로딩 전략
useEffect(() => {
  // 1. 썸네일 먼저 로드 (빠른 표시)
  const thumbImg = new window.Image();
  thumbImg.crossOrigin = 'anonymous';
  thumbImg.src = api.getPageImageUrl(documentId, pageIndex, 'thumb');

  thumbImg.onload = () => {
    setImage(thumbImg);  // 썸네일로 먼저 표시

    // 2. 원본 로드 (백그라운드)
    const fullImg = new window.Image();
    fullImg.crossOrigin = 'anonymous';
    fullImg.src = api.getPageImageUrl(documentId, pageIndex, 'full');

    fullImg.onload = () => {
      setImage(fullImg);  // 원본으로 교체
    };
  };

  thumbImg.onerror = () => {
    // 썸네일 없으면 원본 직접 로드
    const fullImg = new window.Image();
    fullImg.crossOrigin = 'anonymous';
    fullImg.src = api.getPageImageUrl(documentId, pageIndex, 'full');
    fullImg.onload = () => setImage(fullImg);
  };
}, [documentId, pageIndex]);
```

### 4.4 구현 순서

```
Step 1: .env, config.py 수정 (5분)
    - THUMB_DPI, THUMB_QUALITY 설정

Step 2: pdf_processor.py 수정 (20분)
    - create_thumbnail() 추가
    - create_thumbnails_batch() 추가

Step 3: pdf_pipeline.py 수정 (10분)
    - 이미지 변환 후 썸네일 자동 생성

Step 4: blocks.py 수정 (15분)
    - quality 파라미터 추가

Step 5: client.ts 수정 (5분)
    - getPageImageUrl에 quality 옵션 추가

Step 6: PageCanvas.tsx 수정 (20분)
    - 썸네일 → 원본 로딩 전략 구현

Step 7: 테스트 (25분)
    - 네트워크 탭에서 이미지 로딩 확인
    - 용량 비교
```

---

## 5. Phase 14-4: Prefetch 시스템

### 5.1 목표

**"페이지 전환 시 대기 시간 제거"**

### 5.2 설계

```
사용자가 페이지 5를 볼 때:
  - 페이지 6, 7, 8, 9, 10 미리 변환 (앞 5페이지)
  - 페이지 4, 3 미리 변환 (뒤 2페이지)
```

### 5.3 파일 변경 상세

#### A. `frontend/src/hooks/usePrefetch.ts` (새 파일)

```typescript
import { useEffect, useRef } from 'react';
import { api } from '../api/client';

interface UsePrefetchOptions {
  documentId: string;
  currentPage: number;
  totalPages: number;
  prefetchAhead?: number;  // 앞으로 몇 페이지
  prefetchBehind?: number; // 뒤로 몇 페이지
}

export function usePrefetch({
  documentId,
  currentPage,
  totalPages,
  prefetchAhead = 5,
  prefetchBehind = 2,
}: UsePrefetchOptions) {
  const prefetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const pagesToPrefetch: number[] = [];

    // 앞 페이지
    for (let i = 1; i <= prefetchAhead; i++) {
      const page = currentPage + i;
      if (page < totalPages && !prefetchedRef.current.has(page)) {
        pagesToPrefetch.push(page);
      }
    }

    // 뒤 페이지
    for (let i = 1; i <= prefetchBehind; i++) {
      const page = currentPage - i;
      if (page >= 0 && !prefetchedRef.current.has(page)) {
        pagesToPrefetch.push(page);
      }
    }

    // Prefetch 실행
    pagesToPrefetch.forEach((page) => {
      const img = new Image();
      img.src = api.getPageImageUrl(documentId, page, 'full');
      prefetchedRef.current.add(page);
    });

    // 썸네일도 prefetch
    pagesToPrefetch.forEach((page) => {
      const img = new Image();
      img.src = api.getPageImageUrl(documentId, page, 'thumb');
    });

  }, [documentId, currentPage, totalPages, prefetchAhead, prefetchBehind]);

  return {
    prefetchedCount: prefetchedRef.current.size,
  };
}
```

#### B. `frontend/src/pages/LabelingPage.tsx` 수정

```typescript
import { usePrefetch } from '../hooks/usePrefetch';

function LabelingPage() {
  // ...

  // Phase 14-4: Prefetch
  usePrefetch({
    documentId,
    currentPage: currentPageIndex,
    totalPages: document?.total_pages || 0,
    prefetchAhead: 5,
    prefetchBehind: 2,
  });

  // ...
}
```

#### C. 백엔드 Prefetch API (선택)

```python
@router.post("/documents/{document_id}/prefetch")
async def prefetch_pages(
    document_id: str,
    pages: List[int],
    background_tasks: BackgroundTasks
):
    """
    Phase 14-4: 특정 페이지들 미리 변환 요청

    프론트엔드에서 사용자 행동 예측 시 호출
    """
    background_tasks.add_task(
        convert_pages_background,
        document_id,
        pages
    )

    return {"message": f"{len(pages)}페이지 변환 시작됨"}
```

### 5.4 구현 순서

```
Step 1: usePrefetch.ts 생성 (20분)
    - 훅 구현
    - 중복 prefetch 방지 로직

Step 2: LabelingPage.tsx 수정 (10분)
    - usePrefetch 적용

Step 3: (선택) prefetch API 추가 (20분)
    - 백엔드 엔드포인트 추가

Step 4: 테스트 (10분)
    - 네트워크 탭에서 prefetch 확인
```

---

## 6. 테스트 계획

### 6.1 성능 테스트 시나리오

| 시나리오 | 테스트 방법 | 측정 지표 |
|----------|-------------|-----------|
| 초기 응답 시간 | 400페이지 PDF 업로드 | 첫 페이지 표시까지 시간 |
| 저장 용량 | 100페이지 문서 비교 | PNG vs WebP 용량 |
| 네트워크 사용량 | 10페이지 탐색 | 전송된 총 바이트 |
| 페이지 전환 속도 | 페이지 1→2→3 이동 | 각 전환 시 대기 시간 |

### 6.2 테스트 PDF

```
테스트 파일:
1. 쎈B 2-2.pdf (144페이지) - 중간 크기
2. 바이블 2-2.pdf (168페이지) - 중간 크기
3. 대용량 테스트용 (400페이지) - 생성 필요
```

### 6.3 측정 스크립트

```python
# tests/performance_test.py
import time
import requests

def test_upload_response_time(pdf_path: str):
    """업로드 응답 시간 측정"""
    with open(pdf_path, 'rb') as f:
        start = time.time()
        response = requests.post(
            'http://localhost:8000/api/pdf/upload',
            files={'file': f}
        )
        end = time.time()

    print(f"응답 시간: {end - start:.2f}초")
    print(f"결과: {response.json()}")
```

---

## 7. 롤백 계획

### 7.1 Phase별 롤백

| Phase | 롤백 방법 |
|-------|-----------|
| 14-1 | `process_pdf_lazy()` 복원 |
| 14-2 | `IMAGE_FORMAT=png` 설정 변경 |
| 14-3 | `quality=full` 고정 |
| 14-4 | `usePrefetch` 훅 제거 |

### 7.2 데이터 호환성

```
호환성 보장:
- PNG ↔ WebP 동시 지원 (WebP 우선, PNG 폴백)
- 기존 문서는 그대로 작동
- 신규 문서만 새 포맷 적용
```

---

## 8. 일정 요약

| Phase | 작업 | 예상 시간 | 누적 |
|-------|------|-----------|------|
| 14-1 | 점진적 변환 | 2시간 | 2시간 |
| 14-2 | WebP 전환 | 1시간 | 3시간 |
| 14-3 | 썸네일 시스템 | 2시간 | 5시간 |
| 14-4 | Prefetch | 1시간 | 6시간 |
| - | 테스트 및 디버깅 | 1시간 | **7시간** |

---

**승인 후 Phase 14-1부터 구현을 시작하겠습니다.**

---

*Phase 14 대용량 PDF 최적화 개발 계획 끝*
