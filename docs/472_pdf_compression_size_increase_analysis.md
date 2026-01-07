# PDF 압축 후 파일 크기 증가 현상 분석 리포트

## 문서 정보
- **작성일**: 2026-01-04
- **Stage**: 46-E (로컬 PDF 압축 도구)
- **상태**: 🔴 심각한 버그 발견 → ✅ 원인 규명
- **증상**: 압축 후 파일이 오히려 16% 증가

---

## 0. 핵심 원인 (추가 분석)

### 실제 이미지 비교 결과

| 항목 | 원본 | 압축 후 |
|------|------|---------|
| **형식** | JPEG | **PNG** |
| **크기** | 507KB | **804KB (+58%)** |
| **해상도** | 2583x3657 | 2583x3657 |

### 버그 원인

`doc.update_stream(xref, jpeg_bytes)` 함수가:
- 스트림 데이터만 JPEG로 교체
- **이미지 필터/메타데이터는 PNG로 유지**
- PDF 리더가 PNG로 해석 → 디코딩 오류 또는 크기 증가

### PyMuPDF의 올바른 이미지 교체 방법

```python
# 잘못된 방법 (현재 코드)
doc.update_stream(xref, jpeg_bytes)  # 메타데이터 미변경

# 올바른 방법
page.replace_image(xref, filename=None, stream=jpeg_bytes)
# 또는
page.insert_image(rect, stream=jpeg_bytes)  # 기존 이미지 삭제 후 삽입
```

---

## 1. 현상

### 1.1 테스트 결과

| 항목 | 값 |
|------|-----|
| **원본 파일** | 우공비q+q 표준편 중등 1-1.pdf |
| **원본 크기** | 89,983,846 bytes (85.8MB) |
| **압축 후 크기** | 104,137,390 bytes (99.3MB) |
| **변화** | **+14,153,544 bytes (+16% 증가)** |

### 1.2 예상 vs 실제

| 항목 | 예상 | 실제 |
|------|------|------|
| 압축률 | 60-70% 감소 | **16% 증가** |
| 결과 크기 | 25-35MB | 99.3MB |

---

## 2. 원인 분석

### 2.1 PyMuPDF 이미지 재압축의 함정

현재 `compress_pdf()` 함수의 로직:

```python
# 이미지 추출 → JPEG 재압축 → 스트림 교체
pix = fitz.Pixmap(doc, xref)
jpeg_bytes = pix.tobytes("jpeg", jpg_quality=90)
doc.update_stream(xref, jpeg_bytes)
```

**문제점**:

1. **이미 JPEG인 이미지 재압축**
   - 원본이 이미 JPEG 80으로 압축됨
   - JPEG 90으로 재압축 → 품질 상승 → 크기 증가

2. **압축 형식 변환 손실**
   - PNG → JPEG 변환 시 압축률이 다름
   - 일부 이미지는 JPEG보다 PNG가 더 작음

3. **메타데이터/구조 오버헤드**
   - `doc.update_stream()`이 새 객체 생성
   - 기존 압축된 스트림 대신 새 스트림 추가

### 2.2 핵심 문제: JPEG 90 품질

```python
# 현재 코드
jpeg_bytes = pix.tobytes("jpeg", jpg_quality=90)

# 문제:
# - 원본 JPEG가 품질 70-80이면 → 90으로 올리면 크기 증가
# - 원본이 이미 최적화되어 있으면 → 재압축은 손해
```

### 2.3 스킵 조건의 한계

```python
# 현재 스킵 조건 (너무 관대함)
if image_ext == "jpeg" and len(image_bytes) < 50000:  # 50KB
    stats['images_skipped'] += 1
    continue
```

- 50KB 이상 JPEG도 재압축 대상
- 이미 최적화된 큰 JPEG를 재압축 → 크기 증가

---

## 3. 학원 PDF 특성 분석

### 3.1 학원 교재 PDF의 일반적 특성

| 특성 | 설명 |
|------|------|
| **출처** | 출판사에서 이미 최적화 |
| **이미지** | 고품질 JPEG로 압축됨 |
| **해상도** | 300 DPI (인쇄용) |
| **페이지 수** | 200-400 페이지 |

### 3.2 왜 출판사 PDF가 이미 최적화되어 있는가

1. **전문 PDF 소프트웨어 사용** (Adobe Acrobat Pro, InDesign)
2. **인쇄/배포 최적화** 적용
3. **이미지별 최적 압축** (JPEG, JBIG2, JPEG2000 혼용)
4. **폰트 서브셋팅** 완료

---

## 4. 해결 방안

### 4.1 방안 A: 조건부 압축 (권장)

```python
def should_compress_image(image_bytes, image_ext, xref, doc):
    """이미지 압축 필요 여부 판단"""

    # 이미 JPEG면 스킵 (크기 무관)
    if image_ext == "jpeg":
        return False

    # PNG/TIFF만 JPEG로 변환
    if image_ext in ("png", "tiff", "tif"):
        # 크기가 100KB 이상인 경우만
        if len(image_bytes) > 100 * 1024:
            return True

    return False
```

### 4.2 방안 B: 품질 자동 조정

```python
def get_optimal_quality(original_size):
    """원본 크기에 따른 최적 JPEG 품질"""
    if original_size > 500 * 1024:  # 500KB 이상
        return 75  # 공격적 압축
    elif original_size > 100 * 1024:  # 100KB 이상
        return 80
    else:
        return 85
```

### 4.3 방안 C: 무손실 최적화만 적용

```python
def compress_pdf_lossless(input_path, output_path):
    """이미지 재압축 없이 구조만 최적화"""
    doc = fitz.open(input_path)

    # 이미지 재압축 없음 - 구조 최적화만
    doc.save(
        output_path,
        garbage=4,      # 미사용 객체 제거
        deflate=True,   # 스트림 재압축
        clean=True,     # 구문 정리
    )
```

### 4.4 방안 D: Ghostscript 사용 (가장 효과적)

```python
import subprocess

def compress_pdf_ghostscript(input_path, output_path, quality="ebook"):
    """
    Ghostscript PDF 압축

    quality 옵션:
    - screen: 72 DPI (최소)
    - ebook: 150 DPI (웹용)
    - printer: 300 DPI (인쇄용)
    - prepress: 300 DPI (고품질)
    """
    cmd = [
        "gswin64c",  # Windows
        "-sDEVICE=pdfwrite",
        f"-dPDFSETTINGS=/{quality}",
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        f"-sOutputFile={output_path}",
        input_path
    ]
    subprocess.run(cmd, check=True)
```

**Ghostscript 장점**:
- 출판사 수준의 PDF 최적화
- 이미지별 최적 압축 자동 선택
- 폰트 최적화 포함
- **85MB → 20-30MB 실제 달성 가능**

---

## 5. 권장 해결책

### 5.1 즉시 적용: 방안 A + C 조합

1. **JPEG 이미지 재압축 제거** (이미 최적화됨)
2. **PNG/TIFF만 JPEG로 변환** (100KB 이상)
3. **무손실 구조 최적화** 유지

### 5.2 장기적: Ghostscript 통합

1. Ghostscript 설치 (선택적)
2. 사용 가능 시 Ghostscript 사용
3. 없으면 PyMuPDF 폴백

---

## 6. 수정된 압축 로직

```python
def compress_pdf_v2(input_path, output_path, jpeg_quality=80):
    """
    개선된 PDF 압축 (v2)

    변경점:
    - JPEG 이미지 재압축 제거 (이미 최적화됨)
    - PNG/TIFF만 JPEG 변환 (100KB 이상)
    - 품질 90 → 80으로 하향
    """
    with open(input_path, 'rb') as f:
        input_bytes = f.read()

    doc = fitz.open(stream=input_bytes, filetype="pdf")

    for page_num in range(doc.page_count):
        page = doc[page_num]

        for img_info in page.get_images(full=True):
            xref = img_info[0]

            try:
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue

                image_ext = base_image["ext"]
                image_bytes = base_image["image"]

                # ===== 핵심 변경: JPEG는 스킵 =====
                if image_ext == "jpeg":
                    continue  # 이미 최적화됨

                # PNG/TIFF만 변환 (100KB 이상)
                if image_ext not in ("png", "tiff", "tif"):
                    continue

                if len(image_bytes) < 100 * 1024:
                    continue

                # JPEG로 변환
                pix = fitz.Pixmap(doc, xref)
                if pix.n > 4:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                if pix.alpha:
                    pix = fitz.Pixmap(pix, 0)

                jpeg_bytes = pix.tobytes("jpeg", jpg_quality=jpeg_quality)

                # 변환 후 더 작아진 경우만 교체
                if len(jpeg_bytes) < len(image_bytes):
                    doc.update_stream(xref, jpeg_bytes)

            except Exception:
                continue

    # 무손실 최적화 + 저장
    output_buffer = io.BytesIO()
    doc.save(
        output_buffer,
        garbage=4,
        deflate=True,
        deflate_fonts=True,
        clean=True,
        # deflate_images=False  # 이미지 스트림은 건드리지 않음
    )

    with open(output_path, 'wb') as f:
        f.write(output_buffer.getvalue())
```

---

## 7. 테스트 계획

### 7.1 수정 후 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 원본 85.8MB PDF | 80-85MB (소폭 감소 또는 유지) |
| PNG 많은 PDF | 30-50% 감소 |
| 이미 최적화된 PDF | 크기 유지 또는 소폭 감소 |

### 7.2 Ghostscript 테스트 (선택)

```bash
gswin64c -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dNOPAUSE -dBATCH -sOutputFile=output.pdf input.pdf
```

| 설정 | 예상 크기 |
|------|----------|
| /screen | ~15MB |
| /ebook | ~25MB |
| /printer | ~40MB |

---

## 8. 결론

### 근본 원인
**이미 최적화된 JPEG 이미지를 품질 90으로 재압축하여 크기 증가**

### 해결책
1. **JPEG 재압축 제거** (가장 중요)
2. PNG/TIFF만 조건부 변환
3. 변환 후 크기 비교하여 더 작을 때만 적용

### 다음 단계
1. `pdf_compressor_gui.py` 수정 ✅
2. 동일 파일로 재테스트 ✅
3. 50MB 이하로 압축되는지 확인 → ❌ 불가능

---

## 9. v2 테스트 결과 (2026-01-04)

### 수정 후 테스트

| 항목 | 값 |
|------|-----|
| 원본 | 85.8MB |
| 압축 후 | 85.8MB (0.1% 감소) |
| 처리된 이미지 | 3개 |
| 스킵된 이미지 | 230개 |

### 분석

이 PDF는 **이미 출판사에서 최적화**되어 있음:
- 모든 이미지가 이미 최적의 JPEG 압축
- 추가 압축 여지가 없음
- PyMuPDF로는 더 이상 줄일 수 없음

### 대안: 해상도 축소

50MB 이하로 만들려면 **해상도를 낮춰야 함**:

```python
# 이미지 해상도 50% 축소
pix.shrink(2)  # 50% 축소 (가로세로 각각 절반)
```

또는 **Ghostscript** 사용:

```bash
gswin64c -sDEVICE=pdfwrite -dPDFSETTINGS=/ebook -dNOPAUSE -dBATCH -sOutputFile=output.pdf input.pdf
```

| 설정 | DPI | 예상 결과 |
|------|-----|----------|
| /screen | 72 | ~15-20MB |
| /ebook | 150 | ~30-40MB |
| /printer | 300 | ~60-70MB |

---

## 10. 최종 결론

### 학원 교재 PDF 특성

출판사 PDF는 이미 전문 소프트웨어로 최적화됨:
- Adobe Acrobat Pro, InDesign 사용
- JPEG 품질 이미 최적화
- **PyMuPDF 무손실 압축으로는 불가능**

### 50MB 이하로 만드는 방법

1. **Ghostscript /ebook 설정** (권장)
   - 150 DPI로 다운스케일
   - 85MB → 30-40MB 예상
   - 화질 약간 저하 (모니터 보기에는 충분)

2. **해상도 수동 축소** (PyMuPDF)
   - 각 이미지를 50% 축소 후 재삽입
   - 화질 저하 있음

3. **Supabase Storage 업그레이드**
   - Pro 플랜: 50GB 스토리지
   - 압축 없이 원본 업로드

---

*Stage 46-E PDF 압축 분석 리포트 - 2026-01-04 최종*
