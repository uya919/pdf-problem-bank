# PDF 압축 지속적 실패 에러 리포트

## 문서 정보
- **작성일**: 2026-01-03
- **Stage**: 46 (PDF 서버사이드 압축)
- **상태**: 🔴 에러 분석

---

## 1. 에러 현상

### 증상
- 새 빌드(`index-wE1V8wQ1.js`) 배포 완료
- 로그인 정상 작동
- **PDF 업로드 시 여전히 동일 에러 발생**
- "The object exceeded the maximum allowed size" 반복

### 핵심 관찰
```
❌ 콘솔에 [COMPRESS] 로그 없음
❌ 콘솔에 ⚠️ PDF 압축 실패 로그 없음
✅ Storage 업로드 실패 로그만 출력
```

**결론**: 압축 함수가 호출되지 않거나, 호출 즉시 실패하고 있음

---

## 2. 코드 흐름 분석

### 예상 흐름
```
1. handleFileSelect() 호출
2. uploadMutation.mutateAsync() 호출
3. mutationFn 시작
4. onProgress(5, 'PDF 압축 준비 중...')
5. console.log('[COMPRESS] 시작: ...') ← 여기서 로그 나와야 함
6. fetch('/compress-pdf') 호출
7. 응답 처리
8. Supabase 업로드
```

### 실제 흐름 (추정)
```
1. handleFileSelect() 호출
2. uploadMutation.mutateAsync() 호출
3. mutationFn 시작
4. onProgress(5, 'PDF 압축 준비 중...')
5. compressPdfOnServer() 호출
6. ??? 에러 발생 ???
7. catch 블록 실행 (console.warn 없음?)
8. 원본 85MB로 Supabase 업로드 시도
9. 50MB 제한 초과 에러
```

---

## 3. 가능한 원인

### 원인 A: console.warn이 minified 코드에서 제거됨
- Vite 빌드 시 console.warn이 제거될 수 있음
- catch 블록이 실행되어도 로그가 안 보임

### 원인 B: Railway 요청이 즉시 실패
- CORS preflight 실패
- 네트워크 타임아웃
- Railway 서버 응답 없음

### 원인 C: fetch 자체가 실패
- AbortController 타임아웃 너무 짧음 (하지만 3분으로 설정됨)
- 브라우저 메모리 부족

### 원인 D: 빌드 파일에 압축 코드 누락 (가능성 낮음)
- pdfCompression.ts import 누락
- Tree-shaking으로 제거됨

---

## 4. 검증 방법

### 4.1 Network 탭 확인 (필수!)
1. 개발자 도구 → Network 탭
2. PDF 업로드 시도
3. `compress-pdf` 요청 찾기:
   - **요청 없음** → 함수가 호출되지 않음
   - **요청 있음 (실패)** → Railway 문제
   - **요청 있음 (성공)** → 응답 처리 문제

### 4.2 Railway 로그 확인
```bash
railway logs
```
`📥 [COMPRESS] 수신:` 로그가 있는지 확인

### 4.3 브라우저 콘솔 필터 확인
- 콘솔에서 "All levels" 선택 (Warning 포함)
- "Verbose" 레벨 활성화

---

## 5. 즉시 확인 필요 사항

### 5.1 Network 탭 스크린샷 요청
PDF 업로드 시 Network 탭에서:
1. `compress-pdf` 요청이 있는가?
2. 있다면 Status 코드는?
3. 응답 내용은?

### 5.2 Railway 엔드포인트 직접 테스트
```bash
curl -X POST https://makeedu-worker-production.up.railway.app/compress-pdf
```
응답: `{"error":"No file provided"}` 가 나와야 정상

### 5.3 콘솔 모든 레벨 확인
- Errors ✓
- Warnings ✓ (⚠️ PDF 압축 실패 로그)
- Info ✓
- Verbose ✓

---

## 6. 해결 방안

### 방안 A: 압축 실패 시 명확한 에러 처리
```typescript
// useTextbooks.ts 수정
catch (error) {
  console.error('❌ PDF 압축 실패:', error);  // warn → error로 변경
  alert('PDF 압축에 실패했습니다. 50MB 이하 파일만 업로드 가능합니다.');
  throw error;  // fallback 대신 에러 throw
}
```

### 방안 B: 압축 필수로 변경 (fallback 제거)
- 압축 실패 시 업로드 자체를 중단
- 사용자에게 명확한 에러 메시지 표시

### 방안 C: 50MB 이하만 허용 (압축 없이)
- Railway 압축이 작동할 때까지 임시 조치
- 클라이언트에서 50MB 제한 적용

### 방안 D: Supabase Storage 제한 상향
- Pro 플랜 업그레이드: 50MB → 5GB
- 월 $25

---

## 7. 체크리스트

| 항목 | 상태 | 확인 방법 |
|------|------|----------|
| Railway Worker 정상 | ✅ | curl 테스트 완료 |
| Vercel 최신 빌드 배포 | ✅ | index-wE1V8wQ1.js |
| 로그인 정상 | ✅ | 프로필 조회 성공 |
| compress-pdf 요청 발생 | ❓ | **Network 탭 확인 필요** |
| Railway에서 요청 수신 | ❓ | **railway logs 확인 필요** |
| 압축 성공 | ❓ | **확인 필요** |
| Supabase 업로드 | ❌ | 50MB 초과로 실패 |

---

## 8. 다음 단계

### 즉시
1. **Network 탭 확인** → `/compress-pdf` 요청 있는지
2. **Railway 로그 확인** → 요청이 도착했는지

### 단기
3. 에러 처리 개선 (fallback 제거, 명확한 에러 메시지)
4. 50MB 클라이언트 제한 추가 (임시)

### 중기
5. 압축 문제 근본 해결
6. 대용량 파일 청크 업로드 구현

---

*Stage 46 지속적 실패 에러 리포트 - 2026-01-03*
