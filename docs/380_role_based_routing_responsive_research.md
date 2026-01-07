# 역할별 라우팅 및 반응형 설계 연구 리포트

> 작성일: 2025-12-17
> 상태: 완료

---

## 1. 요구사항 분석

### 1.1 역할별 접근 페이지

| 역할 | 코드 | 기본 접속 페이지 | 접근 가능 페이지 |
|------|------|------------------|------------------|
| 강사 | `teacher` | `/backoffice` (강사용 대시보드) | 강사용 페이지만 |
| 관리자 | `admin` | `/admin` (관리자 대시보드) | 강사용 + 관리자용 |
| 원장 | `owner` | `/admin` (관리자 대시보드) | 모든 페이지 |

### 1.2 반응형 요구사항

| 디바이스 | 화면 크기 | 강사 | 관리자/원장 |
|----------|----------|------|-------------|
| 모바일 | < 768px | `/backoffice` | `/admin-mobile` |
| 태블릿 | 768px - 1023px | `/backoffice` | `/admin-mobile` 또는 `/admin` |
| PC | >= 1024px | `/backoffice` | `/admin` |

---

## 2. 현재 시스템 분석

### 2.1 현재 라우팅 구조

```
App.tsx
├── /login                    → LoginPage (공개)
├── /unauthorized             → UnauthorizedPage (공개)
│
├── / 또는 /backoffice        → BackofficeDemo (강사용)
├── /classes                  → ClassesPage (강사용)
├── /students                 → StudentsPage (강사용)
├── /records                  → RecordsPage (강사용)
│
├── /admin                    → AdminDashboard (관리자 PC)
├── /admin/classes            → ClassManagementPage (반 관리)
├── /admin/users              → UsersPage (사용자 관리, owner만)
│
└── /admin-mobile             → AdminMobileHome (관리자 모바일)
```

### 2.2 현재 문제점

1. **역할별 기본 페이지 미구현**: 모든 역할이 `/backoffice`로 이동
2. **반응형 라우팅 없음**: 모바일에서 `/admin` 접속 시 PC 레이아웃 표시
3. **역할 전환 시 페이지 유지 안됨**: 관리자가 강사용 페이지 접근 시 혼란

---

## 3. 설계 방안

### 3.1 옵션 A: 로그인 후 역할별 리다이렉트

```typescript
// LoginPage.tsx
const handleLoginSuccess = () => {
  const { role } = useAuth();

  if (role === 'teacher') {
    navigate('/backoffice');
  } else {
    // admin, owner
    navigate('/admin');
  }
};
```

**장점**:
- 구현 간단
- 직관적

**단점**:
- 반응형 미지원
- URL 직접 입력 시 제어 불가

### 3.2 옵션 B: 홈 페이지에서 분기 (권장)

```typescript
// HomePage.tsx (새로 생성)
function HomePage() {
  const { role, isLoading } = useAuth();
  const isMobile = useIsMobile(); // < 1024px

  if (isLoading) return <LoadingScreen />;

  // 역할 + 디바이스에 따른 리다이렉트
  if (role === 'teacher') {
    return <Navigate to="/backoffice" replace />;
  }

  // admin, owner
  if (isMobile) {
    return <Navigate to="/admin-mobile" replace />;
  }

  return <Navigate to="/admin" replace />;
}
```

**장점**:
- 역할 + 디바이스 모두 고려
- 중앙 집중식 라우팅 로직

**단점**:
- 추가 컴포넌트 필요

### 3.3 옵션 C: 통합 대시보드 (장기적)

```typescript
// UnifiedDashboard.tsx
function UnifiedDashboard() {
  const { role } = useAuth();
  const isMobile = useIsMobile();

  // 역할 + 디바이스에 따라 다른 컴포넌트 렌더링
  if (role === 'teacher') {
    return <TeacherDashboard />;
  }

  if (isMobile) {
    return <AdminMobileDashboard />;
  }

  return <AdminPCDashboard />;
}
```

**장점**:
- 단일 URL (`/`)로 통합
- 유지보수 용이

**단점**:
- 대규모 리팩토링 필요

---

## 4. 권장 구현 방안: 옵션 B

### 4.1 구현 계획

#### Phase 1: useIsMobile 훅 확인
```typescript
// hooks/useIsMobile.ts (이미 존재)
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
```

#### Phase 2: HomePage 컴포넌트 생성
```typescript
// pages/HomePage.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';

export default function HomePage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const isMobile = useIsMobile(1024);

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // 미인증
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

#### Phase 3: App.tsx 라우팅 수정
```typescript
// App.tsx
<Route path="/" element={
  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
    <HomePage />
  </ProtectedRoute>
} />
```

#### Phase 4: LoginPage 리다이렉트 수정
```typescript
// LoginPage.tsx
// 로그인 성공 후 → "/" 로 이동 (HomePage가 역할별 분기 처리)
navigate(from || '/', { replace: true });
```

---

## 5. 반응형 네비게이션 설계

### 5.1 관리자 페이지 반응형 전환

| 화면 크기 | 레이아웃 | 네비게이션 |
|----------|----------|------------|
| < 768px | 모바일 | 하단 탭 바 |
| 768px - 1023px | 태블릿 | 접이식 사이드바 |
| >= 1024px | PC | 고정 사이드바 |

### 5.2 자동 레이아웃 전환 (선택적)

```typescript
// AdminLayout.tsx (통합 레이아웃)
function AdminLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile(768);
  const isTablet = useIsMobile(1024) && !isMobile;

  if (isMobile) {
    return <AdminMobileLayout>{children}</AdminMobileLayout>;
  }

  if (isTablet) {
    return <AdminTabletLayout>{children}</AdminTabletLayout>;
  }

  return <AdminPCLayout>{children}</AdminPCLayout>;
}
```

---

## 6. URL 구조 설계

### 6.1 현재 URL 구조

```
/backoffice          → 강사 대시보드
/admin               → 관리자 PC 대시보드
/admin-mobile        → 관리자 모바일 대시보드
```

### 6.2 권장 URL 구조 (변경 없음)

현재 구조 유지하되, `/` 경로에서 역할+디바이스 기반 리다이렉트 추가.

```
/                    → HomePage (역할별 분기)
/backoffice          → 강사 대시보드 (모든 디바이스)
/admin               → 관리자 PC (PC만)
/admin-mobile        → 관리자 모바일 (모바일/태블릿)
```

---

## 7. 보안 고려사항

### 7.1 역할 검증

| 페이지 | 허용 역할 | 미허용 시 |
|--------|----------|----------|
| `/backoffice/*` | teacher, admin, owner | `/unauthorized` |
| `/admin/*` | admin, owner | `/unauthorized` |
| `/admin/users` | owner | `/unauthorized` |
| `/admin/settlement` | owner | `/unauthorized` |

### 7.2 ProtectedRoute 동작

```typescript
// 현재 구현 (유지)
<ProtectedRoute roles={['admin', 'owner']}>
  <AdminDashboard />
</ProtectedRoute>
```

---

## 8. 구현 우선순위

### 즉시 구현 (Phase 1)
1. [x] `useIsMobile` 훅 확인 (이미 존재)
2. [ ] `HomePage.tsx` 생성 (역할별 리다이렉트)
3. [ ] `App.tsx` 라우팅 수정

### 단기 (Phase 2)
4. [ ] `LoginPage.tsx` 리다이렉트 경로 수정
5. [ ] 관리자 페이지에서 강사용 페이지 링크 추가

### 장기 (Phase 3, 선택적)
6. [ ] 통합 AdminLayout (반응형 자동 전환)
7. [ ] URL 없이 컴포넌트 기반 전환

---

## 9. 테스트 시나리오

| # | 역할 | 디바이스 | 접속 URL | 예상 결과 |
|---|------|----------|----------|----------|
| 1 | teacher | 모바일 | `/` | → `/backoffice` |
| 2 | teacher | PC | `/` | → `/backoffice` |
| 3 | teacher | PC | `/admin` | → `/unauthorized` |
| 4 | admin | 모바일 | `/` | → `/admin-mobile` |
| 5 | admin | PC | `/` | → `/admin` |
| 6 | admin | PC | `/backoffice` | → `/backoffice` (허용) |
| 7 | owner | 모바일 | `/` | → `/admin-mobile` |
| 8 | owner | PC | `/` | → `/admin` |
| 9 | owner | PC | `/admin/users` | → UsersPage (허용) |
| 10 | admin | PC | `/admin/users` | → `/unauthorized` |

---

## 10. 결론

### 권장 사항

1. **옵션 B 채택**: HomePage에서 역할+디바이스 기반 리다이렉트
2. **기존 URL 구조 유지**: `/backoffice`, `/admin`, `/admin-mobile`
3. **ProtectedRoute 유지**: 기존 역할 검증 로직 활용

### 예상 작업량

| 단계 | 작업 | 시간 |
|------|------|------|
| Phase 1 | HomePage + 라우팅 수정 | 30분 |
| Phase 2 | LoginPage 수정 + 테스트 | 30분 |
| **총계** | | **1시간** |

---

*작성: Claude Code*
