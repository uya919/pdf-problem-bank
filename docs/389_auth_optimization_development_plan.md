# 389. Auth 프로필 로딩 최적화 개발 계획

> 작성일: 2025-12-19
> 기반 리포트: [388_auth_profile_timeout_error_report.md](388_auth_profile_timeout_error_report.md)

---

## 1. 목표

1. **중복 호출 방지**: 프로필 조회가 여러 번 호출되는 문제 해결
2. **로딩 시간 단축**: 타임아웃 5초 → 3초로 감소
3. **콘솔 에러 제거**: 불필요한 타임아웃 에러 방지

---

## 2. 현재 문제점

```
1. initAuth() 호출 → fetchProfile()
2. onAuthStateChange(SIGNED_IN) → fetchProfile() (중복!)
3. onAuthStateChange(INITIAL_SESSION) → fetchProfile() (중복!)
4. 타임아웃 5초 도달 → 에러 발생
5. 결국 프로필 로드 성공 (느림)
```

---

## 3. 해결 전략

### 3.1 중복 호출 방지
- `isFetchingProfile` ref로 진행 중인 요청 추적
- 이미 요청 중이면 새 요청 스킵

### 3.2 로딩 시간 단축
- 타임아웃 5초 → 3초
- 중복 요청 제거로 실제 로딩 시간 감소

### 3.3 이벤트 필터링
- `onAuthStateChange`에서 불필요한 이벤트 무시
- 이미 프로필이 있으면 재조회 스킵

---

## 4. 수정 파일

| 파일 | 수정 내용 |
|------|-----------|
| `frontend/src/contexts/AuthContext.tsx` | 중복 방지 + 타임아웃 단축 |

---

## 5. 상세 수정 내용

### Phase 1: AuthContext.tsx 수정

#### 5.1 상수 변경
```typescript
// Before
const AUTH_INIT_TIMEOUT = 5000; // 5초

// After
const AUTH_INIT_TIMEOUT = 3000; // 3초
```

#### 5.2 중복 호출 방지 ref 추가
```typescript
// 기존
const isInitialized = useRef(false);

// 추가
const isFetchingProfile = useRef(false);
const lastFetchedUserId = useRef<string | null>(null);
```

#### 5.3 fetchProfile 함수 수정
```typescript
const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
  // 중복 호출 방지
  if (isFetchingProfile.current && lastFetchedUserId.current === userId) {
    console.log('프로필 조회 중 - 스킵');
    return profile;
  }

  // 이미 같은 유저의 프로필이 있으면 스킵
  if (profile && profile.id === userId) {
    console.log('프로필 이미 로드됨 - 스킵');
    return profile;
  }

  isFetchingProfile.current = true;
  lastFetchedUserId.current = userId;

  try {
    // ... 기존 조회 로직
  } finally {
    isFetchingProfile.current = false;
  }
}, [profile]);
```

#### 5.4 onAuthStateChange 이벤트 필터링
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event);

  // TOKEN_REFRESHED는 프로필 재조회 불필요
  if (event === 'TOKEN_REFRESHED') {
    return;
  }

  setSession(session);
  setUser(session?.user ?? null);

  if (session?.user) {
    // 이미 같은 유저의 프로필이 있으면 스킵
    if (profile && profile.id === session.user.id) {
      setIsLoading(false);
      return;
    }

    const profileData = await fetchProfile(session.user.id);
    setProfile(profileData);
  } else {
    setProfile(null);
  }

  setIsLoading(false);
});
```

---

## 6. 예상 결과

### Before
```
프로필 조회 시작 (1)
프로필 조회 시작 (2) - 중복
프로필 조회 시작 (3) - 중복
타임아웃 에러!
프로필 조회 성공
```

### After
```
프로필 조회 시작
프로필 조회 중 - 스킵
프로필 이미 로드됨 - 스킵
프로필 조회 성공
```

---

## 7. 테스트 체크리스트

- [ ] 새로고침 시 프로필 정상 로드
- [ ] Ctrl+Shift+R 시 프로필 정상 로드
- [ ] 로그인 시 프로필 정상 로드
- [ ] 콘솔에 타임아웃 에러 없음
- [ ] 중복 "프로필 조회 시작" 로그 없음
- [ ] 로딩 시간 3초 이내

---

## 8. 롤백 계획

문제 발생 시 `AUTH_INIT_TIMEOUT`을 5초로 복원하고 중복 방지 로직 제거

