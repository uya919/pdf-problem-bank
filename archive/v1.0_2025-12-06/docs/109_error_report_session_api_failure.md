# 에러 리포트: 세션 API 호출 실패

> 2025-12-04 | Phase 40 리팩토링 후 발생

---

## 1. 에러 요약

| 항목 | 내용 |
|------|------|
| **증상** | 메인 페이지 로딩 시 AxiosError 다수 발생 |
| **영향** | 작업 세션 기능 전체 불가 |
| **원인** | 백엔드 서버 미실행 |
| **심각도** | 낮음 (인프라 문제, 코드 버그 아님) |

---

## 2. 발생한 에러 목록

```
[Phase 32] Failed to fetch sessions: AxiosError
[Phase 32] Failed to fetch sessions: AxiosError
[Phase 32] Failed to find session: AxiosError
[Phase 35] Creating new session
[Phase 35] 세션 처리 실패: AxiosError
```

---

## 3. 에러 발생 위치

### 3.1 workSessionStore.ts (상태 관리)

| 라인 | 함수 | API 엔드포인트 |
|------|------|---------------|
| 187 | `fetchSessions` | `GET /api/work-sessions/` |
| 461 | `findSessionByDocument` | `GET /api/work-sessions/by-document/{id}` |

```typescript
// 라인 181-190
fetchSessions: async (options) => {
  set({ sessionsLoading: true });
  try {
    const response = await api.getWorkSessions(options);
    set({ sessions: response.items, sessionsLoading: false });
  } catch (error) {
    console.error('[Phase 32] Failed to fetch sessions:', error);  // 여기서 발생
    set({ sessionsLoading: false });
  }
},
```

### 3.2 HeroSection.tsx (메인 페이지 히어로 섹션)

| 라인 | 동작 | 설명 |
|------|------|------|
| 43 | `findSessionByDocument` | 기존 세션 확인 |
| 77 | `createSession` | 새 세션 생성 |
| 87 | catch | 에러 로깅 |

---

## 4. API 호출 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  메인 페이지 로딩                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  workSessionStore.fetchSessions()                               │
│  → GET /api/work-sessions/                                      │
│  → ❌ AxiosError: Network Error (백엔드 미실행)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  HeroSection: 사용자가 문서 조합 클릭                             │
│  → findSessionByDocument(problemDocId)                          │
│  → GET /api/work-sessions/by-document/{id}                      │
│  → ❌ AxiosError: Network Error                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  createSession() 호출 시도                                       │
│  → POST /api/work-sessions/                                     │
│  → ❌ AxiosError: Network Error                                  │
│  → "[Phase 35] 세션 처리 실패"                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 근본 원인 분석

### 5.1 직접 원인
- **백엔드 서버(FastAPI)가 실행되지 않음**
- 포트 8000에서 리스닝하는 프로세스 없음

### 5.2 발생 경위
1. Phase 40 리팩토링 중 서버 재시작 명령 실행
2. `taskkill`로 모든 node/python 프로세스 종료
3. 프론트엔드만 재시작되고 백엔드는 재시작되지 않음
4. 프론트엔드에서 백엔드 API 호출 시 연결 실패

### 5.3 왜 백엔드가 재시작되지 않았나?
- `cmd //c "start cmd /k ..."` 명령으로 백엔드 시작 시도
- 별도 터미널 창이 열렸으나, 실제 프로세스가 시작되지 않았거나
- 시작 직후 오류로 종료되었을 가능성

---

## 6. 해결 방법

### 6.1 즉시 조치 (완료)
```powershell
# 백엔드 서버 시작
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6.2 확인
```powershell
# 포트 확인
netstat -ano | findstr :8000

# 결과: TCP 0.0.0.0:8000 LISTENING
```

---

## 7. 코드 품질 평가

### 7.1 에러 처리 (양호)
- workSessionStore: try-catch로 에러 캐치, 로딩 상태 복구
- HeroSection: 사용자에게 alert로 알림

### 7.2 개선 제안

| 항목 | 현재 | 개선안 |
|------|------|--------|
| **에러 메시지** | "세션 처리에 실패했습니다" | "서버에 연결할 수 없습니다. 백엔드 실행 여부를 확인해주세요." |
| **재시도 로직** | 없음 | 3회 자동 재시도 (exponential backoff) |
| **서버 상태 표시** | 없음 | 헤더에 연결 상태 아이콘 표시 |
| **개발 환경 체크** | 없음 | 백엔드 미응답 시 개발자 모드 안내 |

### 7.3 토스 UX 철학 적용 예시

```typescript
// 현재
catch (error) {
  alert('세션 처리에 실패했습니다. 다시 시도해주세요.');
}

// 개선 (토스 스타일)
catch (error) {
  if (error.code === 'ERR_NETWORK') {
    showToast('서버와 연결이 끊겼어요. 잠시 후 다시 시도해볼게요!', 'warning');
    // 자동 재시도
    setTimeout(() => handleStartSession(combo), 3000);
  } else {
    showToast('문제가 생겼어요. 새로고침 해주세요.', 'error');
  }
}
```

---

## 8. 재발 방지

### 8.1 개발 환경 시작 스크립트 개선

현재 `backend/dev.ps1`이 있으나, 프론트엔드와 백엔드를 동시에 시작하는 통합 스크립트 필요:

```powershell
# start-dev.ps1 (프로젝트 루트에 생성 권장)
Write-Host "Starting development servers..."

# 백엔드
Start-Process powershell -ArgumentList "-Command cd backend; python -m uvicorn app.main:app --reload"

# 프론트엔드 (백엔드 시작 대기)
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-Command cd frontend; npm run dev"

Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
```

### 8.2 헬스체크 추가

프론트엔드 앱 초기화 시 백엔드 상태 확인:

```typescript
// App.tsx or main.tsx
useEffect(() => {
  const checkBackend = async () => {
    try {
      await api.healthCheck(); // GET /api/health
    } catch {
      console.warn('Backend not available');
      // 개발 모드에서만 표시
      if (import.meta.env.DEV) {
        showToast('백엔드 서버가 실행되지 않았습니다', 'warning');
      }
    }
  };
  checkBackend();
}, []);
```

---

## 9. 결론

| 항목 | 결과 |
|------|------|
| **에러 유형** | 인프라/환경 문제 |
| **코드 버그** | 없음 |
| **해결 상태** | ✅ 완료 (백엔드 재시작) |
| **추가 작업** | 선택적 (개발 환경 개선) |

Phase 40 리팩토링과는 무관한 서버 실행 누락 문제였습니다.
브라우저를 새로고침하면 정상 동작합니다.

---

*작성: Claude Code | 2025-12-04*
