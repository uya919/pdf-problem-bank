# PDF 압축 품질 보존 연구 리포트

> 작성일: 2026-01-02
> 상태: 연구 완료

---

## 1. 연구 목적

**목표**: 품질 저하를 최소화하면서 PDF 용량을 최대한 줄이는 방법 비교 분석

**현재 상황**:
- 85.8MB PDF → pdf-lib 압축 → 0% 감소 (실패)
- pdf-lib는 이미지 압축 미지원

---

## 2. 압축 방식 분류

### 2.1 무손실 압축 (Lossless)
| 방식 | 용량 감소 | 품질 손실 |
|------|----------|----------|
| 메타데이터 제거 | 1-5% | ❌ 없음 |
| 중복 객체 제거 (garbage=4) | 5-25% | ❌ 없음 |
| 스트림 압축 (deflate) | 10-30% | ❌ 없음 |
| 객체 스트림 (use_objstms) | 10-25% | ❌ 없음 |

### 2.2 손실 압축 (Lossy)
| 방식 | 용량 감소 | 품질 손실 |
|------|----------|----------|
| JPEG Quality 95 | 20-40% | 거의 없음 |
| JPEG Quality 90 | 40-60% | 미미함 |
| JPEG Quality 85 | 50-70% | 눈에 띄기 시작 |
| JPEG Quality 80 | 60-80% | 확대 시 보임 |
| 해상도 축소 (300→150 DPI) | 70-85% | 확대 시 흐림 |

---

## 3. JPEG 품질별 상세 비교

### 3.1 품질 등급 정의

| 품질 | 등급 | 용도 | 비고 |
|------|------|------|------|
| 95-100% | 최고품질 | 원본 보존용 | Sony 카메라 Fine: 97% |
| 90-95% | 고품질 | 인쇄용 | 품질 저하 거의 안 보임 |
| 85-90% | 중상품질 | 웹 히어로 이미지 | MS Paint 기본값: 85% |
| 80-85% | 표준품질 | 일반 콘텐츠 | **최적 균형점** |
| 70-80% | 저품질 | 썸네일 | 품질 저하 눈에 띔 |

### 3.2 교재 PDF 권장 설정

**혜윰 교재 특성**:
- 스캔본 기반 (이미지 중심)
- 태블릿에서 줌인하여 필기
- 300% 확대 빈번

**권장**: **JPEG Quality 85-90**
- 이유: 300% 확대 시에도 텍스트 가독성 유지
- 예상 압축률: 50-65%
- 85MB → 약 30-42MB

### 3.3 재저장(Re-save) 주의사항

> ⚠️ **중요**: JPEG는 재저장할 때마다 품질이 누적 손실됨

```
원본 → 90% 저장 → 다시 75% 저장 = 실제 67.5% 품질
(90% × 75% = 67.5%)
```

**결론**: 원본에서 한 번만 압축해야 함

---

## 4. 압축 구현 방식 비교

### 4.1 방식 A: Railway 서버사이드 (Python PyMuPDF)

```python
import fitz  # PyMuPDF

def compress_pdf(input_path, output_path, jpeg_quality=85):
    doc = fitz.open(input_path)

    for page in doc:
        for xref in page.get_images():
            # 이미지 추출 → JPEG 압축 → 재삽입
            img = doc.extract_image(xref[0])
            pix = fitz.Pixmap(doc, xref[0])

            # JPEG로 재압축
            jpeg_bytes = pix.tobytes("jpg", jpg_quality=jpeg_quality)

            # 이미지 교체
            doc._updateObject(xref[0], jpeg_bytes)

    # 무손실 최적화 + 저장
    doc.save(output_path,
             garbage=4,      # 중복 제거
             deflate=True,   # 스트림 압축
             use_objstms=True)  # 객체 스트림
```

| 항목 | 내용 |
|------|------|
| **예상 압축률** | 60-80% |
| **품질 손실** | JPEG 85-90 → 최소화 |
| **구현 난이도** | 중간 |
| **처리 시간** | 10-30초 (85MB 기준) |
| **장점** | 강력한 이미지 처리, 안정적 |
| **단점** | 서버 리소스 사용, 업로드 필요 |

### 4.2 방식 B: WASM Ghostscript (클라이언트)

```javascript
// 브라우저에서 Ghostscript WASM 실행
const gs = await loadGhostscript();
const result = await gs.compress(pdfBuffer, {
  dPDFSETTINGS: '/ebook',  // 150 DPI
  // 또는
  dPDFSETTINGS: '/printer', // 300 DPI
  dColorImageResolution: 150,
  dGrayImageResolution: 150,
  dMonoImageResolution: 300
});
```

| 항목 | 내용 |
|------|------|
| **예상 압축률** | 70-90% |
| **품질 손실** | 설정에 따라 다름 |
| **구현 난이도** | 높음 |
| **처리 시간** | 30초-2분 (클라이언트 성능 의존) |
| **장점** | 서버 비용 없음, 오프라인 가능 |
| **단점** | WASM 로딩 시간, 메모리 사용 높음 |

### 4.3 방식 C: 무손실 최적화만 (pdf-lib 개선)

```typescript
// 현재 pdf-lib + 메타데이터 제거만
// 이미지 압축 없이 구조만 최적화

const pdfDoc = await PDFDocument.load(buffer);
pdfDoc.setTitle('');
pdfDoc.setAuthor('');
// ... 메타데이터 제거

const bytes = await pdfDoc.save({
  useObjectStreams: true,
  addDefaultPage: false,
});
```

| 항목 | 내용 |
|------|------|
| **예상 압축률** | 0-10% |
| **품질 손실** | ❌ 없음 |
| **구현 난이도** | 낮음 (현재 구현됨) |
| **처리 시간** | 1-3초 |
| **장점** | 빠름, 품질 완벽 보존 |
| **단점** | 실질적 압축 효과 없음 |

### 4.4 방식 D: 하이브리드 (PyMuPDF 무손실)

```python
# 이미지 압축 없이 PyMuPDF의 무손실 최적화만 사용
doc = fitz.open(input_path)
doc.save(output_path,
         garbage=4,       # 최대 정리
         deflate=True,    # 스트림 압축
         use_objstms=True) # 객체 스트림
```

| 항목 | 내용 |
|------|------|
| **예상 압축률** | 20-40% |
| **품질 손실** | ❌ 없음 |
| **구현 난이도** | 낮음 |
| **처리 시간** | 5-15초 |
| **장점** | 품질 100% 보존, 상당한 압축 |
| **단점** | 서버 필요, 대용량엔 부족할 수 있음 |

---

## 5. 방식별 종합 비교

### 5.1 85MB PDF 기준 예상 결과

| 방식 | 결과 용량 | 품질 | 처리 시간 | 서버 필요 |
|------|----------|------|----------|----------|
| A. Railway PyMuPDF (JPEG 85) | **17-30MB** | ★★★★☆ | 10-30초 | ✅ 필요 |
| B. WASM Ghostscript | **8-25MB** | ★★★☆☆ | 30초-2분 | ❌ 불필요 |
| C. pdf-lib 무손실 | 85MB (변화 없음) | ★★★★★ | 1-3초 | ❌ 불필요 |
| D. PyMuPDF 무손실 | **50-68MB** | ★★★★★ | 5-15초 | ✅ 필요 |

### 5.2 품질-용량 균형 매트릭스

```
품질 보존 ↑
    │
    │  C. pdf-lib 무손실 (85MB)
    │  ●
    │
    │  D. PyMuPDF 무손실 (50-68MB)
    │  ●
    │
    │           A. Railway JPEG 90 (25-35MB)
    │           ●
    │
    │                A. Railway JPEG 85 (17-30MB)
    │                ●
    │
    │                      B. Ghostscript ebook (8-25MB)
    │                      ●
    │
    └────────────────────────────────────→ 압축률 ↑
```

---

## 6. 권장 전략

### 6.1 혜윰 교재 최적 방안: **Railway PyMuPDF (JPEG 90)**

**이유**:
1. 태블릿 300% 확대에서도 텍스트 선명
2. 85MB → 약 25-35MB (60-70% 감소)
3. Supabase 200MB 제한 충분히 만족
4. Railway Worker 이미 구축됨

**설정값**:
```python
jpeg_quality = 90  # 품질 우선
garbage = 4        # 최대 정리
deflate = True     # 스트림 압축
```

### 6.2 대안: 2단계 압축

품질 최우선 시:

```
1단계: PyMuPDF 무손실 (garbage=4, deflate=True)
       85MB → 약 60MB (30% 감소)

2단계: 60MB가 200MB 이하면 업로드 완료
       초과 시 → JPEG 90 적용
```

---

## 7. Railway 구현 상세 계획

### 7.1 엔드포인트

```
POST /api/compress-pdf
Content-Type: multipart/form-data

Body:
- file: PDF 파일
- quality: 90 (기본값)
- lossless_only: false (기본값)
```

### 7.2 응답

```json
{
  "success": true,
  "original_size": 89653248,
  "compressed_size": 28500000,
  "compression_ratio": 68.2,
  "download_url": "https://...",
  "quality_setting": 90
}
```

### 7.3 프론트엔드 플로우

```
[사용자 PDF 선택]
    ↓
[50MB 초과?] ─No→ [직접 Supabase 업로드]
    ↓ Yes
[Railway로 전송]
    ↓
[서버 압축 (JPEG 90)]
    ↓
[압축된 PDF 반환]
    ↓
[Supabase 업로드]
```

---

## 8. 결론

### 핵심 요약

| 질문 | 답변 |
|------|------|
| Railway로 해결 가능? | ✅ **가능** - PyMuPDF로 실질적 압축 |
| 품질 손실 최소화? | JPEG 90 사용 시 300% 확대해도 OK |
| 예상 압축률? | 60-70% (85MB → 25-35MB) |
| 구현 난이도? | 중간 (Railway Worker 확장) |

### 권장 설정

```python
# 혜윰 교재 최적 설정
JPEG_QUALITY = 90      # 높은 품질 유지
GARBAGE_LEVEL = 4      # 최대 정리
DEFLATE = True         # 스트림 압축
USE_OBJSTMS = True     # 객체 스트림 활성화
```

---

## 참고 자료

- [PyMuPDF Optimization Techniques](https://medium.com/@pymupdf/optimizing-pdf-file-size-with-pymupdf-three-essential-techniques-cdd20a301c11)
- [PyMuPDF Documentation - Document.save()](https://pymupdf.readthedocs.io/en/latest/document.html)
- [JPEG Quality Comparison 80% vs 90%](https://sirv.com/help/articles/jpeg-quality-comparison/)
- [PDF Optimization Methods](https://www.gdpicture.com/blog/pdf-optimization-series-part1-methods/)
- [Complete Image Compression Guide 2025](https://www.imgcraftlab.com/blog/complete-image-compression-guide-2025)
- [Ghostscript WASM Demo](https://github.com/laurentmmeyer/ghostscript-pdf-compress.wasm)

---

*이 리포트는 연구 목적으로 작성되었으며, 개발은 별도 요청 시 진행합니다.*
