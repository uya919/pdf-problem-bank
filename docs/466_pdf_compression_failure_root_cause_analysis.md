# PDF 압축 실패 근본 원인 분석 리포트

## 문서 정보
- **작성일**: 2026-01-02
- **Stage**: 46 (PDF 서버사이드 압축)
- **상태**: 🔴 연구 리포트

---

## 1. 현재 상황 요약

### 증상
- 85MB PDF 업로드 시 "The object exceeded the maximum allowed size" 에러 반복
- Railway Worker `/compress-pdf` 엔드포인트 정상 동작 확인됨
- 수정 코드 배포 후에도 동일 에러 발생

### 발견된 문제
```
브라우저 실행 파일: index-B_YQXUGf.js (4시간 전 빌드)
최신 로컬 빌드: index-CeUJUBSA.js (방금 빌드)
최신 Vercel 배포: Canceled (실패)
```

**결론**: Vercel 배포가 실패하여 압축 로직이 포함된 새 코드가 배포되지 않음

---

## 2. 근본 원인 분석

### 2.1 문제 1: Vercel 배포 실패

```
Vercel 배포 이력:
- 3m ago: Canceled ❌
- 4h ago: Canceled ❌
- 5h ago: Canceled ❌
- 5h ago: Ready ✅ (현재 프로덕션)
```

**원인 추정**:
1. Vercel 빌드 타임아웃 (무료 플랜 제한)
2. 빌드 에러 발생
3. 수동으로 취소됨

### 2.2 문제 2: 압축 로직이 실행되지 않음

현재 프로덕션에 배포된 코드 (`5h ago` 버전):
- `compressPdfOnServer()` 함수가 없거나 다른 버전
- 디버깅 로그 (`[COMPRESS] 시작:...`) 없음
- 3분 타임아웃 설정 없음

**증거**: 콘솔에 `[COMPRESS]` 로그가 전혀 없음

### 2.3 문제 3: Fallback으로 원본 업로드

코드 흐름:
```
compressPdfOnServer() 호출
    ↓
에러 발생 (네트워크 or 타임아웃)
    ↓
catch 블록에서 fallback
    ↓
원본 85MB 그대로 Supabase 업로드
    ↓
50MB 제한 초과 에러
```

---

## 3. 왜 압축이 실패하는가?

### 가설 1: 이전 버전 코드 실행 (가장 유력)
- Vercel 배포 실패로 압축 코드가 없는 구버전 실행
- `compressPdfOnServer` 함수 자체가 없을 수 있음

### 가설 2: Railway 요청 크기 제한
- Railway Free Plan의 요청 크기 제한
- 85MB FormData 전송 시 제한 초과 가능

### 가설 3: 브라우저 메모리 부족
- 85MB 파일을 메모리에 로드
- FormData 생성 시 추가 메모리 사용
- 저사양 기기에서 문제 발생 가능

### 가설 4: CORS 문제
- Vercel → Railway CORS 설정 문제
- 프리플라이트 요청 실패

---

## 4. 검증 방법

### 4.1 Vercel 배포 상태 확인
```bash
vercel logs frontend --since=1h
```

### 4.2 Railway 로그 확인
```bash
railway logs
```
`📥 [COMPRESS] 수신:` 로그가 있는지 확인

### 4.3 브라우저 네트워크 탭 확인
1. 개발자 도구 → Network 탭
2. `compress-pdf` 요청 필터링
3. 요청이 발생했는지 확인:
   - 요청 없음 → 코드가 배포 안됨
   - 요청 있음 (에러) → Railway 문제
   - 요청 성공 → 응답 처리 문제

---

## 5. 해결 방안

### 즉시 조치: Vercel 수동 배포

```bash
cd c:/MYCLAUDE_PROJECT/pdf/frontend
vercel --prod
```

### 대안 1: Git Push 후 대기
Vercel이 자동 배포를 다시 시도하도록 대기

### 대안 2: Vercel 빌드 설정 확인
- `vercel.json` 또는 프로젝트 설정에서 빌드 타임아웃 확인
- 빌드 명령어 확인

### 대안 3: 캐시 무효화
```bash
vercel --force
```

---

## 6. 장기 해결 방안

### 6.1 클라이언트 사전 검증
업로드 전에 Railway 헬스체크:
```typescript
const isRailwayUp = await checkRailwayHealth();
if (!isRailwayUp) {
  alert('압축 서버에 연결할 수 없습니다');
  return;
}
```

### 6.2 청크 업로드
85MB를 10MB씩 나눠서 전송:
- 네트워크 안정성 향상
- 타임아웃 방지

### 6.3 프론트엔드 사전 압축
브라우저에서 pdf-lib로 1차 압축 후 Railway 전송

### 6.4 Supabase Pro 업그레이드
- 50MB → 5GB 파일 크기 제한
- 월 $25

---

## 7. 결론 (최종 업데이트)

### 근본 원인 발견!
**Vercel CLI가 이전에 업로드된 파일(527개)을 재사용하여 빌드하고 있음**

```
Vercel 빌드 로그:
"Downloading 527 deployment files..." ← 이전 파일들 사용!
"dist/assets/index-B_YQXUGf.js" ← 구버전 해시

로컬 빌드:
"dist/assets/index-CeUJUBSA.js" ← 새 버전 해시
```

`vercel --prod --force`도 **캐시된 파일**을 사용하여 오래된 코드로 빌드합니다.

### 해결 방법
1. **Vercel 프로젝트 재연결**: `vercel link --yes`
2. **또는 Vercel 대시보드에서 "Redeploy" 클릭** (GitHub 연결된 경우)
3. **또는 새 dist 폴더 직접 업로드**: `vercel deploy ./dist --prod`

### 코드 자체는 문제 없음
- Railway `/compress-pdf` 엔드포인트: ✅ 정상
- 로컬 빌드: ✅ 성공 (`index-CeUJUBSA.js`)
- 압축 로직: ✅ 올바름
- GitHub 최신 커밋: ✅ fa7f6e2 (압축 코드 포함)

---

## 8. 체크리스트

| 항목 | 상태 |
|------|------|
| Railway Worker 배포 | ✅ 완료 |
| `/compress-pdf` 엔드포인트 | ✅ 응답 확인 |
| 프론트엔드 코드 수정 | ✅ 완료 |
| 로컬 빌드 | ✅ 성공 (`index-CeUJUBSA.js`) |
| Git Push | ✅ 완료 (fa7f6e2) |
| Vercel 배포 | ❌ **구버전 파일로 빌드됨** |
| 프로덕션 반영 | ❌ **안됨** |

---

## 9. 즉시 실행할 명령어

```bash
# 방법 1: dist 폴더 직접 배포
cd c:/MYCLAUDE_PROJECT/pdf/frontend
npm run build
vercel deploy ./dist --prod

# 방법 2: 프로젝트 재연결
cd c:/MYCLAUDE_PROJECT/pdf/frontend
vercel link --yes
vercel --prod
```

---

*Stage 46 근본 원인 분석 리포트 - 업데이트 2026-01-02*
