# 학년 승급 Network Error 분석 리포트

> 연구 리포트 #442
> 작성일: 2025-12-27
> 참조: [441_quick_assignment_development_plan.md](./441_quick_assignment_development_plan.md)

---

## 1. 에러 현상

```
OperationsPage.tsx:698 학년 승급 실패: Error: Network Error
    at handleApiError (client.ts:23:12)
    at Object.executePromotionV2 [as mutationFn] (gradePromotion.ts:234:11)
```

**특징**:
- `SIGNED_IN` 인증은 정상 진행
- 프로필 로드도 정상 (`프로필 이미 로드됨 - 스킵`)
- `executePromotionV2` 호출 시 `Network Error` 발생

---

## 2. 원인 분석

### 2.1 백엔드 서버 상태

```bash
netstat -ano | findstr :7000
```

**결과**: 포트 7000에서 리스닝 중인 프로세스 없음

**진단**: **백엔드 서버가 실행되지 않은 상태**

### 2.2 API 호출 흐름

```
프론트엔드 (localhost:3000)
    ↓
apiClient.post('/api/grade-promotion/execute/v2')
    ↓
localhost:7000 (백엔드)
    ↓
❌ Connection Refused (서버 미실행)
    ↓
Network Error
```

### 2.3 관련 코드

```typescript
// frontend/src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUTS.DEFAULT,  // 30초
});
```

```typescript
// frontend/src/api/gradePromotion.ts
export async function executePromotionV2(): Promise<PromotionExecuteResponseV2> {
  try {
    const response = await apiClient.post<PromotionExecuteResponseV2>(
      '/api/grade-promotion/execute/v2',
      { confirm: true }
    );
    return response.data;
  } catch (error) {
    throw handleApiError(error);  // ← 여기서 Network Error 발생
  }
}
```

---

## 3. 해결 방법

### 3.1 백엔드 서버 시작

```bash
# 터미널 1: 백엔드 서버 (포트 7000)
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```

### 3.2 프론트엔드 서버 시작 (필요시)

```bash
# 터미널 2: 프론트엔드 서버 (포트 3000)
cd c:\MYCLAUDE_PROJECT\pdf\frontend
npm run dev -- --host --port 3000
```

### 3.3 서버 상태 확인

```bash
# 포트 확인
netstat -ano | findstr :7000
netstat -ano | findstr :3000

# API 테스트
curl http://localhost:7000/api/grade-promotion/status
```

---

## 4. 예방 조치

### 4.1 start-servers.bat 활용

프로젝트 루트에 `start-servers.bat` 파일이 있으면 이를 사용하여 양쪽 서버를 동시에 시작할 수 있습니다.

### 4.2 에러 메시지 개선 (선택적)

```typescript
// client.ts 에러 핸들러 개선
export function handleApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    // 연결 에러 특수 처리
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return new Error('서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
    }
    const message = error.response?.data?.detail || error.response?.data?.message || error.message;
    return new Error(message);
  }
  // ...
}
```

---

## 5. 결론

| 항목 | 상태 |
|------|------|
| **원인** | 백엔드 서버 미실행 (포트 7000) |
| **해결** | `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000` 실행 |
| **코드 이상** | 없음 (정상 구현) |

**Stage 32 학년 승급 + 반 자동 승급 기능**은 정상적으로 구현되어 있으며, 백엔드 서버 시작 후 정상 동작할 것으로 예상됩니다.

---

*작성: Claude Code | 2025-12-27*
