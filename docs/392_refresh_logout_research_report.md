# 새로고침 시 로그인 풀림 현상 연구 리포트

**작성일**: 2025-12-19
**상태**: 연구 완료
**심각도**: 높음

---

## 1. 문제 설명

### 증상
- 로그인 후 **새로고침(F5)** 하면 로그인이 풀림
- 로그인 페이지로 리다이렉트됨

### 기대 동작
- 새로고침(F5): **로그인 유지**
- 브라우저 종료: **로그아웃**

---

## 2. 현재 시스템 분석

### 2.1 세션 저장 설정

**파일**: `frontend/src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,  // ✅ 세션 저장 활성화
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
      storageKey: 'hyeyum-auth-session',
    },
  }
);
```

**설정 분석**:

| 설정 | 값 | 설명 |
|------|-----|------|
| `persistSession` | `true` | 세션을 storage에 저장 |
| `storage` | `sessionStorage` | 브라우저 종료 시 삭제됨 |
| `storageKey` | `'hyeyum-auth-session'` | 저장 키 |

### 2.2 인증 상태 확인 조건

**파일**: `frontend/src/contexts/AuthContext.tsx`

```typescript
// 계산된 값
const isAuthenticated = !!user && !!profile;  // ← 핵심!
```

**문제점**: `isAuthenticated`가 `true`가 되려면 **user**와 **profile** 둘 다 필요

---

## 3. 문제 원인 분석

### 3.1 흐름 분석

```
[새로고침 실행]
    ↓
[1] sessionStorage에서 세션 토큰 존재 (hyeyum-auth-session)
    ↓
[2] supabase.auth.getSession() 호출
    ↓
[3] session 객체 반환 (user 정보 포함)
    ↓
[4] setUser(session.user) ✅
    ↓
[5] fetchProfile(session.user.id) 호출
    ↓
[6] 🔴 프로필 조회 실패 또는 타임아웃
    ↓
[7] setProfile(null) 또는 profile이 설정 안 됨
    ↓
[8] isAuthenticated = !!user && !!profile = true && false = false
    ↓
[9] ProtectedRoute에서 /login으로 리다이렉트
```

### 3.2 핵심 원인

**Stage 11-6에서 추가한 타임아웃 로직 문제**:

```typescript
// 프로필 조회 (타임아웃 적용)
const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('프로필 조회 타임아웃')), AUTH_INIT_TIMEOUT);
    });

    const queryPromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
    // ...
  } catch (err) {
    console.error('프로필 조회 에러:', err);
    return null;  // ← 타임아웃 시 null 반환
  }
};
```

**문제**:
1. 프로필 조회가 5초 내에 완료되지 않으면 `null` 반환
2. `profile === null` → `isAuthenticated === false`
3. 로그인 페이지로 리다이렉트

### 3.3 추가 문제: 프로필 조회 자체 실패

콘솔 로그에서 확인된 것:
```
프로필 조회 시작: dde48d24-8627-4458-a0ca-353bc049689a
(프로필 조회 성공/실패 로그 없음)
```

**가능한 원인들**:

| 원인 | 설명 |
|------|------|
| **RLS 정책** | profiles 테이블의 RLS가 세션 복원된 토큰을 거부 |
| **네트워크** | Supabase API 요청이 pending 상태 |
| **토큰 불일치** | sessionStorage 토큰과 Supabase SDK 내부 상태 불일치 |

---

## 4. sessionStorage 동작 검증

### 4.1 sessionStorage 특성

| 상황 | sessionStorage | 예상 동작 |
|------|----------------|----------|
| F5 (일반 새로고침) | **유지** | 세션 유지 |
| Ctrl+Shift+R (강력 새로고침) | **유지** | 세션 유지 |
| 같은 탭에서 URL 입력 | **유지** | 세션 유지 |
| 새 탭에서 열기 | **없음** (탭 격리) | 로그인 필요 |
| 브라우저 종료 | **삭제** | 로그인 필요 |

### 4.2 실제 테스트 결과

사용자가 확인한 sessionStorage 내용:
```javascript
sessionStorage.getItem('hyeyum-auth-session')
// → 세션 데이터 존재 (access_token, refresh_token 등)
```

**결론**: sessionStorage는 정상 작동. 문제는 **프로필 조회**에 있음.

---

## 5. 근본 원인 추정

### 가설 1: RLS 정책 문제

Supabase `profiles` 테이블의 RLS 정책이 세션 복원 시 토큰을 올바르게 인식하지 못할 수 있음.

**확인 방법**:
```sql
-- Supabase SQL Editor에서 실행
SELECT * FROM profiles WHERE id = 'dde48d24-8627-4458-a0ca-353bc049689a';
```

### 가설 2: SDK 내부 상태 불일치

`supabase.auth.getSession()`은 sessionStorage에서 토큰을 읽지만,
SDK 내부적으로 세션이 "활성화"되지 않은 상태일 수 있음.

**Supabase 공식 문서에서 권장하는 패턴**:
```typescript
// getSession() 대신 onAuthStateChange 사용
supabase.auth.onAuthStateChange((event, session) => {
  // INITIAL_SESSION 이벤트에서 세션 처리
});
```

### 가설 3: 타임아웃 너무 짧음

5초 타임아웃이 네트워크 상황에 따라 충분하지 않을 수 있음.

---

## 6. 해결 방안

### Option A: isAuthenticated 조건 완화 (빠른 수정)

```typescript
// 현재
const isAuthenticated = !!user && !!profile;

// 변경: user만 있으면 인증된 것으로 처리
const isAuthenticated = !!user;
```

**장점**: 빠른 수정, 프로필 로딩 실패해도 인증 유지
**단점**: 프로필 없이 앱 사용 시 오류 가능

### Option B: 프로필 로딩 실패 시 재시도

```typescript
const fetchProfile = async (userId: string, retries = 3): Promise<Profile | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as Profile;
      }

      console.warn(`프로필 조회 실패 (${i + 1}/${retries}):`, error);
      await new Promise(r => setTimeout(r, 1000)); // 1초 대기 후 재시도
    } catch (err) {
      console.error('프로필 조회 에러:', err);
    }
  }
  return null;
};
```

**장점**: 일시적 네트워크 문제 해결
**단점**: 근본 원인 해결 안 됨

### Option C: onAuthStateChange 우선 사용 (권장)

```typescript
useEffect(() => {
  // getSession()은 초기 세션만 확인
  // onAuthStateChange가 INITIAL_SESSION 이벤트로 세션 복원
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setSession(null);
      }

      setIsLoading(false);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

**장점**: Supabase 공식 권장 패턴
**단점**: 코드 구조 변경 필요

### Option D: localStorage로 변경 (요구사항 변경)

```typescript
// supabase.ts
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

**장점**: 가장 안정적인 세션 유지
**단점**: 브라우저 종료 시에도 로그인 유지 (사용자 요구사항 불충족)

### Option E: 하이브리드 방식 (권장)

1. `localStorage` 사용 (안정적인 세션 유지)
2. 별도 "로그아웃 예약" 플래그로 브라우저 종료 감지
3. `beforeunload` 이벤트에서 로그아웃 처리

```typescript
// beforeunload 이벤트로 브라우저 종료 감지
window.addEventListener('beforeunload', () => {
  // 단, 새로고침과 브라우저 종료 구분이 어려움
});
```

**문제**: `beforeunload`로는 새로고침과 브라우저 종료를 구분할 수 없음

---

## 7. 권장 해결 순서

### 즉시 적용 (빠른 수정)

1. **Option A**: `isAuthenticated` 조건을 `!!user`로 완화
2. 프로필 로딩 실패해도 앱 사용 가능하게 처리

### 근본 해결 (추후)

1. **Option C**: `onAuthStateChange` 중심으로 코드 리팩토링
2. RLS 정책 확인 및 수정
3. 프로필 로딩 실패 시 UI 대응 (재시도 버튼 등)

---

## 8. 추가 조사 필요 항목

1. **Supabase Dashboard에서 RLS 정책 확인**
   - `profiles` 테이블의 SELECT 정책
   - `auth.uid()` 조건 확인

2. **네트워크 요청 확인**
   - `/rest/v1/profiles` 요청의 응답 상태
   - 401, 403, 500 등 에러 코드 확인

3. **콘솔 로그 상세 확인**
   - `프로필 조회 성공` 또는 `프로필 조회 실패` 로그 유무
   - `프로필 조회 타임아웃` 로그 유무

---

## 9. 결론

| 원인 | 해결책 | 우선순위 |
|------|--------|---------|
| 프로필 조회 실패 시 로그아웃 처리됨 | `isAuthenticated` 조건 완화 | 높음 |
| 타임아웃 후 profile이 null | 타임아웃 연장 또는 재시도 | 중간 |
| RLS 정책 문제 가능성 | Supabase Dashboard 확인 | 중간 |

**즉시 적용 권장**: Option A (isAuthenticated 조건 완화)

---

## 10. 참조

- [Supabase Auth - Session Management](https://supabase.com/docs/reference/javascript/auth-getsession)
- [Supabase Auth - onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [MDN - sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
