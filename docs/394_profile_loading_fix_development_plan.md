# Stage 11-8: 프로필 로딩 실패 처리 개발 계획

> 문서 번호: 394
> 작성일: 2025-12-19
> 관련 에러리포트: [393_profile_loading_timeout_error_report.md](393_profile_loading_timeout_error_report.md)

---

## 1. 개요

### 문제
- `fetchProfile()` 실패/타임아웃 시 `profile=null` 상태 유지
- `ProtectedRoute`에서 `profile=null`이면 무한 "프로필 로딩 중..." 표시
- 일정 시간 후 페이지 자동 새로고침

### 목표
- 프로필 로딩 실패 시 적절한 에러 UI 표시
- 재시도 버튼 제공
- 무한 로딩 상태 방지

---

## 2. 수정 대상 파일

| 파일 | 변경 내용 |
|------|----------|
| `contexts/AuthContext.tsx` | `profileError` 상태 추가 |
| `components/auth/ProtectedRoute.tsx` | 프로필 로딩 실패 케이스 처리 |

---

## 3. Phase별 개발 계획

### Phase 11-8-A: AuthContext에 profileError 상태 추가

**파일**: `frontend/src/contexts/AuthContext.tsx`

**변경사항**:
```typescript
// 1. 상태 추가
const [profileError, setProfileError] = useState<string | null>(null);

// 2. fetchProfile에서 에러 설정
const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    setProfileError(null);  // 에러 초기화
    // ... 기존 로직 ...
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '프로필 조회 실패';
    setProfileError(errorMsg);
    return null;
  }
};

// 3. Context value에 추가
const value: AuthContextType = {
  // ... 기존 값들 ...
  profileError,
  refetchProfile: () => user && fetchProfile(user.id),  // 재시도 함수
};
```

**타입 변경**:
```typescript
interface AuthContextType {
  // ... 기존 타입 ...
  profileError: string | null;
  refetchProfile: () => void;
}
```

---

### Phase 11-8-B: ProtectedRoute 에러 처리

**파일**: `frontend/src/components/auth/ProtectedRoute.tsx`

**변경사항**:
```typescript
export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasPermission, profile, profileError, refetchProfile } = useAuth();
  const location = useLocation();

  // 로딩 중
  if (isLoading) {
    return <LoadingSpinner message="로딩 중..." />;
  }

  // 미인증 → 로그인 페이지로
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 권한 체크가 필요한 경우
  if (roles && roles.length > 0) {
    // Case 1: 프로필 로딩 실패 (에러 발생)
    if (profileError) {
      return (
        <ProfileLoadError
          message={profileError}
          onRetry={refetchProfile}
        />
      );
    }

    // Case 2: 프로필 아직 로딩 중 (isLoading=false지만 profile=null, error=null)
    // → 백그라운드 로딩 중일 수 있음, 짧은 대기
    if (!profile && !profileError) {
      return <LoadingSpinner message="프로필 로딩 중..." />;
    }

    // Case 3: 프로필 있음 → 권한 체크
    if (profile && !hasPermission(roles)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
```

**새 컴포넌트**:
```typescript
// ProfileLoadError 컴포넌트 (같은 파일 내 또는 별도 파일)
function ProfileLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50">
      <div className="text-center max-w-sm">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-semibold text-grey-900 mb-2">
          프로필을 불러올 수 없습니다
        </h2>
        <p className="text-grey-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            다시 시도
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-grey-200 text-grey-700 rounded-lg hover:bg-grey-300 transition-colors"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    </div>
  );
}

// LoadingSpinner 컴포넌트
function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
        <p className="text-grey-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
```

---

### Phase 11-8-C: 빌드 테스트

```bash
cd frontend
npm run build
```

**체크리스트**:
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공

---

### Phase 11-8-D: 통합 테스트

**테스트 시나리오**:

| 시나리오 | 예상 결과 |
|---------|----------|
| 정상 로그인 → /admin | 페이지 정상 표시 |
| 프로필 조회 타임아웃 (5초) | "프로필을 불러올 수 없습니다" + 재시도 버튼 |
| 재시도 버튼 클릭 | 프로필 다시 조회 시도 |
| 로그인 페이지로 버튼 클릭 | /login으로 이동 |
| 권한 없는 페이지 접근 | /unauthorized로 리다이렉트 |

---

## 4. 의존성 순서

```
Phase 11-8-A (AuthContext 수정)
    ↓
Phase 11-8-B (ProtectedRoute 수정)
    ↓
Phase 11-8-C (빌드 테스트)
    ↓
Phase 11-8-D (통합 테스트)
```

---

## 5. 예상 에러 및 대응

| 예상 에러 | 원인 | 해결 |
|----------|------|------|
| `profileError is not defined` | AuthContextType에 타입 미추가 | 인터페이스에 `profileError: string \| null` 추가 |
| `refetchProfile is not defined` | Context value에 미포함 | value 객체에 함수 추가 |
| 무한 재렌더링 | refetchProfile 함수 매번 새로 생성 | useCallback으로 감싸기 |

---

## 6. 롤백 계획

문제 발생 시:
1. `ProtectedRoute.tsx`를 이전 버전으로 복원
2. `AuthContext.tsx`에서 profileError 관련 코드 제거

---

## 7. 완료 기준

- [ ] Phase 11-8-A: AuthContext profileError 상태 추가 완료
- [ ] Phase 11-8-B: ProtectedRoute 에러 처리 완료
- [ ] Phase 11-8-C: 빌드 성공
- [ ] Phase 11-8-D: 모든 테스트 시나리오 통과

---

*v1.0 - 2025-12-19*
