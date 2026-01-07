# 388. 프로필 조회 타임아웃 에러 리포트

> 작성일: 2025-12-19
> 상태: 분석 완료

---

## 1. 에러 현상

### 콘솔 로그
```
AuthContext.tsx:89 프로필 조회 시작: dde48d24-8627-4458-a0ca-353bc049689a
AuthContext.tsx:131 인증 초기화 타임아웃 - 로딩 강제 해제
AuthContext.tsx:114 프로필 조회 에러: Error: 프로필 조회 타임아웃
```

### 발생 시점
- 페이지 로드 시
- HMR (Hot Module Replacement) 발생 시
- 새로고침 시

### 특이사항
- 에러 후에도 프로필 조회가 **결국 성공**함
- `프로필 조회 성공` 로그가 나중에 출력됨
- 앱 사용에는 문제 없음 (UX 영향 최소)

---

## 2. 원인 분석

### 2.1 타이밍 문제 (Race Condition)

```typescript
// AuthContext.tsx:21
const AUTH_INIT_TIMEOUT = 5000; // 5초

// Line 93-95: 타임아웃 Promise
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('프로필 조회 타임아웃')), AUTH_INIT_TIMEOUT);
});

// Line 103: Promise.race로 경쟁
const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
```

**문제점**: Supabase 초기 연결이 느릴 때 5초 타임아웃보다 오래 걸림

### 2.2 다중 호출 문제

콘솔 로그를 보면 `fetchProfile`이 **여러 번** 호출됨:

```
1. Auth state changed: SIGNED_IN        → fetchProfile 호출
2. 인증 초기화 타임아웃 - 로딩 강제 해제   → 타임아웃 발생
3. 프로필 조회 에러: 타임아웃             → 첫 번째 호출 실패
4. 프로필 조회 시작 (2번째)              → onAuthStateChange 재호출
5. Auth state changed: INITIAL_SESSION  → 또 호출
6. 프로필 조회 성공                      → 결국 성공
```

**원인**:
1. `initAuth()` 호출 시 프로필 조회
2. `onAuthStateChange` 이벤트마다 프로필 조회
3. Supabase가 여러 이벤트 발생 (`SIGNED_IN`, `INITIAL_SESSION`)

### 2.3 Supabase Auth 이벤트 순서

```
SIGNED_IN → INITIAL_SESSION → SIGNED_IN (토큰 갱신)
```

각 이벤트마다 `fetchProfile`이 호출되어 불필요한 요청 발생

---

## 3. 영향도 분석

| 항목 | 영향 | 설명 |
|------|------|------|
| **기능** | ✅ 정상 | 결국 프로필 로드됨 |
| **UX** | ⚠️ 경미 | 콘솔 에러만 표시 |
| **성능** | ⚠️ 경미 | 불필요한 API 호출 |
| **보안** | ✅ 영향 없음 | - |

---

## 4. 해결 방안

### Option A: 타임아웃 증가 (간단)

```typescript
// 5초 → 10초로 증가
const AUTH_INIT_TIMEOUT = 10000;
```

**장점**: 코드 변경 최소
**단점**: 근본 해결 아님

### Option B: 프로필 조회 디바운싱 (권장)

```typescript
// 프로필 조회 중복 방지
const isFetchingProfile = useRef(false);

const fetchProfile = useCallback(async (userId: string) => {
  if (isFetchingProfile.current) {
    console.log('프로필 조회 중 - 스킵');
    return profile; // 기존 프로필 반환
  }

  isFetchingProfile.current = true;
  try {
    // ... 조회 로직
  } finally {
    isFetchingProfile.current = false;
  }
}, [profile]);
```

**장점**: 중복 요청 방지
**단점**: 약간의 코드 추가

### Option C: onAuthStateChange 이벤트 필터링

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  // INITIAL_SESSION만 처리 (중복 방지)
  if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN') {
    return;
  }

  // 이미 프로필이 있으면 스킵
  if (profile && session?.user?.id === profile.id) {
    return;
  }

  // ... 프로필 조회
});
```

**장점**: 이벤트 레벨에서 중복 방지
**단점**: 토큰 갱신 시 프로필 업데이트 안 됨

### Option D: 타임아웃 제거 + AbortController (가장 안전)

```typescript
const fetchProfile = useCallback(async (userId: string, signal?: AbortSignal) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .abortSignal(signal);  // Supabase v2.39+ 지원

  // ...
}, []);
```

**장점**: 네트워크 수준에서 취소 가능
**단점**: Supabase 버전 확인 필요

---

## 5. 권장 해결책

### 단기: Option A + Option B 조합

1. 타임아웃 5초 → 10초로 증가
2. 중복 호출 방지 플래그 추가

### 장기: Option C (이벤트 필터링)

onAuthStateChange에서 불필요한 이벤트 무시

---

## 6. 우선순위

| 우선순위 | 액션 |
|----------|------|
| **낮음** | 현재 상태로 유지 (기능 정상) |
| **중간** | Option A 적용 (타임아웃 증가) |
| **높음** | Option B + C 적용 (완전 해결) |

> **결론**: 현재 에러는 UX에 큰 영향이 없음. 콘솔 에러가 불편하면 Option A 적용 권장.

---

## 7. 관련 파일

- [frontend/src/contexts/AuthContext.tsx](../frontend/src/contexts/AuthContext.tsx) - 인증 컨텍스트
- [frontend/src/lib/supabase.ts](../frontend/src/lib/supabase.ts) - Supabase 클라이언트

