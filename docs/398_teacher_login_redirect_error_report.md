# 강사 로그인 후 /unauthorized 리다이렉트 버그

> **날짜**: 2025-12-19
> **심각도**: High (강사가 로그인해도 서비스 이용 불가)
> **상태**: 분석 완료

---

## 1. 증상

| 항목 | 내용 |
|------|------|
| **현상** | 강사 계정(`teacher` role)으로 로그인 시 `/unauthorized` 페이지로 이동 |
| **기대 동작** | `/backoffice` (강사용 대시보드)로 자동 리다이렉트 |
| **영향** | 모든 강사 사용자가 서비스 이용 불가 |

---

## 2. 원인 분석

### 2.1 코드 흐름

```
로그인 성공 (LoginPage.tsx:65)
    ↓
navigate(from, { replace: true })  // from = '/'
    ↓
'/' → ProtectedRoute(roles=['teacher', 'admin', 'owner'])
    ↓
인증됨 (user 있음) → HomePage 렌더링
    ↓
HomePage에서 role 체크
```

### 2.2 문제 발생 지점: HomePage.tsx

```typescript
// HomePage.tsx
const { role, isLoading, isAuthenticated } = useAuth();

// isLoading = false (인증 완료)
// isAuthenticated = true (user 있음)
// role = null (profile이 아직 없음!!!)

if (role === 'teacher') {
  return <Navigate to="/backoffice" replace />;  // ← 실행 안됨 (role이 null)
}

if (isDesktop) {
  return <Navigate to="/admin" replace />;  // ← 이게 실행됨!
}

return <Navigate to="/admin-mobile" replace />;
```

### 2.3 근본 원인

**Stage 11-7 변경의 부작용**:
- `isAuthenticated`가 `user`만 있으면 true가 됨 (profile 필요 없음)
- `isLoading`은 false가 됨
- 하지만 `profile`은 아직 로딩 중 → `role = null`

**결과**:
- HomePage가 `role === 'teacher'` 체크 실패
- `isDesktop`이 true면 `/admin`으로 이동
- `/admin`은 `['admin', 'owner']`만 허용
- `teacher`는 권한 없음 → `/unauthorized`

---

## 3. 문제 코드

### 3.1 HomePage.tsx (문제)

```typescript
// Line 14
const { role, isLoading, isAuthenticated } = useAuth();

// Line 35-36 - role이 null일 때 이 분기를 타지 않음
if (role === 'teacher') {
  return <Navigate to="/backoffice" replace />;
}

// Line 40-42 - role이 null이어도 이 분기를 탐
if (isDesktop) {
  return <Navigate to="/admin" replace />;  // 문제!
}
```

### 3.2 AuthContext.tsx (원인)

```typescript
// Line 269-271
const role = profile?.role ?? null;  // profile 없으면 null
const isAuthenticated = !!user;       // user만 있으면 true
```

---

## 4. 해결 방안

### Option A: HomePage에서 profile 로딩 대기 (권장)

```typescript
// HomePage.tsx
export default function HomePage() {
  const { role, isLoading, isAuthenticated, profile } = useAuth();
  const { isDesktop } = useBreakpoint();

  // 로딩 중 또는 profile 미로딩
  if (isLoading || (isAuthenticated && !profile)) {
    return <LoadingSpinner />;
  }

  // 미인증 → 로그인
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 역할별 분기 (이제 profile이 확실히 있음)
  if (role === 'teacher') {
    return <Navigate to="/backoffice" replace />;
  }

  // admin/owner
  return <Navigate to={isDesktop ? '/admin' : '/admin-mobile'} replace />;
}
```

### Option B: ProtectedRoute에서 teacher 예외 처리

```typescript
// ProtectedRoute.tsx
if (profile && !hasPermission(roles)) {
  // teacher가 admin 경로 접근 시 → backoffice로 친절히 리다이렉트
  if (profile.role === 'teacher') {
    return <Navigate to="/backoffice" replace />;
  }
  return <Navigate to="/unauthorized" replace />;
}
```

### Option C: 두 가지 모두 적용 (권장)

1. **HomePage**: profile 로딩 완료까지 대기
2. **ProtectedRoute**: teacher의 admin 접근 시 자동 리다이렉트

---

## 5. 권장 해결책: Option C

**이유**:
1. HomePage 수정: 로그인 직후 정상 분기 보장
2. ProtectedRoute 수정: URL 직접 입력/북마크 대응

---

## 6. 테스트 체크리스트

| 시나리오 | 기대 결과 |
|---------|----------|
| teacher 로그인 | `/backoffice`로 이동 |
| teacher가 `/admin` URL 직접 입력 | `/backoffice`로 리다이렉트 |
| admin 로그인 | `/admin`으로 이동 |
| owner 로그인 | `/admin`으로 이동 |
| 새로고침 후 teacher | `/backoffice` 유지 |
| 미인증 사용자 `/admin` 접근 | `/login`으로 이동 |

---

## 7. 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `pages/HomePage.tsx` | profile 로딩 완료까지 대기 |
| `components/auth/ProtectedRoute.tsx` | teacher의 admin 접근 시 `/backoffice`로 리다이렉트 |

---

## 8. 타임라인

| 버전 | 변경 | 영향 |
|------|------|------|
| Stage 11-7 | isAuthenticated가 user만 체크 | profile 없어도 인증 완료 처리 |
| Stage 11-10 | 프로필 캐싱 추가 | 일부 개선되었으나 첫 로그인 시 여전히 문제 |
| **현재** | HomePage에서 role=null일 때 admin으로 분기 | teacher가 /unauthorized로 이동 |

---

*작성: Claude Code*
