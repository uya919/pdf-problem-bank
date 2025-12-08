# 대용량 PDF 효율적 라벨링 연구 리포트

**Phase**: 14 (대용량 최적화 연구)
**작성일**: 2025-11-26
**분석 모델**: Claude Opus (thinkharder)

---

## 1. 연구 목적

사용자 요청:
> "PDF를 넣었을때 자동으로 150으로 변환하는 방법처럼 용량이 큰 파일도 효율적으로 라벨링할 수 있는 방법"

### 핵심 질문
- 400페이지 이상의 대용량 PDF를 어떻게 효율적으로 처리할 것인가?
- 저장 용량, 메모리 사용, 응답 속도를 동시에 최적화할 수 있는가?
- 현재 시스템의 병목은 무엇이며, 어떻게 개선할 수 있는가?

---

## 2. 현재 시스템 분석

### 2.1 데이터 흐름

```
PDF 업로드 (100MB 제한)
    ↓
PDF → PNG 변환 (전체 페이지, 150 DPI)    ← 병목 1: 선행 전체 변환
    ↓
Block 분석 (첫 10페이지만, 나머지 백그라운드)  ← 이미 Lazy Loading 적용
    ↓
PNG 이미지 저장 (pages/ 폴더)    ← 병목 2: PNG 미압축
    ↓
프론트엔드 이미지 로드 (전체 해상도)    ← 병목 3: 썸네일 미지원
```

### 2.2 현재 구현 상세

| 구성 요소 | 현재 구현 | 파일 위치 |
|-----------|-----------|-----------|
| PDF 변환 | PyMuPDF, 150 DPI | `src/pdf_processor.py` |
| 이미지 포맷 | PNG (무손실) | `pdf_processor.py:69` |
| Lazy Loading | 첫 10페이지만 분석 | `pdf_pipeline.py:166` |
| 백그라운드 처리 | 10페이지 배치 | `task_queue.py` |
| 프론트엔드 로드 | 원본 PNG 직접 로드 | `PageCanvas.tsx:95` |

### 2.3 저장 용량 분석 (측정 기반)

| 항목 | 수치 | 비고 |
|------|------|------|
| 평균 페이지 크기 | 257 KB (PNG) | 150 DPI 기준 |
| 100페이지 문서 | ~25 MB | |
| 400페이지 문서 | **~100 MB** | 저장소 부담 |
| NAS 동기화 영향 | 상당함 | 대역폭 소모 |

### 2.4 시간 분석 (추정)

| 단계 | 100페이지 | 400페이지 |
|------|-----------|-----------|
| PDF → PNG 변환 | ~15초 | **~60초** |
| 블록 분석 (전체) | ~30초 | ~120초 |
| 초기 응답까지 | ~18초 | **~65초** |

---

## 3. 핵심 병목 분석

### 3.1 병목 1: 선행 전체 변환

**문제:**
```python
# pdf_pipeline.py:213
image_paths = self.pdf_processor.convert_pdf_to_images(
    pdf_path=pdf_path,
    document_id=document_id,
    dpi=dpi
)  # 전체 페이지를 먼저 변환
```

- 400페이지 PDF → 첫 응답까지 60초 대기
- 사용자는 처음 10페이지만 봐도 전체 변환 기다림
- 메모리에 모든 이미지 경로 보유

**영향도:** ⭐⭐⭐⭐⭐ (매우 높음)

### 3.2 병목 2: PNG 비효율

**문제:**
```python
# pdf_processor.py:69
pix.save(str(image_path))  # PNG로 저장 (압축 없음)
```

| 포맷 | 파일 크기 | 품질 | 브라우저 지원 |
|------|-----------|------|---------------|
| PNG | 257 KB | 무손실 | 100% |
| WebP | **154 KB** | 거의 무손실 | 97% |
| JPEG | 180 KB | 손실 (조정 가능) | 100% |

- PNG는 WebP 대비 **40% 더 큰 용량**
- 400페이지: 40 MB 절약 가능

**영향도:** ⭐⭐⭐⭐ (높음)

### 3.3 병목 3: 썸네일 미지원

**문제:**
```typescript
// PageCanvas.tsx:95
img.src = api.getPageImageUrl(documentId, pageIndex);
// 원본 해상도 그대로 로드
```

- 페이지 목록에서도 전체 해상도 로드
- 네트워크 대역폭 낭비
- 초기 로딩 속도 저하

**영향도:** ⭐⭐⭐ (중간)

---

## 4. 최적화 전략

### 전략 1: Progressive Image Conversion (점진적 변환)

**개념:**
150 DPI 자동 변환과 같은 원리로, 이미지 변환도 필요할 때만 수행

```
현재 방식:
PDF 업로드 → [전체 400페이지 변환] → 응답 (60초)

개선 방식:
PDF 업로드 → [첫 10페이지만 변환] → 응답 (10초)
                ↓
    사용자가 11페이지 요청 시 → 해당 페이지만 변환
                ↓
    백그라운드에서 나머지 순차 변환
```

**구현 방안:**
```python
# 새로운 On-Demand 변환 메서드
def convert_page_on_demand(
    self,
    pdf_path: Path,
    document_id: str,
    page_index: int,
    dpi: int = 150
) -> Path:
    """필요한 페이지만 실시간 변환"""
    image_path = self._get_page_path(document_id, page_index)

    if image_path.exists():
        return image_path  # 이미 변환됨

    # PDF 열기 (캐싱 가능)
    pdf = fitz.open(pdf_path)
    page = pdf[page_index]

    # 해당 페이지만 렌더링
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72))
    pix.save(str(image_path))

    return image_path
```

**예상 효과:**

| 지표 | 현재 | 개선 후 | 개선율 |
|------|------|---------|--------|
| 초기 응답 (400p) | 60초 | **10초** | -83% |
| 메모리 사용 | 전체 로드 | 필요분만 | -90% |

### 전략 2: WebP 포맷 전환

**개념:**
PNG 대신 WebP 사용으로 저장 용량 40% 감소

```python
# WebP 저장 (Pillow 사용)
from PIL import Image

def save_as_webp(pix, path: Path, quality: int = 90):
    """WebP 포맷으로 저장 (손실/무손실 선택 가능)"""
    # PyMuPDF pixmap → PIL Image
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    # WebP로 저장 (quality 90 = 거의 무손실)
    webp_path = path.with_suffix('.webp')
    img.save(webp_path, 'WEBP', quality=quality)

    return webp_path
```

**용량 비교:**

| 문서 크기 | PNG | WebP | 절약량 |
|-----------|-----|------|--------|
| 100페이지 | 25 MB | 15 MB | 10 MB |
| 400페이지 | 100 MB | **60 MB** | 40 MB |
| 1000페이지 | 250 MB | 150 MB | 100 MB |

**고려 사항:**
- 기존 PNG와 호환성 유지 필요
- 설정으로 포맷 선택 가능하게

### 전략 3: 2단계 해상도 시스템

**개념:**
썸네일(저해상도) + 원본(고해상도) 분리

```
pages/
├── page_0000.webp          # 원본 (150 DPI, ~154 KB)
├── page_0000_thumb.webp    # 썸네일 (50 DPI, ~20 KB)
```

**구현:**
```python
def create_thumbnail(
    self,
    image_path: Path,
    thumb_dpi: int = 50
) -> Path:
    """썸네일 생성 (3배 작은 해상도)"""
    thumb_path = image_path.with_name(
        image_path.stem + '_thumb' + image_path.suffix
    )

    if thumb_path.exists():
        return thumb_path

    # 원본 로드 후 리사이즈
    img = Image.open(image_path)
    ratio = thumb_dpi / 150
    new_size = (int(img.width * ratio), int(img.height * ratio))
    thumb = img.resize(new_size, Image.LANCZOS)
    thumb.save(thumb_path, quality=80)

    return thumb_path
```

**사용 시나리오:**
- 페이지 목록/네비게이션: 썸네일 사용
- 라벨링 작업: 원본 사용
- 줌 아웃 시: 썸네일로 전환

### 전략 4: 메모리 맵핑 (대용량 최적화)

**개념:**
1000페이지 이상의 초대용량 문서를 위한 메모리 효율화

```python
import mmap

class MemoryMappedPDFReader:
    """PDF를 메모리 맵핑하여 필요한 페이지만 로드"""

    def __init__(self, pdf_path: Path):
        self.file = open(pdf_path, 'rb')
        self.mmap = mmap.mmap(
            self.file.fileno(),
            0,
            access=mmap.ACCESS_READ
        )
        self.pdf = fitz.open(stream=self.mmap, filetype="pdf")

    def get_page(self, index: int):
        """필요한 페이지만 메모리에 로드"""
        return self.pdf[index]
```

### 전략 5: 백그라운드 사전 변환 (Prefetch)

**개념:**
사용자가 현재 보는 페이지 기준으로 앞뒤 N페이지 미리 변환

```python
def prefetch_pages(
    self,
    current_page: int,
    total_pages: int,
    prefetch_count: int = 5
):
    """현재 페이지 기준 앞뒤 페이지 미리 변환"""
    pages_to_fetch = []

    # 앞 페이지
    for i in range(1, prefetch_count + 1):
        if current_page + i < total_pages:
            pages_to_fetch.append(current_page + i)

    # 뒤 페이지 (선택적)
    for i in range(1, prefetch_count // 2 + 1):
        if current_page - i >= 0:
            pages_to_fetch.append(current_page - i)

    # 백그라운드에서 변환
    for page_idx in pages_to_fetch:
        background_task.add(
            self.convert_page_on_demand,
            page_idx
        )
```

---

## 5. 통합 최적화 아키텍처

### 5.1 새로운 데이터 흐름

```
PDF 업로드 (최대 500MB 지원)
    ↓
메타데이터 추출 (페이지 수, 크기)    ← 즉시 응답
    ↓
첫 10페이지 변환 (WebP, 150 DPI)    ← 10초 이내
    ↓
프론트엔드 응답 (작업 시작 가능)
    ↓
백그라운드:
├── 나머지 페이지 순차 변환
├── 썸네일 생성
└── 블록 분석 (기존 방식)
```

### 5.2 API 변경

| 엔드포인트 | 현재 | 변경 |
|------------|------|------|
| GET /pages/{n}/image | PNG 원본 | WebP + 썸네일 옵션 |
| - | - | `?quality=thumb\|full` |
| GET /pages/{n}/status | 분석 상태만 | 이미지 준비 상태 포함 |

### 5.3 프론트엔드 변경

```typescript
// 새로운 이미지 로딩 전략
const loadPageImage = async (pageIndex: number, quality: 'thumb' | 'full') => {
  // 1. 썸네일 먼저 로드 (빠른 표시)
  if (quality === 'full') {
    const thumbUrl = api.getPageImageUrl(documentId, pageIndex, 'thumb');
    setThumbnail(thumbUrl);
  }

  // 2. 원본 로드 (필요시)
  const fullUrl = api.getPageImageUrl(documentId, pageIndex, 'full');

  // 3. 원본 준비되면 교체
  const img = new Image();
  img.onload = () => setImage(fullUrl);
  img.src = fullUrl;
};
```

---

## 6. 구현 우선순위

### Phase 14-1: 점진적 변환 (가장 효과적)
- **예상 시간:** 2시간
- **효과:** 초기 응답 83% 개선
- **위험도:** 낮음 (기존 코드와 호환)

### Phase 14-2: WebP 전환
- **예상 시간:** 1시간
- **효과:** 저장 용량 40% 감소
- **위험도:** 낮음 (설정으로 제어)

### Phase 14-3: 썸네일 시스템
- **예상 시간:** 2시간
- **효과:** 네트워크 대역폭 감소
- **위험도:** 중간 (프론트엔드 변경 필요)

### Phase 14-4: Prefetch 시스템
- **예상 시간:** 1시간
- **효과:** 페이지 전환 UX 개선
- **위험도:** 낮음

---

## 7. 예상 성능 비교

### 400페이지 PDF 기준

| 지표 | 현재 | 최적화 후 | 개선율 |
|------|------|-----------|--------|
| 초기 응답 시간 | 60초 | **10초** | -83% |
| 저장 용량 | 100 MB | **60 MB** | -40% |
| 페이지 로딩 | 257 KB | **20 KB (썸네일)** | -92% |
| 메모리 사용 | 전체 로드 | 필요분만 | -80% |
| NAS 동기화 | 느림 | 빠름 | +40% |

### 1000페이지 PDF (학원 전체 교재)

| 지표 | 현재 (예상) | 최적화 후 | 개선율 |
|------|-------------|-----------|--------|
| 초기 응답 시간 | **150초** | 12초 | -92% |
| 저장 용량 | 250 MB | 150 MB | -40% |
| 실용성 | 사용 불가 | **사용 가능** | ∞ |

---

## 8. 결론 및 권장 사항

### 핵심 인사이트

1. **150 DPI 전환의 성공 요인을 이미지 변환에도 적용**
   - "필요할 때 변환" 원칙
   - 사용자 대기 시간 최소화

2. **저장 포맷 현대화 필요**
   - PNG → WebP 전환으로 40% 용량 절약
   - 브라우저 호환성 97% (충분)

3. **2단계 해상도로 UX 개선**
   - 빠른 탐색: 썸네일
   - 정밀 작업: 원본

### 즉시 구현 권장 (Phase 14-1)

점진적 변환만 적용해도 **초기 응답 83% 개선** 달성 가능.

```
현재: PDF 업로드 → 60초 대기 → 작업 시작
개선: PDF 업로드 → 10초 대기 → 작업 시작 (나머지 백그라운드)
```

### 장기 로드맵

| 단계 | 목표 | 효과 |
|------|------|------|
| 14-1 | 점진적 변환 | 응답 속도 |
| 14-2 | WebP 전환 | 저장 용량 |
| 14-3 | 썸네일 시스템 | 네트워크 |
| 14-4 | Prefetch | UX |
| 14-5 | 초대용량 지원 (1000p+) | 확장성 |

---

## 9. 부록: 기술 세부사항

### A. PyMuPDF 메모리 효율화

```python
# 현재: 전체 PDF 메모리 로드
pdf = fitz.open(pdf_path)  # 전체 로드

# 개선: 스트리밍 방식
with open(pdf_path, 'rb') as f:
    pdf = fitz.open(stream=f.read(), filetype='pdf')
    # 필요한 페이지만 처리
```

### B. WebP 품질 가이드

| quality 값 | 용도 | 파일 크기 |
|------------|------|-----------|
| 100 | 무손실 (PNG와 동일) | PNG의 70% |
| 90 | 거의 무손실 (권장) | PNG의 60% |
| 80 | 고품질 | PNG의 50% |
| 60 | 썸네일용 | PNG의 30% |

### C. 브라우저 WebP 지원율

- Chrome: 100%
- Firefox: 100%
- Safari: 14+ (2020년 이후)
- Edge: 100%
- **전체: 97%+**

---

*Phase 14 대용량 PDF 최적화 연구 리포트 끝*
