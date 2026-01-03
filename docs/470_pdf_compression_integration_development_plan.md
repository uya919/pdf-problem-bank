# PDF 압축 통합 단계별 개발 계획

## 문서 정보
- **작성일**: 2026-01-03
- **Stage**: 46-B (PDF 압축 통합)
- **상태**: 📋 개발 계획
- **선행 문서**: [469_pdf_compression_architecture_conflict_report.md](469_pdf_compression_architecture_conflict_report.md)

---

## 1. 목표

`useCreateTextbook` 훅에 Railway Worker 압축 로직을 추가하여 85MB PDF가 25-35MB로 압축된 후 Supabase에 업로드되도록 수정.

---

## 2. 수정 대상 파일

| 순서 | 파일 | 변경 내용 |
|-----|------|----------|
| 1 | `frontend/src/hooks/useAllTextbooks.ts` | Railway 압축 로직 추가 |
| 2 | `frontend/src/components/admin/textbook/TextbookUploadModal.tsx` | pdf-lib 압축 제거 (중복 방지) |

---

## 3. 단계별 개발 계획

### Phase 1: useAllTextbooks.ts 수정

#### 1.1 Import 추가

```typescript
// 기존 import 유지
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// 추가할 import
import { compressPdfOnServer } from '@/api/pdfCompression';
```

#### 1.2 TextbookCreateInput 타입 확장

```typescript
// 기존 타입 (types/textbook.ts에서 import)
export interface TextbookCreateInput {
  displayName: string;
  file: File;
  subject?: string;
  curriculum?: string;
  grade?: string;
}

// 진행률 콜백 추가 (선택사항)
export interface TextbookCreateInputWithProgress extends TextbookCreateInput {
  onProgress?: (progress: number, message: string) => void;
}
```

#### 1.3 useCreateTextbook 수정

```typescript
export function useCreateTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TextbookCreateInput & {
      onProgress?: (progress: number, message: string) => void;
    }): Promise<Textbook> => {
      const { onProgress } = input;

      // Supabase 미연결 시 Mock 업로드 (기존 코드 유지)
      if (!isSupabaseConfigured) {
        // ... 기존 Mock 로직
      }

      // ========================================
      // Stage 46-B: Railway Worker에서 PDF 압축
      // ========================================
      onProgress?.(5, 'PDF 압축 준비 중...');

      let fileToUpload = input.file;
      let pageCount: number | undefined;

      const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
      const needsCompression = input.file.size > FILE_SIZE_LIMIT;

      if (needsCompression) {
        console.log(`[UPLOAD] 파일 크기 ${(input.file.size / 1024 / 1024).toFixed(1)}MB > 50MB, 압축 필수`);
      }

      try {
        const result = await compressPdfOnServer(input.file, {
          quality: 90,
          onProgress: (p, msg) => onProgress?.(5 + p * 0.5, msg),
        });

        fileToUpload = result.file;
        pageCount = result.pageCount;

        console.log(
          `✅ PDF 압축 완료: ${(result.originalSize / 1024 / 1024).toFixed(1)}MB → ` +
          `${(result.compressedSize / 1024 / 1024).toFixed(1)}MB (${result.compressionRatio}% 감소)`
        );
      } catch (error) {
        console.warn('⚠️ PDF 압축 실패:', error);

        if (needsCompression) {
          throw new Error(
            `파일이 50MB를 초과하여 압축이 필요하지만 압축에 실패했습니다. ` +
            `에러: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
          );
        }

        onProgress?.(55, '압축 스킵, 원본 업로드 중...');
      }

      // ========================================
      // Supabase Storage 업로드
      // ========================================
      onProgress?.(60, 'Supabase에 업로드 중...');

      const timestamp = Date.now();
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `textbooks/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('textbooks')
        .upload(filePath, fileToUpload, {  // ← 압축된 파일 사용
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage 업로드 실패:', uploadError);
        throw new Error(`파일 업로드 실패: ${uploadError.message}`);
      }

      // ... 나머지 DB 저장 로직 (기존 코드 유지)
      onProgress?.(80, 'DB에 저장 중...');

      const { data: urlData } = supabase.storage
        .from('textbooks')
        .getPublicUrl(filePath);

      const { data, error: dbError } = await ((supabase as any)
        .from('textbooks')
        .insert({
          display_name: input.displayName,
          file_name: input.file.name,
          file_url: urlData.publicUrl,
          file_size: fileToUpload.size,  // ← 압축된 크기
          page_count: pageCount,         // ← Railway에서 받은 페이지 수
          curriculum: input.curriculum || null,
          subject: input.subject || null,
        })
        .select()
        .single() as Promise<{
          data: TextbookRow | null;
          error: { message: string } | null;
        }>);

      if (dbError || !data) {
        console.error('DB 저장 실패:', dbError);
        await supabase.storage.from('textbooks').remove([filePath]);
        throw new Error(`메타데이터 저장 실패: ${dbError?.message || 'Unknown error'}`);
      }

      onProgress?.(100, '완료!');
      return toTextbook(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['textbooks', 'all'] });
    },
  });
}
```

#### 1.4 Tree-shaking 방지 코드 추가

```typescript
// 파일 상단에 추가 (import 바로 아래)
import { compressPdfOnServer, checkRailwayHealth } from '@/api/pdfCompression';

/**
 * Tree-shaking 방지: 전역 객체에 함수 등록
 */
if (typeof window !== 'undefined') {
  (window as any).__pdfCompressionAllTextbooks = {
    compressPdfOnServer,
    checkRailwayHealth,
  };
}
```

---

### Phase 2: TextbookUploadModal.tsx 수정

#### 2.1 pdf-lib 압축 제거

**변경 전**:
```typescript
import {
  compressPdf,
  needsCompression as checkNeedsCompression,
  type CompressionProgress,
  type CompressionResult,
} from '@/utils/pdfCompressor';

// 50MB 초과 시 자동 압축
if (checkNeedsCompression(selectedFile.size)) {
  const result = await compressPdf(selectedFile, {...});
  fileToUpload = result.file;
}
```

**변경 후**:
```typescript
// pdf-lib import 제거
// 압축 로직 제거 - useCreateTextbook에서 처리

// 단순화된 제출 핸들러
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedFile || !displayName.trim()) return;

  try {
    const finalDisplayName = [
      displayName.trim(),
      curriculum,
      subject,
    ].filter(Boolean).join('_');

    await createMutation.mutateAsync({
      displayName: finalDisplayName,
      file: selectedFile,  // ← 원본 파일, 훅에서 압축
      subject: subject || undefined,
      curriculum: curriculum || undefined,
      onProgress: (progress, message) => {
        setUploadProgress({ progress, message });
      },
    });

    resetForm();
    onSuccess?.();
    onClose();
  } catch (error) {
    console.error('업로드 실패:', error);
  }
};
```

#### 2.2 압축 상태 UI 수정

```typescript
// 기존 압축 상태 대신 업로드 진행률 사용
const [uploadProgress, setUploadProgress] = useState<{
  progress: number;
  message: string;
} | null>(null);

// UI에서 진행률 표시
{uploadProgress && (
  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
    <div className="flex items-center gap-2 text-sm text-blue-700">
      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      {uploadProgress.message}
    </div>
    <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${uploadProgress.progress}%` }}
      />
    </div>
  </div>
)}
```

---

## 4. 타입 정의 확인

### 4.1 기존 타입 (types/textbook.ts)

```typescript
// 확인 필요한 타입들
export interface TextbookCreateInput {
  displayName: string;
  file: File;
  subject?: string;
  curriculum?: string;
  grade?: string;
}

export interface TextbookRow {
  id: string;
  display_name: string;
  file_name: string;
  file_url: string;
  file_size: number;
  page_count: number | null;
  curriculum: string | null;
  subject: string | null;
  created_at: string;
  uploaded_by: string | null;
}
```

### 4.2 pdfCompression.ts 타입

```typescript
// 이미 정의되어 있음 - 확인만
export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  imagesProcessed: number;
  pageCount: number;
}

export interface CompressionOptions {
  quality?: number;
  onProgress?: (progress: number, message: string) => void;
}
```

---

## 5. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|-----|------|--------|
| `compressPdfOnServer is not defined` | import 누락 | import 추가 확인 |
| `page_count column does not exist` | DB 스키마 불일치 | 스키마 확인, null 허용 |
| Tree-shaking | 압축 함수 제거됨 | window 객체 할당 추가 |
| 타입 에러 | onProgress 타입 불일치 | 타입 확장 |

---

## 6. 테스트 체크리스트

### 6.1 로컬 테스트

- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음
- [ ] 빌드 출력에 `compress-pdf` 포함 확인

### 6.2 기능 테스트

- [ ] 50MB 이하 PDF 업로드 성공
- [ ] 50MB 초과 PDF 압축 후 업로드 성공
- [ ] 콘솔에 `[COMPRESS]` 로그 출력
- [ ] Network 탭에 `/compress-pdf` 요청 확인
- [ ] 진행률 UI 정상 표시

### 6.3 에러 케이스 테스트

- [ ] Railway Worker 다운 시 적절한 에러 메시지
- [ ] 200MB 초과 파일 거부
- [ ] 네트워크 에러 시 재시도 또는 안내

---

## 7. 실행 순서

```
Phase 1: useAllTextbooks.ts 수정
├── 1.1 compressPdfOnServer import 추가
├── 1.2 Tree-shaking 방지 코드 추가
├── 1.3 useCreateTextbook 압축 로직 추가
└── 1.4 빌드 테스트

Phase 2: TextbookUploadModal.tsx 수정
├── 2.1 pdf-lib import 및 압축 로직 제거
├── 2.2 onProgress 콜백 추가
├── 2.3 진행률 UI 수정
└── 2.4 빌드 테스트

Phase 3: 배포 및 검증
├── 3.1 Vercel 배포
├── 3.2 프로덕션 테스트
└── 3.3 에러 리포트 업데이트
```

---

## 8. 롤백 계획

문제 발생 시:
1. `useCreateTextbook`에서 압축 로직 주석 처리
2. `TextbookUploadModal`에서 pdf-lib 압축 복원
3. 재배포

---

*Stage 46-B PDF 압축 통합 개발 계획 - 2026-01-03*
