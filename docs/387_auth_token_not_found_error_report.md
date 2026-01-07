# 인증 토큰 누락 에러 리포트

**작성일**: 2025-12-17
**상태**: 🔴 수정 필요
**심각도**: High (사용자 관리 기능 차단)

---

## 1. 에러 현상

### 증상
- `/admin/users` 페이지에서 "새 사용자 추가" 시도
- 에러 메시지: `인증이 필요합니다`
- 시크릿 모드에서도 동일 에러 발생

### 콘솔 에러 로그
```
CreateUserModal.tsx:55 사용자 생성 실패: Error: 인증이 필요합니다
    at handleResponse (adminUsers.ts:84:11)
```

### 현재 상태
- 로그인 상태: ✅ SIGNED_IN
- 프로필 조회: ✅ 성공 (owner 권한)
- API 호출: ❌ 인증 실패

---

## 2. 원인 분석

### 2.1 근본 원인: `persistSession: false` 설정

**파일**: `frontend/src/lib/supabase.ts` (line 43-44)

```typescript
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,  // ⚠️ 문제! localStorage에 세션 저장 안 함
      autoRefreshToken: true,
    },
  }
);
```

### 2.2 문제 흐름

```
1. 사용자 로그인 → Supabase 세션 생성
2. persistSession: false → localStorage에 저장 안 됨
3. adminUsers.ts의 getAuthHeaders() 실행
4. localStorage에서 토큰 찾기 시도 → 없음!
5. Authorization 헤더 없이 API 호출
6. 백엔드에서 "인증이 필요합니다" 에러 반환
```

### 2.3 getAuthHeaders() 함수 분석

**파일**: `frontend/src/api/adminUsers.ts` (line 56-76)

```typescript
function getAuthHeaders(): HeadersInit {
  // localStorage에서 토큰을 찾으려고 시도
  const sessionStr = localStorage.getItem('sb-rhejybeufojkfdfntpfg-auth-token');
  let accessToken = '';

  if (sessionStr) {  // ❌ sessionStr이 null!
    try {
      const session = JSON.parse(sessionStr);
      accessToken = session.access_token || '';
    } catch {
      // JSON 파싱 실패
    }
  }

  // accessToken이 빈 문자열이라 Authorization 헤더 없음
  return {
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })  // ❌ 빈 문자열
  };
}
```

---

## 3. 해결 방법

### Option A: supabase 클라이언트에서 직접 세션 가져오기 (권장)

**파일**: `frontend/src/api/adminUsers.ts`

```typescript
import { supabase } from '@/lib/supabase';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || '';

  return {
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  };
}
```

### Option B: persistSession을 true로 변경

**파일**: `frontend/src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,  // ✅ localStorage에 세션 저장
      autoRefreshToken: true,
    },
  }
);
```

> ⚠️ **주의**: Option B는 브라우저를 닫아도 로그인 상태가 유지됩니다.
> 보안이 중요한 환경에서는 Option A를 권장합니다.

---

## 4. 권장 수정 사항 (Option A 적용)

### 4.1 adminUsers.ts 수정

```typescript
import { supabase } from '@/lib/supabase';

/**
 * 인증 헤더 생성 (비동기)
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || '';

  return {
    'Content-Type': 'application/json',
    ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
  };
}

// API 함수들도 async/await로 수정 필요
export async function createUser(data: CreateUserData): Promise<CreateUserResponse> {
  const headers = await getAuthHeaders();  // await 추가
  const response = await fetch(`${API_BASE}/api/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });

  return handleResponse<CreateUserResponse>(response);
}
```

---

## 5. 관련 파일

| 파일 | 역할 | 수정 필요 |
|------|------|----------|
| `frontend/src/lib/supabase.ts` | Supabase 클라이언트 설정 | Option B 시 |
| `frontend/src/api/adminUsers.ts` | 사용자 관리 API 클라이언트 | ✅ Option A 시 |

---

## 6. 결론

**핵심 원인**: `persistSession: false` 설정으로 localStorage에 세션이 저장되지 않아서, API 호출 시 인증 토큰을 찾을 수 없음

**권장 해결책**: `supabase.auth.getSession()`을 사용하여 직접 세션에서 토큰 가져오기 (Option A)
