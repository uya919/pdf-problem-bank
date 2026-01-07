# Hard Refresh (Ctrl+Shift+R) 무한 로딩 에러 리포트

**작성일**: 2025-12-19
**상태**: 분석 완료
**심각도**: 높음 (사용자 경험 영향)

---

## 1. 문제 설명

### 증상
- 로그인 후 `Ctrl + Shift + R` (강력 새로고침/캐시 무시 새로고침) 실행
- 페이지가 **무한 로딩** 상태에 빠짐
- 스피너가 계속 돌아가고 앱이 사용 불가

### 일반 새로고침 (F5 / Ctrl+R)
- 정상 작동 (세션 유지)

### 강력 새로고침 (Ctrl+Shift+R)
- 무한 로딩 발생

---

## 2. 원인 분석

### 2.1 Ctrl+Shift+R의 동작

| 새로고침 종류 | 캐시 | 메모리 | sessionStorage |
|--------------|------|--------|----------------|
| F5 (일반) | 유지 | 초기화 | **유지** |
| Ctrl+Shift+R (강력) | **삭제** | 초기화 | **유지** |

> **중요**: `Ctrl+Shift+R`은 **브라우저 캐시만** 삭제하고, `sessionStorage`는 유지됨

### 2.2 현재 세션 저장 방식

**파일**: `frontend/src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
      storageKey: 'hyeyum-auth-session',
    },
  }
);
```

- `sessionStorage`에 세션 저장
- 키: `hyeyum-auth-session`

### 2.3 인증 초기화 흐름

**파일**: `frontend/src/contexts/AuthContext.tsx`

```typescript
useEffect(() => {
  if (!isSupabaseConfigured) {
    setIsLoading(false);
    return;
  }

  // 1. 현재 세션 가져오기
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);

    if (session?.user) {
      // 2. 프로필 조회
      const profileData = await fetchProfile(session.user.id);
      setProfile(profileData);
    }

    setIsLoading(false);  // ← 여기서 로딩 종료
  });

  // 3. 인증 상태 변경 구독
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      // ...
      setIsLoading(false);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 2.4 문제 발생 시나리오

```
[로그인 상태에서 Ctrl+Shift+R 실행]
    ↓
[1] 브라우저 캐시 삭제 (JS 번들, CSS 등)
    ↓
[2] sessionStorage는 그대로 유지 (hyeyum-auth-session 존재)
    ↓
[3] 앱 재시작 → AuthContext useEffect 실행
    ↓
[4] supabase.auth.getSession() 호출
    ↓
[5] 🔴 문제 발생 지점:
    - sessionStorage에서 세션 토큰 읽음
    - 하지만 토큰 검증 과정에서 **네트워크 요청 필요**
    - 캐시가 삭제되어 **새로운 JS 번들**로 Supabase SDK 재초기화
    - SDK 내부 상태와 sessionStorage 상태 **불일치**
    ↓
[6] getSession()이 Promise를 반환하지만:
    - resolve도 안 됨
    - reject도 안 됨
    - 또는 onAuthStateChange가 여러 번 호출되며 충돌
    ↓
[7] setIsLoading(false)가 호출되지 않음
    ↓
[8] ProtectedRoute에서 영원히 로딩 스피너 표시
```

### 2.5 핵심 원인

| 원인 | 설명 |
|------|------|
| **SDK 재초기화** | 강력 새로고침 시 Supabase SDK가 완전히 재초기화됨 |
| **토큰 불일치** | sessionStorage의 토큰과 SDK 내부 상태 불일치 |
| **Promise 미해결** | getSession()이 정상적으로 resolve/reject 하지 않음 |
| **타임아웃 없음** | 현재 코드에 **타임아웃 처리**가 없음 |

---

## 3. ProtectedRoute 로딩 상태

**파일**: `frontend/src/components/auth/ProtectedRoute.tsx`

```typescript
if (isLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
        <p className="text-grey-500 text-sm">로딩 중...</p>
      </div>
    </div>
  );
}
```

- `isLoading`이 `true`로 유지되면 **영원히** 스피너만 표시

---

## 4. 해결 방안

### Option A: 타임아웃 추가 (권장)

```typescript
// AuthContext.tsx
useEffect(() => {
  if (!isSupabaseConfigured) {
    setIsLoading(false);
    return;
  }

  // 타임아웃 설정 (5초)
  const timeout = setTimeout(() => {
    console.warn('인증 초기화 타임아웃');
    setIsLoading(false);
  }, 5000);

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    clearTimeout(timeout);
    // ... 기존 로직
    setIsLoading(false);
  }).catch((error) => {
    clearTimeout(timeout);
    console.error('세션 조회 실패:', error);
    setIsLoading(false);
  });

  // ... onAuthStateChange 구독

  return () => {
    clearTimeout(timeout);
    subscription.unsubscribe();
  };
}, []);
```

**장점**:
- 간단한 수정
- 최악의 경우에도 5초 후 로딩 해제

**단점**:
- 5초 대기 시간 발생

### Option B: 세션 유효성 검증 추가

```typescript
useEffect(() => {
  const initAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // 세션이 없거나 에러 → 로그아웃 상태로 처리
        setIsLoading(false);
        return;
      }

      // 세션이 있으면 토큰 유효성 검증
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // 토큰이 유효하지 않음 → 세션 클리어
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // 정상적인 세션
      setUser(user);
      setSession(session);
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      setIsLoading(false);
    } catch (err) {
      console.error('인증 초기화 에러:', err);
      setIsLoading(false);
    }
  };

  initAuth();
}, []);
```

**장점**:
- 토큰 유효성 명시적 검증
- 에러 케이스 모두 처리

**단점**:
- 추가 API 호출 (getUser)

### Option C: sessionStorage 클리어 + 재로그인 유도

```typescript
// 강력 새로고침 감지 시 세션 클리어
useEffect(() => {
  // performance.navigation.type 확인 (deprecated but works)
  // 또는 beforeunload 이벤트로 플래그 설정

  const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

  if (navigationType?.type === 'reload') {
    // 강력 새로고침인지 확인하기 어려움
    // 대안: 항상 getSession 결과 확인
  }
}, []);
```

**장점**: 깔끔한 상태 초기화
**단점**: 강력 새로고침 감지가 어려움

### Option D: localStorage 사용 (요구사항 변경)

```typescript
// supabase.ts
storage: typeof window !== 'undefined' ? window.localStorage : undefined,
```

**장점**: 더 안정적인 세션 유지
**단점**: 브라우저 종료 시에도 로그인 유지됨 (사용자 요구사항과 다름)

---

## 5. 권장 해결책

**Option A + Option B 조합**

1. **타임아웃 추가**: 5초 후 강제 로딩 해제
2. **getUser() 검증**: 토큰 유효성 명시적 확인
3. **에러 핸들링**: 모든 예외 케이스에서 `setIsLoading(false)` 보장

---

## 6. 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/contexts/AuthContext.tsx` | 타임아웃 + 에러 핸들링 추가 |

---

## 7. 테스트 체크리스트

| 테스트 | 예상 결과 |
|--------|----------|
| 로그인 → F5 | 세션 유지, 정상 표시 |
| 로그인 → Ctrl+Shift+R | 세션 유지 또는 로그인 페이지 (무한 로딩 없음) |
| 로그인 → 브라우저 종료 → 재접속 | 로그아웃 상태 |
| 미로그인 → Ctrl+Shift+R | 로그인 페이지로 이동 |

---

## 8. 참조

- [Supabase Auth - getSession vs getUser](https://supabase.com/docs/reference/javascript/auth-getsession)
- [MDN - PerformanceNavigationTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)
- [sessionStorage vs localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

---

## 9. 추가 조사 필요 항목

1. **브라우저 콘솔 로그 확인**: `Ctrl+Shift+R` 시 콘솔에 어떤 에러가 출력되는지
2. **네트워크 탭 확인**: Supabase API 호출이 pending 상태인지, 실패하는지
3. **sessionStorage 상태**: `hyeyum-auth-session` 키의 값이 유효한지

```javascript
// 브라우저 콘솔에서 확인
console.log(sessionStorage.getItem('hyeyum-auth-session'));
```
