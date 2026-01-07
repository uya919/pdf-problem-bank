# 프로필 로딩 타임아웃 에러 리포트

> 문서 번호: 393
> 작성일: 2025-12-19
> 상태: 분석 완료

---

## 1. 문제 현상

### 증상
- "프로필 로딩 중..." 메시지가 오래 표시됨
- 일정 시간 후 페이지가 자동으로 새로고침됨
- 관리자 페이지(`/admin/*`) 접근 시 주로 발생

### 재현 경로
1. 로그인 성공
2. `/admin/operations` 등 관리자 페이지 접근
3. "프로필 로딩 중..." 무한 표시
4. 페이지 자동 새로고침

---

## 2. 원인 분석

### 2.1 코드 흐름

```
[사용자 로그인]
    ↓
[AuthContext.initAuth()]
    ├── supabase.auth.getSession() → user 설정
    ├── fetchProfile(userId) → 5초 타임아웃
    └── setIsLoading(false)
    ↓
[ProtectedRoute 렌더링]
    ├── isLoading=false 확인 ✓
    ├── isAuthenticated (user 존재) 확인 ✓
    ├── roles 체크 필요 → profile 확인
    └── profile이 null이면 → "프로필 로딩 중..." 무한 대기 ❌
```

### 2.2 근본 원인

**AuthContext.tsx:143-144**
```typescript
if (session?.user) {
  const profileData = await fetchProfile(session.user.id);
  setProfile(profileData);  // 실패 시 null 반환
}
```

**ProtectedRoute.tsx:42-51**
```typescript
if (roles && roles.length > 0) {
  if (!profile) {
    return (
      <div>프로필 로딩 중...</div>  // profile이 null이면 무한 대기
    );
  }
}
```

**문제점**:
1. `fetchProfile()`이 타임아웃되거나 에러 시 `null` 반환
2. `isLoading`은 `false`가 됨 (로딩 완료 상태)
3. 하지만 `profile`은 여전히 `null`
4. `ProtectedRoute`에서 `profile`이 없으면 무한 대기
5. 새로고침되는 이유: 타임아웃 후 상태 불일치 또는 ErrorBoundary 트리거

### 2.3 프로필 조회 실패 가능 원인

| 원인 | 설명 |
|------|------|
| **RLS 정책** | profiles 테이블 SELECT 권한 부족 |
| **네트워크** | Supabase 연결 타임아웃 (5초 제한) |
| **데이터 없음** | Auth user는 있지만 profiles 레코드 없음 |
| **타입 불일치** | role 값이 'teacher'/'admin'/'owner' 외 다른 값 |

---

## 3. 문제 시퀀스 다이어그램

```
User        AuthContext      Supabase       ProtectedRoute
  |              |               |                |
  |--로그인----->|               |                |
  |              |--getSession-->|                |
  |              |<--session-----|                |
  |              |--fetchProfile-|                |
  |              |     (5초 타임아웃)              |
  |              |<--timeout/null|                |
  |              |               |                |
  |              | isLoading=false                |
  |              | profile=null                   |
  |              |               |                |
  |              |               |     페이지 렌더링
  |              |               |                |
  |              |               |  profile=null?
  |              |               |  → "프로필 로딩 중..." (무한)
  |              |               |                |
```

---

## 4. 영향 범위

### 영향받는 라우트 (roles 체크가 있는 모든 경로)

| 경로 | roles | 영향 |
|------|-------|------|
| `/` | ['teacher', 'admin', 'owner'] | O |
| `/backoffice` | ['teacher', 'admin', 'owner'] | O |
| `/admin` | ['admin', 'owner'] | O |
| `/admin/operations` | ['admin', 'owner'] | O |
| `/admin/settlement` | ['owner'] | O |
| `/login` | 없음 | X (roles 체크 없음) |

---

## 5. 해결 방안

### 방안 A: ProtectedRoute에서 profile 로딩 실패 처리 (권장)

```typescript
// ProtectedRoute.tsx
if (roles && roles.length > 0) {
  // profile이 null이고 isLoading도 false면 → 로딩 실패
  if (!profile && !isLoading) {
    // 옵션 1: 프로필 새로고침 버튼 표시
    return <ProfileLoadError onRetry={() => window.location.reload()} />;

    // 옵션 2: 로그인 페이지로 리다이렉트
    // return <Navigate to="/login" state={{ error: 'profile_load_failed' }} replace />;
  }

  // profile이 있으면 권한 체크
  if (!hasPermission(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }
}
```

### 방안 B: AuthContext에서 profileError 상태 추가

```typescript
// AuthContext.tsx
const [profileError, setProfileError] = useState<string | null>(null);

const fetchProfile = async (userId: string) => {
  try {
    // ...
  } catch (err) {
    setProfileError('프로필을 불러올 수 없습니다');
    return null;
  }
};

// value에 profileError 추가
const value = {
  // ...
  profileError,
};
```

### 방안 C: 프로필 재시도 로직 추가

```typescript
// AuthContext.tsx
const [profileRetryCount, setProfileRetryCount] = useState(0);
const MAX_PROFILE_RETRY = 3;

const fetchProfile = async (userId: string) => {
  if (profileRetryCount >= MAX_PROFILE_RETRY) {
    console.error('프로필 조회 최대 재시도 초과');
    return null;
  }

  try {
    // ...
  } catch (err) {
    setProfileRetryCount(prev => prev + 1);
    // 1초 후 재시도
    setTimeout(() => fetchProfile(userId), 1000);
    return null;
  }
};
```

---

## 6. 권장 해결 방안

### 즉시 수정 (방안 A 적용)

**수정 파일**: `frontend/src/components/auth/ProtectedRoute.tsx`

```typescript
// Stage 11-8: 프로필 로딩 실패 처리
if (roles && roles.length > 0) {
  // profile이 null이고 isLoading도 false = 프로필 로딩 실패
  if (!profile && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grey-50">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-4">프로필을 불러올 수 없습니다</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // profile이 있으면 권한 체크
  if (profile && !hasPermission(roles)) {
    return <Navigate to="/unauthorized" replace />;
  }
}
```

### 추가 디버깅 (선택)

**Supabase RLS 확인 필요**:
```sql
-- profiles 테이블 RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 현재 사용자가 자신의 프로필 조회 가능한지 테스트
SELECT * FROM profiles WHERE id = auth.uid();
```

---

## 7. 테스트 체크리스트

- [ ] 정상 로그인 → 관리자 페이지 접근 가능
- [ ] 프로필 조회 실패 시 → 에러 메시지 + 재시도 버튼 표시
- [ ] 재시도 버튼 클릭 → 페이지 새로고침
- [ ] 네트워크 끊김 상태 → 적절한 에러 표시
- [ ] 5초 타임아웃 후 → 무한 로딩 대신 에러 표시

---

## 8. 결론

| 항목 | 내용 |
|------|------|
| **원인** | profile 로딩 실패 시 ProtectedRoute가 무한 대기 |
| **영향** | 모든 role-protected 라우트 접근 불가 |
| **해결** | ProtectedRoute에서 profile 로딩 실패 케이스 처리 |
| **우선순위** | 높음 (사용자 접근 차단) |

---

*v1.0 - 2025-12-19*
