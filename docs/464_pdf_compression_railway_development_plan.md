# PDF 서버사이드 압축 개발 계획

> 작성일: 2026-01-02
> 상태: 개발 계획
> 관련 리포트: [463_pdf_compression_quality_preservation_research.md](./463_pdf_compression_quality_preservation_research.md)

---

## 1. 개요

### 1.1 목표
- PDF 업로드 시 Railway Worker에서 2단계 압축 수행
- 1단계: 무손실 최적화 (garbage=4, deflate)
- 2단계: JPEG 90 이미지 압축 (항상 적용)
- 예상 결과: 85MB → 25-35MB (60-70% 감소)

### 1.2 아키텍처

```
[프론트엔드]                    [Railway Worker]              [Supabase]
     │                              │                            │
     │ 1. PDF 선택                  │                            │
     │ ──────────────────────────►  │                            │
     │    POST /compress-pdf        │                            │
     │    (multipart/form-data)     │                            │
     │                              │                            │
     │                         2. 압축 처리                       │
     │                         - 무손실 최적화                    │
     │                         - JPEG 90 압축                    │
     │                              │                            │
     │ 3. 압축된 PDF 반환           │                            │
     │ ◄──────────────────────────  │                            │
     │    (binary)                  │                            │
     │                              │                            │
     │ 4. Supabase Storage 업로드 ─────────────────────────────► │
     │                              │                            │
     │ 5. DB 메타데이터 저장 ───────────────────────────────────► │
```

---

## 2. 파일 생성/수정 순서

### Phase 1: Railway Worker 확장 (백엔드)

| 순서 | 파일 | 작업 | 의존성 |
|------|------|------|--------|
| 1-1 | `railway-worker/requirements.txt` | PyMuPDF 추가 | - |
| 1-2 | `railway-worker/pdf_compressor.py` | 압축 모듈 생성 | 1-1 |
| 1-3 | `railway-worker/worker.py` | 엔드포인트 추가 | 1-2 |
| 1-4 | `railway-worker/Dockerfile` | 의존성 확인 | 1-1 |

### Phase 2: 프론트엔드 통합

| 순서 | 파일 | 작업 | 의존성 |
|------|------|------|--------|
| 2-1 | `frontend/src/api/pdfCompression.ts` | Railway API 클라이언트 | Phase 1 |
| 2-2 | `frontend/src/hooks/useTextbooks.ts` | 업로드 플로우 수정 | 2-1 |
| 2-3 | `frontend/src/components/admin/TextbookUploader.tsx` | UI 업데이트 | 2-2 |

### Phase 3: 배포 및 테스트

| 순서 | 작업 | 의존성 |
|------|------|--------|
| 3-1 | Git push → Railway 자동 배포 | Phase 1 |
| 3-2 | Vercel 배포 (프론트엔드) | Phase 2 |
| 3-3 | E2E 테스트 | 3-1, 3-2 |

---

## 3. Phase 1: Railway Worker 확장

### 3.1 requirements.txt 수정

```diff
# railway-worker/requirements.txt

# Web Framework
flask==3.0.0
flask-cors==4.0.0
gunicorn==21.2.0

# Web Scraping
playwright==1.40.0
beautifulsoup4==4.12.2
lxml==5.1.0

# Supabase
supabase==2.10.0

# Environment
python-dotenv==1.0.0

# Utilities
requests==2.31.0

+ # PDF Compression
+ PyMuPDF==1.24.0
```

### 3.2 pdf_compressor.py (신규 생성)

```python
# railway-worker/pdf_compressor.py
"""
PDF 압축 모듈
- 2단계 압축: 무손실 최적화 + JPEG 90 이미지 압축
"""

import fitz  # PyMuPDF
import io
from typing import Tuple, Dict, Any

# 기본 JPEG 품질 (90 = 고품질)
DEFAULT_JPEG_QUALITY = 90


def compress_pdf(
    input_bytes: bytes,
    jpeg_quality: int = DEFAULT_JPEG_QUALITY
) -> Tuple[bytes, Dict[str, Any]]:
    """
    PDF 2단계 압축 수행

    Args:
        input_bytes: 원본 PDF 바이트
        jpeg_quality: JPEG 압축 품질 (1-100, 기본 90)

    Returns:
        (압축된 PDF 바이트, 통계 정보)
    """
    original_size = len(input_bytes)
    stats = {
        'original_size': original_size,
        'jpeg_quality': jpeg_quality,
        'images_processed': 0,
        'pages': 0,
    }

    # PDF 문서 열기
    doc = fitz.open(stream=input_bytes, filetype="pdf")
    stats['pages'] = doc.page_count

    # 이미지 압축 (JPEG 90)
    for page_num in range(doc.page_count):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_index, img_info in enumerate(image_list):
            xref = img_info[0]

            try:
                # 이미지 추출
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue

                image_bytes = base_image["image"]
                image_ext = base_image["ext"]

                # 이미 JPEG이고 작은 파일이면 스킵
                if image_ext == "jpeg" and len(image_bytes) < 50000:  # 50KB 이하
                    continue

                # Pixmap 생성
                pix = fitz.Pixmap(doc, xref)

                # CMYK → RGB 변환 (필요시)
                if pix.n > 4:  # CMYK
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                # JPEG로 재압축
                jpeg_bytes = pix.tobytes("jpeg", jpg_quality=jpeg_quality)

                # 이미지 교체 (xref 업데이트)
                # Note: PyMuPDF의 update_image 사용
                page.replace_image(xref, stream=jpeg_bytes)

                stats['images_processed'] += 1

            except Exception as e:
                # 개별 이미지 실패는 무시하고 계속
                print(f"[WARN] 이미지 압축 실패 (page {page_num}, xref {xref}): {e}")
                continue

    # 무손실 최적화 + 저장
    output_buffer = io.BytesIO()
    doc.save(
        output_buffer,
        garbage=4,           # 최대 정리 (중복 객체 제거)
        deflate=True,        # 스트림 압축
        deflate_images=True, # 이미지 스트림 압축
        deflate_fonts=True,  # 폰트 스트림 압축
        clean=True,          # 구문 정리
    )

    doc.close()

    compressed_bytes = output_buffer.getvalue()
    stats['compressed_size'] = len(compressed_bytes)
    stats['compression_ratio'] = round(
        (1 - len(compressed_bytes) / original_size) * 100, 1
    )

    return compressed_bytes, stats


def get_pdf_info(input_bytes: bytes) -> Dict[str, Any]:
    """
    PDF 정보 조회 (압축 없이)

    Args:
        input_bytes: PDF 바이트

    Returns:
        PDF 정보 (페이지 수, 이미지 수 등)
    """
    doc = fitz.open(stream=input_bytes, filetype="pdf")

    total_images = 0
    for page_num in range(doc.page_count):
        page = doc[page_num]
        total_images += len(page.get_images(full=True))

    info = {
        'pages': doc.page_count,
        'images': total_images,
        'size': len(input_bytes),
        'title': doc.metadata.get('title', ''),
        'author': doc.metadata.get('author', ''),
    }

    doc.close()
    return info
```

### 3.3 worker.py 수정

```python
# worker.py에 추가할 엔드포인트

# 기존 import에 추가
from pdf_compressor import compress_pdf, get_pdf_info

# ========================================
# Stage 46: PDF 압축 엔드포인트
# ========================================

@app.route('/compress-pdf', methods=['POST'])
def compress_pdf_endpoint():
    """
    PDF 압축 API

    Request:
        - file: PDF 파일 (multipart/form-data)
        - quality: JPEG 품질 (선택, 기본 90)

    Response:
        - 압축된 PDF 파일 (binary)
        - Headers에 통계 정보 포함
    """
    try:
        # 파일 검증
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Only PDF files allowed'}), 400

        # 품질 파라미터 (기본 90)
        quality = request.form.get('quality', 90, type=int)
        if not 1 <= quality <= 100:
            quality = 90

        # 파일 읽기
        input_bytes = file.read()
        original_size = len(input_bytes)

        print(f"📥 [COMPRESS] 수신: {file.filename} ({original_size / 1024 / 1024:.1f}MB)")

        # 압축 수행
        compressed_bytes, stats = compress_pdf(input_bytes, jpeg_quality=quality)

        print(f"✅ [COMPRESS] 완료: {stats['compressed_size'] / 1024 / 1024:.1f}MB ({stats['compression_ratio']}% 감소)")

        # 응답 헤더에 통계 정보 추가
        response = app.make_response(compressed_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="compressed_{file.filename}"'
        response.headers['X-Original-Size'] = str(stats['original_size'])
        response.headers['X-Compressed-Size'] = str(stats['compressed_size'])
        response.headers['X-Compression-Ratio'] = str(stats['compression_ratio'])
        response.headers['X-Images-Processed'] = str(stats['images_processed'])
        response.headers['X-Page-Count'] = str(stats['pages'])

        return response

    except Exception as e:
        print(f"❌ [COMPRESS] 실패: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/compress-pdf/info', methods=['POST'])
def pdf_info_endpoint():
    """
    PDF 정보 조회 (압축 없이)

    Request:
        - file: PDF 파일 (multipart/form-data)

    Response:
        - pages: 페이지 수
        - images: 이미지 수
        - size: 파일 크기
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        input_bytes = file.read()

        info = get_pdf_info(input_bytes)
        return jsonify(info)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### 3.4 Dockerfile 확인

PyMuPDF는 순수 Python 패키지이므로 추가 시스템 의존성 불필요.
기존 Dockerfile 그대로 사용 가능.

---

## 4. Phase 2: 프론트엔드 통합

### 4.1 pdfCompression.ts (신규 생성)

```typescript
// frontend/src/api/pdfCompression.ts
/**
 * Railway Worker PDF 압축 API 클라이언트
 * Stage 46: 서버사이드 PDF 압축
 */

/** Railway Worker URL */
const RAILWAY_WORKER_URL = import.meta.env.VITE_RAILWAY_WORKER_URL || 'https://pdf-production-xxxx.up.railway.app';

/** 압축 결과 */
export interface CompressionResult {
  /** 압축된 파일 */
  file: File;
  /** 원본 크기 (bytes) */
  originalSize: number;
  /** 압축된 크기 (bytes) */
  compressedSize: number;
  /** 압축률 (%) */
  compressionRatio: number;
  /** 처리된 이미지 수 */
  imagesProcessed: number;
  /** 페이지 수 */
  pageCount: number;
}

/** 압축 옵션 */
export interface CompressionOptions {
  /** JPEG 품질 (1-100, 기본 90) */
  quality?: number;
  /** 진행 콜백 */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Railway Worker에서 PDF 압축
 *
 * @param file 원본 PDF 파일
 * @param options 압축 옵션
 * @returns 압축 결과
 */
export async function compressPdfOnServer(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const { quality = 90, onProgress } = options;

  onProgress?.(10, 'Railway 서버로 전송 중...');

  // FormData 생성
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', String(quality));

  // Railway Worker 호출
  const response = await fetch(`${RAILWAY_WORKER_URL}/compress-pdf`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Compression failed: ${response.status}`);
  }

  onProgress?.(70, '압축 완료, 다운로드 중...');

  // 헤더에서 통계 정보 추출
  const originalSize = parseInt(response.headers.get('X-Original-Size') || '0', 10);
  const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0', 10);
  const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');
  const imagesProcessed = parseInt(response.headers.get('X-Images-Processed') || '0', 10);
  const pageCount = parseInt(response.headers.get('X-Page-Count') || '0', 10);

  // Blob → File 변환
  const blob = await response.blob();
  const compressedFile = new File([blob], file.name, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  onProgress?.(100, '완료!');

  return {
    file: compressedFile,
    originalSize,
    compressedSize,
    compressionRatio,
    imagesProcessed,
    pageCount,
  };
}

/**
 * Railway Worker 헬스체크
 */
export async function checkRailwayHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${RAILWAY_WORKER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

### 4.2 useTextbooks.ts 수정

```typescript
// useUploadTextbook 함수 수정

import { compressPdfOnServer } from '@/api/pdfCompression';

export function useUploadTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TextbookUploadInput & {
      onProgress?: (progress: number, message: string) => void;
    }): Promise<ClassBoundTextbook> => {
      const { onProgress } = input;

      // Supabase 미연결 시 Mock 업로드
      if (!isSupabaseConfigured) {
        // ... 기존 Mock 로직
      }

      // ========================================
      // Stage 46: Railway 서버에서 PDF 압축
      // ========================================
      onProgress?.(5, 'PDF 압축 준비 중...');

      let fileToUpload = input.file;
      let pageCount: number | undefined;

      try {
        // Railway Worker에서 압축
        const result = await compressPdfOnServer(input.file, {
          quality: 90,
          onProgress: (p, msg) => onProgress?.(5 + p * 0.5, msg), // 5-55%
        });

        fileToUpload = result.file;
        pageCount = result.pageCount;

        console.log(`✅ PDF 압축 완료: ${result.originalSize} → ${result.compressedSize} (${result.compressionRatio}% 감소)`);
      } catch (error) {
        console.warn('⚠️ PDF 압축 실패, 원본 업로드:', error);
        // 압축 실패 시 원본 그대로 업로드
      }

      // ========================================
      // Supabase Storage 업로드
      // ========================================
      onProgress?.(60, 'Supabase에 업로드 중...');

      const timestamp = Date.now();
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `textbooks/${input.classId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('textbooks')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage 업로드 실패:', uploadError);
        throw new Error(`파일 업로드 실패: ${uploadError.message}`);
      }

      onProgress?.(80, 'DB에 저장 중...');

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from('textbooks')
        .getPublicUrl(filePath);

      // DB에 메타데이터 저장
      const { data, error: dbError } = await ((supabase as any)
        .from('textbooks')
        .insert({
          class_id: input.classId,
          display_name: input.displayName,
          file_name: input.file.name,
          file_url: urlData.publicUrl,
          file_size: fileToUpload.size, // 압축된 크기
          page_count: pageCount,
        })
        .select()
        .single());

      if (dbError || !data) {
        await supabase.storage.from('textbooks').remove([filePath]);
        throw new Error(`메타데이터 저장 실패: ${dbError?.message || 'Unknown error'}`);
      }

      onProgress?.(100, '완료!');

      return {
        id: data.id,
        classId: data.class_id,
        displayName: data.display_name,
        fileName: data.file_name,
        fileUrl: data.file_url,
        fileSize: data.file_size,
        pageCount: data.page_count ?? undefined,
        uploadedAt: data.created_at,
        uploadedBy: data.uploaded_by ?? 'unknown',
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', variables.classId] });
    },
  });
}
```

### 4.3 TextbookUploader.tsx 수정

```typescript
// handleFileSelect 함수 수정

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // PDF 파일 검증
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('PDF 파일만 업로드 가능합니다.');
    return;
  }

  // 파일 크기 제한 (200MB) - 압축 후 업로드되므로 원본 제한 완화 가능
  const MAX_SIZE = 200 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    alert('파일 크기는 200MB 이하여야 합니다.');
    return;
  }

  const name = displayName.trim() || file.name.replace('.pdf', '');
  setUploadMessage('');

  try {
    await uploadMutation.mutateAsync({
      classId,
      displayName: name,
      file,
      onProgress: (progress, message) => {
        setUploadProgress(progress);
        setUploadMessage(message);
      },
    });

    // 초기화
    setDisplayName('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      setUploadProgress(0);
      setUploadMessage('');
    }, 2000);
  } catch (error) {
    console.error('업로드 실패:', error);
    alert('업로드에 실패했습니다. 다시 시도해주세요.');
    setUploadProgress(0);
    setUploadMessage('');
  }
};

// State 추가
const [uploadMessage, setUploadMessage] = useState('');

// UI에 메시지 표시
{uploadProgress > 0 && (
  <div className="mt-3">
    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
      <span>{uploadMessage}</span>
      <span>{uploadProgress}%</span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      />
    </div>
  </div>
)}
```

### 4.4 환경변수 추가

```bash
# frontend/.env.local
VITE_RAILWAY_WORKER_URL=https://pdf-production-xxxx.up.railway.app
```

---

## 5. 타입 정의

### 5.1 TextbookUploadInput 수정

```typescript
// frontend/src/types/textbook.ts

export interface TextbookUploadInput {
  classId: string;
  displayName: string;
  file: File;
  /** 진행 상태 콜백 */
  onProgress?: (progress: number, message: string) => void;
}
```

---

## 6. 에러 케이스 및 처리

| 에러 | 원인 | 처리 |
|------|------|------|
| Railway 서버 다운 | 서버 오류 | 원본 그대로 업로드 (fallback) |
| 타임아웃 (>120초) | 대용량 PDF | 청크 업로드 고려 또는 사용자 안내 |
| CORS 에러 | Railway 설정 | Flask-CORS 확인 |
| 메모리 부족 | Railway Free Plan | Pro 플랜 업그레이드 또는 분할 처리 |
| PyMuPDF 파싱 실패 | 손상된 PDF | 원본 업로드 + 사용자 알림 |

---

## 7. 테스트 체크리스트

### Phase 1 완료 후

- [ ] Railway Worker 로컬 테스트
  ```bash
  cd railway-worker
  pip install -r requirements.txt
  python worker.py
  # curl로 /compress-pdf 테스트
  ```

- [ ] Railway 배포 후 헬스체크
  ```bash
  curl https://pdf-production-xxxx.up.railway.app/health
  ```

### Phase 2 완료 후

- [ ] 프론트엔드 빌드 성공
  ```bash
  cd frontend && npm run build
  ```

- [ ] 10MB PDF 압축 테스트
- [ ] 50MB PDF 압축 테스트
- [ ] 85MB PDF 압축 테스트 (목표)

### Phase 3 완료 후

- [ ] Vercel 배포 성공
- [ ] 실제 교재 PDF 업로드 테스트
- [ ] 압축 결과 확인 (60-70% 감소 목표)
- [ ] 태블릿에서 300% 확대 시 품질 확인

---

## 8. 예상 결과

| 원본 크기 | 압축 후 | 압축률 | JPEG 품질 |
|----------|---------|--------|----------|
| 85MB | 25-35MB | 60-70% | 90 |
| 50MB | 15-20MB | 60-70% | 90 |
| 20MB | 6-8MB | 60-70% | 90 |

---

## 9. 롤백 계획

문제 발생 시:

1. **프론트엔드**: `compressPdfOnServer` 호출 제거, 기존 직접 업로드로 복귀
2. **Railway**: `/compress-pdf` 엔드포인트 비활성화
3. **Supabase**: 200MB 제한 유지

---

*이 계획은 [463_pdf_compression_quality_preservation_research.md](./463_pdf_compression_quality_preservation_research.md)를 기반으로 작성되었습니다.*
