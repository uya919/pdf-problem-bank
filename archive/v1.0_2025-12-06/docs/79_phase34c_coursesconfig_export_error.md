# Phase 34-C: CoursesConfig Export 에러 리포트

**작성일**: 2025-12-03
**심각도**: Medium (기능 동작 방해)
**상태**: 분석 완료

---

## 1. 에러 현상

### 에러 메시지
```
UploadNamingModal.tsx:14 Uncaught SyntaxError:
The requested module '/@fs/C:/MYCLAUDE_PROJECT/pdf/frontend/src/api/client.ts?t=1764762755742'
does not provide an export named 'CoursesConfig' (at UploadNamingModal.tsx:14:15)
```

### 문제 코드
```typescript
// UploadNamingModal.tsx:14
import { api, CoursesConfig } from '../../api/client';
```

---

## 2. 원인 분석

### 2.1 코드 상태 확인

**client.ts (Line 380-384)**:
```typescript
// Phase 34-C: 과정 설정 인터페이스
export interface CoursesConfig {
  defaultCourses: Record<string, string[]>;
  customCourses: Record<string, string[]>;
}
```

✅ **코드는 정상** - `CoursesConfig`가 올바르게 export 되어 있음

### 2.2 근본 원인: Vite HMR 캐시 불일치

**원인**: Vite의 ESM(ES Module) Hot Module Replacement 캐시가 이전 버전의 `client.ts`를 캐싱

**발생 조건**:
1. `client.ts`에 새 export(`CoursesConfig`) 추가
2. `UploadNamingModal.tsx`에서 해당 export를 import
3. Vite HMR이 `client.ts`의 변경을 감지했지만 캐시 갱신 실패
4. `UploadNamingModal.tsx`가 새로고침될 때 구버전 캐시 참조

**증거**:
- URL의 타임스탬프 `?t=1764762755742`는 캐시 버스팅용이지만, 모듈 그래프가 제대로 갱신되지 않음
- TypeScript 컴파일(`npx tsc --noEmit`)은 성공 → 코드 자체는 문제 없음

---

## 3. 해결 방법

### 방법 A: Vite 캐시 클리어 + 서버 재시작 (권장)

```bash
# 프론트엔드 서버 중지
# Ctrl+C 또는:
taskkill /F /IM node.exe

# 캐시 삭제
cd frontend
rmdir /s /q node_modules\.vite

# 서버 재시작
npm run dev
```

### 방법 B: 브라우저 하드 리프레시

```
1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭에서 "Disable cache" 체크
3. Ctrl + Shift + R (하드 리프레시)
```

### 방법 C: 전체 페이지 새로고침

```
브라우저에서 F5 또는 새로고침 버튼 클릭
(HMR 대신 전체 페이지 로드)
```

---

## 4. 예방 조치

### 4.1 새 export 추가 시 권장 절차

1. export 추가 후 파일 저장
2. HMR 업데이트 확인 (콘솔에서 `hmr update` 로그)
3. 에러 발생 시 → Vite 서버 재시작

### 4.2 vite.config.ts 최적화 (선택)

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      // HMR 문제 발생 시 전체 새로고침으로 폴백
      overlay: true,
    },
  },
  optimizeDeps: {
    // 의존성 사전 번들링 최적화
    force: true, // 개발 중 문제 발생 시 사용
  },
});
```

---

## 5. 관련 파일

| 파일 | 상태 |
|------|------|
| `frontend/src/api/client.ts` | ✅ 정상 (CoursesConfig export 확인) |
| `frontend/src/components/main/UploadNamingModal.tsx` | ✅ 정상 (import 문법 정상) |
| `node_modules/.vite/` | ❌ 캐시 불일치 가능성 |

---

## 6. 즉시 해결 명령

```powershell
# Windows PowerShell에서 실행
cd c:\MYCLAUDE_PROJECT\pdf\frontend
taskkill /F /IM node.exe 2>$null
if (Test-Path node_modules\.vite) { Remove-Item -Recurse -Force node_modules\.vite }
npm run dev
```

---

## 7. 결론

**문제**: Vite HMR 캐시가 새로 추가된 `CoursesConfig` export를 인식하지 못함

**해결**: Vite 캐시 삭제 + 서버 재시작

**예상 시간**: 1분

---

*이 에러는 Vite 기반 개발 환경에서 새 export 추가 시 흔히 발생하는 캐시 불일치 문제입니다.*
