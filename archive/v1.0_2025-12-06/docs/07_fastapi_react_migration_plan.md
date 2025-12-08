# FastAPI + React 전환 상세 구현 계획 (Lazy Loading 적용)

## 📋 Executive Summary

### 목표
현재 PySide6 기반 데스크톱 앱을 **FastAPI (백엔드) + React (프론트엔드) 웹 애플리케이션**으로 전환하여:
- 여러 사용자가 동시에 접근 가능한 웹 기반 시스템 구축
- 현대적인 UX/UI 제공
- 확장성 및 유지보수성 향상

### 핵심 전략: 10페이지 Lazy Loading
**게임 체인저**: 전체 문서를 한 번에 분석하지 않고, 10페이지씩 배치로 처리

#### 성능 개선 효과
- **초기 로딩 시간**: 60초 → 3초 (95% 감소)
- **렌더링 블록 수**: 281,582개 → ~1,066개 (99% 감소)
- **캔버스 렌더링**: Pixi.js(WebGL) 불필요 → react-konva로 충분

#### 사용자 경험
1. PDF 업로드 → 첫 10페이지만 분석 (3초 대기)
2. 즉시 작업 시작 가능
3. 사용자가 11페이지 이동 시 → 백그라운드에서 다음 10페이지 분석
4. 완전 무중단 워크플로우

### 전체 일정
- **단계 0**: 즉시 적용 가능한 PySide6 최적화 (1-2주)
- **단계 1-5**: FastAPI + React 전환 (8-10주)

**총 예상 소요**: 10-12주

---

## 🚀 단계 0: PySide6 Lazy Loading 즉시 최적화 (1-2주)

### 목표
FastAPI 전환 전에 현재 PySide6 앱에 lazy loading을 적용하여 즉각적인 성능 개선

### 0.1 PDF Pipeline 수정 (3일)

#### 작업 내용

**파일: `src/pdf_pipeline.py` (수정)**

```python
from pathlib import Path
from typing import List, Optional, Callable
from PySide6.QtCore import QThread, Signal

class PDFPipeline:
    """PDF 처리 파이프라인 (Lazy Loading 적용)"""

    def process_pdf_lazy(
        self,
        pdf_path: Path,
        document_id: str,
        initial_pages: int = 10,
        batch_size: int = 10,
        progress_callback: Optional[Callable] = None
    ) -> dict:
        """
        Lazy Loading PDF 처리

        단계:
        1. PDF 전체를 이미지로만 변환 (빠름 - 약 30초)
        2. 처음 10페이지만 블록 분석 (약 3초)
        3. 나머지는 on-demand 분석

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            initial_pages: 초기 분석 페이지 수 (기본 10)
            batch_size: 배치 크기 (기본 10)
            progress_callback: 진행률 콜백

        Returns:
            {
                "total_pages": 전체 페이지 수,
                "analyzed_pages": 분석 완료 페이지 수,
                "image_paths": 이미지 경로 리스트
            }
        """
        print(f"\n[PDFPipeline] Lazy Loading 모드로 PDF 처리 시작")
        print(f"  문서 ID: {document_id}")
        print(f"  초기 분석: {initial_pages}페이지")

        # 1단계: PDF → 이미지 변환 (전체)
        if progress_callback:
            progress_callback(0, "PDF를 이미지로 변환 중...")

        image_paths = self.convert_pdf_to_images(
            pdf_path, document_id, progress_callback
        )

        total_pages = len(image_paths)
        print(f"[PDFPipeline] 이미지 변환 완료: {total_pages}페이지")

        # 2단계: 첫 N페이지만 블록 분석
        if progress_callback:
            progress_callback(30, f"첫 {initial_pages}페이지 분석 중...")

        analyze_end = min(initial_pages, total_pages)
        self._analyze_page_batch(
            document_id,
            image_paths,
            start=0,
            end=analyze_end,
            progress_callback=progress_callback
        )

        if progress_callback:
            progress_callback(100, "초기 분석 완료!")

        print(f"[PDFPipeline] 초기 분석 완료: {analyze_end}/{total_pages}페이지")

        return {
            "total_pages": total_pages,
            "analyzed_pages": analyze_end,
            "image_paths": [str(p) for p in image_paths]
        }

    def _analyze_page_batch(
        self,
        document_id: str,
        image_paths: List[Path],
        start: int,
        end: int,
        progress_callback: Optional[Callable] = None
    ):
        """
        페이지 배치 분석 (내부 헬퍼)

        Args:
            document_id: 문서 ID
            image_paths: 전체 이미지 경로 리스트
            start: 시작 인덱스 (inclusive)
            end: 끝 인덱스 (exclusive)
            progress_callback: 진행률 콜백
        """
        for i in range(start, end):
            if i >= len(image_paths):
                break

            page_path = image_paths[i]

            if progress_callback:
                progress = 30 + int(70 * (i - start) / (end - start))
                progress_callback(progress, f"페이지 {i+1} 분석 중...")

            # 블록 검출
            page_data = self.analyzer.analyze_page(
                page_path,
                document_id,
                i
            )

            # blocks JSON 저장
            self._save_blocks_json(document_id, i, page_data)

        print(f"[PDFPipeline] 배치 분석 완료: {start+1}~{end}페이지")

    def analyze_next_batch(
        self,
        document_id: str,
        start_page: int,
        batch_size: int = 10,
        progress_callback: Optional[Callable] = None
    ):
        """
        다음 배치 분석 (백그라운드에서 호출)

        Args:
            document_id: 문서 ID
            start_page: 시작 페이지 인덱스 (0-based)
            batch_size: 배치 크기 (기본 10)
            progress_callback: 진행률 콜백
        """
        pages_dir = self.config.DOCUMENTS_DIR / document_id / "pages"
        image_paths = sorted(pages_dir.glob("page_*.png"))

        end_page = min(start_page + batch_size, len(image_paths))

        if start_page >= len(image_paths):
            print(f"[PDFPipeline] 이미 모든 페이지 분석 완료")
            return

        print(f"[PDFPipeline] 다음 배치 분석: {start_page+1}~{end_page}페이지")

        self._analyze_page_batch(
            document_id,
            image_paths,
            start_page,
            end_page,
            progress_callback
        )

    def _save_blocks_json(self, document_id: str, page_index: int, page_data: dict):
        """블록 JSON 저장"""
        blocks_dir = self.config.DOCUMENTS_DIR / document_id / "blocks"
        blocks_dir.mkdir(parents=True, exist_ok=True)

        blocks_path = blocks_dir / f"page_{page_index:04d}_blocks.json"

        import json
        with open(blocks_path, 'w', encoding='utf-8') as f:
            json.dump(page_data, f, ensure_ascii=False, indent=2)
```

### 0.2 백그라운드 분석 스레드 (3일)

**파일: `src/gui/background_analyzer.py` (신규)**

```python
"""
백그라운드 PDF 분석 스레드 (Phase 0.2)
"""
from PySide6.QtCore import QThread, Signal
from pathlib import Path
from typing import Optional

import sys
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
        self.pipeline = PDFPipeline()

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

    def stop(self):
        """스레드 중지 요청"""
        self._stop_requested = True

    def run(self):
        """스레드 실행"""
        if not self.document_id:
            self.error.emit("문서 ID가 설정되지 않았습니다")
            return

        try:
            # 현재 페이지 기준으로 다음 배치 계산
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

                self.pipeline.analyze_next_batch(
                    self.document_id,
                    next_batch_start,
                    self.batch_size
                )

                self.batch_completed.emit(next_batch_start, batch_end)

                next_batch_start += self.batch_size

            if not self._stop_requested:
                self.all_completed.emit()
                print(f"[BackgroundAnalyzer] 모든 페이지 분석 완료")

        except Exception as e:
            self.error.emit(f"백그라운드 분석 실패: {str(e)}")

    def _is_batch_analyzed(self, start_page: int) -> bool:
        """배치가 이미 분석되었는지 확인"""
        blocks_dir = self.config.DOCUMENTS_DIR / self.document_id / "blocks"

        if not blocks_dir.exists():
            return False

        # 배치의 첫 페이지 blocks JSON이 존재하는지 확인
        first_page_blocks = blocks_dir / f"page_{start_page:04d}_blocks.json"
        return first_page_blocks.exists()
```

### 0.3 메인 윈도우 통합 (2일)

**파일: `src/gui/main_window.py` (수정)**

```python
# 기존 import에 추가
from gui.background_analyzer import BackgroundAnalyzer

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        # ... 기존 코드 ...

        # 백그라운드 분석 스레드
        self.background_analyzer = BackgroundAnalyzer()
        self.background_analyzer.batch_completed.connect(self.on_batch_analyzed)
        self.background_analyzer.all_completed.connect(self.on_all_analyzed)
        self.background_analyzer.progress.connect(self.on_background_progress)
        self.background_analyzer.error.connect(self.on_background_error)

    def on_open_pdf(self):
        """PDF 열기 (Lazy Loading 적용)"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "PDF 파일 열기", "", "PDF Files (*.pdf)"
        )

        if not file_path:
            return

        pdf_path = Path(file_path)
        document_id = pdf_path.stem

        # 진행 다이얼로그
        progress_dialog = QProgressDialog(
            "PDF 처리 중...",
            "취소",
            0, 100,
            self
        )
        progress_dialog.setWindowTitle("PDF 로딩")
        progress_dialog.setWindowModality(Qt.WindowModal)
        progress_dialog.show()

        def update_progress(value, message):
            progress_dialog.setValue(value)
            progress_dialog.setLabelText(message)
            QApplication.processEvents()

        # Lazy Loading 처리
        result = self.pipeline.process_pdf_lazy(
            pdf_path,
            document_id,
            initial_pages=10,
            progress_callback=update_progress
        )

        progress_dialog.close()

        # 문서 정보 저장
        self.current_document = document_id
        self.total_pages = result["total_pages"]
        self.analyzed_pages = result["analyzed_pages"]

        # 첫 페이지 로드
        self.load_page(0)

        # 백그라운드 분석 시작
        self.background_analyzer.set_document(
            document_id,
            current_page=0,
            total_pages=self.total_pages
        )
        self.background_analyzer.start()

        # 상태바 업데이트
        self.statusBar().showMessage(
            f"문서 로드 완료: {self.analyzed_pages}/{self.total_pages}페이지 분석됨 (나머지는 백그라운드 처리 중)"
        )

    def on_page_changed(self, page_index: int):
        """페이지 변경 시"""
        # 기존 페이지 로드 로직
        self.load_page(page_index)

        # 백그라운드 분석 업데이트
        if self.background_analyzer.isRunning():
            self.background_analyzer.current_page = page_index

    def on_batch_analyzed(self, start_page: int, end_page: int):
        """배치 분석 완료"""
        print(f"[MainWindow] 배치 분석 완료: {start_page+1}~{end_page}페이지")
        self.analyzed_pages = end_page

        # 상태바 업데이트
        self.statusBar().showMessage(
            f"분석 진행: {self.analyzed_pages}/{self.total_pages}페이지 완료"
        )

    def on_all_analyzed(self):
        """모든 페이지 분석 완료"""
        print(f"[MainWindow] 모든 페이지 분석 완료!")
        self.statusBar().showMessage(f"분석 완료: {self.total_pages}페이지")

    def on_background_progress(self, current: int, total: int, message: str):
        """백그라운드 진행률"""
        self.statusBar().showMessage(message)

    def on_background_error(self, error_message: str):
        """백그라운드 에러"""
        QMessageBox.warning(self, "백그라운드 분석 오류", error_message)

    def closeEvent(self, event):
        """윈도우 종료 시"""
        # 백그라운드 스레드 중지
        if self.background_analyzer.isRunning():
            self.background_analyzer.stop()
            self.background_analyzer.wait(3000)  # 최대 3초 대기

        event.accept()
```

### 0.4 검증 기준

- [ ] PDF 업로드 시 3초 이내에 첫 10페이지 표시
- [ ] 즉시 라벨링 작업 가능
- [ ] 11페이지 이동 시 자동으로 다음 배치 분석 시작
- [ ] 상태바에 분석 진행률 표시
- [ ] 백그라운드 분석 중에도 UI 반응성 유지

### 0.5 예상 효과

**Before (전체 분석)**
- 264페이지 문서 로딩: ~60초 대기
- 사용자는 1분 동안 아무것도 할 수 없음

**After (Lazy Loading)**
- 초기 로딩: ~3초
- 즉시 작업 시작
- 나머지 페이지는 사용자가 작업하는 동안 백그라운드에서 완료

**투자 대비 효과**: ⭐⭐⭐⭐⭐ (1-2주 투자로 즉각적인 UX 개선)

---

## 🌐 단계 1: FastAPI Backend Infrastructure (1-2주)

### 목표
- FastAPI 프로젝트 구조 생성
- Lazy Loading PDF 업로드 API 구현
- 백그라운드 태스크 큐 설정
- 블록 데이터 on-demand API

### 1.1 프로젝트 구조

```
pdf-labeling-web/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI 앱
│   │   ├── config.py                # 설정
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── block.py             # Block, Column 모델
│   │   │   ├── group.py             # ProblemGroup 모델
│   │   │   ├── metadata.py          # ProblemMetadata 모델
│   │   │   └── solution.py          # SolutionInfo 모델
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── pdf.py               # PDF 업로드/처리
│   │   │   ├── blocks.py            # 블록 조회
│   │   │   ├── groups.py            # 그룹 생성/수정
│   │   │   └── export.py            # 내보내기
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── pdf_processor.py     # PDF 처리 (PySide6 코드 재활용)
│   │   │   ├── density_analyzer.py  # 블록 검출
│   │   │   └── task_queue.py        # 백그라운드 태스크
│   │   └── db/
│   │       ├── __init__.py
│   │       └── session.py           # (선택) SQLite/PostgreSQL
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── dataset_root/                    # 기존과 동일
    ├── documents/
    ├── raw_pdfs/
    └── ...
```

### 1.2 FastAPI 기본 설정

**파일: `backend/app/main.py`**

```python
"""
FastAPI 메인 앱
"""
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import uuid
from typing import Optional

from app.routers import pdf, blocks, groups, export
from app.config import Config

# 앱 생성
app = FastAPI(
    title="PDF Problem Labeling API",
    version="1.0.0",
    description="교육용 수학 문제 라벨링 API"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(pdf.router, prefix="/api/pdf", tags=["PDF"])
app.include_router(blocks.router, prefix="/api/blocks", tags=["Blocks"])
app.include_router(groups.router, prefix="/api/groups", tags=["Groups"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])

# 정적 파일 (이미지) 서빙
config = Config.load()
app.mount("/images", StaticFiles(directory=config.DOCUMENTS_DIR), name="images")

@app.get("/")
async def root():
    return {"message": "PDF Labeling API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 1.3 PDF 업로드 API (Lazy Loading)

**파일: `backend/app/routers/pdf.py`**

```python
"""
PDF 업로드 및 처리 API
"""
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from pydantic import BaseModel
from pathlib import Path
import uuid
import shutil
from typing import Optional

from app.services.pdf_processor import PDFProcessor
from app.services.task_queue import TaskQueue
from app.config import Config

router = APIRouter()
config = Config.load()
pdf_processor = PDFProcessor()
task_queue = TaskQueue()


class UploadResponse(BaseModel):
    task_id: str
    document_id: str
    total_pages: int
    analyzed_pages: int
    status: str


class TaskStatus(BaseModel):
    task_id: str
    status: str  # "processing", "completed", "failed"
    progress: int  # 0-100
    message: str
    document_id: Optional[str] = None
    total_pages: Optional[int] = None
    analyzed_pages: Optional[int] = None


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    PDF 업로드 및 Lazy Loading 처리

    워크플로우:
    1. PDF 파일 저장
    2. 전체를 이미지로 변환
    3. 첫 10페이지만 블록 분석
    4. 나머지는 백그라운드 태스크에서 처리

    Returns:
        task_id: 태스크 ID (상태 조회용)
        document_id: 문서 ID
        total_pages: 전체 페이지 수
        analyzed_pages: 분석 완료된 페이지 수 (초기 10)
    """
    # 파일 검증
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다")

    # 태스크 ID 생성
    task_id = str(uuid.uuid4())
    document_id = Path(file.filename).stem

    # PDF 저장
    raw_pdfs_dir = config.DATASET_ROOT / "raw_pdfs"
    raw_pdfs_dir.mkdir(parents=True, exist_ok=True)

    pdf_path = raw_pdfs_dir / file.filename

    with pdf_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    print(f"[PDF Upload] 파일 저장: {pdf_path}")

    # 1단계: 이미지 변환 (동기 - 빠름)
    image_paths = await pdf_processor.convert_to_images(pdf_path, document_id)
    total_pages = len(image_paths)

    print(f"[PDF Upload] 이미지 변환 완료: {total_pages}페이지")

    # 2단계: 첫 10페이지 분석 (동기)
    analyzed_pages = await pdf_processor.analyze_initial_batch(
        document_id,
        image_paths,
        batch_size=10
    )

    print(f"[PDF Upload] 초기 분석 완료: {analyzed_pages}페이지")

    # 3단계: 나머지 페이지 백그라운드 분석 (비동기)
    if total_pages > analyzed_pages:
        background_tasks.add_task(
            pdf_processor.analyze_remaining_pages,
            task_id,
            document_id,
            image_paths,
            start_page=analyzed_pages
        )

        task_queue.create_task(
            task_id,
            document_id,
            total_pages,
            analyzed_pages
        )

    return UploadResponse(
        task_id=task_id,
        document_id=document_id,
        total_pages=total_pages,
        analyzed_pages=analyzed_pages,
        status="processing" if total_pages > analyzed_pages else "completed"
    )


@router.get("/task/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    """
    태스크 상태 조회

    Args:
        task_id: 태스크 ID

    Returns:
        TaskStatus
    """
    status = task_queue.get_status(task_id)

    if not status:
        raise HTTPException(status_code=404, detail="태스크를 찾을 수 없습니다")

    return TaskStatus(**status)


@router.get("/documents")
async def list_documents():
    """
    문서 목록 조회

    Returns:
        List[{id, total_pages, analyzed_pages, created_at}]
    """
    documents_dir = config.DOCUMENTS_DIR

    if not documents_dir.exists():
        return []

    documents = []

    for doc_folder in documents_dir.iterdir():
        if not doc_folder.is_dir():
            continue

        doc_id = doc_folder.name

        # 페이지 수 확인
        pages_dir = doc_folder / "pages"
        total_pages = len(list(pages_dir.glob("page_*.png"))) if pages_dir.exists() else 0

        # 분석된 페이지 수
        blocks_dir = doc_folder / "blocks"
        analyzed_pages = len(list(blocks_dir.glob("page_*_blocks.json"))) if blocks_dir.exists() else 0

        documents.append({
            "id": doc_id,
            "total_pages": total_pages,
            "analyzed_pages": analyzed_pages,
            "created_at": doc_folder.stat().st_ctime
        })

    return sorted(documents, key=lambda x: x["created_at"], reverse=True)
```

### 1.4 블록 조회 API (On-Demand)

**파일: `backend/app/routers/blocks.py`**

```python
"""
블록 데이터 조회 API
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
from typing import Optional

from app.services.pdf_processor import PDFProcessor
from app.config import Config

router = APIRouter()
config = Config.load()
pdf_processor = PDFProcessor()


@router.get("/{document_id}/{page_index}")
async def get_page_blocks(document_id: str, page_index: int):
    """
    페이지 블록 데이터 조회 (On-Demand 분석)

    워크플로우:
    1. blocks JSON 파일 존재 확인
    2. 없으면 → 즉시 분석 후 반환
    3. 있으면 → 파일 내용 반환

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)

    Returns:
        blocks JSON 데이터
    """
    blocks_path = config.DOCUMENTS_DIR / document_id / "blocks" / f"page_{page_index:04d}_blocks.json"

    # 이미 분석된 경우
    if blocks_path.exists():
        return FileResponse(blocks_path, media_type="application/json")

    # 분석되지 않은 경우 → On-Demand 분석
    print(f"[Blocks API] On-demand 분석: {document_id} 페이지 {page_index}")

    try:
        blocks_data = await pdf_processor.analyze_page_on_demand(
            document_id,
            page_index
        )

        return JSONResponse(content=blocks_data)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"페이지 분석 실패: {str(e)}"
        )


@router.get("/{document_id}/{page_index}/image")
async def get_page_image(document_id: str, page_index: int):
    """
    페이지 이미지 조회

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스 (0-based)

    Returns:
        PNG 이미지 파일
    """
    image_path = config.DOCUMENTS_DIR / document_id / "pages" / f"page_{page_index:04d}.png"

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="이미지 파일을 찾을 수 없습니다")

    return FileResponse(image_path, media_type="image/png")
```

### 1.5 백그라운드 태스크 큐

**파일: `backend/app/services/task_queue.py`**

```python
"""
백그라운드 태스크 큐 관리
"""
from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Task:
    """태스크 정보"""
    task_id: str
    document_id: str
    total_pages: int
    analyzed_pages: int
    status: str = "processing"  # "processing", "completed", "failed"
    progress: int = 0  # 0-100
    message: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    error: Optional[str] = None


class TaskQueue:
    """
    태스크 큐 (메모리 기반)

    Note: 프로덕션에서는 Redis/Celery 사용 권장
    """

    def __init__(self):
        self.tasks: Dict[str, Task] = {}

    def create_task(
        self,
        task_id: str,
        document_id: str,
        total_pages: int,
        analyzed_pages: int
    ):
        """태스크 생성"""
        self.tasks[task_id] = Task(
            task_id=task_id,
            document_id=document_id,
            total_pages=total_pages,
            analyzed_pages=analyzed_pages,
            progress=int(analyzed_pages / total_pages * 100)
        )

    def update_progress(
        self,
        task_id: str,
        analyzed_pages: int,
        message: str = ""
    ):
        """진행률 업데이트"""
        if task_id not in self.tasks:
            return

        task = self.tasks[task_id]
        task.analyzed_pages = analyzed_pages
        task.progress = int(analyzed_pages / task.total_pages * 100)
        task.message = message
        task.updated_at = datetime.now()

    def complete_task(self, task_id: str):
        """태스크 완료"""
        if task_id not in self.tasks:
            return

        task = self.tasks[task_id]
        task.status = "completed"
        task.progress = 100
        task.message = "분석 완료"
        task.updated_at = datetime.now()

    def fail_task(self, task_id: str, error: str):
        """태스크 실패"""
        if task_id not in self.tasks:
            return

        task = self.tasks[task_id]
        task.status = "failed"
        task.error = error
        task.message = f"오류 발생: {error}"
        task.updated_at = datetime.now()

    def get_status(self, task_id: str) -> Optional[dict]:
        """태스크 상태 조회"""
        if task_id not in self.tasks:
            return None

        task = self.tasks[task_id]

        return {
            "task_id": task.task_id,
            "status": task.status,
            "progress": task.progress,
            "message": task.message,
            "document_id": task.document_id,
            "total_pages": task.total_pages,
            "analyzed_pages": task.analyzed_pages
        }
```

### 1.6 검증 기준

- [ ] FastAPI 서버 정상 실행 (`uvicorn app.main:app --reload`)
- [ ] PDF 업로드 → 3초 이내에 응답 반환
- [ ] `/api/pdf/task/{task_id}` 엔드포인트로 진행률 조회 가능
- [ ] `/api/blocks/{doc_id}/{page}` 호출 시 on-demand 분석 작동
- [ ] CORS 설정으로 프론트엔드에서 API 호출 가능

---

## 🎨 단계 2: React Frontend Foundation (2-3주)

### 목표
- Vite + React + TypeScript + Tailwind CSS 프로젝트 생성
- API 클라이언트 (React Query) 설정
- 기본 라우팅 및 레이아웃
- PDF 업로드 UI

### 2.1 프로젝트 생성

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install @tanstack/react-query axios react-router-dom
npm install react-konva konva @types/react-konva
```

### 2.2 Tailwind CSS 설정

**파일: `frontend/tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B64DA',
          hover: '#1557C3',
          light: '#E8F1FC',
          dark: '#0F3D7A',
        },
        neutral: {
          background: '#F5F5F7',
          surface: '#FFFFFF',
          border: '#DFE1E6',
        },
        semantic: {
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#E54949',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Pretendard', 'Noto Sans KR', 'Malgun Gothic', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### 2.3 API 클라이언트

**파일: `frontend/src/services/api.ts`**

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// PDF 업로드
export const uploadPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/api/pdf/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

// 태스크 상태 조회
export const getTaskStatus = async (taskId: string) => {
  const { data } = await apiClient.get(`/api/pdf/task/${taskId}`);
  return data;
};

// 문서 목록
export const getDocuments = async () => {
  const { data } = await apiClient.get('/api/pdf/documents');
  return data;
};

// 페이지 블록 조회
export const getPageBlocks = async (documentId: string, pageIndex: number) => {
  const { data } = await apiClient.get(`/api/blocks/${documentId}/${pageIndex}`);
  return data;
};

// 페이지 이미지 URL
export const getPageImageURL = (documentId: string, pageIndex: number) => {
  return `${API_BASE_URL}/api/blocks/${documentId}/${pageIndex}/image`;
};
```

### 2.4 React Query 설정

**파일: `frontend/src/App.tsx`**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LabelingMode from './pages/LabelingMode';
import UploadPage from './pages/UploadPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/labeling/:documentId" element={<LabelingMode />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
```

### 2.5 PDF 업로드 페이지

**파일: `frontend/src/pages/UploadPage.tsx`**

```typescript
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { uploadPDF, getTaskStatus, getDocuments } from '../services/api';

export default function UploadPage() {
  const navigate = useNavigate();
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);

  // 문서 목록
  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  });

  // PDF 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: uploadPDF,
    onSuccess: (data) => {
      console.log('Upload success:', data);
      setUploadTaskId(data.task_id);

      // 초기 분석 완료되면 즉시 이동
      if (data.analyzed_pages >= 10) {
        navigate(`/labeling/${data.document_id}`);
      }
    },
  });

  // 태스크 상태 폴링 (업로드 중일 때만)
  useQuery({
    queryKey: ['taskStatus', uploadTaskId],
    queryFn: () => getTaskStatus(uploadTaskId!),
    enabled: !!uploadTaskId,
    refetchInterval: 2000, // 2초마다 상태 확인
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-background">
      {/* App Bar */}
      <div className="bg-white border-b border-neutral-border px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          📚 문제 라벨링 도구
        </h1>
      </div>

      <div className="max-w-4xl mx-auto py-12 px-6">
        {/* Upload Section */}
        <div className="bg-white rounded-lg border border-neutral-border p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">PDF 업로드</h2>

          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
              </p>
              <p className="text-xs text-gray-400">PDF 파일만 가능</p>
            </div>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadMutation.isPending}
            />
          </label>

          {uploadMutation.isPending && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">업로드 중...</span>
                <span className="text-sm text-gray-600">초기 분석 진행 중</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="bg-white rounded-lg border border-neutral-border p-6">
          <h2 className="text-xl font-semibold mb-4">최근 문서</h2>

          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc: any) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/labeling/${doc.id}`)}
                  className="w-full flex items-center justify-between p-4 border border-neutral-border rounded-lg hover:border-primary hover:bg-primary-light transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                      📄
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{doc.id}</p>
                      <p className="text-sm text-gray-500">
                        {doc.analyzed_pages}/{doc.total_pages} 페이지 분석됨
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">아직 업로드된 문서가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2.6 검증 기준

- [ ] Vite 개발 서버 정상 실행 (`npm run dev`)
- [ ] Tailwind CSS 스타일 적용
- [ ] PDF 업로드 UI 표시
- [ ] 파일 선택 → API 호출 → 응답 확인
- [ ] React Query devtools로 쿼리 상태 확인

---

## 🎯 단계 3: Labeling Mode - Canvas & Interaction (3-4주)

### 목표
- react-konva 기반 캔버스 컴포넌트
- 페이지 이미지 + 블록 박스 렌더링
- 블록 선택/그룹 생성 인터랙션
- Lazy Loading 프리페칭

### 3.1 Canvas 컴포넌트

**파일: `frontend/src/components/Canvas.tsx`**

```typescript
import { useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';

interface Block {
  block_id: number;
  column: string;
  bbox: [number, number, number, number];
  pixel_density: number;
}

interface CanvasProps {
  imageUrl: string;
  blocks: Block[];
  selectedBlockIds: number[];
  onBlockSelect: (blockId: number, multi: boolean) => void;
  width: number;
  height: number;
}

export default function Canvas({
  imageUrl,
  blocks,
  selectedBlockIds,
  onBlockSelect,
  width,
  height,
}: CanvasProps) {
  const [image] = useImage(imageUrl);
  const stageRef = useRef<any>(null);

  const scale = image ? Math.min(width / image.width, height / image.height) : 1;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      scaleX={scale}
      scaleY={scale}
    >
      <Layer>
        {/* Page Image */}
        {image && <KonvaImage image={image} />}

        {/* Block Boxes */}
        {blocks.map((block) => {
          const [x, y, w, h] = block.bbox;
          const isSelected = selectedBlockIds.includes(block.block_id);

          return (
            <Rect
              key={block.block_id}
              x={x}
              y={y}
              width={w}
              height={h}
              stroke={isSelected ? '#1B64DA' : '#F59E0B'}
              strokeWidth={isSelected ? 3 : 1}
              fill={isSelected ? 'rgba(27, 100, 218, 0.1)' : 'rgba(245, 158, 11, 0.05)'}
              onClick={(e) => {
                onBlockSelect(block.block_id, e.evt.shiftKey);
              }}
              onTap={() => {
                onBlockSelect(block.block_id, false);
              }}
            />
          );
        })}
      </Layer>
    </Stage>
  );
}
```

### 3.2 라벨링 모드 페이지

**파일: `frontend/src/pages/LabelingMode.tsx`**

```typescript
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPageBlocks, getPageImageURL } from '../services/api';
import Canvas from '../components/Canvas';

export default function LabelingMode() {
  const { documentId } = useParams<{ documentId: string }>();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBlockIds, setSelectedBlockIds] = useState<number[]>([]);

  // 현재 페이지 블록 조회
  const { data: blocksData, isLoading } = useQuery({
    queryKey: ['blocks', documentId, currentPage],
    queryFn: () => getPageBlocks(documentId!, currentPage),
    enabled: !!documentId,
  });

  // 다음 페이지 프리페칭 (Lazy Loading 최적화)
  useQuery({
    queryKey: ['blocks', documentId, currentPage + 1],
    queryFn: () => getPageBlocks(documentId!, currentPage + 1),
    enabled: !!documentId && currentPage + 1 < (blocksData?.total_pages || 0),
  });

  const handleBlockSelect = (blockId: number, multi: boolean) => {
    if (multi) {
      // Shift 클릭: 추가 선택
      setSelectedBlockIds((prev) =>
        prev.includes(blockId)
          ? prev.filter((id) => id !== blockId)
          : [...prev, blockId]
      );
    } else {
      // 일반 클릭: 단일 선택
      setSelectedBlockIds([blockId]);
    }
  };

  const handleCreateGroup = () => {
    if (selectedBlockIds.length === 0) {
      alert('블록을 먼저 선택해주세요');
      return;
    }

    // TODO: API 호출하여 그룹 생성
    console.log('Create group:', selectedBlockIds);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-background">
      {/* App Bar */}
      <div className="bg-white border-b border-neutral-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">📚 문제 라벨링</h1>

        <div className="flex items-center space-x-4">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-2 bg-white border border-neutral-border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              ◀ 이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage + 1} / {blocksData?.total_pages || '?'}
            </span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!blocksData || currentPage >= blocksData.total_pages - 1}
              className="px-3 py-2 bg-white border border-neutral-border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              다음 ▶
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Page List */}
        <div className="w-64 bg-white border-r border-neutral-border p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">페이지 목록</h3>
          {/* TODO: Page list */}
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 p-4">
          {blocksData && (
            <Canvas
              imageUrl={getPageImageURL(documentId!, currentPage)}
              blocks={blocksData.blocks || []}
              selectedBlockIds={selectedBlockIds}
              onBlockSelect={handleBlockSelect}
              width={800}
              height={1000}
            />
          )}
        </div>

        {/* Right Panel: Group Controls */}
        <div className="w-80 bg-white border-l border-neutral-border p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">그룹 관리</h3>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              선택된 블록: {selectedBlockIds.length}개
            </p>

            <button
              onClick={handleCreateGroup}
              disabled={selectedBlockIds.length === 0}
              className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50"
            >
              ➕ 새 그룹 만들기
            </button>
          </div>

          {/* TODO: Group list */}
        </div>
      </div>
    </div>
  );
}
```

### 3.3 검증 기준

- [ ] 페이지 이미지 표시
- [ ] 블록 박스 오버레이 렌더링
- [ ] 블록 클릭 → 선택 상태 변경
- [ ] Shift+클릭 → 다중 선택
- [ ] 페이지 이동 → 자동으로 다음 페이지 프리페칭
- [ ] 1,066개 블록 렌더링 시 60fps 유지

---

## ⚡ 단계 4: 문제 등록 & 문제은행 모드 (2-3주)

(Phase 8, 9와 유사한 구조로 구현)

### 4.1 문제 등록 모드 API

**백엔드**: ProblemMetadata CRUD 엔드포인트

### 4.2 문제 등록 UI

**프론트엔드**: 폼 컴포넌트 + 듀얼 캔버스

### 4.3 문제은행 모드

**프론트엔드**: 검색/필터/테이블 UI

---

## 🔧 단계 5: 성능 최적화 & 배포 (1-2주)

### 5.1 성능 최적화

#### 프론트엔드
- [ ] React.memo()로 불필요한 리렌더 방지
- [ ] Virtual scrolling (react-window) 적용
- [ ] 이미지 lazy loading
- [ ] Service Worker 캐싱

#### 백엔드
- [ ] Redis 캐싱 (블록 JSON)
- [ ] WebP 이미지 변환 (70% 크기 감소)
- [ ] Gzip 압축
- [ ] 데이터베이스 인덱스 (선택 사항)

### 5.2 배포

#### 백엔드 (Docker)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 프론트엔드 (Nginx)

```dockerfile
# frontend/Dockerfile
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./dataset_root:/app/dataset_root
    environment:
      - DATASET_ROOT=/app/dataset_root

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

---

## 📊 리스크 관리 및 대응

### 주요 리스크

#### 1. 캔버스 렌더링 성능 (✅ 해결됨)

**Before**: 281,582개 블록 렌더링 → Pixi.js 필요

**After (Lazy Loading)**: 최대 2,574개 블록 → react-konva로 충분

#### 2. 이미지 전송 지연

**대응**:
- WebP 변환 (383KB → ~110KB)
- 썸네일 생성 (10% 크기)
- CDN 캐싱 (선택)

#### 3. 백그라운드 분석 실패

**대응**:
- 재시도 로직 (최대 3회)
- 에러 로깅 및 알림
- 사용자는 이미 분석된 페이지로 작업 가능

### 마이그레이션 전략

#### 점진적 전환 (권장)

1. **PySide6 앱 유지** + Lazy Loading 적용 (1-2주)
2. **FastAPI 백엔드 구축** (2주)
3. **React 프론트엔드 구축** (4주)
4. **병렬 운영** (2주) - 두 시스템 동시 사용하며 검증
5. **완전 전환** - PySide6 앱 단계적 폐기

#### 데이터 호환성

- 기존 `dataset_root` 구조 그대로 사용
- JSON 포맷 변경 없음
- 기존 데이터 마이그레이션 불필요

---

## 📅 타임라인 요약

| 단계 | 작업 | 기간 | 누적 |
|------|------|------|------|
| **단계 0** | PySide6 Lazy Loading 최적화 | 1-2주 | 1-2주 |
| **단계 1** | FastAPI Backend | 1-2주 | 2-4주 |
| **단계 2** | React Frontend Foundation | 2-3주 | 4-7주 |
| **단계 3** | Labeling Mode | 3-4주 | 7-11주 |
| **단계 4** | 등록/은행 모드 | 2-3주 | 9-14주 |
| **단계 5** | 최적화 & 배포 | 1-2주 | 10-16주 |

**총 예상 소요**: 10-16주 (2.5-4개월)

---

## ✅ 검증 체크리스트

### 단계 0 완료 기준
- [ ] PDF 업로드 시 3초 이내에 첫 10페이지 로딩
- [ ] 백그라운드 분석 중에도 UI 반응성 유지
- [ ] 페이지 이동 시 분석되지 않은 페이지도 즉시 표시

### 단계 1 완료 기준
- [ ] FastAPI 서버 정상 실행
- [ ] PDF 업로드 API 작동
- [ ] 블록 on-demand 조회 API 작동
- [ ] 백그라운드 태스크 큐 작동

### 단계 2 완료 기준
- [ ] React 앱 정상 실행
- [ ] Tailwind CSS 스타일 적용
- [ ] PDF 업로드 UI 작동
- [ ] API 통신 정상

### 단계 3 완료 기준
- [ ] 캔버스에 페이지 이미지 표시
- [ ] 블록 박스 렌더링 (1,066개)
- [ ] 블록 선택/다중 선택 작동
- [ ] 그룹 생성 API 연동
- [ ] 60fps 유지

### 단계 4-5 완료 기준
- [ ] 문제 등록 폼 작동
- [ ] 문제은행 검색/필터 작동
- [ ] 이미지 최적화 (WebP)
- [ ] Docker 배포 성공

---

## 🎯 다음 액션

### 즉시 실행 가능 (단계 0)

1. `src/pdf_pipeline.py`에 `process_pdf_lazy()` 메서드 추가
2. `src/gui/background_analyzer.py` 생성
3. `src/gui/main_window.py` 수정하여 백그라운드 분석 통합
4. 테스트 실행

**예상 시간**: 1주일
**효과**: 즉각적인 UX 개선 (60초 → 3초)

### FastAPI 전환 (단계 1-5)

사용자 승인 후 단계별로 진행

**우선순위**:
1. 단계 0 완료 및 검증
2. 단계 1-2 병렬 진행 (백엔드 + 프론트 기초)
3. 단계 3-4 순차 진행
4. 단계 5 최종 최적화

---

## 📝 결론

**Lazy Loading 전략의 도입**으로 FastAPI + React 전환의 핵심 리스크가 해결되었습니다:

- ✅ 초기 로딩 시간: 60초 → 3초 (95% 개선)
- ✅ 캔버스 렌더링: Pixi.js 불필요, react-konva로 충분
- ✅ 사용자 경험: 무중단 워크플로우 가능

**권장 접근**:
1. 먼저 **단계 0 (PySide6 Lazy Loading)** 을 1-2주 안에 완료하여 즉각적인 성능 개선
2. 단계 0의 성과를 확인한 후, FastAPI + React 전환 진행 여부 결정
3. 전환 시 10-16주 소요 예상

이 계획서를 기반으로 점진적이고 안전한 마이그레이션이 가능합니다.
