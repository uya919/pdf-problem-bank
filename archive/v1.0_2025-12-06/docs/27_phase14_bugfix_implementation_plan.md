# Phase 14 버그 수정 상세 구현 계획

**날짜**: 2025-11-27
**관련 리포트**: [26_phase14_block_analysis_bug_report.md](./26_phase14_block_analysis_bug_report.md)
**예상 소요**: 4단계, 약 15분

---

## 개요

Phase 14-1, 14-2 구현 시 발생한 2개의 Critical 버그를 수정합니다.

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | WebP 파일 검색 수정 | `pdf.py` | 3분 |
| 2 | 블록 분석 인덱스 수정 | `pdf_pipeline.py` | 5분 |
| 3 | 기존 문서 재처리 | 수동/스크립트 | 5분 |
| 4 | 검증 | 브라우저 테스트 | 2분 |

---

## 단계 1: WebP 파일 검색 수정

### 1.1 목표
- `GET /api/pdf/documents` API가 WebP 이미지도 카운트하도록 수정
- `GET /api/pdf/documents/{id}` API도 동일하게 수정

### 1.2 수정 파일
`backend/app/routers/pdf.py`

### 1.3 변경 내용

#### 1.3.1 `list_documents` 함수 (라인 145-150)

**변경 전**:
```python
# pages 디렉토리에서 전체 페이지 수 계산
pages_dir = doc_dir / "pages"
if not pages_dir.exists():
    continue

total_pages = len(list(pages_dir.glob("page_*.png")))
```

**변경 후**:
```python
# pages 디렉토리에서 전체 페이지 수 계산
pages_dir = doc_dir / "pages"
if not pages_dir.exists():
    continue

# Phase 14-2: PNG와 WebP 모두 지원
png_count = len(list(pages_dir.glob("page_*.png")))
webp_count = len(list(pages_dir.glob("page_*.webp")))
total_pages = png_count + webp_count

if total_pages == 0:
    continue
```

#### 1.3.2 `get_document_info` 함수 (라인 197-199)

**변경 전**:
```python
# pages 디렉토리에서 전체 페이지 수
pages_dir = doc_dir / "pages"
total_pages = len(list(pages_dir.glob("page_*.png")))
```

**변경 후**:
```python
# pages 디렉토리에서 전체 페이지 수
pages_dir = doc_dir / "pages"

# Phase 14-2: PNG와 WebP 모두 지원
png_count = len(list(pages_dir.glob("page_*.png")))
webp_count = len(list(pages_dir.glob("page_*.webp")))
total_pages = png_count + webp_count
```

### 1.4 검증
```bash
# API 테스트
curl http://localhost:8000/api/pdf/documents | jq '.[0].total_pages'
# 기대값: 198 (이전: 0)
```

---

## 단계 2: 블록 분석 인덱스 수정

### 2.1 목표
- `process_next_batch_progressive`에서 배치 내부 인덱스와 글로벌 페이지 인덱스를 올바르게 처리
- 11페이지 이후 블록이 정상적으로 분석되도록 수정

### 2.2 수정 파일
`src/pdf_pipeline.py`

### 2.3 변경 내용

#### 2.3.1 새 메서드 추가: `_analyze_page_batch_progressive` (라인 325 이후)

기존 `_analyze_page_batch` 메서드 바로 다음에 새 메서드 추가:

```python
def _analyze_page_batch_progressive(
    self,
    document_id: str,
    image_paths: List[Path],
    page_offset: int
) -> int:
    """
    Phase 14-1: 점진적 배치 블록 분석 (오프셋 지원)

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
```

#### 2.3.2 `process_next_batch_progressive` 함수 수정 (라인 553-559)

**변경 전**:
```python
# 블록 분석
analyzed = self._analyze_page_batch(
    document_id=document_id,
    image_paths=image_paths,
    start=start_page,
    end=end_page
)
```

**변경 후**:
```python
# 블록 분석 - 오프셋 기반 분석 사용
analyzed = self._analyze_page_batch_progressive(
    document_id=document_id,
    image_paths=image_paths,
    page_offset=start_page  # 글로벌 페이지 오프셋
)
```

### 2.4 검증
```bash
# 로그 확인 - 백그라운드 배치에서 블록 개수가 0이 아닌지 확인
# 기대: "배치 분석 완료: 11~20페이지, 총 XXX개 블록" (XXX > 0)
```

---

## 단계 3: 기존 문서 재처리

### 3.1 목표
- 이미 업로드된 문서의 누락된 블록 분석 수행
- 기존 이미지는 유지, 블록 JSON만 재생성

### 3.2 방법

#### 옵션 A: 문서 삭제 후 재업로드 (간단)
1. 프론트엔드에서 기존 문서 삭제
2. 동일 PDF 재업로드

#### 옵션 B: 수동 재분석 스크립트 (데이터 보존)
```python
# backend/scripts/reanalyze_blocks.py
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config
from pdf_pipeline import PDFPipeline

config = Config.load()
pipeline = PDFPipeline(config)

document_id = "베이직쎈 2-2"
doc_dir = config.get_document_dir(document_id)
pages_dir = doc_dir / "pages"

# 모든 WebP 이미지 경로
image_paths = sorted(pages_dir.glob("page_*.webp"))

# 전체 재분석 (기존 블록 덮어쓰기)
for i, image_path in enumerate(image_paths):
    if i < 10:
        continue  # 이미 분석된 첫 10페이지 스킵 (필요시)

    # 블록 분석...
    print(f"재분석: 페이지 {i + 1}")
```

### 3.3 권장 방법
**옵션 A 권장** - 버그 수정 후 문서를 삭제하고 재업로드하는 것이 가장 깔끔함

---

## 단계 4: 검증

### 4.1 API 검증
```bash
# 1. 문서 목록 API - total_pages 확인
curl http://localhost:8000/api/pdf/documents

# 기대 응답:
# [{"document_id": "베이직쎈 2-2", "total_pages": 198, "analyzed_pages": 198, ...}]
```

### 4.2 프론트엔드 검증
1. http://localhost:5173 접속
2. 문서 목록에서 "베이직쎈 2-2" 클릭
3. 페이지 네비게이션 확인 (1/198 표시)
4. 11페이지 이동 후 블록 표시 확인

### 4.3 백엔드 로그 검증
```
[백그라운드] 배치 처리: 11~20페이지
  페이지 11: XXX개 블록
  페이지 12: XXX개 블록
  ...
  → 배치 분석 완료: 11~20페이지, 총 XXX개 블록  (XXX > 0)
```

---

## 구현 순서

```
단계 1: pdf.py 수정 (WebP 지원)
    ↓
단계 2: pdf_pipeline.py 수정 (인덱스 오류)
    ↓
서버 자동 리로드 확인
    ↓
단계 3: 기존 문서 삭제 + 재업로드
    ↓
단계 4: 검증
```

---

## 롤백 계획

문제 발생 시:
1. `pdf.py` - `.png` 검색으로 복구
2. `pdf_pipeline.py` - 기존 `_analyze_page_batch` 호출로 복구
3. 기존 PNG 문서는 영향 없음

---

## 체크리스트

- [ ] 단계 1: `pdf.py` - `list_documents` WebP 지원 추가
- [ ] 단계 1: `pdf.py` - `get_document_info` WebP 지원 추가
- [ ] 단계 2: `pdf_pipeline.py` - `_analyze_page_batch_progressive` 메서드 추가
- [ ] 단계 2: `pdf_pipeline.py` - `process_next_batch_progressive` 수정
- [ ] 단계 3: 기존 문서 재처리
- [ ] 단계 4: API 검증
- [ ] 단계 4: 프론트엔드 검증

---

*계획 작성: Claude Code*
*날짜: 2025-11-27*
