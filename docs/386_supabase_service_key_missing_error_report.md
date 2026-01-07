# Supabase Service Key 누락 에러 리포트

**작성일**: 2025-12-17
**상태**: 🟡 설정 필요
**심각도**: High (사용자 관리 기능 차단)

---

## 1. 에러 현상

### 증상
- `/admin/users` 페이지에서 "새 사용자 추가" 시도
- 에러 메시지: `인증 오류: Supabase 설정이 없습니다. SUPABASE_URL과 SUPABASE_SERVICE_KEY 환경변수를 설정하세요.`

### 콘솔 에러 로그
```
CreateUserModal.tsx:55 사용자 생성 실패: Error: 인증 오류: Supabase 설정이 없습니다.
SUPABASE_URL과 SUPABASE_SERVICE_KEY 환경변수를 설정하세요.
    at handleResponse (adminUsers.ts:84:11)
```

---

## 2. 원인 분석

### 문제
백엔드 `.env` 파일에 Supabase Admin API 접근에 필요한 환경변수가 설정되어 있지 않음.

### 필요한 환경변수

| 변수명 | 용도 | 현재 상태 |
|--------|------|----------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | ❌ 없음 |
| `SUPABASE_SERVICE_KEY` | Service Role Key (Admin 권한) | ❌ 없음 |

### 현재 `.env` 파일 (backend/.env)
```bash
# Phase 6-G: Railway Worker URL (메이크에듀 동기화)
RAILWAY_WORKER_URL=https://makeedu-worker-production.up.railway.app

# ❌ Supabase 설정 누락
# SUPABASE_URL=
# SUPABASE_SERVICE_KEY=
```

---

## 3. 해결 방법

### Step 1: Supabase 대시보드에서 키 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 (pdf 프로젝트)
3. **Settings** → **API** 메뉴
4. 다음 값 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **service_role key** (⚠️ secret 키 - 노출 금지!)

### Step 2: 백엔드 .env 파일 수정

파일: `c:\MYCLAUDE_PROJECT\pdf\backend\.env`

아래 내용 추가:
```bash
# Phase 8-5: Supabase Admin 설정 (사용자 관리)
SUPABASE_URL=https://rhejybeufojkfdfntpfg.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...여기에_실제_service_role_key
```

### Step 3: 백엔드 서버 재시작

```bash
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```

---

## 4. Service Role Key 주의사항

> ⚠️ **보안 경고**: Service Role Key는 **절대** 프론트엔드에 노출하면 안 됩니다!

| Key 종류 | 용도 | 노출 가능 |
|----------|------|----------|
| `anon` key | 클라이언트 API 호출 | ✅ 가능 |
| `service_role` key | 백엔드 Admin API | ❌ 절대 노출 금지 |

### Service Role Key가 필요한 이유

사용자 계정 생성/삭제 같은 Admin 작업은 `supabase.auth.admin` API를 사용해야 합니다.
이 API는 `service_role` 키로만 접근 가능합니다.

```python
# 백엔드 코드 (supabase_admin.py)
from supabase import create_client

# Service Role Key로 Admin 클라이언트 생성
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Admin API 사용 예시
supabase_admin.auth.admin.create_user({
    "email": "teacher@hyeyum.com",
    "password": "Temp#1234!",
    "email_confirm": True
})
```

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `backend/.env` | 환경변수 설정 파일 |
| `backend/app/config.py` | 설정 로드 (line 105-106) |
| `backend/app/utils/supabase_admin.py` | Supabase Admin 클라이언트 |
| `backend/app/routers/admin_users.py` | 사용자 관리 API |

---

## 6. 설정 확인 방법

설정 완료 후 아래 명령으로 확인:

```bash
# 백엔드 서버 로그에서 확인
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -c "from app.config import config; print('URL:', config.SUPABASE_URL[:30] + '...'); print('KEY:', 'SET' if config.SUPABASE_SERVICE_KEY else 'NOT SET')"
```

예상 출력:
```
URL: https://rhejybeufojkfdfntpf...
KEY: SET
```

---

## 7. 결론

**핵심 원인**: 백엔드 `.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` 환경변수 누락

**해결 방법**: Supabase 대시보드에서 Service Role Key를 복사하여 `.env` 파일에 추가
