# 역할별 라우팅 및 반응형 단계별 개발 계획

> 작성일: 2025-12-17
> 참조: [380_role_based_routing_responsive_research.md](380_role_based_routing_responsive_research.md)
> 상태: ✅ 완료

---

## 개발 목표

| 목표 | 설명 |
|------|------|
| 역할별 자동 리다이렉트 | teacher → 강사용, admin/owner → 관리자용 |
| 반응형 라우팅 | 모바일 → 모바일 레이아웃, PC → PC 레이아웃 |
| 일관된 UX | 어떤 URL로 접속해도 적절한 페이지로 안내 |

---

## Phase 1: HomePage 생성 (역할별 분기)

### 1-1. useIsMobile 훅 확인

**파일**: `frontend/src/hooks/useIsMobile.ts`

```typescript
/**
 * 반응형 브레이크포인트 감지 훅
 */
import { useState, useEffect } from 'react';

export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < breakpoint);

    checkSize(); // 초기 체크
    window.addEventListener('resize', checkSize);

    return () => window.removeEventListener('resize', checkSize);
  }, [breakpoint]);

  return isMobile;
}
```

**작업**:
- [ ] 파일 존재 여부 확인
- [ ] 없으면 생성

---

### 1-2. HomePage 컴포넌트 생성

**파일**: `frontend/src/pages/HomePage.tsx`

```typescript
/**
 * 홈 페이지 - 역할 + 디바이스 기반 리다이렉트
 *
 * 동작:
 * - teacher → /backoffice
 * - admin/owner + 모바일 → /admin-mobile
 * - admin/owner + PC → /admin
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

export default function HomePage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile(1024);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grey-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-3 text-grey-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 → 로그인
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 강사 → 강사용 대시보드
  if (role === 'teacher') {
    return <Navigate to="/backoffice" replace />;
  }

  // 관리자/원장 + 모바일 → 관리자 모바일
  if (isMobile) {
    return <Navigate to="/admin-mobile" replace />;
  }

  // 관리자/원장 + PC → 관리자 PC
  return <Navigate to="/admin" replace />;
}
```

**작업**:
- [ ] `frontend/src/pages/HomePage.tsx` 생성

---

### 1-3. App.tsx 라우팅 수정

**파일**: `frontend/src/App.tsx`

**변경 전**:
```typescript
<Route path="/" element={
  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
    <BackofficeDemo />
  </ProtectedRoute>
} />
```

**변경 후**:
```typescript
import HomePage from './pages/HomePage';

// ...

<Route path="/" element={
  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
    <HomePage />
  </ProtectedRoute>
} />
```

**작업**:
- [ ] HomePage import 추가
- [ ] `/` 경로 컴포넌트 변경

---

## Phase 2: LoginPage 리다이렉트 수정

### 2-1. 로그인 성공 후 리다이렉트

**파일**: `frontend/src/pages/auth/LoginPage.tsx`

**현재 동작**: 로그인 성공 → 이전 페이지 또는 `/backoffice`

**변경 후**: 로그인 성공 → `/` (HomePage가 역할별 분기)

```typescript
// 기존
navigate(from || '/backoffice', { replace: true });

// 변경
navigate(from || '/', { replace: true });
```

**작업**:
- [ ] 기본 리다이렉트 경로를 `/`로 변경

---

## Phase 3: 네비게이션 링크 정리

### 3-1. 강사용 페이지에서 관리자 링크 숨기기

**파일들**:
- `frontend/src/pages/BackofficeDemo.tsx`
- `frontend/src/components/backoffice/BottomNav.tsx`

**작업**:
- [ ] 강사 역할일 때 관리자 메뉴 숨기기
- [ ] 관리자/원장일 때 "관리자 페이지로 이동" 링크 추가

---

### 3-2. 관리자 페이지에서 강사용 링크 추가

**파일**: `frontend/src/components/admin/layout/AdminTopNav.tsx`

**작업**:
- [ ] "강사 모드로 전환" 링크 추가 (admin/owner만)

---

## Phase 4: 테스트 및 검증

### 4-1. 테스트 케이스

| # | 역할 | 디바이스 | 접속 URL | 예상 결과 | 확인 |
|---|------|----------|----------|----------|------|
| 1 | teacher | 모바일 | `/` | → `/backoffice` | [ ] |
| 2 | teacher | PC | `/` | → `/backoffice` | [ ] |
| 3 | teacher | PC | `/admin` | → `/unauthorized` | [ ] |
| 4 | admin | 모바일 | `/` | → `/admin-mobile` | [ ] |
| 5 | admin | PC | `/` | → `/admin` | [ ] |
| 6 | admin | PC | `/backoffice` | → `/backoffice` (허용) | [ ] |
| 7 | owner | 모바일 | `/` | → `/admin-mobile` | [ ] |
| 8 | owner | PC | `/` | → `/admin` | [ ] |
| 9 | owner | PC | `/admin/users` | → UsersPage | [ ] |
| 10 | admin | PC | `/admin/users` | → `/unauthorized` | [ ] |

---

### 4-2. 반응형 테스트

| 디바이스 | 화면 너비 | 테스트 방법 |
|----------|----------|-------------|
| 모바일 | < 768px | Chrome DevTools → iPhone 12 |
| 태블릿 | 768px - 1023px | Chrome DevTools → iPad |
| PC | >= 1024px | 일반 브라우저 |

---

## 실행 로그

### Phase 1 실행
```
[x] 1-1. useIsMobile 훅 확인/생성 - 기존 useBreakpoint 활용
[x] 1-2. HomePage.tsx 생성 - 역할+디바이스 기반 리다이렉트
[x] 1-3. App.tsx 라우팅 수정 - / 경로를 HomePage로 변경
```

### Phase 2 실행
```
[x] 2-1. LoginPage 리다이렉트 경로 변경 - /backoffice → /
```

### Phase 3 실행
```
[x] 3-1. 강사용 페이지 네비게이션 정리 - MorePage에 관리자 모드 전환 메뉴 추가
[x] 3-2. 관리자 페이지 네비게이션 정리 - AdminTopNav에 강사 모드 전환/로그아웃 드롭다운 추가
```

### Phase 4 실행
```
[x] 4-1. 빌드 테스트 통과
[ ] 4-2. 실제 로그인 테스트 (수동)
```

---

## 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| Phase 1 | HomePage + 라우팅 | 20분 |
| Phase 2 | LoginPage 수정 | 10분 |
| Phase 3 | 네비게이션 정리 | 20분 |
| Phase 4 | 테스트 | 10분 |
| **총계** | | **1시간** |

---

## 다음 단계

Phase 1-4 완료 후:
- [ ] plan.md에 Stage 8 Phase 8-8 추가
- [ ] 380, 381 문서 참조 링크 추가

---

*작성: Claude Code*
