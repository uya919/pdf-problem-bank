# Phase 14-1 블록 분석 버그 리포트

**날짜**: 2025-11-27
**심각도**: Critical
**상태**: 진단 완료, 수정 필요

---

## 1. 증상

### 사용자 보고
- PDF 업로드 후 1페이지만 표시됨
- 문서에 192~198페이지가 있으나 프론트엔드에서 페이지 네비게이션이 제한됨

### 로그 분석 결과
```
[Phase 14-1] 점진적 PDF 처리 시작: 베이직쎈 2-2
총 페이지: 198
파일 크기: 69.13 MB

[2/3] 첫 10페이지 이미지 변환... ✓
[3/3] 첫 10페이지 블록 분석...
  페이지 1: 508개 블록
  페이지 2: 895개 블록
  ...
  페이지 10: 694개 블록
  → 배치 분석 완료: 1~10페이지, 총 10157개 블록 ✓

[백그라운드] 배치 처리: 11~20페이지
  → 배치 분석 완료: 11~20페이지, 총 0개 블록 ⚠️  <-- 문제!

[백그라운드] 배치 처리: 21~30페이지
  → 배치 분석 완료: 21~30페이지, 총 0개 블록 ⚠️

... 모든 후속 배치에서 0개 블록
```

### 파일 시스템 확인
```
pages/: 198개 이미지 ✓ (모든 페이지 변환됨)
blocks/: 10개 JSON ⚠️ (첫 10페이지만 분석됨)
```

---

## 2. 근본 원인

### 버그 위치
`src/pdf_pipeline.py` - `process_next_batch_progressive()` 함수 (라인 500-573)

### 문제 코드
```python
def process_next_batch_progressive(self, document_id, pdf_path, start_page, batch_size, dpi):
    # ...

    # 이미지 변환 (예: 11~20페이지)
    image_paths = self.pdf_processor.convert_page_range(
        pdf_path, document_id,
        start_page, end_page,  # start_page=10, end_page=20
        dpi
    )
    # image_paths는 10개 항목 (인덱스 0~9)

    # 블록 분석
    analyzed = self._analyze_page_batch(
        document_id=document_id,
        image_paths=image_paths,  # 10개 항목
        start=start_page,  # 10  <-- 문제!
        end=end_page       # 20  <-- 문제!
    )
```

### `_analyze_page_batch` 내부
```python
def _analyze_page_batch(self, document_id, image_paths, start, end, ...):
    for i in range(start, end):  # range(10, 20)
        if i >= len(image_paths):  # 10 >= 10 → True!
            break  # 즉시 종료!

        image_path = image_paths[i]  # 실행되지 않음
        # ...
```

### 요약
- `image_paths`는 현재 배치의 이미지만 포함 (인덱스 0~9)
- `start`와 `end`는 전체 문서 기준의 글로벌 인덱스 (10~20)
- `range(10, 20)`에서 `i=10`일 때 `i >= len(image_paths)` 조건이 참이 되어 루프 즉시 종료
- 결과: 11페이지 이후 블록이 전혀 분석되지 않음

---

## 3. 영향 범위

| 항목 | 영향 |
|------|------|
| 첫 10페이지 | 정상 처리 ✓ |
| 11페이지 이후 | 이미지만 생성, 블록 분석 안됨 ⚠️ |
| 프론트엔드 | 블록 JSON이 없는 페이지는 빈 상태로 표시됨 |
| 그룹핑/라벨링 | 11페이지 이후 작업 불가 |

---

## 4. 해결 방안

### 옵션 A: `process_next_batch_progressive`에서 인덱스 수정 (권장)

```python
def process_next_batch_progressive(self, document_id, pdf_path, start_page, batch_size, dpi):
    # ...

    # 이미지 변환
    image_paths = self.pdf_processor.convert_page_range(
        pdf_path, document_id,
        start_page, end_page,
        dpi
    )

    # 블록 분석 - 로컬 인덱스 사용
    analyzed = self._analyze_page_batch_with_offset(
        document_id=document_id,
        image_paths=image_paths,
        page_offset=start_page,  # 글로벌 페이지 오프셋
        batch_size=len(image_paths)
    )
```

### 옵션 B: 기존 `_analyze_page_batch` 직접 수정

```python
# 블록 분석 - 배치 내부 인덱스 사용
analyzed = self._analyze_page_batch(
    document_id=document_id,
    image_paths=image_paths,
    start=0,  # 배치 내부 인덱스
    end=len(image_paths),
    page_offset=start_page  # 새 파라미터: JSON 저장시 사용
)
```

---

## 5. 추가 발견 사항

### 프론트엔드 1페이지 표시 문제

로그에서 확인된 API 호출:
```
GET /api/blocks/documents/베이직쎈 2-2/pages/0 HTTP/1.1" 200 OK
GET /api/blocks/documents/베이직쎈 2-2/groups/0 HTTP/1.1" 200 OK
```

프론트엔드가 `total_pages` 값을 올바르게 받고 있는지 확인 필요.
`meta.json`에는 `total_pages: 198`이 정확히 저장되어 있음.

가능한 원인:
1. 프론트엔드에서 `analyzed_pages` 기준으로 페이지 수를 표시하는 경우
2. API가 잘못된 값을 반환하는 경우
3. 캐시 문제

---

## 6. 즉시 조치 사항

1. **버그 수정**: `process_next_batch_progressive`의 인덱스 로직 수정
2. **기존 문서 재처리**: 이미 업로드된 문서의 나머지 페이지 블록 분석 재실행
3. **테스트**: 전체 파이프라인 검증

---

## 7. 코드 수정 계획

### 파일: `src/pdf_pipeline.py`

#### 변경 전 (라인 553-559)
```python
# 블록 분석
analyzed = self._analyze_page_batch(
    document_id=document_id,
    image_paths=image_paths,
    start=start_page,
    end=end_page
)
```

#### 변경 후
```python
# 블록 분석 - 배치 내부 인덱스 사용, 페이지 오프셋 적용
analyzed = self._analyze_page_batch_progressive(
    document_id=document_id,
    image_paths=image_paths,
    page_offset=start_page  # 글로벌 페이지 번호 오프셋
)
```

#### 새 메서드 추가
```python
def _analyze_page_batch_progressive(
    self,
    document_id: str,
    image_paths: List[Path],
    page_offset: int
) -> int:
    """
    Phase 14-1: 점진적 배치 블록 분석

    Args:
        document_id: 문서 ID
        image_paths: 현재 배치의 이미지 경로 (인덱스 0부터 시작)
        page_offset: 글로벌 페이지 인덱스 오프셋

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

        # 컬럼 정보 생성
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

    print(f"  → 배치 분석 완료: {page_offset+1}~{page_offset+len(image_paths)}페이지, 총 {total_blocks}개 블록")

    return analyzed_count
```

---

## 8. 추가 버그 발견: WebP 형식 호환성 문제

### 증상
- `GET /api/pdf/documents` API가 `total_pages: 0` 반환
- 프론트엔드에서 페이지 네비게이션이 작동하지 않음

### 근본 원인

**파일**: `backend/app/routers/pdf.py`

**문제 코드 (라인 150, 199)**:
```python
# list_documents (라인 150)
total_pages = len(list(pages_dir.glob("page_*.png")))  # PNG만 검색!

# get_document_info (라인 199)
total_pages = len(list(pages_dir.glob("page_*.png")))  # PNG만 검색!
```

**원인**:
- Phase 14-2에서 이미지 형식을 PNG → WebP로 변경
- 그러나 API는 여전히 `.png` 파일만 검색
- 결과: WebP 문서의 `total_pages`가 0으로 반환됨

### 해결 방안

```python
# PNG와 WebP 모두 검색
png_pages = list(pages_dir.glob("page_*.png"))
webp_pages = list(pages_dir.glob("page_*.webp"))
total_pages = len(png_pages) + len(webp_pages)

# 또는 더 간단히
total_pages = len([p for p in pages_dir.iterdir() if p.suffix in ['.png', '.webp']])
```

### 영향
- 모든 새로 업로드된 문서에서 페이지 수가 0으로 표시됨
- 페이지 네비게이션 불가
- 기존 PNG 문서는 정상 동작

---

## 9. 버그 요약

| 버그 | 위치 | 영향 | 심각도 |
|------|------|------|--------|
| 블록 분석 인덱스 오류 | `pdf_pipeline.py` | 11페이지 이후 블록 분석 안됨 | Critical |
| WebP 파일 미검색 | `pdf.py` | total_pages=0 반환 | Critical |

---

*리포트 작성: Claude Code*
*날짜: 2025-11-27*
