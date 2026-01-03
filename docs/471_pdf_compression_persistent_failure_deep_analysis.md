# PDF 압축 지속적 실패 심층 분석 리포트

## 문서 정보
- **작성일**: 2026-01-04
- **Stage**: 46-B (PDF 압축 통합)
- **상태**: 🔴 심층 연구 리포트
- **증상**: 85MB PDF 업로드 시 계속 "The object exceeded the maximum allowed size" 에러

---

## 1. 에러 로그 정밀 분석

### 1.1 사용자가 제공한 에러 로그

```
index-GKis4YV6.js:660 Storage 업로드 실패: StorageApiError: The object exceeded the maximum allowed size
    at index-GKis4YV6.js:44:11002
mutationFn	@	index-GKis4YV6.js:660
```

### 1.2 핵심 관찰

| 관찰 | 의미 |
|------|------|
| **번들 파일명 변경됨** | `index-GKis4YV6.js` (이전: `index-oMy3kAKD.js`) → 배포 후 새 빌드 |
| **에러 위치** | `mutationFn @ :660` → `useCreateTextbook` 내부 |
| **에러 메시지** | `Storage 업로드 실패` → Supabase Storage 에러 |
| **누락된 로그** | `[COMPRESS]` 로그 없음 → Railway 압축 호출 안됨 |

### 1.3 결정적 증거

에러 로그에서 **`[COMPRESS]` 로그가 전혀 없음**:
```
❌ 누락: [COMPRESS] 시작: xxx.pdf (85.8MB)
❌ 누락: [COMPRESS] 응답: 200 OK
❌ 누락: ✅ PDF 압축 완료: ...
✅ 존재: Storage 업로드 실패: The object exceeded the maximum allowed size
```

**결론**: `compressPdfOnServer()` 함수가 **호출되지 않거나 스킵되고 있음**

---

## 2. 코드 플로우 분석

### 2.1 useCreateTextbook 압축 로직

```typescript
// useAllTextbooks.ts:268-295
try {
  // Railway Worker에서 압축 (JPEG 90)
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
    throw new Error(...);  // 50MB 초과면 에러
  }

  // 50MB 이하면 원본 업로드 시도
  onProgress?.(55, '압축 스킵, 원본 업로드 중...');
}
```

### 2.2 가능한 시나리오

| 시나리오 | 증거 | 가능성 |
|---------|------|--------|
| A. `compressPdfOnServer` 호출됨, 에러 발생 | `⚠️ PDF 압축 실패:` 로그 없음 | ❌ 낮음 |
| B. `compressPdfOnServer` 호출 안됨 (Tree-shaking) | `[COMPRESS] 시작` 로그 없음 | 🔴 높음 |
| C. catch에서 에러 무시 후 원본 업로드 | `needsCompression=false` | ⚪ 가능 |
| D. 다른 코드 경로 실행 | `useTextbooks.ts` 사용? | ⚪ 가능 |

---

## 3. Tree-shaking 재검증

### 3.1 빌드 결과 확인 (로컬)

```bash
$ grep -o "compressPdfOnServer\|compress-pdf\|__pdfCompression" dist/assets/*.js | head -10
compress-pdf
__pdfCompression
compressPdfOnServer
__pdfCompression
compressPdfOnServer
```

로컬 빌드에서는 압축 코드가 포함되어 있음 ✅

### 3.2 Vercel 빌드와 로컬 빌드 차이

| 환경 | 환경변수 | 빌드 명령어 |
|------|---------|------------|
| 로컬 | `VITE_SUPABASE_URL="dummy"` | `npm run build` |
| Vercel | Vercel 환경변수 설정 | `npm run build` |

**의문점**: Vercel에서도 동일하게 포함되었는가?

### 3.3 검증 필요 항목

1. Vercel 배포 로그에서 빌드 출력 확인
2. 실제 배포된 JS 파일에서 `compress-pdf` 검색
3. Network 탭에서 `/compress-pdf` 요청 유무 확인

---

## 4. 실제 호출 경로 검증

### 4.1 TextbookUploadModal → useCreateTextbook 경로

```
TextbookUploadModal.tsx
  └── import { useCreateTextbook } from '@/hooks/useAllTextbooks'
      └── const createMutation = useCreateTextbook()
          └── createMutation.mutateAsync({...})
              └── mutationFn: async (input) => {
                    └── compressPdfOnServer(input.file, ...)  ← 여기가 호출되어야 함
                  }
```

### 4.2 isSupabaseConfigured 조건 확인

```typescript
// useAllTextbooks.ts:228
if (!isSupabaseConfigured) {
  // Mock 업로드 (Railway 압축 없음!)
  console.log('[Mock] 교재 업로드:', input.displayName);
  ...
  return newTextbook;  // ← 조기 리턴, 압축 스킵
}
```

**핵심 의문**: Vercel 환경에서 `isSupabaseConfigured`가 `false`인가?

### 4.3 isSupabaseConfigured 정의 확인

```typescript
// lib/supabase.ts (추정)
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Vercel에서 환경변수가 설정되어 있다면 `true`여야 함**

---

## 5. 가설 정리

### 가설 A: Tree-shaking이 Vercel에서 다르게 동작

| 근거 | 반론 |
|------|------|
| 로컬과 Vercel 빌드 환경 차이 | Tree-shaking 방지 코드 추가함 |
| 환경변수 차이로 dead code 판정 | window 할당으로 방지 |

**가능성**: 낮음 (30%)

### 가설 B: isSupabaseConfigured = false로 Mock 경로 실행

| 근거 | 반론 |
|------|------|
| Vercel 환경변수 미설정 가능 | 이전에 Storage 에러 발생 = 연결됨 |
| `[Mock]` 로그 없음 = 연결됨 | Storage 에러가 발생한다는 건 연결된 것 |

**가능성**: 매우 낮음 (10%)

### 가설 C: 압축 함수가 호출되나 에러가 catch됨

```typescript
try {
  await compressPdfOnServer(...)  // 실패
} catch (error) {
  console.warn('⚠️ PDF 압축 실패:', error);  // ← 이 로그가 없음!

  if (needsCompression) {
    throw new Error(...)  // 50MB 초과면 여기서 멈춰야 함
  }
}
```

**문제**: `needsCompression = input.file.size > 50MB` = `true`
따라서 catch에서 에러를 throw해야 하는데, Storage 에러가 발생함

**가능성**: 중간 (40%)

### 가설 D: 다른 훅/컴포넌트가 업로드 처리

| 가능성 | 검증 방법 |
|--------|----------|
| `useTextbooks.ts`의 `useUploadTextbook` 사용 | import 확인 |
| `TextbookUploader.tsx` (다른 컴포넌트) | 파일 확인 |

**가능성**: 높음 (60%)

---

## 6. 결정적 디버깅 필요

### 6.1 추가할 디버그 로그 위치

```typescript
// useAllTextbooks.ts - useCreateTextbook 시작 부분에 추가
export function useCreateTextbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input) => {
      // ========== 디버그 로그 추가 ==========
      console.log('🔍 [CREATE-TEXTBOOK] 시작');
      console.log('🔍 [CREATE-TEXTBOOK] isSupabaseConfigured:', isSupabaseConfigured);
      console.log('🔍 [CREATE-TEXTBOOK] 파일 크기:', (input.file.size / 1024 / 1024).toFixed(1), 'MB');
      // =====================================

      const { onProgress } = input;

      if (!isSupabaseConfigured) {
        console.log('[Mock] 교재 업로드:', input.displayName);
        // ...
      }

      // ========== 압축 전 디버그 ==========
      console.log('🔍 [CREATE-TEXTBOOK] Railway 압축 시도 직전');
      // ===================================

      try {
        const result = await compressPdfOnServer(input.file, {...});
        console.log('🔍 [CREATE-TEXTBOOK] Railway 압축 완료:', result);
      } catch (error) {
        console.error('🔍 [CREATE-TEXTBOOK] Railway 압축 에러:', error);
        // ...
      }
    },
  });
}
```

### 6.2 pdfCompression.ts 시작 부분 로그 강화

```typescript
// 현재
console.log('[PDF-COMPRESS-MODULE] Railway PDF 압축 모듈 로드됨');

// 강화
console.log('═══════════════════════════════════════');
console.log('[PDF-COMPRESS-MODULE] Railway PDF 압축 모듈 로드됨');
console.log('[PDF-COMPRESS-MODULE] RAILWAY_URL:', RAILWAY_WORKER_URL);
console.log('═══════════════════════════════════════');
```

### 6.3 compressPdfOnServer 함수 시작 로그 강화

```typescript
export async function compressPdfOnServer(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  console.log('═══════════════════════════════════════');
  console.log(`[COMPRESS] 함수 호출됨!`);
  console.log(`[COMPRESS] 파일: ${file.name}`);
  console.log(`[COMPRESS] 크기: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  console.log('═══════════════════════════════════════');

  // 기존 코드...
}
```

---

## 7. 즉시 검증 항목

### 7.1 Network 탭 확인

1. 브라우저 개발자 도구 → Network 탭
2. "compress-pdf" 필터
3. 85MB PDF 업로드 시 요청 유무 확인

| 요청 유무 | 의미 |
|----------|------|
| 요청 없음 | `compressPdfOnServer` 미호출 |
| 요청 있음, 실패 | Railway Worker 에러 |
| 요청 있음, 성공 | 압축 완료 but 파일이 여전히 큼 |

### 7.2 콘솔에서 확인할 로그

| 로그 | 의미 |
|------|------|
| `[PDF-COMPRESS-MODULE] 로드됨` | 모듈 로드 확인 |
| `[Mock] 교재 업로드` | Mock 모드 (Supabase 미연결) |
| `[UPLOAD] 파일 크기 ... > 50MB` | 압축 필요 판정 |
| `[COMPRESS] 시작: xxx.pdf` | Railway 호출 시작 |
| `⚠️ PDF 압축 실패:` | Railway 에러 |
| `✅ PDF 압축 완료:` | 압축 성공 |

### 7.3 가장 중요한 검증

**Console에서 다음 순서로 로그가 나와야 함**:

```
[PDF-COMPRESS-MODULE] Railway PDF 압축 모듈 로드됨
[UPLOAD] 파일 크기 85.8MB > 50MB, 압축 필수
[COMPRESS] 시작: xxx.pdf (85.8MB)
[COMPRESS] 응답: 200 OK
[COMPRESS] 성공: 30.2MB (64.8% 감소)
✅ PDF 압축 완료: 85.8MB → 30.2MB (64.8% 감소)
```

**만약 `[COMPRESS] 시작` 로그가 없다면**:
→ `compressPdfOnServer` 함수가 호출되지 않음
→ 다른 코드 경로로 실행 중

---

## 8. 긴급 해결 방안

### 방안 1: 강화된 디버깅 로그 배포

```typescript
// useAllTextbooks.ts 전체 흐름에 로그 추가
console.log('🔍 [STEP 1] useCreateTextbook 시작');
console.log('🔍 [STEP 2] isSupabaseConfigured:', isSupabaseConfigured);
console.log('🔍 [STEP 3] 압축 시도 전');
console.log('🔍 [STEP 4] compressPdfOnServer 호출');
console.log('🔍 [STEP 5] 압축 완료 또는 실패');
console.log('🔍 [STEP 6] Supabase 업로드 시도');
```

### 방안 2: 브라우저에서 직접 테스트

```javascript
// 브라우저 콘솔에서 실행
const testCompression = window.__pdfCompressionAllTextbooks?.compressPdfOnServer;
console.log('compressPdfOnServer 함수 존재:', !!testCompression);

// 있으면 간단한 테스트 파일로 호출
if (testCompression) {
  const testBlob = new Blob(['test'], { type: 'application/pdf' });
  const testFile = new File([testBlob], 'test.pdf');
  testCompression(testFile, {})
    .then(r => console.log('성공:', r))
    .catch(e => console.error('실패:', e));
}
```

### 방안 3: Railway Worker 직접 테스트

```bash
curl -X POST \
  https://makeedu-worker-production.up.railway.app/compress-pdf \
  -F "file=@test.pdf" \
  -F "quality=90" \
  --output compressed.pdf
```

---

## 9. 결론 및 다음 단계

### 핵심 문제

`compressPdfOnServer` 함수가 **호출되지 않고 있음**.
이유는 아직 불명확하며, 다음 중 하나일 가능성:

1. **Tree-shaking**이 Vercel 빌드에서 여전히 제거
2. **다른 코드 경로**로 업로드 실행 (다른 훅 사용)
3. **조기 리턴**으로 압축 로직 스킵 (알 수 없는 조건)

### 즉시 필요한 조치

1. **디버깅 로그 추가** → 정확한 실행 경로 파악
2. **Network 탭 확인** → Railway 요청 유무 확인
3. **브라우저 콘솔에서 함수 존재 확인** → Tree-shaking 검증

### 다음 단계

디버깅 로그를 추가하고 재배포하여 정확한 실행 경로를 파악해야 합니다.

---

*Stage 46-B PDF 압축 심층 분석 리포트 - 2026-01-04*
