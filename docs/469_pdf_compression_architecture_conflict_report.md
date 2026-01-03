# PDF 압축 아키텍처 충돌 연구 리포트

## 문서 정보
- **작성일**: 2026-01-03
- **Stage**: 46 (PDF 서버사이드 압축)
- **상태**: 🔴 연구 리포트

---

## 1. 문제 요약

### 증상
- 85MB PDF 업로드 시 **"The object exceeded the maximum allowed size"** 에러 반복
- 콘솔에 `[PDF-COMPRESS-MODULE]` 로그는 있지만 `[COMPRESS]` 로그 없음
- Network 탭에 `/compress-pdf` 요청 없음
- 압축 없이 **원본 85MB 파일이 바로 Supabase에 업로드** 시도

### 콘솔 로그 분석
```
[PDF-COMPRESS-MODULE] Railway PDF 압축 모듈 로드됨   ← 모듈은 로드됨
Storage 업로드 실패: The object exceeded the maximum allowed size   ← 압축 없이 업로드 시도
```

**누락된 로그**:
- `[COMPRESS] 시작: xxx.pdf (85.8MB)` ← Railway 압축 시작
- `Railway 서버로 전송 중...` ← 진행 상태

---

## 2. 근본 원인 발견

### 2.1 두 개의 업로드 훅 존재

| 훅 | 파일 | 압축 방식 | 사용 위치 |
|---|------|---------|----------|
| `useUploadTextbook` | `useTextbooks.ts` | **Railway Worker (PyMuPDF)** | 레거시 |
| `useCreateTextbook` | `useAllTextbooks.ts` | **클라이언트 (pdf-lib)** | **TextbookUploadModal** |

### 2.2 실제 사용되는 훅

```typescript
// TextbookUploadModal.tsx (교재 관리 페이지에서 사용)
import { useCreateTextbook } from '@/hooks/useAllTextbooks';
import { compressPdf } from '@/utils/pdfCompressor';  // ← 클라이언트 압축

const createMutation = useCreateTextbook();  // ← Railway 압축 없음!

// 50MB 초과 시 자동 압축 (클라이언트)
if (checkNeedsCompression(selectedFile.size)) {
  const result = await compressPdf(selectedFile, {...});  // pdf-lib 사용
  fileToUpload = result.file;
}

await createMutation.mutateAsync({...});  // ← 압축 안된 파일 or pdf-lib 압축된 파일
```

### 2.3 pdf-lib의 한계

```typescript
// pdfCompressor.ts
// pdf-lib는 이미지 압축을 직접 지원하지 않음
// 메타데이터 제거 + 객체 스트림만 최적화

pdfDoc.setTitle('');  // 메타데이터 제거
pdfDoc.setAuthor('');
// ...

const compressedBytes = await pdfDoc.save({
  useObjectStreams: true,  // 구조 최적화만
  addDefaultPage: false,
});
```

**결과**: 85MB PDF → **여전히 85MB 근처** (이미지가 압축되지 않음)

---

## 3. 아키텍처 분석

### 3.1 의도된 흐름 (Stage 46)

```
사용자 → TextbookUploader → useUploadTextbook → Railway Worker → 압축 → Supabase
                               (compressPdfOnServer)         (PyMuPDF JPEG 90)
```

### 3.2 실제 흐름 (현재)

```
사용자 → TextbookUploadModal → useCreateTextbook → pdf-lib(메타만) → Supabase
                                (useAllTextbooks)   (압축 거의 없음)
```

### 3.3 두 훅의 차이점

| 비교 항목 | useUploadTextbook | useCreateTextbook |
|----------|-------------------|-------------------|
| 파일 위치 | `useTextbooks.ts` | `useAllTextbooks.ts` |
| 압축 방식 | Railway Worker (서버) | pdf-lib (클라이언트) |
| 이미지 압축 | ✅ JPEG 90 | ❌ 없음 |
| 예상 압축률 | 60-70% | 0-5% |
| 85MB → | 25-35MB | 80-85MB |

---

## 4. 코드 경로 분석

### 4.1 사용 중인 컴포넌트

```
TextbookManagement.tsx
  └── TextbookUploadModal.tsx (업로드 버튼)
      └── useCreateTextbook()  ← Railway 압축 없음
      └── compressPdf() ← pdf-lib (효과 없음)
```

### 4.2 Railway 압축이 있는 훅 (사용 안됨)

```
useTextbooks.ts
  └── useUploadTextbook()  ← Railway 압축 있음
  └── compressPdfOnServer() ← 이것이 필요!
```

---

## 5. 해결 방안

### 방안 A: useCreateTextbook에 Railway 압축 추가 (권장)

```typescript
// useAllTextbooks.ts - useCreateTextbook 수정

import { compressPdfOnServer } from '@/api/pdfCompression';

export function useCreateTextbook() {
  return useMutation({
    mutationFn: async (input: TextbookCreateInput) => {
      // Railway Worker에서 압축 (JPEG 90)
      let fileToUpload = input.file;
      let pageCount: number | undefined;

      try {
        const result = await compressPdfOnServer(input.file, {
          quality: 90,
        });
        fileToUpload = result.file;
        pageCount = result.pageCount;
        console.log(`✅ PDF 압축 완료: ${result.compressionRatio}% 감소`);
      } catch (error) {
        console.warn('⚠️ PDF 압축 실패:', error);
        if (input.file.size > 50 * 1024 * 1024) {
          throw new Error('50MB 초과 파일은 압축이 필요합니다');
        }
      }

      // Storage 업로드...
    },
  });
}
```

### 방안 B: TextbookUploadModal에서 useUploadTextbook 사용

```typescript
// TextbookUploadModal.tsx 수정
import { useUploadTextbook } from '@/hooks/useTextbooks';

const uploadMutation = useUploadTextbook();  // Railway 압축 사용
```

### 방안 C: 통합 압축 훅 생성

두 훅을 하나로 통합하여 일관된 압축 경로 사용.

---

## 6. 권장 해결책

### 즉시 조치: 방안 A 적용

`useAllTextbooks.ts`의 `useCreateTextbook`에 Railway 압축 로직 추가.

**이유**:
1. 기존 UI 컴포넌트 수정 최소화
2. `TextbookUploadModal`은 `useCreateTextbook`을 사용하도록 설계됨
3. 압축 로직 일원화

### 수정 범위

| 파일 | 변경 |
|------|------|
| `useAllTextbooks.ts` | `compressPdfOnServer` import 및 호출 추가 |
| `TextbookUploadModal.tsx` | pdf-lib 압축 제거 (선택사항) |

---

## 7. 검증 방법

### 수정 후 확인사항

1. **콘솔 로그 확인**:
   ```
   [COMPRESS] 시작: xxx.pdf (85.8MB)
   [COMPRESS] 응답: 200 OK
   [COMPRESS] 성공: 30.2MB (64.8% 감소)
   ```

2. **Network 탭 확인**:
   - `/compress-pdf` POST 요청 존재
   - 응답 헤더: `X-Compression-Ratio: 64.8`

3. **Supabase 업로드 성공**:
   - 30-40MB 파일 업로드 성공
   - "The object exceeded the maximum allowed size" 에러 없음

---

## 8. 결론

### 문제 원인
`TextbookUploadModal`이 **Railway 압축이 없는 `useCreateTextbook` 훅**을 사용 중.
`pdf-lib` 클라이언트 압축은 **이미지를 압축하지 않아** 효과가 거의 없음.

### 해결책
`useCreateTextbook`에 **`compressPdfOnServer` (Railway Worker)** 압축 로직 추가.

### 예상 결과
- 85MB PDF → **25-35MB** (Railway PyMuPDF JPEG 90 압축)
- Supabase 50MB 제한 통과 ✅

---

*Stage 46 PDF 압축 아키텍처 충돌 연구 리포트 - 2026-01-03*
