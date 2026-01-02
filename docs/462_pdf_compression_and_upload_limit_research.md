# PDF 압축 및 업로드 제한 연구 리포트

> 작성일: 2026-01-02
> 상태: 연구 완료

---

## 1. 현재 상황

### 1.1 문제 현상
- 85.8MB PDF 파일 업로드 시 "The object exceeded the maximum allowed size" 에러 발생
- 압축 결과: 85.8MB → 85.8MB (0.0% 감소) - 압축 효과 없음
- Supabase Storage에서 업로드 거부됨

### 1.2 현재 설정
| 항목 | 설정값 | 위치 |
|------|--------|------|
| Supabase Storage 제한 | 200MB | Supabase Dashboard |
| 프론트엔드 제한 (TextbookUploader) | 200MB (수정됨) | TextbookUploader.tsx:48 |
| 프론트엔드 제한 (TextbookUploadModal) | 200MB | TextbookUploadModal.tsx:36 |
| 자동 압축 임계값 | 50MB | pdfCompressor.ts:52 |

---

## 2. 압축이 안 되는 이유 분석

### 2.1 현재 압축 방식 (pdfCompressor.ts)
```typescript
// pdf-lib 라이브러리 사용
// 압축 전략:
// 1. 메타데이터 제거 (title, author, subject, keywords 등)
// 2. useObjectStreams: true 옵션으로 객체 스트림 사용
```

### 2.2 pdf-lib의 한계
| 기능 | 지원 여부 | 비고 |
|------|----------|------|
| 메타데이터 제거 | ✅ 가능 | 몇 KB 절감 |
| 객체 스트림 최적화 | ✅ 가능 | 미미한 효과 |
| 이미지 리샘플링/압축 | ❌ 불가능 | pdf-lib 미지원 |
| 이미지 해상도 축소 | ❌ 불가능 | pdf-lib 미지원 |
| 폰트 서브셋팅 | ❌ 불가능 | pdf-lib 미지원 |
| 중복 이미지 제거 | ❌ 불가능 | pdf-lib 미지원 |

### 2.3 왜 0% 압축인가?
교재 PDF의 특성:
- **대부분 이미지 기반**: 스캔본 또는 이미지가 많은 PDF
- **이미 압축됨**: PDF 내부 이미지가 JPEG/PNG로 이미 압축된 상태
- **메타데이터 미미함**: 메타데이터 제거로 얻는 용량 절감이 거의 없음
- **pdf-lib 한계**: 이미지 품질 조정 기능이 없어 실질적 압축 불가

---

## 3. 업로드 실패 원인

### 3.1 Supabase 설정 확인 필요
Supabase Dashboard에서 200MB로 설정했지만 에러가 발생하는 이유:

1. **RLS 정책 미적용**: Storage 버킷의 RLS 정책이 업로드를 막고 있을 수 있음
2. **파일 타입 제한**: `application/pdf`만 허용 중인데 MIME 타입 감지 이슈
3. **Supabase Plan 제한**: 무료 플랜의 기본 제한이 있을 수 있음
4. **캐시된 설정**: 브라우저 또는 CDN 캐시로 이전 설정이 적용 중

### 3.2 확인 방법
```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM storage.buckets WHERE name = 'textbooks';
```

---

## 4. 해결 방안

### 4.1 방안 1: Supabase 설정 재확인 (권장)
**난이도**: 쉬움 | **효과**: 높음

1. Supabase Dashboard → Storage → textbooks 버킷
2. 설정 확인:
   - File size limit: 200MB (확인됨)
   - Allowed MIME types: application/pdf
3. RLS 정책 확인:
   - INSERT 정책이 올바르게 설정되어 있는지 확인
4. 캐시 무효화를 위해 브라우저 캐시 삭제

### 4.2 방안 2: 서버사이드 압축
**난이도**: 중간 | **효과**: 매우 높음

Python 백엔드에서 Ghostscript 또는 PyMuPDF를 사용한 실제 압축:

```python
# 예시: PyMuPDF (fitz) 사용
import fitz  # PyMuPDF

def compress_pdf(input_path, output_path, quality=50):
    doc = fitz.open(input_path)

    for page in doc:
        for xref in page.get_images():
            img = doc.extract_image(xref[0])
            # 이미지 압축 후 재삽입

    doc.save(output_path, garbage=4, deflate=True)
```

**장점**:
- 이미지 품질 조절 가능 (50~80% 품질로 60~80% 용량 감소)
- 실제 효과적인 압축

**단점**:
- 백엔드 개발 필요
- Railway 서버 리소스 사용
- 업로드 → 압축 → 저장 파이프라인 필요

### 4.3 방안 3: 클라이언트 사이드 이미지 압축 라이브러리
**난이도**: 높음 | **효과**: 높음

`pdfjs-dist` + Canvas API를 사용한 이미지 리렌더링:

```typescript
// 개념: PDF → Canvas → 낮은 품질 이미지 → 새 PDF
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

async function compressWithRerender(file: File): Promise<File> {
  // 1. PDF 페이지를 Canvas로 렌더링
  // 2. Canvas를 낮은 품질 JPEG로 변환
  // 3. 새 PDF 생성 후 이미지 삽입
}
```

**장점**:
- 서버 없이 클라이언트에서 처리
- 70~90% 용량 감소 가능

**단점**:
- 구현 복잡도 높음
- 텍스트 선택 불가능해짐 (이미지 기반으로 변환)
- 처리 시간 오래 걸림 (대용량 PDF)
- 메모리 사용량 높음

### 4.4 방안 4: 업로드 전 수동 압축 안내
**난이도**: 쉬움 | **효과**: 중간

사용자에게 외부 도구로 압축 후 업로드하도록 안내:

1. Adobe Acrobat의 "파일 크기 축소"
2. iLovePDF (웹 서비스)
3. Smallpdf (웹 서비스)

**장점**:
- 개발 비용 없음
- 즉시 적용 가능

**단점**:
- 사용자 경험 저하
- 외부 서비스 의존

### 4.5 방안 5: 분할 업로드 (Chunked Upload)
**난이도**: 높음 | **효과**: 높음

대용량 파일을 여러 청크로 나누어 업로드:

```typescript
// Supabase Storage는 Resumable Upload 지원
const { data, error } = await supabase.storage
  .from('textbooks')
  .upload(path, file, {
    upsert: true,
  });
```

**참고**: Supabase는 기본적으로 대용량 파일을 자동으로 청크 분할 처리함

---

## 5. 권장 해결 순서

### 즉시 (오늘)
1. **Supabase 버킷 설정 재확인**
   - File size limit: 200MB 확인
   - RLS 정책 확인 (INSERT 허용)

2. **직접 업로드 테스트**
   - Supabase Dashboard에서 직접 85MB 파일 업로드 시도
   - 성공하면 프론트엔드 문제, 실패하면 Supabase 설정 문제

### 단기 (1주일 내)
3. **클라이언트 압축 개선**
   - pdf-lib 대신 `pdf.js` + Canvas 리렌더링 방식 검토
   - 또는 압축 기능 제거하고 수동 압축 안내

### 중기 (필요시)
4. **서버사이드 압축**
   - Railway Worker에 압축 엔드포인트 추가
   - PyMuPDF 또는 Ghostscript 사용

---

## 6. 결론

### 핵심 문제
1. **pdf-lib는 이미지 압축을 지원하지 않음** → 0% 압축
2. **Supabase 설정이 제대로 적용되지 않았을 가능성** → 200MB 설정했지만 업로드 실패

### 우선 조치
1. Supabase Storage 버킷의 실제 제한 확인 (SQL 쿼리로)
2. RLS 정책이 업로드를 막고 있는지 확인
3. 브라우저 캐시 삭제 후 재시도

### 장기 방향
- 실질적 압축이 필요하면 서버사이드 압축 구현
- 또는 사용자에게 외부 도구 사용 안내

---

*이 리포트는 연구 목적으로 작성되었으며, 개발은 별도 요청 시 진행합니다.*
