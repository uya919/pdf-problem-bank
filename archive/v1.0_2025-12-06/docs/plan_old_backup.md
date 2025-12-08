# 프로젝트 세부 실행 계획

이 문서는 "문제 이미지 자동 크롭 + 라벨링 데스크톱 앱" 프로젝트의 **단계별 상세 구현 계획**입니다.

**참고 문서**:
- [claude.md](claude.md) - 프로젝트 개요 및 요구사항
- 구현 가능성 리포트 - 기술적 분석 및 개선안

---

## 📋 전체 타임라인 요약

| Phase | 내용 | 예상 기간 | 상태 |
|-------|------|----------|------|
| Phase 0 | 환경 설정 및 기본 구조 | 0.5일 | ⬜ TODO |
| Phase 1 | 핵심 백엔드 (PDF 처리 + 블록 검출) | 1-2주 | ⬜ TODO |
| Phase 2 | 기본 GUI (이미지 표시 + 블록 오버레이) | 1-2주 | ⬜ TODO |
| Phase 3 | 그룹핑 기능 (문제 단위 그룹 관리) | 2-3주 | ⬜ TODO |
| Phase 4 | UX 개선 (패널, 단축키, Export) | 1-2주 | ⬜ TODO |
| Phase 5 | 안정화 및 테스트 | 1주 | ⬜ TODO |

**총 예상 기간**: 6-8주

---

# Phase 0: 환경 설정 및 기본 구조 (0.5일)

> **목표**: 프로젝트 폴더 구조 생성, 의존성 설치, 기본 설정 파일 준비

## Step 0.1: 폴더 구조 생성

### 작업 내용
프로젝트 루트에 기본 폴더 구조를 생성합니다.

### 생성할 폴더
```
c:\MYCLAUDE_PROJECT\pdf\
├── src/
│   └── gui/
├── dataset_root/
│   ├── raw_pdfs/
│   ├── documents/
│   ├── exports/
│   └── models/
└── tests/  (선택사항)
```

### 실행 명령
```bash
mkdir src
mkdir src\gui
mkdir dataset_root
mkdir dataset_root\raw_pdfs
mkdir dataset_root\documents
mkdir dataset_root\exports
mkdir dataset_root\models
```

### 완료 기준
- [ ] 모든 폴더가 생성됨
- [ ] dataset_root 경로가 접근 가능함

---

## Step 0.2: requirements.txt 작성

### 작업 내용
필요한 Python 라이브러리 목록을 작성합니다.

### 생성할 파일
- `requirements.txt`

### 파일 내용
```txt
# GUI Framework
PySide6>=6.6.0

# PDF Processing
PyMuPDF>=1.23.0

# Image Processing
numpy>=1.24.0
opencv-python>=4.8.0
Pillow>=10.0.0

# Data Validation
pydantic>=2.0.0

# Logging
loguru>=0.7.0

# Configuration
python-dotenv>=1.0.0

# Development (선택)
pytest>=7.4.0
pytest-qt>=4.2.0
```

### 실행 명령
```bash
pip install -r requirements.txt
```

### 완료 기준
- [ ] requirements.txt 파일 생성됨
- [ ] 모든 라이브러리가 설치됨 (에러 없음)
- [ ] `python -c "import PySide6; import fitz; import cv2"` 실행 시 에러 없음

---

## Step 0.3: .env 파일 생성 (선택)

### 작업 내용
환경별 설정을 위한 .env 파일을 생성합니다.

### 생성할 파일
- `.env` (루트 폴더)
- `.env.example` (템플릿)

### 파일 내용 (.env.example)
```env
# Dataset Root Path
DATASET_ROOT=./dataset_root

# Processing Settings
DEFAULT_DPI=150
WHITE_THRESHOLD=240
MIN_BLOCK_SIZE=20

# UI Settings
AUTO_SAVE_INTERVAL=30
```

### 완료 기준
- [ ] .env.example 생성됨
- [ ] .env 파일 복사됨 (git에는 추가하지 않음)

---

# Phase 1: 핵심 백엔드 구현 (1-2주)

> **목표**: GUI 없이 PDF → 이미지 → 블록 검출까지의 파이프라인 완성

---

## Step 1.1: 기본 설정 및 데이터 모델

### 📁 Step 1.1.1: src/__init__.py

**작업 내용**: 빈 파일 생성 (패키지 선언용)

**파일**: `src/__init__.py`

**내용**: (빈 파일)

---

### 📁 Step 1.1.2: src/config.py

**작업 내용**: 프로젝트 전역 설정 관리

**파일**: `src/config.py`

**구현할 내용**:
```python
from pathlib import Path
from dotenv import load_dotenv
import os

class Config:
    """프로젝트 전역 설정"""

    # 경로 설정
    DATASET_ROOT: Path
    RAW_PDFS_DIR: Path
    DOCUMENTS_DIR: Path
    EXPORTS_DIR: Path
    MODELS_DIR: Path

    # 처리 설정
    DEFAULT_DPI: int = 150
    WHITE_THRESHOLD: int = 240
    MIN_BLOCK_SIZE: int = 20

    # UI 설정
    AUTO_SAVE_INTERVAL: int = 30

    @classmethod
    def load(cls):
        """환경 변수에서 설정 로드"""
        pass
```

**구현 함수**:
1. `load()` - .env에서 설정 로드
2. `validate()` - 경로 존재 여부 확인
3. `get_document_dir(document_id)` - 문서별 디렉토리 경로 반환

**테스트 방법**:
```python
# 직접 실행 시 테스트
if __name__ == "__main__":
    config = Config.load()
    print(f"Dataset Root: {config.DATASET_ROOT}")
    print(f"DPI: {config.DEFAULT_DPI}")
```

**실행 명령**:
```bash
python src/config.py
```

**완료 기준**:
- [ ] Config 클래스가 .env에서 값을 읽어옴
- [ ] 경로가 모두 Path 객체로 변환됨
- [ ] 테스트 실행 시 설정값이 출력됨

---

### 📁 Step 1.1.3: src/data_models.py

**작업 내용**: 데이터 구조 정의 (Block, Column, Page, ProblemGroup)

**파일**: `src/data_models.py`

**구현할 클래스**:

```python
from dataclasses import dataclass
from typing import List, Optional, Literal
from datetime import datetime

@dataclass
class BoundingBox:
    """바운딩 박스 [x_min, y_min, x_max, y_max]"""
    x_min: int
    y_min: int
    x_max: int
    y_max: int

    @property
    def width(self) -> int:
        return self.x_max - self.x_min

    @property
    def height(self) -> int:
        return self.y_max - self.y_min

    def to_list(self) -> List[int]:
        return [self.x_min, self.y_min, self.x_max, self.y_max]

@dataclass
class Column:
    """페이지 컬럼 정보"""
    id: str  # "L", "R", "C" 등
    x_min: int
    x_max: int

@dataclass
class Block:
    """텍스트 블록"""
    block_id: int
    column: str
    bbox: BoundingBox
    pixel_density: float

@dataclass
class ProblemGroup:
    """문제 그룹"""
    id: str  # "L1", "R2" 등
    column: str
    block_ids: List[int]
    bbox: Optional[BoundingBox] = None
    crop_image_path: Optional[str] = None
    metadata: dict = None

@dataclass
class PageData:
    """페이지 데이터"""
    document_id: str
    page_index: int
    width: int
    height: int
    columns: List[Column]
    blocks: List[Block]
    status: Literal["todo", "auto", "edited"] = "todo"
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None

@dataclass
class GroupData:
    """그룹 데이터"""
    document_id: str
    page_index: int
    groups: List[ProblemGroup]
    status: Literal["todo", "auto", "edited"] = "todo"
    created_at: Optional[datetime] = None
    modified_at: Optional[datetime] = None
```

**구현 메서드**:
1. `BoundingBox.area()` - 면적 계산
2. `BoundingBox.intersects(other)` - 교차 여부
3. `Block.to_dict()` - JSON 직렬화
4. `PageData.from_dict()` - JSON 역직렬화

**테스트 방법**:
```python
if __name__ == "__main__":
    # 테스트 코드
    bbox = BoundingBox(100, 200, 400, 600)
    print(f"Width: {bbox.width}, Height: {bbox.height}")

    block = Block(
        block_id=1,
        column="L",
        bbox=bbox,
        pixel_density=0.32
    )
    print(f"Block: {block}")
```

**완료 기준**:
- [ ] 모든 dataclass가 정의됨
- [ ] 타입 힌트가 정확함
- [ ] 테스트 코드 실행 시 에러 없음

---

## Step 1.2: PDF → 이미지 변환

### 📁 Step 1.2.1: src/pdf_processor.py

**작업 내용**: PDF를 페이지 단위 이미지로 변환

**파일**: `src/pdf_processor.py`

**구현할 클래스**:
```python
class PDFProcessor:
    """PDF 처리 클래스"""

    def __init__(self, config: Config):
        self.config = config

    def convert_pdf_to_images(
        self,
        pdf_path: Path,
        document_id: str,
        dpi: int = 150
    ) -> List[Path]:
        """
        PDF를 페이지별 이미지로 변환

        Args:
            pdf_path: PDF 파일 경로
            document_id: 문서 ID
            dpi: 이미지 해상도

        Returns:
            생성된 이미지 파일 경로 리스트
        """
        pass

    def get_page_image(
        self,
        pdf_path: Path,
        page_index: int,
        dpi: int = 150
    ) -> np.ndarray:
        """
        특정 페이지를 numpy 배열로 반환
        """
        pass
```

**구현 세부 사항**:
1. PyMuPDF(fitz) 사용
2. 이미지 저장 경로: `dataset_root/documents/{document_id}/pages/page_XXXX.png`
3. DPI 설정 가능
4. 진행률 표시 (print 또는 logging)

**테스트 방법**:
```python
if __name__ == "__main__":
    from config import Config

    config = Config.load()
    processor = PDFProcessor(config)

    # 테스트 PDF 경로
    test_pdf = Path("dataset_root/raw_pdfs/test.pdf")

    if test_pdf.exists():
        images = processor.convert_pdf_to_images(
            test_pdf,
            "test_doc",
            dpi=150
        )
        print(f"생성된 이미지: {len(images)}개")
        for img_path in images:
            print(f"  - {img_path}")
```

**실행 명령**:
```bash
# 테스트 PDF를 dataset_root/raw_pdfs/에 넣고
python src/pdf_processor.py
```

**완료 기준**:
- [ ] PDF를 이미지로 변환 성공
- [ ] 이미지가 올바른 경로에 저장됨
- [ ] 파일명 형식: page_0000.png, page_0001.png, ...
- [ ] 이미지 품질이 적절함 (텍스트 읽을 수 있음)

---

## Step 1.3: 블록 검출 알고리즘

### 📁 Step 1.3.1: src/density_analyzer.py

**작업 내용**: 흰색 배경 제거 + 밀집도 분석 + 블록 검출

**파일**: `src/density_analyzer.py`

**구현할 클래스**:
```python
class DensityAnalyzer:
    """밀집도 기반 블록 검출"""

    def __init__(self, config: Config):
        self.config = config
        self.white_threshold = config.WHITE_THRESHOLD
        self.min_block_size = config.MIN_BLOCK_SIZE

    def analyze_page(
        self,
        image: np.ndarray
    ) -> List[Block]:
        """
        페이지 이미지를 분석하여 블록 리스트 반환

        Args:
            image: 페이지 이미지 (numpy array)

        Returns:
            검출된 Block 리스트
        """
        pass

    def _remove_white_background(self, image: np.ndarray) -> np.ndarray:
        """흰색 배경 제거"""
        pass

    def _detect_columns(self, mask: np.ndarray, width: int) -> List[Column]:
        """컬럼 경계 검출"""
        pass

    def _find_blocks(self, mask: np.ndarray) -> List[BoundingBox]:
        """블록 바운딩 박스 검출 (OpenCV 사용)"""
        pass

    def _calculate_density(self, mask: np.ndarray, bbox: BoundingBox) -> float:
        """블록 내 픽셀 밀집도 계산"""
        pass
```

**구현 알고리즘 상세**:

**1) _remove_white_background**:
```python
# RGB 240 이상을 흰색으로 간주
mask = (image < self.white_threshold).any(axis=2)
return mask.astype(np.uint8) * 255
```

**2) _detect_columns**:
```python
# 수평 히스토그램 분석
h_projection = np.sum(mask, axis=0)
# 골짜기 찾기 (컬럼 경계)
# 2단 레이아웃 가정: 중간 지점 찾기
```

**3) _find_blocks** (핵심):
```python
# OpenCV 연결 컴포넌트 분석
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

blocks = []
for contour in contours:
    x, y, w, h = cv2.boundingRect(contour)

    # 최소 크기 필터링
    if w < self.min_block_size or h < self.min_block_size:
        continue

    bbox = BoundingBox(x, y, x+w, y+h)
    blocks.append(bbox)

return blocks
```

**4) _calculate_density**:
```python
roi = mask[bbox.y_min:bbox.y_max, bbox.x_min:bbox.x_max]
total_pixels = bbox.width * bbox.height
black_pixels = np.sum(roi > 0)
density = black_pixels / total_pixels
return density
```

**시각화 함수 추가**:
```python
def visualize_blocks(
    self,
    image: np.ndarray,
    blocks: List[Block],
    output_path: Path
):
    """블록 검출 결과를 이미지에 그려서 저장"""
    result = image.copy()
    for block in blocks:
        bbox = block.bbox
        cv2.rectangle(
            result,
            (bbox.x_min, bbox.y_min),
            (bbox.x_max, bbox.y_max),
            (0, 255, 0),
            2
        )
        # 블록 ID 표시
        cv2.putText(
            result,
            str(block.block_id),
            (bbox.x_min, bbox.y_min - 5),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 0, 0),
            1
        )
    cv2.imwrite(str(output_path), result)
```

**테스트 방법**:
```python
if __name__ == "__main__":
    from config import Config
    from pdf_processor import PDFProcessor
    import cv2

    config = Config.load()
    analyzer = DensityAnalyzer(config)

    # 테스트 이미지 로드
    test_image_path = Path("dataset_root/documents/test_doc/pages/page_0000.png")
    image = cv2.imread(str(test_image_path))

    # 블록 검출
    blocks = analyzer.analyze_page(image)

    print(f"검출된 블록 개수: {len(blocks)}")
    for block in blocks[:5]:  # 처음 5개만 출력
        print(f"  Block {block.block_id}: {block.bbox}, density={block.pixel_density:.2f}")

    # 시각화
    output_path = Path("dataset_root/test_blocks_visualization.png")
    analyzer.visualize_blocks(image, blocks, output_path)
    print(f"시각화 결과 저장: {output_path}")
```

**실행 명령**:
```bash
python src/density_analyzer.py
```

**완료 기준**:
- [ ] 이미지에서 블록이 검출됨 (최소 10개 이상)
- [ ] 시각화 이미지를 열어서 블록이 적절히 표시됨
- [ ] 너무 작은 노이즈는 필터링됨
- [ ] 컬럼이 제대로 구분됨 (L, R)

---

## Step 1.4: 데이터 저장/로드

### 📁 Step 1.4.1: src/data_io.py

**작업 내용**: JSON 파일로 블록 데이터 저장/로드

**파일**: `src/data_io.py`

**구현할 함수**:
```python
from pathlib import Path
import json
from datetime import datetime
from typing import Optional
from data_models import PageData, GroupData, Block, Column, BoundingBox

class DataIO:
    """데이터 입출력 관리"""

    def __init__(self, config: Config):
        self.config = config

    def save_page_data(
        self,
        page_data: PageData,
        document_id: str
    ) -> Path:
        """
        페이지 블록 데이터를 JSON으로 저장

        저장 경로: documents/{document_id}/blocks/page_XXXX_blocks.json
        """
        pass

    def load_page_data(
        self,
        document_id: str,
        page_index: int
    ) -> Optional[PageData]:
        """페이지 블록 데이터 로드"""
        pass

    def save_group_data(
        self,
        group_data: GroupData,
        document_id: str
    ) -> Path:
        """
        그룹 데이터를 JSON으로 저장

        저장 경로: documents/{document_id}/groups/page_XXXX_groups.json
        """
        pass

    def load_group_data(
        self,
        document_id: str,
        page_index: int
    ) -> Optional[GroupData]:
        """그룹 데이터 로드"""
        pass

    def _page_data_to_dict(self, page_data: PageData) -> dict:
        """PageData를 dict로 변환"""
        pass

    def _dict_to_page_data(self, data: dict) -> PageData:
        """dict를 PageData로 변환"""
        pass
```

**JSON 포맷 예시**:
```json
{
  "version": "1.0",
  "document_id": "test_doc",
  "page_index": 0,
  "width": 2480,
  "height": 3508,
  "status": "auto",
  "created_at": "2025-01-15T10:30:00",
  "modified_at": "2025-01-15T10:30:00",
  "columns": [
    { "id": "L", "x_min": 0, "x_max": 1240 },
    { "id": "R", "x_min": 1240, "x_max": 2480 }
  ],
  "blocks": [
    {
      "block_id": 1,
      "column": "L",
      "bbox": [100, 200, 400, 260],
      "pixel_density": 0.32
    }
  ]
}
```

**테스트 방법**:
```python
if __name__ == "__main__":
    from config import Config
    from data_models import PageData, Block, Column, BoundingBox
    from datetime import datetime

    config = Config.load()
    data_io = DataIO(config)

    # 테스트 데이터 생성
    test_page = PageData(
        document_id="test_doc",
        page_index=0,
        width=2480,
        height=3508,
        columns=[
            Column(id="L", x_min=0, x_max=1240),
            Column(id="R", x_min=1240, x_max=2480)
        ],
        blocks=[
            Block(
                block_id=1,
                column="L",
                bbox=BoundingBox(100, 200, 400, 260),
                pixel_density=0.32
            )
        ],
        status="auto",
        created_at=datetime.now()
    )

    # 저장
    saved_path = data_io.save_page_data(test_page, "test_doc")
    print(f"저장됨: {saved_path}")

    # 로드
    loaded_page = data_io.load_page_data("test_doc", 0)
    print(f"로드됨: {loaded_page.document_id}, 블록 개수: {len(loaded_page.blocks)}")
```

**완료 기준**:
- [ ] JSON 파일이 올바른 경로에 저장됨
- [ ] 저장 후 로드 시 데이터가 동일함
- [ ] datetime이 ISO 8601 형식으로 저장됨

---

## Step 1.5: Phase 1 통합 테스트

### 📁 Step 1.5.1: tests/test_pipeline.py

**작업 내용**: PDF → 이미지 → 블록 검출 → 저장 전체 파이프라인 테스트

**파일**: `tests/test_pipeline.py`

**테스트 스크립트**:
```python
"""
Phase 1 통합 테스트
PDF를 입력받아 블록 검출까지 전체 과정을 테스트합니다.
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
from data_models import PageData

def main():
    print("=" * 60)
    print("Phase 1 통합 테스트 시작")
    print("=" * 60)

    # 1. 설정 로드
    print("\n[1/5] 설정 로드 중...")
    config = Config.load()
    print(f"  Dataset Root: {config.DATASET_ROOT}")

    # 2. 테스트 PDF 처리
    test_pdf = config.DATASET_ROOT / "raw_pdfs" / "test.pdf"
    if not test_pdf.exists():
        print(f"  ❌ 테스트 PDF가 없습니다: {test_pdf}")
        print(f"  → 테스트 PDF를 {test_pdf.parent}에 넣어주세요.")
        return

    print(f"\n[2/5] PDF 변환 중... ({test_pdf.name})")
    processor = PDFProcessor(config)
    image_paths = processor.convert_pdf_to_images(test_pdf, "test_doc", dpi=150)
    print(f"  ✓ {len(image_paths)}개 페이지 변환 완료")

    # 3. 첫 페이지 블록 검출
    print(f"\n[3/5] 블록 검출 중... (페이지 0)")
    analyzer = DensityAnalyzer(config)

    image = cv2.imread(str(image_paths[0]))
    blocks = analyzer.analyze_page(image)
    print(f"  ✓ {len(blocks)}개 블록 검출됨")

    # 4. 시각화
    print(f"\n[4/5] 결과 시각화 중...")
    vis_path = config.DATASET_ROOT / "test_result_visualization.png"
    analyzer.visualize_blocks(image, blocks, vis_path)
    print(f"  ✓ 저장됨: {vis_path}")

    # 5. JSON 저장
    print(f"\n[5/5] 데이터 저장 중...")
    data_io = DataIO(config)

    # 컬럼 정보 (간단히 2단 분할)
    from data_models import Column
    width = image.shape[1]
    columns = [
        Column(id="L", x_min=0, x_max=width//2),
        Column(id="R", x_min=width//2, x_max=width)
    ]

    # 블록에 컬럼 할당
    for block in blocks:
        if block.bbox.x_min < width // 2:
            block.column = "L"
        else:
            block.column = "R"

    page_data = PageData(
        document_id="test_doc",
        page_index=0,
        width=width,
        height=image.shape[0],
        columns=columns,
        blocks=blocks,
        status="auto"
    )

    saved_path = data_io.save_page_data(page_data, "test_doc")
    print(f"  ✓ JSON 저장됨: {saved_path}")

    print("\n" + "=" * 60)
    print("✓ Phase 1 테스트 완료!")
    print("=" * 60)
    print(f"\n📌 다음 단계:")
    print(f"  1. 시각화 이미지 확인: {vis_path}")
    print(f"  2. JSON 파일 확인: {saved_path}")
    print(f"  3. 블록 검출 품질 확인 후 다음 Phase로 진행")

if __name__ == "__main__":
    main()
```

**실행 명령**:
```bash
# 테스트 PDF를 준비 (dataset_root/raw_pdfs/test.pdf)
python tests/test_pipeline.py
```

**완료 기준**:
- [ ] 스크립트가 에러 없이 실행됨
- [ ] 시각화 이미지에서 블록이 적절히 표시됨
- [ ] JSON 파일이 올바른 형식으로 저장됨
- [ ] 실제 수학 문제집 PDF로 테스트 시 문제 영역이 대부분 검출됨

**Phase 1 완료 시 산출물**:
```
✓ src/config.py
✓ src/data_models.py
✓ src/pdf_processor.py
✓ src/density_analyzer.py
✓ src/data_io.py
✓ tests/test_pipeline.py
✓ dataset_root/documents/test_doc/
    ✓ pages/page_0000.png, ...
    ✓ blocks/page_0000_blocks.json
✓ dataset_root/test_result_visualization.png
```

---

# Phase 2: 기본 GUI 구현 (1-2주)

> **목표**: 페이지 이미지를 표시하고 블록 박스를 오버레이하는 최소 GUI

---

## Step 2.1: GUI 기본 구조

### 📁 Step 2.1.1: src/gui/__init__.py

**작업 내용**: 빈 파일 생성

**파일**: `src/gui/__init__.py`

---

### 📁 Step 2.1.2: src/gui/main_window.py

**작업 내용**: 메인 윈도우 레이아웃 구성

**파일**: `src/gui/main_window.py`

**구현할 클래스**:
```python
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QToolBar, QFileDialog
)
from PySide6.QtCore import Qt
from pathlib import Path

class MainWindow(QMainWindow):
    """메인 윈도우"""

    def __init__(self, config: Config):
        super().__init__()
        self.config = config
        self.current_document_id = None
        self.current_page_index = 0
        self.total_pages = 0

        self.setup_ui()

    def setup_ui(self):
        """UI 초기화"""
        self.setWindowTitle("문제 이미지 자동 크롭 + 라벨링")
        self.setGeometry(100, 100, 1400, 900)

        # 메인 레이아웃
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)

        # 좌측 패널 (임시로 빈 위젯)
        left_panel = QWidget()
        left_panel.setFixedWidth(200)
        left_panel.setStyleSheet("background-color: #f0f0f0;")

        # 중앙 캔버스 영역
        self.canvas = None  # Step 2.2에서 구현
        canvas_placeholder = QLabel("Canvas Area")
        canvas_placeholder.setAlignment(Qt.AlignCenter)
        canvas_placeholder.setStyleSheet("background-color: white; border: 1px solid #ccc;")

        # 우측 패널 (임시로 빈 위젯)
        right_panel = QWidget()
        right_panel.setFixedWidth(250)
        right_panel.setStyleSheet("background-color: #f0f0f0;")

        main_layout.addWidget(left_panel)
        main_layout.addWidget(canvas_placeholder, 1)  # stretch factor = 1
        main_layout.addWidget(right_panel)

        # 툴바 생성
        self.create_toolbar()

    def create_toolbar(self):
        """상단 툴바 생성"""
        toolbar = QToolBar()
        self.addToolBar(toolbar)

        # Open PDF 버튼
        open_btn = QPushButton("Open PDF")
        open_btn.clicked.connect(self.open_pdf)
        toolbar.addWidget(open_btn)

        toolbar.addSeparator()

        # 페이지 네비게이션
        prev_btn = QPushButton("◀ 이전")
        prev_btn.clicked.connect(self.prev_page)
        toolbar.addWidget(prev_btn)

        self.page_label = QLabel("0 / 0")
        toolbar.addWidget(self.page_label)

        next_btn = QPushButton("다음 ▶")
        next_btn.clicked.connect(self.next_page)
        toolbar.addWidget(next_btn)

        toolbar.addSeparator()

        # 줌 컨트롤
        zoom_out_btn = QPushButton("-")
        toolbar.addWidget(zoom_out_btn)

        zoom_label = QLabel("100%")
        toolbar.addWidget(zoom_label)

        zoom_in_btn = QPushButton("+")
        toolbar.addWidget(zoom_in_btn)

    def open_pdf(self):
        """PDF 열기 다이얼로그"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "PDF 선택",
            str(self.config.DATASET_ROOT / "raw_pdfs"),
            "PDF Files (*.pdf)"
        )

        if file_path:
            print(f"선택된 파일: {file_path}")
            # TODO: PDF 처리 로직 (Step 2.3에서 구현)

    def prev_page(self):
        """이전 페이지"""
        if self.current_page_index > 0:
            self.current_page_index -= 1
            self.update_page()

    def next_page(self):
        """다음 페이지"""
        if self.current_page_index < self.total_pages - 1:
            self.current_page_index += 1
            self.update_page()

    def update_page(self):
        """페이지 업데이트"""
        self.page_label.setText(f"{self.current_page_index + 1} / {self.total_pages}")
        # TODO: 캔버스 업데이트 (Step 2.3에서 구현)
```

**테스트 방법**:
```python
# src/main.py 생성
if __name__ == "__main__":
    import sys
    from PySide6.QtWidgets import QApplication
    from gui.main_window import MainWindow
    from config import Config

    app = QApplication(sys.argv)
    config = Config.load()
    window = MainWindow(config)
    window.show()
    sys.exit(app.exec())
```

**실행 명령**:
```bash
python src/main.py
```

**완료 기준**:
- [ ] 윈도우가 실행됨
- [ ] 3개 패널 레이아웃이 표시됨
- [ ] 툴바 버튼들이 보임
- [ ] "Open PDF" 버튼 클릭 시 파일 다이얼로그 열림

---

## Step 2.2: 페이지 캔버스 구현

### 📁 Step 2.2.1: src/gui/page_canvas.py

**작업 내용**: QGraphicsView 기반 이미지 표시 캔버스

**파일**: `src/gui/page_canvas.py`

**구현할 클래스**:
```python
from PySide6.QtWidgets import QGraphicsView, QGraphicsScene, QGraphicsPixmapItem
from PySide6.QtGui import QPixmap, QPainter, QPen, QColor
from PySide6.QtCore import Qt, QRectF
from pathlib import Path
from typing import List, Optional
from data_models import Block

class PageCanvas(QGraphicsView):
    """페이지 이미지 및 블록 표시 캔버스"""

    def __init__(self):
        super().__init__()
        self.scene = QGraphicsScene()
        self.setScene(self.scene)

        # 설정
        self.setRenderHint(QPainter.Antialiasing)
        self.setDragMode(QGraphicsView.ScrollHandDrag)
        self.setTransformationAnchor(QGraphicsView.AnchorUnderMouse)

        # 데이터
        self.current_image_item: Optional[QGraphicsPixmapItem] = None
        self.blocks: List[Block] = []
        self.block_items = []  # QGraphicsRectItem 리스트

    def load_image(self, image_path: Path):
        """이미지 로드 및 표시"""
        self.scene.clear()
        self.block_items.clear()

        pixmap = QPixmap(str(image_path))
        self.current_image_item = self.scene.addPixmap(pixmap)

        # 뷰 영역에 맞춤
        self.fitInView(self.current_image_item, Qt.KeepAspectRatio)

    def set_blocks(self, blocks: List[Block]):
        """블록 리스트 설정 및 그리기"""
        # 기존 블록 아이템 제거
        for item in self.block_items:
            self.scene.removeItem(item)
        self.block_items.clear()

        self.blocks = blocks

        # 블록 그리기
        for block in blocks:
            self.draw_block(block)

    def draw_block(self, block: Block):
        """단일 블록을 씬에 그리기"""
        bbox = block.bbox
        rect = QRectF(bbox.x_min, bbox.y_min, bbox.width, bbox.height)

        # 반투명 초록색 사각형
        pen = QPen(QColor(0, 255, 0, 200), 2)
        brush = QColor(0, 255, 0, 50)

        rect_item = self.scene.addRect(rect, pen, brush)
        self.block_items.append(rect_item)

        # 블록 ID 텍스트
        text_item = self.scene.addText(str(block.block_id))
        text_item.setPos(bbox.x_min, bbox.y_min - 20)
        text_item.setDefaultTextColor(QColor(255, 0, 0))
        self.block_items.append(text_item)

    def zoom_in(self):
        """확대"""
        self.scale(1.2, 1.2)

    def zoom_out(self):
        """축소"""
        self.scale(1/1.2, 1/1.2)

    def reset_zoom(self):
        """줌 초기화"""
        if self.current_image_item:
            self.fitInView(self.current_image_item, Qt.KeepAspectRatio)
```

**main_window.py 수정**:
```python
# canvas_placeholder 대신 PageCanvas 사용
from gui.page_canvas import PageCanvas

class MainWindow(QMainWindow):
    def setup_ui(self):
        # ...

        # 중앙 캔버스
        self.canvas = PageCanvas()
        main_layout.addWidget(self.canvas, 1)

        # ...
```

**완료 기준**:
- [ ] 캔버스에 이미지가 표시됨
- [ ] 마우스 드래그로 팬 가능
- [ ] 휠로 줌 인/아웃 가능

---

## Step 2.3: PDF 로드 및 표시 연결

### 📁 Step 2.3.1: main_window.py 확장

**작업 내용**: Open PDF 시 전체 파이프라인 실행

**수정할 파일**: `src/gui/main_window.py`

**추가할 메서드**:
```python
from pdf_processor import PDFProcessor
from density_analyzer import DensityAnalyzer
from data_io import DataIO

class MainWindow(QMainWindow):
    def __init__(self, config: Config):
        # ...

        # 백엔드 인스턴스
        self.pdf_processor = PDFProcessor(config)
        self.analyzer = DensityAnalyzer(config)
        self.data_io = DataIO(config)

        # 현재 문서 데이터
        self.page_images: List[Path] = []
        self.page_data_list: List[PageData] = []

    def open_pdf(self):
        """PDF 열기"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "PDF 선택",
            str(self.config.DATASET_ROOT / "raw_pdfs"),
            "PDF Files (*.pdf)"
        )

        if not file_path:
            return

        pdf_path = Path(file_path)
        document_id = pdf_path.stem  # 파일명을 document_id로 사용

        # 진행 상태 표시 (간단하게 print, 나중에 ProgressDialog로 개선)
        print(f"PDF 처리 중: {pdf_path.name}")

        # 1. PDF → 이미지 변환
        self.page_images = self.pdf_processor.convert_pdf_to_images(
            pdf_path, document_id, dpi=self.config.DEFAULT_DPI
        )
        self.total_pages = len(self.page_images)
        print(f"  → {self.total_pages}페이지 변환 완료")

        # 2. 각 페이지 블록 검출
        self.page_data_list = []
        for i, image_path in enumerate(self.page_images):
            print(f"  → 페이지 {i+1}/{self.total_pages} 블록 검출 중...")

            import cv2
            image = cv2.imread(str(image_path))
            blocks = self.analyzer.analyze_page(image)

            # 컬럼 할당 (간단한 2단 분할)
            width = image.shape[1]
            for block in blocks:
                block.column = "L" if block.bbox.x_min < width // 2 else "R"

            from data_models import Column
            columns = [
                Column(id="L", x_min=0, x_max=width//2),
                Column(id="R", x_min=width//2, x_max=width)
            ]

            page_data = PageData(
                document_id=document_id,
                page_index=i,
                width=width,
                height=image.shape[0],
                columns=columns,
                blocks=blocks,
                status="auto"
            )

            # 저장
            self.data_io.save_page_data(page_data, document_id)
            self.page_data_list.append(page_data)

        print("  ✓ 모든 페이지 처리 완료")

        # 3. 첫 페이지 표시
        self.current_document_id = document_id
        self.current_page_index = 0
        self.update_page()

    def update_page(self):
        """현재 페이지를 캔버스에 표시"""
        if not self.page_images:
            return

        # 페이지 라벨 업데이트
        self.page_label.setText(f"{self.current_page_index + 1} / {self.total_pages}")

        # 이미지 로드
        image_path = self.page_images[self.current_page_index]
        self.canvas.load_image(image_path)

        # 블록 표시
        page_data = self.page_data_list[self.current_page_index]
        self.canvas.set_blocks(page_data.blocks)
```

**줌 버튼 연결**:
```python
def create_toolbar(self):
    # ...

    zoom_out_btn.clicked.connect(self.canvas.zoom_out)
    zoom_in_btn.clicked.connect(self.canvas.zoom_in)

    self.zoom_label = zoom_label  # 나중에 줌 레벨 표시용
```

**실행 명령**:
```bash
python src/main.py
```

**완료 기준**:
- [ ] PDF 선택 시 자동으로 모든 페이지 처리됨
- [ ] 첫 페이지가 캔버스에 표시됨
- [ ] 블록이 초록색 박스로 오버레이됨
- [ ] 이전/다음 버튼으로 페이지 이동 가능
- [ ] +/- 버튼으로 줌 인/아웃 가능

---

## Step 2.4: Phase 2 마무리

**Phase 2 완료 시 산출물**:
```
✓ src/gui/__init__.py
✓ src/gui/main_window.py
✓ src/gui/page_canvas.py
✓ src/main.py
```

**체크리스트**:
- [ ] GUI가 에러 없이 실행됨
- [ ] PDF를 열면 모든 페이지가 처리됨
- [ ] 블록 검출 결과가 시각적으로 확인됨
- [ ] 페이지 네비게이션이 작동함
- [ ] 줌 인/아웃이 작동함

**다음 단계 준비**:
- Phase 3에서는 블록 선택 및 그룹핑 기능 추가

---

# Phase 3: 그룹핑 기능 구현 (2-3주)

> **목표**: 블록을 선택하여 문제 그룹으로 묶고, 크롭 이미지 생성

---

## Step 3.1: 블록 선택 기능

### 📁 Step 3.1.1: page_canvas.py - 블록 선택

**작업 내용**: 블록 클릭 시 선택 상태 토글

**수정할 파일**: `src/gui/page_canvas.py`

**추가/수정 내용**:
```python
from PySide6.QtCore import Signal

class BlockItem(QGraphicsRectItem):
    """클릭 가능한 블록 아이템"""

    def __init__(self, block: Block, canvas: 'PageCanvas'):
        bbox = block.bbox
        super().__init__(bbox.x_min, bbox.y_min, bbox.width, bbox.height)

        self.block = block
        self.canvas = canvas
        self.selected = False

        # 스타일
        self.default_pen = QPen(QColor(0, 255, 0, 200), 2)
        self.selected_pen = QPen(QColor(255, 0, 0, 255), 3)
        self.default_brush = QColor(0, 255, 0, 50)
        self.selected_brush = QColor(255, 0, 0, 80)

        self.setPen(self.default_pen)
        self.setBrush(self.default_brush)

        # 클릭 가능하게
        self.setFlag(QGraphicsRectItem.ItemIsSelectable)

    def mousePressEvent(self, event):
        """마우스 클릭 시 선택 토글"""
        self.selected = not self.selected
        self.update_appearance()
        self.canvas.on_block_selection_changed()
        super().mousePressEvent(event)

    def update_appearance(self):
        """선택 상태에 따라 모양 업데이트"""
        if self.selected:
            self.setPen(self.selected_pen)
            self.setBrush(self.selected_brush)
        else:
            self.setPen(self.default_pen)
            self.setBrush(self.default_brush)

class PageCanvas(QGraphicsView):
    # 시그널 추가
    selection_changed = Signal(list)  # 선택된 블록 리스트

    def __init__(self):
        # ...
        self.block_items: List[BlockItem] = []

    def draw_block(self, block: Block):
        """BlockItem 사용"""
        bbox = block.bbox

        # BlockItem 생성
        block_item = BlockItem(block, self)
        self.scene.addItem(block_item)
        self.block_items.append(block_item)

        # 블록 ID 텍스트
        text_item = self.scene.addText(str(block.block_id))
        text_item.setPos(bbox.x_min, bbox.y_min - 20)
        text_item.setDefaultTextColor(QColor(255, 0, 0))

    def on_block_selection_changed(self):
        """블록 선택 변경 시"""
        selected_blocks = [
            item.block for item in self.block_items if item.selected
        ]
        self.selection_changed.emit(selected_blocks)

    def get_selected_blocks(self) -> List[Block]:
        """선택된 블록 리스트 반환"""
        return [item.block for item in self.block_items if item.selected]

    def clear_selection(self):
        """모든 선택 해제"""
        for item in self.block_items:
            item.selected = False
            item.update_appearance()
```

**완료 기준**:
- [ ] 블록 클릭 시 빨간색으로 변경됨
- [ ] 다시 클릭 시 초록색으로 복구됨
- [ ] 여러 블록 동시 선택 가능

---

## Step 3.2: 우측 패널 - 그룹 관리 UI

### 📁 Step 3.2.1: src/gui/side_panels.py

**작업 내용**: 우측 패널 - 그룹 리스트 및 관리 버튼

**파일**: `src/gui/side_panels.py`

**구현 내용**:
```python
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPushButton,
    QListWidget, QListWidgetItem, QLabel, QInputDialog
)
from PySide6.QtCore import Signal
from typing import List
from data_models import ProblemGroup

class GroupPanel(QWidget):
    """우측 패널 - 문제 그룹 관리"""

    # 시그널
    group_created = Signal(str)  # 그룹 ID
    group_selected = Signal(str)  # 그룹 ID
    group_deleted = Signal(str)  # 그룹 ID

    def __init__(self):
        super().__init__()
        self.groups: List[ProblemGroup] = []
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)

        # 제목
        title = QLabel("문제 그룹")
        title.setStyleSheet("font-size: 16px; font-weight: bold; padding: 10px;")
        layout.addWidget(title)

        # 그룹 리스트
        self.group_list = QListWidget()
        self.group_list.itemClicked.connect(self.on_group_clicked)
        layout.addWidget(self.group_list)

        # 선택된 블록 수 표시
        self.selection_label = QLabel("선택된 블록: 0개")
        self.selection_label.setStyleSheet("padding: 5px; background-color: #e0e0e0;")
        layout.addWidget(self.selection_label)

        # 버튼들
        btn_layout = QVBoxLayout()

        self.create_group_btn = QPushButton("새 그룹 만들기")
        self.create_group_btn.clicked.connect(self.create_group)
        self.create_group_btn.setEnabled(False)
        btn_layout.addWidget(self.create_group_btn)

        self.add_to_group_btn = QPushButton("기존 그룹에 추가")
        self.add_to_group_btn.setEnabled(False)
        btn_layout.addWidget(self.add_to_group_btn)

        self.delete_group_btn = QPushButton("그룹 삭제")
        self.delete_group_btn.clicked.connect(self.delete_group)
        self.delete_group_btn.setEnabled(False)
        btn_layout.addWidget(self.delete_group_btn)

        layout.addLayout(btn_layout)
        layout.addStretch()

    def update_selection_count(self, count: int):
        """선택된 블록 수 업데이트"""
        self.selection_label.setText(f"선택된 블록: {count}개")
        self.create_group_btn.setEnabled(count > 0)

    def set_groups(self, groups: List[ProblemGroup]):
        """그룹 리스트 설정"""
        self.groups = groups
        self.refresh_group_list()

    def refresh_group_list(self):
        """그룹 리스트 UI 갱신"""
        self.group_list.clear()
        for group in self.groups:
            item_text = f"{group.id} ({len(group.block_ids)}개 블록)"
            self.group_list.addItem(item_text)

    def create_group(self):
        """새 그룹 만들기"""
        # 그룹 ID 입력 받기
        group_id, ok = QInputDialog.getText(
            self,
            "그룹 ID 입력",
            "그룹 ID (예: L1, R2):"
        )

        if ok and group_id:
            self.group_created.emit(group_id)

    def on_group_clicked(self, item: QListWidgetItem):
        """그룹 클릭 시"""
        index = self.group_list.row(item)
        group = self.groups[index]
        self.group_selected.emit(group.id)
        self.delete_group_btn.setEnabled(True)

    def delete_group(self):
        """선택된 그룹 삭제"""
        current_item = self.group_list.currentItem()
        if current_item:
            index = self.group_list.row(current_item)
            group = self.groups[index]
            self.group_deleted.emit(group.id)
```

**main_window.py에 통합**:
```python
from gui.side_panels import GroupPanel

class MainWindow(QMainWindow):
    def setup_ui(self):
        # ...

        # 우측 패널 - GroupPanel 사용
        self.group_panel = GroupPanel()
        self.group_panel.setFixedWidth(250)
        self.group_panel.group_created.connect(self.on_group_created)
        self.group_panel.group_deleted.connect(self.on_group_deleted)

        main_layout.addWidget(self.group_panel)

        # 캔버스 시그널 연결
        self.canvas.selection_changed.connect(self.on_selection_changed)

    def on_selection_changed(self, selected_blocks):
        """캔버스에서 블록 선택 변경 시"""
        self.group_panel.update_selection_count(len(selected_blocks))
```

**완료 기준**:
- [ ] 우측 패널에 그룹 리스트가 표시됨
- [ ] 블록 선택 시 "선택된 블록: N개" 업데이트됨
- [ ] "새 그룹 만들기" 버튼이 블록 선택 시에만 활성화됨

---

## Step 3.3: 그룹 생성 및 저장

### 📁 Step 3.3.1: src/grouping.py

**작업 내용**: 그룹 생성 및 크롭 이미지 저장 로직

**파일**: `src/grouping.py`

**구현 내용**:
```python
from pathlib import Path
from typing import List
import cv2
import numpy as np
from data_models import ProblemGroup, Block, BoundingBox, GroupData
from config import Config

class GroupManager:
    """문제 그룹 관리"""

    def __init__(self, config: Config):
        self.config = config

    def create_group(
        self,
        group_id: str,
        blocks: List[Block],
        column: str
    ) -> ProblemGroup:
        """
        블록들로 그룹 생성

        Args:
            group_id: 그룹 ID (예: "L1")
            blocks: 그룹에 포함할 블록 리스트
            column: 컬럼 ID

        Returns:
            생성된 ProblemGroup
        """
        block_ids = [b.block_id for b in blocks]

        # 전체 바운딩 박스 계산
        x_min = min(b.bbox.x_min for b in blocks)
        y_min = min(b.bbox.y_min for b in blocks)
        x_max = max(b.bbox.x_max for b in blocks)
        y_max = max(b.bbox.y_max for b in blocks)

        bbox = BoundingBox(x_min, y_min, x_max, y_max)

        group = ProblemGroup(
            id=group_id,
            column=column,
            block_ids=block_ids,
            bbox=bbox
        )

        return group

    def crop_and_save_group(
        self,
        image: np.ndarray,
        group: ProblemGroup,
        document_id: str,
        page_index: int
    ) -> Path:
        """
        그룹 영역을 크롭하여 PNG로 저장

        Args:
            image: 원본 페이지 이미지
            group: 문제 그룹
            document_id: 문서 ID
            page_index: 페이지 인덱스

        Returns:
            저장된 이미지 경로
        """
        bbox = group.bbox

        # 이미지 크롭
        cropped = image[bbox.y_min:bbox.y_max, bbox.x_min:bbox.x_max]

        # 저장 경로
        problems_dir = (
            self.config.DOCUMENTS_DIR / document_id / "problems"
        )
        problems_dir.mkdir(parents=True, exist_ok=True)

        filename = f"page_{page_index:04d}_{group.id}.png"
        save_path = problems_dir / filename

        # 저장
        cv2.imwrite(str(save_path), cropped)

        # 그룹에 경로 기록
        group.crop_image_path = str(save_path.relative_to(self.config.DOCUMENTS_DIR / document_id))

        return save_path

    def save_groups(
        self,
        groups: List[ProblemGroup],
        document_id: str,
        page_index: int
    ) -> Path:
        """그룹 데이터를 JSON으로 저장"""
        from data_io import DataIO
        from datetime import datetime

        group_data = GroupData(
            document_id=document_id,
            page_index=page_index,
            groups=groups,
            status="edited",
            created_at=datetime.now(),
            modified_at=datetime.now()
        )

        # 저장 경로
        groups_dir = self.config.DOCUMENTS_DIR / document_id / "groups"
        groups_dir.mkdir(parents=True, exist_ok=True)

        filename = f"page_{page_index:04d}_groups.json"
        save_path = groups_dir / filename

        # JSON 저장
        import json
        with open(save_path, 'w', encoding='utf-8') as f:
            data = {
                "version": "1.0",
                "document_id": group_data.document_id,
                "page_index": group_data.page_index,
                "status": group_data.status,
                "created_at": group_data.created_at.isoformat(),
                "modified_at": group_data.modified_at.isoformat(),
                "groups": [
                    {
                        "id": g.id,
                        "column": g.column,
                        "block_ids": g.block_ids,
                        "bbox": g.bbox.to_list() if g.bbox else None,
                        "crop_image_path": g.crop_image_path,
                        "metadata": g.metadata
                    }
                    for g in group_data.groups
                ]
            }
            json.dump(data, f, indent=2, ensure_ascii=False)

        return save_path

    def load_groups(
        self,
        document_id: str,
        page_index: int
    ) -> List[ProblemGroup]:
        """저장된 그룹 데이터 로드"""
        groups_dir = self.config.DOCUMENTS_DIR / document_id / "groups"
        filename = f"page_{page_index:04d}_groups.json"
        file_path = groups_dir / filename

        if not file_path.exists():
            return []

        import json
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        groups = []
        for g_data in data["groups"]:
            bbox = None
            if g_data["bbox"]:
                bbox = BoundingBox(*g_data["bbox"])

            group = ProblemGroup(
                id=g_data["id"],
                column=g_data["column"],
                block_ids=g_data["block_ids"],
                bbox=bbox,
                crop_image_path=g_data.get("crop_image_path"),
                metadata=g_data.get("metadata")
            )
            groups.append(group)

        return groups
```

**main_window.py에서 사용**:
```python
from grouping import GroupManager

class MainWindow(QMainWindow):
    def __init__(self, config: Config):
        # ...
        self.group_manager = GroupManager(config)
        self.current_groups: List[ProblemGroup] = []

    def on_group_created(self, group_id: str):
        """새 그룹 생성"""
        selected_blocks = self.canvas.get_selected_blocks()

        if not selected_blocks:
            return

        # 컬럼 결정 (첫 번째 블록 기준)
        column = selected_blocks[0].column

        # 그룹 생성
        group = self.group_manager.create_group(
            group_id, selected_blocks, column
        )

        # 이미지 크롭 및 저장
        import cv2
        image_path = self.page_images[self.current_page_index]
        image = cv2.imread(str(image_path))

        self.group_manager.crop_and_save_group(
            image, group,
            self.current_document_id,
            self.current_page_index
        )

        # 그룹 리스트에 추가
        self.current_groups.append(group)

        # 그룹 데이터 저장
        self.group_manager.save_groups(
            self.current_groups,
            self.current_document_id,
            self.current_page_index
        )

        # UI 업데이트
        self.group_panel.set_groups(self.current_groups)
        self.canvas.clear_selection()

        print(f"그룹 '{group_id}' 생성됨: {len(selected_blocks)}개 블록")

    def on_group_deleted(self, group_id: str):
        """그룹 삭제"""
        # 그룹 찾기
        group = next((g for g in self.current_groups if g.id == group_id), None)

        if group:
            self.current_groups.remove(group)

            # 저장
            self.group_manager.save_groups(
                self.current_groups,
                self.current_document_id,
                self.current_page_index
            )

            # UI 업데이트
            self.group_panel.set_groups(self.current_groups)

            print(f"그룹 '{group_id}' 삭제됨")

    def update_page(self):
        """페이지 업데이트 시 그룹도 로드"""
        # ... (기존 코드)

        # 그룹 로드
        self.current_groups = self.group_manager.load_groups(
            self.current_document_id,
            self.current_page_index
        )
        self.group_panel.set_groups(self.current_groups)
```

**완료 기준**:
- [ ] 블록 선택 후 "새 그룹 만들기" 클릭 시 그룹 생성됨
- [ ] 크롭된 이미지가 `documents/{doc_id}/problems/`에 저장됨
- [ ] 그룹 정보가 JSON으로 저장됨
- [ ] 페이지 이동 후 다시 돌아오면 그룹이 유지됨
- [ ] 그룹 삭제 시 리스트에서 제거됨

---

## Step 3.4: 그룹 시각화

### 📁 Step 3.4.1: page_canvas.py - 그룹 박스 표시

**작업 내용**: 그룹을 굵은 테두리로 표시

**수정할 파일**: `src/gui/page_canvas.py`

**추가 메서드**:
```python
class PageCanvas(QGraphicsView):
    def __init__(self):
        # ...
        self.group_items = []  # 그룹 박스 아이템

    def set_groups(self, groups: List[ProblemGroup]):
        """그룹 리스트 설정 및 표시"""
        # 기존 그룹 아이템 제거
        for item in self.group_items:
            self.scene.removeItem(item)
        self.group_items.clear()

        # 그룹 그리기
        for group in groups:
            self.draw_group(group)

    def draw_group(self, group: ProblemGroup):
        """그룹 박스 그리기"""
        if not group.bbox:
            return

        bbox = group.bbox
        rect = QRectF(bbox.x_min, bbox.y_min, bbox.width, bbox.height)

        # 굵은 파란색 테두리
        pen = QPen(QColor(0, 0, 255, 255), 4)
        rect_item = self.scene.addRect(rect, pen)
        self.group_items.append(rect_item)

        # 그룹 ID 텍스트 (큰 글씨)
        text_item = self.scene.addText(group.id)
        text_item.setPos(bbox.x_min, bbox.y_min - 40)
        text_item.setDefaultTextColor(QColor(0, 0, 255))
        font = text_item.font()
        font.setPointSize(14)
        font.setBold(True)
        text_item.setFont(font)
        self.group_items.append(text_item)
```

**main_window.py 수정**:
```python
def update_page(self):
    # ... (기존 코드)

    # 그룹 표시
    self.canvas.set_groups(self.current_groups)

def on_group_created(self, group_id: str):
    # ... (기존 코드)

    # 그룹 시각화 업데이트
    self.canvas.set_groups(self.current_groups)
```

**완료 기준**:
- [ ] 생성된 그룹이 파란색 굵은 테두리로 표시됨
- [ ] 그룹 ID가 큰 글씨로 표시됨
- [ ] 블록 박스와 그룹 박스가 구분됨

---

## Step 3.5: Phase 3 마무리

**Phase 3 완료 시 산출물**:
```
✓ src/grouping.py
✓ src/gui/side_panels.py
✓ src/gui/page_canvas.py (확장)
✓ src/gui/main_window.py (확장)
✓ dataset_root/documents/{doc_id}/
    ✓ groups/page_XXXX_groups.json
    ✓ problems/page_XXXX_L1.png, ...
```

**체크리스트**:
- [ ] 블록 선택 기능 작동
- [ ] 그룹 생성 시 크롭 이미지 저장
- [ ] 그룹 삭제 가능
- [ ] 페이지 이동 시 그룹 유지
- [ ] 그룹이 시각적으로 구분됨

---

# Phase 4: UX 개선 (1-2주)

> **목표**: 좌측 패널, 키보드 단축키, Export 기능 등 사용성 향상

---

## Step 4.1: 좌측 패널 - 문서/페이지 리스트

### 📁 Step 4.1.1: side_panels.py 확장

**작업 내용**: 좌측 패널 구현

**수정할 파일**: `src/gui/side_panels.py`

**추가 클래스**:
```python
class DocumentPanel(QWidget):
    """좌측 패널 - 문서 및 페이지 리스트"""

    # 시그널
    page_changed = Signal(int)  # 페이지 인덱스

    def __init__(self):
        super().__init__()
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)

        # 문서 제목
        self.doc_title = QLabel("문서 없음")
        self.doc_title.setStyleSheet(
            "font-size: 14px; font-weight: bold; padding: 10px; background-color: #d0d0d0;"
        )
        layout.addWidget(self.doc_title)

        # 페이지 리스트
        page_label = QLabel("페이지 목록")
        page_label.setStyleSheet("padding: 5px; font-weight: bold;")
        layout.addWidget(page_label)

        self.page_list = QListWidget()
        self.page_list.itemClicked.connect(self.on_page_clicked)
        layout.addWidget(self.page_list)

    def set_document(self, document_id: str, total_pages: int):
        """문서 설정"""
        self.doc_title.setText(document_id)

        self.page_list.clear()
        for i in range(total_pages):
            item_text = f"페이지 {i+1}"
            item = QListWidgetItem(item_text)
            self.page_list.addItem(item)

    def set_page_status(self, page_index: int, status: str):
        """
        페이지 상태 설정

        Args:
            page_index: 페이지 인덱스
            status: "todo" | "auto" | "edited"
        """
        item = self.page_list.item(page_index)

        # 아이콘 또는 텍스트로 상태 표시
        status_icon = {
            "todo": "⬜",
            "auto": "✅",
            "edited": "✏️"
        }

        icon = status_icon.get(status, "")
        item.setText(f"{icon} 페이지 {page_index + 1}")

    def on_page_clicked(self, item: QListWidgetItem):
        """페이지 클릭 시"""
        index = self.page_list.row(item)
        self.page_changed.emit(index)

    def highlight_current_page(self, page_index: int):
        """현재 페이지 하이라이트"""
        self.page_list.setCurrentRow(page_index)
```

**main_window.py에 통합**:
```python
from gui.side_panels import DocumentPanel, GroupPanel

class MainWindow(QMainWindow):
    def setup_ui(self):
        # ...

        # 좌측 패널
        self.doc_panel = DocumentPanel()
        self.doc_panel.setFixedWidth(200)
        self.doc_panel.page_changed.connect(self.on_page_changed)

        main_layout.addWidget(self.doc_panel)
        # ...

    def open_pdf(self):
        # ... (PDF 처리 후)

        # 좌측 패널 업데이트
        self.doc_panel.set_document(document_id, self.total_pages)

        # 각 페이지 상태 설정
        for i, page_data in enumerate(self.page_data_list):
            self.doc_panel.set_page_status(i, page_data.status)

    def on_page_changed(self, page_index: int):
        """좌측 패널에서 페이지 선택 시"""
        self.current_page_index = page_index
        self.update_page()

    def update_page(self):
        # ... (기존 코드)

        # 좌측 패널 하이라이트
        self.doc_panel.highlight_current_page(self.current_page_index)

    def on_group_created(self, group_id: str):
        # ... (기존 코드)

        # 페이지 상태를 "edited"로 변경
        self.page_data_list[self.current_page_index].status = "edited"
        self.doc_panel.set_page_status(self.current_page_index, "edited")
```

**완료 기준**:
- [ ] 좌측 패널에 페이지 리스트 표시
- [ ] 페이지 클릭 시 해당 페이지로 이동
- [ ] 현재 페이지가 하이라이트됨
- [ ] 그룹 생성 시 상태가 ✏️로 변경됨

---

## Step 4.2: 키보드 단축키

### 📁 Step 4.2.1: main_window.py - 단축키 추가

**작업 내용**: 키보드 단축키 지원

**수정할 파일**: `src/gui/main_window.py`

**추가 메서드**:
```python
from PySide6.QtGui import QKeySequence, QShortcut

class MainWindow(QMainWindow):
    def setup_ui(self):
        # ... (기존 코드)

        self.setup_shortcuts()

    def setup_shortcuts(self):
        """키보드 단축키 설정"""
        # 페이지 이동
        QShortcut(QKeySequence(Qt.Key_Left), self, self.prev_page)
        QShortcut(QKeySequence(Qt.Key_Right), self, self.next_page)

        # 줌
        QShortcut(QKeySequence("Ctrl++"), self, self.canvas.zoom_in)
        QShortcut(QKeySequence("Ctrl+-"), self, self.canvas.zoom_out)
        QShortcut(QKeySequence("Ctrl+0"), self, self.canvas.reset_zoom)

        # 선택 해제
        QShortcut(QKeySequence(Qt.Key_Escape), self, self.canvas.clear_selection)

        # 그룹 생성 (Ctrl+G)
        QShortcut(QKeySequence("Ctrl+G"), self, self.quick_create_group)

        # 저장 (Ctrl+S)
        QShortcut(QKeySequence("Ctrl+S"), self, self.save_current_page)

    def quick_create_group(self):
        """빠른 그룹 생성 (자동 ID)"""
        selected_blocks = self.canvas.get_selected_blocks()

        if not selected_blocks:
            return

        # 자동 그룹 ID 생성
        column = selected_blocks[0].column
        existing_ids = [g.id for g in self.current_groups if g.column == column]

        # L1, L2, ... 형식
        counter = 1
        while f"{column}{counter}" in existing_ids:
            counter += 1

        group_id = f"{column}{counter}"

        # 그룹 생성
        self.on_group_created(group_id)

    def save_current_page(self):
        """현재 페이지 저장"""
        if self.current_groups:
            self.group_manager.save_groups(
                self.current_groups,
                self.current_document_id,
                self.current_page_index
            )
            print(f"페이지 {self.current_page_index + 1} 저장됨")
```

**완료 기준**:
- [ ] 좌/우 화살표로 페이지 이동
- [ ] Ctrl++/- 로 줌 조절
- [ ] ESC로 선택 해제
- [ ] Ctrl+G로 빠른 그룹 생성
- [ ] Ctrl+S로 저장

---

## Step 4.3: Export 기능

### 📁 Step 4.3.1: grouping.py - Export

**작업 내용**: 전체 문서의 문제 이미지를 한 번에 내보내기

**수정할 파일**: `src/grouping.py`

**추가 메서드**:
```python
class GroupManager:
    def export_all_problems(
        self,
        document_id: str,
        output_dir: Path
    ) -> int:
        """
        문서의 모든 문제 이미지를 output_dir로 복사

        Returns:
            내보낸 문제 개수
        """
        from shutil import copy2

        output_dir.mkdir(parents=True, exist_ok=True)

        problems_dir = self.config.DOCUMENTS_DIR / document_id / "problems"

        if not problems_dir.exists():
            return 0

        count = 0
        for image_file in problems_dir.glob("*.png"):
            dest = output_dir / image_file.name
            copy2(image_file, dest)
            count += 1

        # manifest.json 생성
        manifest = {
            "document_id": document_id,
            "exported_at": datetime.now().isoformat(),
            "total_problems": count
        }

        import json
        with open(output_dir / "manifest.json", 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        return count
```

**main_window.py 수정**:
```python
def create_toolbar(self):
    # ... (기존 코드)

    toolbar.addSeparator()

    # Export 버튼
    export_btn = QPushButton("Export Problems")
    export_btn.clicked.connect(self.export_problems)
    toolbar.addWidget(export_btn)

def export_problems(self):
    """문제 이미지 내보내기"""
    if not self.current_document_id:
        return

    # 출력 디렉토리 선택
    from PySide6.QtWidgets import QFileDialog
    output_dir = QFileDialog.getExistingDirectory(
        self,
        "Export 폴더 선택",
        str(self.config.EXPORTS_DIR)
    )

    if not output_dir:
        return

    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = Path(output_dir) / f"{self.current_document_id}_export_{timestamp}"

    # Export
    count = self.group_manager.export_all_problems(
        self.current_document_id,
        export_path
    )

    print(f"✓ {count}개 문제 이미지를 {export_path}로 내보냄")

    # 메시지 박스 표시
    from PySide6.QtWidgets import QMessageBox
    QMessageBox.information(
        self,
        "Export 완료",
        f"{count}개 문제 이미지를 내보냈습니다.\n\n{export_path}"
    )
```

**완료 기준**:
- [ ] "Export Problems" 버튼 클릭 시 폴더 선택 다이얼로그 열림
- [ ] 모든 크롭 이미지가 선택한 폴더로 복사됨
- [ ] manifest.json이 함께 생성됨
- [ ] 완료 메시지 표시

---

## Step 4.4: 진행 상태 표시

### 📁 Step 4.4.1: main_window.py - ProgressDialog

**작업 내용**: PDF 처리 시 진행 상태 표시

**수정할 파일**: `src/gui/main_window.py`

**추가 import**:
```python
from PySide6.QtWidgets import QProgressDialog
from PySide6.QtCore import QTimer
```

**수정 메서드**:
```python
def open_pdf(self):
    # ... (파일 선택 후)

    # 진행 다이얼로그 생성
    progress = QProgressDialog(
        "PDF 처리 중...",
        "취소",
        0,
        self.total_pages + 1,  # +1은 PDF 변환
        self
    )
    progress.setWindowModality(Qt.WindowModal)
    progress.show()

    # PDF 변환
    progress.setLabelText("PDF를 이미지로 변환 중...")
    progress.setValue(0)
    QApplication.processEvents()  # UI 업데이트

    self.page_images = self.pdf_processor.convert_pdf_to_images(
        pdf_path, document_id, dpi=self.config.DEFAULT_DPI
    )
    self.total_pages = len(self.page_images)
    progress.setValue(1)

    # 블록 검출
    self.page_data_list = []
    for i, image_path in enumerate(self.page_images):
        if progress.wasCanceled():
            return

        progress.setLabelText(f"페이지 {i+1}/{self.total_pages} 블록 검출 중...")
        progress.setValue(i + 2)
        QApplication.processEvents()

        # ... (블록 검출 코드)

    progress.close()
```

**완료 기준**:
- [ ] PDF 처리 시 진행 상태가 표시됨
- [ ] 현재 처리 중인 페이지 번호 표시
- [ ] 취소 버튼 작동 (선택사항)

---

## Step 4.5: Phase 4 마무리

**Phase 4 완료 시 기능**:
```
✓ 좌측 패널 - 페이지 리스트 및 상태
✓ 키보드 단축키
✓ Export 기능
✓ 진행 상태 표시
```

**체크리스트**:
- [ ] 좌측 패널에서 페이지 선택 가능
- [ ] 키보드로 주요 작업 수행 가능
- [ ] Export로 문제 이미지 일괄 저장
- [ ] PDF 처리 시 진행률 표시

---

# Phase 5: 안정화 및 테스트 (1주)

> **목표**: 버그 수정, 에러 처리, 사용자 테스트

---

## Step 5.1: 에러 처리

### 📁 Step 5.1.1: 전역 에러 핸들러

**작업 내용**: 예외 처리 및 로깅

**새 파일**: `src/logger.py`

**내용**:
```python
from loguru import logger
import sys
from pathlib import Path

def setup_logger(log_dir: Path):
    """로거 설정"""
    log_dir.mkdir(parents=True, exist_ok=True)

    # 파일 로그
    logger.add(
        log_dir / "app_{time}.log",
        rotation="10 MB",
        retention="7 days",
        level="INFO"
    )

    # 에러만 별도 파일
    logger.add(
        log_dir / "error_{time}.log",
        rotation="10 MB",
        retention="30 days",
        level="ERROR"
    )

    return logger
```

**각 파일에 에러 처리 추가**:
```python
# 예: pdf_processor.py
from logger import logger

class PDFProcessor:
    def convert_pdf_to_images(self, pdf_path, document_id, dpi=150):
        try:
            # ... (기존 코드)
        except Exception as e:
            logger.error(f"PDF 변환 실패: {pdf_path}, 에러: {e}")
            raise
```

**완료 기준**:
- [ ] 주요 함수에 try-except 추가
- [ ] 에러 발생 시 로그 기록
- [ ] 사용자에게 친절한 에러 메시지 표시

---

## Step 5.2: 설정 UI

### 📁 Step 5.2.1: 설정 다이얼로그

**작업 내용**: 임계값, DPI 등 설정 조정 UI

**새 파일**: `src/gui/settings_dialog.py`

**내용**:
```python
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QFormLayout,
    QSpinBox, QDialogButtonBox, QLabel
)

class SettingsDialog(QDialog):
    """설정 다이얼로그"""

    def __init__(self, config: Config, parent=None):
        super().__init__(parent)
        self.config = config
        self.setWindowTitle("설정")
        self.setup_ui()

    def setup_ui(self):
        layout = QVBoxLayout(self)

        form = QFormLayout()

        # DPI 설정
        self.dpi_spinbox = QSpinBox()
        self.dpi_spinbox.setRange(72, 300)
        self.dpi_spinbox.setValue(self.config.DEFAULT_DPI)
        form.addRow("이미지 DPI:", self.dpi_spinbox)

        # 흰색 임계값
        self.threshold_spinbox = QSpinBox()
        self.threshold_spinbox.setRange(200, 255)
        self.threshold_spinbox.setValue(self.config.WHITE_THRESHOLD)
        form.addRow("흰색 임계값:", self.threshold_spinbox)

        # 최소 블록 크기
        self.min_block_spinbox = QSpinBox()
        self.min_block_spinbox.setRange(5, 100)
        self.min_block_spinbox.setValue(self.config.MIN_BLOCK_SIZE)
        form.addRow("최소 블록 크기:", self.min_block_spinbox)

        layout.addLayout(form)

        # 버튼
        buttons = QDialogButtonBox(
            QDialogButtonBox.Ok | QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def get_values(self):
        """설정값 반환"""
        return {
            "dpi": self.dpi_spinbox.value(),
            "threshold": self.threshold_spinbox.value(),
            "min_block_size": self.min_block_spinbox.value()
        }
```

**main_window.py에 추가**:
```python
def create_toolbar(self):
    # ...

    toolbar.addSeparator()

    settings_btn = QPushButton("⚙ 설정")
    settings_btn.clicked.connect(self.open_settings)
    toolbar.addWidget(settings_btn)

def open_settings(self):
    """설정 다이얼로그"""
    from gui.settings_dialog import SettingsDialog

    dialog = SettingsDialog(self.config, self)
    if dialog.exec():
        values = dialog.get_values()

        # 설정 업데이트
        self.config.DEFAULT_DPI = values["dpi"]
        self.config.WHITE_THRESHOLD = values["threshold"]
        self.config.MIN_BLOCK_SIZE = values["min_block_size"]

        # analyzer 재생성
        self.analyzer = DensityAnalyzer(self.config)

        print(f"설정 업데이트: DPI={values['dpi']}")
```

**완료 기준**:
- [ ] 설정 버튼 클릭 시 다이얼로그 열림
- [ ] 설정 변경 시 즉시 적용됨
- [ ] 설정이 .env 파일에 저장됨 (선택)

---

## Step 5.3: 사용자 테스트

### 📁 Step 5.3.1: 테스트 체크리스트

**작업 내용**: 실제 사용자(비개발자)와 함께 테스트

**테스트 시나리오**:

**시나리오 1: 기본 워크플로우**
1. [ ] 앱 실행
2. [ ] PDF 열기
3. [ ] 블록 검출 결과 확인
4. [ ] 블록 선택하여 그룹 생성
5. [ ] 그룹 이름 입력
6. [ ] 다른 페이지로 이동
7. [ ] 다시 돌아와서 그룹 확인
8. [ ] Export로 문제 이미지 저장

**시나리오 2: 에러 처리**
1. [ ] 잘못된 PDF 파일 열기
2. [ ] 빈 페이지 처리
3. [ ] 중복 그룹 ID 입력
4. [ ] 블록 선택 없이 그룹 생성 시도

**시나리오 3: 성능 테스트**
1. [ ] 100페이지 이상 PDF 처리
2. [ ] 메모리 사용량 확인
3. [ ] 페이지 전환 속도 확인

**발견된 문제 기록 및 수정**

---

## Step 5.4: 문서화

### 📁 Step 5.4.1: README.md 작성

**새 파일**: `README.md`

**내용**:
```markdown
# 문제 이미지 자동 크롭 + 라벨링 앱

학원용 수학 문제집 PDF를 자동으로 문제 단위로 분할하고 라벨링하는 데스크톱 앱입니다.

## 설치

### 요구사항
- Python 3.11 이상
- Windows/Mac/Linux

### 설치 방법

1. 저장소 클론 (또는 다운로드)
2. 가상환경 생성 및 활성화 (선택)
```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
```

3. 의존성 설치
```bash
pip install -r requirements.txt
```

## 사용 방법

### 1. 앱 실행
```bash
python src/main.py
```

### 2. PDF 열기
- 상단 툴바의 "Open PDF" 버튼 클릭
- PDF 파일 선택
- 자동으로 모든 페이지가 처리됨

### 3. 문제 그룹 만들기
- 캔버스에서 블록(초록색 박스)을 클릭하여 선택
- 우측 패널의 "새 그룹 만들기" 버튼 클릭
- 그룹 ID 입력 (예: L1, R2)

### 4. 문제 이미지 내보내기
- 상단 툴바의 "Export Problems" 버튼 클릭
- 저장할 폴더 선택

## 키보드 단축키

- `←` / `→` : 페이지 이동
- `Ctrl + G` : 선택한 블록으로 그룹 생성
- `Ctrl + S` : 현재 페이지 저장
- `Ctrl + +` / `Ctrl + -` : 줌 인/아웃
- `ESC` : 선택 해제

## 데이터 저장 위치

모든 데이터는 `dataset_root/documents/{문서ID}/` 에 저장됩니다:

- `pages/` : 페이지 이미지 (PNG)
- `blocks/` : 블록 검출 결과 (JSON)
- `groups/` : 문제 그룹 정보 (JSON)
- `problems/` : 크롭된 문제 이미지 (PNG)

## 문제 해결

### PDF가 열리지 않아요
- PDF 파일이 손상되지 않았는지 확인하세요
- 암호화된 PDF는 지원하지 않습니다

### 블록 검출이 이상해요
- 설정(⚙)에서 "흰색 임계값"을 조정해보세요
- DPI를 높이면 더 정확하지만 느려집니다

### 앱이 느려요
- DPI를 낮춰보세요 (기본 150)
- 큰 PDF는 페이지를 나눠서 처리하세요

## 라이선스

(라이선스 정보)
```

**완료 기준**:
- [ ] README.md 작성됨
- [ ] 사용자 매뉴얼이 명확함
- [ ] 문제 해결 섹션 포함

---

## Step 5.5: Phase 5 마무리

**Phase 5 완료 시 산출물**:
```
✓ src/logger.py
✓ src/gui/settings_dialog.py
✓ README.md
✓ 로그 파일 (logs/)
```

**최종 체크리스트**:
- [ ] 주요 에러 처리 완료
- [ ] 로깅 시스템 작동
- [ ] 설정 UI 구현
- [ ] 사용자 테스트 완료
- [ ] 문서화 완료

---

# 프로젝트 완료!

## 최종 산출물

### 코드
```
src/
├── __init__.py
├── config.py
├── data_models.py
├── pdf_processor.py
├── density_analyzer.py
├── data_io.py
├── grouping.py
├── logger.py
├── main.py
└── gui/
    ├── __init__.py
    ├── main_window.py
    ├── page_canvas.py
    ├── side_panels.py
    └── settings_dialog.py
```

### 데이터
```
dataset_root/
├── raw_pdfs/
├── documents/
│   └── {document_id}/
│       ├── pages/
│       ├── blocks/
│       ├── groups/
│       └── problems/
└── exports/
```

### 문서
```
├── claude.md
├── plan.md
├── README.md
└── requirements.txt
```

## 향후 확장 계획

### 단기 (1-3개월)
- [ ] 블록 수동 조정 도구 (분할/병합)
- [ ] 배치 처리 기능
- [ ] 작업 자동 저장

### 중기 (3-6개월)
- [ ] ML 모델 통합 (자동 그룹핑)
- [ ] 문제 유형 분류
- [ ] 협업 기능

### 장기 (6개월+)
- [ ] OCR 통합
- [ ] 문제 데이터베이스
- [ ] 웹 버전

---

## 다음 단계

프로젝트를 시작하려면:

1. **Phase 0**부터 순서대로 진행
2. 각 Step의 "완료 기준"을 모두 충족했는지 확인
3. 문제가 발생하면 에러 메시지를 복사해서 Claude Code에게 전달
4. 한 Phase 완료 후 다음 Phase로 진행

**준비되셨으면 "Phase 0부터 시작해줘"라고 말씀해주세요!**
