# 관리자 페이지 반응형 통합 및 세션 관리 개발 계획

**작성일**: 2025-12-17
**참조**: [388_admin_responsive_and_session_research.md](388_admin_responsive_and_session_research.md)
**목적**: 관리자 페이지 반응형 통합 + 브라우저 종료 시에만 로그아웃

---

## 개발 단계 요약

| Stage | 작업 | 예상 시간 |
|-------|------|----------|
| Stage 11-1 | 세션 관리 (sessionStorage) | 10분 |
| Stage 11-2 | 반응형 통합 페이지 생성 | 20분 |
| Stage 11-3 | 라우트 수정 및 리다이렉트 | 15분 |
| Stage 11-4 | 통합 테스트 및 빌드 | 15분 |

**총 예상 시간**: 1시간

---

## Stage 11-1: 세션 관리 (sessionStorage)

### 목표
- 새로고침 시 로그인 유지
- 브라우저 종료 시 자동 로그아웃

### 수정 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/lib/supabase.ts` | sessionStorage 설정 |

### 상세 변경 내용

**파일**: `frontend/src/lib/supabase.ts`

```typescript
// 변경 전
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,  // ❌ 새로고침해도 로그아웃
      autoRefreshToken: true,
    },
  }
);

// 변경 후
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

### 테스트 체크리스트

- [ ] 로그인 후 새로고침 → 로그인 유지 확인
- [ ] 로그인 후 페이지 이동 → 로그인 유지 확인
- [ ] 브라우저 완전 종료 후 재접속 → 로그아웃 확인
- [ ] 사용자 생성 API 호출 → 인증 토큰 정상 전달 확인

### 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `window is not defined` | SSR 환경 | `typeof window !== 'undefined'` 조건 추가 |
| 토큰 만료 | 세션 만료 | `autoRefreshToken: true` 확인 |

---

## Stage 11-2: 반응형 통합 페이지 생성

### 목표
- `/admin` URL에서 화면 크기에 따라 모바일/PC 레이아웃 자동 전환

### 수정/생성 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/hooks/useIsMobile.ts` | 확인 (이미 존재 시 스킵) |
| `frontend/src/pages/admin/AdminResponsivePage.tsx` | 새로 생성 |

### 상세 변경 내용

#### 파일 1: `useIsMobile.ts` 확인

```typescript
// 이미 존재하면 스킵, 없으면 생성
import { useState, useEffect } from 'react';

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

#### 파일 2: `AdminResponsivePage.tsx` 생성

```typescript
/**
 * 관리자 반응형 통합 페이지 (Stage 11-2)
 *
 * - 모바일 (< 640px): AdminMobileHome 표시
 * - 태블릿/PC (>= 640px): AdminDashboard 표시
 */
import { useIsMobile } from '@/hooks/useIsMobile';
import AdminDashboard from './AdminDashboard';
import AdminMobileHome from './AdminMobileHome';

export default function AdminResponsivePage() {
  const isMobile = useIsMobile(640);

  // 화면 크기에 따라 자동 전환
  return isMobile ? <AdminMobileHome /> : <AdminDashboard />;
}
```

### 테스트 체크리스트

- [ ] PC에서 `/admin` 접속 → AdminDashboard 표시
- [ ] 모바일에서 `/admin` 접속 → AdminMobileHome 표시
- [ ] 브라우저 창 크기 조절 → 자동 레이아웃 전환

---

## Stage 11-3: 라우트 수정 및 리다이렉트

### 목표
- `/admin` 라우트를 AdminResponsivePage로 변경
- `/admin-mobile` 접속 시 `/admin`으로 리다이렉트

### 수정 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/App.tsx` | 라우트 수정 |

### 상세 변경 내용

**파일**: `frontend/src/App.tsx`

```typescript
// 변경 전
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMobileHome from './pages/admin/AdminMobileHome';

<Route path="/admin" element={<ProtectedRoute roles={['admin', 'owner']}><AdminDashboard /></ProtectedRoute>} />
<Route path="/admin-mobile" element={<ProtectedRoute roles={['admin', 'owner']}><AdminMobileHome /></ProtectedRoute>} />

// 변경 후
import AdminResponsivePage from './pages/admin/AdminResponsivePage';
import { Navigate } from 'react-router-dom';

<Route path="/admin" element={<ProtectedRoute roles={['admin', 'owner']}><AdminResponsivePage /></ProtectedRoute>} />
<Route path="/admin-mobile" element={<Navigate to="/admin" replace />} />
```

### 테스트 체크리스트

- [ ] `/admin` 접속 → 정상 작동
- [ ] `/admin-mobile` 접속 → `/admin`으로 리다이렉트
- [ ] 권한 없는 사용자 → 로그인 페이지로 리다이렉트
- [ ] 하위 라우트 (`/admin/classes`, `/admin/users` 등) 정상 작동

### 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| 무한 리다이렉트 | Navigate 조건 잘못 | `replace` 속성 확인 |
| 404 에러 | 라우트 순서 | 구체적인 라우트를 먼저 배치 |

---

## Stage 11-4: 통합 테스트 및 빌드

### 목표
- TypeScript 빌드 성공 확인
- 모든 기능 정상 작동 확인

### 테스트 항목

#### 세션 관리 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 로그인 → 새로고침 | ✅ 로그인 유지 |
| 로그인 → 다른 페이지 이동 → 돌아오기 | ✅ 로그인 유지 |
| 로그인 → 브라우저 완전 종료 → 재접속 | ❌ 로그아웃 (다시 로그인 필요) |
| 로그인 → 새 탭에서 열기 | ❌ 로그아웃 (탭별 격리) |

#### 반응형 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| PC (1200px) + `/admin` | AdminDashboard 표시 |
| 태블릿 (800px) + `/admin` | AdminDashboard 표시 |
| 모바일 (400px) + `/admin` | AdminMobileHome 표시 |
| `/admin-mobile` 접속 | `/admin`으로 리다이렉트 |
| 창 크기 640px → 639px 변경 | PC → 모바일 자동 전환 |

#### 빌드 테스트

```bash
cd frontend
npm run build
```

### 완료 조건

- [ ] `npm run build` 성공 (에러 없음)
- [ ] 세션 관리 4개 테스트 통과
- [ ] 반응형 5개 테스트 통과
- [ ] 사용자 관리 API 정상 작동

---

## 파일 변경 요약

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `frontend/src/lib/supabase.ts` | 수정 | sessionStorage 설정 |
| `frontend/src/hooks/useIsMobile.ts` | 확인/생성 | 반응형 훅 |
| `frontend/src/pages/admin/AdminResponsivePage.tsx` | 생성 | 반응형 통합 페이지 |
| `frontend/src/App.tsx` | 수정 | 라우트 변경 |

---

## 실행 명령어

```bash
# Stage 11-1 ~ 11-4 순차 진행
"Stage 11-1 진행해줘"
"Stage 11-2 진행해줘"
"Stage 11-3 진행해줘"
"Stage 11-4 진행해줘"

# 전체 진행
"Stage 11 진행해줘"
```

---

## plan.md 업데이트 항목

```markdown
## ⬜ Stage 11: 관리자 페이지 반응형 통합 + 세션 관리

| Phase | 작업 | 상태 |
|-------|------|------|
| 11-1 | 세션 관리 (sessionStorage) | ⬜ 대기 |
| 11-2 | 반응형 통합 페이지 생성 | ⬜ 대기 |
| 11-3 | 라우트 수정 및 리다이렉트 | ⬜ 대기 |
| 11-4 | 통합 테스트 및 빌드 | ⬜ 대기 |
```
