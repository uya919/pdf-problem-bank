# 사용자 생성 API 에러 리포트

**작성일**: 2025-12-17
**상태**: 🔴 미해결
**심각도**: High (핵심 기능 차단)

---

## 1. 에러 현상

### 증상
- `/admin/users` 페이지에서 "새 사용자 추가" 버튼 클릭 후 사용자 생성 시도
- `TypeError: Failed to fetch` 에러 발생
- 사용자 생성 불가

### 콘솔 에러 로그
```
CreateUserModal.tsx:55 사용자 생성 실패: TypeError: Failed to fetch
    at createUser (adminUsers.ts:118:26)
    at Object.mutationFn (useAdminUsers.ts:54:43)
    at async handleSubmit (CreateUserModal.tsx:40:22)
```

### 현재 로그인 상태
- 사용자: 원장 (hyeyum@hyeyum.com)
- 역할: owner
- 인증 상태: SIGNED_IN ✅

---

## 2. 원인 분석

### 2.1 백엔드 서버 미실행 (주요 원인)

| 포트 | 상태 | 서비스 |
|------|------|--------|
| 3000 | ✅ LISTENING | 프론트엔드 (Vite) |
| 7000 | ❌ 없음 | 백엔드 (FastAPI) |

**결론**: 백엔드 서버가 7000 포트에서 실행되지 않고 있음

### 2.2 API Base URL 설정 문제 (수정 완료)

**수정 전** (`adminUsers.ts:6`):
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

**수정 후**:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7000';
```

### 2.3 다른 파일의 하드코딩된 포트 (잠재적 문제)

다음 파일들에 `localhost:8000`이 하드코딩되어 있음:

| 파일 | 라인 |
|------|------|
| `frontend/src/api/examPapers.ts` | 17 |
| `frontend/src/api/problems.ts` | 18 |
| `frontend/src/components/exam/ExamPreviewModal.tsx` | 23 |
| `frontend/src/components/problemBank/ImportFromLabelingModal.tsx` | 209 |
| `frontend/src/pages/ExamEditorPage.tsx` | 48 |
| `frontend/src/pages/HangulUploadPage.tsx` | 266, 272 |

---

## 3. 해결 방법

### 즉시 해결 (백엔드 서버 실행)

백엔드 서버를 7000 포트에서 실행:

```bash
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```

또는 `start-servers.bat` 실행

### 영구 해결 (포트 하드코딩 제거)

1. **환경변수 통합**: 모든 API 파일에서 `VITE_API_URL` 환경변수 사용
2. **중앙 설정 파일**: `frontend/src/config.ts` 생성하여 API_BASE 통합 관리
3. **.env 파일 설정**: `frontend/.env.local`에 `VITE_API_URL=http://localhost:7000` 설정

---

## 4. 검증 체크리스트

- [ ] 백엔드 서버 실행 확인: `netstat -ano | findstr :7000`
- [ ] API 응답 확인: `http://localhost:7000/docs` 접속
- [ ] 사용자 생성 테스트: `/admin/users`에서 새 사용자 추가
- [ ] 생성된 사용자로 로그인 테스트

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/api/adminUsers.ts` | 사용자 관리 API 클라이언트 |
| `frontend/src/hooks/useAdminUsers.ts` | TanStack Query 훅 |
| `frontend/src/components/admin/users/CreateUserModal.tsx` | 사용자 생성 모달 |
| `backend/app/routers/admin_users.py` | 백엔드 API 라우터 |
| `backend/app/utils/supabase_admin.py` | Supabase Admin 클라이언트 |

---

## 6. 결론

**핵심 원인**: 백엔드 서버(7000 포트)가 실행되지 않음

**해결 방법**: 백엔드 서버 실행 후 재시도

```bash
# 백엔드 실행
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```
