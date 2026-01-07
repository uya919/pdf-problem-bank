# 417. 교재 관리 시스템 개선 연구 리포트

> Stage 18 개선: 교재 관리 분리 + PDF 자동 압축

---

## 1. 요청 사항 분석

### 현재 구조의 문제점
```
현재: 반 관리 → TextbookUploader (반별 PDF 업로드)
```

- 같은 교재를 여러 반에서 사용할 경우 **중복 업로드** 필요
- 교재 관리와 반 관리가 **결합**되어 있음
- 50MB 제한으로 큰 PDF 업로드 불가

### 개선 요청
1. **교재 관리 페이지 분리**: 교재를 한 곳에서 등록/관리
2. **반 관리에서 교재 선택**: 등록된 교재 중 선택하여 사용
3. **PDF 자동 압축**: 50MB 초과 시 자동 압축

---

## 2. 시스템 구조 개선안

### 2.1 개선된 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    교재 관리 페이지                          │
│  /admin/textbooks                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📚 교재 목록                              [+ 교재 추가] │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 📄 베이직쎈 고1 공통수학      15.2 MB   사용: 3개반    │   │
│  │ 📄 개념원리 RPM 고1          12.0 MB   사용: 2개반    │   │
│  │ 📄 쎈 중3 상                  8.5 MB   사용: 1개반    │   │
│  │ 📄 블랙라벨 고2 수학1        22.3 MB   사용: 0개반    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                         교재 선택
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    반 관리 페이지                            │
│  /admin/classes/:classId                                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 고1A반 설정                                          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 사용 교재:                                           │   │
│  │ ┌──────────────────┐ ┌──────────────────┐           │   │
│  │ │ ✓ 베이직쎈 고1   │ │ ✓ 개념원리 RPM   │           │   │
│  │ └──────────────────┘ └──────────────────┘           │   │
│  │                                                     │   │
│  │ [+ 교재 추가]                                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 모델 변경

```sql
-- 기존: textbooks 테이블 (반별 교재)
-- 개선: 교재 + 반-교재 연결 테이블 분리

-- 1. 교재 테이블 (전체 교재 관리)
CREATE TABLE textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,        -- "베이직쎈 고1"
  file_name TEXT NOT NULL,           -- 원본 파일명
  file_url TEXT NOT NULL,            -- Storage URL
  file_size INTEGER NOT NULL,        -- bytes
  original_size INTEGER,             -- 압축 전 크기 (압축된 경우)
  page_count INTEGER,                -- 페이지 수
  grade TEXT,                        -- "고1", "중3" 등 (태그)
  subject TEXT,                      -- "수학", "영어" 등 (태그)
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 반-교재 연결 테이블
CREATE TABLE class_textbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  textbook_id UUID REFERENCES textbooks(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,   -- 표시 순서
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, textbook_id)
);
```

### 2.3 사용 플로우

```
[관리자]
    │
    ├─→ 교재 관리 페이지
    │       │
    │       ├─→ PDF 업로드 (50MB 초과 시 자동 압축)
    │       ├─→ 교재 정보 편집
    │       └─→ 교재 삭제 (사용 중인 반 확인)
    │
    └─→ 반 관리 페이지
            │
            └─→ 교재 선택 모달
                    │
                    ├─→ 등록된 교재 목록에서 선택
                    ├─→ 선택한 교재 순서 변경
                    └─→ 교재 연결 해제
```

---

## 3. PDF 압축 기술 연구

### 3.1 압축 방식 비교

| 방식 | 위치 | 장점 | 단점 |
|------|------|------|------|
| **클라이언트 압축** | 브라우저 | 서버 부하 없음, 업로드 전 미리보기 | 브라우저 성능 제한, 큰 파일 처리 어려움 |
| **서버 압축** | Backend | 강력한 압축, 안정성 | 서버 리소스 필요, 업로드 시간 증가 |
| **외부 API** | 3rd Party | 전문 압축 품질 | 비용, 개인정보 우려, 의존성 |

### 3.2 클라이언트 압축 (권장)

#### 라이브러리 옵션

| 라이브러리 | 크기 | 압축률 | 특징 |
|-----------|------|--------|------|
| **pdf-lib** | ~300KB | 낮음 | 메타데이터 제거, 간단한 최적화 |
| **pdfjs + canvas** | 이미 설치됨 | 중간 | 이미지 품질 조정으로 압축 |
| **Ghostscript (WASM)** | ~10MB | 높음 | ILOVEPDF 수준, 무겁고 복잡 |

#### 권장 접근: **pdf-lib + 이미지 리샘플링**

```typescript
// 압축 전략
interface CompressionStrategy {
  // 1단계: 메타데이터 제거 (10-20% 감소)
  removeMetadata: boolean;

  // 2단계: 이미지 품질 조정 (30-50% 감소)
  imageQuality: number;  // 0.6 ~ 0.9
  maxImageDimension: number;  // 1500px

  // 3단계: 폰트 서브셋 (5-15% 감소)
  subsetFonts: boolean;
}
```

### 3.3 ILOVEPDF 스타일 압축 구현

```typescript
/**
 * PDF 압축 유틸리티
 */
export async function compressPdf(
  file: File,
  options: {
    targetSizeMB?: number;  // 목표 크기 (기본: 50MB)
    quality?: 'low' | 'medium' | 'high';  // 압축 품질
  } = {}
): Promise<{
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}> {
  const { targetSizeMB = 50, quality = 'medium' } = options;
  const targetSize = targetSizeMB * 1024 * 1024;

  // 이미 목표 크기 이하면 그대로 반환
  if (file.size <= targetSize) {
    return {
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 1.0,
    };
  }

  // 품질별 설정
  const qualitySettings = {
    low: { imageQuality: 0.5, maxDimension: 1000 },
    medium: { imageQuality: 0.7, maxDimension: 1500 },
    high: { imageQuality: 0.85, maxDimension: 2000 },
  };

  const settings = qualitySettings[quality];

  // 압축 실행 (pdf-lib 사용)
  const pdfBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // 1. 메타데이터 제거
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  // 2. 이미지 압축 (각 페이지의 이미지 리샘플링)
  // ... 이미지 처리 로직

  // 3. 압축된 PDF 저장
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,  // 객체 스트림 압축
    addDefaultPage: false,
  });

  const compressedFile = new File(
    [compressedBytes],
    file.name,
    { type: 'application/pdf' }
  );

  return {
    compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    compressionRatio: compressedFile.size / file.size,
  };
}
```

### 3.4 압축 UI/UX

```
┌─────────────────────────────────────────────────────────────┐
│  PDF 업로드                                                  │
│                                                             │
│  📄 교재_원본.pdf                                            │
│  ─────────────────────────────────────────────────          │
│  원본 크기: 85.2 MB (50MB 초과)                              │
│                                                             │
│  ⚠️ 파일이 50MB를 초과합니다. 압축이 필요합니다.              │
│                                                             │
│  압축 품질 선택:                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                       │
│  │ 높음    │ │ 중간    │ │ 낮음    │                       │
│  │ ~70MB   │ │ ~45MB   │ │ ~30MB   │                       │
│  │ 고품질  │ │ 권장 ✓  │ │ 저용량  │                       │
│  └─────────┘ └─────────┘ └─────────┘                       │
│                                                             │
│  [압축 후 업로드]                                            │
│                                                             │
│  ────────────────────────────────────────────── 45%         │
│  이미지 최적화 중... (12/28 페이지)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 기술적 제한사항 및 대안

### 4.1 브라우저 압축의 한계

| 제한 | 영향 | 대안 |
|------|------|------|
| 메모리 제한 | 100MB+ 파일 처리 어려움 | 청크 단위 처리, Web Worker 사용 |
| 처리 시간 | 큰 파일 압축에 수 분 소요 | 진행률 표시, 백그라운드 처리 |
| 이미지 품질 | 복잡한 이미지 손실 가능 | 품질 옵션 제공, 미리보기 |

### 4.2 서버 압축 대안 (추후 고려)

```python
# backend/app/services/pdf_compressor.py
# Ghostscript 또는 PyMuPDF 사용

import subprocess
from pathlib import Path

def compress_pdf_server(
    input_path: Path,
    output_path: Path,
    quality: str = "ebook"  # screen, ebook, printer, prepress
) -> dict:
    """
    서버 사이드 PDF 압축 (Ghostscript 사용)

    품질 옵션:
    - screen: 72 dpi, 최대 압축
    - ebook: 150 dpi, 권장
    - printer: 300 dpi, 고품질
    - prepress: 300 dpi, 최고품질
    """
    cmd = [
        "gs",
        "-sDEVICE=pdfwrite",
        f"-dPDFSETTINGS=/{quality}",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        f"-sOutputFile={output_path}",
        str(input_path)
    ]

    subprocess.run(cmd, check=True)

    return {
        "original_size": input_path.stat().st_size,
        "compressed_size": output_path.stat().st_size,
    }
```

### 4.3 외부 API 옵션 (참고)

| 서비스 | 가격 | API | 특징 |
|--------|------|-----|------|
| ILOVEPDF | $6/월 (2,500건) | REST | 고품질, GDPR 준수 |
| Smallpdf | $12/월 | REST | 다양한 기능 |
| Adobe PDF Services | 사용량 기반 | REST | 최고 품질 |

---

## 5. 개발 계획 (Phase 18-E ~ 18-G)

### Phase 18-E: 교재 관리 페이지 (교재 CRUD)

```
파일 생성:
├── frontend/src/pages/admin/TextbookManagement.tsx
├── frontend/src/components/admin/textbook/
│   ├── TextbookList.tsx
│   ├── TextbookUploadModal.tsx
│   └── TextbookEditModal.tsx
└── frontend/src/hooks/useAllTextbooks.ts
```

**작업 내용**:
1. 교재 목록 페이지 UI
2. 교재 업로드 모달 (압축 옵션 포함)
3. 교재 정보 편집/삭제
4. 사용 중인 반 표시

### Phase 18-F: 반-교재 연결 시스템

```
파일 수정/생성:
├── frontend/src/hooks/useClassTextbooks.ts
├── frontend/src/components/admin/class/
│   └── TextbookSelector.tsx
└── Supabase: class_textbooks 테이블
```

**작업 내용**:
1. 반 설정에서 교재 선택 UI
2. 교재 연결/해제 API
3. 순서 변경 (드래그 앤 드롭)

### Phase 18-G: PDF 압축 기능

```
파일 생성:
├── frontend/src/utils/pdfCompressor.ts
├── frontend/src/components/admin/textbook/
│   └── CompressionProgress.tsx
└── npm install: pdf-lib
```

**작업 내용**:
1. pdf-lib 설치 및 압축 유틸리티
2. 압축 품질 선택 UI
3. 압축 진행률 표시
4. 압축 전/후 크기 비교

---

## 6. 예상 작업량

| Phase | 작업 | 예상 난이도 |
|-------|------|------------|
| 18-E | 교재 관리 페이지 | 중 |
| 18-F | 반-교재 연결 | 중 |
| 18-G | PDF 압축 | 상 |

---

## 7. 결론 및 권장사항

### 권장 접근법

1. **1단계**: 교재 관리 분리 (Phase 18-E, 18-F)
   - 즉시 구현 가능
   - 교재 중복 문제 해결

2. **2단계**: 클라이언트 압축 (Phase 18-G)
   - pdf-lib 기반 경량 압축
   - 50MB 초과 파일만 압축 적용

3. **3단계 (추후)**: 서버 압축 고려
   - 고품질 압축이 필요한 경우
   - Ghostscript 또는 외부 API

### 주의사항

- 압축 시 **페이지 내용 손실 주의** (특히 수학 공식, 그래프)
- 압축 전 **미리보기 제공** 권장
- **원본 크기 저장**으로 압축 이력 관리

---

*작성일: 2025-12-21*
*Stage 18 개선 연구*
