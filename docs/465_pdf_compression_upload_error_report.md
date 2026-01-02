# PDF 압축 업로드 에러 심층 분석 리포트

## 문서 정보
- **작성일**: 2026-01-02
- **Stage**: 46 (PDF 서버사이드 압축)
- **상태**: 🔴 에러 분석

---

## 1. 에러 현상

### 증상
- 85MB PDF 업로드 시 "The object exceeded the maximum allowed size" 에러 반복
- Railway Worker `/compress-pdf` 엔드포인트 배포 완료 후에도 동일 에러

### 에러 로그
```
POST https://rhejybeufojkfdfntpfg.supabase.co/storage/v1/object/textbooks/textbooks/1767344776649____q_q________1-1.pdf 400 (Bad Request)
Storage 업로드 실패: StorageApiError: The object exceeded the maximum allowed size
```

---

## 2. 심층 분석

### 2.1 코드 흐름 분석

```
사용자 PDF 선택 (85MB)
    ↓
TextbookUploader.handleFileSelect()
    ↓
useUploadTextbook.mutationFn()
    ↓
compressPdfOnServer() 호출  ← ❌ 여기서 실패?
    ↓
try-catch에서 fallback → 원본 85MB 업로드
    ↓
Supabase Storage 업로드 실패 (50MB 제한)
```

### 2.2 핵심 발견

**콘솔 로그에서 중요한 메시지가 누락됨:**

| 예상 메시지 | 실제 출력 | 의미 |
|------------|----------|------|
| `✅ PDF 압축 완료: 85MB → 30MB` | ❌ 없음 | 압축 성공 안함 |
| `⚠️ PDF 압축 실패, 원본 업로드:` | ❌ 없음 | minified 코드라 안 보일 수 있음 |

### 2.3 가능한 원인 3가지

#### 원인 A: Railway 타임아웃 (가장 유력)
```
85MB 파일 업로드 → Railway
    ↓
Railway 처리 시간: 30-60초 예상
    ↓
기본 타임아웃 초과 → 에러
```

- Railway 무료 플랜: 요청 타임아웃 제한 있음
- 85MB PDF 압축 시간: 30-60초 소요 예상
- fetch 기본 타임아웃: 브라우저마다 다름

#### 원인 B: Railway 요청 크기 제한
```
Railway Free Plan:
- Request body size limit: 100MB (확인 필요)
- 하지만 85MB + FormData 오버헤드 = 제한 초과 가능
```

#### 원인 C: Vercel 배포 환경 문제
```
Vercel → Railway CORS 문제 가능성
- 프리플라이트 요청 실패
- CORS 헤더 누락
```

---

## 3. 검증 방법

### 3.1 Railway 로그 확인
```bash
railway logs
```
압축 요청이 Railway에 도착했는지 확인

### 3.2 브라우저 네트워크 탭 확인
1. 개발자 도구 → Network 탭
2. `/compress-pdf` 요청 찾기
3. 상태 코드 확인:
   - 200: 성공 (그런데 왜 안 쓰이지?)
   - 408/504: 타임아웃
   - 413: 요청 크기 초과
   - 500: 서버 에러

### 3.3 작은 파일로 테스트
```
5MB PDF로 테스트 → 성공하면 타임아웃 문제
```

---

## 4. 해결 방안

### 방안 A: 클라이언트 타임아웃 증가 (단기)
```typescript
// pdfCompression.ts
const response = await fetch(`${RAILWAY_WORKER_URL}/compress-pdf`, {
  method: 'POST',
  body: formData,
  signal: AbortSignal.timeout(180000), // 3분 타임아웃
});
```

### 방안 B: 청크 업로드 (중기)
```
85MB를 10MB씩 청크로 전송
    ↓
Railway에서 청크 합치기
    ↓
압축 후 반환
```

### 방안 C: 프론트엔드 사전 압축 (장기)
```
브라우저에서 pdf-lib로 1차 압축 (이미지 제외)
    ↓
40-50MB로 축소
    ↓
Railway에서 이미지 압축
    ↓
25-35MB로 최종 압축
```

### 방안 D: Supabase Storage 제한 상향 (비용 발생)
```
Pro Plan: 5GB file size limit
현재 Free Plan: 50MB limit
```

---

## 5. 즉시 조치 사항

### 5.1 디버깅 로그 추가
`pdfCompression.ts`에 상세 로그 추가 후 재빌드:

```typescript
export async function compressPdfOnServer(...) {
  console.log('[COMPRESS] 시작:', file.name, (file.size / 1024 / 1024).toFixed(1), 'MB');

  try {
    const response = await fetch(...);
    console.log('[COMPRESS] 응답:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[COMPRESS] 에러 응답:', errorText);
      throw new Error(errorText);
    }

    // ... 성공 처리
    console.log('[COMPRESS] 성공!');
  } catch (error) {
    console.error('[COMPRESS] 예외:', error);
    throw error;
  }
}
```

### 5.2 타임아웃 증가
fetch에 180초 타임아웃 추가

---

## 6. 결론

### 근본 원인 (추정)
**Railway 압축 요청이 타임아웃되어 실패 → fallback으로 원본 85MB 업로드 → Supabase 50MB 제한에 걸림**

### 우선순위
1. 🔴 **즉시**: 디버깅 로그 추가 + 타임아웃 증가
2. 🟡 **단기**: 네트워크 탭에서 실제 요청 상태 확인
3. 🟢 **중기**: 청크 업로드 또는 사전 압축 구현

---

*Stage 46 에러 분석 리포트*
