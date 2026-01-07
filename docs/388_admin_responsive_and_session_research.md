# 관리자 페이지 반응형 통합 및 세션 관리 연구 리포트

**작성일**: 2025-12-17
**상태**: 📋 연구 완료
**목적**: 관리자 페이지 반응형 통합 + 브라우저 종료 시에만 로그아웃

---

## 1. 현재 상태 분석

### 1.1 관리자 페이지 구조

| URL | 대상 | 현재 상태 |
|-----|------|----------|
| `/admin` | PC/태블릿 | AdminDashboard.tsx |
| `/admin-mobile` | 모바일 | AdminMobileHome.tsx |

**문제점**: 두 URL이 별도로 분리되어 있어 반응형이 아님

### 1.2 세션 관리 현재 설정

**파일**: `frontend/src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,  // ❌ 현재: 세션 저장 안 함 (새로고침해도 로그아웃)
      autoRefreshToken: true,
    },
  }
);
```

**문제점**: `persistSession: false`로 인해 새로고침해도 로그아웃됨

---

## 2. 요구사항 정리

### 2.1 반응형 통합

| 요구사항 | 설명 |
|---------|------|
| 단일 URL | `/admin` 하나로 통합 |
| 모바일 | 640px 미만 → 모바일 레이아웃 |
| 태블릿/PC | 640px 이상 → PC 레이아웃 |
| 자동 전환 | 화면 크기에 따라 자동 레이아웃 변경 |

### 2.2 세션 관리

| 요구사항 | 설명 |
|---------|------|
| 새로고침 | 로그인 유지 ✅ |
| 탭 이동 | 로그인 유지 ✅ |
| 브라우저 종료 | 로그아웃 ✅ |

---

## 3. 기술 연구

### 3.1 반응형 통합 방법

#### Option A: 조건부 렌더링 (권장)

```typescript
// AdminPage.tsx
function AdminPage() {
  const isMobile = useMediaQuery('(max-width: 639px)');

  return isMobile ? <AdminMobileLayout /> : <AdminPCLayout />;
}
```

**장점**:
- 단일 라우트 (`/admin`)
- 화면 크기 변경 시 자동 전환
- URL 관리 단순화

**단점**:
- 두 레이아웃 컴포넌트 모두 로드됨

#### Option B: 동적 import (성능 최적화)

```typescript
// AdminPage.tsx
const AdminMobileLayout = lazy(() => import('./AdminMobileLayout'));
const AdminPCLayout = lazy(() => import('./AdminPCLayout'));

function AdminPage() {
  const isMobile = useMediaQuery('(max-width: 639px)');

  return (
    <Suspense fallback={<Loading />}>
      {isMobile ? <AdminMobileLayout /> : <AdminPCLayout />}
    </Suspense>
  );
}
```

**장점**:
- 필요한 레이아웃만 로드
- 초기 번들 크기 감소

### 3.2 세션 관리 방법

#### Supabase Session Storage 옵션

| 옵션 | 새로고침 | 탭 종료 | 브라우저 종료 |
|------|---------|--------|--------------|
| `persistSession: false` | ❌ 로그아웃 | ❌ 로그아웃 | ❌ 로그아웃 |
| `persistSession: true` (localStorage) | ✅ 유지 | ✅ 유지 | ✅ 유지 |
| `persistSession: true` (sessionStorage) | ✅ 유지 | ✅ 유지 | ❌ 로그아웃 |

#### sessionStorage 사용 방법 (권장)

```typescript
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
    },
  }
);
```

**동작 방식**:
- `sessionStorage`는 브라우저 탭/윈도우별로 격리됨
- 새로고침: 세션 유지 ✅
- 같은 탭에서 페이지 이동: 세션 유지 ✅
- 브라우저 종료: 세션 삭제 (자동 로그아웃) ✅

---

## 4. 구현 계획

### Phase 1: 세션 관리 수정 (5분)

**파일**: `frontend/src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,  // 세션 저장 활성화
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
      storageKey: 'hyeyum-auth-session',  // 커스텀 키
    },
  }
);
```

### Phase 2: 반응형 통합 (30분)

#### 2-1. useMediaQuery 훅 확인

**파일**: `frontend/src/hooks/useIsMobile.ts` (이미 존재)

```typescript
export function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
```

#### 2-2. 통합 관리자 페이지 생성

**파일**: `frontend/src/pages/admin/AdminResponsivePage.tsx`

```typescript
import { useIsMobile } from '@/hooks/useIsMobile';
import AdminDashboard from './AdminDashboard';
import AdminMobileHome from './AdminMobileHome';

export default function AdminResponsivePage() {
  const isMobile = useIsMobile(640);

  return isMobile ? <AdminMobileHome /> : <AdminDashboard />;
}
```

#### 2-3. 라우트 수정

**파일**: `frontend/src/App.tsx`

```typescript
// 기존
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/admin-mobile" element={<AdminMobileHome />} />

// 변경
<Route path="/admin" element={<AdminResponsivePage />} />
<Route path="/admin-mobile" element={<Navigate to="/admin" replace />} />  // 리다이렉트
```

### Phase 3: 하위 페이지 반응형 통합 (추가 작업)

| 기존 URL | 모바일 컴포넌트 | PC 컴포넌트 | 통합 필요 |
|---------|---------------|------------|----------|
| `/admin/classes` | ClassesPage (공용) | ClassesPage (공용) | ❌ 이미 반응형 |
| `/admin/students` | StudentsPage (공용) | StudentsPage (공용) | ❌ 이미 반응형 |
| `/admin/users` | - | UsersPage | 모바일 버전 필요 |
| `/admin/grades` | - | GradeOverview | 모바일 버전 필요 |

---

## 5. 예상 결과

### 세션 관리 (Phase 1 완료 후)

| 상황 | 동작 |
|------|------|
| 새로고침 (F5) | ✅ 로그인 유지 |
| 페이지 이동 | ✅ 로그인 유지 |
| 새 탭에서 열기 | ❌ 새로 로그인 필요 (sessionStorage 격리) |
| 브라우저 종료 | ✅ 자동 로그아웃 |

### 반응형 통합 (Phase 2 완료 후)

| 화면 크기 | URL | 표시되는 레이아웃 |
|----------|-----|-----------------|
| < 640px | `/admin` | 모바일 레이아웃 |
| >= 640px | `/admin` | PC 레이아웃 |
| 모든 크기 | `/admin-mobile` | → `/admin`으로 리다이렉트 |

---

## 6. 주의사항

### 6.1 sessionStorage 특성

- **탭별 격리**: 새 탭에서 열면 로그인 필요
- **동일 탭 유지**: 같은 탭 내에서는 새로고침해도 유지
- **브라우저 종료**: 자동 로그아웃

### 6.2 반응형 전환 시 고려사항

- 모바일 ↔ PC 전환 시 상태 유지
- 진행 중인 폼 데이터 손실 방지
- 스크롤 위치 초기화

---

## 7. 결론

| 요구사항 | 해결 방법 | 예상 작업 시간 |
|---------|---------|--------------|
| 새로고침 시 로그인 유지 | `sessionStorage` 사용 | 5분 |
| 브라우저 종료 시 로그아웃 | `sessionStorage` 사용 | 5분 |
| 반응형 통합 | 조건부 렌더링 + 리다이렉트 | 30분 |

**권장 순서**:
1. Phase 1 (세션 관리) 먼저 적용
2. Phase 2 (반응형 통합) 별도 진행

---

## 8. 참조

- [Supabase Auth - Session Management](https://supabase.com/docs/reference/javascript/auth-getsession)
- [MDN - sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [React - Lazy Loading](https://react.dev/reference/react/lazy)
