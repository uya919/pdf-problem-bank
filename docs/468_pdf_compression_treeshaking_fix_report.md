# PDF 압축 Tree-shaking 문제 해결 리포트

## 문서 정보
- **작성일**: 2026-01-03
- **Stage**: 46 (PDF 서버사이드 압축)
- **상태**: ✅ 해결 완료

---

## 1. 문제 요약

### 증상
- 85MB PDF 업로드 시 "The object exceeded the maximum allowed size" 에러
- `[COMPRESS]` 로그가 콘솔에 전혀 출력되지 않음
- Network 탭에 `/compress-pdf` 요청 없음

### 근본 원인
**Vite/Rollup의 Tree-shaking이 압축 코드를 제거**

---

## 2. 근본 원인 분석

### 2.1 Tree-shaking 메커니즘

```
useTextbooks.ts
└── import { compressPdfOnServer } from '@/api/pdfCompression'
    └── 함수가 조건문 내부에서만 호출됨:
        if (isSupabaseConfigured) {
          // 압축 코드 호출
        }
```

### 2.2 빌드 시 조건 평가

```typescript
// supabase.ts
export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**빌드 환경에서 `VITE_SUPABASE_*` 환경변수가 없으면:**
- `isSupabaseConfigured = false`
- Rollup이 `if (false) { ... }` 분기를 dead code로 판단
- `compressPdfOnServer` 함수가 미사용으로 판단되어 제거됨

### 2.3 증거

```bash
# 빌드 전: 압축 코드 없음
grep "compress-pdf" dist/assets/index-B_YQXUGf.js
# → NOT FOUND

# 빌드 후 (수정 적용): 압축 코드 포함
grep "compress-pdf" dist/assets/index-DfwVZiNh.js
# → FOUND!
```

---

## 3. 해결책

### 3.1 Window 객체에 함수 할당

```typescript
// useTextbooks.ts
import { compressPdfOnServer, checkRailwayHealth } from '@/api/pdfCompression';

/**
 * Tree-shaking 방지: 전역 객체에 함수 등록
 * window 객체에 할당하면 Rollup이 dead code로 판단하지 않음
 */
if (typeof window !== 'undefined') {
  (window as any).__pdfCompression = {
    compressPdfOnServer,
    checkRailwayHealth,
  };
}
```

### 3.2 모듈 로드 로그 추가

```typescript
// pdfCompression.ts
console.log('[PDF-COMPRESS-MODULE] Railway PDF 압축 모듈 로드됨');
```

### 3.3 50MB 초과 파일 처리 개선

```typescript
// useTextbooks.ts - useUploadTextbook
const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
const needsCompression = input.file.size > FILE_SIZE_LIMIT;

try {
  const result = await compressPdfOnServer(input.file, {...});
  fileToUpload = result.file;
} catch (error) {
  if (needsCompression) {
    // 압축 실패 + 50MB 초과 = 업로드 불가능
    throw new Error('파일이 50MB를 초과하여 압축이 필요하지만 압축에 실패했습니다');
  }
  // 50MB 이하면 원본으로 업로드 시도
}
```

---

## 4. 검증 결과

### 4.1 빌드 출력 확인

```bash
# 수정 전 (환경변수 없음)
dist/assets/index-B_YQXUGf.js  2,484.42 kB

# 수정 후 (window 할당 추가)
dist/assets/index-DfwVZiNh.js  2,486.06 kB (+1.64 KB)
```

### 4.2 압축 코드 포함 확인

```javascript
// 빌드 출력에 포함된 압축 함수
async function Xse(n,e={}){
  const{quality:t=90,onProgress:s}=e;
  console.log(`[COMPRESS] 시작: ${n.name} (${(n.size/1024/1024).toFixed(1)}MB)`);
  // ...
  l=await fetch(`${X8}/compress-pdf`,{method:"POST",body:r,signal:i.signal})
  // ...
}
```

### 4.3 배포 확인

- **Vercel**: https://hyeyum.vercel.app ✅
- **Railway Worker**: https://makeedu-worker-production.up.railway.app ✅
- **CORS**: `Access-Control-Allow-Origin: *` ✅

---

## 5. 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/api/pdfCompression.ts` | 모듈 로드 로그 추가 |
| `frontend/src/hooks/useTextbooks.ts` | window 객체 할당 + 50MB 검증 로직 |

---

## 6. 테스트 방법

### 프로덕션 테스트
1. https://hyeyum.vercel.app 접속
2. 관리자 로그인
3. 교재 관리 → 교재 업로드
4. 50MB 이상 PDF 선택
5. 콘솔에서 `[COMPRESS]` 로그 확인
6. Network 탭에서 `/compress-pdf` 요청 확인

### 개발자 도구 테스트
```javascript
// 콘솔에서 압축 함수 직접 호출 가능
window.__pdfCompression.compressPdfOnServer(file, { quality: 90 })
```

---

## 7. 교훈

### 7.1 Tree-shaking 주의사항
- 조건문 내부에서만 사용되는 import는 제거될 수 있음
- 빌드 환경과 런타임 환경의 환경변수 차이 주의

### 7.2 해결 패턴
1. **전역 객체 할당**: `window.xxx = fn` (가장 확실)
2. **Side effect 로그**: 모듈 최상위에 `console.log()` 추가
3. **빌드 환경변수 주입**: `.env.production` 파일 사용

---

*Stage 46 Tree-shaking 문제 해결 리포트 - 2026-01-03*
